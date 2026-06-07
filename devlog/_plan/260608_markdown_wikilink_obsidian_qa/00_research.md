---
created: 2026-06-08
tags: [code-office, markdown, wikilink, obsidian, autocomplete, qa]
---

# Markdown Wikilink Obsidian UX Research

## Goal

Stabilize code-office Markdown wikilink authoring after the user reproduced a
dropdown issue while editing inside an already paired `[[...]]` token.

The target is not a broad Markdown feature expansion. This pass is scoped to:

- `[[` creates `[[]]` and places the caret in the body.
- Suggestions remain active while editing inside `[[query]]`.
- Backspace/Delete/typing inside the body do not strand stale dropdown state.
- Candidate generation remains cache-backed and does not reintroduce
  workspace-wide scans on each keypress.
- The result is verified through focused unit tests, Markdown CI, build, and a
  real VS Code QA smoke path.

## External Reference: Obsidian Internal Links

Source: https://obsidian.md/help/links

Observed facts from Obsidian Help:

- Obsidian supports wikilink internal links such as `[[Note]]` and
  `[[Note.md]]`.
- Typing `[[` opens internal-link autocomplete in the editor.
- Obsidian supports headings with `#`, aliases with `|`, and block references
  with `^`.
- Excluded files can be deprioritized in link suggestions.

Product inference for code-office:

- A code-office Markdown user expects suggestions to behave like an active
  editor affordance, not a one-shot popup only at the moment `[[` is typed.
- The active replacement range is the wikilink body, not the whole line and not
  the already existing closing `]]`.
- For this patch, heading/block/alias expansion remains out of scope. Existing
  parser support must not regress.

## External Reference: Editing Shortcuts

Source: https://help.obsidian.md/editing-shortcuts

Observed facts:

- macOS deletion operations include Backspace, Delete, Option+Backspace,
  Option+Delete, Cmd+Backspace, and Cmd+Delete.

Product inference for code-office:

- Popup logic must tolerate deletion inside an active wikilink body and must
  close cleanly when deletion moves the cursor outside the body.
- The fix should not hijack platform word/line deletion shortcuts. Those keys
  should remain normal editor text operations, followed by a lightweight popup
  refresh.

## Current code-office Architecture Facts

### Extension Host Cache

Files:

- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkIndex.ts`
- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkResolver.ts`
- `/Users/jun/Developer/new/700_projects/code-office/src/provider/markdownEditorProvider.ts`

Current behavior:

- `WikilinkIndex` owns a per-workspace-folder Markdown file cache.
- `WikilinkIndex` updates the cache on `**/*.{md,markdown}` create/delete.
- `WikilinkResolver.completionTargets(sourceUri)` uses
  `index.getFiles(folder)` when an index is attached.
- `workspace.findFiles()` remains confined to cold index build and the no-index
  fallback.
- Markdown WebView open payload receives `wikilinkCompletionTargets`.
- Later index changes emit `updateWikilinkCompletionTargets`.

Risk conclusion:

- The proposed authoring patch must not touch the resolver hot path.
- Resource/hang risk is low if the patch stays in WebView context detection and
  filtering only.

### WebView Authoring

Files:

- `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/index.js`
- `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/wikilink-authoring.js`
- `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/wikilink-source-transaction.js`
- `/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkAuthoringTest.mjs`
- `/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkResolverTest.mjs`

Current behavior:

- `wikilink-source-transaction.js` already models source-level contexts for
  open `[[query` and closed `[[query]]`.
- `applyWikilinkCompletion()` already replaces only the active body and avoids
  duplicate closing brackets.
- `wikilink-authoring.js` maintains WebView popup logic for textarea, source,
  and contenteditable surfaces.
- `filterWikilinkCompletionTargets()` limits displayed suggestions to 12, but
  the current implementation maps and sorts all candidates on each refresh.

Risk conclusion:

- The safest patch is to strengthen source/context helpers and tests, then make
  the WebView popup refresh reuse those helpers.
- For large workspaces, filtering can be made bounded by collecting only the
  best 12 matches instead of sorting every candidate.

## Reproduced Symptom

User screenshot showed a VS Code-themed suggestion popup after `[[` input. The
user described this path:

```text
[[ㅁㅇㄴㄹㅁㅇㄹ]]
delete or add inside the body
[[ㅁㅇㄴㄹㅁㅇ]]
```

The expected behavior is:

- The popup remains tied to the active wikilink body while the cursor remains
  inside `[[...]]`.
- The query changes as the user edits.
- The popup closes when the query has no matches or when the cursor leaves the
  wikilink context.
- No filesystem scan runs on each keypress.

## Non-Goals

- Do not implement full Obsidian heading autocomplete.
- Do not implement block reference autocomplete.
- Do not implement alias metadata suggestions.
- Do not change Markdown export behavior.
- Do not change DOCX/PPTX work.
- Do not bump/publish the extension version in this goal.

## QA Standard

Automated:

- `npm run test:wikilink-authoring`
- `npm run test:wikilink-resolver`
- `npm run test:markdown`
- `npm run test:ci`
- `npm run build`

Runtime:

- Install local VSIX into the existing VS Code/Insiders environment.
- Open a real workspace-backed Markdown file.
- Verify `[[` creates `[[]]`, suggestions show, typing filters, Backspace and
  Delete inside `[[...]]` do not strand the popup, and selecting a suggestion
  produces exactly one `[[Target]]`.

