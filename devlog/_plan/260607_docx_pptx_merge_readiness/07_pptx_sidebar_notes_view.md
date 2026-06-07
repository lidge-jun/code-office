# PPTX Sidebar and Speaker Notes View

Status: Superseded by:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/devlog/_plan/260607_docx_pptx_merge_readiness/08_pptx_powerpoint_ux_research.md
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/devlog/_plan/260607_docx_pptx_merge_readiness/09_pptx_powerpoint_ux_implementation.md
```

This file records the intermediate text-sidebar attempt only. It is not the QA
handoff document. Final PPTX QA should use:

```text
06_pptx_view_only_rollback.md  -> why edit was removed
08_pptx_powerpoint_ux_research.md -> corrected PowerPoint-like UX target
09_pptx_powerpoint_ux_implementation.md -> implemented source and verification evidence
```

## Decision

Keep PPTX view-only, but add review-oriented navigation surfaces:

```text
Left sidebar: slide list with extracted slide titles
Bottom panel: speaker notes for the active slide
```

This does not reintroduce editing. It improves PPTX inspection without bringing
back the partial `pptx-svg` editor.

## Implementation

Source:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/pptxMetadata.ts
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.less
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/package.json
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/test/pptxPhase4Test.mjs
```

Behavior:

```text
PPTX file buffer
  -> pptx-renderer renders slides
  -> pptxMetadata reads slide XML from the same buffer
  -> left sidebar lists slide titles
  -> active slide controls bottom speaker notes panel
```

Notes extraction:

```text
ppt/slides/_rels/slideN.xml.rels
  -> notesSlide relationship
  -> ppt/notesSlides/notesSlideN.xml
  -> DrawingML text runs
```

Fallback:

```text
If a slide has no notes relationship, check ppt/notesSlides/notesSlideN.xml.
If no notes exist, show an empty notes message.
```

## Verification Plan

Automated:

```text
npx tsc --noEmit
npm run build
npm run test:pptx-phase4
npm run test:ci
npm run package
```

Runtime:

```text
Install generated VSIX into VS Code Insiders.
Open /tmp/code-office-pptx-sidebar-notes-smoke.pptx.
Verify slide sidebar appears and click navigation works.
Verify bottom Speaker notes panel appears.
Verify Edit / Slide text / Apply QA note remain absent.
```

## Verification Results

Superseded. Final verification is recorded in:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/devlog/_plan/260607_docx_pptx_merge_readiness/09_pptx_powerpoint_ux_implementation.md
```
