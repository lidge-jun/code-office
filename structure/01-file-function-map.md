---
created: 2026-05-30
tags: [code-office, file-map, function-map, code-structure]
aliases: [code-office file map]
---

# File and Function Map

This document is a fast map of the current `code-office` file layout. Use it to understand which files own which responsibilities before making changes.

The map matters because runtime responsibility is split across three isolated surfaces: the Node.js extension host (`src/provider/*`, `src/service/*`, `src/common/*`), sandboxed Chromium WebViews (`src/react/*`), and bundled third-party runtimes (`resource/*`). A visual change may require edits in React components, but a data-flow change requires provider-level work. Reading responsibilities and line counts together reveals impact radius.

Snapshot note, 2026-06-10: line counts are from the TypeScript/TSX sources after the HWP Viewer/Editor, native PDF export, HWP find-search updates, SuperDoc DOCX provider split, PowerPoint-like PPTX viewer split, and DOCX save-lifecycle hardening. `src/bundle/adm-zip/*`, `src/react/view/excel/x-spreadsheet/*`, and `resource/*` are vendored/bundled surfaces and are excluded from authored line-count enforcement unless intentionally forked.

---

## Top-Level Tree

```mermaid
graph TD
    ROOT["code-office"] --> SRC["src/<br/>Extension + React source"]
    ROOT --> RES["resource/<br/>Bundled runtimes"]
    ROOT --> STYLES["styles/<br/>Editor CSS"]
    ROOT --> STRUCT["structure/<br/>Architecture reference"]
    ROOT --> DEVLOG["devlog/<br/>Plans and archive"]
    ROOT --> DOCS["docs/<br/>GitHub Pages site"]
    ROOT --> SCRIPTS["scripts/<br/>Verification & release"]
    SRC --> EXT["extension.ts<br/>Activation entry"]
    SRC --> PROV["provider/<br/>Editor providers"]
    SRC --> SVC["service/<br/>Markdown, Wikilink, Zip"]
    SRC --> COMMON["common/<br/>Shared utilities"]
    SRC --> REACTSRC["react/<br/>WebView components"]
    RES --> RHWP["rhwp-studio/<br/>WASM HWP Viewer/Editor"]
    RES --> RHWPN["rhwp-native/<br/>PDF helper"]
    RES --> RHWPV["rhwp-vscode/<br/>paragraph dump media"]
    RES --> VDITOR["vditor/<br/>Markdown editor"]
    RES --> PDF["pdf/<br/>PDF.js viewer"]
```

## Extension Host — Source Files

### Core Entry

| File | Lines | Responsibility |
|---|---:|---|
| `src/extension.ts` | 219 | Activation entry: initializes services, registers providers, commands, wikilink completion |

### Provider Layer (`src/provider/`)

| File | Lines | Responsibility |
|---|---:|---|
| `provider/markdownEditorProvider.ts` | 290 | `CustomTextEditorProvider` wrapping Vditor; dual-mode (default + optional), handler binding, resource roots, config injection, wikilink cache payload push |
| `provider/officeViewerProvider.ts` | 122 | `CustomReadonlyEditorProvider` for shared preview surfaces; extension-based routing, PDF redirect, HTML hot-reload, HWP legacy redirect; DOCX/PPTX are handled by dedicated providers |
| `provider/hwp/HwpEditorProvider.ts` | 500 | `CustomEditorProvider<HwpCustomDocument>` with Viewer/Editor mode persistence, dirty save-then-view, SVG/PDF/debug/dump commands, pending RPC cleanup, full dirty/save/revert/backup lifecycle |
| `provider/docx/DocxEditorProvider.ts` | 219 | `CustomEditorProvider<DocxCustomDocument>` with editable DOCX open/save/saveAs/revert/backup lifecycle and webview save bridge |
| `provider/pptx/PptxEditorProvider.ts` | 62 | `CustomReadonlyEditorProvider<PptxCustomDocument>` for PPTX/PPTM/PPSX read-only viewer documents |
| `provider/hwp/hwpSaveService.ts` | 149 | Atomic file write (temp→rename), magic number validation (OLE/ZIP), size constraints, toolbar save dialog |
| `provider/hwp/HwpCustomDocument.ts` | 24 | Document model holding initial buffer, uri, and dispose callback |
| `provider/hwp/hwpParagraphDump.ts` | 97 | Host-side paragraph dump via vendored rhwp-vscode glue/WASM |
| `provider/hwp/hwpDebugOverlay.ts` | 23 | Debug overlay HTML builder for SVG page output |
| `provider/hwp/hwpPdfExportFlow.ts` | 47 | Native-first HWP PDF orchestration: one save dialog, dirty save, native helper, image fallback |
| `provider/hwp/hwpNativePdfExport.ts` | 69 | Host-side native helper launcher for rhwp SVG-to-PDF export |
| `provider/hwp/hwpPdfExport.ts` | 72 | Image PDF fallback from Viewer-rasterized PNG pages using `pdf-lib` |
| `provider/hwp/hwpStudioConfig.ts` | 45 | Local/remote rhwp-studio config resolution and bundled index loading |
| `provider/hwp/hwpSettings.ts` | 19 | `code-office.hwp.*` setting reader with legacy `vscode-obsidian.hwp.*` fallback |
| `provider/handlers/hwpHandler.ts` | 140 | WebView↔Host event binding for HWP: init, dirtyChanged, nativeSave, vscodeSavePayload, mode, viewer command events |
| `provider/handlers/docxHandler.ts` | 140 | WebView↔Host event binding for DOCX: buffer open, dirty state, save request/response bridge, host-save completion, lifecycle cleanup |
| `provider/handlers/pptxHandler.ts` | 32 | WebView↔Host event binding for PPTX: file URI open event and read-only viewer bridge cleanup |
| `provider/handlers/imageHandler.ts` | 44 | Image gallery data: sibling file list, current index, refresh on file change |
| `provider/compress/commonHandler.ts` | ~40 | Shared archive handler utilities |
| `provider/compress/zipHandler.ts` | 79 | ZIP/JAR/APK/VSIX tree parsing and extraction |
| `provider/compress/rarHandler.ts` | 137 | RAR archive handling (separate path from zip) |
| `provider/compress/decompressHandler.ts` | ~50 | Common decompression logic |
| `provider/wikilink/wikilinkCompletionProvider.ts` | 37 | `CompletionItemProvider` for `[[` triggers: workspace file suggestions |
| `provider/wikilink/wikilinkDocumentLinkProvider.ts` | ~40 | `DocumentLinkProvider` for wikilink navigation in Markdown |

### Service Layer (`src/service/`)

| File | Lines | Responsibility |
|---|---:|---|
| `service/markdownService.ts` | 240 | Markdown export pipeline (PDF/HTML/DOCX via chromium), image paste handler, clipboard image save |
| `service/wikilink/wikilinkResolver.ts` | 366 | Wikilink resolution: cache-backed Markdown candidate listing, scoring by directory distance, heading/blockId navigation, QuickPick disambiguation |
| `service/wikilink/wikilinkParser.ts` | 120 | Regex parser for `[[target|alias#heading^blockId]]` + embed syntax |
| `service/pptx/libreOfficeConverter.ts` | 84 | Legacy `.ppt` → PDF conversion via LibreOffice CLI, 30s timeout |
| `service/zip/zipUtils.ts` | 103 | ZIP tree parser, recursive size computation, timestamp formatting |
| `service/markdown/ext/markdown-it-mermaid.ts` | ~50 | markdown-it plugin for Mermaid diagram rendering |
| `service/markdown/ext/markdown-it-katex.js` | ~40 | markdown-it plugin for KaTeX math rendering |
| `service/markdown/holder.ts` | ~30 | Markdown rendering state holder |
| `service/markdown/outline.js` | ~60 | Markdown heading outline extraction |
| `service/markdown/html-export.js` | 188 | HTML export with asset inlining |
| `service/markdown/markdown-pdf.js` | 341 | PDF export via puppeteer-core |
| `service/htmlService.ts` | ~50 | HTML file handling and preview |

### Common Layer (`src/common/`)

| File | Lines | Responsibility |
|---|---:|---|
| `common/hwpMessageSchema.ts` | 272 | HWP event definitions for save, mode switching, viewer commands, PDF page payloads, TypeScript payload interfaces, runtime validation with type guards |
| `common/hwpSvgSanitizer.ts` | 43 | Conservative SVG sanitizer for rhwp Viewer/debug output |
| `common/reactApp.ts` | 136 | React WebView loader: dev mode (Vite HMR) vs production (bundled), CSP injection, asset path rewriting |
| `common/handler.ts` | 84 | `Handler` class: EventEmitter wrapper with bidirectional WebView messaging, auto-unsubscribe, error handling |
| `common/fileUtil.ts` | 61 | File I/O helpers: writeFile with mkdir, image path adjustment, workspace root resolution |
| `common/util.ts` | 37 | HTML path rewriting for WebView URIs, file change listener, confirm dialog |
| `common/global.ts` | 23 | Config getters/setters for `vscode-office.*` namespace |
| `common/Output.ts` | 24 | Lazy output channel "Office" for extension logging |

## WebView — React Source (`src/react/`)

### Entry and Routing

| File | Lines | Responsibility |
|---|---:|---|
| `react/main.tsx` | ~30 | React root with Ant Design ConfigProvider, lazy route-based component loading |
| `react/main.css` | ~20 | Global WebView CSS reset |
| `react/antThemeConfig.ts` | ~15 | Ant Design dark theme tokens |

### Utility

| File | Lines | Responsibility |
|---|---:|---|
| `react/util/vscode.ts` | ~40 | WebView↔Host message handler: `handler.on()` / `handler.emit()` |
| `react/util/vscodeConfig.ts` | ~30 | Config injection reader: parses `data-config` HTML attribute |
| `react/util/reactUtils.ts` | ~20 | Shared React utility hooks |

### View Components

| Component | File | Lines | Renderer |
|---|---|---:|---|
| HWP Controller | `react/view/hwp/Hwp.tsx` | 495 | Viewer/Editor state machine, save-then-view gating, host command RPC, find shortcut routing |
| HWP Viewer | `react/view/hwp/HwpViewer.tsx` | 151 | Viewer toolbar, page SVG list, Viewer search UI, developer menu |
| HWP Editor Surface | `react/view/hwp/HwpEditorSurface.tsx` | 49 | Editor toolbar and rhwp mount surface |
| HWP Find Helpers | `react/view/hwp/hwpFind.ts` | 318 | Cmd/Ctrl+F detection, Viewer SVG/rhwp text search, SVG hit decoration, rhwp editor find activation and Enter routing |
| HWP Viewer Search Hook | `react/view/hwp/useHwpViewerSearch.ts` | 32 | Memoized Viewer search result resolution that prefers highlightable SVG text and falls back to rhwp text search |
| HWP PDF Rasterizer | `react/view/hwp/hwpPdfPages.ts` | 82 | Converts sanitized Viewer SVG pages to PNG payloads for image-PDF fallback |
| HWP Bridge | `react/view/hwp/rhwpBridge/createSecureRhwpEditor.ts` | 500 | Dual-mode editor: local direct bridge / remote postMessage RPC |
| HWP SVG Export | `react/view/hwp/rhwpBridge/exportSvgPages.ts` | 35 | Shared pageCount/getPageSvg/debug overlay export helper |
| HWP Types | `react/view/hwp/rhwpBridge/types.ts` | 41 | Interface definitions for bridge |
| HWP Validator | `react/view/hwp/rhwpBridge/validateRhwpMessage.ts` | 11 | Message validation for rhwp bridge |
| Excel | `react/view/excel/Excel.tsx` | ~80 | x-data-spreadsheet + xlsx parser |
| Excel Reader | `react/view/excel/excel_reader.ts` | 214 | XLSX→x-spreadsheet data converter |
| Excel Writer | `react/view/excel/excel_writer.ts` | 80 | x-spreadsheet data→XLSX exporter |
| Word | `react/view/word/Word.tsx` | 979 | SuperDoc DOCX WebView surface with View/Edit mode mapping, host save bridge integration, dirty tracking, export fallback, and DOCX XML repair helpers. This is currently over-concentrated and is the top modularization target. |
| PPTX | `react/view/pptx/Pptx.tsx` | 476 | PowerPoint-like read-only viewer with visual thumbnails, resizable/collapsible sidebar, speaker notes, grid, fullscreen, presenter view, keyboard navigation, and zoom |
| Image | `react/view/image/Image.tsx` | ~40 | react-image-gallery |
| ZIP | `react/view/compress/Zip.tsx` | ~60 | Tree view with extract/add/remove |
| Font | `react/view/fontViewer/FontViewer.tsx` | ~100 | opentype.js glyph inspector |

### Vendored: x-spreadsheet (`react/view/excel/x-spreadsheet/`)

Full vendored copy of `x-data-spreadsheet` with custom modifications. ~4,000 lines of JS. Not authored code — treat as a dependency.

## Bundled Resources (`resource/`)

| Directory | Contents | Loaded by |
|---|---|---|
| `resource/rhwp-studio/` | Post-processed WASM HWP editor (index.html + assets) | `HwpEditorProvider` via iframe |
| `resource/rhwp-vscode/` | Matched rhwp-vscode `rhwp.js` + `rhwp_bg.wasm` media pair | Host-side paragraph dump |
| `resource/rhwp-native/` | Platform-native `rhwp-pdf-export` helper binaries | Native-first HWP/HWPX PDF export |
| `resource/vditor/` | Vditor markdown editor bundle | `markdownEditorProvider` via WebView |
| `resource/pdf/` | PDF.js viewer (viewer.html + assets) | `officeViewerProvider` for .pdf files |
| `resource/lib/` | Shared JS libraries | Various providers |

## Build and Scripts

| File | Lines | Responsibility |
|---|---:|---|
| `build.ts` | 229 | esbuild config, dependency bundling, rhwp-studio post-processing (path rewrite, bridge injection, SVG/debug/search bridge, PWA strip) |
| `vite.config.ts` | ~30 | Vite config for React WebView dev/build |
| `tsconfig.json` | ~20 | TypeScript strict config |
| `scripts/verify-hwp-hardening.mjs` | 248 | Release gate: HWP editor activation, provider methods, mode/viewer command wiring, find routing, PDF/export paths, handler bindings |
| `scripts/verify-vsix.mjs` | 175 | Release gate: package metadata, README/GitHub Pages coverage, VSIX structure, native helper, manifest, build artifacts |

## Authored Line Count Summary

| Surface | Lines | Notes |
|---|---:|---|
| Extension Host (providers + services + common) | ~2,900 | Node.js, VS Code API |
| React WebView (views + utils) | ~2,100 | Chromium, React 18 |
| Build + Scripts | ~400 | esbuild, verification |
| **Total authored** | **~10,100** | Excludes vendored x-spreadsheet, adm-zip, and bundled resources |

## Current Structural Watchlist

| File | Lines | Reason |
|---|---:|---|
| `src/react/view/word/Word.tsx` | 979 | Exceeds the 500-line dev rule and combines UI, host bridge, dirty state, export fallback, and XML repair logic. |
| `src/provider/hwp/HwpEditorProvider.ts` | 500 | At the hard limit; future behavior should be extracted. |
| `src/react/view/hwp/rhwpBridge/createSecureRhwpEditor.ts` | 500 | At the hard limit; future bridge behavior should be extracted. |
| `src/react/view/pptx/Pptx.tsx` | 476 | Near the limit; future PPTX UI should stay in child components. |
