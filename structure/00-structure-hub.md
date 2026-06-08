---
created: 2026-05-30
tags: [code-office, structure-docs, architecture, vscode-extension]
aliases: [code-office structure hub, code-office architecture]
---
# code-office Structure Hub

`code-office` is an independent VS Code extension that brings local HWP/HWPX Viewer+Editor modes, editable DOCX review, WYSIWYG/Raw Markdown editing via Vditor, PowerPoint-like PPTX review, and read-only spreadsheet/PDF/image/font/archive previews into a single workspace. The extension is a ground-up restructuring of the abandoned `vscode-office` (cweijan → rjwang1982 fork) lineage, with HWP/HWPX document review and AI-era cross-format workflows as the primary new value.

This hub matters because the extension straddles three very different runtime surfaces. The **extension host** (`src/extension.ts` + `src/provider/*`) runs in VS Code's Node.js process and owns file I/O, lifecycle, and command dispatch. **WebView panels** (`src/react/*`) run in sandboxed Chromium iframes and own all visual rendering. **Bundled runtimes** (`resource/rhwp-studio`, `resource/vditor`, `resource/pdf`) are third-party assets patched at build time and loaded by the React app inside WebViews. A change in any surface can ripple into the other two, so the structure docs exist to make that impact radius explicit.

Snapshot note, 2026-06-08: current package version is `code-office@3.7.46`. The extension was rebranded from `vscode-obsdian` in this release cycle. Recent HWP/HWPX work added internal Viewer/Editor modes, native-first PDF export, Viewer `Cmd+F`/`Ctrl+F` highlighting, and rhwp Editor find routing. The current merge candidate also splits DOCX and PPTX away from the shared office viewer: DOCX uses editable `cweijan.docxEditor`, and PPTX uses read-only `cweijan.pptxEditor`. Runtime `viewType` identifiers (`cweijan.officeViewer`, `cweijan.hwpEditor`, etc.) and most configuration keys (`vscode-office.*`) intentionally retain legacy strings for backward compatibility. New owned commands and HWP-specific settings use the `code-office.*` prefix.

Start here when onboarding. Read the system overview, then open `[[01-file-function-map]]` for concrete file locations. Use `[[02-extension-api]]` for VS Code integration surface work, `[[03-hwp-subsystem]]` for HWP/HWPX editing changes, `[[04-viewer-architecture]]` for viewer and Markdown editor changes, `[[05-build-release]]` for build/packaging/CI, and `[[06-devlog-map]]` for roadmap and archive interpretation.

---

## System Overview

```mermaid
graph LR
    EXT["src/extension.ts<br/>Activation & Registration"] --> MD["markdownEditorProvider<br/>Vditor WYSIWYG"]
    EXT --> HWP["HwpEditorProvider<br/>HWP/HWPX Editing"]
    EXT --> OV["officeViewerProvider<br/>Shared Preview Router"]
    EXT --> DOCX["DocxEditorProvider<br/>Editable DOCX"]
    EXT --> PPTX["PptxEditorProvider<br/>PowerPoint-like Viewer"]
    EXT --> WL["wikilinkResolver<br/>[[wikilink]] Nav"]
    HWP --> SAVE["hwpSaveService<br/>Atomic Write + Magic"]
    HWP --> BRIDGE["rhwpBridge<br/>WASM Viewer/Editor IPC"]
    HWP --> NATIVEPDF["resource/rhwp-native<br/>PDF helper"]
    HWP --> RHWPV["resource/rhwp-vscode<br/>Paragraph dump"]
    OV --> REACT["React WebView<br/>Excel Zip Image Font"]
    DOCX --> WORD["React WebView<br/>Word.tsx + eigenpal"]
    PPTX --> SLIDES["React WebView<br/>Pptx.tsx + pptx-renderer"]
    MD --> VDITOR["resource/vditor<br/>Bundled Editor"]
    HWP --> RHWP["resource/rhwp-studio<br/>Bundled WASM"]
    OV --> PDF["resource/pdf<br/>PDF.js Viewer"]
```

The runtime path is layered by trust boundary. The extension host has full Node.js + VS Code API access and owns all disk I/O. WebView panels are sandboxed Chromium frames that communicate with the host only via `postMessage`. Bundled runtimes (rhwp-studio, Vditor, PDF.js) run inside those WebViews and are further restricted by Content Security Policy. The HWP subsystem adds an additional validation layer: every byte array crossing the WebView→Host boundary is checked against format-specific magic numbers before being written to disk.

## Reading Order


| Order | Document                     | Why to read it                                                   |
| ------: | ------------------------------ | ------------------------------------------------------------------ |
|     1 | `[[00-structure-hub]]`       | Understand the system flow and document map.                     |
|     2 | `[[01-file-function-map]]`   | Locate files, line counts, and module responsibilities.          |
|     3 | `[[02-extension-api]]`       | Understand commands, configuration, custom editors, keybindings. |
|     4 | `[[03-hwp-subsystem]]`       | Understand HWP/HWPX editing lifecycle, save, bridge, security.   |
|     5 | `[[04-viewer-architecture]]` | Understand office viewer routing, Markdown editor, React views.  |
|     6 | `[[05-build-release]]`       | Understand build pipeline, VSIX packaging, verification, CI.     |
|     7 | 06-devlog-map                | Understand devlog folder structure, roadmap, completed work.     |

## Document Map


| Document                    | Scope                                                                  | Update when                                                                                |
| ----------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `00-structure-hub.md`       | Entry point, doc relationships, system overview                        | A doc is added, removed, renamed, or re-scoped.                                            |
| `01-file-function-map.md`   | File tree, line counts, responsibilities                               | Files move, large modules split, or line counts change.                                    |
| `02-extension-api.md`       | VS Code integration surface: commands, config, editors, keybindings    | `package.json` contributes, `extension.ts`, or any command/config changes.                 |
| `03-hwp-subsystem.md`       | HWP editing lifecycle, save service, rhwp bridge, message schema       | `src/provider/hwp/*`, `src/react/view/hwp/*`, or `src/common/hwpMessageSchema.ts` changes. |
| `04-viewer-architecture.md` | Office viewer routing, Markdown editor, React app, all view components | `officeViewerProvider.ts`, `markdownEditorProvider.ts`, `src/react/*` changes.             |
| `05-build-release.md`       | esbuild, rhwp post-processing, VSIX, verification scripts, CI          | `build.ts`, `scripts/*`, `.github/*`, `package.json` scripts changes.                      |
| `06-devlog-map.md`          | `_plan`, `_fin`, roadmap interpretation                                | Devlog folders move or the active roadmap changes.                                         |

## Cross References


| Document                 | Should also check                                                |
| -------------------------- | ------------------------------------------------------------------ |
| `01-file-function-map`   | `02-extension-api`, `04-viewer-architecture`, `05-build-release` |
| `02-extension-api`       | `03-hwp-subsystem`, `04-viewer-architecture`                     |
| `03-hwp-subsystem`       | `02-extension-api`, `04-viewer-architecture`, `05-build-release` |
| `04-viewer-architecture` | `02-extension-api`, `03-hwp-subsystem`                           |
| `05-build-release`       | `01-file-function-map`, `03-hwp-subsystem`                       |
| `06-devlog-map`          | `00-structure-hub`, `direction.md`, `roadmap.md`                 |

## Attribution

This extension is distributed under AGPL-3.0-or-later after bundling SuperDoc for DOCX rendering/editing. It remains derived from [`cweijan/vscode-office`](https://github.com/cweijan/vscode-office) (original) via [`rjwang1982/vscode-office`](https://github.com/rjwang1982/vscode-office) (maintained fork), both MIT licensed. HWP editing, viewing, search, and PDF helper paths use [`edwardkim/rhwp`](https://github.com/edwardkim/rhwp). Full attribution is in `NOTICE.md`.
