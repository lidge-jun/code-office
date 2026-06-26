---
created: 2026-05-30
updated: 2026-06-27
tags: [code-office, devlog, roadmap, archive, jawdev]
aliases: [code-office devlog map, code-office roadmap]
---

# Devlog Map

This document explains the current `devlog/` folder structure and how to interpret active plans, completed archives, and historical baseline records.

## Folder Structure

```text
devlog/
├── AGENTS.md
├── _plan/   Active, blocked, pending, or current audit folders
└── _fin/    Completed phase summaries, completed audits, and superseded implementation records
```

`devlog/_plan/` should stay small enough that a maintainer can identify the currently actionable work without reading every historical phase. Completed or superseded work moves to `devlog/_fin/` with the original evidence preserved.

## Naming Convention

Plan folders use the `YYMMDD_<slug>` convention.

```text
devlog/_fin/260610_repo_structure_dev_skill_audit/
              │       └── descriptive slug
              └── date: 2026-06-10
```

Within a plan directory, files use numeric prefixes:

| Prefix | Purpose |
|---|---|
| `00_*` | Overview, scope, success criteria, or research entry point. |
| `01_*` through `89_*` | Phase records, implementation notes, verification records. |
| `90_*` and above | Research appendices, audits, follow-up backlog, snapshots. |

Avoid bare `PLAN.md`, `PHASES.md`, `RCA.md`, and similarly generic filenames. Use a numbered file with a specific title.

## Current `_plan` Folders

As of 2026-06-27, `_plan` contains active, blocked, pending, or current audit folders:

| Folder | Status |
|---|---|
| `260601_markdown_live_raw_mode` | Raw/live source mode largely shipped in code (`live-raw.js`, `raw` in `editorMode`); closure record not yet moved to `_fin`. |
| `260603_hwp_viewer_mode` | **Stale stub** — empty except `screenshots/`; full closure is in `_fin/260603_hwp_viewer_mode`. Candidate for cleanup. |
| `260609_docx_word_parity` | **Stale stub** — only `fixtures.local.generated.md`; research superseded by SuperDoc migration (`_fin/260609_docx_word_parity`). |
| `260609_superdoc_agpl_migration` | **Stale stub** — only `artifacts/`; closure is in `_fin/260609_superdoc_agpl_migration`. |
| `260627_upstream_rhwp_chase` | **Active** — rhwp gap analysis, R1 re-pin decision (`v0.7.16`), S1 SuperDoc dark mode shipped (`5d4869e`, `v3.7.50`); R2 rhwp re-pin execution pending. |

## Current `_fin` Folders

Completed or superseded records now live in `_fin`:

| Folder | Meaning |
|---|---|
| `260524_vscode_obsdian_baseline` | Historical master baseline archive for the original vscode_obsdian/code-office direction lock and phase research bundle. |
| `260529_phase01_rebrand_and_attribution` | Rebrand and attribution closure. |
| `260530_legacy_cleanup` | Legacy cleanup re-audit and stale-reference closure. |
| `260529_phase02_wikilinks` | Initial wikilink phase closure. |
| `260529_phase08_hwp_editing` | Initial HWP editing closure. |
| `260531_ir_mode_wikilink_index_click_fix` | IR-mode wikilink click/index fix closure. |
| `260531_phase03_click_link_correctness` | Wikilink click correctness plan, later verified by production gates. |
| `260531_phase04_pptx_preview_closure` | PPTX preview closure, later verified by production gates. |
| `260531_phase05_markdown_cjk_inline_formatting` | Markdown CJK inline formatting closure. |
| `260531_phase06_1_dependency_audit_closure` | Dependency audit closure. |
| `260531_phase06_2_dependency_major_upgrades` | Dependency major-upgrade closure. |
| `260531_phase06_excel_strikethrough_preservation` | Excel strikethrough preservation closure. |
| `260531_production_ready_phase_completion` | Production-ready phase completion evidence. |
| `260603_hwp_viewer_mode` | HWP/HWPX Viewer/Editor mode implementation and verification. |
| `260604_release_preflight_audit` | Release preflight audit closure. |
| `260604_release_registry_publish` | Release registry publish evidence. |
| `260604_wikilink_source_transaction` | Wikilink source-transaction research, superseded by later authoring QA. |
| `260605_docx_pptx_upgrade_research` | Initial DOCX/PPTX branch research, superseded by merge-readiness and later product decisions. |
| `260605_markdown_wikilink_cache` | Markdown wikilink cache hot-path fix closure. |
| `260607_cross_branch_audit_research` | Completed cross-branch read-only audit. |
| `260607_docx_pptx_merge_readiness` | DOCX/PPTX merge-readiness and PPTX viewer UX closure. |
| `260608_markdown_wikilink_obsidian_qa` | Markdown wikilink Obsidian-style autocomplete QA hardening closure. |
| `260601_wikilink_resolution_autocomplete` | Long-running wikilink authoring/autocomplete history, superseded by the Markdown wikilink Obsidian QA closure. |
| `260604_wikilink_basic_resolution_stabilization` | Production-baseline wikilink stabilization decision, superseded by later authoring/runtime QA. |
| `260608_docx_viewer_first_repair` | Early DOCX viewer-first/eigenpal repair record, superseded by the SuperDoc DOCX integration while preserving the stable-view lesson. |
| `260609_docx_word_parity` | DOCX Word/eigenpal/SuperDoc comparison research, superseded by the product SuperDoc AGPL migration path. |
| `260609_superdoc_agpl_migration` | SuperDoc AGPL DOCX integration, VSIX packaging, and same-window Computer Use View/Edit/Cmd+S runtime QA closure. |
| `260610_repo_structure_dev_skill_audit` | Repository structure/dev-skill audit, 03-series structure execution, and DOCX E2E review gate closure. |
| `260611_competitive_release_trust_plan` | Competitive positioning and release-trust plan closed by `v3.7.49` GitHub Release; extended by `v3.7.50` compatibility matrix scope (`fa85c81`) and SuperDoc dark mode. |
| `260611_post_release_stabilization` | Six-track post-release stabilization closure covering release artifact reuse, Node 24 action migration, completed-plan closure, HWP/HWPX fixture manifest verification, HWP/rhwp module-boundary cleanup, DOCX/SuperDoc failure-state assertions, Computer Use evidence, and employee audits. |

## Completion Flow

When a plan is implemented, verified, and no longer the active work surface:

1. Keep its files intact.
2. Move the whole `devlog/_plan/YYMMDD_slug/` directory to `devlog/_fin/YYMMDD_slug/`.
3. Update this document's `_plan` and `_fin` tables.
4. Update `structure/00-structure-hub.md` or other structure docs only when the code architecture or source-of-truth map changed.

Do not move a folder just because it is old. Leave it in `_plan` if it still contains pending runtime verification, blocked QA, or current decision-making context.

## Related Documents

| Document | Location | Purpose |
|---|---|---|
| `structure/direction.md` | `structure/` | Product identity, priorities, non-goals. |
| `structure/roadmap.md` | `structure/` | Implementation order and completion criteria. |
| `structure/00-structure-hub.md` | `structure/` | Codebase architecture entry point. |
| `CHANGELOG.md` | Root | User-facing change history. |
| `08-git-commit-history.md` | `structure/` | Last 1,000 commits: eras, releases, devlog correlation. |
| `structure/data/git-log-1000.tsv` | `structure/data/` | Machine-readable `hash|date|subject` export (newest first). |
