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
- In editing mode, Obsidian uses `Ctrl`/`Cmd` hover for page preview rather than treating every plain click as navigation.

### Obsidian Live Preview Editing Model

Source: https://obsidian.md/help/edit-and-read

Relevant facts:

- Obsidian separates reading/editing views from editing modes.
- Live Preview renders formatted text inline while hiding most Markdown syntax.
- When the cursor enters formatted content, the underlying Markdown syntax becomes visible for editing.
- Source mode is the raw Markdown editing mode; Live Preview is still an editing mode, not a read-only rendered preview.

Implementation inference for code-office:

- A rendered wikilink in Vditor Live Preview should be an inactive view of the canonical raw text, not the canonical text itself.
- Moving the caret into or immediately beside the rendered wikilink should reactivate the canonical `[[...]]` source range for editing.
- Navigation should require a distinct gesture from plain editing placement. The closest Obsidian-like behavior is plain click/caret movement for editing, with double-click or modifier-click reserved for opening.
- The raw reactivation must restore the complete brackets, not only the display body, so editing never starts from plain `Note` text after a rendered `[[Note]]`.

### Obsidian / CodeMirror Editor Architecture

Source: https://docs.obsidian.md/Plugins/Editor/Editor

Relevant facts:

- Obsidian uses CodeMirror as the underlying text editor and exposes an editor abstraction for plugins.
- The editor API supports reading the cursor, replacing ranges, and editor callbacks while preserving cross-platform behavior.

Source: https://docs.obsidian.md/Plugins/Editor/Decorations

Relevant facts:

- Obsidian plugin documentation describes CodeMirror decoration/state-field patterns for replacing source text with inline widgets.
- This supports the inferred model: the raw document remains Markdown, while the visible editing surface can hide or replace Markdown syntax outside the active cursor range.

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
- The WebView receives a basename-only `wikilinkIndex` for rendering unresolved links.
- The WebView also receives full `wikilinkCompletionTargets` from `WikilinkResolver.completionTargets(sourceUri)` so authoring suggestions use the same closest-path policy as native VS Code Markdown completions.
- 2026-06-04 fix: the initial `open` payload now awaits both `WikilinkIndex.get(uri)` and `WikilinkResolver.completionTargets(uri)`. This avoids the previous empty-list race where a user could type `[[` immediately after opening the editor before the async `updateWikilinkCompletionTargets` message arrived.
- 2026-06-04 follow-up: manual UI verification must run in an existing VS Code Insiders window with a real workspace folder, such as `/Users/jun/Developer/new`. A no-folder or temporary isolated window is not valid for this feature because nearby-note suggestions depend on the workspace-backed Markdown note index.

### Vditor WebView

Source files:

- `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/index.js`
- `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/util.js`
- `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/live-raw.js`
- `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/wikilink-authoring.js`
- `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/wikilink-dom.js`
- `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/wikilink-placement.js`

Current behavior:

- Vditor is the Markdown editing runtime for `wysiwyg`, `ir`, and `sv`; `raw` uses a WebView-local textarea overlay.
- Existing `hint.extend` is used only for math-inline backslash hints.
- `resource/vditor/wikilink-authoring.js` owns the Obsidian-style `[[` authoring layer for contenteditable Vditor modes and Raw Source textarea mode.
- Typing the second `[` pairs `[[` into `[[]]` and places the caret inside the link body.
- Selecting text and typing `[[` wraps that selection as `[[selected]]`.
- While the caret is inside `[[...]]`, the WebView filters `wikilinkCompletionTargets` and shows a VS Code-themed popup.
- Selecting a suggestion replaces only the link body and keeps exactly one closing `]]`.
- WebView post-processing renders inactive wikilinks as spans and protects the currently selected text node to avoid corrupting active edits.
- Raw Source mode is a plain textarea, but it shares the same pairing and suggestion helpers through `setupWikilinkAuthoring()`.
- Vditor Live Preview pairing uses DOM keyboard hooks plus the Vditor `input` callback. Because the WebView may report a focused text entry while DOM selection/root is temporarily unavailable, the fallback path scans the active `.vditor-reset` root, retries `completeOpen()` across the first rendered frames, repairs the Markdown source when Vditor reports either a one-character second `[` insertion or a batched two-character `[[` insertion, and performs a final `editor.getValue()` source repair when Vditor has already accepted raw `[[` into the source. It also keeps a short pending-bracket keydown state so the second `[` can complete the pair before Vditor consumes it, observes Vditor text mutations so raw `[[` is completed even when keyboard/input events are not routed to the authoring hook, and reapplies the selection inside the empty `[[]]` body across Vditor post-insert rerenders. As a last safety net, the host Markdown provider also normalizes an emitted raw `[[` save payload to `[[]]` and sends the corrected value back to the WebView.
- In the real VS Code Insiders Live Preview WebView, Vditor can restore the DOM selection to the heading after the empty `[[]]` pair is created. Focus-only repair is not sufficient because the browser can still apply the current printable key to the event's original target, and `execCommand('insertText')` can inherit that stale target even after selection repair. The authoring layer therefore treats an empty `[[]]` body as a high-priority active edit target: the next printable key is prevented at both `keydown` and `beforeinput`, written directly into the first empty `[[]]` text node, followed by caret restoration, input-event dispatch, post-processing refresh, and suggestion refresh. This remains true even if the DOM selection already appears to be inside the empty body, because the observed WebView key target can still leak to the heading.
- If Vditor still commits the printable character to the wrong Markdown location, the source-level repair handles the exact observed workspace failure. When the previous source contains `[[]]`, the next source still contains `[[]]`, and the diff is one printable non-bracket character inserted outside that pair, code-office rewrites the saved Markdown by removing the leaked character and inserting it into the first empty wikilink body. This specifically covers the current `/Users/jun/Developer/new` Insiders smoke path where `[[` became `[[]]` but the next `1` was committed as `# 1Wikilink Smoke`.
- The source-level leak repair must not depend only on the mutable latest save value. In the current `/Users/jun/Developer/new` workspace smoke, Vditor can update the latest value before the repair sees a stable pre-leak baseline. The WebView therefore records a dedicated pending empty-wikilink source when `[[]]` is created and uses that pending baseline for the next printable-character repair.
- The real workspace failure can also remain entirely inside the unsaved WebView DOM: the disk file may stay unchanged while the editor DOM shows `# 1Wikilink Smoke` plus `[[]]`. For that path, code-office snapshots editable text when `[[]]` is created and watches Vditor DOM mutations. If the next aggregate DOM text differs by exactly one printable non-bracket character and still contains `[[]]`, the leaked character is removed from its wrong text node and inserted into the empty wikilink body.
- The first DOM-mutation repair only ran on observer paths that also looked like a raw `[[` insertion. In the current `/Users/jun/Developer/new` Insiders window, the actual failure after `[[]]` was already complete is a plain characterData mutation in the restored heading text node. The observer therefore must try pending empty-wikilink leak repair for every observed edit mutation before falling back to raw-open completion.
- The current Insiders WebView can still miss the normal event/observer timing windows. After `[[]]` creation, the authoring layer therefore keeps a short pending-empty-wikilink polling window. If the aggregate editable text changes by one printable non-bracket character while `[[]]` remains, the same DOM repair moves that character into the empty wikilink body. This is intentionally scoped to the just-created empty pair so ordinary later editing is not rewritten.
- In the already-open `NEW` workspace window, polling alone was not enough because Vditor can restore the browser selection to the heading before the next printable key. While a just-created `[[]]` remains empty, the authoring layer now also guards the caret by repeatedly placing selection back inside the empty wikilink body. The leak repair remains as a fallback for mutations that land before the guard wins.
- The caret guard and leak repair must be bounded retries, not continuous WebView intervals. The current Insiders window can become unresponsive to Accessibility/Computer Use if the authoring layer repeatedly touches selection while `[[]]` is pending. The implementation therefore uses short finite retry schedules that end naturally and stop once the empty body is filled.
- The pending empty-wikilink baseline must be captured synchronously in the same call stack that creates `[[]]`. A delayed-only snapshot can miss the clean state if Vditor restores selection to the heading first. Direct pair creation therefore records the clean editable DOM immediately and also invokes the empty-body caret keeper before the next printable key.
- Manual verification must use the already-open VS Code Insiders workspace window for `/Users/jun/Developer/new`, not a temporary no-folder or isolated window. The completion list and nearest-note behavior depend on the workspace-backed Markdown note index.
- 2026-06-04 architecture correction: the DOM/caret repair chain above is no
  longer the intended primary model. Context7-aligned research confirmed that
  VS Code native completions apply only to the default text editor, while
  Obsidian and CodeMirror model autocomplete as trigger context plus source
  transaction. The WebView/Vditor implementation therefore now introduces
  `resource/vditor/wikilink-source-transaction.js` as the canonical pairing,
  context, completion, and printable-insertion helper. Vditor Live Preview keeps
  an active Markdown source selection after `[[` becomes `[[]]`; the next
  printable key is prevented at the browser event layer and committed into
  `latestMarkdownContent` before Vditor can leak it into the heading DOM.
- The old DOM leak repair and caret guard paths may remain as narrow fallback
  scaffolding while the WebView stabilizes, but they are not the source of truth
  for the normal `[[` -> `[[|]]` -> `[[a|]]` flow. Raw Source textarea and
  Live Preview now share the same open-context helper, so suggestions can appear
  for `[[a` before a closing `]]` exists.

## Planning Implications

The lowest-risk path is implemented by reusing current host-side wikilink resolution and adding a WebView-side authoring layer:

1. Host sends full wikilink completion targets to the WebView on open and index changes.
2. WebView detects `[[...]]` context in Vditor editable surfaces and Raw Source textarea.
3. WebView pairs `[[` to `[[]]` only when the cursor is not already inside a wikilink, code block, inline code, or protected rendered node.
4. WebView shows a VS Code-themed suggestion popup anchored near the caret.
5. Selecting a suggestion replaces only the active link body and leaves exactly one closing `]]`.
6. Tests must cover Vditor DOM helpers, raw textarea helpers, existing wikilink rendering, Mermaid, code highlighting, and CJK inline formatting regressions.

Current verification:

- `/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkAuthoringTest.mjs` covers target filtering, textarea pairing, selected-text wrapping, body-only completion replacement, and boundary source reveal placement helpers.
- `npm run test:markdown` covers parser, rendered wikilinks, authoring helpers, resolver path policy, Markdown CJK inline formatting, and live/raw mode regressions together.

The Live Preview render/open/source-reveal bug belongs in the same phase:

1. Newly typed `[[Note]]` should render on blur/caret exit without requiring Cmd+S.
2. Plain click on the rendered wikilink label should keep the current navigation behavior and open the target.
3. Source reveal is triggered by caret placement at the rendered wikilink boundary, not by clicking the label body:
   - rendered `before Note after`
   - caret at either boundary (`before |Note after` or `before Note| after`)
   - reveal as `before |[[Note]] after` or `before [[Note]]| after`
4. Once revealed as raw `[[Note]]`, the whole token is editable: the caret may move through either bracket pair and through the body.
5. When the caret leaves the allowed raw token positions and enters surrounding prose, the token returns to rendered label form.
6. Code blocks and inline code remain protected from wikilink rendering, source reveal, pairing, and suggestions.

## Open Decisions

- Whether first implementation should cover only file suggestions or also headings, aliases, and block IDs.
- Whether `![[embed]]` should stay explicitly out of scope for authoring autocomplete.
- Whether creating a missing note from an unresolved typed name belongs in this feature.
- Whether future UI verification should add a dedicated VS Code Insiders screenshot smoke for the popup in both Vditor IR/WYSIWYG and Raw Source modes.
