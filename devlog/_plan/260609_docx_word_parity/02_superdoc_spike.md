# 02 SuperDoc Spike Boundary

Date: 2026-06-09
Project root: /Users/jun/Developer/new/700_projects/code-office

## Decision

SuperDoc is a comparison spike only in this phase. It is not a product
dependency and must not be imported from `/Users/jun/Developer/new/700_projects/code-office/src`.

## Checked Package Metadata

- npm package: `superdoc`
- version checked: `1.39.0`
- license checked: `AGPL-3.0`
- repository: `https://github.com/superdoc-dev/superdoc`

## Allowed Spike Shape

- Create temporary experiments outside the repository, for example:
  `/tmp/code-office-docx-superdoc-spike`
- Load the same local DOCX fixtures there only for screenshot comparison.
- Record only high-level findings and screenshot scores in devlog.
- Do not copy SuperDoc source, generated bundles, node_modules, or private DOCX
  files into this repository.

## Product Boundary

The VSIX must remain free of SuperDoc runtime code for this goal. If SuperDoc is
later considered for shipping, that is a separate license and architecture
decision.

## What To Learn From The Spike

- Whether SuperDoc is closer to Microsoft Word than eigenpal on Korean document
  fonts and page layout.
- Whether its page canvas, zoom, or font strategy can inform code-office's
  eigenpal tuning.
- Whether its table/header/footer handling exposes a clear gap in the current
  code-office edit mode.
