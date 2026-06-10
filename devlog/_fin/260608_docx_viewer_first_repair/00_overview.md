# 00 DOCX Viewer-First Repair

Date: 2026-06-08
Branch/worktree: dev_docx / /Users/jun/Developer/new/700_projects/code-office--dev_docx
Status: archived to `_fin` on 2026-06-10. This viewer-first repair was superseded by the SuperDoc AGPL DOCX integration while preserving the key user-facing lesson: DOCX must have a stable view path and explicit edit mode.

## Problem

The DOCX branch made `@eigenpal/docx-editor-react` the only DOCX surface. Runtime screenshots showed that this is not acceptable as the default user experience:

- Korean document layout overlaps and clips in edit mode.
- The user has no visible way to return to a stable viewer mode.
- `Malgun Gothic` cannot be guaranteed on macOS WebView, so the editor falls back to different Korean fonts and can look worse than the original document.

## Decision

DOCX opens in viewer mode first. The editor remains available, but only after an explicit `Edit` action.

This keeps the existing `DocxEditorProvider` save lifecycle while restoring a high-fidelity read path through `docx-preview`.

## Implementation

- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/react/view/word/Word.tsx`
  - Adds `viewer | editor` mode state.
  - Defaults to `viewer`.
  - Renders `docx-preview` in viewer mode.
  - Keeps `@eigenpal/docx-editor-react` in explicit edit mode.
  - When switching from edit to viewer, exports current editor bytes and re-renders the viewer from that buffer.
  - Does not mark the VS Code document dirty on a no-op Edit -> View round trip.
  - Keeps Cmd+S / host save bridge behavior.

- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/react/view/word/Word.css`
  - Adds a compact DOCX toolbar.
  - Makes the viewer surface look like a document page.
  - Adds Korean font fallback order: `Malgun Gothic`, `Apple SD Gothic Neo`, `Noto Sans CJK KR`, `Noto Sans KR`, sans-serif.

- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/test/docxEditorProviderTest.mjs`
  - Locks the viewer-first default.
  - Locks the presence of View/Edit controls.
  - Locks the `docx-preview` render path.

## Verification

- `npm run test:docx-editor-provider`
  - PASS: `docx editor provider checks passed`
- `npm run build`
  - PASS: Vite production build completed in 4.24s.

## Follow-Up QA

Install the built VSIX into the already-open VS Code Insiders window and open the user's sample DOCX:

1. Initial open shows the `View` mode selected.
2. Korean page layout no longer uses the broken WYSIWYG editor by default.
3. `Edit` enters the experimental editor.
4. `View` returns to the rendered preview.
5. If `Malgun Gothic` is not installed on macOS, the WebView uses the configured Korean fallback stack.
