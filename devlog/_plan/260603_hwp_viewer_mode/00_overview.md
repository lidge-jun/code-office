---
created: 2026-06-03
tags: [code-office, hwp, hwpx, rhwp, viewer, editor, pabcd]
---
# HWP/HWPX Viewer Mode Integration Plan

## Goal

Implement HWP/HWPX as one compatible `cweijan.hwpEditor` custom editor entry with internal Viewer and Editor modes.

The first HWP/HWPX open defaults to Viewer. After the user chooses View or Edit, code-office persists the last selected mode and reuses it for future HWP/HWPX tabs. Viewer mode renders from the same bundled `rhwp-studio` runtime and must not require Hancom Office, LibreOffice, a remote service, or a separate `rhwp.hwpViewer` custom editor.

## Confirmed Product Rules

- Keep the existing `cweijan.hwpEditor` custom editor ID for compatibility.
- Do not register a separate `rhwp.hwpViewer` custom editor.
- Vendor rhwp-vscode behavior first; fork upstream rhwp only if core renderer/WASM changes are required.
- Dirty Editor -> View uses save-then-switch:
  - Run the existing Cmd+S / VS Code native custom editor save lifecycle.
  - Switch to Viewer only after save success.
  - Show a save/error popup or status notification.
  - On save failure, cancel, timeout, or disabled save path: remain in Editor and leave lastMode unchanged.
- Expose developer functions through Command Palette plus the Viewer toolbar overflow/dev menu:
  - SVG export.
  - Debug overlay.
  - Paragraph dump.
- Final verification must install the latest VSIX into VS Code Insiders and capture Computer Use screenshots.

## Repository Signals Read

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CONTRIBUTING.md`
- `docs/FAQ.md`
- `docs/TESTING.md`
- `structure/03-hwp-subsystem.md`
- `structure/05-build-release.md`
- `devlog/AGENTS.md`
- `devlog/_plan/README.md`
- `structure/AGENTS.md`
- HWP source files under `src/provider/hwp`, `src/provider/handlers`, `src/common`, and `src/react/view/hwp`.

## Current Constraints

- `src/provider/hwp/HwpEditorProvider.ts` is 344 lines and can accept focused mode and command bridge methods without exceeding the 500-line hard limit.
- `src/react/view/hwp/Hwp.tsx` is 318 lines and should be split during implementation to avoid crossing 500 lines.
- `src/react/view/hwp/rhwpBridge/createSecureRhwpEditor.ts` is 472 lines, so bridge additions must stay very small or be split.
- The local patched rhwp-studio runtime already exposes `pageCount` and `getPageSvg` in `window.__rhwpBridge`.
- The current bridge TypeScript interface does not expose `pageCount` or `getPageSvg` yet.
- `code-office.hwp.save` exists; `code-office.hwp.exportSvg`, `code-office.hwp.debugOverlay`, and `code-office.hwp.dumpParagraph` do not exist yet.

## Phase Map

1. Host mode and command bridge.
2. WebView Viewer/Editor state machine and SVG rendering.
3. rhwp-vscode feature surface: SVG export, debug overlay, paragraph dump.
4. Documentation and strict verification scripts.
5. Release package and VS Code Insiders Computer Use smoke.

## Verification Gate

The goal is not complete until all of these pass:

- `npm run typecheck`
- `npm run test:ci`
- `npm run verify:hwp`
- `npm run verify:vsix`
- `npm run release:local`
- Latest VSIX installed into VS Code Insiders.
- Computer Use screenshot smoke covering:
  - `.hwp` opens in Viewer by default.
  - `.hwpx` opens in Viewer by default.
  - Edit button switches to Editor.
  - Dirty Editor -> View runs save-then-switch and succeeds only after save success.
  - Save failure remains in Editor and keeps lastMode unchanged.
  - lastMode persists across HWP/HWPX tabs.
  - SVG export command smoke.
  - Debug overlay command smoke.
  - Paragraph dump command smoke.
