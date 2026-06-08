# 00 SuperDoc AGPL Migration Plan

Date: 2026-06-09
Project root: /Users/jun/Developer/new/700_projects/code-office
Goal ID: a78387ef-45a

## Goal

Replace the current DOCX viewer/editor implementation with SuperDoc and update
the project license posture from MIT to AGPL-3.0-or-later-compatible public
distribution. This is a product integration, not a spike. The work is not done
until the packaged VSIX is installed into the already-open VS Code Insiders
window and Computer Use visually verifies a real DOCX tab.

## Source Evidence

- SuperDoc official quick start says it can load a Word file, edit it, and
  export it back as `.docx`.
  Source: https://docs.superdoc.dev/getting-started/quickstart
- SuperDoc React documentation exposes `@superdoc-dev/react`,
  `SuperDocEditor`, `documentMode="editing"`, `documentMode="viewing"`, and
  roles including `editor` and `viewer`.
  Source: https://docs.superdoc.dev/getting-started/frameworks/react
- SuperDoc GitHub README describes the engine as DOCX-focused and lists
  "real pagination, section breaks, headers/footers"; it also states dual
  licensing: AGPLv3 for community use and commercial license for proprietary
  deployments.
  Source: https://github.com/superdoc-dev/superdoc
- `npm view @superdoc-dev/react` reports version `1.10.0`, license
  `AGPL-3.0`, dependency `superdoc >=1.0.0`.
- `npm view superdoc` reports version `1.39.0`, license `AGPL-3.0`.

## Current State

- `package.json` is still `license: "MIT"`.
- `LICENSE` currently contains MIT license text.
- README/FAQ/Pages still advertise MIT.
- DOCX React surface currently imports both:
  - `@eigenpal/docx-editor-react`
  - `docx-preview`
- DOCX tests currently assert that SuperDoc is not imported. That assertion must
  be inverted.
- Prior SuperDoc spike under `/tmp/code-office-docx-superdoc-spike` proved that
  `SuperDocEditor` renders the fixture when passed:
  `{ id: 'fixture-02', type: 'docx', url: '/fixture.docx' }`.

## Non-Negotiable Constraints

- Do not add LibreOffice/soffice/PDF iframe fallback to DOCX View mode.
- Do not open a new VS Code Insiders window for QA. Use the already-open app
  `com.microsoft.VSCodeInsiders`.
- Do not commit private DOCX fixtures.
- Keep VS Code host save lifecycle as the authority: Cmd+S must still flow
  through `DocxEditorProvider` and `DocxSaveBridge`.
- Computer Use visual verification is required before claiming completion.

## Planned File Changes

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/package.json`

- Change `license` from `MIT` to `AGPL-3.0-or-later`.
- Add dependency `@superdoc-dev/react`.
- Add dependency `superdoc` only if npm resolution requires it explicitly.
- Remove `@eigenpal/docx-editor-react` and `docx-preview` if no longer used.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.tsx`

Before:

- Uses `docx-preview` for View mode.
- Uses `@eigenpal/docx-editor-react` for Edit mode.
- Maintains separate fit/annotation functions for docx-preview output.

After:

- Imports `SuperDocEditor` and `@superdoc-dev/react/style.css`.
- Converts incoming `ArrayBuffer` to a `File` for SuperDoc:
  `new File([documentBuffer], documentName, { type:
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })`.
- Renders one SuperDoc-backed surface for both modes:
  - View: `documentMode="viewing"`, `role="viewer"`.
  - Edit: `documentMode="editing"`, `role="editor"`.
- Keeps the existing View/Edit segmented control.
- Keeps host save lifecycle by storing a SuperDoc ref and using
  `superdoc.export({ triggerDownload: false })` or the documented SuperDoc
  export API to return DOCX bytes to `docxSaveResponse`.
- Marks dirty from SuperDoc change/content events when available, with the
  existing DOM input fallback retained.
- Removes docx-preview-specific page annotation, separator, fit, and resize
  code.
- Removes eigenpal-specific ref, relayout, tuning props, and save path.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.css`

- Replace docx-preview/eigenpal selectors with `.docx-superdoc-*` shell
  selectors.
- Keep a quiet Word-like grey workspace.
- Scope SuperDoc CSS containment so it fills the VS Code custom editor without
  nested card styling.
- Keep Korean font fallback tokens around the SuperDoc container.

### DELETE or DEPRECATE `/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/docxEditorTuning.ts`

- Delete only if no import remains.
- If deletion creates noisy import/test risk, leave the file unused only until
  a follow-up cleanup commit. Preferred outcome: delete.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/src/test/docxEditorProviderTest.mjs`

- Assert SuperDoc imports and `SuperDocEditor` usage.
- Assert View mode maps to `documentMode="viewing"` and role `viewer`.
- Assert Edit mode maps to `documentMode="editing"` and role `editor`.
- Assert save path uses SuperDoc export with `triggerDownload: false`.
- Assert no `docx-preview`, no eigenpal runtime imports, and no LibreOffice/PDF
  fallback in DOCX product source.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/src/provider/docx/DocxEditorProvider.ts`

- Update comments from eigenpal to SuperDoc.
- No lifecycle API change expected.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/src/provider/handlers/docxHandler.ts`

- Update comments if they refer to eigenpal-specific behavior.
- No event schema change expected.

### MODIFY license and attribution files

- `/Users/jun/Developer/new/700_projects/code-office/LICENSE`
  - Replace MIT license text with GNU Affero General Public License v3.0 text
    or clear AGPL-3.0-or-later license notice.
- `/Users/jun/Developer/new/700_projects/code-office/package.json`
  - SPDX `AGPL-3.0-or-later`.
- `/Users/jun/Developer/new/700_projects/code-office/NOTICE.md`
  - Preserve upstream MIT attribution for inherited `vscode-office` code.
  - Add SuperDoc AGPL dependency notice.
  - Clarify that MIT upstream components remain under their own terms inside
    an AGPL-distributed project.
- `/Users/jun/Developer/new/700_projects/code-office/README.md`
- `/Users/jun/Developer/new/700_projects/code-office/README-KO.md`
- `/Users/jun/Developer/new/700_projects/code-office/README-CN.md`
- `/Users/jun/Developer/new/700_projects/code-office/docs/FAQ.md`
- `/Users/jun/Developer/new/700_projects/code-office/docs/FAQ.ko.md`
- `/Users/jun/Developer/new/700_projects/code-office/docs/index.html`
- `/Users/jun/Developer/new/700_projects/code-office/docs/ARCHITECTURE.md`
- `/Users/jun/Developer/new/700_projects/code-office/structure/00-structure-hub.md`
- `/Users/jun/Developer/new/700_projects/code-office/structure/04-viewer-architecture.md`
- `/Users/jun/Developer/new/700_projects/code-office/structure/direction.md`

Update these from MIT/eigenpal DOCX wording to AGPL/SuperDoc DOCX wording.

## Verification Plan

Commands:

1. `npm install`
2. `npm run test:docx-editor-provider`
3. `npm run build`
4. `npm run package`
5. `code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix --force`

Computer Use:

1. Target app: `com.microsoft.VSCodeInsiders`.
2. Use the already-open window.
3. Run `Developer: Reload Window`.
4. Verify the already-open DOCX tab loads.
5. Verify View mode shows a SuperDoc-backed DOCX surface.
6. Switch to Edit mode and verify editing UI appears.
7. Trigger Cmd+S and verify no browser download dialog appears.
8. Record result in this devlog folder before final claim.

## Risk Register

- SuperDoc React export API may require a ref shape not fully documented in
  the quick start. Mitigation: inspect installed package types after
  `npm install` and adjust implementation to the actual `.d.ts` contract.
- SuperDoc may increase webview bundle size substantially. Mitigation: record
  built chunk sizes in verification docs.
- License migration touches public surfaces. Mitigation: preserve inherited MIT
  notices while changing project-level SPDX/license to AGPL.
- Save lifecycle is the highest-risk integration point. Mitigation: keep the
  existing host requestId bridge and test it with code assertions plus installed
  VSIX smoke.

## Commit Plan

1. `docs(docx): plan SuperDoc AGPL migration`
2. `feat(docx): replace DOCX surface with SuperDoc`
3. `chore(license): switch project metadata to AGPL`
4. `docs(docx): record SuperDoc QA verification`
