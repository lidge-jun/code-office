# Research 90 — Cross-Branch Audit Input

This plan is based on:

```text
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260607_cross_branch_audit_research/00_overview.md
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260607_cross_branch_audit_research/90_research_docx_branch.md
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260607_cross_branch_audit_research/91_research_pptx_branch.md
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260607_cross_branch_audit_research/92_research_markdown_cache.md
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260607_cross_branch_audit_research/93_employee_parallel_audit.md
```

Key inputs:

- Backend audit passed DOCX/PPTX provider lifecycle and file IO architecture.
- Frontend audit failed DOCX/PPTX user-ready editing due to DOCX save UX and
  PPTX dirty/edit gaps.
- Docs audit failed older DOCX/PPTX docs due stale state and missing runtime
  evidence.
- Markdown cache fix on `main` passed implementation and verification audit.

The current goal closes the Frontend/Docs blockers through the first
installed-VSIX smoke in the already-open VS Code Insiders window. Broader
fixture QA and final merge approval remain outside this branch-prep goal.

Post-smoke updates:

```text
278d09d fix(office): route docx pptx save through active providers
0dcc058 fix(pptx): use public slide count getter
```

The first smoke found that the existing VS Code window remembered Text Editor as
the default editor for `*.docx` and `*.pptx`. `Reopen Editor With...` exposed the
code-office editors, after which DOCX and PPTX open/edit/save persistence passed
against the temporary sample files documented in `04_gui_runtime_smoke.md`.
