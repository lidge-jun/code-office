# Documentation Sync v3.7.50 — Verification

**Date:** 2026-06-27  
**Package:** `code-office@3.7.50`  
**Goal ID:** a3e159b3-e87

## Requirement checklist

| Requirement | Evidence | Status |
|---|---|---|
| Pending structure + git-history committed | `071c755` — `structure/08-git-commit-history.md`, `structure/data/git-log-1000.tsv` | PASS |
| `02-extension-api` stale fixes | `code-office.docx.save`, `editorTheme` Auto/Light/Solarized, `pptx.conversionTimeoutMs` in `structure/02-extension-api.md` | PASS |
| `03-hwp-subsystem` line count + R1 note | `hwpSaveService` 149 lines; re-pin decision row in rhwp table | PASS |
| `04-viewer-architecture` SuperDoc + raw shipped | `Word.css` section; no `Planned Live Preview` heading | PASS |
| `05-build-release` CHANGELOG policy | § CHANGELOG Sync Policy | PASS |
| CHANGELOG `3.7.49` / `3.7.50` | `CHANGELOG.md` lines 3–16 | PASS |
| README variants roadmap | `README.md`, `README-KO.md`, `README-CN.md` shipped vs active | PASS |
| GitHub Pages + ARCHITECTURE | `docs/index.html`, `docs/ARCHITECTURE.md` | PASS |
| `direction.md` / `roadmap.md` snapshot | v3.7.50 banners, PPTX provider correction | PASS (this closure) |

## Commands run

```text
npm run verify:hwp-compatibility → PASS (matrix baseline 3.7.50)
rg 'editorTheme.*Wechat|Planned Live Preview' structure/ docs/ README*.md → no matches
wc -l structure/data/git-log-1000.tsv → 1000
```

## Commits (this work-phase)

- `071c755` docs(structure): sync architecture docs and git history to v3.7.50
- `7dc3214` docs(changelog): backfill 3.7.49 and 3.7.50 release notes
- `4558c1a` docs(readme): refresh roadmap for v3.7.50 shipped baseline
- `12ceb06` docs(site): update GitHub Pages and architecture for v3.7.50
- `066f42c` docs(devlog): add v3.7.50 documentation sync plan

## Out of scope (not goal blockers)

- `git push` to origin (requires explicit user approval)
- `_plan` stale stub directory cleanup (`260603_hwp_viewer_mode`, etc.)
- rhwp R2 re-pin execution (separate goal / `260627_upstream_rhwp_chase`)
