# Architecture

`code-office` is a VS Code extension that unifies document preview (Office, PDF, image, font, archive) and editing (Markdown WYSIWYG, HWP/HWPX) in a single workspace. This document explains the runtime architecture for contributors and maintainers.

## Trust Boundaries

The extension runs across three isolated surfaces:

```
┌─────────────────────────────────────────────────────┐
│  VS Code Extension Host (Node.js)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Markdown  │  │  Office   │  │  HWP Editor      │  │
│  │ Provider  │  │  Viewer   │  │  Provider         │  │
│  │           │  │  Provider │  │  + Save Service   │  │
│  └────┬──┬──┘  └─────┬────┘  └──────┬───────────┘  │
│       │  │           │               │               │
├───────┼──┼───────────┼───────────────┼───────────────┤
│  WebView Sandbox (Chromium iframe)   │               │
│  ┌────┴──┴───┐  ┌────┴────┐  ┌──────┴───────────┐  │
│  │  Vditor    │  │  React   │  │  React (Hwp.tsx)  │  │
│  │  Markdown  │  │  Viewers │  │  + rhwp Bridge    │  │
│  │  Editor    │  │  (7 types│  │                    │  │
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

**Bundled Runtimes** (rhwp-studio, Vditor, PDF.js) are third-party assets loaded by WebViews. rhwp-studio is post-processed at build time to inject a direct bridge for iframe communication.

## Provider Pattern

All document types are handled by three providers registered in `src/extension.ts`:

| Provider | VS Code Interface | Documents |
|---|---|---|
| `MarkdownEditorProvider` | `CustomTextEditorProvider` | .md, .markdown |
| `HwpEditorProvider` | `CustomEditorProvider` | .hwp, .hwpx |
| `OfficeViewerProvider` | `CustomReadonlyEditorProvider` | Everything else (~20 types) |

The office viewer routes by file extension to one of 7 React components (Excel, Word, PPTX, ZIP, Image, Font, PPTX) or to the bundled PDF.js viewer.

## HWP Save Path (Critical)

The HWP editing stack has the most complex data flow due to the WebView sandbox:

1. User presses Ctrl+S
2. Extension host generates a `requestId` and sends `vscodeSave` message to WebView
3. React component calls `exportHwp()` on the rhwp bridge
4. Bridge asks WASM runtime to serialize the document to bytes
5. Byte array crosses back to the host via `vscodeSavePayload` message
6. Host validates magic bytes (OLE: `D0CF11E0`, ZIP: `504B0304`)
7. Host writes to a temp file, then atomically renames to the target path

Timeout: 120 seconds. If the WebView doesn't respond, the save fails safely with no disk write.

## Configuration

Most settings use the inherited `vscode-office.*` namespace. HWP-specific settings use `code-office.hwp.*`. See the [full configuration reference](../structure/02-extension-api.md).

## Build

The extension is built with esbuild (Node.js entry) + Vite (React WebView). The critical post-processing step patches the bundled rhwp-studio to work inside VS Code's WebView iframe. See [build documentation](../structure/05-build-release.md).

## Attribution

This extension is derived from `cweijan/vscode-office` (MIT) via `rjwang1982/vscode-office`. HWP editing uses `edwardkim/rhwp` WASM runtime. Full attribution is in [NOTICE.md](../NOTICE.md).
