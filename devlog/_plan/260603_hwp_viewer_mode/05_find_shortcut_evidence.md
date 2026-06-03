# HWP Find Shortcut Evidence

## Requirement

HWP/HWPX `Cmd+F` / `Ctrl+F` must stay inside the custom editor WebView.

- Viewer mode: open an internal Viewer search box, search rhwp document text first, and fall back to rendered HWP SVG page text.
- Editor mode: open the bundled rhwp editor's find UI.
- VS Code's default find UI must not take over in either mode.
- In Editor mode, repeated `Enter` while the rhwp find dialog is open must trigger next find and must not leak into the document edit surface, even if rhwp has moved selection/focus back to the editor text area.

## Implementation

- `src/react/view/hwp/hwpFind.ts` owns shortcut detection, propagation blocking, Viewer rhwp/SVG text extraction, and rhwp editor find activation.
- `src/react/view/hwp/hwpFind.ts` also captures rhwp find-dialog `Enter` / `Shift+Enter` and dispatches the dialog's next/previous buttons before the editor surface can receive the key. It intentionally does not gate on `document.activeElement` because rhwp search selection can leave focus reporting on the document surface.
- `src/react/view/hwp/hwpFind.ts` closes the rhwp editor find dialog before Viewer mode is shown, so the hidden editor DOM kept for command RPC cannot leave the dialog overlaying Viewer.
- `src/react/view/hwp/useHwpViewerSearch.ts` keeps Viewer search result computation isolated from the HWP controller.
- `src/react/view/hwp/Hwp.tsx` installs a capture-phase keydown listener for `Cmd+F` / `Ctrl+F`.
- `src/react/view/hwp/HwpViewer.tsx` renders the Viewer search box, result counter, Prev/Next controls, and active-page scroll behavior.
- `src/react/view/hwp/Hwp.less` styles the search box and active page with VS Code theme variables.

## Verification Plan

- `npm run typecheck`
- `npm run test:hwp-viewer-mode`
- `npm run verify:hwp`
- VS Code Insiders smoke after VSIX install: Viewer `Cmd+F`, Editor `Cmd+F`, and regression check that Viewer `Cmd+S` still remains a no-op when clean.
- VS Code Insiders smoke after VSIX install: rhwp editor find dialog query + repeated `Enter` keeps query text and routes to next result without dirtying by text insertion/deletion.

## Evidence

- Upstream source verified: `https://github.com/edwardkim/rhwp`, MIT, Rust, default branch `main`.
- Upstream fix branch: `/tmp/rhwp-upstream-enter-find` on `fix/find-dialog-enter-routing`.
- Upstream PR: `https://github.com/edwardkim/rhwp/pull/1281`.
- Upstream verification: `wasm-pack build --target web`, `npm run build`, and `npm test` pass in `rhwp-studio`.
- code-office static verification: `npm run test:hwp-viewer-mode`, `npm run verify:hwp`, `git diff --check`, and `npm run package:verify` pass with `code-office-3.7.17.vsix`.
- Computer Use smoke in VS Code Insiders after installing `code-office-3.7.17.vsix`: Editor `Cmd+F` opened rhwp's internal find dialog, query `사업`, repeated `Enter` moved from page `1 / 7` to page `2 / 7` results and then page `3 / 7`, with the tab still clean and no document insertion/deletion.
- Computer Use smoke in VS Code Insiders after switching to Viewer: Viewer `Cmd+F` opened the code-office HWP Viewer search input instead of VS Code default find; query `사업` showed `1/26` results.
- Computer Use smoke exposed a residual rhwp editor find dialog when switching to Viewer with the editor dialog open. The follow-up patch now closes that dialog during `enterViewerMode()` before committing Viewer mode.
- Computer Use smoke after reinstalling the rebuilt `code-office-3.7.17.vsix`: open Editor find dialog, click `View`, and confirm Viewer shows only `Edit`, `Save PDF`, and `Developer`; the rhwp find dialog no longer overlays Viewer.
