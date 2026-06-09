# 10 PPTX Status Bar and Presenter Plan

Date: 2026-06-08
Branch: dev_pptx
Scope: PPTX view-only UI/UX refinement before QA.

## User Decision Lock

This document supersedes the ambiguous bottom-bar portions of:

- /Users/jun/Developer/new/700_projects/code-office--dev_pptx/devlog/_plan/260607_docx_pptx_merge_readiness/08_pptx_powerpoint_ux_research.md
- /Users/jun/Developer/new/700_projects/code-office--dev_pptx/devlog/_plan/260607_docx_pptx_merge_readiness/09_pptx_powerpoint_ux_implementation.md

Confirmed decisions:

- PPTX editing stays removed.
- PDF export is excluded from this scope.
- `Comments` and `Notes` mean the same speaker-notes surface in this viewer.
- No separate PowerPoint comment-object creation or persistence is required.
- `Presenter` stays inside the same VS Code tab.
- `Fullscreen` means a focused large-slide viewing mode inside the same webview.
- The target is a PowerPoint-like viewing UX, not a PowerPoint-compatible editor.

## Starting State

Source before this phase already provided:

- PPTX view-only rendering through `@aiden0z/pptx-renderer`.
- Visual slide thumbnails through `SlideThumbnail`.
- Left sidebar resizing through `antd` `Splitter`.
- Explicit bottom-of-sidebar collapse/restore control.
- Speaker notes extraction through `pptxMetadata.ts`.
- Speaker notes panel under the slide preview.
- Phase test coverage proving there is no PPTX edit/save/pptx-svg/WASM path.

Starting gaps:

- Top bar still carries slide counter and zoom/navigation controls.
- There is no PowerPoint-like bottom status/action bar.
- There is no grid navigation surface.
- There is no fullscreen/focused slide mode.
- There is no presenter mode.
- Notes collapse is only the splitter affordance, not a clear bottom-bar action.
- Test coverage does not lock these new UX controls.

## Planned User-Facing Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ File name                                                     │
├───────────────┬──────────────────────────────────────────────┤
│ thumbnails    │ current slide preview                        │
│ resizable     │                                              │
│ collapsible   ├──────────────────────────────────────────────┤
│               │ speaker notes / comments                     │
├───────────────┴──────────────────────────────────────────────┤
│ Slide 1 of 16 | Notes | Sidebar | Grid | Fullscreen | Presenter | - slider + │
└──────────────────────────────────────────────────────────────┘
```

Presenter mode:

```text
┌──────────────────────────────────────────────────────────────┐
│ End Show | Presenter              Slide n of N | clock        │
├──────────────────────────────────────────────────────────────┤
│ current slide preview                 │ next slide preview    │
│                                       ├───────────────────────┤
│                                       │ notes / comments      │
├──────────────────────────────────────────────────────────────┤
│ previous | Slide n of N | next        │                       │
├──────────────────────────────────────────────────────────────┤
│ visual filmstrip thumbnails                                   │
└──────────────────────────────────────────────────────────────┘
```

Grid mode:

```text
┌──────────────────────────────────────────────────────────────┐
│ File name                                                     │
├──────────────────────────────────────────────────────────────┤
│ slide thumbnail grid                                          │
│ click a slide -> navigate and return to normal view           │
├──────────────────────────────────────────────────────────────┤
│ Slide n of N | Notes | Sidebar | Grid active | ...            │
└──────────────────────────────────────────────────────────────┘
```

## File Plan

### MODIFY: /Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx

Responsibilities:

- Own PPTX viewer UI state:
  - current slide
  - zoom
  - sidebar size/collapse
  - notes visibility
  - grid mode
  - fullscreen/focused mode
  - presenter mode
- Keep all modes view-only.
- Keep all navigation routed through `goToSlide(index)`.

Planned changes:

- Remove top-right navigation and zoom controls from the header.
- Keep header limited to file name and compact presentation metadata.
- Add bottom status/action bar.
- Add Notes/Comments toggle that collapses/restores the speaker notes panel.
- Add Sidebar toggle that uses the existing sidebar collapse/restore state.
- Add Grid toggle and render a thumbnail grid when active.
- Add Fullscreen toggle that hides chrome/sidebar/notes and emphasizes the slide preview.
- Add Presenter toggle that shows slide preview plus notes plus previous/next controls in the same tab.
- Replace the current `Segmented` zoom buttons with a status-bar slider plus minus/plus buttons.
- Add accessible labels for each action.
- Preserve existing `PptxViewer.open`, `setZoom`, and `renderSlide` integration.

Implemented changes:

- Added fullscreen/presenter keyboard navigation for `ArrowRight`, `PageDown`,
  `Space`, `ArrowLeft`, `PageUp`, and `Backspace`.
- Hid the normal bottom status bar in Fullscreen and Presenter so those modes
  behave like focused viewing/presenter surfaces instead of Normal view with
  extra chrome.
- Kept the real `PptxViewer` render container stable and moved layout through CSS,
  avoiding renderer remount churn when switching modes.
- Split status bar and presenter chrome into focused components to keep files
  below the project 500-line limit.

Added implementation files:

- /Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/PptxStatusBar.tsx
- /Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/PptxPresenterChrome.tsx
- /Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/PptxPresenter.less

### MODIFY: /Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.less

Responsibilities:

- Define dense PowerPoint-like viewer styling for a VS Code webview.
- Avoid oversized marketing UI.
- Keep controls readable at narrow widths.

Planned changes:

- Reduce top header height and remove top-heavy control styling.
- Add bottom status/action bar styles.
- Add icon-like compact control button styles.
- Add zoom slider styles.
- Add grid view styles.
- Add fullscreen/focus mode styles.
- Add presenter mode styles.
- Ensure no text overlap at desktop and narrow widths.

Implemented changes:

- `Pptx.less` owns the normal viewer, sidebar, grid, notes, status bar, and
  fullscreen styles.
- `PptxPresenter.less` owns the dark PowerPoint-like presenter view with current
  slide, next-slide preview, notes/comments, controls, and bottom filmstrip.
- Presenter mode includes a narrow-webview media rule that stacks the side panel
  below the current slide and reduces filmstrip thumbnail width.

### MODIFY: /Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/test/pptxPhase4Test.mjs

Responsibilities:

- Lock source-level architecture and user-facing control names.
- Prevent accidental reintroduction of edit/save/pptx-svg/WASM.

Planned changes:

- Assert bottom status/action bar exists.
- Assert `Slide 1 of ...` style status text exists.
- Assert Notes/Comments toggle exists.
- Assert Sidebar toggle exists.
- Assert Grid navigation exists.
- Assert Fullscreen mode exists.
- Assert Presenter mode exists.
- Assert zoom slider exists.
- Keep existing negative assertions against edit/save/pptx-svg.

Implemented changes:

- Added build assertions for `PptxPresenterChrome.tsx` and `PptxStatusBar.tsx`.
- Added source assertions for keyboard navigation, next-slide preview, presenter
  filmstrip, `End Show`, and no edit/save/PDF/pptx-svg runtime.
- Added source assertions that Fullscreen/Presenter hide the normal status bar
  and that Presenter does not say `Click to add notes`.

### MODIFY: /Users/jun/Developer/new/700_projects/code-office--dev_pptx/devlog/_plan/260607_docx_pptx_merge_readiness/09_pptx_powerpoint_ux_implementation.md

Responsibilities:

- Keep 09 marked as implemented foundation, not final QA target.
- Keep readers pointed to this 10 plan for bottom-bar and presenter completion.

Planned changes:

- Already applied during A-phase documentation repair: 09 now references this
  file and states that final pre-QA PPTX UX depends on 10 being implemented and
  verified.

## Explicit Non-Goals

- No PDF export button or PDF conversion behavior in this scope.
- No PPTX edit mode.
- No `pptx-svg`.
- No dirty/save bridge.
- No new `CustomEditorProvider` behavior.
- No new backend command.
- No new persisted comments data model.
- No new VS Code window/panel for presenter mode.

## Verification Plan

Fresh command evidence required:

```bash
npx tsc --noEmit
npm run build
npm run test:pptx-phase4
npm run test:ci
npm run package
code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office--dev_pptx/code-office-3.7.46.vsix --force
```

Runtime evidence required in the already-open VS Code Insiders window:

- Open a PPTX smoke copy.
- Confirm top bar is simplified.
- Confirm bottom status/action bar appears.
- Confirm `Slide n of N` updates when navigating.
- Confirm visual thumbnail sidebar renders.
- Confirm sidebar can resize.
- Confirm sidebar can collapse and restore through the bottom bar.
- Confirm Notes/Comments toggles the speaker-notes panel.
- Confirm Grid shows visual thumbnails and clicking a slide navigates.
- Confirm Fullscreen focuses the slide and can exit.
- Confirm Presenter shows slide + speaker notes + previous/next controls in the same tab.
- Confirm zoom slider changes slide scale.
- Confirm no edit/save/PDF affordance appears.

## Verification Evidence

Fresh command evidence collected on 2026-06-08:

```bash
npx tsc --noEmit
# PASS

npm run build
# PASS, generated out/webview/assets/Pptx-CiajoD2_.js (1,480.86 kB)

npm run test:pptx-phase4
# PASS, includes PptxPresenterChrome/PptxStatusBar build checks and no-WASM assertion

npm run package
# PASS, generated /Users/jun/Developer/new/700_projects/code-office--dev_pptx/code-office-3.7.46.vsix

code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office--dev_pptx/code-office-3.7.46.vsix --force
# PASS, extension installed successfully

npm run test:ci
# PASS, markdown + office + security; dependency audit total=0 low=0 moderate=0 high=0 critical=0
```

Runtime smoke evidence in the already-open VS Code Insiders window:

- Opened /tmp/code-office-pptx-final-fix-smoke.pptx.
- Confirmed top header is reduced to file name and slide count.
- Confirmed visual slide thumbnails render in the left sidebar.
- Confirmed bottom bar exposes `Slide n of 16 slides`, Notes, Sidebar, Grid,
  Fullscreen, Presenter, and zoom slider.
- Confirmed Presenter mode renders:
  - left current slide
  - right `Next slide` preview
  - right `Notes / Comments` speaker notes
  - bottom visual filmstrip
  - `End Show` presenter exit control
- Frontend re-audit found and the source now fixes:
  - normal bottom status bar hidden in Fullscreen/Presenter
  - passive empty-notes copy: `No speaker notes for this slide.`
  - Presenter narrow-width responsive fallback
- Confirmed keyboard `Right` in Presenter moved from Slide 1 to Slide 2 and
  updated the next-slide preview to Slide 3.
- Confirmed Fullscreen hides sidebar/header/notes, keeps one focused slide page,
  and exposes `Exit Fullscreen`.
- Confirmed keyboard `Right` in Fullscreen moved from Slide 2 to Slide 3.
- Confirmed zoom plus changed the visible zoom value from `100 %` to `110 %`.
- Confirmed no edit surface, PPTX save bridge, PDF export, or pptx-svg WASM path
  is present in the source-level phase test.

## Employee Verification Targets

Frontend employee:

- Audit layout, density, PowerPoint-like control placement, responsive behavior, accessibility labels, and visual risk.

Backend employee:

- Audit that provider/file IO/save/PDF surfaces are not accidentally modified.
- Audit that PPTX remains view-only and merge-ready.

Docs employee:

- Audit devlog consistency and that 06/08/09/10 truth set does not contradict itself.
