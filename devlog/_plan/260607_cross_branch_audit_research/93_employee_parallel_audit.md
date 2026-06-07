# Research 93 — Employee Parallel Audit

Date: 2026-06-07

This document records the parallel employee audit requested after the DOCX/PPTX
branch work and Markdown cache fix.

## Dispatch Summary

| Employee | Result | Notes |
|---|---|---|
| Backend | Failed | Dispatch ended with `Error: fetch failed`; no backend employee verdict is claimed. |
| Frontend | Completed | Read-only audit; PASS for Markdown, FAIL for DOCX/PPTX user-ready edit/save completeness. |
| Docs | Completed | Read-only audit; PASS for Markdown docs, FAIL for DOCX/PPTX doc freshness/runtime evidence. |

## Frontend Employee Findings

Frontend verdict:

| Area | Verdict | Reason |
|---|---|---|
| `dev_docx` | FAIL | Editor/provider wiring exists, but WebView `Cmd+S`/autosave path does not clearly drive disk save; no dedicated runtime regression. |
| `dev_pptx` | FAIL | View path exists, but edit mode lacks shape/text mutation and dirty-true path. |
| Markdown cache on `main` | PASS | Initial open payload uses cached accessors; broad scan is isolated to cold index/fallback paths. |

Important Frontend evidence:

- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/react/view/word/Word.tsx:124`
  intercepts `Cmd/Ctrl+S`.
- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/react/view/word/Word.tsx:131`
  emits dirty state, not a save command.
- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/provider/docx/DocxEditorProvider.ts:75`
  wires the bridge.
- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/provider/docx/DocxEditorProvider.ts:85`
  implements `saveCustomDocument()`.
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx:58`
  starts edit mode rendering.
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx:146`
  exports PPTX bytes.
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/provider/pptx/PptxEditorProvider.ts:69`
  returns from save when `document.isDirty` is false.
- `/Users/jun/Developer/new/700_projects/code-office/src/provider/markdownEditorProvider.ts:99`
  builds initial Markdown open payload from cached data.

## Docs Employee Findings

Docs verdict:

| Area | Verdict | Reason |
|---|---|---|
| `dev_docx` | FAIL | Scope and implementation are documented, but runtime verification is absent and integration docs are stale vs branch state. |
| `dev_pptx` | FAIL | Existing docs conflict on completion status; runtime proof and residual-risk consolidation are missing. |
| Markdown cache on `main` | PASS | Scope, implementation, verification evidence, and residual risks are documented. |

Important Docs evidence:

- `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260605_docx_pptx_upgrade_research/02_dev_docx_integration.md`
  is behind the later `04_phase_gate_completion.md` state.
- `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260605_docx_pptx_upgrade_research/03_dev_pptx_integration.md`
  conflicts with later completion notes and does not fully describe the final
  branch state.
- `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260605_docx_pptx_upgrade_research/04_phase_gate_completion.md`
  records build success but still lists runtime verification as pending.
- `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260605_markdown_wikilink_cache/03_verification.md`
  contains the full automated/runtime/residual-risk evidence trail.

Docs also noted a convention gap: the older `260605_*` folders do not follow the
preferred `00_overview.md`, `01_phase_01_*.md`, `90_research_*.md` naming style.
This new folder uses the preferred naming shape.

## Backend Employee Failure

The backend employee dispatch did not return a review report. It failed with:

```text
Error: fetch failed
```

Because there is no backend employee output, this document does not claim a
backend employee PASS or FAIL. Backend-style source checks in this folder are
Boss verification only.

## Cross-Cutting Conclusions

1. The Markdown cache fix is complete enough to keep as the current accepted
   root fix for Markdown slow open.
2. DOCX branch should be treated as a serious WYSIWYG integration scaffold, not
   a fully proven editing feature.
3. PPTX branch should be treated as high-fidelity viewing plus experimental
   WASM export plumbing, not complete PPTX editing.
4. The earlier DOCX/PPTX devlog should be refreshed before merge. The most
   important missing pieces are runtime save/reopen evidence and explicit
   residual risks.

## Recommended Next Audit/Fix Split

DOCX:

- Fix or prove WebView `Cmd+S` behavior.
- Decide whether `__autosave` should be removed, handled, or documented as an
  editor-local callback only.
- Add a provider bridge regression test.
- Run Dev Host edit/save/reopen smoke.

PPTX:

- Add at least one real mutation path.
- Emit `pptxDirtyChanged` with `isDirty: true` on user modification.
- Prove `exportPptx()` persists a visible modification after reopen.
- Document edit mode as experimental until those checks pass.

Markdown:

- No immediate fix required.
- Optional timed performance trace if a numeric latency goal is needed later.
