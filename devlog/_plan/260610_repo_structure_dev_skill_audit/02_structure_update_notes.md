# Structure Update Notes

Date: 2026-06-10

## Updated Documents

| File | Update |
|---|---|
| `/Users/jun/Developer/new/700_projects/code-office/structure/00-structure-hub.md` | Refresh package version/date, DOCX engine wording, and high-level architecture diagram labels. |
| `/Users/jun/Developer/new/700_projects/code-office/structure/06-devlog-map.md` | Replace stale active-plan list with current `_plan` and `_fin` interpretation after this audit. |

## Current Architecture Facts

- `package.json` version is `3.7.47`.
- License is `AGPL-3.0-or-later`.
- Activation events include:
  - `onCustomEditor:cweijan.officeViewer`
  - `onCustomEditor:cweijan.docxEditor`
  - `onCustomEditor:cweijan.pptxEditor`
  - `onCustomEditor:cweijan.hwpEditor`
  - Markdown, image, and HTML custom editor activation events.
- DOCX is no longer a shared Office Viewer route. It is registered as `cweijan.docxEditor`.
- PPTX is no longer a shared Office Viewer route. It is registered as `cweijan.pptxEditor` and is currently a PowerPoint-like viewer, not a mutation editor.
- Markdown wikilink indexing is owned by `WikilinkIndex`; hot open/click/completion paths should not call `workspace.findFiles()`.

## Structure Documentation Boundary

The structure docs should stay factual. They should not become a task list. Follow-up work belongs in this plan folder or future devlog folders.

