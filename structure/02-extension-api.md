---
created: 2026-05-30
tags: [code-office, extension-api, commands, configuration, custom-editors]
aliases: [code-office extension API, code-office commands, code-office settings]
---

# Extension API Surface

This document covers everything `code-office` exposes to VS Code and the end user: custom editors, commands, configuration keys, keybindings, languages, and themes. If you are adding or changing any user-facing surface, start here to understand the existing contracts.

The API surface matters because `code-office` straddles two naming epochs. New owned surfaces use the `code-office.*` prefix; inherited surfaces still use `vscode-office.*`, `office.*`, and `cweijan.*` identifiers for backward compatibility. Changing an inherited ID without a migration path breaks existing user settings and file associations.

---

## Custom Editors

Eight custom editor registrations in `package.json.contributes.customEditors`:

| viewType | Priority | Provider | File Types |
|---|---|---|---|
| `cweijan.officeViewer` | default | `OfficeViewerProvider` | xlsx, xlsm, xls, csv, ods, pdf, ttf, woff, woff2, otf, jar, zip, rar, apk, vsix, svg |
| `cweijan.hwpEditor` | default | `HwpEditorProvider` | hwp, hwpx |
| `cweijan.docxEditor` | default | `DocxEditorProvider` | docx, dotx |
| `cweijan.pptxEditor` | default | `PptxEditorProvider` | pptx, pptm, ppsx |
| `cweijan.imageViewer` | option | `OfficeViewerProvider` | jpg, png, gif, apng, bmp, ico, webp, tif, tiff, svg, jfif, avif, psd |
| `cweijan.markdownViewer` | *(default)* | `MarkdownEditorProvider` | file:/**/*.md, file:/**/*.markdown |
| `cweijan.markdownViewer.optional` | option | `MarkdownEditorProvider` | *.md, *.markdown |
| `cweijan.htmlViewer` | option | `OfficeViewerProvider` | html, htm |

The Markdown editor has two registrations: the primary one with `file://` scheme selector (auto-opens for local files) and an optional fallback for non-file schemes (remote, untitled).

HWP/HWPX files are forced to the dedicated `cweijan.hwpEditor` provider on activation via `ensureHwpEditorAssociation()` in `extension.ts`. If a user somehow has them bound to the legacy office viewer, the extension silently redirects at runtime.

The HWP view type remains a single custom editor entry. Viewer and Editor are internal modes, not separate VS Code editor registrations.

DOCX and PPTX are no longer routed through `cweijan.officeViewer`. DOCX uses an editable `CustomEditorProvider` so VS Code owns dirty/save/revert/backup lifecycle, while PPTX uses a dedicated read-only custom editor for the PowerPoint-like viewer chrome.

## Commands

| Command ID | Category | Title | Notes |
|---|---|---|---|
| `office.quickOpen` | ShortcutMenuBar | Quick Open | Go to File picker; icon shown if `vscode-office.quickOpen` is true |
| `office.markdown.switch` | — | Toggle Editor Mode | Switch between WYSIWYG / IR / Split-View |
| `office.markdown.paste` | — | Markdown Paste | Enhanced paste with image clipboard support |
| `office.html.preview` | — | Preview HTML | Opens HTML file in preview WebView |
| `code-office.previewLegacyPresentation` | — | Preview Legacy Presentation | .ppt → PDF conversion via LibreOffice |
| `code-office.hwp.save` | `code-office` | Save HWP/HWPX Document | Runs the VS Code custom editor save lifecycle |
| `code-office.hwp.switchToViewer` | `code-office` | HWP/HWPX: Switch to Viewer | Requests internal Viewer mode; dirty Editor saves first |
| `code-office.hwp.switchToEditor` | `code-office` | HWP/HWPX: Switch to Editor | Requests internal Editor mode |
| `code-office.hwp.exportSvg` | `code-office` | HWP/HWPX: Export SVG Pages | Writes one SVG file per rendered page |
| `code-office.hwp.exportPdf` | `code-office` | HWP/HWPX: Save as PDF | Saves through one VS Code dialog, uses the bundled native rhwp PDF helper first, then falls back to WebView image-PDF export |
| `code-office.hwp.debugOverlay` | `code-office` | HWP/HWPX: Show Debug Overlay | Opens a debug overlay WebView with SVG pages |
| `code-office.hwp.dumpParagraph` | `code-office` | HWP/HWPX: Dump Paragraph | Uses vendored rhwp-vscode media to inspect paragraph metadata |
| `code-office.openWikilink` | — | Open Wikilink | Navigate `[[wikilink]]` under cursor |
| `code-office.openWikilinkBody` | — | Open Wikilink (Body) | Navigate wikilink from text body |
| `vscode-office.save-response-body` | — | Save Response Body | REST client feature |
| `vscode-office.copy-response-body` | — | Copy Response Body | REST client feature |
| `office.reg.jumpToKey` | — | Jump to Key | Registry file key navigation |

## Keybindings

| Shortcut | Command | When |
|---|---|---|
| `Ctrl+V` / `Cmd+V` | `office.markdown.paste` | `activeCustomEditorId == 'cweijan.markdownViewer'` |
| `Ctrl+Shift+V` | `office.html.preview` | `activeCustomEditorId == 'cweijan.htmlViewer'` |
| `Ctrl+Alt+E` / `Ctrl+Cmd+E` | `office.markdown.switch` | In markdown editor |
| `Ctrl+Enter` / `Cmd+Enter` | `vscode-office.request` | `editorLangId == 'http'` |
| `Ctrl+S` / `Cmd+S` | `code-office.hwp.save` | `activeCustomEditorId == cweijan.hwpEditor` |

## Configuration Keys

### Markdown / General Settings (`vscode-office.*`)

| Key | Type | Default | Description |
|---|---|---|---|
| `vscode-office.quickOpen` | boolean | `false` | Show quick open icon in editor title |
| `vscode-office.viewAbsoluteLocal` | boolean | `false` | Allow absolute local paths in Markdown images (security risk) |
| `vscode-office.chromiumPath` | string | `""` | Custom Chromium path for PDF/DOCX export |
| `vscode-office.pdfMarginTop` | integer | `25` | PDF export top margin (px) |
| `vscode-office.editorMode` | enum | `ir` | Markdown editor mode: `wysiwyg`, `ir`, `sv`, `raw` |
| `vscode-office.openOutline` | boolean | `true` | Show heading outline panel |
| `vscode-office.hideToolbar` | boolean | `false` | Hide Vditor toolbar |
| `vscode-office.previewCode` | boolean | `true` | Enable code syntax highlighting |
| `vscode-office.preventMacOptionKey` | boolean | `true` | macOS Option key special char fix |
| `vscode-office.editorTheme` | enum | `Light` | Editor theme: `Light`, `Dark`, `Wechat`, `Ant` |
| `vscode-office.previewCodeHighlight.style` | enum | `dracula` | Code block highlight theme |
| `vscode-office.previewCodeHighlight.showLineNumber` | boolean | `true` | Show line numbers in code blocks |
| `vscode-office.editorLanguage` | enum | `en_US` | Vditor UI language: `en_US`, `zh_CN`, `ja_JP`, `ko_KR` |
| `vscode-office.workspacePathAsImageBasePath` | boolean | `false` | Use workspace root for relative image paths |
| `vscode-office.pasterImgPath` | string | `image/${fileName}/${now}.png` | Template for pasted image file path |

### PPTX Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `vscode-office.pptx.libreOfficePath` | string | `""` | LibreOffice executable path for .ppt conversion |

### HWP Settings (`code-office.hwp.*`)

| Key | Type | Default | Description |
|---|---|---|---|
| `code-office.hwp.experimentalSave` | boolean | `true` | Show toolbar Save button in HWP editor |
| `code-office.hwp.studioUrl` | string | `""` | Remote rhwp-studio URL (empty = use bundled local) |

HWP configuration uses a cascading resolution: Workspace Folder Language → Workspace → Global Language → Global → Default. Legacy `vscode-obsidian.hwp.*` keys are also checked as fallback.

## Languages

| Language ID | Extensions | Description |
|---|---|---|
| `reg` | `.reg` | Windows Registry syntax with highlighting |
| `http` | `.http` | HTTP client request syntax with snippets |

## Themes

| Theme | Description |
|---|---|
| One Dark Modern | Dark theme variant |
| One Dark Modern Classic | Classic dark theme variant |

## Naming Convention

| Prefix | Epoch | Used for |
|---|---|---|
| `code-office.*` | New (2026+) | HWP config, new commands, branded surfaces |
| `vscode-office.*` | Inherited | Markdown/general config, REST client commands |
| `office.*` | Inherited | Quick open, markdown switch/paste, HTML preview |
| `cweijan.*` | Inherited | All `viewType` identifiers for custom editors |

A future migration phase may unify these under `code-office.*`, but it requires updating every existing user's `settings.json` and file associations. The current strategy is to keep inherited IDs stable and only use `code-office.*` for net-new surfaces.
