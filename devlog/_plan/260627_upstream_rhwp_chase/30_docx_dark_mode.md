---
created: 2026-06-27
tags: [code-office, superdoc, docx, dark-mode, theme, viewer-parity]
---
# DOCX SuperDoc Dark Mode (chase item S1)

Closes backlog item **S1** ([[00_overview]] §2). Makes the DOCX SuperDoc viewer
chrome follow the VS Code color theme, matching the HWP/Image viewer parity. The
document page surface stays paper-white (Word-like) by design.

## Change

Single file: `src/react/view/word/Word.css`. Every hardcoded chrome color is
replaced with `var(--vscode-*, <previous-hex>)` so a VS Code dark theme is picked
up automatically (the webview gets the `vscode-dark` body class + `--vscode-*`
vars), while light/absent vars fall back to the exact previous appearance.

| Surface | Was | Now |
| --- | --- | --- |
| shell bg / text | `#eef1f5` / `#1f2328` | `editor-background` / `editor-foreground` |
| toolbar bg / border | `#ffffff` / `#d7dde5` | `sideBar-background` / `panel-border` |
| meta text | `#667085` | `descriptionForeground` |
| warning banner | `#fff8e6` / `#f0c36d` / `#6b4e00` | `inputValidation-warningBackground` / `…-warningBorder` / `editorWarning-foreground` |
| backdrop (container, viewer, editor) | `#dfe4ea` / `#f3f2f1` | `editor-background` |
| status pill | white / `#57606a` / `#d0d7de` / shadow | `editorWidget-background` / `…-foreground` / `…-border` / `widget-shadow` |
| loading | `#64748b` / `#eef1f5` | `descriptionForeground` / `editor-background` |
| error block + pre | `#fff7f7` / `#842029` / `#f5c2c7` / `#ffffff` | `inputValidation-errorBackground` / **`foreground`** / `inputValidation-errorBorder` / `editorWidget-background` |

Plan-audit fixes folded in (Frontend employee, A-phase):
1. **Error message text uses `var(--vscode-foreground)`**, not `editorError-foreground`
   (a marker/diagnostic color that is weak on the dark-red validation background).
2. **Dark-mode page edge:** `body.vscode-dark` adds a light hairline + shadow to the
   white SuperDoc page (`.super-editor` / `.superdoc__document`) so it reads as a
   floating page on the dark backdrop (white-surface-on-dark checklist).

The page paper vars (`--doc-*`, lines 69-77) and `--doc-page-shadow` are left
untouched — the page stays paper-white intentionally.

## Verification

| Gate | Result |
| --- | --- |
| `tsc --noEmit -p src/react/tsconfig.json` | **exit 0** |
| `npm run build` (vite, CSS bundled) | **exit 0**, built in ~8.3s |
| Plan audit (Frontend employee) | FAIL → 2 corrections folded in → re-implemented |
| Visual render — light + dark | **PASS** (screenshots below) |

Visual verification used a static harness that links the real `Word.css` and
renders it twice via `cli-jaw browser` (CDP): once with no theme vars (light
fallback) and once with `body.vscode-dark` + the dark `--vscode-*` values from
`src/vscode.css`.

- `artifacts/docx-darkmode-LIGHT.png` — identical to the current light design
  (fallbacks intact): light shell, white toolbar, gold warning, gray backdrop,
  white page, light-pink error block.
- `artifacts/docx-darkmode-DARK.png` — fully themed: dark shell/toolbar/backdrop,
  gold-on-dark warning (legible), white page with a visible hairline edge, dark
  widget status pill, **light error text on dark-red background** (the audit fix —
  readable, not red-on-red), muted loading text.

### Remaining real-app gate

The harness faithfully verifies the **CSS theme logic** with the real stylesheet
and real var values. The one item it cannot confirm is the exact SuperDoc page
DOM class in a live document — the dark-mode hairline is scoped to both
`.super-editor` and `.superdoc__document` as a hedge. Confirming the precise
page element (and any `@superdoc-dev/react/style.css` light-surface overrides) is
chase item **S3**, to be done with Computer Use on a real `.docx` in VS Code
Insiders toggling light/dark — which has been environmentally blocked (locked
screen / assistive-access) in recent sessions. S1's chrome theming is complete
and verified; S3 covers the SuperDoc-internal page surface.
