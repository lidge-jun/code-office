---
created: 2026-05-30
tags: [code-office, devlog, roadmap, archive, jawdev]
aliases: [code-office devlog map, code-office roadmap]
---

# Devlog Map

This document explains the `devlog/` folder structure, how to interpret plan and archive documents, and how the devlog relates to the roadmap in `structure/direction.md` and `structure/roadmap.md`.

---

## Folder Structure

```
devlog/
├── AGENTS.md              Codex/Copilot agent instructions for devlog work
├── _plan/                 Active and historical implementation plans
│   ├── 260524_vscode_obsdian_baseline/
│       ├── 00_overview.md
│       ├── 01_phase_01_rebrand_and_attribution.md
│       ├── 02_phase_02_obsidian_closest_wikilinks.md
│       ├── ...
│       ├── 08.2g_phase_08_hwp_lifecycle_hardening_completion.md
│       ├── 90_research_grok_expert.md
│       ├── ...
│       └── README.md
│   ├── 260603_hwp_viewer_mode/
│   │   ├── 00_overview.md
│   │   ├── 01_phase_01_host_mode_bridge.md
│   │   ├── 02_phase_02_webview_runtime.md
│   │   ├── 03_phase_03_features_docs_verification.md
│   │   ├── 04_build_evidence.md
│   │   ├── 05_find_shortcut_evidence.md
│   │   ├── 06_viewer_search_highlight_evidence.md
│   │   └── 90_research_rhwp_vscode_surface.md
│   └── 260604_release_preflight_audit/
│       └── 00_overview.md
└── _fin/                  Completed phase summaries
    ├── 260529_phase01_rebrand_and_attribution/
    ├── 260529_phase02_wikilinks/
    └── 260529_phase08_hwp_editing/
```

## Naming Convention (Jawdev)

Plans follow the `YYMMDD_<slug>` directory convention:

```
devlog/_plan/260524_vscode_obsdian_baseline/
                │       └── descriptive slug
                └── date: 2026-05-24
```

Within a plan directory, files use the numbered Jawdev convention:

| Prefix | Purpose |
|---|---|
| `00_overview.md` | Plan summary, scope, success criteria |
| `01_phase_01_*.md` | First implementation phase |
| `02_phase_02_*.md` | Second implementation phase |
| `08.2a_*`, `08.2b_*` | Sub-phases (iterative refinement) |
| `90_research_*.md` | Research notes and investigations |
| `95_*`, `96_*` | Appendices (direction lock, rebrand analysis) |
| `97_*`, `98_*` | Snapshots (baseline import, dependency audit) |
| `README.md` | Plan directory index |

## Current Active Plan: `260604_release_preflight_audit`

This plan audits the release surface after the recent HWP/HWPX viewer, PDF, and find commits. It covers documentation freshness, cross-platform packaging risk, GitHub Pages content, README coverage, and structure document currency.

## Recent Implementation Plan: `260603_hwp_viewer_mode`

This plan records the HWP/HWPX internal Viewer/Editor mode implementation and follow-up fixes:

| File | Topic |
|---|---|
| `00_overview.md` | Goal, success criteria, and evidence bundle for HWP Viewer/Editor integration |
| `01_phase_01_host_mode_bridge.md` | Host-side mode state, last-mode persistence, and save-then-view gating |
| `02_phase_02_webview_runtime.md` | React Viewer/Editor runtime, secure bridge, Viewer rendering |
| `03_phase_03_features_docs_verification.md` | SVG export, debug overlay, paragraph dump, docs, strict verification |
| `04_build_evidence.md` | Build, package, VSIX, and VS Code Insiders evidence |
| `05_find_shortcut_evidence.md` | HWP Viewer/Editor `Cmd+F` / `Ctrl+F` shortcut routing evidence |
| `06_viewer_search_highlight_evidence.md` | Viewer search SVG text highlight and active-hit navigation evidence |
| `90_research_rhwp_vscode_surface.md` | rhwp-vscode surface research and vendoring rationale |

## Baseline Plan: `260524_vscode_obsdian_baseline`

This is the master implementation plan created on 2026-05-24 when the project was still named `vscode_obsdian`. It covers the full roadmap from rebrand through HWP hardening.

### Phase Status (as of 2026-06-04)

| Phase | File | Title | Status |
|---|---|---|---|
| 1 | `01_phase_01_rebrand_and_attribution.md` | Rebrand & Attribution | **Done** — shipped in the `code-office` line |
| 2 | `02_phase_02_obsidian_closest_wikilinks.md` | Obsidian-style Wikilinks | **Done** — completion + link providers shipped |
| 3 | `03_phase_03_wikilink_webview_export.md` | Wikilink WebView & Export | **Done** — parser/resolver/live rendering/autocomplete work tracked in later 260601 plans |
| 4 | `04_phase_04_pptx_support.md` | PPTX Viewer | **Superseded** — current PowerPoint-like read-only PPTX viewer and DOCX/PPTX merge readiness are tracked in `devlog/_plan/260607_docx_pptx_merge_readiness/` |
| 5 | `05_phase_05_markdown_cjk_inline_formatting.md` | Markdown CJK Formatting | **Done** — Markdown live/raw and CJK regression work tracked in 260531/260601 plans |
| 6 | `06_phase_06_excel_strikethrough_preservation.md` | Excel Strikethrough | **Done** — Excel strikethrough regression covered by `test:excel-phase6` |
| 7 | `07_phase_07_libreoffice_fallback.md` | LibreOffice Fallback | Planned |
| 8 | `08_phase_08_hwp_hwpx_native_support.md` | HWP/HWPX Native Support | **Done** — full editing + security hardening |
| 8.2 | `08.2_*` through `08.2g_*` | HWP Security & Lifecycle Recovery | **Done** — atomic write, magic validation, bridge |
| 8.3 | `../260603_hwp_viewer_mode/*` | HWP Viewer/Editor Mode | **Done pending release audit** — Viewer default, last mode, native-first PDF, find routing/highlight |

### Research Notes (90-series)

| File | Topic |
|---|---|
| `90_research_grok_expert.md` | Grok-based expert analysis |
| `91_research_comparable_repos.md` | Competing extensions analysis |
| `92_research_wikilink_deep_dive.md` | Obsidian-style wikilink implementation options |
| `93_research_pptx_deep_dive.md` | PPTX rendering approaches |
| `94_research_strikethrough_deep_dive.md` | Excel strikethrough preservation |
| `95_research_rebrand_distribution.md` | Rebrand and distribution strategy |

### Appendices (96-98 series)

| File | Purpose |
|---|---|
| `96_appendix_direction_and_roadmap_lock.md` | Direction freeze record |
| `97_baseline_import_snapshot.md` | Initial codebase snapshot at fork time |
| `98_dependency_audit_snapshot.md` | npm audit results at baseline |

## Completion Flow

When a phase is fully implemented, verified, and merged:

1. Move the phase's plan file(s) to `devlog/_fin/YYMMDD_<slug>/`
2. Create a `README.md` in the `_fin/` directory summarizing what was done
3. Update phase status in this document
4. Update `structure/roadmap.md` if the roadmap needs adjustment

Currently `_fin/` is empty because all completed phases were done within the baseline plan and tracked via sub-phase files (08.2a through 08.2g) rather than moved.

## Related Documents

| Document | Location | Purpose |
|---|---|---|
| `structure/direction.md` | `structure/` | Product identity, priorities, non-goals |
| `structure/roadmap.md` | `structure/` | Implementation order and completion criteria |
| `structure/00-structure-hub.md` | `structure/` | Codebase architecture entry point |
| `CHANGELOG.md` | Root | User-facing change history |
