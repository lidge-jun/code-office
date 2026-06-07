# Phase 02 — dev_pptx Update Plan

## Scope

Update `dev_pptx` onto current `main` and close PPTX-specific pre-QA blockers.
The branch was later carried through installed-VSIX smoke and a post-smoke
React type-gate fix.

Worktree:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx
```

## Required Changes

- Merge current `main` into `dev_pptx`.
- Preserve `main` Markdown wikilink cache files and tests.
- Preserve PPTX custom editor routing.
- Remove dead `__autosave` listener from host handler.
- Superseded: the earlier explicit edit-mode dirty signal plan was replaced by
  `06_pptx_view_only_rollback.md` after runtime QA showed partial PPTX editing
  was not production-grade.
- Extend `pptxPhase4Test` so view-only PPTX UX and no-edit/no-save guarantees
  are asserted before GUI QA.

## Acceptance Criteria

| Requirement | Evidence |
|---|---|
| `dev_pptx` contains current `main` Markdown cache fix | `npm run test:markdown` PASS and source inspection |
| `.pptx/.pptm/.ppsx` route to `cweijan.pptxEditor` | package/provider source inspection |
| Dead `__autosave` handler removed | `rg "__autosave"` no longer finds PPTX handler usage |
| Partial edit/save mode remains removed | source assertion/test proves no `pptxDirtyChanged`, `pptxSaveRequest`, `exportPptx`, `pptx-svg`, or WASM edit asset |
| View-only PowerPoint-like UX foundation is implemented | `09_pptx_powerpoint_ux_implementation.md` records visual thumbnails, sidebar resize/collapse foundation, and speaker notes |
| View-only PowerPoint-like UX reaches current pre-QA target | Future 10 completion evidence required: `10_pptx_status_bar_presenter_plan.md` implemented and verified, `npm run test:pptx-phase4` PASS, installed-VSIX runtime smoke PASS |

## Residual Risk

The earlier `pptx-svg` mutation path was removed after runtime QA. The current
residual risk is visual/runtime fit of the view-only PPTX UX, not semantic PPTX
editing persistence.

## Implementation Evidence

Branch commits:

```text
3ce0c20 Merge branch 'main' into dev_pptx
9c2504d fix(pptx): add pre-qa dirty edit path
6578433 Merge branch 'main' into dev_pptx
a76bfea Merge branch 'main' into dev_pptx
314d020 Merge branch 'main' into dev_pptx
768a81f fix(pptx): declare extension type roots for tsc
dbe12d3 merge(docx): integrate docx editor into pptx pre-qa branch
278d09d fix(office): route docx pptx save through active providers
0dcc058 fix(pptx): use public slide count getter
```

`9c2504d` was the earlier PPTX editor implementation commit. It is historical
evidence only and is superseded by `06_pptx_view_only_rollback.md`.
`768a81f` is the C-gate TypeScript configuration fix. `dbe12d3` resolves the
documented integration conflicts by making `dev_pptx` the post-`dev_docx`
integration branch. `278d09d` adds provider-command save routing that remains
relevant for DOCX/HWP provider-owned saves, but PPTX save/edit behavior is no
longer in the current scope. `0dcc058` closes the React type gate by using the
public `PptxViewer.slideCount` getter. The earlier merge commits are
main/devlog syncs so the branch remains merge-ready with current Markdown cache
work.

Changed files in the PPTX fix commit:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/provider/handlers/pptxHandler.ts
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.less
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/test/pptxPhase4Test.mjs
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/tsconfig.json
```

Historical behavior later superseded by view-only rollback:

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

Current authoritative behavior:

- `06_pptx_view_only_rollback.md` removed the partial edit/save path.
- `09_pptx_powerpoint_ux_implementation.md` records the thumbnail/sidebar/notes
  view-only foundation.
- `10_pptx_status_bar_presenter_plan.md` is the current pre-QA target for the
  PowerPoint-like bottom status/action bar, Grid, Fullscreen, Presenter, and
  zoom slider.
- Current `test:pptx-phase4` must assert view-only UX and no edit/save/pptx-svg
  surfaces.

Verification:

```text
npm run test:pptx-phase4
Historical PASS on branch tip 768a81f: pptx phase4 checks passed.
Superseded by the later view-only `test:pptx-phase4` gate.
npx tsc --noEmit
PASS after save-routing repair
npx tsc --noEmit -p src/react/tsconfig.json
PASS after 0dcc058
npm run build
PASS after save-routing repair
npm run test:ci
PASS after save-routing repair
Installed VSIX smoke in existing VS Code Insiders window
Historical pre-rollback PASS after 278d09d: DOCX/PPTX markers persisted to ZIP XML.
The PPTX marker persistence smoke is superseded by the view-only rollback and
must not be used as current PPTX QA criteria.
```
