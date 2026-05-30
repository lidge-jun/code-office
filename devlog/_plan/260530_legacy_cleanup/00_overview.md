# Legacy File Cleanup Plan

**Date**: 2026-05-30
**Goal**: Remove all legacy/orphan files that have been superseded and clean up stale references.

## Background

The repo accumulated several generations of legacy artifacts:

1. **`.kiro/`** — Kiro IDE project guide from the original RJ.Wang fork era. The project has been rebranded to `code-office` under publisher `jun6161`. This guide references the old repo name (`vscode-office-enhanced`), old publisher (`rjwang`), old URLs, and old build conventions that no longer apply.

2. **`devlog/str_func/`** — A "structure-function crosswalk" directory. Its purpose was absorbed into `structure/01-file-function-map.md` during the jawdev numbered convention rewrite (commit `0cc24ec`). Only contains a single `AGENTS.md` placeholder.

3. **`structure/_legacy/`** — Old structure docs moved here during the jawdev rewrite. The active replacements (`structure/00-*` through `structure/06-*`) are already in place and tracked.

4. **`structure/` old root files** — `README.md`, `architecture.md`, `conventions.md`, `license-attribution.md`, `release.md`, `research-comparable-repos.md`, `research.md`, `research_notes/*`, `risks.md`. Already staged as deleted in git working tree but not yet committed.

5. **`DEVELOPMENT_LOG.md`** — 199-line Chinese development log from the upstream RJ.Wang fork era. References old architecture, old repo name, old conventions. Superseded by `devlog/`, `structure/`, `docs/ARCHITECTURE.md`. Git-tracked.

6. **`shortcut.md`** — Vditor keyboard shortcut reference in Chinese/English. This is upstream Vditor documentation copy-pasted into the repo root. Not referenced by any code. Git-tracked but excluded from VSIX via `.vscodeignore`.

7. **Old-name `.vsix` build artifacts** — `vscode-obsdian-3.7.4.vsix` (5.5MB) and `vscode-obsdian-3.7.5.vsix` (32MB) sitting in the repo root. Already gitignored (`*.vsix`) so untracked, but wasting disk space and carrying the old project name.

8. **`.DS_Store` files** — 4 scattered across `devlog/_plan/`, `vendor/rhwp-studio-dist/`, `docs/assets/`, `resource/rhwp-studio/`. Root `.DS_Store` is already in `.gitignore` but subdirectory ones are git-tracked.

## Targets

### DELETE — Files/Directories

| # | Path | Reason | Tracked? |
|---|------|--------|----------|
| 1 | `.kiro/` | Superseded by `structure/`, `docs/`, project rebranded | Yes |
| 2 | `devlog/str_func/` | Superseded by `structure/01-file-function-map.md` | Yes |
| 3 | `structure/_legacy/` | Old docs kept as safety net; active replacements confirmed | Yes |
| 4 | `structure/README.md` | Already deleted in working tree | Yes (staged D) |
| 5 | `structure/architecture.md` | Already deleted in working tree | Yes (staged D) |
| 6 | `structure/conventions.md` | Already deleted in working tree | Yes (staged D) |
| 7 | `structure/license-attribution.md` | Already deleted in working tree | Yes (staged D) |
| 8 | `structure/release.md` | Already deleted in working tree | Yes (staged D) |
| 9 | `structure/research-comparable-repos.md` | Already deleted in working tree | Yes (staged D) |
| 10 | `structure/research.md` | Already deleted in working tree | Yes (staged D) |
| 11 | `structure/research_notes/` | Already deleted in working tree | Yes (staged D) |
| 12 | `structure/risks.md` | Already deleted in working tree | Yes (staged D) |
| 13 | `DEVELOPMENT_LOG.md` | Upstream fork-era dev log, superseded by `devlog/` and `docs/` | Yes |
| 14 | `shortcut.md` | Upstream Vditor shortcut ref, not referenced by code | Yes |
| 15 | `vscode-obsdian-3.7.4.vsix` | Old-name build artifact, gitignored | No (untracked) |
| 16 | `vscode-obsdian-3.7.5.vsix` | Old-name build artifact, gitignored | No (untracked) |
| 17 | `code-office-3.7.6.vsix` | Current build artifact, gitignored, can rebuild | No (untracked) |
| 18 | `devlog/_plan/.DS_Store` | OS artifact | Yes |
| 19 | `vendor/rhwp-studio-dist/.DS_Store` | OS artifact | Yes |
| 20 | `docs/assets/.DS_Store` | OS artifact | Yes |
| 21 | `resource/rhwp-studio/.DS_Store` | OS artifact | Yes |

### MODIFY — Stale References

| # | File | Line | Change |
|---|------|------|--------|
| 1 | `structure/01-file-function-map.md` | 4 | Remove `code-office str_func` from aliases |
| 2 | `structure/06-devlog-map.md` | 30 | Remove `str_func/` tree line |
| 3 | `structure/06-devlog-map.md` | 113 | Remove/update `DEVELOPMENT_LOG.md` row |
| 4 | `.vscodeignore` | 35,41 | Remove `DEVELOPMENT_LOG.md` and `shortcut.md` lines (files gone) |

### GITIGNORE — Prevent Recurrence

| # | Pattern | Reason |
|---|---------|--------|
| 1 | `.kiro/` | Prevent Kiro IDE from recreating |
| 2 | `**/.DS_Store` | Catch subdirectory DS_Store (root already covered) |

### VERIFY — No Broken Imports

After deletion, grep the entire repo for remaining references to:
- `str_func`
- `.kiro`
- `_legacy`
- `DEVELOPMENT_LOG`
- `shortcut.md`
- Paths of deleted files

## Execution Order

1. Delete `.kiro/` directory
2. Delete `devlog/str_func/` directory
3. Delete `structure/_legacy/` directory
4. Stage the already-deleted `structure/` old root files
5. Delete `DEVELOPMENT_LOG.md`
6. Delete `shortcut.md`
7. Delete `.DS_Store` files (4 locations)
8. Delete untracked `.vsix` files from disk
9. Update `structure/01-file-function-map.md` — remove str_func alias
10. Update `structure/06-devlog-map.md` — remove str_func line and DEVELOPMENT_LOG row
11. Update `.vscodeignore` — remove lines for deleted files
12. Update `.gitignore` — add `.kiro/` and `**/.DS_Store`
13. Grep for broken references, fix any found
14. Single commit: `chore: remove legacy files (.kiro, str_func, structure/_legacy, dev log, shortcuts)`

## Out of Scope

- `vendor/rhwp-studio-dist/samples/footnote-01.hwp` modification (unrelated, pre-existing)
- `devlog/_plan/` content referencing old names as historical record (plans are frozen-in-time snapshots)
- `structure/AGENTS.md` (still active for current jawdev structure)
- `devlog/AGENTS.md` (still active for devlog directory)
- Old branding references in `NOTICE.md`, `README*.md`, `CHANGELOG.md`, `docs/*.md` — these are intentional attribution/history records, not orphan files
- `vditor` submodule pointing to `rjwang1982/vditor` — still the active fork URL
- `index.html` — Vite dev entry point, actively used by build system
