# 04 SuperDoc-Informed DOCX Edit Second Pass Plan

Date: 2026-06-09
Project root: /Users/jun/Developer/new/700_projects/code-office
Goal ID: 7024872c-863

## Objective

Maximize current DOCX edit rendering quality with the dependency that is already
in the product: `@eigenpal/docx-editor-react`. SuperDoc remains a spike-only
reference and must not be imported, bundled, or copied into the VSIX in this
pass.

## Research Summary

- Current product DOCX edit mode already uses eigenpal with viewer-first fallback.
- SuperDoc spike visually rendered `fixture-02` closer to Microsoft Word than
  eigenpal edit mode.
- SuperDoc's useful product-safe lessons are visual/system-level, not code copy:
  Word-like theme variables, grey canvas, white page, conservative page shadow,
  stable toolbar/ruler surface, and Korean font priority.
- eigenpal public props allow a safer local second pass:
  `className`, `style`, `disableFindReplaceShortcuts`, `fontFamilies`,
  `initialZoom`, `onFontsLoaded`, and imperative `relayout()`.

## Non-Goals

- Do not add `superdoc` or `@superdoc-dev/react` to `package.json`.
- Do not copy SuperDoc source or generated CSS into `src`.
- Do not commit private DOCX fixtures or absolute private paths.
- Do not promise Word-perfect layout. CSS/prop tuning cannot repair eigenpal
  engine-level section placement or pagination bugs.

## Diff-Level Plan

### MODIFY

`/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/docxEditorTuning.ts`

Planned changes:

- Add a stable eigenpal root class:
  `DOCX_EDITOR_CLASS_NAME = 'docx-editor docx-editor--word-parity'`.
- Add a stable root style object with `width`, `height`, and `minHeight`.
- Keep font family config module-level so eigenpal does not re-register fonts on
  each render.

### MODIFY

`/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.tsx`

Planned changes:

- Import the new class/style constants.
- Pass `className` and `style` into `DocxEditor`.
- Pass `disableFindReplaceShortcuts={true}` so the VS Code host can keep native
  find behavior and eigenpal does not trap those shortcuts inside the webview.
- Add an editor-mode relayout pass after switching into edit mode:
  immediate `requestAnimationFrame` relayout and one delayed relayout after the
  editor/page DOM has settled.

### MODIFY

`/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.css`

Planned changes:

- Convert current CSS polish into a named `docx-editor--word-parity` surface.
- Align local variables with the useful SuperDoc Word-theme lessons:
  subdued workspace, white page, conservative shadow, Word-like blue, and stable
  border/hover colors.
- Add scoped toolbar/ruler/page/table/image/text rules under
  `.docx-editor-container` only.
- Tighten Korean text behavior without global overrides:
  `word-break: keep-all` for document text and `overflow-wrap: anywhere` only
  where table cells need containment.

### MODIFY

`/Users/jun/Developer/new/700_projects/code-office/src/test/docxEditorProviderTest.mjs`

Planned changes:

- Assert `DOCX_EDITOR_CLASS_NAME`, `DOCX_EDITOR_STYLE`,
  `disableFindReplaceShortcuts`, and the edit-mode scheduled relayout are wired.
- Assert the CSS contains the named word-parity class and SuperDoc-informed
  variables, while still avoiding any `superdoc` production import.

### MODIFY

`/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260609_docx_word_parity/03_screenshot_matrix.md`

Planned changes:

- Record this second pass as product-safe SuperDoc-informed tuning.
- Explicitly document that no SuperDoc runtime code was bundled.

## Verification Plan

Commands:

```bash
npm run test:docx-editor-provider
npm run typecheck
npm run build
npm run test:ci
```

Static checks:

- `rg -n "superdoc|@superdoc-dev" src package.json` must show no production
  import/dependency.
- `git diff --stat` must show only the planned files.

## Expected Result

The edit surface should look more like a stable Word-style document editor and
less like raw eigenpal defaults: better Korean font priority, cleaner page
surface, safer table overflow, and more reliable relayout after entering edit
mode. Remaining complex layout mismatch is still an engine limitation.
