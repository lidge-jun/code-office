# Baseline Archive Closure Plan

Date: 2026-06-10
Project root: /Users/jun/Developer/new/700_projects/code-office

## Part 1 — Easy Explanation

The `260524_vscode_obsdian_baseline` folder is no longer an active implementation plan. It is the original historical baseline bundle from the pre-`code-office` era, and the actual completed work now lives in later `_fin` folders. This closure keeps the evidence intact, moves the full baseline bundle to `_fin`, and updates current structure/devlog references so maintainers do not treat it as live work.

## Part 2 — Diff-Level Plan

### MOVE

```text
FROM /Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260524_vscode_obsdian_baseline
TO   /Users/jun/Developer/new/700_projects/code-office/devlog/_fin/260524_vscode_obsdian_baseline
```

Reason:

- The folder is a historical master baseline.
- Its active implementation slices are already represented by later `_fin` folders.
- Keeping it in `_plan` makes the active plan list noisy and misleading.

### NEW

```text
/Users/jun/Developer/new/700_projects/code-office/devlog/_fin/260524_vscode_obsdian_baseline/99_archive_closure.md
```

Complete content to create after the move:

```markdown
# Baseline Archive Closure

Date: 2026-06-10

## Closure Decision

`260524_vscode_obsdian_baseline` is archived as a historical baseline bundle, not an active implementation plan.

## Current Successor Records

| Baseline area | Current successor evidence |
|---|---|
| Rebrand and attribution | `devlog/_fin/260529_phase01_rebrand_and_attribution` |
| Initial wikilinks | `devlog/_fin/260529_phase02_wikilinks`, `devlog/_fin/260601_wikilink_resolution_autocomplete`, `devlog/_fin/260608_markdown_wikilink_obsidian_qa` |
| PPTX | `devlog/_fin/260531_phase04_pptx_preview_closure`, `devlog/_fin/260607_docx_pptx_merge_readiness` |
| Markdown CJK / strikethrough | `devlog/_fin/260531_phase05_markdown_cjk_inline_formatting` |
| Excel strikethrough / dependency work | `devlog/_fin/260531_phase06_excel_strikethrough_preservation`, `devlog/_fin/260531_phase06_1_dependency_audit_closure`, `devlog/_fin/260531_phase06_2_dependency_major_upgrades` |
| HWP/HWPX | `devlog/_fin/260529_phase08_hwp_editing`, `devlog/_fin/260603_hwp_viewer_mode`, `devlog/_fin/260610_repo_structure_dev_skill_audit` |
| DOCX/PPTX branch evolution | `devlog/_fin/260605_docx_pptx_upgrade_research`, `devlog/_fin/260607_cross_branch_audit_research`, `devlog/_fin/260609_docx_word_parity`, `devlog/_fin/260609_superdoc_agpl_migration` |
| Release and packaging | `devlog/_fin/260604_release_preflight_audit`, `devlog/_fin/260604_release_registry_publish` |

## Explicit Non-Active Items

- Phase 7 LibreOffice fallback remains historical/deferred. Current product defaults avoid hard LibreOffice dependency for DOCX/PPTX runtime paths.
- Old project identity strings such as `vscode_obsdian` and `vscode-obsdian` remain historical inside this archive.
- Runtime compatibility identifiers may still use legacy `cweijan.*` / `vscode-office.*` strings by design; this archive closure does not rename runtime APIs.

## Verification

```text
git status --short --ignore-submodules=none
rg -n "260524_vscode_obsdian_baseline" structure devlog/_fin devlog/_plan
git diff --check
npx tsc --noEmit
```
```

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/structure/06-devlog-map.md`

Before:

```text
| `260524_vscode_obsdian_baseline` | Historical master baseline with mixed phase snapshots and still-planned LibreOffice fallback. Keep until split into a dedicated baseline archive. |
```

After:

```text
| `260524_vscode_obsdian_baseline` | Historical master baseline archive for the original vscode_obsdian/code-office direction lock and phase research bundle. |
```

Placement:

- Remove from `Current _plan Folders`.
- Add to `Current _fin Folders`.

### MODIFY ACTIVE REFERENCES

Replace active and historical path references from:

```text
devlog/_plan/260524_vscode_obsdian_baseline
```

to:

```text
devlog/_fin/260524_vscode_obsdian_baseline
```

Known files with references:

```text
/Users/jun/Developer/new/700_projects/code-office/structure/roadmap.md
/Users/jun/Developer/new/700_projects/code-office/structure/direction.md
/Users/jun/Developer/new/700_projects/code-office/devlog/_fin/260529_phase01_rebrand_and_attribution/README.md
/Users/jun/Developer/new/700_projects/code-office/devlog/_fin/260529_phase02_wikilinks/README.md
/Users/jun/Developer/new/700_projects/code-office/devlog/_fin/260529_phase08_hwp_editing/README.md
/Users/jun/Developer/new/700_projects/code-office/devlog/_fin/260601_wikilink_resolution_autocomplete/00_overview.md
/Users/jun/Developer/new/700_projects/code-office/devlog/_fin/260610_repo_structure_dev_skill_audit/01_plan_completion_triage.md
```

Also update self-references inside the moved baseline archive so grep does not point maintainers to the old `_plan` location.

Exception:

- Keep the `FROM devlog/_plan/260524_vscode_obsdian_baseline` wording inside this closure plan because it documents the original move source.
- The final grep should exclude `99_archive_closure_plan.md` when checking for stale `_plan` references.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/devlog/_fin/260610_repo_structure_dev_skill_audit/01_plan_completion_triage.md`

Before:

```text
| `260524_vscode_obsdian_baseline` | Historical master baseline with mixed phase snapshots and still-planned LibreOffice fallback. Keep as active/historical source until split into a dedicated baseline archive. |
```

After:

```text
| `260524_vscode_obsdian_baseline` | Historical master baseline archive moved to `_fin`; no longer an active `_plan` folder. |
```

## Verification Plan

Commands:

```text
git status --short --ignore-submodules=none
test -d /Users/jun/Developer/new/700_projects/code-office/devlog/_fin/260524_vscode_obsdian_baseline
test ! -e /Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260524_vscode_obsdian_baseline
rg -n "devlog/_plan/260524_vscode_obsdian_baseline" /Users/jun/Developer/new/700_projects/code-office --glob '!node_modules/**' --glob '!out/**' --glob '!dist/**' --glob '!**/260524_vscode_obsdian_baseline/99_archive_closure_plan.md'
git diff --check
npx tsc --noEmit
```

Expected:

- baseline folder exists only under `_fin`,
- no remaining `_plan/260524_vscode_obsdian_baseline` references outside the archive closure plan's own historical `FROM` clause,
- `260601_markdown_live_raw_mode` remains the only non-archived `_plan` folder,
- TypeScript and diff checks pass,
- commit records the archive closure.
