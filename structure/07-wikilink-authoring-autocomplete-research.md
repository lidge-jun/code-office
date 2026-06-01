---
created: 2026-06-01
tags: [code-office, wikilink, autocomplete, markdown, vditor, obsidian]
aliases: [wikilink authoring autocomplete research]
---

# Wikilink Authoring Autocomplete Research

This note records the implementation facts needed before planning Obsidian-like `[[...]]` authoring autocomplete in the code-office Markdown WebView.

## User Request

The desired behavior is:

- Typing `[[` inserts the paired `]]` and leaves the caret between the brackets.
- While the caret is inside `[[here]]`, typing filters a suggestion list.
- Selecting a suggestion inserts a valid wikilink and preserves the existing code-office Markdown save lifecycle.

## External Behavior References

### Obsidian Internal Links

Source: https://obsidian.md/help/links

Relevant facts:

- Obsidian treats `[[` as the editing-view trigger for internal-link creation.
- Obsidian also supports creating a link from selected text by typing `[[`.
- Obsidian supports file links, same-note headings via `[[#`, vault-wide heading search via `[[##`, block links using `^`, aliases using `|`, and embeds using `![[...]]`.
- Obsidian suggests blocks when the user types a caret in a block-link context.
- Obsidian's invalid/special characters for link targets include `#`, `|`, `^`, `:`, `%%`, `[[`, and `]]`, so those characters have structural meaning inside the link body.

### Obsidian EditorSuggest Pattern

Sources:

- https://obsidian-developer-docs.pages.dev/Reference/TypeScript-API/Plugin/registerEditorSuggest
- https://obsidian-developer-docs.pages.dev/Reference/TypeScript-API/EditorSuggest/

Relevant facts:

- Obsidian plugins use an editor-suggest API for live suggestions while the user is typing.
- Trigger detection is expected to run very often, so it must return early when the cursor is not inside a relevant context.
- Suggestion generation may be async, but the trigger/context check should remain cheap.

### CodeMirror Autocomplete Model

Source: https://codemirror.net/examples/autocompletion/

Relevant facts:

- Completion sources compute a replacement range and a set of options.
- Completion can be implicit after a syntax trigger or explicit through a command.
- The result should define a validity condition so the same options can continue filtering while the user types inside the same construct.
- Selected completions may customize the text applied into the document.

## Current code-office Facts

### Extension Host

Source files:

- `/Users/jun/Developer/new/700_projects/code-office/src/provider/wikilink/wikilinkCompletionProvider.ts`
- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkIndex.ts`
- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkResolver.ts`
- `/Users/jun/Developer/new/700_projects/code-office/src/provider/markdownEditorProvider.ts`

Current behavior:

- VS Code's native Markdown text editor already has a `WikilinkCompletionProvider`.
- The provider detects an active `[[...` context on the current line.
- It inserts the selected target and appends `]]` only when the text after the cursor does not already start with `]]`.
- `WikilinkIndex` keeps a per-workspace-folder cache of Markdown note basenames.
- `WikilinkResolver.completionTargets(sourceUri)` can return full completion targets relative to the current note.
- The WebView receives a basename-only `wikilinkIndex` for rendering unresolved links, but it does not currently receive full completion targets.

### Vditor WebView

Source files:

- `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/index.js`
- `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/util.js`
- `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/live-raw.js`

Current behavior:

- Vditor is the Markdown editing runtime for `wysiwyg`, `ir`, and `sv`; `raw` uses a WebView-local textarea overlay.
- Existing `hint.extend` is used only for math-inline backslash hints.
- `autoSymbol()` already intercepts bracket-like keys and inserts pairs for `(`, `{`, and `"`, but it does not pair `[[...]]`.
- WebView post-processing renders inactive wikilinks as spans and protects the currently selected text node to avoid corrupting active edits.
- Raw Source mode is a plain textarea and has no suggestion surface.

## Planning Implications

The lowest-risk path is to reuse current host-side wikilink resolution and add a WebView-side authoring layer:

1. Host sends full wikilink completion targets to the WebView on open and index changes.
2. WebView detects `[[...]]` context in Vditor editable surfaces and Raw Source textarea.
3. WebView pairs `[[` to `[[]]` only when the cursor is not already inside a wikilink, code block, inline code, or protected rendered node.
4. WebView shows a VS Code-themed suggestion popup anchored near the caret.
5. Selecting a suggestion replaces only the active link body and leaves exactly one closing `]]`.
6. Tests must cover Vditor DOM helpers, raw textarea helpers, existing wikilink rendering, Mermaid, code highlighting, and CJK inline formatting regressions.

## Open Decisions

- Whether first implementation should cover only file suggestions or also headings, aliases, and block IDs.
- Whether `![[embed]]` should stay explicitly out of scope for authoring autocomplete.
- Whether Raw Source mode must support the same popup in phase one or can follow after Vditor Live Preview support.
- Whether creating a missing note from an unresolved typed name belongs in this feature.
