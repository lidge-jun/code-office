# Dev-Skill Structural Gap Audit

Date: 2026-06-10

## Verification Evidence

```text
npx --yes madge --circular --extensions ts,tsx src --exclude 'src/bundle|src/react/view/excel/x-spreadsheet|resource'
- Finding files
Processed 186 files (537ms) (41 warnings)
✔ No circular dependency found!
```

Largest non-vendor/non-spreadsheet source files:

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

## Findings

### 1. DOCX WebView Is Over-Concentrated

`src/react/view/word/Word.tsx` is 979 lines. It currently owns:

- host message handling,
- SuperDoc lifecycle and mode state,
- dirty detection,
- save/export fallbacks,
- text snapshot extraction,
- DOCX XML repair helpers,
- viewer/editor switching.

This violates the dev-skill preference for small modules with explicit boundaries. It is the clearest modularization target.

### 2. HWP Files Sit At The Line Limit

`src/provider/hwp/HwpEditorProvider.ts` and `src/react/view/hwp/rhwpBridge/createSecureRhwpEditor.ts` are exactly 500 lines. They are still within the rule, but any new behavior should be extracted rather than appended.

### 3. PPTX Viewer Is Close To The Limit

`src/react/view/pptx/Pptx.tsx` is 476 lines. It is acceptable today, but fullscreen/presenter/sidebar/status-bar work has made it a boundary risk. Future PPTX UI additions should go into existing child components or new feature modules.

### 4. Legacy Markdown Export Still Uses CommonJS

`src/service/markdown/markdown-pdf.js`, `src/service/markdown/html-export.js`, and `src/service/markdown/outline.js` use `require()`. The repo still tolerates this legacy path, but dev rules prefer ESM-only for new code. Do not expand this CommonJS surface; migrate only as a focused compatibility project.

### 5. Bundled/Vendor Surfaces Dominate Raw Line Counts

Raw line count includes bundled code:

- `src/react/view/excel/x-spreadsheet/*`
- `src/bundle/adm-zip/*`
- `resource/pdf/*`
- `resource/vditor/*`

These should be excluded from ordinary modularization enforcement unless the project intentionally forks them.

## Non-Findings

- No TypeScript/TSX circular dependencies were found.
- Custom editor registration is centralized in `src/extension.ts` and `package.json`.
- DOCX/PPTX/HWP provider boundaries are explicit at the VS Code `CustomEditorProvider` layer.

