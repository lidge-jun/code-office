# Follow-Up Modularization Backlog

Date: 2026-06-10

This is not an implementation plan. It is a structural backlog generated from the dev-skill audit.

Detailed patch routing is now split into:

- `03.1_docx_word_surface_split.md`
- `03.2_hwp_limit_guard.md`
- `03.3_pptx_component_boundary.md`
- `03.4_markdown_commonjs_boundary.md`
- `03.5_verification_and_review_gate.md`

## Priority 1 - Split DOCX Runtime Helpers

Canonical patch plan, file list, and sequencing are in `03.1_docx_word_surface_split.md`. This backlog only summarizes the outcome expected from that guide.

Target:

```text
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.tsx
```

Expected extraction outcome:

| New module | Responsibility |
|---|---|
| `docxConstants.ts` / `docxTypes.ts` | DOCX MIME, save timeouts, event names, host-save result and waiter types. |
| `superdocFonts.ts` / `superdocExceptions.ts` / `superdocZoom.ts` | SuperDoc font assets, ignorable/fatal error classification, zoom application. |
| `docxSnapshot.ts` / conditional `docxSaveValidation.ts` | Visible text snapshot sanitization, snippet detection, export validation. |
| `docxExport.ts` / `docxSaveRepair.ts` | SuperDoc export strategies, updated-doc map checks, DOCX XML fallback repair. |
| `useDocxHostSave.ts` / `useDocxHostEvents.ts` | WebView host save request/completion protocol and handler registration. |
| `useDocxDocumentState.ts` / `useDocxDirtyState.ts` / `useDocxModeSwitch.ts` | Buffer/file state, dirty detection, save-before-view mode transition. |
| `useDocxKeyboardSave.ts` / `useDocxRenderTimeout.ts` | Cmd+S handling, cleanup, render timeout handling. |
| `DocxModeToolbar.tsx` | View/Edit/Save toolbar surface. |
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
