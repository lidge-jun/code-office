# Follow-Up Modularization Backlog

Date: 2026-06-10

This is not an implementation plan. It is a structural backlog generated from the dev-skill audit.

## Priority 1 - Split DOCX Runtime Helpers

Target:

```text
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.tsx
```

Suggested extraction:

| New module | Responsibility |
|---|---|
| `docxSaveRepair.ts` | DOCX XML fallback repair, snapshot filtering, replacement-only patch helpers. |
| `docxDirtyState.ts` | Dirty detection, visible text snapshots, changed-text heuristics. |
| `docxHostBridge.ts` | WebView host save request/completion protocol helpers. |
| `DocxModeToolbar.tsx` | View/Edit/Save toolbar surface. |
| `DocxViewer.tsx` | `docx-preview` viewer mode rendering and page-card setup. |
| `SuperDocSurface.tsx` | SuperDoc component wrapper and lifecycle exception boundary. |

Success signal: `Word.tsx` becomes a coordinator under 350 lines with deterministic tests covering the extracted pure helpers.

## Priority 2 - Freeze HWP Growth

Targets:

```text
/Users/jun/Developer/new/700_projects/code-office/src/provider/hwp/HwpEditorProvider.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/hwp/rhwpBridge/createSecureRhwpEditor.ts
```

Rule: new HWP behavior should be added through extracted services or narrow bridge helpers, not by appending to these two files.

## Priority 3 - Keep PPTX UI Componentized

Target:

```text
/Users/jun/Developer/new/700_projects/code-office/src/react/view/pptx/Pptx.tsx
```

Existing child components should remain the direction:

- `PptxPresenterChrome.tsx`
- `PptxStatusBar.tsx`
- `SlideThumbnail.tsx`
- `pptxMetadata.ts`

Any future notes/sidebar/fullscreen work should extend these modules or add siblings rather than expanding `Pptx.tsx`.

## Priority 4 - Isolate Legacy Markdown Export

Targets:

```text
/Users/jun/Developer/new/700_projects/code-office/src/service/markdown/markdown-pdf.js
/Users/jun/Developer/new/700_projects/code-office/src/service/markdown/html-export.js
/Users/jun/Developer/new/700_projects/code-office/src/service/markdown/outline.js
```

Recommended boundary:

- Keep the current CommonJS path stable.
- Add no new features there unless required for release repair.
- Plan a separate ESM migration only after fixture coverage exists for PDF/DOCX export.

