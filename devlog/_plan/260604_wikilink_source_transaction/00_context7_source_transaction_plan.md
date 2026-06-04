---
created: 2026-06-04
tags: [code-office, markdown, wikilink, autocomplete, source-transaction, context7]
---

# Context7 Source-Transaction Wikilink Plan

## Goal

Rebuild code-office Markdown wikilink authoring around a source-transaction model instead of DOM/caret repair.

The target behavior is:

- Typing `[[` in a supported Markdown editing surface inserts `[[]]`.
- The caret lands in the link body: `[[|]]`.
- Typing a character keeps the character inside the body: `[[a|]]`.
- A VS Code-themed dropdown appears below the caret with deduplicated workspace Markdown note candidates.
- Suggestions filter as the user types and selection replaces the active wikilink body with exactly one `[[Target]]`.
- Code blocks, inline code, protected rendered nodes, and unsupported link contexts do not trigger pairing or suggestions.

## External Model

Context7 and web research point to the same implementation model:

- VS Code default editor: `CompletionItemProvider` with trigger characters and replacement ranges.
- Obsidian: `EditorSuggest.onTrigger()` returns `start`, `end`, and `query` by matching text before the cursor.
- CodeMirror: `CompletionSource` returns `CompletionResult.from`, `options`, `validFor`, and applies selections through editor transactions.

For code-office WebView/Vditor, VS Code native completion cannot run inside the custom WebView. The WebView must implement an Obsidian/CodeMirror-like controller using canonical Markdown source positions.

## Current Failure

The current 3.7.30-3.7.42 era implementation tries to repair symptoms after Vditor has already restored the browser selection to the heading. In the current `/Users/jun/Developer/new` VS Code Insiders window, repeated smoke verification showed:

```text
Expected:
# Wikilink Smoke
[[1]]

Observed:
# 1Wikilink Smoke
[[]]
```

This means the active edit target is not owned by a stable source transaction. DOM mutation observers, caret guards, and leaked-text repair are fallback patches, not a robust autocomplete architecture.

## Design

### Source Transaction Core

Create a source-first helper module:

```text
resource/vditor/wikilink-source-transaction.js
```

Responsibilities:

- Compute cursor-aware source contexts.
- Pair the second `[` into `[[]]`.
- Wrap selected text as `[[selected]]`.
- Detect active `[[query` / `[[query]]` contexts.
- Apply a selected candidate into the active context.
- Return `{ value, selectionStart, selectionEnd }` only; do not mutate DOM.

Core exported helpers:

```js
createWikilinkPairTransaction(value, selectionStart, selectionEnd, key)
pairMarkdownInsertedBracket(previous, next)
isMarkdownInsertedWikilinkPair(previous, next)
findWikilinkCompletionContext(value, position)
applyWikilinkCompletion(value, context, target)
insertPrintableIntoWikilinkContext(value, context, text)
filterWikilinkCompletionTargets(query, targets, limit)
isSupportedWikilinkAuthoringTarget(value, position)
```

`findWikilinkCompletionContext()` must support both open and closed active
contexts:

- `[[a` at cursor position returns `{ open, close: null, bodyStart, bodyEnd: position, query: "a" }`.
- `[[a]]` with the cursor inside the body returns `{ open, close, bodyStart, bodyEnd, query }`.

This is the Vditor/WebView equivalent of CodeMirror's `CompletionResult.from`
and Obsidian's `EditorSuggestTriggerInfo.start/end/query`. Waiting for a
closing `]]` before showing candidates is a bug.

`applyWikilinkCompletion()` must use explicit suffix rules:

- Closed context (`[[Da]]`): replace the body only and keep the existing single
  closing `]]`.
- Open context (`[[Da`): replace the active query and append exactly one
  closing `]]`, producing `[[Daily Note]]`.

`insertPrintableIntoWikilinkContext()` is the source-only replacement for the
old leaked-DOM-text path. Given an active source context and printable text, it
inserts inside the wikilink body and returns the new source plus cursor. Any
legacy `moveLeakedPrintableIntoEmptyWikilink()` export is compatibility-only,
not the main flow.

### Adapter Layer

Keep the mutation boundaries explicit:

```text
Textarea adapter
  -> textarea.value / selectionStart / selectionEnd

Vditor source adapter
  -> latestMarkdownContent / editor.setValue() / handler.emit("save")
```

Vditor Live Preview/IR/WYSIWYG should no longer treat the contenteditable DOM as authoritative. DOM can still be used for:

- popup anchor geometry,
- rendered wikilink boundary reveal,
- final visual post-processing.

It must not be the primary text mutation model for `[[` pairing.

Live Preview must keep an active source selection state after pairing:

```text
{ selectionStart, selectionEnd, context }
```

When a printable key is entered while this source selection is active, the
controller prevents the browser/contenteditable edit and applies a source
transaction to `latestMarkdownContent`. This avoids the observed failure where
the next character lands in the heading DOM (`# 1Wikilink Smoke`) while the
source still contains `[[]]`.

`setupWikilinkAuthoring()` gains explicit source-selection hooks:

```js
getActiveSourceSelection()
setActiveSourceSelection(selection)
clearActiveSourceSelection()
applySourceTransaction(transaction)
```

`resource/vditor/index.js` remains the owner of canonical source. The authoring
controller requests a transaction, and `index.js` commits it through
`latestMarkdownContent`, `editor.setValue()`, and `handler.emit("save")`.
The active selection is cleared when the user clicks outside the active
wikilink, chooses a completion, leaves the body context, or closes the popup.

### WebView Controller

Refactor:

```text
resource/vditor/wikilink-authoring.js
```

into:

- thin event binding,
- popup rendering and keyboard navigation,
- adapter calls into `wikilink-source-transaction.js`,
- rendered-link boundary reveal.

Remove or demote these current fallback paths:

- long chains of `completeOpen()` retries,
- pending empty-wikilink DOM snapshot repair,
- heading leak repair as a primary path,
- continuous or bounded caret guard loops,
- text-node mutation as the first mutation strategy.

Fallbacks may remain only as narrow safety nets and must not be required for the main `[[a` flow.

The existing `completeOpen()` return contract must stay available for
`resource/vditor/index.js`, but it should call the source transaction path first
and only then run visual refresh/reveal code. The implementation must remove the
current overlapping repair loops from the primary path:

1. `index.js` input leak repair / `pendingEmptyWikilinkSource`.
2. `wikilink-authoring.js` DOM leak guard / mutation observer repair.
3. provider-level `normalizeWikilinkOpenPair()` as normal behavior.

`normalizeWikilinkOpenPair()` may remain only as a last-resort save safety net
for a raw dangling `[[` with an empty body.

`resource/vditor/index.js` keeps a source-level diff adapter because Vditor
`input(content)` sometimes sees only before/after Markdown strings rather than
a precise DOM caret. That adapter must import or re-export:

- `pairMarkdownInsertedBracket(previous, next)`
- `isMarkdownInsertedWikilinkPair(previous, next)`

Those helpers belong in `wikilink-source-transaction.js`, not in the DOM
authoring controller.

Live Preview suggestions must read context from canonical source when
`activeSourceSelection` exists. They must not depend on
`findTextNodeWikilinkContext()` for the `[[a` popup pass case.

### Host Integration

`src/provider/markdownEditorProvider.ts` already sends:

- `wikilinkIndex`,
- `wikilinkCompletionTargets`,
- `updateWikilinkCompletionTargets`.

Keep this path. The WebView must use `wikilinkCompletionTargets` for candidate labels so it matches native VS Code wikilink completion and closest-path resolver policy.

### Native VS Code Editor

Keep and harden:

```text
src/provider/wikilink/wikilinkCompletionProvider.ts
```

This provider handles VS Code's default raw text editor only. It should continue to use `CompletionItem.range` and `insertText`; it is not a replacement for WebView completion.

## Planned File Changes

### NEW

```text
/Users/jun/Developer/new/700_projects/code-office/resource/vditor/wikilink-source-transaction.js
```

Pure helpers for source-level pairing, context detection, completion application, and target filtering.

### MODIFY

```text
/Users/jun/Developer/new/700_projects/code-office/resource/vditor/wikilink-authoring.js
```

Replace DOM/caret repair-first logic with adapter-driven source transactions. Keep popup and rendered wikilink source-reveal behavior.
Re-export compatibility helper names from the new source module where tests or
legacy imports still need them.

```text
/Users/jun/Developer/new/700_projects/code-office/resource/vditor/index.js
```

Route Vditor input through source transaction helpers. Remove provider-level leak repair as a primary flow. Keep `latestMarkdownContent` as the canonical source mirror.
Track the active source selection produced by a pair transaction and pass it to
`setupWikilinkAuthoring()` so printable text after `[[]]` is inserted into the
source body instead of the contenteditable heading.

```text
/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkAuthoringTest.mjs
```

Replace DOM leak-repair assertions with source transaction assertions and popup/context behavior checks.

```text
/Users/jun/Developer/new/700_projects/code-office/src/provider/markdownEditorProvider.ts
```

Demote `normalizeWikilinkOpenPair()` to an explicit save safety net only. The
WebView source-transaction path must not rely on provider save normalization for
ordinary `[[` pairing or `[[a` typing.

```text
/Users/jun/Developer/new/700_projects/code-office/structure/07-wikilink-authoring-autocomplete-research.md
```

Record the architecture correction: source transaction replaces DOM/caret repair as the main model.

```text
/Users/jun/Developer/new/700_projects/code-office/CHANGELOG.md
/Users/jun/Developer/new/700_projects/code-office/package.json
/Users/jun/Developer/new/700_projects/code-office/package-lock.json
```

Bump version after implementation and verification.

### OPTIONAL MODIFY

```text
/Users/jun/Developer/new/700_projects/code-office/src/provider/wikilink/wikilinkCompletionProvider.ts
```

Only if audit shows the native editor completion range should be aligned with the new source transaction helpers.

## Test Plan

### Unit

Run:

```bash
npm run test:wikilink-authoring
npm run test:markdown
```

Required assertions:

- `[` then `[` transforms source to `[[]]`.
- Cursor is `bodyStart`.
- selected text wraps as `[[selected]]`.
- `[[a` context returns `query = "a"`.
- `[[a]]` context keeps replacement body-only.
- selected suggestion returns exactly `[[Target]]`.
- duplicate candidates are deduped and sorted.
- fenced code blocks, tilde fences, and inline code are ignored by source helper where determinable.
- the source helper can insert printable text into an active `[[]]` context without depending on DOM selection.

### Static / Package

Run:

```bash
npm run typecheck
npm run package:verify
```

### Manual / Computer Use

Use the current VS Code Insiders `NEW` workspace rooted at:

```text
/Users/jun/Developer/new
```

Smoke file:

```text
/Users/jun/Developer/new/.tmp/wikilink-smoke.md
```

Pass cases:

- `[[1` results in `[[1]]`, not `# 1Wikilink Smoke` plus `[[]]`.
- `[[a` shows a suggestion popup when matching Markdown notes exist.
- Clicking/Enter on a suggestion applies exactly one `[[Target]]`.
- Raw Source mode repeats the same behavior.

## Risk Controls

- Do not use no-folder windows for UI verification.
- Do not depend on WebView DOM selection as the canonical source of truth.
- Keep native VS Code completion and WebView completion separated.
- Keep fallback DOM repair narrow enough that failure of fallback does not break the main path.
- Commit after a passing local + current-window verification bundle.
