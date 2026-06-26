---
created: 2026-06-27
updated: 2026-06-27
tags: [code-office, git, commit-history, release, upstream]
aliases: [code-office git history, code-office commit log]
---

# Git Commit History

This document summarizes the most recent **1,000 commits** in `code-office` and links to the machine-readable export used to generate it. Use it to understand era boundaries, subsystem evolution, and release cadence before searching raw `git log`.

## Scope and Methodology

| Field | Value |
|---|---|
| Repository | `code-office` (fork lineage: `cweijan/vscode-office` → `rjwang1982/vscode-office`) |
| Total commits (`HEAD`) | **1,115** (as of 2026-06-27) |
| Analysis window | Last **1,000** commits |
| Window date range | **2020-11-16** (`a862af8`) → **2026-06-27** (`fa85c81`) |
| Oldest commit in repo | `32ab17b` — 2020-09-30 — `init` (115 commits older than this window) |
| Raw export | `structure/data/git-log-1000.tsv` (`hash|date|subject`, newest first) |

### Regenerate

```bash
cd /Users/jun/Developer/new/700_projects/code-office
git log -1000 --format='%h|%ad|%s' --date=short > structure/data/git-log-1000.tsv
```

Update this document's `updated` frontmatter and the snapshot tables when regenerating after a major release or subsystem swap.

### Message Convention Eras

| Era | Approx. dates | Style | Share in window |
|---|---|---|---|
| Upstream legacy | 2020–2025 | `Version X.Y.Z`, informal English/Chinese, `Trim code` | ~71% (`other`) |
| Fork modernization | 2026-04+ | Conventional Commits `type(scope): message` | ~29% (typed) |

2026-only typed breakdown (320 commits in window): `docs` 125, `fix` 84, `chore` 33, `feat` 33, `test` 9, `ci` 8, `refactor` 3.

---

## Timeline Eras

### Era 1 — Upstream Foundation (2020–2024)

Vditor replaces StackEdit; theme and toolbar work; DOCX preview lands upstream; major version jumps to 2.x and 3.x; zip viewer added.

| Date | Hash | Milestone |
|---|---|---|
| 2020-11-30 | `ce9c809` | Init Vditor integration |
| 2021-03-11 | `77ddd9c` | Version 2.0.0 — theme integration |
| 2021-08-03 | `162ef28` | Version 2.4.0 — DOCX support |
| 2022-10-27 | `e14c01d` | Version 2.8.1 — DOCX export |
| 2023-03-29 | `8b0a536` | Version 3.0.0 |
| 2023-04-13 | `3d20863` | Zip viewer (3.1.x) |
| 2024-03 | (cluster) | 3.3.x theme/Vditor burst (~111 commits that month) |

### Era 2 — Fork Modernization (2026-04)

Rebrand to `code-office`; package slimming; Mermaid v11; Vditor fork; configurable editor modes.

| Date | Hash | Milestone |
|---|---|---|
| 2026-04-16 | `1b2a968` | Mermaid v8 → v11 |
| 2026-04-17 | `0cca231` | Remove Icon Theme + Java Decompiler (~4.4 MB) |
| 2026-04-19 | `91ed9aa` | Configurable editor mode + default preview |
| 2026-04-23 | `1eb8b22` | v3.7.1 — emoji, reload, Mermaid fix |
| 2026-04-24 | `6daeff3` | Vditor fork (`rjwang1982/vditor`) |

### Era 3 — Production-Ready Phases (2026-05)

HWP/HWPX editing, Obsidian themes, wikilink parity, dependency audit, Excel strikethrough, production gates.

| Date | Hash | Milestone |
|---|---|---|
| 2026-05-28 | `8d475dd` | HWP/HWPX via `@rhwp/editor` iframe |
| 2026-05-29 | `3048186` | Secure rhwp viewer bridge |
| 2026-05-30 | `8214d8a` | Obsidian Dark/Light themes |
| 2026-05-31 | `09321a6` | Default IR (Live Preview) mode |
| 2026-05-31 | `54e5f77` | Wikilink resolve parity + create-note |
| 2026-06-01 | `73b2651` | Wikilink authoring autocomplete |
| 2026-06-03 | `61f08c2` | HWP viewer mode integration |
| 2026-06-03 | `6ddc18f` | HWP PDF export (native rhwp) |

Devlog closure: `devlog/_fin/260529_phase08_hwp_editing`, `260531_production_ready_phase_completion`, and related phase folders — see `[[06-devlog-map]]`.

### Era 4 — Office Format Rewrite (2026-06 early)

Dedicated DOCX/PPTX providers; eigenpal DOCX editor; pptx-renderer; CustomEditorProvider save lifecycle.

| Date | Hash | Milestone |
|---|---|---|
| 2026-06-05 | `f6e3bf4` | eigenpal/docx-editor replaces docx-preview |
| 2026-06-05 | `2c9d959` | pptx-renderer replaces cheerio |
| 2026-06-05 | `3fe4a4a` | DOCX CustomEditorProvider save lifecycle |
| 2026-06-08 | `bf436d0` | PowerPoint-like PPTX viewer panes/modes |

Devlog closure: `devlog/_fin/260607_docx_pptx_merge_readiness`, `260608_docx_viewer_first_repair`.

### Era 5 — SuperDoc, Release Trust, Stabilization (2026-06 mid–late)

AGPL SuperDoc migration; structure audit; GitHub Release artifact trust; accelerated 3.7.x releases; post-release rhwp parity chase.

| Date | Hash | Milestone |
|---|---|---|
| 2026-06-09 | `7b7e3ea` | Replace DOCX surface with SuperDoc (AGPL) |
| 2026-06-10 | `715e06d` | Structure docs refresh + audit drift resolution |
| 2026-06-11 | `ba4db08` | Release artifact trust gate |
| 2026-06-11 | `87b214f` | v3.7.49 |
| 2026-06-27 | `5d4869e` | SuperDoc viewer dark mode (VS Code theme vars) |
| 2026-06-27 | `60b1650` | v3.7.50 |
| 2026-06-27 | `fa85c81` | HWP compatibility matrix scoped to 3.7.50 |

Devlog closure: `devlog/_fin/260609_superdoc_agpl_migration`, `260611_competitive_release_trust_plan`, `260611_post_release_stabilization`. Active chase: `devlog/_plan/260627_upstream_rhwp_chase/`.

---

## Commits by Month (window)

| Month | Count | Notes |
|---|---:|---|
| 2026-06 | 193 | SuperDoc, release trust, structure audit, v3.7.47–3.7.50 |
| 2026-05 | 87 | HWP, wikilinks, Obsidian themes, production phases |
| 2026-04 | 40 | Fork modernization, Mermaid v11 |
| 2024-03 | 111 | Upstream 3.3.x burst |
| 2022-10 | 63 | Vditor upgrades, 2.7.x–2.9.x |

June 2026 alone accounts for ~19% of the entire 1,000-commit window.

---

## Subsystem Touch Count (overlapping tags)

Approximate commit counts when classifying subjects by keyword (one commit may match multiple tags):

| Subsystem | ~Count | Current structure doc |
|---|---:|---|
| release/version | 153 | `[[05-build-release]]` |
| markdown/wikilink | 111 | `[[04-viewer-architecture]]`, `07-wikilink-authoring-autocomplete-research.md` |
| docx | 78 | `[[04-viewer-architecture]]` |
| hwp/rhwp | 37 | `[[03-hwp-subsystem]]` |
| pptx | 35 | `[[04-viewer-architecture]]` |
| build/ci | 32 | `[[05-build-release]]` |
| structure/docs/devlog | 87 | `[[06-devlog-map]]`, hub |

DOCX evolution in three generations within three weeks: eigenpal (`f6e3bf4`, Jun 5) → viewer-first repairs (Jun 8) → SuperDoc (`7b7e3ea`, Jun 9). Document SuperDoc as current in `04-viewer-architecture.md`; eigenpal is superseded.

---

## Version Release Map (code-office fork, 2026)

| Version | Date | Hash | Headline |
|---|---|---|---|
| 3.7.6 | 2026-05-30 | `abf0ea9` | Production-ready phase baseline |
| 3.7.7 | 2026-05-31 | `49e2b86` | Post phase-06 dependency work |
| 3.7.8 | 2026-06-01 | `74c17f3` | Wikilink authoring ship |
| 3.7.11 | 2026-06-01 | `93e46b6` | Marketplace publisher restore |
| 3.7.47 | 2026-06-08 | `a188d2a` | DOCX/PPTX provider rewrite tail |
| 3.7.48 | 2026-06-10 | `bd71481` | Structure audit + SuperDoc guards |
| 3.7.49 | 2026-06-11 | `87b214f` | Release trust + registry publish |
| **3.7.50** | **2026-06-27** | `60b1650` | SuperDoc dark mode + compatibility matrix |

Release cadence accelerated sharply May–June 2026 (8 tagged releases in ~4 weeks).

Legacy upstream `Version X.Y.Z` commits continue through 3.5.x in the same window (`788e5ef` 3.5.0, 2025-01-14).

---

## Devlog ↔ Commit Correlation

| Devlog folder | Representative commits | Status |
|---|---|---|
| `260609_superdoc_agpl_migration` | `7b7e3ea` cluster (Jun 9) | `_fin` |
| `260611_competitive_release_trust_plan` | `ba4db08`, `87b214f` | `_fin` (extended by `v3.7.50`) |
| `260611_post_release_stabilization` | `8f563c0`, `40d4b8e` | `_fin` |
| `260627_upstream_rhwp_chase` | `4ec69c4`, `5d4869e`, `fa85c81` | `_plan` active |

When closing a devlog folder, add milestone hashes to its `00_overview.md` or verification record for traceability.

---

## Maintenance Notes

Update this document when:

- A `chore(release)` or `v*.*.*` tag ships
- A subsystem is replaced (e.g., DOCX renderer swap)
- Commit message conventions change
- The 1,000-commit window crosses a major era boundary

Cross-references to refresh alongside this doc: `[[00-structure-hub]]` snapshot note, `[[06-devlog-map]]` `_plan`/`_fin` tables, `[[05-build-release]]` release gate section.
