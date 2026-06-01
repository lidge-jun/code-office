const fs = require("fs")
const path = require("path")
const url = require("url")
const URI = require("vscode").Uri
const markdownIt = require("markdown-it")
const markdownItCheckbox = require("markdown-it-checkbox")
const markdownItKatex = require("./ext/markdown-it-katex")
const markdownItPlantuml = require("markdown-it-plantuml")
const markdownItToc = require("markdown-it-toc-done-right")
const markdownItAnchor = require("markdown-it-anchor")
const { exportByType } = require('./html-export')
const markdownItMermaid = require('./ext/markdown-it-mermaid');

async function convertMarkdown(inputMarkdownFile, config, wikilinkMap = {}) {

  const type = config.type
  const uri = URI.file(inputMarkdownFile)
  const text = fs.readFileSync(inputMarkdownFile).toString()
  const content = convertMarkdownToHtml(inputMarkdownFile, type, text, config, wikilinkMap)
  const html = mergeHtml(content, uri)

  // insert mermaid script (inline local file for offline support)
  const $ = require("cheerio").load(html);
  const containsMermaid = $('.mermaid').length > 0;
  if (containsMermaid) {
      const mermaidLocalPath = path.resolve(__dirname, '..', 'resource', 'vditor', 'dist', 'js', 'mermaid', 'mermaid.min.js');
      let mermaidScript;
      if (fs.existsSync(mermaidLocalPath)) {
          const mermaidCode = fs.readFileSync(mermaidLocalPath, 'utf8');
          mermaidScript = `
    <script>${mermaidCode}</script>
    <script>mermaid.initialize({startOnLoad:true});</script>
    `;
      } else {
          // fallback to CDN if local file not found
          console.warn('[pretty-md-pdf] Local mermaid.min.js not found, falling back to CDN');
          mermaidScript = `
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
    <script>mermaid.initialize({startOnLoad:true});</script>
    `;
      }

    $('body').append(mermaidScript);
  }

  await exportByType(inputMarkdownFile, $.html(), type, config)
}


/**
 * create toc if not exists.
 */
function addTocToContent(text, config) {
  const needOutline = !text.match(/\[toc\]/i) && !config.withoutOutline;
  return needOutline ? `[toc]\n${text}` : text;
}

/*
 * convert markdown to html (markdown-it)
 */
function convertMarkdownToHtml(filename, type, text, config, wikilinkMap = {}) {
  if (type == 'pdf') text = addTocToContent(text, config)
  let md = {}

  try {
    try {
      const hljs = require("highlight.js");
      console.log("[pretty-md-pdf] Converting (convertMarkdownToHtml) ...")
      const breaks = config["breaks"]
      md = markdownIt({
        html: true,
        breaks,
        highlight: function (str, lang) {
          if (lang && hljs.getLanguage(lang)) {
            try {
              str = hljs.highlight(lang, str, true).value
            } catch (error) {
              str = md.utils.escapeHtml(str)

              showErrorMessage("markdown-it:highlight", error)
            }
          } else {
            str = md.utils.escapeHtml(str)
          }
          return "<pre class='hljs'><code><div>" + str + "</div></code></pre>"
        }
      })
    } catch (error) {
      showErrorMessage("require(\"markdown-it\")", error)
    }

    // convert the img src of the markdown
    let defaultRender = md.renderer.rules.image
    md.renderer.rules.image = function (tokens, idx, options, env, self) {
      let token = tokens[idx]
      let href = token.attrs[token.attrIndex("src")][1]
      // console.log("original href: " + href)
      if (type === "html") {
        href = decodeURIComponent(href).replace(/("|")/g, "")
      } else {
        href = convertImgPath(href, filename)
      }
      // console.log("converted href: " + href)
      token.attrs[token.attrIndex("src")][1] = href
      // // pass token to default renderer.
      return defaultRender(tokens, idx, options, env, self)
    }

    if (type !== "html") {
      // convert the img src of the html
      md.renderer.rules.html_block = function (tokens, idx) {
        let html = tokens[idx].content
        let $ = require("cheerio").load(html)
        $("img").each(function () {
          let src = $(this).attr("src")
          let href = convertImgPath(src, filename)
          $(this).attr("src", href)
        })
        return $.html()
      }
    }

    md.use(markdownItCheckbox)
      .use((md2) => markdownItWikilink(md2, wikilinkMap))
      .use(markdownItAnchor)
      .use(markdownItToc)
      .use(markdownItKatex)
      .use(markdownItPlantuml)
      .use(markdownItMermaid)

    return md.render(text)

  } catch (error) {
    showErrorMessage("convertMarkdownToHtml()", error)
  }
}

function markdownItWikilink(md, wikilinkMap = {}) {
  md.inline.ruler.before('emphasis', 'code-office_wikilink', (state, silent) => {
    const start = state.pos;
    if (state.src.charCodeAt(start - 1) === 0x21) return false;   // ![[embed]] is out-of-scope
    if (state.src.charCodeAt(start) !== 0x5B || state.src.charCodeAt(start + 1) !== 0x5B) {
      return false;
    }
    const end = state.src.indexOf(']]', start + 2);
    if (end === -1) return false;
    if (!silent) {
      const body = state.src.slice(start + 2, end);
      const parsed = parseWikilinkExportBody(body, wikilinkMap);
      if (!parsed) return false;
      const tokenOpen = state.push('link_open', 'a', 1);
      tokenOpen.attrs = [['href', parsed.href],
        ['class', parsed.resolved ? 'code-office-wikilink' : 'code-office-wikilink code-office-wikilink--unresolved']];
      const tokenText = state.push('text', '', 0);
      tokenText.content = parsed.label;
      state.push('link_close', 'a', -1);
    }
    state.pos = end + 2;
    return true;
  });
}

function parseWikilinkExportBody(body, wikilinkMap = {}) {
  const trimmed = body.trim();
  if (!trimmed) return undefined;
  const [targetWithFrag, alias] = splitOnce(trimmed, '|');
  const [rawTarget, fragment] = splitOnce(targetWithFrag.trim(), '#');
  const cleanTarget = rawTarget.trim().replace(/\\/g, '/');
  if (cleanTarget && isUnsafeWikilinkTarget(rawTarget.trim())) return undefined;
  if (cleanTarget && hasExplicitNonMarkdownExtension(cleanTarget)) return undefined;

  const frag = fragment ? buildFragment(fragment.trim()) : '';
  if (!cleanTarget) {                                          // same-document anchor
    if (!frag) return undefined;
    return { href: frag, label: alias?.trim() || fragment.trim(), resolved: true };
  }

  const mapped = wikilinkMap[body];
  const base = mapped && mapped.resolved
    ? mapped.href                                              // closest-note relative path (parity with click)
    : (cleanTarget.match(/\.(md|markdown)$/i) ? cleanTarget : `${cleanTarget}.md`);
  const label = alias?.trim() || fragment?.trim() || path.basename(cleanTarget);
  return { href: `${base}${frag}`, label, resolved: !mapped || mapped.resolved };
}

function buildFragment(fragment) {
  if (fragment.startsWith('^')) return `#${slugifyExport(fragment.slice(1))}`;   // block id
  const heading = splitOnce(fragment, '^')[0].trim();
  return heading ? `#${slugifyExport(heading)}` : '';
}

// markdown-it-anchor default slug — must match the heading id emitted into the export HTML
function slugifyExport(s) {
  return encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, '-'));
}

function isUnsafeWikilinkTarget(target) {
  return target.startsWith('/')
    || target.startsWith('\\')
    || path.win32.isAbsolute(target)
    || path.posix.isAbsolute(target)
    || /^[a-z][a-z0-9+.-]*:/i.test(target)
    || target.includes('\0');
}

function hasExplicitNonMarkdownExtension(target) {
  const clean = String(target || '').trim().replace(/\\/g, '/');
  const base = clean.split('/').pop() || clean;
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return false;
  return !['.md', '.markdown'].includes(base.slice(dot).toLowerCase());
}

function splitOnce(value, separator) {
  const index = value.indexOf(separator);
  if (index === -1) return [value, undefined];
  return [value.slice(0, index), value.slice(index + 1)];
}

export const __markdownPhase5Test = {
  convertMarkdownToHtml,
};


/*
 * make html
 */
function mergeHtml(content, uri) {
  try {
    const mustache = require("mustache")
    const title = path.basename(uri.fsPath)
    const style = readStyles()
    const templatePath = path.join(__dirname, "template", "template.html")
    return mustache.render(readFile(templatePath), { title, style, content })
  } catch (error) {
    showErrorMessage("makeHtml()", error)
  }
}

function isExistsPath(path) {
  if (path.length === 0) {
    return false
  }
  try {
    fs.accessSync(path)
    return true
  } catch (error) {
    console.warn(error.message)
    return false
  }
}

function readFile(filename, encode = "utf-8") {
  if (filename.indexOf("file://") === 0) {
    if (process.platform === "win32") {
      filename = filename.replace(/^file:\/\/\//, "")
        .replace(/^file:\/\//, "")
    } else {
      filename = filename.replace(/^file:\/\//, "")
    }
  }
  if (isExistsPath(filename)) {
    return fs.readFileSync(filename, encode)
  } else {
    return ""
  }
}

function convertImgPath(src, filename) {
  try {
    let href = decodeURIComponent(src)
    href = href.replace(/("|")/g, "")
      .replace(/\\/g, "/")
      .replace(/#/g, "%23")
    let protocol = url.parse(href).protocol
    if (protocol === "file:" && href.indexOf("file:///") !== 0) {
      return href.replace(/^file:\/\//, "file:///")
    } else if (protocol === "file:") {
      return href
    } else if (!protocol || path.isAbsolute(href)) {
      href = path.resolve(path.dirname(filename), href).replace(/\\/g, "/")
        .replace(/#/g, "%23")
      if (href.indexOf("//") === 0) {
        return "file:" + href
      } else if (href.indexOf("/") === 0) {
        return "file://" + href
      } else {
        return "file:///" + href
      }
    } else {
      return src
    }
  } catch (error) {
    showErrorMessage("convertImgPath()", error)
  }
}

function makeCss(filename) {
  try {
    let css = readFile(filename)
    if (css) {
      return "\n<style>\n" + css + "\n</style>\n"
    } else {
      return ""
    }
  } catch (error) {
    showErrorMessage("makeCss()", error)
  }
}

function readStyles() {
  try {
    const basePath = path.join(__dirname, "styles");
    const katexPath = path.resolve(__dirname, '..', "resource", 'vditor', 'dist', 'js', 'katex', 'katex.min.css');
    const files = ['arduino-light.css', 'markdown.css', 'markdown-pdf.css']
    return files.map(file => makeCss(path.join(basePath, file))).join("")
      + makeCss(katexPath)
  } catch (error) {
    showErrorMessage("readStyles()", error)
  }
}

function showErrorMessage(msg, error) {
  console.error("ERROR: " + msg)
  console.log("ERROR: " + msg)
  if (error) {
    console.error(error.toString())
    console.log(error)
  }
}

export const convertMd = async (options) => {
  const config = options.config
  options.outputFileType = config.type[0]
  console.log(`[pretty-md-pdf] Converting markdown file: ${options.markdownFilePath}`)
  await convertMarkdown(
    path.resolve(options.markdownFilePath),
    config,
    options.wikilinkMap || {}
  )
}
