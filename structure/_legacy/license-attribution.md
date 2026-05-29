# License And Attribution Strategy

## Current State

The imported source currently includes an MIT `LICENSE` file with:

```text
Copyright (c) 2020 Weijan Chen
```

The current README also credits:

- cweijan / original `vscode-office`
- RJ.Wang / maintained fork of `cweijan/vscode-office`
- Vanessa219 / Vditor
- PDF.js, docxjs, SheetJS, x-spreadsheet, Rest Client, Mermaid

The public docs keep `LICENSE`, `NOTICE.md`, and localized READMEs aligned so
the product is not visually branded as a GitHub fork while attribution remains
visible.

## Policy

새 GitHub repository로 가더라도 원본이 MIT이면 코드 복사, 수정, 배포 자체는 가능하지만 copyright notice, permission notice, disclaimer를 보존해야 합니다.

> 출처: [MIT Copyright Notice](https://web.mit.edu/ivlib/www/copyright.html)
> 출처: [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office)
> 출처: [cweijan/vscode-office](https://github.com/cweijan/vscode-office)

## Recommended Files

The active attribution and branding surface is:

```text
LICENSE
NOTICE.md
README.md
README-CN.md
README-KO.md
package.json
docs/index.html
images/logo-new.svg
images/logo-new.png
```

Current `NOTICE.md` outline:

```text
code-office

This project contains code derived from:
- cweijan/vscode-office
- rjwang1982/vscode-office, a maintained fork of cweijan/vscode-office

The original code is licensed under the MIT License.
Original copyright notices are preserved in LICENSE and source files.

Additional bundled third-party components include:
- Vditor
- pdf.js
- docx-preview/docxjs
- SheetJS/xlsx
- x-spreadsheet
- Mermaid
- Rest Client-derived HTTP tooling
- rhwp / rhwp-studio
- bundled Korean web fonts used by rhwp-studio
```

## Logo Attribution

The current logo was created for this repository on 2026-05-29. Source chain:

```text
OpenAI image generation concept
  -> manual vector simplification in images/logo-new.svg
  -> rendered package icon in images/logo-new.png
  -> copied GitHub Pages asset in docs/assets/logo-new.png
```

The design intent is a faceted obsidian document core with layered sheets,
cyan/jade ribbons, and abstract document-format accents. It must remain
visually distinct from:

- the Obsidian app logo;
- the VS Code logo;
- Microsoft Office icons;
- Hancom branding;
- cweijan/vscode-office artwork;
- rjwang1982/vscode-office artwork;
- the previous green folder / "E" vscode-office-enhanced logo.

Do not restore the old upstream logo comments or author attribution in
`images/logo-new.svg`; that asset is no longer the active logo source.

## Screenshot Attribution

The public screenshot assets under `docs/assets/screenshots/` were captured on
2026-05-29 from a local VS Code Insiders session after installing the packaged
VSIX.

Current source chain:

```text
officecli-generated DOCX smoke sample in /tmp
bundled rhwp sample copied into /tmp
temporary XLSX/PDF/PPTX/HTML review samples generated in /tmp
  -> VS Code Insiders with code-office VSIX installed
  -> Computer Use state verification
  -> local macOS screenshot capture for Office/PDF/HWP surfaces
  -> local browser render capture for the standalone HTML visual check
  -> docs/assets/screenshots/*.png
```

The screenshot images are project-owned marketing/documentation captures. They
must not imply affiliation with Microsoft, Hancom, Obsidian, cweijan,
rjwang1982, or rhwp. Do not capture private user documents or modify tracked
vendor samples for marketing screenshots.

## HWP Runtime Attribution

HWP/HWPX editing uses a local build of `edwardkim/rhwp`.

Release notice facts:

```text
Upstream: https://github.com/edwardkim/rhwp
Pinned tag: v0.7.13
Pinned commit: b3e16ef212af81ef37d973ddb86d6816d3804642
Runtime source in repo: vendor/rhwp-studio-dist
Runtime package path: resource/rhwp-studio
```

The extension must not imply affiliation with Hancom or rhwp upstream. Use
"powered by a bundled local rhwp-studio runtime" rather than "official HWP
editor" or "Hancom replacement".

## Font Attribution

The rhwp-studio runtime includes Korean web fonts documented in
`vendor/rhwp-studio-dist/fonts/FONTS.md`. Public notices should mention that:

- proprietary Hancom and Microsoft fonts are not bundled;
- open/free-distribution fallback fonts are bundled for layout compatibility;
- release artifacts must preserve bundled font license files.

Known bundled font families include Noto Sans KR, Noto Serif KR, Nanum,
Pretendard, Gowun, D2 Coding, Spoqa Han Sans, Cafe24 fonts, and Happiness Sans.

## README Language

Allowed:

```text
code-office is based on MIT-licensed vscode-office code. Original copyright and license notices are preserved.

Original lineage:
- cweijan/vscode-office
- rjwang1982/vscode-office, maintained fork of cweijan/vscode-office
```

Avoid:

```text
Forked project
Official continuation
Original author maintained
```

Reason: the product should not visually brand itself as a GitHub fork, but the legal provenance should remain visible.

## Package Metadata

Current release metadata has been updated:

- `name`
- `displayName`
- `description`
- `publisher`
- `repository` points to `https://github.com/lidge-jun/code-office.git`
- `homepage` points to `https://lidge-jun.github.io/code-office/`
- `bugs` points to `https://github.com/lidge-jun/code-office/issues`
- `keywords`
- configuration title

Future compatibility migration should separately decide:

- command category labels
- configuration prefix
- custom viewType IDs

Do not use placeholder repository URLs. The current metadata uses the real new repository URL and must not point back to either upstream source.

## Current Release Decisions

1. Public package name is `code-office`; display name remains `code-office`.
2. Publisher ID is `jun6161` in `package.json`.
3. HWP settings use `code-office.hwp.*`; old `vscode-obsdian.hwp.*` values are read only as a legacy fallback.
4. Inherited runtime `vscode-office.*` settings and `cweijan.*` viewTypes are intentionally retained as legacy compatibility surfaces until a separate migration/alias decision exists.
5. `README-CN.md` is retained and rewritten for now.
