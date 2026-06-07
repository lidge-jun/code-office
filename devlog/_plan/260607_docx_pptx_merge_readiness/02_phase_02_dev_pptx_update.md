# Phase 02 — dev_pptx Update Plan

## Scope

Update `dev_pptx` onto current `main` and close PPTX-specific pre-QA blockers.

Worktree:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx
```

## Required Changes

- Merge current `main` into `dev_pptx`.
- Preserve `main` Markdown wikilink cache files and tests.
- Preserve PPTX custom editor routing.
- Remove dead `__autosave` listener from host handler.
- Add explicit edit-mode dirty signal.
- Extend `pptxPhase4Test` so dirty/save scaffolding is asserted before GUI QA.

## Acceptance Criteria

| Requirement | Evidence |
|---|---|
| `dev_pptx` contains current `main` Markdown cache fix | `npm run test:markdown` PASS and source inspection |
| `.pptx/.pptm/.ppsx` route to `cweijan.pptxEditor` | package/provider source inspection |
| Dead `__autosave` handler removed | `rg "__autosave"` no longer finds PPTX handler usage |
| Edit mode has positive dirty path | source assertion/test proves `pptxDirtyChanged { isDirty: true }` |
| Save still uses provider-owned `pptxSaveRequest -> exportPptx -> pptxSaveResponse` | `npm run test:pptx-phase4` PASS |

## Residual Risk

If a stable `pptx-svg` mutation API is not available during implementation, the
goal may stop with a dirty/save scaffold and document semantic PPTX content
mutation as a manual GUI QA item.

## Implementation Evidence

Branch commits:

```text
3ce0c20 Merge branch 'main' into dev_pptx
9c2504d fix(pptx): add pre-qa dirty edit path
6578433 Merge branch 'main' into dev_pptx
a76bfea Merge branch 'main' into dev_pptx
314d020 Merge branch 'main' into dev_pptx
```

`9c2504d` is the implementation commit. Later merge commits are main/devlog
syncs so the branch remains merge-ready with current Markdown cache work.

Changed files in the PPTX fix commit:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/provider/handlers/pptxHandler.ts
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.less
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/test/pptxPhase4Test.mjs
```

Implemented behavior:

- Removed dead `__autosave` listener from `pptxHandler.ts`.
- Added edit-mode `Apply QA note` action in `Pptx.tsx`.
- The edit action attempts `pptx-svg` `addParagraph(...)` first.
- If direct paragraph mutation fails, the action falls back to
  `updateSlideFromSvg(...)` and records that semantic persistence must be
  confirmed during GUI QA.
- Successful edit action emits `pptxDirtyChanged { isDirty: true }`.
- Save remains provider-owned through `pptxSaveRequest -> exportPptx ->
  pptxSaveResponse`.
- `test:pptx-phase4` now asserts the dirty/save source path in addition to
  handler/provider build and WASM asset checks.

Verification:

```text
npm run test:pptx-phase4
PASS on branch tip 314d020: pptx phase4 checks passed
```
