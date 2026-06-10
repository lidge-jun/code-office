# Plan Completion Triage

Date: 2026-06-10

## Decision Standard

A plan folder was moved from `_plan` to `_fin` only when one of these was true:

- The folder itself records final PASS / mergeability / release evidence.
- A later folder clearly supersedes and completes the original implementation path.
- The folder is a completed read-only audit/research artifact with findings recorded, even if the findings created later work.

Folders with active blockers, pending fixture matrices, or open runtime follow-up stayed in `_plan`.

## Moved To `_fin`

| Folder | Reason |
|---|---|
| `260531_phase03_click_link_correctness` | Phase 3 correctness was later verified by production-ready and Markdown test gates. |
| `260531_phase04_pptx_preview_closure` | Phase 4 preview closure was later covered by production-ready and PPTX phase gates. |
| `260531_production_ready_phase_completion` | Records PASS for phase 3/4/5/6, HWP hardening, build, and package evidence. |
| `260603_hwp_viewer_mode` | Records HWP Viewer/Editor implementation and build/package evidence. |
| `260604_release_preflight_audit` | Release preflight verification records PASS gates and browser smoke evidence. |
| `260604_release_registry_publish` | Release registry publish evidence records local release and package gates. |
| `260604_wikilink_source_transaction` | Source-transaction research and runtime evidence were superseded by later Markdown authoring QA. |
| `260605_docx_pptx_upgrade_research` | Initial DOCX/PPTX branch implementation research was superseded by merge-readiness and later product decisions. |
| `260605_markdown_wikilink_cache` | Verification records Markdown cache hot-path fix, full gates, VSIX install, and Computer Use smoke. |
| `260607_cross_branch_audit_research` | Read-only cross-branch audit completed and recorded branch risks that later plans acted on. |
| `260607_docx_pptx_merge_readiness` | Records automated gates, GUI smoke, and conflict-free mergeability evidence. |
| `260608_markdown_wikilink_obsidian_qa` | Records PASS for wikilink authoring, resolver, Markdown CI, build, typecheck, release gate, employee review, and runtime QA. |

## Retained In `_plan`

| Folder | Reason |
|---|---|
| `260524_vscode_obsdian_baseline` | Historical master baseline with mixed phase snapshots and still-planned LibreOffice fallback. Keep as active/historical source until split into a dedicated baseline archive. |
| `260530_legacy_cleanup` | Old cleanup plan still describes stale/tracked cleanup work and should be revalidated before archive. |
| `260601_markdown_live_raw_mode` | Planning-only folder without a local final verification record in the folder. |
| `260601_wikilink_resolution_autocomplete` | Long-running wikilink authoring history includes repeated failed runtime versions; keep until summarized into a final closure record. |
| `260604_wikilink_basic_resolution_stabilization` | Main/dev-branch stabilization decision remains useful context for wikilink authoring boundaries. |
| `260608_docx_viewer_first_repair` | Early DOCX viewer-first repair is superseded by SuperDoc work but still has follow-up QA wording; keep until summarized. |
| `260609_docx_word_parity` | Fixture matrix still contains pending rows for multiple fixtures. |
| `260609_superdoc_agpl_migration` | Active DOCX SuperDoc integration log still records recent save/layout follow-ups and should remain open until a final runtime closure doc is added. |

## Later Archived

| Folder | Reason |
|---|---|
| `260610_repo_structure_dev_skill_audit` | Later completed by the 03-series structure execution, verification matrix, Computer Use DOCX E2E clearance, and independent review PASS. |

## Resulting Shape

`_plan` now contains active, blocked, pending, or current audit folders only.

`_fin` now contains completed phase summaries, completed audits, and completed/superseded implementation records.
