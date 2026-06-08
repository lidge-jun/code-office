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
| fixture-02 | SuperDoc spike | 0 | 0 | 0 | 0 | 0 | 0 | 0 | /Users/jun/.cli-jaw-3462/screenshots/screenshot_1780933931269.png |
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
  built successfully and loaded SuperDoc `1.39.0`. The editor emitted
  `superdoc-ready` and `superdoc-editor-create`, but fixture-02 body content was
  blank. Console showed no `onContentError`/`onException`. This is not a usable
  replacement candidate yet.

Conclusion:

- The current product-safe path is viewer-first DOCX with explicit experimental
  edit mode.
- Eigenpal tuning improved integration ergonomics but did not solve complex
  Korean DOCX layout parity.
- SuperDoc remains a spike-only candidate and needs deeper import/config
  investigation before any product decision.
