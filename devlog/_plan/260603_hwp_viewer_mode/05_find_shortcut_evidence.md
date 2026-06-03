# HWP Find Shortcut Evidence

## Requirement

HWP/HWPX `Cmd+F` / `Ctrl+F` must stay inside the custom editor WebView.

- Viewer mode: open an internal Viewer search box, search rhwp document text first, and fall back to rendered HWP SVG page text.
- Editor mode: open the bundled rhwp editor's find UI.
- VS Code's default find UI must not take over in either mode.

## Implementation

- `src/react/view/hwp/hwpFind.ts` owns shortcut detection, propagation blocking, Viewer rhwp/SVG text extraction, and rhwp editor find activation.
- `src/react/view/hwp/useHwpViewerSearch.ts` keeps Viewer search result computation isolated from the HWP controller.
- `src/react/view/hwp/Hwp.tsx` installs a capture-phase keydown listener for `Cmd+F` / `Ctrl+F`.
- `src/react/view/hwp/HwpViewer.tsx` renders the Viewer search box, result counter, Prev/Next controls, and active-page scroll behavior.
- `src/react/view/hwp/Hwp.less` styles the search box and active page with VS Code theme variables.

## Verification Plan

- `npm run typecheck`
- `npm run test:hwp-viewer-mode`
- `npm run verify:hwp`
- VS Code Insiders smoke after VSIX install: Viewer `Cmd+F`, Editor `Cmd+F`, and regression check that Viewer `Cmd+S` still remains a no-op when clean.
