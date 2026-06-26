---
created: 2026-06-27
tags: [code-office, upstream, rhwp, dark-mode, viewer-parity, chase]
---
# Upstream / rhwp Parity Chase Backlog

## Context

`upstream` (`rjwang1982/vscode-office`) is already fully merged into `main`
(`git rev-list --count main..upstream/main` = `0` as of 2026-06-27). So the
remaining "chase" work is **not** un-merged upstream commits — it is forward
parity and integration-quality gaps that opened after the DOCX engine was
replaced with SuperDoc, measured against the smoothness bar of the rhwp HWP
viewer integration.

The headline gap is **dark mode**: the new SuperDoc DOCX viewer does not follow
the VS Code color theme, while the older HWP and Image viewers already do.

## Findings (current state, with evidence)

| Area | Current state | Evidence |
| --- | --- | --- |
| DOCX/SuperDoc viewer colors | Hardcoded light hex throughout (`#eef1f5`, `#ffffff`, `#dfe4ea`, `#f3f2f1`, `#fff8e6`, `#fff7f7`); no `var(--vscode-*)` | `src/react/view/word/Word.css` |
| HWP / Image viewers | Already consume VS Code CSS variables (`var(--vscode-*)`) and adapt to theme | `src/react/view/hwp/Hwp.less`, `src/react/view/image/Image.less`, `src/vscode.css` |
| Runtime theme reactivity | No `ColorThemeKind` / `onDidChangeActiveColorTheme` detection anywhere in the extension; nothing re-emits theme to webviews on switch | `git grep -nE 'ColorThemeKind|onDidChangeActiveColorTheme'` → no matches (excl. `vditor`) |
| SuperDoc injected stylesheet | `@superdoc-dev/react/style.css` imported globally; light-surface assumptions not yet audited or scoped | `src/react/view/word/Word.tsx:4`, `src/react/view/word/SuperDocSurface.tsx` |
| Markdown editor theme | Own picker (`One Dark`, `Obsidian Dark`, `Github Dark`, …) via vditor; decoupled from VS Code theme kind | `src/provider/markdownEditorProvider.ts:233-250`, `theme/` |

## Chase Backlog

| ID | Item | Target | Priority |
| --- | --- | --- | --- |
| C1 | **DOCX/SuperDoc dark mode.** Replace hardcoded `Word.css` colors with `var(--vscode-*)` so chrome, toolbar, empty/loading/error states follow the theme. The document page surface may stay paper-white (Word-like), but the framing must adapt. | Parity with HWP/Image viewers | High (user-named) |
| C2 | **Runtime theme reactivity.** Rely on the webview's automatic `vscode-dark`/`vscode-light` body class + `--vscode-*` vars so a live theme switch re-paints without reload; optionally subscribe to `onDidChangeActiveColorTheme` and notify the webview where vars are insufficient. | Live switch, no reload | High (enables C1) |
| C3 | **Audit `@superdoc-dev/react/style.css`.** Confirm whether SuperDoc hardcodes light surfaces; scope dark overrides without breaking document rendering. | Correct C1 without regressions | High (C1 blocker) |
| C4 | **Viewer parity sweep.** Verify PPTX/XLSX viewers honor theme vars like HWP/Image; document any that do not. | Consistent dark treatment across all viewers | Medium |
| C5 | **Markdown editorTheme ↔ VS Code kind.** Consider auto-mapping the default `editorTheme` to the active `ColorThemeKind` so first open matches the IDE theme instead of a fixed default. | First-open theme match | Medium |
| C6 | **rhwp smoothness residue.** Mode-switch flicker is already resolved (SuperDoc migration). Remaining rhwp-level polish is dark mode (C1-C3) plus `DocxModeToolbar` visual consistency in both themes. | rhwp-grade integration feel | Tracked |

## Non-goals (this record)

- This is a tracking/record document only. No code changes are made here.
- Not re-syncing upstream commits — `upstream/main` is already contained in `main`.

## Next

- Promote C1-C3 into a PABCD pass (dark mode for the DOCX/SuperDoc viewer) when
  scheduled; verification must include Computer Use screenshots in both VS Code
  light and dark themes before close.
- Cross-link to `[[04-viewer-architecture]]` when the parity sweep (C4) starts.
