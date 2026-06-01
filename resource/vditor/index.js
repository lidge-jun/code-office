import { openLink, hotKeys, imageParser, getToolbar, autoSymbol, onToolbarClick, createContextMenu, scrollEditor, installMarkdownPostProcessing, runMarkdownPostProcessing, setWikilinkIndex } from "./util.js";
import { resolveVditorMode, setupLiveRawControls } from "./live-raw.js";

let state;
function loadConfigs() {
  const elem = document.getElementById('configs')
  try {
    state = JSON.parse(elem.getAttribute('data-config'));
    const { platform } = state;
    document.getElementById('vditor').classList.add(platform)
  } catch (error) {
    console.log('loadConfigFail')
  }
  return state;
}
loadConfigs()

handler.on("updateWikilinkIndex", (list) => {
  setWikilinkIndex(list);
  runMarkdownPostProcessing();
});

handler.on("open", async (md) => {
  const { config, language } = md;
  const requestedMode = config.editorMode || 'wysiwyg';
  let liveRawControls;
  let latestMarkdownContent = md.content;
  setWikilinkIndex(md.wikilinkIndex || []);
  addAutoTheme(md.rootPath, config.editorTheme)
  handler.on('theme', theme => {
    loadTheme(md.rootPath, theme)
  })
  const editor = new Vditor('vditor', {
    value: md.content,
    _lutePath: md.rootPath + '/lute.min.js',
    cdn: md.rootPath,
    height: document.documentElement.clientHeight,
    outline: {
      enable: config.openOutline,
      position: 'left',
    },
    toolbarConfig: {
      hide: config.hideToolbar
    },
    cache: {
      enable: false,
    },
    mode: resolveVditorMode(requestedMode),
    lang: language == 'zh-cn' ? 'zh_CN' : config.editorLanguage,
    icon: "material",
    tab: '\t',
    preview: {
      theme: {
        path: `${md.rootPath}/css/content-theme`
      },
      markdown: {
        toc: true,
        codeBlockPreview: config.previewCode,
      },
      hljs: {
        style: config.previewCodeHighlight.style,
        lineNumber: config.previewCodeHighlight.showLineNumber
      },
      extPath: md.rootPath,
      math: {
        engine: 'KaTeX',
        "inlineDigit": true
      }
    },
    toolbar: await getToolbar(md.rootPath),
    extPath: md.rootPath,
    input(content) {
      if (window.__codeOfficeMarkdownPostProcessingInput) return;
      latestMarkdownContent = content;
      handler.emit("save", content)
    },
    upload: {
      url: '/image',
      accept: 'image/*',
      handler(files) {
        let reader = new FileReader();
        reader.readAsBinaryString(files[0]);
        reader.onloadend = () => {
          handler.emit("img", reader.result)
        };
      }
    },
    hint: {
      emoji: {
        // Unicode 12.0+ geometric emoji missing from Lute's built-in dict
        "orange_circle": "🟠",
        "yellow_circle": "🟡",
        "green_circle": "🟢",
        "purple_circle": "🟣",
        "brown_circle": "🟤",
        "red_square": "🟥",
        "blue_square": "🟦",
        "orange_square": "🟧",
        "yellow_square": "🟨",
        "green_square": "🟩",
        "purple_square": "🟪",
        "brown_square": "🟫",
        "white_large_square": "⬜",
        "black_large_square": "⬛",
        "speech_balloon": "💬",
        "star": "⭐",
      },
      extend: hotKeys
    }, after() {
      handler.on("update", content => {
        latestMarkdownContent = content;
        if (liveRawControls?.isRawSourceActive()) {
          liveRawControls.setExternalValue(content);
          return;
        }
        editor.setValue(content);
      })
      openLink()
      installMarkdownPostProcessing()
      onToolbarClick(editor)
      liveRawControls = setupLiveRawControls(editor, {
        initialContent: md.content,
        requestedMode,
        getSourceValue: () => latestMarkdownContent,
        onSave: content => {
          latestMarkdownContent = content;
          handler.emit("save", content);
        },
        onDoSave: content => handler.emit("doSave", content),
      })
    }
  })
  autoSymbol(handler, editor, config, {
    getSaveValue: () => liveRawControls?.getCurrentValue?.() || latestMarkdownContent,
  });
  createContextMenu(editor)
  imageParser(config.viewAbsoluteLocal)
  scrollEditor(md.scrollTop)
  zoomElement('.vditor-content')
}).emit("init")


function addAutoTheme(rootPath, theme) {
  loadCSS(rootPath, 'base.css')
  loadTheme(rootPath, theme)
}

function loadTheme(rootPath, theme) {
  loadCSS(rootPath, `theme/${theme}.css`)
  document.getElementById('vditor').setAttribute('data-editor-theme', theme)
}

function loadCSS(rootPath, path) {
  const style = document.createElement('link');
  style.rel = "stylesheet";
  style.type = "text/css";
  style.href = `${rootPath}/css/${path}`;
  document.documentElement.appendChild(style)
}
