---
created: 2026-06-08
tags: [code-office, markdown, wikilink, implementation]
---

# Markdown Wikilink Obsidian UX Implementation

## Changed Files

### `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/wikilink-source-transaction.js`

- Replaced full map/filter/sort completion filtering with bounded best-candidate
  insertion.
- Preserves the previous score ordering:
  - exact/prefix matches first,
  - basename prefix matches next,
  - substring matches after that,
  - locale label order for ties.
- Added `recoverWikilinkCompletionSelection(value, previousSelection)`.
- Added `recoverWikilinkCompletionSelectionAfterChange(previousValue,
  nextValue, previousSelection)`.

Purpose:

- Prevent large vault suggestion refreshes from sorting every candidate on each
  popup refresh.
- Recover a stale source cursor after Backspace/Delete in a closed `[[...]]`
  token. Body-end edits clamp to the new body end; middle-body edits use the
  previous/new content delta so the popup query follows the real post-edit
  caret instead of a stale but still-valid offset.

### `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/wikilink-authoring.js`

- Consolidated popup-facing `filterWikilinkCompletionTargets()` onto the source
  transaction helper.
- Removed the duplicate local scoring implementation.

Purpose:

- Ensure the actual popup path, not only the source helper tests, receives the
  bounded filtering behavior.
- Keep textarea, source, and contenteditable popup filtering on one scoring
  implementation.

### `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/index.js`

- Imported `recoverWikilinkCompletionSelection()` and
  `recoverWikilinkCompletionSelectionAfterChange()`.
- Updated `forgetEmptyWikilinkSource()` so a stale active source selection is
  recovered before being cleared.

Purpose:

- If a user edits `[[ㅁㅇㄴㄹㅁㅇㄹ]]` down to `[[ㅁㅇㄴㄹㅁㅇ]]`, the stored
  cursor can be one character past the new body end. Recovery now clamps it
  back to the active body instead of closing the popup as an invalid context.
- If a user edits inside `[[abcd]]`, a stored cursor may remain technically
  valid while pointing after the wrong query text. The change-aware recovery
  now computes the post-edit cursor from the content delta for middle Backspace
  and Delete.

### `/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkAuthoringTest.mjs`

- Added closed `[[...]]` context tests.
- Added empty `[[]]` body context test.
- Added outside-closing-brackets null-context test.
- Added Korean body-end Backspace recovery regression.
- Added middle-body Backspace/Delete recovery regression.
- Added closed-context completion exact-bracket test.
- Added popup-facing large-target cap test.

## Focused Verification

```text
npm run test:wikilink-authoring
PASS: wikilink authoring checks passed
```

```text
npm run test:wikilink-resolver
PASS: wikilink resolver checks passed
```

The authoring test prints the existing Node warning about module type inference
for `resource/vditor/*.js`. It does not fail the test and is unrelated to this
patch.
