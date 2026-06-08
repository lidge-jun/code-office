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
