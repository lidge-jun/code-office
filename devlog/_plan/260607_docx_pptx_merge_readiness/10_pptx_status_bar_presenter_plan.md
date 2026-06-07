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

## Current State

Current source already provides:

- PPTX view-only rendering through `@aiden0z/pptx-renderer`.
- Visual slide thumbnails through `SlideThumbnail`.
- Left sidebar resizing through `antd` `Splitter`.
- Explicit bottom-of-sidebar collapse/restore control.
- Speaker notes extraction through `pptxMetadata.ts`.
- Speaker notes panel under the slide preview.
- Phase test coverage proving there is no PPTX edit/save/pptx-svg/WASM path.

Current gaps:

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
│ File name                                      Exit Presenter │
├──────────────────────────────────────────────────────────────┤
│ large slide preview                                           │
├──────────────────────────────────────────────────────────────┤
│ speaker notes/comments                                        │
├──────────────────────────────────────────────────────────────┤
│ Previous | Slide n of N | Next | Zoom                         │
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

## Employee Verification Targets

Frontend employee:

- Audit layout, density, PowerPoint-like control placement, responsive behavior, accessibility labels, and visual risk.

Backend employee:

- Audit that provider/file IO/save/PDF surfaces are not accidentally modified.
- Audit that PPTX remains view-only and merge-ready.

Docs employee:

- Audit devlog consistency and that 06/08/09/10 truth set does not contradict itself.
