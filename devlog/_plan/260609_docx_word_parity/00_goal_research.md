# 00 DOCX Word-Parity Goal And Research

Date: 2026-06-09
Project root: /Users/jun/Developer/new/700_projects/code-office
Goal ID: cd44b916-1ca

## User Goal

Improve code-office DOCX output quality until it is close to Microsoft Word for
the user's real DOCX fixtures.

This is not a minor CSS polish task. The reference rendering is Microsoft Word
itself, operated through Computer Use. code-office must be compared against that
reference with screenshots.

## Confirmed Scope

- Use the user's real DOCX files as local-only QA fixtures.
- Do not commit private DOCX files to the repository.
- Record fixture paths, hashes, and screenshot comparison results in devlog.
- Compare:
  - Microsoft Word
  - code-office View mode (`docx-preview`)
  - code-office current Edit mode (`@eigenpal/docx-editor-react`)
  - code-office tuned Edit mode
  - SuperDoc spike
- SuperDoc is spike-only in this phase.
- Do not bundle SuperDoc into the VSIX.
- If eigenpal public props are insufficient, a thin React adapter fork is allowed
  as the last resort, not the first implementation.

## Current Code Facts

- `/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.tsx`
  already splits DOCX into default `viewer` mode and explicit `editor` mode.
- View mode uses `docx-preview` with headers, footers, footnotes, endnotes,
  comments, page breaks, and font loading enabled.
- Edit mode uses `@eigenpal/docx-editor-react`.
- `/Users/jun/Developer/new/700_projects/code-office/src/provider/handlers/docxHandler.ts`
  sends `fileName` and raw DOCX bytes through `openBuffer`.
- The current `Word.tsx` ignores `fileName` in `openBuffer`.
- `/Users/jun/Developer/new/700_projects/code-office/src/test/docxEditorProviderTest.mjs`
  locks viewer-first behavior but does not yet lock edit-quality tuning props.

## Library Research

### eigenpal

Current package in code-office:

- `@eigenpal/docx-editor-react`: `^1.2.1`
- License: Apache-2.0

Confirmed public API surface from installed types and official docs:

- `fontFamilies`
- `fonts`
- `initialZoom`
- `showToolbar`
- `showZoomControl`
- `showMarginGuides`
- `marginGuideColor`
- `showRuler`
- `rulerUnit`
- `showOutline`
- `showOutlineButton`
- `documentName`
- `documentNameEditable`
- `onFontsLoaded`
- `ref.current.setZoom()`
- `ref.current.getEditorRef()?.getLayout()`
- `ref.current.getEditorRef()?.relayout()`

Relevant docs:

- https://www.docx-editor.dev/docs/latest/react
- https://www.docx-editor.dev/docs/props
- https://www.docx-editor.dev/docs/toolbar

### SuperDoc

Current package metadata:

- npm package: `superdoc`
- latest checked version: `1.39.0`
- license: `AGPL-3.0`
- repository: `https://github.com/superdoc-dev/superdoc`

SuperDoc is useful as a fidelity comparison spike, but it must not be imported
from production source in this phase. Keep any SuperDoc experiment isolated from
the shipped VSIX.

Relevant docs:

- https://github.com/superdoc-dev/superdoc
- https://docs.superdoc.dev/getting-started/quickstart
- https://docs.superdoc.dev/editor/superdoc/overview

## Fixture Candidates

The private DOCX files are local-only. They must not be copied into git, and
their absolute paths must not be committed in source, devlog, README, tests, or
generated artifacts.

Use four local fixture IDs:

1. `fixture-01`
2. `fixture-02`
3. `fixture-03`
4. `fixture-04`

The mapping from fixture ID to absolute DOCX path lives only in the gitignored
local file:

`/Users/jun/Developer/new/700_projects/code-office/.docx-word-parity-fixtures.local.json`

Generated manifests must record only fixture ID, existence, size, and hash. They
must not record absolute source paths.

## Acceptance Criteria

- Microsoft Word is used as the reference renderer when available.
- Computer Use captures Word and code-office screenshots for the same fixture.
- Edit mode includes stable Korean/Office font fallback, document name display,
  page/ruler/margin visibility, and layout relayout after fonts load.
- The product VSIX contains no SuperDoc runtime import.
- `npm run test:docx-editor-provider` passes.
- `npm run typecheck` passes.
- `npm run build` passes.
- A devlog score matrix records Word vs code-office results.
