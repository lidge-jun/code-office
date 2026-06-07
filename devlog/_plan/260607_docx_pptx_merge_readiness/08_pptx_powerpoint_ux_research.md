# PPTX PowerPoint-like Viewer UX Research

Status: Foundation implemented at HEAD `bf436d0`; bottom status bar, grid,
fullscreen, and same-tab presenter completion are tracked in
`10_pptx_status_bar_presenter_plan.md`.

Implementation and verification evidence:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/devlog/_plan/260607_docx_pptx_merge_readiness/09_pptx_powerpoint_ux_implementation.md
```

PPTX edit rollback rationale:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/devlog/_plan/260607_docx_pptx_merge_readiness/06_pptx_view_only_rollback.md
```

QA handoff truth set:

```text
06_pptx_view_only_rollback.md
08_pptx_powerpoint_ux_research.md
09_pptx_powerpoint_ux_implementation.md
10_pptx_status_bar_presenter_plan.md
```

`09_pptx_powerpoint_ux_implementation.md` records the thumbnail/sidebar/notes
foundation. `10_pptx_status_bar_presenter_plan.md` is the current authoritative
pre-QA UX target for the PowerPoint-like bottom bar, grid navigation,
fullscreen, presenter mode, and the decision to exclude PDF export from this
scope.

## Project Folder

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx
```

Jaw project directory was set with:

```text
cli-jaw project set /Users/jun/Developer/new/700_projects/code-office--dev_pptx
```

## Decision

PPTX remains view-only, but the view-only surface must follow PowerPoint Normal
View more closely:

```text
Left pane: visual slide thumbnails, not title-only text
Left pane: horizontally resizable
Left pane: collapsible with a visible restore affordance
Center: current slide remains the dominant preview
Bottom: speaker notes visible below the slide, preferably resizable/collapsible
```

The previous `07_pptx_sidebar_notes_view.md` direction is insufficient because
it added a text slide list, not PowerPoint-like preview thumbnails.

PPTX editing remains intentionally out of scope because the previous partial
`pptx-svg` editor path was not production-grade: text changes were disconnected
from real PowerPoint object editing semantics, delete/backspace behavior was
inconsistent, and the UX implied edit/save support that the open-source stack
could not reliably provide inside this extension. The rollback decision is
recorded in `06_pptx_view_only_rollback.md`.

## Search Sources

Primary sources:

```text
Microsoft Support — Show or hide slide thumbnails
https://support.microsoft.com/en-gb/office/show-or-hide-slide-thumbnails-f4ad3e11-e0f7-4787-b700-563d16762783

Microsoft Support — Choose the right view for the task in PowerPoint
https://support.microsoft.com/en-au/office/choose-the-right-view-for-the-task-in-powerpoint-21332d8d-adbc-4717-a2c6-e25a697b40e9

Microsoft Learn — PowerPoint Pane object
https://learn.microsoft.com/en-us/office/vba/api/powerpoint.pane
```

Supporting sources used by employees:

```text
Microsoft Support — Give a presentation in PowerPoint
https://support.microsoft.com/en-us/office/give-a-presentation-in-powerpoint-a0a97646-6f92-4099-ade7-a5281a8841fe

Indezine — Normal View / Slides Pane references
https://www.indezine.com/products/powerpoint/learn/interface/365/normal-view.html
https://www.indezine.com/products/powerpoint/learn/interface/365/slides-pane.html

HowToGeek — Show, hide, resize thumbnails
https://www.howtogeek.com/415105/how-to-show-hide-or-resize-slide-thumbnails-in-powerpoint/
```

## Source Facts

### Normal View Is Three Panes

Microsoft Support describes Normal view as:

```text
Left: slide thumbnails
Center: large current slide window
Bottom: speaker notes for the current slide
```

Microsoft Learn's PowerPoint object model also treats Normal view as multiple
panes:

```text
Outline pane: index 1
Slide pane: index 2
Notes pane: index 3
```

This means the code-office PPTX view should be modeled as a pane layout, not a
single long scroll page with a text list next to it.

### Thumbnail Pane Behavior

Microsoft Support states that the slide thumbnail pane:

```text
is on the left margin in Normal view
lets users move from slide to slide
can be widened or narrowed by dragging its right edge
can be collapsed entirely by dragging left
can be restored from a collapsed left-edge affordance
```

Important distinction:

```text
PowerPoint desktop: thumbnail pane is resizable and collapsible
PowerPoint web: thumbnail pane is fixed width and always visible
```

code-office runs inside a desktop VS Code webview, so the target should follow
desktop PowerPoint behavior, not the fixed-width web behavior.

### Notes Pane Behavior

Microsoft Support describes the Notes pane as below the slide window. Notes can
be shown/hidden from the bottom PowerPoint task bar. Employee research also
confirmed the notes pane should be treated as a bottom pane, not buried after a
long rendered slide list.

## Employee Discussion

### Frontend Employee

Verdict:

```text
NEEDS_UI_WORK
```

Findings:

```text
Current PPTX viewer is correctly view-only.
The current left pane is only a title list.
It does not show preview images.
It cannot be resized horizontally.
It cannot collapse.
Speaker notes are present, but only partially match PowerPoint because there is
no show/hide or resize behavior.
```

Required UX:

```text
Render real visual thumbnails for every slide.
Add a draggable vertical splitter on the right edge of the thumbnail pane.
Add collapse/restore behavior.
Keep current slide preview dominant.
Keep speaker notes below the current slide.
Do not reintroduce Edit mode or pptx-svg.
```

### Backend Employee

Verdict:

```text
Architecture is viable with zero new dependencies.
```

Key technical findings:

```text
@aiden0z/pptx-renderer exposes renderSlideToContainer(index, container, scale?)
for thumbnail generation.

antd 5.29.3 is installed and exports Splitter and Splitter.Panel.
Splitter supports resize/collapse without adding a new dependency.
```

Main risk:

```text
renderSlideToContainer returns an external SlideHandle.
Those handles must be disposed manually.
If thumbnail handles are not disposed on unmount, file switch, or scroll-out,
the webview can leak chart instances / DOM / blob resources.
```

### Docs Employee

Recommendation:

```text
Create this 08 research/spec document first.
Treat 07 as a partial attempt and 08 as the corrected PowerPoint UX target.
Implementation should happen in follow-up phases:
08a thumbnails
08b resize
08c collapse
08d polish and verification
```

## Historical Implementation Gap Before `bf436d0`

The following gap table describes the state before:

```text
bf436d0 feat(pptx): add PowerPoint-like viewer panes
```

Current code touched by the partial attempt:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.less
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/pptxMetadata.ts
```

Gap table:

| Requirement | Current partial state | Correct target |
|---|---|---|
| Preview image in left pane | Missing: only slide number/title text | Visual thumbnail image per slide |
| Horizontal left-pane resize | Missing: fixed CSS grid width | Drag splitter, clamped min/max width |
| Collapse | Missing | Collapse button/rail, restore affordance |
| Notes | Present but can be pushed out of view | Bottom pane directly below current slide, resizable/collapsible |
| View-only invariant | Preserved | Preserve: no Edit, no pptx-svg, no save bridge |

Current implementation status is now recorded in:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/devlog/_plan/260607_docx_pptx_merge_readiness/09_pptx_powerpoint_ux_implementation.md
```

## Target Architecture

Recommended layout:

```text
Pptx.tsx
  Header: file name, slide count, nav, zoom, pane toggles
  Splitter horizontal
    Splitter.Panel: Thumbnail pane
      SlideThumbnail list
    Splitter.Panel: Preview + notes area
      Splitter vertical
        Splitter.Panel: current slide preview
        Splitter.Panel: speaker notes
```

Recommended files from research:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.less
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/SlideThumbnail.tsx
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/usePptxThumbnails.ts
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/useResizablePanels.ts
```

Actual implementation kept the thumbnail and splitter logic in
`SlideThumbnail.tsx` and `Pptx.tsx` instead of adding `usePptxThumbnails.ts` and
`useResizablePanels.ts`. This kept the change smaller while still satisfying
the UX requirements and test coverage.

Implementation notes:

```text
Use antd Splitter for horizontal and vertical resizing/collapse.
Use PptxViewer.renderSlideToContainer() to render real thumbnails.
Render thumbnails lazily with IntersectionObserver.
Dispose every thumbnail SlideHandle during unmount, file switch, and scroll-out.
Keep pptxMetadata.ts for slide titles and speaker notes.
Avoid localStorage if possible; prefer VS Code webview state for layout memory.
```

## Verification Plan, Completed in `09`

Automated:

```text
npx tsc --noEmit
npm run build
npm run test:pptx-phase4
npm run test:ci
npm run package
```

Test additions:

```text
pptxPhase4Test should assert no edit/save/pptx-svg paths are reintroduced.
pptxPhase4Test should assert thumbnail rendering path uses renderSlideToContainer.
pptxPhase4Test should assert thumbnail handles call dispose().
pptxPhase4Test should assert resizable/collapsible pane affordances exist.
```

Runtime:

```text
Install generated VSIX into VS Code Insiders.
Open a /tmp copy of a real PPTX.
Verify left pane shows visual thumbnail images.
Click thumbnail -> current slide and notes sync.
Drag sidebar splitter -> pane width changes left/right.
Collapse sidebar -> stage expands.
Restore sidebar -> previous width returns or sane default is restored.
Drag/collapse notes pane -> stage vertical space changes.
Confirm absent: Edit, Slide text editor, Apply QA note, dirty/save UI.
```

Completed verification evidence is in:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/devlog/_plan/260607_docx_pptx_merge_readiness/09_pptx_powerpoint_ux_implementation.md
```

## Next Phase Boundary

Completed by:

```text
bf436d0 feat(pptx): add PowerPoint-like viewer panes
```

The text-only sidebar was replaced with:

```text
real thumbnails
splitter resize
collapse/restore
notes pane visibility control
handle-disposal tests
```

Remaining follow-up is not QA breadth only. The current pre-QA UX completion
target is recorded in:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/devlog/_plan/260607_docx_pptx_merge_readiness/10_pptx_status_bar_presenter_plan.md
```

After 10 is implemented, broader QA should still cover large-deck performance
and optional lazy/windowed thumbnail rendering.
