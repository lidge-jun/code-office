# HWP Viewer Search Highlight Evidence

## Requirement

Viewer `Cmd+F` / `Ctrl+F` must do more than open a search box and select a page. A matched HWP/HWPX term must visibly map back to the rendered document content:

- search stays inside the HWP Viewer WebView, not VS Code default find
- result count is based on highlightable rendered SVG text when available
- matching rendered SVG text receives a visible hit highlight
- the active hit receives a stronger active highlight
- `Enter` / `Shift+Enter` scrolls the active hit, not only the page shell
- rhwp text search remains as fallback only when SVG text extraction cannot provide highlightable matches

## Root Cause

The previous Viewer search path returned one page-level match per rendered page. `HwpViewer` only applied `hwp-viewer-page-search-active` to the page container, so users could see a search count and page border but not the actual matched text location.

## Implementation

- `src/react/view/hwp/hwpFind.ts`
  - returns SVG text-element match IDs instead of only page-level matches
  - counts multiple occurrences inside rendered text elements
  - decorates matched SVG `<text>` / `<tspan>` elements with safe inline highlight attributes
  - marks the active rendered text hit with `data-hwp-search-active`
- `src/react/view/hwp/useHwpViewerSearch.ts`
  - prefers SVG text matches when available so result count and highlight target stay aligned
  - keeps rhwp bridge text search as fallback for page-only navigation
- `src/react/view/hwp/HwpViewer.tsx`
  - computes the active SVG match ID
  - injects decorated SVG pages
  - scrolls the active rendered text hit into view
- `src/test/hwpViewerModeTest.mjs` and `scripts/verify-hwp-hardening.mjs`
  - assert the highlightable SVG path and fallback search path
- `docs/ARCHITECTURE.md` and `docs/TESTING.md`
  - document the expected Viewer find behavior and verification surface

## Verification Plan

- `npm run typecheck`
- `npm run test:hwp-viewer-mode`
- `npm run verify:hwp`
- `npm run package:verify`
- latest VSIX install into VS Code Insiders
- Computer Use smoke: Viewer `Cmd+F`, query, visible text highlight, `Enter` next-result movement

## Evidence

- `npm run typecheck`: passed.
- `npm run test:hwp-viewer-mode`: passed, `hwp viewer mode checks passed`.
- `npm run verify:hwp`: passed, including:
  - `PASS HWP Viewer find can highlight rendered SVG hits`
  - `PASS HWP Viewer find marks active rendered SVG hit`
  - `PASS HWP Viewer search decorates and scrolls rendered text hits`
  - `PASS HWP Viewer search prefers highlightable SVG text before rhwp fallback`
- `npm run package:verify`: passed and produced:
  - `code-office-3.7.17.vsix`
  - `PASS VSIX includes rhwp-studio index`
  - `PASS VSIX includes rhwp WASM assets`
  - `PASS VSIX includes native rhwp PDF helper for current platform`
- VS Code Insiders install: `code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.17.vsix --force` succeeded.
- Computer Use smoke in VS Code Insiders after `Developer: Reload Window`:
  - Viewer mode showed `Edit`, `Save PDF`, and `Developer`.
  - `Cmd+F` opened `Find in HWP viewer`, not VS Code default find.
  - Query `수` showed `1/31` and visibly highlighted the large title hit in orange/yellow.
  - Pressing `Enter` changed the counter to `2/31`, scrolled into body content, and highlighted the active hit in the document text.
