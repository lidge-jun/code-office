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
