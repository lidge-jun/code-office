# Documentation Sync v3.7.50 — Plan

**Goal ID:** a3e159b3-e87  
**Date:** 2026-06-27  
**Package:** `code-office@3.7.50`

## Objective

Align all public documentation surfaces to the current `3.7.50` release state: finish pending structure refresh, fix stale internal structure docs, update GitHub Pages (`docs/`), README variants, and CHANGELOG.

## Work-Phase Slices (parallel tracks)

| Track | Files | Outcome |
|---|---|---|
| A — Structure (pending + P1) | `structure/00-08`, `structure/data/git-log-1000.tsv` | Commit prior refresh; fix 02/03/04/05 staleness |
| B — Public docs | `docs/ARCHITECTURE.md`, `docs/index.html` | SuperDoc theme parity, roadmap shipped markers, release trust |
| C — README + CHANGELOG | `README.md`, `README-KO.md`, `README-CN.md`, `CHANGELOG.md` | Roadmap, settings, `3.7.49`/`3.7.50` entries |

## MODIFY — Track A

### `structure/02-extension-api.md`
- ADD `code-office.docx.save` command + `Ctrl/Cmd+S` when `cweijan.docxEditor`
- FIX `vscode-office.editorTheme` enum → `Auto`, `Light`, `Solarized`
- FIX `vscode-office.editorLanguage` → add `ru_RU`, `zh_TW`
- ADD `vscode-office.pptx.conversionTimeoutMs`
- FIX Markdown dual registration (both `*.md`; distinction is default vs option)
- FIX markdown paste `when` clause

### `structure/03-hwp-subsystem.md`
- FIX `hwpSaveService.ts` line count 131 → 149
- ADD R1 re-pin decision note (target `v0.7.16`, runtime still `v0.7.13`)

### `structure/04-viewer-architecture.md`
- FIX line counts (markdownEditor 290, wikilink 120/366, markdownService 240)
- RENAME § "Planned Live Preview" → shipped/partial closure
- ADD § DOCX SuperDoc theme shell (`Word.css`, `v3.7.50` dark mode)

### `structure/05-build-release.md`
- ADD CHANGELOG ↔ `package.json` sync policy note

### Commit pending (from prior session)
- `structure/00-structure-hub.md`, `01-file-function-map.md`, `06-devlog-map.md`
- NEW `structure/08-git-commit-history.md`, `structure/data/git-log-1000.tsv`

## MODIFY — Track B

### `docs/ARCHITECTURE.md`
- ADD SuperDoc `Word.css` VS Code theme-variable shell paragraph

### `docs/index.html`
- UPDATE roadmap: mark wikilink/raw baseline shipped; add rhwp upstream + DOCX theme parity
- BUMP asset cache query `?v=20260627`

## MODIFY — Track C

### `CHANGELOG.md`
- ADD `# 3.7.50` and `# 3.7.49` entries

### `README.md` (+ KO/CN roadmap sections)
- UPDATE Roadmap: strike/shipped markers for completed phase work
- ADD DOCX theme-aware viewer note in Supported Formats or What Makes It Different

## Verification

```bash
npm run verify:hwp-compatibility   # matrix still matches 3.7.50
rg '3\.7\.49|editorTheme.*Wechat|Planned Live Preview' structure/ docs/ README.md
```

## Evidence paths

- Plan: `devlog/_plan/260627_docs_sync_v3750/00_plan.md`
- Git history: `structure/08-git-commit-history.md`
- Active chase: `devlog/_plan/260627_upstream_rhwp_chase/`
