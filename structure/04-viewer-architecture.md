---
created: 2026-05-30
tags: [code-office, viewer, markdown, vditor, office-viewer, react]
aliases: [code-office viewer architecture, office viewer routing, markdown editor]
---
# Viewer and Markdown Editor Architecture

This document covers the multi-format viewer routing system (`officeViewerProvider`), the dedicated DOCX/PPTX custom editor routes, the Markdown WYSIWYG editor (`markdownEditorProvider` + Vditor), and the React WebView component architecture that renders all visual content.

---

## Office Viewer Router

### `officeViewerProvider.ts` (`src/provider/officeViewerProvider.ts` — 122 lines)

The office viewer is a shared `CustomReadonlyEditorProvider` for the remaining preview formats. DOCX and PPTX are split into dedicated custom editors: DOCX is editable through `cweijan.docxEditor`, and PPTX is read-only through `cweijan.pptxEditor`.

[[00-structure-hub.md]]

#### Routing Table


| Extension(s)                             | React Route  | Renderer                                         |
| ------------------------------------------ | -------------- | -------------------------------------------------- |
| `.xlsx`, `.xlsm`, `.xls`, `.csv`, `.ods` | `excel`      | x-data-spreadsheet                               |
| `.zip`, `.jar`, `.apk`, `.vsix`          | `zip`        | Tree view with extract                           |
| `.rar`                                   | `zip`        | RAR handler → tree view                         |
| `.ttf`, `.woff`, `.woff2`, `.otf`        | `font`       | opentype.js glyph inspector                      |
| `.jpg`, `.png`, `.gif`, + 10 more        | `image`      | react-image-gallery                              |
| `.svg`                                   | `image`      | react-image-gallery                              |
| `.pdf`                                   | *(redirect)* | Bundled PDF.js viewer (`resource/pdf/`)          |
| `.html`, `.htm`                          | *(direct)*   | WebView body injection + file watcher hot-reload |
| `.hwp`, `.hwpx`                          | *(redirect)* | Redirected to`cweijan.hwpEditor` provider        |
| `.ppt`                                   | *(redirect)* | LibreOffice conversion command                   |

#### Special Routing Paths

**PDF**: Does not use the React app. Computes the `resource/pdf/viewer.html` WebView URI and passes the document URI as a query parameter. PDF.js handles rendering internally.

**HTML Hot-Reload**: For `.html`/`.htm` files, the provider injects the file contents directly into the WebView body and attaches a `Util.listen()` file watcher. When the file changes on disk, the WebView body is reloaded immediately — useful for live HTML mockup previewing.

**HWP Legacy Redirect**: If `.hwp`/`.hwpx` files are somehow opened via the office viewer (e.g., user manually selects it), the provider detects the extension, opens the file with `cweijan.hwpEditor`, shows "Opening HWP editor..." message, and disposes the office viewer panel.

**DOCX/PPTX Split**: `.docx`/`.dotx` and `.pptx`/`.pptm`/`.ppsx` are not registered on `cweijan.officeViewer`. They use `DocxEditorProvider` and `PptxEditorProvider` so the VS Code custom editor lifecycle matches their actual behavior.

### Dedicated DOCX/PPTX Routes

| Extension(s)              | viewType | React Route | Provider | Renderer |
|---|---|---|---|---|
| `.docx`, `.dotx` | `cweijan.docxEditor` | `word` | `DocxEditorProvider` | Editable DOCX renderer/editor using SuperDoc (`@superdoc-dev/react`) |
| `.pptx`, `.pptm`, `.ppsx` | `cweijan.pptxEditor` | `pptx` | `PptxEditorProvider` | PowerPoint-like read-only viewer with visual thumbnails, notes, grid, fullscreen, presenter view |

#### DOCX SuperDoc Theme Shell (`Word.css`)

SuperDoc renders inside the `word` React route (`Word.tsx` + `SuperDocSurface.tsx`). Chrome around the document uses VS Code theme variables via `src/react/view/word/Word.css`:

- Page background and toolbar chrome read `var(--vscode-editor-background)`, `var(--vscode-foreground)`, and related VS Code tokens.
- `body.vscode-dark` adds a subtle page hairline so dark-theme DOCX review matches the editor chrome (`v3.7.50`, commit `5d4869e`).
- Save/export still flows through `DocxEditorProvider` → `DocxSaveBridge`; `docxSaveRepair.ts` handles edge-case XML repair when SuperDoc export misses edits.

---

## Markdown Editor

### `markdownEditorProvider.ts` (`src/provider/markdownEditorProvider.ts` — 290 lines)

Implements `CustomTextEditorProvider` wrapping the Vditor WYSIWYG markdown editor.

#### Dual Registration


| viewType                          | Priority | Selector        | Purpose                                          |
| ----------------------------------- | ---------- | ----------------- | -------------------------------------------------- |
| `cweijan.markdownViewer`          | default  | `*.md`, `*.markdown` | Auto-opens markdown files in code-office when selected as default editor |
| `cweijan.markdownViewer.optional` | option   | `*.md`, `*.markdown` | Lets users open the built-in text editor instead |

#### Resource Sandbox

`getLocalResourceRoots()` computes the WebView's filesystem access whitelist:

**Always allowed:**

- Extension installation directory (bundled assets)
- Document's parent directory (sibling images)
- All workspace folder roots (cross-folder references)

**Conditionally allowed** (when `vscode-office.viewAbsoluteLocal = true`):

- macOS/Linux root: `/`
- Windows drives: `A:/` through `Z:/`

This is a deliberate security tradeoff: absolute path images are common in exported documents, but opening the full filesystem to a WebView is risky. The setting is off by default and requires explicit opt-in.

#### Event Handlers (18 registered)


| Event            | Direction     | Purpose                                      |
| ------------------ | --------------- | ---------------------------------------------- |
| `init`           | ← WebView    | Send initial content + full config to Vditor |
| `externalUpdate` | ← VS Code    | Forward external file changes to editor      |
| `fileChange`     | ← Filesystem | File watcher triggers content refresh        |
| `reload`         | ← WebView    | User requested revert to disk                |
| `save`           | ← WebView    | Auto-save trigger                            |
| `doSave`         | ← WebView    | Explicit save (Ctrl+S from Vditor)           |
| `export`         | ← WebView    | PDF/HTML/DOCX export via chromium            |
| `img`            | ← WebView    | Image paste: save to disk + insert reference |
| `openLink`       | ← WebView    | External URL or local file navigation        |
| `openWikilink`   | ← WebView    | `[[wikilink]]` resolution and navigation     |
| `scroll`         | ← WebView    | Persist scroll position across reloads       |
| `theme`          | ← WebView    | Editor theme change request                  |
| `developerTool`  | ← Keybind    | F12 opens WebView dev tools                  |

#### Optimization: Debouncing

External update and file change events are debounced at 800ms to prevent save-race conditions when the file is modified externally while the user is editing.

#### Live Preview / Raw Source Extension (shipped baseline, closure pending)

The Markdown editor ships an Obsidian-style authoring baseline. Runtime pieces are in place; final devlog closure remains in `devlog/_plan/260601_markdown_live_raw_mode`.


| Surface                                                        | Responsibility                                                                                                |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `package.json`                                                 | Adds`raw` to `vscode-office.editorMode`, contributes reading/raw toggle commands and keybindings.             |
| `resource/vditor/index.js`                                     | Owns WebView-side editor mode state, raw/source toolbar button wiring, and keyboard handling.                 |
| `resource/vditor/wikilink-authoring.js`                        | Owns WebView/Raw Source`[[` pairing, file suggestion popup, and Live Preview wikilink boundary source reveal. |
| `resource/vditor/util.js`                                      | Owns post-processing helpers for inactive rendered code blocks and wikilinks.                                 |
| `resource/vditor/css/base.css` and `resource/vditor/index.css` | Own VS Code theme-variable styling for raw mode, highlighted code, inline code, and wikilinks.                |
| `src/provider/markdownEditorProvider.ts`                       | Bridges new WebView events to VS Code commands/config where host participation is needed.                     |
| `src/test/*`                                                   | Locks active-raw/inactive-rendered behavior and existing Mermaid/wikilink/CJK regressions.                    |

Design invariants:

- `Edit In VSCode` remains available and continues to open the default text
  editor; raw mode is added inside the code-office WebView instead of replacing
  that path.
- `Cmd+E` on macOS and `Ctrl+E` elsewhere follow Obsidian's reading-view toggle
  model: live editing view to reading preview and back.
- Raw/source mode is a distinct command and toolbar affordance, so it can persist
  as `vscode-office.editorMode = raw` without overloading the reading toggle.
- Active code blocks and active `[[wikilink]]` text preserve raw Markdown for
  editing; inactive equivalents render as highlighted code or styled wikilinks.
- Rendered wikilinks keep single-click navigation. Local source reveal is
  boundary-driven: when the caret enters either side of a rendered label, only
  that token expands back to `[[...]]`; moving the caret into surrounding prose
  collapses it back to the rendered label.
- WebView and Raw Source authoring use the same host-provided file completion
  targets. Missing-note creation remains explicit and is not triggered by
  autocomplete.

---

## React WebView Architecture

### Entry Point (`src/react/main.tsx`)

```
React.StrictMode
  └── ConfigProvider (Ant Design dark theme)
      └── Suspense (fallback: "Loading viewer...")
          └── Lazy-loaded route component
```

The route is determined by the `route` key injected via `data-config` HTML attribute on `#office-configs` div. Each route loads its component lazily via `React.lazy()`.

### Component Map


| Route   | Component        | Library             | Editable?            |
| --------- | ------------------ | --------------------- | ---------------------- |
| `hwp`   | `Hwp.tsx`        | rhwp-studio WASM    | Yes (full editing)   |
| `excel` | `Excel.tsx`      | x-data-spreadsheet  | Read + download      |
| `word`  | `Word.tsx`       | SuperDoc (`@superdoc-dev/react`) | Yes (DOCX viewer/editor) |
| `pptx`  | `Pptx.tsx`       | pptx-renderer + custom PowerPoint-like chrome | Read only            |
| `image` | `Image.tsx`      | react-image-gallery | Read only            |
| `zip`   | `Zip.tsx`        | AdmZip + tree view  | Extract + add/remove |
| `font`  | `FontViewer.tsx` | opentype.js         | Read only            |

### WebView Communication (`src/react/util/vscode.ts`)

```typescript
handler.on(event, callback)   // Register listener for host messages
handler.emit(event, data)     // Send message to host
```

Messages are validated: HWP events go through `hwpMessageSchema` validation before being emitted to the EventEmitter. Invalid payloads are silently dropped with a console warning.

### Config Injection (`src/react/util/vscodeConfig.ts`)

The host injects configuration into the WebView HTML at creation time:

```html
<div id="office-configs" data-config='{"route":"hwp","rhwpStudioUrl":"...","theme":"dark"}' />
```

The React app reads this at mount time to determine which component to render and what settings to apply.

---

## Wikilink System

### Parser (`src/service/wikilink/wikilinkParser.ts` — 89 lines)

Regex: `/(!)?\[\[([^\]\r\n]+)\]\]/g`

Parsed structure: `[[target|alias#heading^blockId]]`


| Field     | Example        | Purpose                                   |
| ----------- | ---------------- | ------------------------------------------- |
| `target`  | `My Note`      | Filename or relative path                 |
| `alias`   | `display text` | Optional display text after`|`            |
| `heading` | `Section`      | Optional heading fragment after`#`        |
| `blockId` | `abc123`       | Optional Obsidian-style block ID after`^` |
| `embed`   | `true`         | `![[...]]` prefix indicates embed         |

### Resolver (`src/service/wikilink/wikilinkResolver.ts` — 366 lines)

Resolution algorithm:

1. **Security check**: Reject absolute paths, `file:` protocol, `..` traversal
2. **Direct path**: If target contains `/`, try as workspace-relative path
3. **Workspace search**: Find all files matching target basename
4. **Scoring**: Rank candidates by directory distance + path length (prefer closest, shortest)
5. **Disambiguation**: If multiple matches with equal scores, show VS Code QuickPick

After resolving the file, navigate to:

- **Heading**: Regex search for `# heading` line
- **Block ID**: Search for `^blockId` pattern
- **Default**: Open file at line 1

### Completion Provider (`src/provider/wikilink/wikilinkCompletionProvider.ts` — 37 lines)

Triggers on `[`, `#`, `|` characters inside `[[...]]` context. Lists workspace markdown files as completion items.

---

## Service Layer

### Markdown Service (`src/service/markdownService.ts` — 240 lines)

**Export pipeline**: Detects installed Chromium (Edge > Chrome > Brave), spawns puppeteer-core with discovered executable, and converts Markdown → PDF/HTML/DOCX.

**Image paste**: Intercepts clipboard paste events, saves image bytes to disk using the configured path template (`vscode-office.pasterImgPath`), and inserts a Markdown image reference.

Template variables: `${fileName}`, `${now}`, `${workspaceDir}`, `${fileDir}`

### LibreOffice Converter (`src/service/pptx/libreOfficeConverter.ts` — 84 lines)

Converts legacy `.ppt` files to PDF via `soffice --headless --convert-to pdf`. Configurable executable path, 30-second timeout. Returns the generated PDF path or an error message.
