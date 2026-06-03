# code-office Notice

`code-office` is an independent VS Code extension. It contains source code,
runtime assets, and design patterns derived from several open source projects.
Each component remains subject to its own license terms.

This project is not affiliated with or endorsed by Obsidian, Hancom, Microsoft,
cweijan/vscode-office, rjwang1982/vscode-office, or rhwp.

## Project Logo

The current `code-office` logo in `images/logo-new.svg` and
`images/logo-new.png` was created for this repository on 2026-05-29. The design
started from an OpenAI image generation concept and was then manually simplified
into a project-owned SVG app icon.

The logo is not derived from the Obsidian app logo, VS Code logo, Microsoft
Office logo, Hancom logo, cweijan/vscode-office artwork, or rjwang1982/vscode-office
artwork. It intentionally replaces the previous green folder / "E" logo used by
the maintained vscode-office fork.

## Original Lineage

This repository contains code derived from MIT-licensed `vscode-office`
projects:

- `cweijan/vscode-office`, original project by Weijan Chen
- `rjwang1982/vscode-office`, maintained fork by RJ.Wang

The original MIT copyright and license notices are preserved in `LICENSE` and
in source files where present.

Original MIT notice preserved in this repository:

- Copyright (c) 2020 Weijan Chen

## HWP / HWPX Runtime

HWP/HWPX editing uses a local build of:

- `edwardkim/rhwp`: https://github.com/edwardkim/rhwp
- vendored runtime directory: `vendor/rhwp-studio-dist`
- packaged runtime directory: `resource/rhwp-studio`
- packaged rhwp-vscode media directory for paragraph dump: `resource/rhwp-vscode`
- packaged native PDF helper directory: `resource/rhwp-native`
- pinned tag: `v0.7.13`
- pinned commit: `b3e16ef212af81ef37d973ddb86d6816d3804642`
- wrapper package reference: `@rhwp/editor@0.7.13`

`resource/rhwp-vscode/rhwp.js` and `resource/rhwp-vscode/rhwp_bg.wasm` are a
matched MIT-licensed rhwp-vscode media pair used by the extension host paragraph
dump command. The visual Viewer/Editor surface still uses the post-processed
`resource/rhwp-studio` bundle.

The extension does not bundle Hancom Office or proprietary Hancom/Microsoft
fonts. Bundled rhwp-studio fonts are documented in
`vendor/rhwp-studio-dist/fonts/FONTS.md`.

## Bundled Or Referenced Components

- Vditor
- mozilla/pdf.js
- docxjs / docx-preview
- SheetJS / xlsx
- xlsx-js-style (Apache-2.0)
- x-spreadsheet
- Rest Client-derived HTTP tooling
- Mermaid
- node-unrar-js
- rhwp / rhwp-studio

## Bundled Fonts

The rhwp-studio bundle includes open or free-distribution Korean web fonts used
as layout fallbacks. The font inventory and license notes are recorded in
`vendor/rhwp-studio-dist/fonts/FONTS.md`; packaged font assets are copied into
`resource/rhwp-studio/fonts` during build.

Known included families include:

- Noto Sans KR / Noto Serif KR
- Nanum Gothic / Nanum Myeongjo / Nanum Gothic Coding
- Pretendard
- Gowun Batang / Gowun Dodum
- D2 Coding
- Spoqa Han Sans
- Cafe24 Ssurround / Cafe24 Supermagic
- Happiness Sans

Do not remove upstream license files or font license files from release
artifacts without a separate license review.
