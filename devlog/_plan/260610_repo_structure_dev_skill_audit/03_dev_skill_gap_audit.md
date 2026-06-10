# Dev-Skill Structural Gap Audit Index

Date: 2026-06-10

This file is the index for the dev-skill structural gap audit. The detailed
patch guidance is split into `03.n` files so future implementation can follow
Jawdev/TLR-style small, reviewable changes instead of reopening one large
summary document.

## Verification Evidence

```text
npx --yes madge --circular --extensions ts,tsx src --exclude 'src/bundle|src/react/view/excel/x-spreadsheet|resource'
- Finding files
Processed 186 files (537ms) (41 warnings)
✔ No circular dependency found!
```

Largest non-vendor/non-spreadsheet source files:

Completion note, 2026-06-10: the DOCX `Word.tsx` count below is retained as the original audit snapshot. The 03-series execution pass reduced `Word.tsx` to a 346-line coordinator and moved DOCX leaves under `src/react/view/word/`; see `11_phase_02_docx_split_progress.md`.

```text
979 src/react/view/word/Word.tsx
500 src/react/view/hwp/rhwpBridge/createSecureRhwpEditor.ts
500 src/provider/hwp/HwpEditorProvider.ts
495 src/react/view/hwp/Hwp.tsx
476 src/react/view/pptx/Pptx.tsx
366 src/service/wikilink/wikilinkResolver.ts
341 src/service/markdown/markdown-pdf.js
318 src/react/view/hwp/hwpFind.ts
290 src/provider/markdownEditorProvider.ts
272 src/common/hwpMessageSchema.ts
240 src/service/markdownService.ts
219 src/provider/docx/DocxEditorProvider.ts
219 src/extension.ts
```

## Detailed Patch Guides

| File | Scope |
|---|---|
| `03.1_docx_word_surface_split.md` | Exact DOCX `Word.tsx` extraction plan: modules, moved functions, imports, tests, and sequencing. |
| `03.2_hwp_limit_guard.md` | HWP 500-line boundary guard: where future additions must land instead of appending to limit files. |
| `03.3_pptx_component_boundary.md` | PPTX near-limit component policy and future patch targets for notes/sidebar/presenter work. |
| `03.4_markdown_commonjs_boundary.md` | Legacy Markdown export CommonJS containment and future ESM migration boundary. |
| `03.5_verification_and_review_gate.md` | Verification matrix and employee PASS criteria for any future modularization implementation. |

## Findings Summary

1. DOCX WebView was over-concentrated: `src/react/view/word/Word.tsx` was 979 lines and mixed UI, SuperDoc lifecycle, save bridge, dirty tracking, and DOCX XML repair. This has been addressed by the 03-series execution pass; keep the original count as audit evidence only.
2. HWP files sit at the limit: `src/provider/hwp/HwpEditorProvider.ts` and `src/react/view/hwp/rhwpBridge/createSecureRhwpEditor.ts` are exactly 500 lines.
3. PPTX viewer is close to the limit: `src/react/view/pptx/Pptx.tsx` is 476 lines.
4. Legacy Markdown export still uses CommonJS in `markdown-pdf.js`, `html-export.js`, and `outline.js`.
5. Bundled/vendor surfaces should stay excluded from ordinary modularization enforcement.

## Non-Findings

- No TypeScript/TSX circular dependencies were found.
- Custom editor registration is centralized in `src/extension.ts` and `package.json`.
- DOCX/PPTX/HWP provider boundaries are explicit at the VS Code `CustomEditorProvider` layer.
