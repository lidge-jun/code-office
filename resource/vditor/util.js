const latexSymbols = [
    // 运算符
    { name: 'log', value: "\\log" },
    // 关系运算符
    { name: 'pm', value: "\\pm" },
    { name: 'times', value: "\\times" },
    { name: 'leq', value: "\\leq" },
    { name: 'eq', value: "\\eq" },
    { name: 'geq', value: "\\geq" },
    { name: 'neq', value: "\\neq" },
    { name: 'approx', value: "\\approx" },
    { name: 'prod', value: "\\prod" },
    { name: 'bigodot', value: "\\bigodot" },
    // 逻辑符号
    { name: 'exists', value: "\\exists" },
    { name: 'forall', value: "\\forall" },
    { name: 'rightarrow', value: "\\rightarrow" },
    { name: 'leftarrow', value: "\\leftarrow" },
    // 三角函数符号
    { name: 'sin', value: "\\sin" },
    { name: 'cos', value: "\\cos" },
    { name: 'tan', value: "\\tan" },
    // 函数
    { name: 'fraction', value: "\\frac{}{}" },
    { name: 'sqrt', value: "\\sqrt{}" },
    { name: 'sum', value: "\\sum_{i=0}^n" },
    // 希腊数字
    { name: 'alpha', value: "\\alpha" },
    { name: 'beta', value: "\\beta" },
    { name: 'Delta', value: "\\Delta" },
    { name: 'delta', value: "\\delta" },
    { name: 'epsilon', value: "\\epsilon" },
    { name: 'theta', value: "\\theta" },
    { name: 'lambda', value: "\\lambda" },
    { name: 'Lambda', value: "\\Lambda" },
    { name: 'phi', value: "\\phi" },
    { name: 'Phi', value: "\\Phi" },
    { name: 'omega', value: "\\omega" },
    { name: 'Omega', value: "\\Omega" },
];

export const hotKeys = [
    {
        key: '\\',
        hint: (key) => {
            if (document.getSelection()?.anchorNode?.parentElement?.getAttribute('data-type') != "math-inline") {
                return []
            }
            const results = !key ? latexSymbols : latexSymbols.filter((symbol) => symbol.name.toLowerCase().startsWith(key.toLowerCase()));
            return results.map(com => ({
                html: com.name, value: com.value
            }));
        },
    },
]

function loadRes(url) {
    return fetch(url).then(r => r.text())
}

function isMacPlatform() {
    return typeof navigator === 'object' && navigator.userAgent?.includes('Mac OS');
}

export async function getToolbar(resPath) {
    return [
        'outline',
        "headings",
        "bold",
        "italic",
        "strike",
        "link",
        "|",
        {
            tipPosition: 's',
            tip: 'Reload file from disk',
            className: 'right',
            icon: await loadRes(`${resPath}/icon/refresh.svg`),
            click() {
                handler.emit("reload")
            }
        },
        {
            tipPosition: 's',
            tip: `Edit In VSCode (${isMacPlatform() ? '⌘ ^ E' : 'Ctrl Alt E'})`,
            className: 'right',
            icon: await loadRes(`${resPath}/icon/vscode.svg`),
            click() {
                handler.emit("editInVSCode", true)
            }
        },
        {
            tipPosition: 's',
            tip: `Quick open`,
            className: 'right',
            icon: await loadRes(`${resPath}/icon/codicon-files.svg`),
            click() {
                handler.emit("quickOpen", true)
            }
        },
        {
            tipPosition: 's',
            tip: 'Export To Pdf',
            className: 'right',
            icon: await loadRes(`${resPath}/icon/pdf.svg`),
            click() {
                handler.emit("export")
            }
        },
        { name: 'upload', tipPosition: 'e' },
        "|",
        {
            name: 'selectTheme',
            tipPosition: 's', tip: 'Select Theme',
            icon: 'Theme:',
            click() {
                handler.emit("theme")
            }
        },
        {
            tipPosition: 's', tip: 'Select Theme',
            icon: await loadRes(`${resPath}/icon/theme.svg`),
            click() {
                handler.emit("theme")
            }
        },
        "|",
        "edit-mode",
        "code-theme",
        {
            name: 'code-office-raw-source',
            tipPosition: 's',
            tip: 'Raw Source',
            icon: await loadRes(`${resPath}/icon/raw-source.svg`),
            click() {
                window.dispatchEvent(new CustomEvent('code-office-toggle-raw-source'))
            }
        },
        // "|",
        "list",
        "ordered-list",
        "check",
        "table",
        "|",
        "quote",
        "line",
        "code",
        "inline-code",
        "|",
        "undo",
        "redo",
        "|",
        "preview",
        "help",
    ]
}

/**
 * 针对wysiwyg和ir两种模式对超链接做不同的处理
 */
export const openLink = () => {
    const clickCallback = e => {
        let ele = e.target;
        e.stopPropagation()
        const isSpecial = ['dblclick', 'auxclick'].includes(e.type)
        const wikilinkBody = findWikilinkAtEvent(e);
        if (wikilinkBody) {
            const explicit = e.target?.closest?.('[data-wikilink]');
            if (!explicit) pulseWikilinkAtPoint(e);
            if (!explicit && !isCompose(e) && !isSpecial) return;
            e.preventDefault();
            markWikilinkOpening(explicit);
            handler.emit("openWikilink", { body: wikilinkBody });
            return;
        }
        if (!isCompose(e) && !isSpecial) {
            return;
        }
        if (ele.tagName == 'A') {
            handler.emit("openLink", ele.href)
        } else if (ele.tagName == 'IMG') {
            const parent = ele.parentElement;
            if (parent?.tagName == 'A' && parent.href) {
                handler.emit("openLink", parent.href)
                return;
            }
            const src = ele.src;
            if (src?.match(/http/)) {
                handler.emit("openLink", src)
            }
        }
    }
    document.querySelectorAll(".vditor-wysiwyg, .vditor-preview, .vditor-ir").forEach(content => {
        content.addEventListener('dblclick', clickCallback);
        content.addEventListener('click', clickCallback);
        content.addEventListener('auxclick', clickCallback);
    });
    document.querySelector(".vditor-reset").addEventListener("scroll", e => {
        // 滚动有偏差
        handler.emit("scroll", { scrollTop: e.target.scrollTop - 70 })
    });
    document.querySelector(".vditor-ir").addEventListener('click', e => {
        let ele = e.target;
        const wikilinkEl = ele.closest?.('[data-wikilink]');
        if (wikilinkEl) return;
        if (ele.classList.contains('vditor-ir__link')) {
            ele = e.target.nextElementSibling?.nextElementSibling?.nextElementSibling
        }
        if (ele.classList.contains('vditor-ir__marker--link')) {
            const href = ele.textContent;
            if (isWikilinkBody(href)) {
                const wikilinkBody = href.trim().slice(2, -2);
                markWikilinkOpening(ele);
                handler.emit("openWikilink", { body: wikilinkBody });
                return;
            }
            handler.emit("openLink", href)
        }
    });
}

function markWikilinkOpening(element) {
    if (!element) return;
    element.classList.add('is-opening');
    window.setTimeout(() => element.classList.remove('is-opening'), 650);
}

function pulseWikilinkAtPoint(event) {
    const pulse = document.createElement('span');
    pulse.className = 'vscode-obsdian-wikilink-pulse';
    pulse.style.left = `${event.clientX}px`;
    pulse.style.top = `${event.clientY}px`;
    document.body.appendChild(pulse);
    window.setTimeout(() => pulse.remove(), 560);
}

let markdownPostProcessingObserver;
const INLINE_MARKER_PATTERN = /(\*\*([^*\r\n][^*\r\n]*?)\*\*|~~([^~\r\n][^~\r\n]*?)~~)/g;

export function runMarkdownPostProcessing() {
    repairRenderedInlineMarkdown();
    markRenderedWikilinks();
}

export function installMarkdownPostProcessing() {
    runMarkdownPostProcessing();
    if (markdownPostProcessingObserver) return;
    markdownPostProcessingObserver = new MutationObserver(runMarkdownPostProcessing);
    const observerRoot = document.body || document;
    markdownPostProcessingObserver.observe(observerRoot, { childList: true, subtree: true, characterData: true });
}

function findWikilinkAtEvent(event) {
    const explicit = event.target?.closest?.('[data-wikilink]');
    if (explicit) return explicit.getAttribute('data-wikilink');

    const caret = getCaretFromPoint(event.clientX, event.clientY);
    const caretMatch = findWikilinkInTextNode(caret?.node, caret?.offset);
    if (caretMatch) return caretMatch;

    return findWikilinkByRangeAtPoint(event);
}

function findWikilinkInTextNode(node, offset) {
    if (!node || node.nodeType !== Node.TEXT_NODE || typeof offset !== 'number') return null;
    const text = node.textContent || '';
    const pattern = /!?\[\[([^\]\r\n]+)\]\]/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;
        if (offset >= start && offset <= end) return match[1];
    }
    return null;
}

function findWikilinkByRangeAtPoint(event) {
    const root = event.target?.closest?.('.vditor-wysiwyg, .vditor-preview, .vditor-ir');
    if (!root) return null;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            return /\[\[[^\]\r\n]+\]\]/.test(node.textContent || '')
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
        }
    });
    const pattern = /!?\[\[([^\]\r\n]+)\]\]/g;
    while (walker.nextNode()) {
        const node = walker.currentNode;
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(node.textContent || '')) !== null) {
            const range = document.createRange();
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            const hit = [...range.getClientRects()].some(rect => {
                return event.clientX >= rect.left - 4
                    && event.clientX <= rect.right + 4
                    && event.clientY >= rect.top - 4
                    && event.clientY <= rect.bottom + 4;
            });
            range.detach?.();
            if (hit) return match[1];
        }
    }
    return null;
}

function getCaretFromPoint(x, y) {
    if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(x, y);
        return range ? { node: range.startContainer, offset: range.startOffset } : null;
    }
    if (document.caretPositionFromPoint) {
        const position = document.caretPositionFromPoint(x, y);
        return position ? { node: position.offsetNode, offset: position.offset } : null;
    }
    return null;
}

let wikilinkIndex = new Set();
export function setWikilinkIndex(list) { wikilinkIndex = new Set(list || []); }

export function isWikilinkBody(value) {
    return typeof value === 'string' && /^\[\[[^\]\r\n]+\]\]$/.test(value.trim());
}

export function stripWikilinkFragment(body) {
    return (body || '').split('|')[0].split('#')[0].split('^')[0].trim();
}

function isUnresolvedWikilink(body) {
    const target = stripWikilinkFragment(body);
    if (!target) return false;                  // same-doc heading/block link
    if (/[\\/]/.test(target)) return false;     // path-qualified → basename index can't path-score; don't false-flag
    return !wikilinkIndex.has(target.replace(/\.(md|markdown)$/i, '').toLowerCase());
}

function markRenderedWikilinks() {
    markdownWikilinkRoots().forEach(root => replaceTextMarkers(root, /(!)?\[\[([^\]\r\n]+)\]\]/g, (match) => {
        if (match[1]) return document.createTextNode(match[0]);   // ![[embed]] out-of-scope
        const span = document.createElement('span');
        span.className = isUnresolvedWikilink(match[2])
            ? 'vscode-obsdian-wikilink is-unresolved' : 'vscode-obsdian-wikilink';
        span.setAttribute('data-wikilink', match[2]);
        span.textContent = displayWikilink(match[2]);
        return span;
    }));
}

function repairRenderedInlineMarkdown() {
    markdownContentRoots().forEach(root => {
        for (let pass = 0, changed = 1; changed && pass < 4; pass++) {
            changed = replaceInlineMarkdownMarkers(root);
        }
    });
}

export function buildInlineMarkdownRepairParts(text) {
    if (typeof text !== 'string' || !text) return [{ type: 'text', text: text || '' }];

    const parts = [];
    let lastIndex = 0;
    INLINE_MARKER_PATTERN.lastIndex = 0;
    let match;
    while ((match = INLINE_MARKER_PATTERN.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: 'text', text: text.slice(lastIndex, match.index) });
        }
        parts.push({ type: match[2] ? 'strong' : 'del', text: match[2] || match[3] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push({ type: 'text', text: text.slice(lastIndex) });
    return parts.length ? parts : [{ type: 'text', text }];
}

function replaceInlineMarkdownMarkers(root) {
    return replaceTextMarkers(root, INLINE_MARKER_PATTERN, (match) => {
        const element = document.createElement(match[2] ? 'strong' : 'del');
        element.textContent = match[2] || match[3];
        return element;
    });
}

function markdownContentRoots() {
    const previewRoots = [...document.querySelectorAll([
        '.vditor-preview',
        '.vditor-preview .vditor-reset',
        '.vditor-ir__preview',
        '.vditor-wysiwyg__preview',
    ].join(', '))];
    const otherRenderedRoots = [...document.querySelectorAll('.vditor-reset')]
        .filter(root => !root.closest('.vditor-wysiwyg, .vditor-ir, .vditor-sv'));
    return [...new Set([...previewRoots, ...otherRenderedRoots])];
}

function markdownWikilinkRoots() {
    if (document.getElementById('vditor')?.classList.contains('code-office-raw-active')) return [];
    const liveEditorRoots = [...document.querySelectorAll([
        '.vditor-ir .vditor-reset',
        '.vditor-wysiwyg .vditor-reset',
    ].join(', '))];
    return [...new Set([...markdownContentRoots(), ...liveEditorRoots])];
}

function replaceTextMarkers(root, pattern, buildElement) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (!node.textContent || !pattern.test(node.textContent)) return NodeFilter.FILTER_REJECT;
            pattern.lastIndex = 0;
            const parent = node.parentElement;
            if (!parent || isProtectedMarkdownTextParent(parent)) return NodeFilter.FILTER_REJECT;
            if (isSelectionInTextNode(node)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => replaceTextNode(node, pattern, buildElement));
    return nodes.length;
}

function isProtectedMarkdownTextParent(parent) {
    if (parent.closest('a, code, script, style, textarea, kbd, samp, [data-wikilink], [data-type="code-block"]')) return true;
    const pre = parent.closest('pre');
    return pre && !pre.matches('.vditor-ir > .vditor-reset');
}

function isSelectionInTextNode(node) {
    if (window.__codeOfficeForceWikilinkCollapse) return false;
    const selection = document.getSelection?.();
    if (!selection || !selection.anchorNode) return false;
    if (selection.anchorNode !== node || typeof selection.anchorOffset !== 'number') return false;
    return isOffsetInsideWikilinkSource(node.textContent || '', selection.anchorOffset);
}

function isOffsetInsideWikilinkSource(text, offset) {
    const pattern = /!?\[\[[^\]\r\n]+\]\]/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;
        if (offset >= start && offset <= end) return true;
    }
    return false;
}

function replaceTextNode(node, pattern, buildElement) {
    const text = node.textContent;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        fragment.appendChild(buildElement(match));
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    markMarkdownPostProcessingInput();
    node.parentNode.replaceChild(fragment, node);
}

function markMarkdownPostProcessingInput() {
    window.__codeOfficeMarkdownPostProcessingInput = true;
    window.clearTimeout?.(window.__codeOfficeMarkdownPostProcessingInputTimer);
    window.__codeOfficeMarkdownPostProcessingInputTimer = window.setTimeout?.(() => {
        window.__codeOfficeMarkdownPostProcessingInput = false;
    }, 250);
}

export function displayWikilink(body) {
    const [targetWithHeading, alias] = body.split('|');
    if (alias?.trim()) return alias.trim();
    const [targetBeforeBlock] = targetWithHeading.split('^');
    const heading = targetBeforeBlock.split('#')[1];
    if (heading?.trim()) return heading.trim();
    const target = targetBeforeBlock.split('#')[0].split(/[\\/]/).pop() || '';
    return target.replace(/\.(md|markdown)$/i, '');
}

export function scrollEditor(top) {
    const scrollHack = setInterval(() => {
        const editorContainer = document.querySelector(".vditor-reset");
        if (!editorContainer) return;
        editorContainer.scrollTo({ top })
        clearInterval(scrollHack)
    }, 10);
}


//监听选项改变事件
export function onToolbarClick(editor) {
    document.querySelector('.vditor-toolbar').addEventListener("click", (e) => {
        let target = e.target, type;
        for (let i = 0; i < 3; i++) {
            if (type = target.dataset.type) break;
            target = target.parentElement;
        }
        if (type == 'outline') {
            handler.emit("saveOutline", editor.vditor.options.outline.enable)
        }
    })
}

export const createContextMenu = (editor) => {
    const menu = document.getElementById('context-menu')
    document.addEventListener("mousedown", e => {
        if (!e.target?.classList?.contains('dropdown-item')) {
            menu.classList.remove('show')
            menu.style.display = 'none'
        }
    });
    document.oncontextmenu = e => {
        e.stopPropagation();
        var top = e.pageY;
        var left = e.pageX + 10;
        menu.style.display = 'block'
        menu.style.top = top + "px";
        menu.style.left = left + "px";
        menu.classList.add('show')
    }
    menu.onclick = e => {
        menu.style.display = 'none'
        menu.classList.remove('show')
        const id = e.target.getAttribute("id");
        switch (id) {
            case "copy":
                document.execCommand("copy")
                break;
            case "paste":
                if (document.getSelection()?.toString()) { document.execCommand("delete") }
                vscodeEvent.emit('command', 'office.markdown.paste')
                break;
            case "exportPdf":
                vscodeEvent.emit('export', { type: 'pdf' })
                break;
            case "exportPdfWithoutOutline":
                vscodeEvent.emit('export', { type: 'pdf', withoutOutline: true })
                break;
            case "exportDocx":
                vscodeEvent.emit('export', { type: 'docx' })
                break;
            case "exportHtml":
                vscodeEvent.emit('export', { type: 'html' })
                break;
        }
    }
}

export const imageParser = (viewAbsoluteLocal) => {
    if (!viewAbsoluteLocal) return;
    var observer = new MutationObserver(mutationList => {
        for (var mutation of mutationList) {
            for (var node of mutation.addedNodes) {
                if (!node.querySelector) continue;
                const imgs = node.querySelectorAll('img')
                for (const img of imgs) {
                    const url = img.src;
                    if (url.startsWith("http")) { continue; }
                    if (url.startsWith("vscode-webview-resource") || url.includes("file:///")) {
                        img.src = `https://file+.vscode-resource.vscode-cdn.net/${url.split("file:///")[1]}`
                    }
                }
            }
        }
    });
    observer.observe(document, {
        childList: true,
        subtree: true
    });
}

function matchShortcut(hotkey, event) {

    const matchAlt = hotkey.match(/!/) != null == event.altKey
    const matchMeta = hotkey.match(/⌘/) != null == event.metaKey
    const matchCtrl = hotkey.match(/\^/) != null == event.ctrlKey
    const matchShifter = hotkey.match(/\+/) != null == event.shiftKey

    if (matchAlt && matchCtrl && matchShifter && matchMeta) {
        return hotkey.match(new RegExp(`\\b${event.key}\\b`, "i"))
    }

}


/**
 * 自动补全符号
 */
// const keys = ['"', "{", "("];
const keyCodes = [222, 219, 57];
export const autoSymbol = (handler, editor, config, options = {}) => {
    let _exec = document.execCommand.bind(document)
    document.execCommand = (cmd, ...args) => {
        if (cmd === 'delete') {
            setTimeout(() => {
                return _exec(cmd, ...args)
            })
        } else {
            return _exec(cmd, ...args)
        }
    }
    window.addEventListener('keydown', async e => {
        if (matchShortcut('^⌘e', e) || matchShortcut('^!e', e)) {
            e.stopPropagation();
            e.preventDefault();
            return handler.emit("editInVSCode", true);
        }

        const isMac = isMacPlatform();
        if (isMac && config.preventMacOptionKey && e.altKey && e.shiftKey && ['Digit1', 'Digit2', 'KeyW'].includes(e.code)) {
            return e.preventDefault();
        }
        if (e.code == 'F12') return handler.emit('developerTool')
        if (isCompose(e)) {
            if (e.altKey && isMac) {
                e.preventDefault()
            }
            switch (e.code) {
                case 'KeyS':
                    vscodeEvent.emit("doSave", options.getSaveValue ? options.getSaveValue() : editor.getValue());
                    e.stopPropagation();
                    e.preventDefault();
                    break;
                case 'KeyV':
                    if (e.shiftKey) {
                        const text = await navigator.clipboard.readText();
                        if (text) document.execCommand('insertText', false, text.trim());
                        e.stopPropagation();
                    }
                    else if (document.getSelection()?.toString()) {
                        // 修复剪切后选中文本没有被清除
                        document.execCommand("delete")
                    }
                    e.preventDefault();
                    break;
            }
        }
        if (!keyCodes.includes(e.keyCode)) return;
        const selectText = document.getSelection().toString();
        if (selectText != "") { return; }
        if (e.key == '(') {
            document.execCommand('insertText', false, ')');
            document.getSelection().modify('move', 'left', 'character')
        } else if (e.key == '{') {
            document.execCommand('insertText', false, '}');
            document.getSelection().modify('move', 'left', 'character')
        } else if (e.key == '"') {
            document.execCommand('insertText', false, e.key);
            document.getSelection().modify('move', 'left', 'character')
        }
    }, isMacPlatform() ? true : undefined)

    window.onresize = () => {
        document.getElementById('vditor').style.height = `${document.documentElement.clientHeight}px`
    }
    let app;
    let needFocus = false;
    window.onblur = () => {
        if (!app) { app = document.querySelector('.vditor-reset'); }
        // 纯文本没有offsetTop, 所以需要拿父节点
        const targetNode = document.getSelection()?.baseNode?.parentNode;
        // 如果编辑器现在没有获得焦点, 则无需重获焦点
        if (!app?.contains(targetNode)) {
            needFocus = false;
            return;
        }
        // 判断是否需要聚焦
        const curPosition = targetNode?.offsetTop ?? 0;
        const appPosition = app?.scrollTop ?? 0;
        if (appPosition - curPosition < window.innerHeight) {
            needFocus = true;
        }
    }
    window.onfocus = () => {
        if (!app) { app = document.querySelector('.vditor-reset'); }
        if (needFocus) {
            app.focus()
            needFocus = false;
        }
    }
}
