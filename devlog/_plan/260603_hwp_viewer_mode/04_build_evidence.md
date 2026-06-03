# Build Evidence

Date: 2026-06-03
Phase: B

## Implemented Surface

- Kept the existing `cweijan.hwpEditor` custom editor entry and added internal `viewer` / `editor` mode state.
- Default first HWP/HWPX open is Viewer. Later opens reuse `code-office.hwp.lastMode` from VS Code extension global state.
- Added HWP/HWPX commands:
  - `code-office.hwp.switchToViewer`
  - `code-office.hwp.switchToEditor`
  - `code-office.hwp.exportSvg`
  - `code-office.hwp.exportPdf`
  - `code-office.hwp.debugOverlay`
  - `code-office.hwp.dumpParagraph`
- Added dirty Editor -> Viewer save gating:
  - clean Editor switches immediately
  - dirty Editor triggers the existing VS Code custom editor save lifecycle
  - Viewer mode is committed only after save success
  - failure/cancel/timeout leaves Editor active and does not update last mode
  - clean Viewer `Cmd+S` is no-op
- Added Viewer SVG rendering via `pageCount()` + `getPageSvg(page)`.
- Added PDF/SVG export and debug overlay through Command Palette and Viewer controls.
- Added paragraph dump using vendored rhwp-vscode `rhwp.js` + `rhwp_bg.wasm` in `resource/rhwp-vscode`.
- C-phase review fixes:
  - stabilized `saving` with `savingRef` so save UI state cannot remount/destroy rhwp during export
  - cleared stale save status on save failure
  - sanitized rhwp SVG output before Viewer/debug HTML insertion
  - blocked paragraph dump for dirty open documents because the dump reads the saved disk snapshot
  - rejected pending export/viewer RPC promises when the HWP webview is disposed
  - corrected docs for same-file in-place save vs Save As/backup atomic writes
  - added the missing Viewer developer menu `Dump Paragraph` action and host routing
  - corrected `structure/03-hwp-subsystem.md` so same-file VS Code saves are documented as validated in-place writes
  - reused rendered Viewer SVG pages for `Export SVG` command execution so a second rhwp render cannot hang an already-rendered Viewer
  - made `Debug Overlay` tolerate local rhwp-studio builds that do not expose `set_debug_overlay`; when the renderer API is absent, the command still opens the sanitized SVG debug panel

## Changed Implementation Files

- `package.json`
- `src/extension.ts`
- `src/common/hwpMessageSchema.ts`
- `src/common/handler.ts`
- `src/common/reactApp.ts`
- `src/provider/handlers/hwpHandler.ts`
- `src/provider/hwp/HwpCustomDocument.ts`
- `src/provider/hwp/HwpEditorProvider.ts`
- `src/provider/hwp/hwpDebugOverlay.ts`
- `src/provider/hwp/hwpParagraphDump.ts`
- `src/provider/hwp/hwpSettings.ts`
- `src/provider/hwp/hwpStudioConfig.ts`
- `src/common/hwpSvgSanitizer.ts`
- `src/react/util/vscodeConfig.ts`
- `src/react/view/hwp/Hwp.tsx`
- `src/react/view/hwp/HwpEditorSurface.tsx`
- `src/react/view/hwp/HwpViewer.tsx`
- `src/react/view/hwp/Hwp.less`
- `src/react/view/hwp/hwpTypes.ts`
- `src/react/view/hwp/rhwpBridge/createSecureRhwpEditor.ts`
- `src/react/view/hwp/rhwpBridge/exportSvgPages.ts`
- `src/react/view/hwp/rhwpBridge/types.ts`
- `build.ts`
- `scripts/verify-hwp-hardening.mjs`
- `scripts/verify-vsix.mjs`
- `src/test/hwpViewerModeTest.mjs`

## Documentation Updated

- `README.md`
- `README-KO.md`
- `README-CN.md`
- `NOTICE.md`
- `docs/ARCHITECTURE.md`
- `docs/FAQ.md`
- `docs/FAQ.ko.md`
- `docs/TESTING.md`
- `structure/01-file-function-map.md`
- `structure/02-extension-api.md`
- `structure/03-hwp-subsystem.md`
- `structure/05-build-release.md`

## Verification Completed So Far

```text
npm run test:hwp-viewer-mode
PASS hwp viewer mode checks passed

npm run typecheck
PASS tsc --noEmit && tsc --noEmit -p src/react/tsconfig.json

npm run build
PASS Vite production build and rhwp bridge patch assertions

npm run verify:hwp
PASS all HWP hardening and viewer mode checks
```

## C Review Fix Verification

Reviewer-found gaps and fixes:

- Frontend review found `Dump Paragraph` missing from the Viewer developer menu. Fixed `HwpViewer`, `Hwp`, `hwpMessageSchema`, and `HwpEditorProvider` routing, then added `test:hwp-viewer-mode` assertions for the Viewer menu request.
- Backend review found `structure/03-hwp-subsystem.md` still described same-file saves as atomic. Corrected the overview, save sequence, provider lifecycle table, write-policy section, and security boundary table to distinguish in-place same-file saves from atomic Save As/backup/toolbar fallback writes.

Fresh verification after those fixes:

```text
npm run test:hwp-viewer-mode
PASS hwp viewer mode checks passed, including cached SVG export and debug overlay fallback assertions

npm run typecheck
PASS tsc --noEmit && tsc --noEmit -p src/react/tsconfig.json

git diff --check
PASS no whitespace errors

npm run release:local
PASS verify:release + package:verify; generated code-office-3.7.17.vsix and verified rhwp-studio/rhwp-vscode assets in the VSIX
```

## Computer Use Smoke

VS Code Insiders was updated with the freshly packaged VSIX:

```text
code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.17.vsix --force
PASS Extension 'code-office-3.7.17.vsix' was successfully installed.

code-insiders --list-extensions --show-versions | rg '^jun6161\.code-office@'
PASS jun6161.code-office@3.7.17
```

Observed through Computer Use after `Developer: Reload Window`:

- HWP `biz_plan.hwp` opened in Viewer mode by default with rendered page SVGs and visible `Edit` + `Developer` controls.
- `HWP/HWPX: Export SVG Pages` opened the folder picker and exported 6 SVG files to `/tmp/code-office-hwp-smoke-20260603165407/svg-out`.
- `HWP/HWPX: Show Debug Overlay` opened `Debug Overlay biz_plan.hwp` with Page 1 through Page 6. This originally failed with `X.set_debug_overlay is not a function`; the fallback patch fixed the installed VSIX behavior.
- `HWP/HWPX: Dump Paragraph` opened section and paragraph quick picks, then wrote JSON to the `code-office HWP Paragraph Dump` output channel.
- Viewer `Save PDF` opened the native `Save HWP/HWPX as PDF` panel with default name `biz_plan.pdf` in `/tmp/code-office-hwp-smoke-20260603165407`; saving produced the VS Code notification `Saved 6 HWP PDF page(s): /tmp/code-office-hwp-smoke-20260603165407/biz_plan.pdf`.
- The exported PDF was verified on disk after the Computer Use run: `/tmp/code-office-hwp-smoke-20260603165407/biz_plan.pdf` was 439 KB and started with `%PDF-1.7`.
- Viewer `Edit` switched `biz_plan.hwp` into the editor surface with `View` + `Save HWP` controls and page status `1 / 6`.
- Editor `View` switched back to Viewer with rendered pages and visible `Edit` control.
- HWPX `form-002.hwpx` opened through the same HWP entry in Viewer shell with visible `Edit` + `Developer` controls and the HWPX non-standard warning flow.
- Dirty Editor -> Viewer was verified live: in `biz_plan.hwp`, Computer Use clicked into the embedded editor page, typed `x`, observed VS Code unsaved count increase from 1 to 2 plus `biz_plan.hwp Unsaved changes`, clicked `View`, then observed `Saved HWP successfully`, unsaved count returning to 1, and Viewer mode restored with visible `Edit`.
- File-based screenshot capture was attempted with `screencapture -x devlog/_plan/260603_hwp_viewer_mode/screenshots/260603_hwp_dirty_save_then_view_pass.png`, but macOS returned `could not create image from display`. Visual evidence for this run is therefore the Computer Use tool transcript screenshot/accessibility tree rather than a committed PNG artifact.

Regression gates after the Computer Use-discovered debug overlay failure:

```text
npm run typecheck
PASS tsc --noEmit && tsc --noEmit -p src/react/tsconfig.json

npm run test:hwp-viewer-mode
PASS hwp viewer mode checks passed

npm run typecheck
PASS tsc --noEmit && tsc --noEmit -p src/react/tsconfig.json

npm run verify:hwp
PASS all HWP hardening and viewer mode checks, including contributed exportPdf command, PDF rasterization bridge, dump command, and vendored rhwp-vscode media

git diff --check
PASS no whitespace errors

npm run package:verify
PASS build + verify:hwp + verify:vsix; generated code-office-3.7.17.vsix and verified rhwp-studio/rhwp-vscode assets in the VSIX

npm run test:ci
PASS Markdown, Office, HWP viewer mode, and security audit suites

npm run release:local
PASS verify:release + package:verify; generated code-office-3.7.17.vsix and verified rhwp-vscode glue/WASM in VSIX
```

## Remaining Verification

- No open functional HWP/HWPX viewer-mode verification gap remains from the current goal surface. Dirty save-then-view, Viewer/Edit switching, HWP/HWPX default Viewer, SVG export, PDF export, debug overlay fallback, and paragraph dump have all been covered by static/unit/release gates plus VS Code Insiders Computer Use smoke.
- Release-process residual: a committed PNG screenshot artifact could not be created because macOS `screencapture` failed with `could not create image from display`; the screenshot evidence exists in the Computer Use transcript for this goal continuation.
