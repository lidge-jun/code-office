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
│   └── 260524_vscode_obsdian_baseline/
│       ├── 00_overview.md
│       ├── 01_phase_01_rebrand_and_attribution.md
│       ├── 02_phase_02_obsidian_closest_wikilinks.md
│       ├── ...
│       ├── 08.2g_phase_08_hwp_lifecycle_hardening_completion.md
│       ├── 90_research_grok_expert.md
│       ├── ...
│       └── README.md
├── _fin/                  Completed devlogs (currently empty, .gitkeep)
│   └── .gitkeep
└── str_func/              Legacy structure-function crosswalk
    └── AGENTS.md
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

## Active Plan: `260524_vscode_obsdian_baseline`

This is the master implementation plan created on 2026-05-24 when the project was still named `vscode_obsdian`. It covers the full roadmap from rebrand through HWP hardening.

### Phase Status (as of 2026-05-30)

| Phase | File | Title | Status |
|---|---|---|---|
| 1 | `01_phase_01_rebrand_and_attribution.md` | Rebrand & Attribution | **Done** — shipped as `code-office@3.7.5` |
| 2 | `02_phase_02_obsidian_closest_wikilinks.md` | Obsidian-style Wikilinks | **Done** — completion + link providers shipped |
| 3 | `03_phase_03_wikilink_webview_export.md` | Wikilink WebView & Export | Planned |
| 4 | `04_phase_04_pptx_support.md` | PPTX Slide Preview | Planned |
| 5 | `05_phase_05_markdown_cjk_inline_formatting.md` | Markdown CJK Formatting | Planned |
| 6 | `06_phase_06_excel_strikethrough_preservation.md` | Excel Strikethrough | Planned |
| 7 | `07_phase_07_libreoffice_fallback.md` | LibreOffice Fallback | Planned |
| 8 | `08_phase_08_hwp_hwpx_native_support.md` | HWP/HWPX Native Support | **Done** — full editing + security hardening |
| 8.2 | `08.2_*` through `08.2g_*` | HWP Security & Lifecycle Recovery | **Done** — atomic write, magic validation, bridge |

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
| `DEVELOPMENT_LOG.md` | Root | Legacy development notes from upstream |
