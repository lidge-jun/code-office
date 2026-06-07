# Research 93 — Employee Parallel Audit

Date: 2026-06-07

This document records the parallel employee audit requested after the DOCX/PPTX
branch work and Markdown cache fix.

## Dispatch Summary

| Employee | Result | Notes |
|---|---|---|
| Backend | Completed late | First poll returned `Error: fetch failed`, but a late employee report arrived afterward. Verdict: PASS for provider/lifecycle/file-IO architecture and Markdown cache confinement. |
| Frontend | Completed | Read-only audit; PASS for Markdown, FAIL for DOCX/PPTX user-ready edit/save completeness. |
| Docs | Completed | Read-only audit; PASS for Markdown docs, FAIL for DOCX/PPTX doc freshness/runtime evidence. |

## Backend Employee Findings

Backend verdict:

| Area | Verdict | Reason |
|---|---|---|
| `dev_docx` | PASS | Provider registration, `CustomEditorProvider` lifecycle, save bridge, file IO, and custom editor routing are clean. |
| `dev_pptx` | PASS | Provider registration, lifecycle, save bridge, high-fidelity view routing, and legacy `pptxReader.ts` removal are clean; one dead-code cleanup noted. |
| Markdown cache on `main` | PASS | `workspace.findFiles()` is confined to cold index build and no-index fallback; production open/click/completion paths use the attached index/cache. |

Important Backend evidence:

- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/provider/docx/DocxEditorProvider.ts`
  implements open/resolve/save/saveAs/revert/backup and writes returned bytes
  through `workspace.fs.writeFile`.
- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/provider/handlers/docxHandler.ts`
  implements requestId-based save bridge with timeout.
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/provider/pptx/PptxEditorProvider.ts`
  mirrors the custom document lifecycle and writes exported bytes as
  `Uint8Array`.
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/provider/handlers/pptxHandler.ts`
  contains a harmless dead `__autosave` listener because `Handler.on()` is
  single-listener-per-event and the WebView never originates `__autosave`.
- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkIndex.ts`
  keeps `findFiles` inside `scanFiles()`.
- `/Users/jun/Developer/new/700_projects/code-office/src/provider/markdownEditorProvider.ts`
  builds initial Markdown open payload from cached wikilink data.

Backend integration notes:

- `dev_docx` and `dev_pptx` branched from `48f7ab5`, before the Markdown cache
  fix landed on `main`. The scary two-way diff that shows Markdown cache files
  as deletions is a branch-divergence artifact; neither branch modified those
  files post-fork.
- A normal merge into current `main` should preserve the Markdown cache fix, but
  package.json, extension registration, and officeViewer routing are likely to
  conflict when both branches are integrated.
- Backend recommends merging/rebasing `main` into each branch before final CI.

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

## Cross-Cutting Conclusions

1. The Markdown cache fix is complete enough to keep as the current accepted
   root fix for Markdown slow open.
2. DOCX branch passes backend architecture review but should still be treated as
   a serious WYSIWYG integration scaffold, not a fully proven user-ready editing
   feature.
3. PPTX branch passes backend architecture review and high-fidelity view routing,
   but should still be treated as experimental WASM export plumbing until user
   mutation and dirty-state editing are implemented.
4. The DOCX/PPTX branches diverged before the Markdown cache fix; merge/rebase
   sequencing must preserve the current `main` cache code.
5. The earlier DOCX/PPTX devlog should be refreshed before merge. The most
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

Integration:

- Rebase or merge current `main` into `dev_docx` and `dev_pptx` before final
  branch integration.
- Expect manual conflict resolution in `package.json`, `src/extension.ts`, and
  `src/provider/officeViewerProvider.ts`.
- After integration, run `npm run build` and `npm run test:ci` on the reconciled
  result.
