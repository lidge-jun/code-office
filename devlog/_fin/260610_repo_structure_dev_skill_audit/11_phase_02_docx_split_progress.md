# 11 Phase 02 DOCX Split Progress

## Scope

Implemented the `03.1_docx_word_surface_split.md` first slice: reduce `src/react/view/word/Word.tsx` into a coordinator and move leaf responsibilities into dedicated DOCX modules.

## Implementation Evidence

- `src/react/view/word/Word.tsx` is now 346 lines.
- UI shell pieces moved to:
  - `src/react/view/word/DocxModeToolbar.tsx`
  - `src/react/view/word/DocxLoadState.tsx`
  - `src/react/view/word/SuperDocSurface.tsx`
- Save and render side-effects moved to:
  - `src/react/view/word/useDocxHostSave.ts`
  - `src/react/view/word/useDocxKeyboardSave.ts`
  - `src/react/view/word/useDocxRenderTimeout.ts`
- DOCX utility leaves moved to:
  - `src/react/view/word/docxConstants.ts`
  - `src/react/view/word/docxTypes.ts`
  - `src/react/view/word/docxRuntimeUtils.ts`
  - `src/react/view/word/docxText.ts`
  - `src/react/view/word/docxSnapshot.ts`
  - `src/react/view/word/docxExport.ts`
  - `src/react/view/word/docxSaveRepair.ts`
  - `src/react/view/word/docxSaveValidation.ts`
  - `src/react/view/word/superdocExceptions.ts`
  - `src/react/view/word/superdocFonts.ts`
  - `src/react/view/word/superdocZoom.ts`

## Verification Evidence

- `npm run test:docx-editor-provider` passed.
- `npm run typecheck` passed.
- `wc -l src/react/view/word/*.ts src/react/view/word/*.tsx` confirms every authored DOCX module is under 500 lines and `Word.tsx` is under the 350-line 03.1 target.

## Notes

The DOCX provider guard test now reads all authored `.ts/.tsx` files under `src/react/view/word`, because the intended architecture no longer keeps every behavior guard inside `Word.tsx`. Negative runtime-removal checks still cover the combined product source.
