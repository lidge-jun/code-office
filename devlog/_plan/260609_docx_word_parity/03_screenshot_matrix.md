# 03 DOCX Word-Parity Screenshot Matrix

Date: 2026-06-09
Project root: /Users/jun/Developer/new/700_projects/code-office

## Scoring

Score each item from 0 to 2.

- `0`: broken or clearly worse than Microsoft Word
- `1`: usable but visibly different
- `2`: close to Microsoft Word

## Capture Surfaces

- Microsoft Word reference
- code-office View mode
- code-office Edit mode before tuning
- code-office Edit mode after tuning
- SuperDoc spike

## Matrix

| Fixture | Surface | Korean font | Table | Page/margins | Line wrap | Images | Header/footer | Overall | Screenshot evidence |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| fixture-01 | Microsoft Word |  |  |  |  |  |  |  | pending |
| fixture-01 | code-office View |  |  |  |  |  |  |  | pending |
| fixture-01 | code-office Edit tuned |  |  |  |  |  |  |  | pending |
| fixture-01 | SuperDoc spike |  |  |  |  |  |  |  | pending |
| fixture-02 | Microsoft Word | 2 | 2 | 2 | 2 | 2 | 2 | 2 | Computer Use, Microsoft Word, 2026-06-09 |
| fixture-02 | code-office View | 2 | 2 | 1 | 1 | 2 | 1 | 1 | Computer Use, already-open VS Code Insiders, 2026-06-09 |
| fixture-02 | code-office Edit tuned | 1 | 0 | 0 | 0 | 2 | 1 | 0 | Computer Use, already-open VS Code Insiders, 2026-06-09 |
| fixture-02 | SuperDoc spike | 2 | 2 | 2 | 1 | 2 | 2 | 2 | /Users/jun/.cli-jaw-3462/screenshots/screenshot_1780934106107.png |
| fixture-03 | Microsoft Word |  |  |  |  |  |  |  | pending |
| fixture-03 | code-office View |  |  |  |  |  |  |  | pending |
| fixture-03 | code-office Edit tuned |  |  |  |  |  |  |  | pending |
| fixture-03 | SuperDoc spike |  |  |  |  |  |  |  | pending |
| fixture-04 | Microsoft Word |  |  |  |  |  |  |  | pending |
| fixture-04 | code-office View |  |  |  |  |  |  |  | pending |
| fixture-04 | code-office Edit tuned |  |  |  |  |  |  |  | pending |
| fixture-04 | SuperDoc spike |  |  |  |  |  |  |  | pending |

## Notes

- Fixture absolute paths are intentionally omitted from this committed document.
- Screenshot files, if saved, should avoid embedding private document titles in
  tracked filenames.
- Computer Use should operate Microsoft Word and the already-open VS Code or VS
  Code Insiders window. Do not open a new VS Code Insiders window unless the
  user explicitly requests it.

## 2026-06-09 Fixture-02 Findings

Runtime setup:

- Microsoft Word was controlled through Computer Use and used as the reference
  renderer.
- The already-open VS Code Insiders window was reloaded and used for code-office
  verification. No new VS Code Insiders window was opened.
- The installed extension was `jun6161.code-office@3.7.47`.

Observed surfaces:

- Microsoft Word: fixture-02 opened in Print Layout. Korean text used Malgun
  Gothic body font, the first page header/logo/table layout was coherent, and
  the status bar reported page 1 of 6.
- code-office View mode: rendered through `docx-preview`; logo, Korean text,
  table borders, and first-page structure were usable and close enough for
  reading. Differences remained in zoom/fit and exact Word page spacing.
- code-office Edit tuned: rendered through `@eigenpal/docx-editor-react` with
  code-office tuning. The document was editable and Korean font selection was
  available, but the first page layout was not Word-parity: a later section row
  appeared near the first-page top, table/text flow overlapped, and page
  placement differed materially from Microsoft Word.
- SuperDoc spike: isolated Vite app under `/tmp/code-office-docx-superdoc-spike`
  built successfully and loaded SuperDoc `1.39.0`. Passing `document` as a URL
  string initialized a blank body, but passing a document object
  `{ id: 'fixture-02', type: 'docx', url: '/fixture.docx' }` rendered the body.
  The result was materially closer to Microsoft Word than eigenpal Edit:
  Korean font was recognized as Malgun Gothic, logo/header/table structure was
  coherent, and the first page did not show the eigenpal row overlap.

Conclusion:

- The current product-safe path is viewer-first DOCX with explicit experimental
  edit mode.
- Eigenpal tuning improved integration ergonomics but did not solve complex
  Korean DOCX layout parity.
- SuperDoc remains spike-only for this goal because of AGPLv3/commercial
  licensing and bundle-size implications, but it is now the strongest candidate
  for the next DOCX edit-quality implementation path.

## 2026-06-09 SuperDoc-Informed CSS Follow-up

Scope:

- No SuperDoc dependency was added to the product bundle.
- The SuperDoc spike was used only as visual guidance for the current eigenpal
  edit surface.

Ported lessons:

- Prefer Malgun Gothic explicitly across the eigenpal edit surface.
- Make the edit canvas read like a Word/SuperDoc page: grey workspace, white
  page, darker document text, and stable page shadow.
- Keep Korean words together where possible and add scoped overflow wrapping in
  DOCX table cells so long content does not burst out of the page.
- Clamp edit-mode images and tables to the page width.

Limit:

- This is a CSS containment/readability pass. It cannot fix eigenpal engine
  issues such as incorrect section placement, pagination, or structural row
  overlap. Those still require an engine-level path such as a SuperDoc follow-up
  spike or a deeper eigenpal fork.

## 2026-06-09 Second Pass Implementation Notes

Implementation:

- Added a named eigenpal root class, `docx-editor--word-parity`, so later CSS
  corrections can remain scoped to DOCX edit mode.
- Added a stable editor root style object instead of inline object literals.
- Passed `disableFindReplaceShortcuts={true}` so VS Code keeps native find
  shortcut ownership while DOCX edit mode keeps its own save lifecycle.
- Added a second edit-mode relayout after the editor DOM settles. This mirrors
  the observed SuperDoc stability pattern: render the page first, then let the
  editor measure again after fonts/page layers are present.
- Reworked the local CSS tokens toward a SuperDoc/Word-like surface while
  keeping the product free of SuperDoc imports and dependencies.

Verification boundary:

- This pass is expected to improve readability, Korean font consistency, page
  surface polish, and table/image containment.
- This pass is not expected to solve eigenpal parser/pagination bugs. If a row
  belongs to a later section but eigenpal paints it on the first page, that is
  engine behavior and remains outside CSS-only repair.

## 2026-06-09 Installed VSIX Visual Verification

Package/install evidence:

- Rebuilt the current product package with `npm run package`.
- Generated VSIX:
  `/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix`.
- Installed that VSIX into the already-open VS Code Insiders profile with:
  `code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix --force`.
- VS Code reported:
  `Extension 'code-office-3.7.47.vsix' was successfully installed.`

Fresh command verification after the installed-VSIX audit:

- `npm run test:docx-editor-provider`:
  `docx editor provider checks passed`.
- `npm run build`:
  Vite production build completed successfully with `✓ built in 5.26s`.

Computer Use visual verification:

- Used the already-open VS Code Insiders app
  `com.microsoft.VSCodeInsiders`; no new Insiders window was opened.
- Reloaded the existing window with `Developer: Reload Window`.
- Verified the open DOCX recovered in code-office after reload.
- Verified View mode:
  - Header reported `DOCX` and `Viewer mode`.
  - View/Edit controls were visible.
  - The `docx-preview` surface rendered a readable white page on a grey canvas.
  - Korean text, logo/header area, and first-page tables were visible and usable.
- Verified Edit mode:
  - Header reported `DOCX` and `Experimental edit mode`.
  - View/Edit/Save controls were visible.
  - Eigenpal toolbar rendered with `100%` zoom, Korean font dropdown, formatting
    buttons, and ruler.
  - The tuned edit surface rendered a Word-like grey canvas and white page.
  - The document body was editable; Computer Use saw settable text-entry/table
    nodes in the editor.

Observed remaining defect:

- Complex Korean DOCX table/section layout is still not Word-parity in Edit
  mode. The first page can show later section rows near the top, with table/text
  overlap. This reproduces the previously documented eigenpal engine limitation
  and is not fixed by the CSS-only SuperDoc-informed tuning pass.

Verdict:

- The packaged VSIX loads in the real installed Insiders environment.
- View/Edit switching works after a window reload.
- The current release state is truthful as "viewer-first, experimental edit";
  it is not yet a high-fidelity DOCX editor for complex Word documents.

## 2026-06-09 Viewer Page-Separation Follow-up

Trigger:

- User reported that DOCX View mode was also visually broken because pages were
  not clearly separated.

Root cause:

- `docx-preview` defaults `ignoreLastRenderedPageBreak` to `true`, which means
  it ignores Microsoft Word's persisted `<w:lastRenderedPageBreak/>` hints.
- For Word-authored files, those hints are often the best available browser-side
  signal for where Word had already paginated the document.

Implementation:

- View mode now passes `ignoreLastRenderedPageBreak: false` to
  `renderAsync(...)` in
  `/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.tsx`.
- View-mode CSS now treats each `section.docx` as an isolated page card on a
  grey workspace, with column stacking, page gap, border, shadow, and layout
  containment in
  `/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.css`.
- The provider test now asserts that the renderer option and page-card CSS
  contract stay present in
  `/Users/jun/Developer/new/700_projects/code-office/src/test/docxEditorProviderTest.mjs`.

Fresh command verification:

- `npm run test:docx-editor-provider`:
  `docx editor provider checks passed`.
- `npm run build`:
  Vite production build completed successfully.
- `npm run package`:
  generated
  `/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix`.
- `code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix --force`:
  VS Code reported successful install.

Computer Use visual verification:

- Used the already-open VS Code Insiders app
  `com.microsoft.VSCodeInsiders`; no new Insiders window was opened.
- Reloaded the existing window with `Developer: Reload Window`.
- Verified the open fixture recovered in `DOCX` / `Viewer mode`.
- The viewer rendered a white page card on the grey workspace with visible
  page-card boundaries. The visible viewport was on page 2, and the page header
  row and body content were contained inside the white page surface instead of
  an unbounded continuous canvas.

Remaining boundary:

- This fixes the browser viewer's handling of Word's persisted pagination hints
  and the visual page-card framing.
- If a DOCX file lacks Word-rendered page-break hints, `docx-preview` still
  cannot perfectly repaginate like Microsoft Word. That is a renderer-engine
  limitation and remains separate from the CSS page-card fix.

## 2026-06-09 Browser-Only Viewer Pagination Correction

Correction:

- The previous View-mode verification was too weak. A white canvas with page
  text inside it is not enough. The acceptance bar is visible page-card
  separation: page 1 and page 2 must be distinct white cards with grey workspace
  between them.
- A LibreOffice/PDF fallback was considered and briefly prototyped, then
  rejected before commit because DOCX View mode must not depend on an external
  LibreOffice binary.

Actual fixture XML inspection:

- Inspected the already-open fixture's `word/document.xml` directly.
- Counts:
  - `w:lastRenderedPageBreak`: 3
  - `w:sectPr`: 2
  - `w:br`: 1
  - `w:type="page"` manual page break: 0
- This confirms the core DOCX constraint: OOXML does not always contain a full
  physical page list. It contains section/page-size properties, optional manual
  page breaks, and optional Word-rendered page-break hints. Microsoft Word still
  computes final page layout from fonts, tables, margins, and line wrapping.

Implementation:

- Kept the product browser-only. No LibreOffice, PDF iframe, or SuperDoc runtime
  dependency was added.
- After `docx-preview` renders, View mode now runs
  `normalizeDocxPreviewPages(...)` in
  `/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.tsx`.
- If `docx-preview` emits an oversized `section.docx` instead of separate page
  sections, the normalizer creates capped read-only synthetic page slices based
  on the rendered page height.
- CSS in
  `/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.css`
  displays those synthetic slices as separate white page cards with a 28px grey
  workspace gap.
- Tests in
  `/Users/jun/Developer/new/700_projects/code-office/src/test/docxEditorProviderTest.mjs`
  now assert the browser-only slicing contract and explicitly reject
  LibreOffice/PDF iframe fallback in the DOCX View path.

Verification:

- `npm run test:docx-editor-provider`: `docx editor provider checks passed`.
- `npm run build`: Vite production build succeeded.
- `npm run package`: VSIX packaging succeeded and produced
  `/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix`.
- Installed into the already-open VS Code Insiders profile with
  `code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix --force`.
- Used Computer Use on `com.microsoft.VSCodeInsiders`, ran
  `Developer: Reload Window`, and verified the existing DOCX tab reopened in
  `DOCX` / `Viewer mode`.
- Visual result after reload: page 1 is shown as a distinct white page card,
  then a grey gap, then page 2 begins as a separate white page card. This meets
  the corrected minimum requirement of visible page separation without
  LibreOffice.

Remaining boundary:

- This is a browser-side visual pagination repair, not a full Word layout
  engine. It fixes the "one continuous canvas" failure and makes pages visibly
  separate, but complex DOCX layout fidelity still depends on the upstream
  renderer and remains below Microsoft Word/SuperDoc for edit-quality parity.
