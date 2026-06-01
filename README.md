<p align="center">
  <img src="images/logo-new.png" width="128" height="128" alt="code-office logo">
</p>

# code-office

English | [简体中文](README-CN.md) | [한국어](README-KO.md)

[![CI](https://github.com/lidge-jun/code-office/actions/workflows/main.yml/badge.svg)](https://github.com/lidge-jun/code-office/actions/workflows/main.yml)
[![GitHub Pages](https://github.com/lidge-jun/code-office/actions/workflows/pages.yml/badge.svg)](https://github.com/lidge-jun/code-office/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/github/license/lidge-jun/code-office)](LICENSE)
![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.64.0-24a0ed)

`code-office` is an independent VS Code extension for opening, reviewing,
and editing document-heavy workspaces: Korean HWP/HWPX, Markdown notes, Office
files, PDFs, archives, images, HTTP request files, registry files, and HTML.

- Project homepage: <https://lidge-jun.github.io/code-office/>
- Repository: <https://github.com/lidge-jun/code-office>
- Architecture notes: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- FAQ: [docs/FAQ.md](docs/FAQ.md)
- Contribution guide: [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)

Distribution status: this repository currently uses local VSIX packaging as the
verified install path. A public GitHub Release has not been cut yet, so this
README intentionally does not claim a downloadable latest release.

The main product split from upstream office viewers is **editable HWP/HWPX with
a bundled local rhwp-studio runtime**. Common `.hwp` and `.hwpx` files can be
opened, edited, and saved without Hancom Office, LibreOffice, or a remote
service as the default path.

AI tools now create more drafts, citations, meeting notes, and source documents
than teams can comfortably inspect in isolated viewers. This extension does not
claim AI generation. It provides the VS Code document surface for that review
loop: generated DOCX reports beside Markdown notes, Korean HWP/HWPX references
beside source files, and provenance-sensitive formats kept in one workspace.

This project is not affiliated with or endorsed by Obsidian, Hancom, Microsoft,
cweijan/vscode-office, rjwang1982/vscode-office, or rhwp.

## What Makes It Different

- **HWP/HWPX editor**: full rhwp toolbar, text editing, table/cell selection,
  local WASM runtime, VS Code native save lifecycle.
- **Format-aware save**: HWP files write HWP bytes, HWPX files write HWPX
  zip/XML packages, and mismatched output is rejected before disk writes.
- **Office and workspace previews**: Word, Excel, PDF, PowerPoint, images,
  fonts, archives, HTTP request files, registry files, and HTML.
- **Markdown workspace**: Vditor-based Markdown editing with Obsidian-like
  Live Preview, Reading Preview, WebView-local Raw Source, wikilinks, and
  inherited export paths for PDF, DOCX, and HTML.
- **Independent brand surface**: repository metadata, GitHub Pages, package
  icon, README, and notices now point at this project while preserving required
  MIT lineage.

## Product Screenshots

The screenshots below come from local smoke samples built for this repository.
Office/PDF/HWP captures were taken in VS Code Insiders after installing the
packaged VSIX. The HTML capture is the same local review sample rendered
directly for a clean visual check. Temporary samples are generated outside the
repo so tracked vendor documents are not modified.

<table>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/code-office-hwp-editor.png" alt="Editable Korean HWP document with toolbar controls inside VS Code" width="720"><br>
      <strong>Local HWP/HWPX editing</strong><br>
      Bundled rhwp-studio runtime, full toolbar surface, and VS Code save lifecycle.
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/code-office-docx-preview.png" alt="DOCX review brief previewed inside VS Code" width="720"><br>
      <strong>DOCX and source-context review</strong><br>
      Generated briefs and source notes stay together instead of moving through disconnected viewers.
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/code-office-xlsx-dashboard.png" alt="XLSX review dashboard previewed inside VS Code" width="720"><br>
      <strong>XLSX review dashboard</strong><br>
      Spreadsheet gates, owners, scores, and publish readiness are inspectable inside the workspace.
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/code-office-pdf-brief.png" alt="PDF source review map previewed inside VS Code" width="720"><br>
      <strong>PDF evidence map</strong><br>
      Source packets and provenance maps stay beside drafts and Korean office references.
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/code-office-pptx-preview.png" alt="PPTX text and media preview inside VS Code" width="720"><br>
      <strong>PPTX text/media preview</strong><br>
      Narrative decks are available for lightweight inspection while deeper fidelity work remains on the roadmap.
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/code-office-html-preview.png" alt="HTML review room sample rendered for visual smoke testing" width="720"><br>
      <strong>HTML export review</strong><br>
      Web drafts can be checked as part of the same AI-era document review flow.
    </td>
  </tr>
</table>

## Install

Build and install a local VSIX:

```bash
npm install
npm run release:local
```

Install the generated package from the repository root:

```bash
code --install-extension ./code-office-<version>.vsix
```

For VS Code Insiders:

```bash
code-insiders --install-extension ./code-office-<version>.vsix --force
```

After installation, open a supported file and choose `code-office` when VS
Code asks for an editor. HWP/HWPX files are registered through the inherited
`cweijan.hwpEditor` custom editor ID for compatibility with existing VS Code
custom editor associations.

## Supported Formats

| Format | Extensions | Mode | Notes |
| --- | --- | --- | --- |
| HWP / HWPX | `.hwp`, `.hwpx` | Editable | Bundled local rhwp-studio WASM runtime. Saves HWP as HWP and HWPX as HWPX. |
| Markdown | `.md`, `.markdown` | Editable | Vditor editor, export to PDF/DOCX/HTML through inherited paths. |
| Word | `.docx`, `.dotx` | Preview | Uses docx-preview/docxjs-derived rendering. |
| Excel / Spreadsheet | `.xls`, `.xlsx`, `.xlsm`, `.csv`, `.ods` | Preview / existing edit paths | Uses the inherited spreadsheet viewer stack. |
| PowerPoint | `.pptx` | Read-only preview | Text/media preview; complex layout fidelity is not yet PowerPoint-level. |
| Legacy PowerPoint | `.ppt` | Optional fallback | LibreOffice conversion is opt-in and disabled by default. |
| PDF | `.pdf` | Preview | Bundled PDF viewer. |
| Images | `.jpg`, `.png`, `.gif`, `.webp`, `.tif`, `.ico`, `.svg` | Preview | Image and SVG preview surfaces. |
| Fonts | `.ttf`, `.otf`, `.woff`, `.woff2` | Preview | Font viewer. |
| Archives | `.zip`, `.jar`, `.vsix`, `.rar`, `.apk` | Preview / extract | Zip/RAR package browsing. |
| HTTP / REST | `.http`, `.rest` | Tooling | Inherited Rest Client-derived helpers. |
| Windows Registry | `.reg` | Preview / navigation | Registry syntax and jump helper. |
| HTML | `.html`, `.htm` | Preview | WebView HTML preview. |

## HWP/HWPX Editing

HWP support is powered by a pinned local build of
[edwardkim/rhwp](https://github.com/edwardkim/rhwp), vendored as
`vendor/rhwp-studio-dist` and copied into `resource/rhwp-studio` during build.

The VS Code integration uses a dedicated editable `CustomEditorProvider`:

```text
HWP/HWPX file
  -> HwpEditorProvider
  -> React HWP view
  -> local rhwp-studio bridge
  -> rhwp WASM document engine
  -> exportHwp/exportHwpx
  -> VS Code saveCustomDocument
```

What works today:

- Open `.hwp` and `.hwpx` files with the full rhwp editor toolbar.
- Edit text and use rhwp table/cell selection features.
- Save with `Cmd+S` / `Ctrl+S` or the toolbar button.
- Preserve the destination format: `.hwp` writes HWP bytes, `.hwpx` writes HWPX
  bytes.
- Use the bundled local runtime by default without network access.

Known limits:

- rhwp is not Hancom Office. Very complex HWP/HWPX documents may still have
  layout or round-trip differences.
- Bundled open fonts are used as fallbacks. Proprietary Hancom or Microsoft
  fonts are not bundled.
- Optional `code-office.hwp.studioUrl` is an advanced trusted remote runtime
  override; the default remains local.

## Settings

| Setting | Default | Purpose |
| --- | --- | --- |
| `code-office.hwp.experimentalSave` | `true` | Shows the HWP/HWPX toolbar save button. VS Code native save still works for dirty custom editor documents. |
| `code-office.hwp.studioUrl` | `""` | Optional trusted remote rhwp studio URL. Leave empty for the bundled local runtime. |
| `vscode-office.editorMode` | `ir` | Markdown editor mode. Use `ir` for Live Preview, `wysiwyg` for WYSIWYG, `sv` for Split View, or `raw` for WebView-local Raw Source. |
| `vscode-office.pptx.libreOfficePath` | `""` | Optional LibreOffice executable path for legacy `.ppt` fallback. |
| `vscode-office.pptx.conversionTimeoutMs` | `30000` | Timeout for optional LibreOffice conversion. |

Some `vscode-office.*`, `office.*`, and `cweijan.*` identifiers intentionally
remain for compatibility with existing settings, commands, and custom editor
associations. Runtime ID migration is tracked as a separate compatibility task.
Previous `vscode-obsdian.hwp.*` values are read as a legacy fallback, but new
documentation and package settings use `code-office.hwp.*`.

## Release Checks

For local release verification:

```bash
npm run release:local
```

The release gate runs type checks, builds the WebView and extension host,
verifies HWP hardening assumptions, packages the VSIX, and checks that the VSIX
contains the bundled rhwp runtime while excluding samples, vendor sources, docs,
and development scripts. `npm run smoke` is an alias for the same full gate.

Manual smoke before publishing:

```text
1. Install the generated VSIX in VS Code or VS Code Insiders.
2. Open a .hwp file, edit text, save, close, and reopen.
3. Open a .hwpx file, edit text, select table cells, save, close, and reopen.
4. Open Markdown, HTML, XLSX, DOCX, PDF, PPTX, image, and archive samples.
5. Confirm no stale HWP loading banner or false Save As prompt remains.
```

Marketplace publish is intentionally gated:

```bash
npm run publish
```

This first runs `npm run release:local`, then invokes `vsce publish
--no-dependencies`.

## Support, Security, and Contribution

- Use [GitHub Issues](https://github.com/lidge-jun/code-office/issues) for bug
  reports and feature requests.
- Read [docs/FAQ.md](docs/FAQ.md) before filing format-support issues.
- Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing the HWP,
  Markdown, Office, or WebView surfaces.
- Follow [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for local setup,
  verification, and contribution workflow.
- Do not attach private office documents to public issues. Reproduce problems
  with redacted samples or synthetic files whenever possible.
- `code-office.hwp.studioUrl` can point at a trusted remote rhwp studio, but the
  default runtime is local. Treat remote studio URLs as trusted-code inputs.

## GitHub Pages

The product page is deployed from `docs/` through
[.github/workflows/pages.yml](.github/workflows/pages.yml). It is a public
marketing and documentation surface only; the extension does not use GitHub
Pages at runtime by default.

The package icon source is `images/logo-new.svg`, rendered to
`images/logo-new.png`, and copied to `docs/assets/logo-new.png` for the Pages
site. The logo was created for this repository from an OpenAI image generation
concept and manually simplified into SVG; it is not derived from upstream
vscode-office artwork or any third-party app logo.

## Roadmap

- Obsidian-style `[[wikilink]]` completion, navigation, and WebView/export
  integration.
- PPTX preview stabilization beyond text/media extraction.
- Markdown CJK inline formatting and strikethrough polish.
- Excel strikethrough/style preservation.
- Optional LibreOffice fallback completion for complex legacy presentations.
- Continued HWP/HWPX hardening and fixture-based smoke tests.

See [structure/roadmap.md](structure/roadmap.md) for the internal phase record.

## Attribution

`code-office` contains code derived from MIT-licensed `vscode-office` work:

- [cweijan/vscode-office](https://github.com/cweijan/vscode-office), original
  project by Weijan Chen
- [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office), a
  maintained fork by RJ.Wang

HWP/HWPX editing uses a local build of
[edwardkim/rhwp](https://github.com/edwardkim/rhwp). Bundled fonts and document
runtime components remain subject to their own licenses.

Full notices are in [NOTICE.md](NOTICE.md). The original MIT license text is
preserved in [LICENSE](LICENSE).
