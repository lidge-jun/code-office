# Phase 01 - 03-Series Structural Execution Plan

Date: 2026-06-10
Project root: `/Users/jun/Developer/new/700_projects/code-office`

## Objective

Implement the `03.n` structural guides as code-level refactoring and guard tests. This is not a feature project. Existing DOCX, HWP, PPTX, and Markdown behavior must remain equivalent while module boundaries become easier to maintain.

## Acceptance Criteria

1. DOCX `Word.tsx` is reduced from 979 lines to a coordinator under 350 lines.
2. DOCX helper files are extracted under `src/react/view/word/` with no internal `index.ts` barrel.
3. `Word.tsx` no longer imports `JSZip` or owns DOCX XML repair helpers.
4. DOCX save/export behavior tests remain behavior-focused and pass after source split.
5. HWP and PPTX structural guard tests explicitly enforce their project-local 500-line maximum while documenting the canonical 400-line debt.
6. Markdown CommonJS containment is enforced by testable source assertions without performing the ESM migration in this phase.
7. Verification from `03.5_verification_and_review_gate.md` passes or any impossible gate is explicitly documented with evidence.
8. Backend/Architecture and Docs/Frontend read-only employees return PASS or PASS-with-nonblocking-notes before final commit.

## Phase Map

| Phase | Scope | Commit target |
|---|---|---|
| Phase 1 | Planning and employee plan audit | no commit unless plan doc changes only |
| Phase 2 | DOCX pure helper extraction: constants, types, fonts, runtime utils, snapshot/export/repair | `refactor(docx): extract word helper modules` |
| Phase 3 | DOCX React hook/component extraction and `Word.tsx` coordinator reduction | `refactor(docx): split word surface hooks` |
| Phase 4 | HWP/PPTX/Markdown guard tests and docs update | `test(structure): enforce 03-series boundaries` |
| Phase 5 | Verification matrix, employee review, final devlog/structure refresh | `docs(devlog): record 03-series implementation` if needed |

## Planned File Changes

### DOCX New Files

Create:

```text
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/docxConstants.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/docxTypes.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/superdocFonts.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/superdocExceptions.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/superdocZoom.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/docxRuntimeUtils.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/docxText.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/docxSnapshot.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/docxExport.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/docxSaveRepair.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/useDocxDocumentState.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/useDocxDirtyState.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/useDocxHostSave.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/useDocxHostEvents.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/useDocxModeSwitch.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/useDocxKeyboardSave.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/useDocxRenderTimeout.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/DocxModeToolbar.tsx
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/SuperDocSurface.tsx
```

Conditional:

```text
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/docxSaveValidation.ts
```

Create `docxSaveValidation.ts` only if `docxSnapshot.ts` would exceed 400 lines or validation becomes a distinct owner.

Do not create:

```text
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/index.ts
```

### DOCX Modified Files

Modify:

```text
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.tsx
/Users/jun/Developer/new/700_projects/code-office/src/test/docxEditorProviderTest.mjs
```

Expected after state:

- `Word.tsx` imports focused helpers and remains the coordinator.
- `Word.tsx` keeps `SuperDocRef`, top-level mode state, render composition, and the event wiring only when it truly needs component-local state.
- tests read all authored files under `src/react/view/word/` for split-source assertions.
- tests assert negative boundaries: no `JSZip` import in `Word.tsx`, no `patchDocxTextFromSnapshots` definition in `Word.tsx`, no `src/react/view/word/index.ts`.

### HWP/PPTX/Markdown Modified Files

Modify:

```text
/Users/jun/Developer/new/700_projects/code-office/src/test/hwpViewerModeTest.mjs
/Users/jun/Developer/new/700_projects/code-office/src/test/pptxPhase4Test.mjs
/Users/jun/Developer/new/700_projects/code-office/src/test/markdownPhase5Test.mjs
```

Expected after state:

- HWP tests assert `HwpEditorProvider.ts` and `createSecureRhwpEditor.ts` stay at or below 500 lines and provider-side HWP files do not import React.
- PPTX tests assert `Pptx.tsx` stays below 500 lines, PPTX stays view-only, and child components remain present.
- Markdown tests assert `markdown-pdf.js`, `html-export.js`, and `outline.js` are the only allowed CommonJS export files in the Markdown export surface for this phase.

### Documentation Updates

Modify or add as needed:

```text
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260610_repo_structure_dev_skill_audit/11_phase_02_docx_helper_split.md
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260610_repo_structure_dev_skill_audit/12_phase_03_docx_surface_split.md
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260610_repo_structure_dev_skill_audit/13_phase_04_guard_tests.md
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260610_repo_structure_dev_skill_audit/14_phase_05_verification.md
/Users/jun/Developer/new/700_projects/code-office/structure/01-file-function-map.md
/Users/jun/Developer/new/700_projects/code-office/structure/04-viewer-architecture.md
```

Structure docs are updated only after code movement is verified.

## Implementation Sequence

### Step 1 - Plan Audit

Dispatch Backend/Architecture read-only audit over this plan and `03.1` through `03.5`.

PASS requirements:

- all current source paths resolve,
- future file list has no contradiction,
- test plan covers behavioral preservation,
- no planned internal barrel.

### Step 2 - DOCX Pure Helper Split

Move constants, types, font assets, runtime utilities, SuperDoc exception helpers, zoom helper, snapshot helpers, export helpers, and DOCX XML repair helpers.

Verification after this step:

```text
npm run test:docx-editor-provider
npm run typecheck
npx --yes madge --circular --extensions ts,tsx src --exclude 'src/bundle|src/react/view/excel/x-spreadsheet|resource'
```

### Step 3 - DOCX Hook And Surface Split

Move host-save handling, document state, dirty state, mode switch, keyboard save, render timeout, toolbar, and SuperDoc surface into focused hooks/components.

Verification after this step:

```text
npm run test:docx-editor-provider
npm run typecheck
```

Structural requirements:

- `Word.tsx` below 350 lines.
- every new DOCX helper below 400 lines.
- no extracted helper imports from `Word.tsx`; dependency direction is `Word.tsx` -> focused helpers/components only.
- no provider/extension-host API import in React helpers.

### Step 4 - Guard Tests

Strengthen existing tests for HWP/PPTX/Markdown boundaries.

Verification after this step:

```text
npm run test:hwp-viewer-mode
npm run verify:hwp
npm run test:pptx-phase4
npm run test:markdown
```

### Step 5 - Full Gate

Run:

```text
git diff --check
npm run typecheck
npm run test:docx-editor-provider
npm run test:hwp-viewer-mode
npm run verify:hwp
npm run test:pptx-phase4
npm run test:markdown
npm run test:office
npm run test:ci
npm run build
npx --yes madge --circular --extensions ts,tsx src --exclude 'src/bundle|src/react/view/excel/x-spreadsheet|resource'
```

Then dispatch:

- Backend/Architecture verifier,
- Frontend/Docs verifier.

## Risks And Controls

| Risk | Control |
|---|---|
| DOCX save behavior regresses during extraction | Keep behavior tests; do not weaken assertions; source assertions read combined DOCX files. |
| Hooks create dependency cycles | Run madge after helper split and full gate. |
| `Word.tsx` remains too large | Patch 6 hooks are mandatory; re-plan if still above 400 lines. |
| Test suite over-couples to file names | Keep behavior assertions first; only use file-name assertions for explicit boundaries such as no barrel/no JSZip in coordinator. |
| HWP/PPTX debt gets hidden by 500-line cap | Tests and docs call out 400-line canonical debt while enforcing the project-local 500 maximum. |
| Markdown ESM migration grows scope | Do not convert CommonJS in this goal; only add containment assertions. |

## Non-Goals

- No new DOCX editing feature.
- No PPTX editing revival.
- No Markdown ESM migration.
- No VSIX publish or push.
- No visual UX redesign beyond preserving current DOCX surface behavior.
