# Cross-Branch Audit Research Overview

Date: 2026-06-07

Scope:
- `dev_docx` worktree: `/Users/jun/Developer/new/700_projects/code-office--dev_docx`
- `dev_pptx` worktree: `/Users/jun/Developer/new/700_projects/code-office--dev_pptx`
- `main` Markdown wikilink cache fix: `/Users/jun/Developer/new/700_projects/code-office`

This folder records a cross-branch audit after the DOCX/PPTX implementation
work and the Markdown open-speed root fix. The purpose is not to merge branches
or change behavior. It is to capture what is proven, what remains ambiguous, and
what must be fixed before the branch work can be treated as user-ready.

## Source Material

Existing devlog:

- `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260605_docx_pptx_upgrade_research/00_research_docx_pptx_library_survey.md`
- `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260605_docx_pptx_upgrade_research/01_master_plan.md`
- `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260605_docx_pptx_upgrade_research/02_dev_docx_integration.md`
- `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260605_docx_pptx_upgrade_research/03_dev_pptx_integration.md`
- `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260605_docx_pptx_upgrade_research/04_phase_gate_completion.md`
- `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260605_markdown_wikilink_cache/00_research.md`
- `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260605_markdown_wikilink_cache/01_plan.md`
- `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260605_markdown_wikilink_cache/02_implementation.md`
- `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260605_markdown_wikilink_cache/03_verification.md`

Employee audits:

- Frontend employee: completed, read-only audit, PASS for Markdown, FAIL for
  DOCX/PPTX user-edit/save completeness.
- Docs employee: completed, read-only audit, PASS for Markdown documentation,
  FAIL for DOCX/PPTX documentation completeness and runtime evidence.
- Backend employee: failed with `Error: fetch failed`; no backend employee
  verdict is claimed in this folder.

Boss verification:

- Checked git worktrees and branch commits.
- Re-read DOCX/PPTX provider and WebView code from their dedicated worktrees.
- Re-read Markdown provider/resolver/index code from `main`.
- Did not run destructive git commands.

## Branch Matrix

| Area | Branch / worktree | State | Audit verdict |
|---|---|---|---|
| DOCX editor | `dev_docx` / `/Users/jun/Developer/new/700_projects/code-office--dev_docx` | 3 commits on branch, not merged to `main` | Implementation scaffold present, user-ready edit/save not proven |
| PPTX view/edit | `dev_pptx` / `/Users/jun/Developer/new/700_projects/code-office--dev_pptx` | 6 commits on branch, not merged to `main` | View path present, edit path incomplete for user-driven modification |
| Markdown wikilink cache | `main` / `/Users/jun/Developer/new/700_projects/code-office` | committed on `main`, installed VSIX smoke previously recorded | Root fix proven for open hot path, residual async metadata risk documented |

## Document Index

- `90_research_docx_branch.md`: DOCX branch implementation and save lifecycle audit.
- `91_research_pptx_branch.md`: PPTX branch view/edit/WASM audit.
- `92_research_markdown_cache.md`: Markdown open-speed cache root-fix audit.
- `93_employee_parallel_audit.md`: Employee dispatch results and cross-cutting conclusions.

## Executive Conclusion

The Markdown open-speed fix is the strongest and most complete item. It has
implementation evidence, automated tests, release packaging, VS Code Insiders
installation, and runtime smoke evidence.

The DOCX and PPTX branches are useful prototypes with real provider integration,
but the current evidence does not support treating them as finished user-facing
editing features. They should not be merged as "complete editing" without a
follow-up fix pass and runtime save/edit verification.
