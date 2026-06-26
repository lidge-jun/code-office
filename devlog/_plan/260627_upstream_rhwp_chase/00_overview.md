---
created: 2026-06-27
tags: [code-office, rhwp, superdoc, upstream, dark-mode, viewer-parity, chase]
---
# Upstream Chase Backlog — rhwp & SuperDoc

`code-office` tracks **three** upstreams. This document records how far each has
been followed and the forward parity work still owed.

| Upstream | Role | How tracked | State (2026-06-27) |
| --- | --- | --- | --- |
| `rjwang1982/vscode-office` | Base fork (office/markdown/DOCX-host shell) | git remote `upstream` | **Fully merged** — `main..upstream/main` = 0 |
| `edwardkim/rhwp` | HWP/HWPX engine (Rust+WASM, MIT) | Vendored local build, pinned in `vendor/rhwp-studio-dist/VERSION.md` | **Behind** — pinned `v0.7.13`, latest `v0.7.17` |
| `superdoc` (Harbour Enterprises) | DOCX render/edit engine (AGPLv3/commercial) | npm pin `superdoc@1.39.0`, `@superdoc-dev/react@^1.10.0` | Current pin; parity gaps below |

---

## 1. rhwp commit gap (core ask)

The HWP runtime is a vendored local build of `edwardkim/rhwp`, not a live pull.
`vendor/rhwp-studio-dist/VERSION.md` is the source of truth; `resource/rhwp-studio`
is the packaged bundle.

| Field | Value |
| --- | --- |
| Pinned base tag | `v0.7.13` |
| Pinned base commit | `b3e16ef212af81ef37d973ddb86d6816d3804642` (tagged 2026-05-26) |
| Local patch | `f887dca…` — find-dialog Enter capture (upstream PR #1281) |
| Wrapper ref | `@rhwp/editor@0.7.13` |
| Vendored/built | 2026-06-03 |

**Gap (assessed via `gh api repos/edwardkim/rhwp/compare/...`, 2026-06-27):**

- Latest release **`v0.7.17`** (2026-06-22) → behind by **4 releases**:
  `v0.7.14` (06-04), `v0.7.15` (06-06), `v0.7.16` (06-19), `v0.7.17` (06-22).
- Release-tag gap `v0.7.13...v0.7.17` = **1387 commits**.
- Default-branch gap from pinned base = **1455 commits** (0 behind, purely ahead).
- Visible upstream theme since `v0.7.13`: text/glyph rendering correctness
  (font-proof gates). Needs a real changelog read before any re-pin decision.

| ID | Item | Target | Priority |
| --- | --- | --- | --- |
| R1 | Decide whether to re-pin rhwp to `v0.7.17` (or hold at `v0.7.13`). Read the `v0.7.13...v0.7.17` changelog for save/export/render regressions vs fixes. (Playbook §2.) | Informed re-pin decision | High |
| R2 | If re-pinning: rebuild per `VERSION.md` build commands, re-apply the find-dialog patch, refresh `vendor/rhwp-studio-dist/VERSION.md` + `structure/03` table, re-run HWP/HWPX compatibility matrix. (Playbook §3-§4.) | Clean, verified re-pin | Follows R1 |

> **How to execute R1/R2:** the full step-by-step procedure is in
> [[10_rhwp_catchup_playbook]] (gap detection, re-pin decision criteria,
> rebuild + verify, tracking cadence, rollback).
> Structure record of the current follow-point lives in
> `structure/03-hwp-subsystem.md` → "rhwp Upstream Tracking".

---

## 2. SuperDoc (DOCX) parity

SuperDoc replaced `docx-preview`. These are parity/quality gaps measured against
the smoothness of the rhwp HWP viewer integration. The headline is **dark mode**.

Findings (with evidence):

| Area | Current state | Evidence |
| --- | --- | --- |
| DOCX viewer colors | Hardcoded light hex (`#eef1f5`, `#ffffff`, `#dfe4ea`, `#f3f2f1`, `#fff8e6`, `#fff7f7`); no `var(--vscode-*)` | `src/react/view/word/Word.css` |
| HWP / Image viewers | Already consume `var(--vscode-*)` and adapt to theme | `src/react/view/hwp/Hwp.less`, `src/react/view/image/Image.less`, `src/vscode.css` |
| Runtime theme reactivity | No `ColorThemeKind` / `onDidChangeActiveColorTheme` detection anywhere | `git grep` → no matches (excl. `vditor`) |
| SuperDoc stylesheet | `@superdoc-dev/react/style.css` imported globally; light-surface assumptions not audited | `src/react/view/word/Word.tsx:4`, `SuperDocSurface.tsx` |
| Markdown editor theme | Own picker (One Dark / Obsidian Dark / Github Dark) via vditor; decoupled from VS Code kind | `src/provider/markdownEditorProvider.ts:233-250`, `theme/` |

| ID | Item | Target | Priority |
| --- | --- | --- | --- |
| S1 | **DOCX dark mode.** Replace hardcoded `Word.css` colors with `var(--vscode-*)` so chrome/toolbar/empty/loading/error states follow the theme. Page surface may stay paper-white (Word-like); framing must adapt. | Parity with HWP/Image | High (user-named) |
| S2 | **Runtime theme reactivity.** Lean on the webview's `vscode-dark`/`vscode-light` body class + vars so live theme switch re-paints without reload; subscribe to `onDidChangeActiveColorTheme` only where vars fall short. | Live switch, no reload | High |
| S3 | **Audit `@superdoc-dev/react/style.css`.** Confirm/scope dark overrides without breaking document rendering. | Correct S1 with no regressions | High (S1 blocker) |
| S4 | **Viewer parity sweep.** Verify PPTX/XLSX viewers honor theme vars like HWP/Image; document any that do not. | Consistent dark treatment | Medium |
| S5 | **Markdown editorTheme ↔ VS Code kind.** Auto-map default `editorTheme` to active `ColorThemeKind` so first open matches the IDE theme. | First-open theme match | Medium |
| S6 | **rhwp-grade smoothness residue.** Mode-switch flicker already resolved; remaining polish is dark mode (S1-S3) + `DocxModeToolbar` consistency in both themes. | rhwp-grade feel | Tracked |

> SuperDoc itself is at the current npm pin (`superdoc@1.39.0`). No upstream
> SuperDoc version gap is owed right now; revisit when a new minor ships.

---

## Non-goals (this record)

- Tracking/record only — no code or re-pin changes are made here.
- `upstream/main` (vscode-office) is already contained in `main`; nothing to re-sync there.

## Next

- R1 (read rhwp `v0.7.13...v0.7.17` changelog) and S1-S3 (DOCX dark mode) are the
  first candidates to promote into PABCD passes.
- DOCX dark mode close gate must include Computer Use screenshots in **both** VS
  Code light and dark themes.
- Cross-link to `[[04-viewer-architecture]]` when the parity sweep (S4) starts.
