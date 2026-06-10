# Wikilink Resolution And Autocomplete Closure

Status: archived to `_fin` on 2026-06-10. This long-running authoring/autocomplete history is superseded by the later `260608_markdown_wikilink_obsidian_qa` closure and release/runtime QA evidence.

## Context

This plan closes the remaining Obsidian-style wikilink gaps reported on 2026-06-01:

1. `[[Name]]` without an explicit extension must be treated as a Markdown note target, so leaving or blurring the token renders a wikilink instead of dropping the brackets and leaving plain text.
2. `[[Name.pdf]]`, `[[Name.docx]]`, or any other explicit non-Markdown extension must stay raw text and must not become a code-office wikilink.
3. Same-name Markdown files must resolve automatically to the nearest file by path distance, following the project direction for Obsidian-like closest-note behavior. The user must not be asked to pick unless a later explicit policy changes this.
4. The earlier `[[` authoring/autocomplete plan must be carried forward here instead of staying only as research.
5. 2026-06-04 follow-up: the WebView authoring module existed, but the first `open` payload could still send an empty `wikilinkCompletionTargets` list and rely on a later async update. That made the popup appear missing when a user typed `[[` immediately after opening a note.
6. 2026-06-04 source-transaction correction: repeated current-window smoke
   failures showed that DOM/caret repair can still let Vditor leak the next
   printable key into the heading after `[[]]` is created. The follow-up plan
   in `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260604_wikilink_source_transaction/00_context7_source_transaction_plan.md`
   replaces the main authoring path with canonical Markdown source
   transactions modeled after Obsidian/CodeMirror completion controllers.

## Existing Plan And Research Sources

- `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260524_vscode_obsdian_baseline/02_phase_02_obsidian_closest_wikilinks.md`
- `/Users/jun/Developer/new/700_projects/code-office/structure/07-wikilink-authoring-autocomplete-research.md`
- Obsidian Help, Settings: "New link format" includes "Shortest path when possible", "Relative path to file", and "Absolute path in vault".
- Obsidian Help, Internal links: wikilinks support `[[Example]]`, `[[Example.md]]`, fragments, and aliases.

## Current Code Facts

- `src/service/wikilink/wikilinkParser.ts` currently parses any `[[...]]` body that is non-empty, including explicit non-Markdown extensions.
- `resource/vditor/util.js` currently renders any `[[...]]` text node into a `[data-wikilink]` span, except embeds.
- `src/service/wikilink/wikilinkResolver.ts` currently resolves Markdown files, but same-name basename links can still prompt a QuickPick instead of always choosing the nearest candidate.
- `resource/vditor/wikilink-authoring.js` already implements `[[` pair insertion, suggestions, and rendered-link raw source reveal, but it does not centralize target validity for non-Markdown explicit extensions.
- `src/provider/markdownEditorProvider.ts` now awaits `WikilinkIndex.get(uri)` and `WikilinkResolver.completionTargets(uri)` before emitting the initial WebView `open` payload, while preserving the later incremental `updateWikilinkIndex` and `updateWikilinkCompletionTargets` messages.

## Implementation Plan

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkParser.ts`

- Add exported helpers:
  - `isSupportedWikilink(link: ParsedWikilink): boolean`
  - `isSupportedWikilinkBody(body: string, embed?: boolean): boolean`
  - `hasExplicitNonMarkdownExtension(target: string): boolean`
- Treat heading-only and block-only wikilinks as supported.
- Treat no-extension targets as Markdown note targets.
- Treat `.md` and `.markdown` targets as supported.
- Treat any other explicit extension as unsupported, so `findWikilinks()` and native VS Code DocumentLink behavior leave it as raw text.
- Use `isSupportedWikilinkBody()` inside `parseWikilinkBody()` so every host call site receives `undefined` for unsupported explicit non-Markdown links.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/util.js`

- Mirror the same target-validity rule on the WebView side.
- Export `isSupportedWikilinkBody(body: string): boolean` from the WebView utility for parity tests.
- Keep `![[embed]]` out of scope.
- Keep `[[#Heading]]` and `[[^block]]` supported.
- Render `[[Name]]`, `[[Name.md]]`, and `[[folder/Name]]`.
- Leave `[[Name.pdf]]`, `[[Name.docx]]`, and other non-Markdown extension targets as literal raw text.
- Ensure click/open detection also ignores unsupported explicit non-Markdown targets.
- Wire the new helper through all raw matching paths:
  - `findWikilinkInTextNode()`
  - `findWikilinkByRangeAtPoint()`
  - `isWikilinkBody()`
  - the IR marker click path that reads marker text as `[[...]]`
- Explicitly route blur/caret-exit rendering through the normal `refresh() -> runMarkdownPostProcessing()` path for newly typed `[[Name]]`; forced collapse remains limited to revealed rendered-link text nodes.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/wikilink-authoring.js`

- Filter autocomplete targets through Markdown-note-only targets if needed.
- Keep pair insertion for `[[` unchanged.
- Preserve current code/inline-code protection.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/src/provider/markdownEditorProvider.ts`

- Send `wikilinkCompletionTargets` in the initial `open` payload, not only as a later async update.
- Await `wikilinkIndex.get(uri)` so unresolved-link rendering and authoring suggestions are initialized from the same completed index snapshot.
- Keep incremental update messages after file watcher changes so new/deleted notes refresh without reopening the editor.
- Log init/reload payload errors with `Output.debug()` so an async indexing failure does not silently strand the WebView before `open`.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkResolver.ts`

- Reuse parser target-validity helpers before opening or resolving.
- Export pure helpers:
  - `directoryDistance(fromDir: string, toDir: string): number`
  - `rankWikilinkCandidates(workspaceRoot: string, sourceDir: string, files: string[], target: string): RankedWikilinkCandidate[]`
- Define `RankedWikilinkCandidate` as `{ fsPath: string; relative: string; label: string; score: number }`.
- Auto-pick the first sorted nearest candidate for all valid Markdown note candidates instead of prompting.
- Keep direct explicit relative path resolution first.
- Keep export/open parity: both `resolve()` and `resolveExportTarget()` use the same candidate ordering.
- Keep missing note creation only for supported Markdown targets.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/src/service/markdown/markdown-pdf.js`

- Gate `markdownItWikilink()` and `parseWikilinkExportBody()` with the same explicit non-Markdown-extension policy.
- Keep `[[Note]]`, `[[Note.md]]`, `[[folder/Note]]`, `[[#Heading]]`, and `[[^block]]` export behavior.
- Leave `[[Note.pdf]]`, `[[Note.docx]]`, and other explicit non-Markdown extension targets as raw text in exported HTML/PDF/DOCX flows.
- Add export-path regression coverage through the existing Markdown test file instead of introducing a second export parser.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkPhase3Test.mjs`

- Add assertions:
  - `[[Note]]` is a valid wikilink body.
  - `[[Note.md]]` is a valid wikilink body.
  - `[[folder/Note]]` is a valid wikilink body.
  - `[[Note.pdf]]` is not a valid wikilink body.
  - `[[Note.docx]]` is not a valid wikilink body.
- Add WebView parity assertions through the exported `resource/vditor/util.js` helper.

### ADD `/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkParserTest.mjs`

- Import the TypeScript parser by bundling it with `esbuild`, following the existing test pattern used by `src/test/pptxPhase4Test.mjs`.
- Verify host parser policy:
  - `parseWikilinkBody('Note')` returns a parsed link.
  - `parseWikilinkBody('Note.md')` returns a parsed link.
  - `parseWikilinkBody('folder/Note')` returns a parsed link.
  - `parseWikilinkBody('Note.pdf')` returns `undefined`.
  - `findWikilinks('[[Note.pdf]] [[Note]]')` returns only `[[Note]]`.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkAuthoringTest.mjs`

- No behavior change is required in `wikilink-authoring.js` unless implementation shows host-fed targets are not Markdown-only. Existing host `completionTargets()` already lists Markdown files only.
- Preserve existing pair insertion and selection wrapping assertions.

### ADD `/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkResolverTest.mjs`

- Add focused resolver scoring tests with the newly exported pure helpers, avoiding VS Code UI.
- Verify nearest-path ordering for duplicate basenames:
  - source `/vault/a/current.md`
  - candidates `/vault/a/Note.md`, `/vault/b/Note.md`
  - nearest result sorts first.
- Verify explicit path still wins where valid.
- Verify deterministic tie fallback by shortest relative label, then locale order.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/package.json`

- Add `test:wikilink-parser` and `test:wikilink-resolver` to the Markdown test chain.
- Bump package version only after the implementation passes local and Insiders smoke.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/CHANGELOG.md`

- Add a release note for the wikilink resolver/rendering policy after verification.

## Verification Plan

### 2026-06-04 Insiders Workspace Follow-up

- A temporary no-folder VS Code window is not valid for wikilink authoring verification. The autocomplete source is the workspace Markdown note index, so Computer Use smoke must target the already-open VS Code Insiders window for `/Users/jun/Developer/new`, with `/Users/jun/Developer/new/.tmp/wikilink-smoke.md` open in that same workspace.
- `3.7.19` still reproduced raw `[[` in that current `new` workspace window. `3.7.20` added an active `.vditor-reset` root fallback and delayed Vditor input retries, but still reproduced raw `[[`. `3.7.21` completed from the concrete text-node candidate before relying on selection/root heuristics, but still reproduced raw `[[` in the actual Insiders workspace smoke. `3.7.22` added Markdown source-diff repair and a pending-bracket capture fallback for the second `[` key, but still reproduced raw `[[` after a clean Insiders reload. `3.7.23` added a Vditor text MutationObserver fallback for the cases where keyboard/input events do not reach the authoring hook. `3.7.24` keeps the caret inside the new empty `[[]]` body across Vditor post-insert rerenders. `3.7.25` covers the source diff observed in the current Insiders window where Vditor reports `[[` as one batched two-character Markdown insertion instead of two separate one-character edits. `3.7.27` adds the final source repair fallback for the actual failure mode: if Vditor has already accepted raw `[[` into the editor source, the authoring hook reads `editor.getValue()`, rewrites the raw unclosed open to `[[]]`, emits the corrected save value, and restores caret focus inside the empty wikilink body. `3.7.28` adds the host-side provider safety net: if the WebView still emits raw `[[`, the Markdown provider normalizes the save payload to `[[]]` and sends the corrected value back to the same WebView. In the actual current `/Users/jun/Developer/new` Insiders window, `3.7.28` proved pair completion but failed caret placement: the next typed character went into the heading. `3.7.29` removed duplicate `editor.setValue()` for already-completed `[[]]` content, but the actual Insiders WebView still restored selection to the heading before the next printable key. `3.7.30` adds a printable-key guard: while an empty `[[]]` body exists, the keydown path restores caret placement into that body immediately before the key is inserted.
- In the current `/Users/jun/Developer/new` Insiders window, `3.7.30` still failed after a fresh installed VSIX smoke: `[[` became `[[]]`, but pressing `1` inserted into the heading as `# 1Wikilink Smoke`. `3.7.31` changes the printable-key guard from focus-only routing to direct insertion: it prevents the leaking printable key, focuses the empty wikilink body, inserts the character there, dispatches an input event, refreshes post-processing, and opens the authoring popup.
- In the same current Insiders window, `3.7.31` still failed because the guard skipped manual insertion when the DOM selection appeared to be inside the empty `[[]]` body, even though the browser default key insert still leaked to Vditor's restored heading target. `3.7.32` removes that exception: while any empty `[[]]` body exists, the next printable key is always handled by the wikilink authoring layer and never left to the browser default insertion path.
- In the current `/Users/jun/Developer/new` Insiders workspace window, `3.7.32` still failed: `[[` became `[[]]`, but pressing `1` produced `# 1Wikilink Smoke` while the empty pair stayed below the heading. The remaining root cause is that `execCommand('insertText')` can still apply to Vditor's restored heading target even after the authoring layer moves the DOM selection. `3.7.33` removes that dependency by directly mutating the first empty `[[]]` text node to `[[1]]`, restoring the caret after the inserted character, and dispatching an input event from the edited node.
- In the same current window, `3.7.33` still failed, which proves the digit insertion path is not reliably won by the keydown-only handler in this WebView/Vditor stack. `3.7.34` adds the same direct empty-body mutation at the `beforeinput` boundary for non-bracket printable text so the browser's pending insert is prevented before Vditor can apply it to the restored heading target.
- In the current `/Users/jun/Developer/new` workspace window, `3.7.34` still failed after installed-VSIX reload: the blank-line pair existed as `[[]]`, but pressing `1` produced `# 1Wikilink Smoke` while leaving the empty pair below. `3.7.35` moves this fallback to the Vditor Markdown source boundary: if the previous source had `[[]]`, the next source still has `[[]]`, and the diff is exactly one printable non-bracket character inserted somewhere else, the input pipeline removes that leaked character and saves the repaired source with the character inside the first empty wikilink body.
- In the same current workspace window, `3.7.35` still failed. That indicates the mutable `latestMarkdownContent` value was not a reliable pre-leak baseline by the time the Vditor input callback observed the leaked value. `3.7.36` records a separate `pendingEmptyWikilinkSource` at the exact moment `[[]]` is created and uses that pending baseline for the next printable-character leak repair.
- In the same current workspace window, `3.7.36` still failed and the disk file remained unchanged, proving the defect was inside the unsaved WebView DOM path rather than the host save payload. `3.7.37` adds a DOM-mutation repair: after `[[]]` creation, it snapshots editable text and moves the next single leaked printable DOM character into the first empty wikilink body when the aggregate text diff matches the observed failure pattern.
- In the same current workspace window, `3.7.37` still failed because the observer only entered the repair path for mutations that also looked like an inserted raw `[[`. The actual next-key failure is a plain heading characterData mutation after `[[]]` already exists. `3.7.38` tries pending empty-wikilink DOM leak repair on every observed edit mutation before raw-open completion, then routes the removed leaked character into the first empty wikilink body.
- In the same current workspace window, `3.7.38` still failed, proving the leak can escape the normal keydown, beforeinput, input, and observer timing paths. `3.7.39` starts a short polling repair window after `[[]]` creation. While the just-created empty pair remains, any one-character printable DOM leak is repaired into the empty wikilink body even when no reliable event callback catches it first.
- In the same current workspace window, `3.7.39` still failed: after `[[`, the blank line showed `[[]]`, but pressing `1` changed the heading to `# 1Wikilink Smoke`. That proves Vditor can restore the caret to the heading between pair creation and the next printable key. `3.7.40` adds a pending-empty-wikilink caret guard that keeps selection inside the empty body while the pair remains, and keeps the leak repair as a fallback if the wrong text node mutates first.
- `3.7.40` made the right behavioral move but used continuous timers, which can make the already-open Insiders window stop responding to Accessibility/Computer Use while `[[]]` is pending. `3.7.41` keeps the caret guard and DOM leak repair behavior but changes both to bounded retry timers only. This preserves the target current-window behavior without a persistent WebView selection loop.
- Control/Computer Use current-window smoke still failed on `3.7.41`, showing `# 1Wikilink Smoke` plus `[[]]`. The root timing issue is that the pending empty-wikilink baseline can be delayed until after Vditor has already restored selection. `3.7.42` captures the editable DOM snapshot synchronously at pair creation and calls the empty-body caret keeper from the direct `[[` pairing paths.

1. Plan audit employee must PASS.
2. Code verification employee must PASS after implementation.
3. Run:
   - `npm run test:markdown`
   - `npm run release:local`
4. Verify export path:
   - `[[Note.pdf]]` remains raw text in Markdown export tests.
   - `[[Note]]` still exports as a normal wikilink anchor.
5. Install the generated VSIX into current VS Code Insiders.
6. Reload VS Code Insiders.
7. Computer Use smoke:
   - `[[NoExtNote]]` renders as a wikilink after caret leaves.
   - `[[NoExtNote.md]]` renders as a wikilink after caret leaves.
   - `[[SomeFile.pdf]]` stays raw text.
   - duplicate `[[SameName]]` opens the nearest Markdown file without QuickPick.

## Success Criteria

- The plan audit reports PASS.
- The implementation verification reports DONE/PASS.
- Each topic above has at least one passing code-level test or Computer Use smoke.
- No non-Markdown explicit extension is silently converted into a wikilink.
- Current VS Code Insiders loads the fixed VSIX and passes the smoke path.
