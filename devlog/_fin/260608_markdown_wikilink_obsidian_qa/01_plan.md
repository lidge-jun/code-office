---
created: 2026-06-08
tags: [code-office, markdown, wikilink, plan, qa]
---

# Markdown Wikilink Obsidian UX QA Plan

## Objective

Implement and verify a focused fix for Obsidian-like wikilink autocomplete in
the code-office Markdown WebView so editing inside an already paired
`[[query]]` keeps suggestion state correct without reintroducing per-keypress
workspace scans or editor hangs.

## File Change Map

```text
MODIFY resource/vditor/wikilink-source-transaction.js
  - strengthen closed-context query/body invariants
  - add or preserve source-context recovery helpers if needed

MODIFY resource/vditor/wikilink-authoring.js
  - keep textarea/source/contenteditable popup refresh aligned with active
    source contexts
  - avoid stale source selection after delete/backspace by recovering or
    clamping the stored cursor to the post-edit body position
  - keep displayed suggestions capped and cheap in the popup-facing filter

MODIFY src/provider/wikilink/wikilinkCompletionProvider.ts
  - keep native Markdown completion body-range behavior
  - add guard comments only if needed after implementation inspection

MODIFY src/test/wikilinkAuthoringTest.mjs
  - add regression tests for editing inside closed `[[...]]`
  - add delete/backspace-style source context tests
  - add large-target filtering cap test

MODIFY src/test/wikilinkResolverTest.mjs
  - keep proof that completion uses attached WikilinkIndex and not
    workspace.findFiles()

NEW devlog/_plan/260608_markdown_wikilink_obsidian_qa/02_implementation.md
  - implementation evidence

NEW devlog/_plan/260608_markdown_wikilink_obsidian_qa/03_verification.md
  - automated and runtime QA evidence
```

## Diff-Level Plan

### 1. Source Transaction Helper

Path:

`/Users/jun/Developer/new/700_projects/code-office/resource/vditor/wikilink-source-transaction.js`

Current relevant behavior:

- `findWikilinkCompletionContext(value, position)` supports open and closed
  contexts.
- `applyWikilinkCompletion(value, context, target)` replaces the body and
  appends `]]` only for open contexts.
- `filterWikilinkCompletionTargets(query, targets, limit)` maps, filters, sorts,
  then slices.

Planned changes:

- Add tests first to lock closed-context behavior:

```text
findWikilinkCompletionContext('[[abc]]', 5)
  -> query 'abc', bodyStart 2, bodyEnd 5

findWikilinkCompletionContext('[[ab]]', 4)
  -> query 'ab'

findWikilinkCompletionContext('[[abc]]', 2)
  -> query ''

findWikilinkCompletionContext('[[abc]]', 7)
  -> null, cursor outside body
```

- If current helper fails any test, adjust the context guard so a position
  between `bodyStart` and `bodyEnd` is accepted and a position at/after the
  closing `]]` is rejected.
- Keep helper output compatible with the WebView active-source-selection object:
  `{ selectionStart, selectionEnd, context }`.

### 2. WebView Authoring Popup

Path:

`/Users/jun/Developer/new/700_projects/code-office/resource/vditor/wikilink-authoring.js`

Current relevant behavior:

- Textarea path runs `showTextareaSuggestions()` on input/click.
- Source path runs `showSourceSuggestions()`.
- Contenteditable path runs `showContenteditableSuggestions()`.
- Printable characters are routed through source transactions when an active
  source selection exists.
- Backspace/Delete are not hijacked; popup state is refreshed afterward.

Planned changes:

- Ensure deletion and ordinary input refresh the popup after the underlying
  editor updates, not before.
- Ensure stale active source selection is either repaired or cleared after
  Backspace/Delete/input:
  - First try the real post-edit cursor/selection if available.
  - If the UI only has the previous source selection, recover from the previous
    active context and the new value by clamping the stored cursor to the new
    wikilink body end.
  - Example: previous `[[ㅁㅇㄴㄹㅁㅇㄹ]]` at body end becomes
    `[[ㅁㅇㄴㄹㅁㅇ]]`; the stored cursor must recover from the old offset to
    the new body end, not clear the popup as outside-context.
  - Clear only when the recovered position is outside the active wikilink or
    the token no longer has a valid `[[...]]` body.
- Ensure contenteditable fallback still checks the actual caret text node before
  falling back to focused editable root.
- Keep `popup.handleKeydown(event)` as the first keydown branch so ArrowUp,
  ArrowDown, Enter, Tab, and Escape behavior remains unchanged.
- Update or consolidate the popup-facing
  `filterWikilinkCompletionTargets()` in this file. Changing only the
  source-transaction helper is insufficient because the rendered popup calls
  the authoring module's export.
- Preserve the live completion target store. Popup filtering must keep reading
  the current module-level `completionTargets` default, not a stale open-time
  snapshot, so `updateWikilinkCompletionTargets` still reaches already-open
  Markdown editors.
- Keep keyboard navigation behavior in the popup unchanged.

### 3. Native VS Code Completion

Path:

`/Users/jun/Developer/new/700_projects/code-office/src/provider/wikilink/wikilinkCompletionProvider.ts`

Planned changes:

- Prefer no code change unless source inspection or tests show a matching native
  editor bug.
- Preserve current behavior: range starts after `[[`; insertText appends `]]`
  only when missing.

### 4. Tests

Path:

`/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkAuthoringTest.mjs`

Add regression assertions:

- Closed body editing:

```text
[[ㅁㅇㄴㄹㅁㅇㄹ]] at body end -> active context query is ㅁㅇㄴㄹㅁㅇㄹ
[[ㅁㅇㄴㄹㅁㅇ]] after deletion -> active context query is ㅁㅇㄴㄹㅁㅇ
body-end Backspace recovery from old offset -> recovered query stays active
apply completion to closed body -> exactly [[Target]], no duplicate ]]
```

- Empty and outside positions:

```text
[[]] at body -> query ''
[[abc]] after closing brackets -> null context
```

- Filtering cap:

```text
authoring.filterWikilinkCompletionTargets('', 1000 targets, 12)
  -> length 12
```

Path:

`/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkResolverTest.mjs`

Keep or extend assertions:

- `completionTargets()` with an attached index does not call
  `workspace.findFiles()`.

### 5. QA

Automated commands:

```bash
npm run test:wikilink-authoring
npm run test:wikilink-resolver
npm run test:markdown
npm run test:ci
npm run build
```

Runtime commands:

```bash
npm run release:local
code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.46.vsix --force
```

Runtime manual smoke:

- Open an existing workspace-backed Markdown file in the current VS Code
  environment.
- Type `[[`.
- Confirm `[[]]` appears with caret inside.
- Type Korean characters.
- Confirm suggestions stay open while matches exist.
- Press Backspace/Delete inside the body.
- Confirm no hang, no duplicated closing brackets, and popup state is correct.
- Select a suggestion and confirm exactly one `[[Target]]`.
- With the Markdown file still open, create a new `.md` file in the same
  workspace and confirm it appears in the `[[` popup without reopening the
  editor.
- Delete that file and confirm it disappears from the popup without reopening
  the editor.

## Acceptance Criteria

- No keypress path calls `workspace.findFiles()`.
- New authoring tests pass.
- Full Markdown test suite passes.
- Full CI test suite passes.
- Build passes.
- VSIX packages successfully.
- Runtime smoke confirms the reproduced path does not hang and does not strand
  stale dropdown state.
