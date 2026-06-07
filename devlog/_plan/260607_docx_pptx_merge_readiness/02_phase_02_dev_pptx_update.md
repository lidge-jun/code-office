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
