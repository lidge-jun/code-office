# Architecture

`code-office` is a VS Code extension that unifies document preview (spreadsheets, PPTX, PDF, image, font, archive) and editing (Markdown WYSIWYG, DOCX, HWP/HWPX) in a single workspace. This document explains the runtime architecture for contributors and maintainers.

## Trust Boundaries

The extension runs across three isolated surfaces:

```
┌─────────────────────────────────────────────────────┐
│  VS Code Extension Host (Node.js)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Markdown  │  │ Office /  │  │  HWP + DOCX       │  │
│  │ Provider  │  │ PPTX      │  │  Editor Providers │  │
│  │           │  │ Providers │  │  + Save Services  │  │
│  └────┬──┬──┘  └─────┬────┘  └──────┬───────────┘  │
│       │  │           │               │               │
├───────┼──┼───────────┼───────────────┼───────────────┤
│  WebView Sandbox (Chromium iframe)   │               │
│  ┌────┴──┴───┐  ┌────┴────┐  ┌──────┴───────────┐  │
│  │  Vditor    │  │  React   │  │  React HWP/DOCX   │  │
│  │  Markdown  │  │  Viewers │  │  + save bridges   │  │
│  │  Editor    │  │          │  │                    │  │
│  └───────────┘  └─────────┘  └──────┬───────────┘  │
│                                      │               │
│  ┌───────────────────────────────────┴──────────┐   │
│  │  Bundled WASM Runtime (rhwp-studio)           │   │
│  │  Loaded inside iframe, patched at build time  │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Extension Host** has full Node.js + VS Code API access. All file I/O happens here. Never in the WebView.

**WebView Panels** are sandboxed Chromium iframes. They communicate with the host only via `postMessage`. Content Security Policy restricts script execution to `'wasm-unsafe-eval'` (for rhwp-studio WASM).

**Bundled Runtimes** (rhwp-studio, Vditor, PDF.js) are third-party assets loaded by WebViews. rhwp-studio is post-processed at build time to inject a direct bridge for iframe communication. `resource/rhwp-vscode` is a separate vendored rhwp-vscode media pair used only by the extension host paragraph dump command; it is not the visual editor runtime. `resource/rhwp-native/<platform>-<arch>/rhwp-pdf-export` is a native helper used only for higher-quality HWP/HWPX PDF export.

## Provider Pattern

Document types are handled by dedicated providers registered in `src/extension.ts`:

| Provider | VS Code Interface | Documents |
|---|---|---|
| `MarkdownEditorProvider` | `CustomTextEditorProvider` | .md, .markdown |
| `HwpEditorProvider` | `CustomEditorProvider` | .hwp, .hwpx |
| `DocxEditorProvider` | `CustomEditorProvider` | .docx, .dotx |
| `PptxEditorProvider` | `CustomReadonlyEditorProvider` | .pptx, .pptm, .ppsx |
| `OfficeViewerProvider` | `CustomReadonlyEditorProvider` | spreadsheets, PDF, images, fonts, archives, HTML, and legacy preview/tooling surfaces |

The office viewer routes by file extension to the remaining shared preview components (Excel, ZIP, Image, Font) or to bundled viewers such as PDF.js/HTML. DOCX and PPTX no longer flow through the shared office viewer: DOCX uses the editable `cweijan.docxEditor` route, and PPTX uses the dedicated read-only `cweijan.pptxEditor` route.

## HWP Save Path (Critical)

The HWP editing stack has the most complex data flow due to the WebView sandbox:

1. User presses Ctrl+S
2. Extension host generates a `requestId` and sends `vscodeSave` message to WebView
3. React component calls `exportHwp()` on the rhwp bridge
4. Bridge asks WASM runtime to serialize the document to bytes
5. Byte array crosses back to the host via `vscodeSavePayload` message
6. Host validates magic bytes (OLE: `D0CF11E0`, ZIP: `504B0304`)
7. Host writes the validated bytes. Same-file `saveCustomDocument` writes in place to avoid rename churn in VS Code's custom editor lifecycle; Save As, backup, and toolbar fallback writes use temp-file atomic rename.

Timeout: 120 seconds. If the WebView doesn't respond, the save fails safely with no disk write.

Paragraph dump is intentionally host-side and disk-based. It uses `resource/rhwp-vscode/rhwp.js` plus `rhwp_bg.wasm`, reads the saved HWP/HWPX bytes from disk, and blocks when the open custom editor is dirty so unsaved WASM state is not confused with the on-disk snapshot.

PDF export is native-first and still local-only. The host shows the PDF save dialog once, saves a dirty editor through `saveCustomDocument`, then runs the current-platform helper from `resource/rhwp-native`. The helper reads the saved HWP/HWPX file, renders pages through rhwp native SVG, converts those SVG pages to PDF, and writes the selected destination. If the helper is missing, unsupported, or returns an error, the host asks the webview for sanitized Viewer page images and uses the existing `pdf-lib` image-PDF fallback.

## HWP Viewer / Editor Mode

HWP/HWPX still uses the existing `cweijan.hwpEditor` custom editor view type for compatibility. Internally, `HwpEditorProvider` stores a per-extension last mode in `context.globalState`: the first open defaults to `viewer`, and later tabs reuse the last user-selected `viewer` or `editor` mode. The React HWP controller keeps the rhwp editor DOM mounted even while Viewer is visible, because SVG export, debug overlay, and dirty save all operate on the same loaded WASM document.

Mode messages have strict directionality:

- Host to WebView: `hwp:modeChangeRequest`, `hwp:viewerCommand`
- WebView to Host: `hwp:modeChanged`, `hwp:viewerCommandRequest`, `hwp:viewerCommandResult`

Switching from a clean Editor to Viewer renders SVG pages immediately. Switching from a dirty Editor to Viewer first triggers the VS Code custom editor save lifecycle (`workbench.action.files.save`). Viewer mode is committed only after `saveResult.success`; failures, cancellations, and timeouts leave the tab in Editor and do not update the persisted last mode. Clean Viewer `Cmd+S` is a no-op, so it cannot open a browser/Finder save dialog.

`Cmd+F` / `Ctrl+F` is handled inside the HWP WebView before VS Code's default find command can take over. In Viewer mode it opens the local Viewer search box, scans rendered SVG text first so matching `<text>` / `<tspan>` elements can be highlighted, scrolls the active hit into view, and keeps the rhwp runtime text search only as a page-level fallback when SVG text is unavailable. In Editor mode it opens the bundled rhwp editor's own find control, preserving the upstream editor UX instead of invoking VS Code text search against the custom editor shell. While the rhwp find dialog is open, `Enter` / `Shift+Enter` is captured and routed to rhwp's next/previous find buttons even after rhwp moves focus to the document edit surface; this path must not depend on `document.activeElement`, because rhwp selection updates can make that value stale or point at the editor body.

## Configuration

Most settings use the inherited `vscode-office.*` namespace. HWP-specific settings use `code-office.hwp.*`. See the [full configuration reference](../structure/02-extension-api.md).

## Build

The extension is built with esbuild (Node.js entry) + Vite (React WebView). The critical post-processing step patches the bundled rhwp-studio to work inside VS Code's WebView iframe. See [build documentation](../structure/05-build-release.md).

## Attribution

This extension is derived from `cweijan/vscode-office` (MIT) via `rjwang1982/vscode-office`. HWP editing uses `edwardkim/rhwp` WASM runtime. Full attribution is in [NOTICE.md](../NOTICE.md).
