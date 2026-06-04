import { openLink, hotKeys, imageParser, getToolbar, autoSymbol, onToolbarClick, createContextMenu, scrollEditor, installMarkdownPostProcessing, runMarkdownPostProcessing, setWikilinkIndex } from "./util.js";
import { resolveVditorMode, setupLiveRawControls } from "./live-raw.js";
import { focusFirstEmptyWikilinkBody, setWikilinkCompletionTargets, setupWikilinkAuthoring } from "./wikilink-authoring.js";
import { findWikilinkCompletionContext, isMarkdownInsertedWikilinkPair, isWikilinkProgrammaticEcho, pairMarkdownInsertedBracket, pairMarkdownUnclosedWikilinkOpen } from "./wikilink-source-transaction.js";

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

handler.on("updateWikilinkCompletionTargets", (list) => {
  setWikilinkCompletionTargets(list);
});

handler.on("open", async (md) => {
  const { config, language } = md;
  const requestedMode = config.editorMode || 'wysiwyg';
  let liveRawControls;
  let wikilinkAuthoring;
  let latestMarkdownContent = md.content;
  let activeWikilinkSourceSelection = null;
  const updateActiveWikilinkSourceSelection = selection => {
    if (!selection) {
      activeWikilinkSourceSelection = null;
      return;
    }
    const context = selection.context || findWikilinkCompletionContext(latestMarkdownContent, selection.selectionStart);
    activeWikilinkSourceSelection = context
      ? { selectionStart: selection.selectionStart, selectionEnd: selection.selectionEnd, context }
      : null;
  };
  const rememberEmptyWikilinkSource = content => {
    const value = String(content || '');
    const index = value.indexOf('[[]]');
    if (index < 0) return;
    latestMarkdownContent = value;
    updateActiveWikilinkSourceSelection({
      selectionStart: index + 2,
      selectionEnd: index + 2,
    });
  };
  const forgetEmptyWikilinkSource = content => {
    const position = activeWikilinkSourceSelection?.selectionStart;
    if (!String(content || '').includes('[[]]') && !findWikilinkCompletionContext(content, position)) {
      activeWikilinkSourceSelection = null;
    }
  };
  setWikilinkIndex(md.wikilinkIndex || []);
  setWikilinkCompletionTargets(md.wikilinkCompletionTargets || []);
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
      const isProgrammaticEcho = isWikilinkProgrammaticEcho(
        window.__codeOfficeWikilinkProgrammaticInput,
        latestMarkdownContent,
        content,
      );
      if (!isProgrammaticEcho) {
        if (isMarkdownInsertedWikilinkPair(latestMarkdownContent, content)) {
          latestMarkdownContent = content;
          rememberEmptyWikilinkSource(content);
          handler.emit("save", content);
          window.setTimeout?.(() => wikilinkAuthoring?.completeOpen?.(), 0);
          return;
        }
        const paired = pairMarkdownInsertedBracket(latestMarkdownContent, content)
          || pairMarkdownUnclosedWikilinkOpen(content);
        if (paired) {
          latestMarkdownContent = paired.value;
          updateActiveWikilinkSourceSelection(paired);
          window.__codeOfficeWikilinkProgrammaticInput = true;
          try {
            editor.setValue(paired.value);
          } finally {
            window.setTimeout?.(() => {
              window.__codeOfficeWikilinkProgrammaticInput = false;
            }, 32);
          }
          handler.emit("save", paired.value);
          [0, 16, 50].forEach(delay => {
            window.setTimeout?.(() => {
              focusFirstEmptyWikilinkBody();
              wikilinkAuthoring?.completeOpen?.();
              runMarkdownPostProcessing();
            }, delay);
          });
          return;
        }
      }
      latestMarkdownContent = content;
      forgetEmptyWikilinkSource(content);
      handler.emit("save", content)
      window.setTimeout?.(() => runMarkdownPostProcessing(), 0);
      [0, 16, 50].forEach(delay => {
        window.setTimeout?.(() => wikilinkAuthoring?.completeOpen?.(), delay);
      });
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
        rememberEmptyWikilinkSource(content);
        if (liveRawControls?.isRawSourceActive()) {
          liveRawControls.setExternalValue(content);
          return;
        }
        editor.setValue(content);
        if (content.includes('[[]]')) {
          [0, 16, 50].forEach(delay => {
            window.setTimeout?.(() => {
              focusFirstEmptyWikilinkBody();
              wikilinkAuthoring?.completeOpen?.();
              runMarkdownPostProcessing();
            }, delay);
          });
        }
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
          rememberEmptyWikilinkSource(content);
          handler.emit("save", content);
        },
        onDoSave: content => handler.emit("doSave", content),
      })
      wikilinkAuthoring = setupWikilinkAuthoring(editor, {
        getSourceValue: () => latestMarkdownContent,
        setSourceValue: content => {
          latestMarkdownContent = content;
          rememberEmptyWikilinkSource(content);
          handler.emit("save", content);
        },
        getActiveSourceSelection: () => activeWikilinkSourceSelection,
        setActiveSourceSelection: updateActiveWikilinkSourceSelection,
        clearActiveSourceSelection: () => {
          activeWikilinkSourceSelection = null;
        },
        applySourceTransaction: transaction => {
          latestMarkdownContent = transaction.value;
          updateActiveWikilinkSourceSelection(transaction);
          window.__codeOfficeWikilinkProgrammaticInput = true;
          try {
            editor.setValue(transaction.value);
            liveRawControls?.setExternalValue?.(transaction.value);
          } finally {
            window.setTimeout?.(() => {
              window.__codeOfficeWikilinkProgrammaticInput = false;
            }, 32);
          }
          handler.emit("save", transaction.value);
          window.setTimeout?.(() => {
            wikilinkAuthoring?.completeOpen?.();
            runMarkdownPostProcessing();
          }, 0);
        },
        rawSource: liveRawControls.rawSource,
        runPostProcessing: runMarkdownPostProcessing,
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
