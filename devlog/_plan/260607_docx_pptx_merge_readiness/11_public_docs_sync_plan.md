# 11 Public Docs Sync Plan

Date: 2026-06-08
Branch: dev_pptx
Scope: documentation-only merge blocker closure

## Objective

Close the final merge-readiness blocker found by Frontend and Docs employee
audits: public documentation still describes the old DOCX/PPTX behavior while
the merge candidate ships editable DOCX and a PowerPoint-like read-only PPTX
viewer.

This phase does not change runtime code. It updates the public docs that will
ship after merging `dev_pptx` into `main`.

## Current Finding

Backend audit says the code branch is merge-ready:

- `dev_pptx` includes the latest DOCX implementation and supersedes `dev_docx`.
- `main -> dev_pptx` is fast-forwardable with zero merge conflicts.
- Provider routing is clean: `officeViewer` no longer claims DOCX or PPTX.

Frontend and Docs audits found the blocker:

- DOCX is still described as `Preview` / `docx-preview` in public docs.
- PPTX is still described as text/media preview in localized docs and GitHub
  Pages.
- structure docs still list DOCX/PPTX under legacy officeViewer routing.

## Files To Modify

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/README.md
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/README-KO.md
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/README-CN.md
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/docs/index.html
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/docs/FAQ.md
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/docs/FAQ.ko.md
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/docs/ARCHITECTURE.md
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/docs/CONTRIBUTING.md
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/docs/TESTING.md
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/structure/04-viewer-architecture.md
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/structure/01-file-function-map.md
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/structure/02-extension-api.md
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/structure/00-structure-hub.md
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/structure/roadmap.md
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/structure/direction.md
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/structure/06-devlog-map.md
```

## Diff-Level Plan

### README.md

Update the user-facing format descriptions:

- Change `Office and workspace previews: Word...` to distinguish editable Word
  documents from read-only preview formats.
- Change DOCX screenshot copy from passive preview/review wording to local DOCX
  editing and source-context review.
- Change PPTX screenshot copy from `PPTX text/media preview` to
  `PowerPoint-like PPTX review`.
- Change Supported Formats Word row:
  - before: `Preview`, `docx-preview/docxjs-derived rendering`
  - after: `Editable`, `@eigenpal/docx-editor-react` WYSIWYG editor with host
    save lifecycle
- Keep PPTX row as read-only PowerPoint-like viewer.

### README-KO.md

Mirror the English README changes in Korean:

- DOCX = 편집 가능, source-context 검토.
- PPTX = PowerPoint-like 읽기 전용 viewer, thumbnails/sidebar/notes/grid/
  fullscreen/presenter/zoom.
- Roadmap no longer says generic `PPTX preview 안정화`; it narrows to visual
  fidelity and large-deck performance beyond current UX.

### README-CN.md

Mirror the English README changes in Chinese:

- DOCX = 可编辑 WYSIWYG review surface.
- PPTX = PowerPoint-like read-only viewer, not text/media-only preview.
- Roadmap narrows to visual fidelity and large-deck performance beyond current
  UX.

### docs/index.html

Update GitHub Pages content:

- DOCX screenshot alt/caption says editable DOCX review, not simple preview.
- PPTX screenshot alt/caption says PowerPoint-like viewer with thumbnails,
  notes, grid, fullscreen, presenter.
- Formats matrix Word row says `Editable`.
- Formats matrix PowerPoint row says read-only PowerPoint-like viewer.
- Roadmap row says visual-fidelity and large-deck performance, not text/media
  extraction.

### docs/FAQ.md

Update public FAQ format wording:

- The product summary says DOCX can be edited, PPTX can be reviewed with a
  PowerPoint-like read-only viewer, and the remaining Office/archive/media
  formats are previewed.
- The format list separates editable DOCX from read-only PPTX preview.
- The edit list includes DOCX in addition to Markdown and HWP/HWPX.

### docs/FAQ.ko.md

Mirror the English FAQ changes in Korean:

- DOCX is editable, not just preview.
- PPTX is a PowerPoint-like read-only viewer.
- The format list no longer puts DOCX under only `미리보기`.

### docs/ARCHITECTURE.md

Update GitHub Pages-linked architecture wording:

- The office viewer no longer routes DOCX/PPTX through one shared
  `OfficeViewerProvider`.
- DOCX uses `cweijan.docxEditor` and `@eigenpal/docx-editor-react`.
- PPTX uses `cweijan.pptxEditor` and `pptx-renderer` with the custom
  PowerPoint-like read-only chrome.
- The provider-pattern table includes `DocxEditorProvider` and
  `PptxEditorProvider`.
- The component-count wording no longer says the shared office viewer routes to
  Word/PPTX as part of its React component set.

### docs/CONTRIBUTING.md

Update contributor-facing tree and phase wording:

- `word/` is not just DOCX preview; it hosts the editable DOCX WebView surface.
- `pptx/` is the PowerPoint-like read-only viewer, not only a slide carousel.
- Phase/history wording should not imply current PPTX support is still the old
  text/media or simple carousel implementation.

### docs/TESTING.md

Update QA/contributor testing scope:

- PPTX testing is no longer described as legacy slide extraction.
- QA wording matches the current read-only PowerPoint-like viewer: slide
  thumbnails, sidebar resize/collapse, speaker notes, grid navigation,
  fullscreen, presenter mode, and keyboard navigation where applicable.
- DOCX testing mentions editable custom editor open/save behavior.

### structure/04-viewer-architecture.md

Update routing/component tables:

- `.docx/.dotx` route is `cweijan.docxEditor` / `word`, backed by
  `@eigenpal/docx-editor-react`, editable.
- `.pptx/.pptm/.ppsx` route is `cweijan.pptxEditor` / `pptx`, backed by
  `pptx-renderer` plus custom viewer chrome, read-only.
- Do not imply `officeViewer` owns DOCX/PPTX.

### structure/01-file-function-map.md

Update file responsibility map:

- `provider/handlers/pptxHandler.ts` now sends PPTX URI/metadata for
  `pptx-renderer`; legacy AdmZip slide text extraction is gone.
- Word view uses `@eigenpal/docx-editor-react`.
- PPTX view is the larger PowerPoint-like viewer.

### structure/02-extension-api.md

Update custom editor registration table:

- `cweijan.officeViewer`: remove docx/dotx/pptx/pptm/ppsx from file types.
- Add or update `cweijan.docxEditor`: docx, dotx.
- Add or update `cweijan.pptxEditor`: pptx, pptm, ppsx.
- Update the intro/count from the old six custom editor registrations to the
  current eight viewType registrations.

### structure/00-structure-hub.md

Update the structure hub so it no longer centers DOCX/PPTX under the legacy
multi-format `officeViewer` route:

- DOCX is a dedicated custom editor route.
- PPTX is a dedicated custom editor route with PowerPoint-like read-only UX.
- Keep `officeViewer` for the remaining preview formats.
- Update the Mermaid/system diagram so DOCX/PPTX appear as sibling custom editor
  routes instead of under the `officeViewerProvider` component fan-out.
- Update any snapshot/version note if it describes pre-merge routing.

### structure/roadmap.md

Update roadmap/source-of-truth wording linked from the README:

- Replace legacy Phase 4 PPTX text/image extraction wording with the current
  PowerPoint-like read-only viewer state.
- Keep future work scoped to visual fidelity, large-deck performance, and QA
  stabilization beyond the current viewer UX.
- Mention DOCX as editable WYSIWYG rather than simple preview.

### structure/direction.md

Update product direction and priority wording:

- Product identity says VS Code can view/edit Office documents depending on
  format, not only preview them.
- Priority item 4 becomes PowerPoint-like PPTX review/viewer instead of generic
  `.pptx preview`.
- Non-goals continue to say PPTX editing is out of scope.

### structure/06-devlog-map.md

Update devlog map phase status wording:

- Phase 4 status no longer describes legacy PPTX slide/text extraction as the
  current implementation.
- Cross-reference the newer DOCX/PPTX merge-readiness devlog when describing
  current branch status.

## Acceptance Criteria

- No public doc says DOCX is only `Preview` or `docx-preview`.
- No public doc says current PPTX is only text/media preview.
- GitHub Pages `docs/index.html` matches the merge candidate behavior.
- FAQ EN/KO format lists align with Supported Formats tables in the READMEs.
- GitHub Pages-linked `docs/ARCHITECTURE.md` and `docs/CONTRIBUTING.md` do not
  claim DOCX/PPTX are owned only by `OfficeViewerProvider`, `DOCX preview`, or
  the legacy PPTX slide carousel path.
- GitHub Pages-linked `docs/TESTING.md` aligns QA scope with the current DOCX
  editable custom editor and PPTX PowerPoint-like read-only viewer.
- structure docs, including `structure/00-structure-hub.md` and
  `structure/roadmap.md`, `structure/direction.md`, and
  `structure/06-devlog-map.md`, match provider registration and viewer
  architecture.
- `structure/02-extension-api.md` count/intro matches current registered
  viewTypes, and `structure/00-structure-hub.md` diagram shows DOCX/PPTX as
  dedicated routes.
- No source/runtime files change in this phase.
- `git diff --stat` shows docs-only changes.
- Docs employee returns `DOCS_MERGE_OK`.
- Backend employee confirms docs-only changes do not alter provider mergeability.

## Verification Plan

Run after edits:

```bash
rg -n "docx-preview/docxjs|Uses docx-preview|docx-preview HTML|DOCX preview|text/media preview|PPTX preview stabilization|PowerPoint 수준 fidelity는 아직 목표가 아닙니다|Text/media preview while deeper fidelity work remains|sample PPTX text/image extraction render|\\.pptx preview|slide extraction|Slide carousel|officeViewer.*docx|officeViewer.*pptx|OfficeViewerProvider.*Word|OfficeViewerProvider.*PPTX" README.md README-KO.md README-CN.md docs structure
git diff --stat
git status --short
```

Then dispatch:

- Docs employee: public docs and GitHub Pages readiness.
- Backend employee: mergeability/provider docs consistency remains intact.

## Non-Goals

- No screenshots are regenerated in this phase.
- No code, package, tests, or runtime behavior changes.
- No actual merge into `main`.
- No `git push`.
