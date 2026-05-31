# Phase 3 Click/Link Correctness Plan

Date: 2026-05-31
Scope: Phase 3 only
Project root: /Users/jun/Developer/new/700_projects/code-office

## 1. Summary

This phase closes the user-visible wikilink click problems before Phase 3 is documented as complete.
The markdown webview currently opens and renders, but the click path still mixes ordinary Markdown links with wikilinks, leaves heading/block navigation unwired, and can accumulate duplicate DOM observers.
This plan fixes click routing, block-link display/unresolved state, post-processing lifecycle, provider listener disposal, and targeted E2E coverage for the markdown/HWP smoke paths.
Phase 4 PPTX, Phase 5 CJK, and Phase 6 Excel are intentionally out of scope for this PABCD cycle.

## 2. Current Evidence

The 10-agent audit found the following blockers:

- `resource/vditor/util.js` routes IR-mode non-http Markdown links through `openWikilink`.
- `resource/vditor/util.js` does not strip `^blockId` for unresolved/display logic.
- `resource/vditor/index.js` calls `installMarkdownPostProcessing()` on every `updateWikilinkIndex`.
- `src/service/wikilink/wikilinkResolver.ts` defines `revealHeading()` and `revealBlock()` but `open()` never invokes them.
- `src/provider/markdownEditorProvider.ts` registers `wikilinkIndex.onDidChange()` per editor without disposing the returned subscription.
- Computer Use QA confirmed markdown custom editor and HWP custom editor load in VS Code Insiders, but wikilink coordinate click did not navigate reliably.

## 3. Planned File Changes

### MODIFY

```path
/Users/jun/Developer/new/700_projects/code-office/resource/vditor/util.js
```

Planned changes:

- Add an idempotent post-processing installer with one module-level `MutationObserver`.
- Add `runMarkdownPostProcessing()` so index updates can refresh without installing another observer.
- Add helpers:
  - `isWikilinkBody(value)`
  - `stripWikilinkFragment(body)`
  - `displayWikilink(body)` updated to remove aliases, headings, and block IDs correctly.
- Export the pure helpers needed by the Phase 3 Node harness. The exported helpers must not touch `document`, `navigator`, `handler`, or any browser-only global.
- Change IR link marker fallback so only real `[[...]]` marker bodies route to `openWikilink`.
- During CU/browser inspection, confirm IR marker `textContent` is actually wrapped as `[[...]]`; if Vditor exposes only the inner body, update `isWikilinkBody`/routing tests before closing Phase 3.
- Ordinary relative links, anchors, mailto links, images, and local files continue through `openLink`.
- Preserve the existing click feedback pulse/opening classes.

Before:

```js
if (href && !href.match(/^https?:\/\//)) {
    markWikilinkOpening(ele);
    handler.emit("openWikilink", { body: href });
    return;
}
```

After:

```js
if (isWikilinkBody(href)) {
    markWikilinkOpening(ele);
    handler.emit("openWikilink", { body: href.slice(2, -2) });
    return;
}
handler.emit("openLink", href);
```

Before:

```js
export function installMarkdownPostProcessing() {
    const run = () => { repairRenderedInlineMarkdown(); markRenderedWikilinks(); };
    run();
    const observer = new MutationObserver(run);
    document.querySelectorAll('.vditor-preview, .vditor-ir')
        .forEach(element => observer.observe(element, { childList: true, subtree: true, characterData: true }));
}
```

After:

```js
let markdownPostProcessingObserver;

export function runMarkdownPostProcessing() {
    repairRenderedInlineMarkdown();
    markRenderedWikilinks();
}

export function installMarkdownPostProcessing() {
    runMarkdownPostProcessing();
    if (markdownPostProcessingObserver) return;
    markdownPostProcessingObserver = new MutationObserver(runMarkdownPostProcessing);
    document.querySelectorAll('.vditor-preview, .vditor-ir')
        .forEach(element => markdownPostProcessingObserver.observe(element, { childList: true, subtree: true, characterData: true }));
}
```

### MODIFY

```path
/Users/jun/Developer/new/700_projects/code-office/resource/vditor/index.js
```

Planned changes:

- Import `runMarkdownPostProcessing`.
- On `updateWikilinkIndex`, call `setWikilinkIndex(list)` then `runMarkdownPostProcessing()`.
- Keep `installMarkdownPostProcessing()` only in the Vditor `after()` lifecycle.

Before:

```js
handler.on("updateWikilinkIndex", (list) => {
  setWikilinkIndex(list);
  installMarkdownPostProcessing();
});
```

After:

```js
handler.on("updateWikilinkIndex", (list) => {
  setWikilinkIndex(list);
  runMarkdownPostProcessing();
});
```

### MODIFY

```path
/Users/jun/Developer/new/700_projects/code-office/src/provider/markdownEditorProvider.ts
```

Planned changes:

- Store the disposable returned by `wikilinkIndex.onDidChange`.
- Dispose it when the webview panel is disposed.
- Harden `openLink` event handling so extension-host parsing errors surface through `Output.debug` instead of silent promise loss.
- Add optional `reveal` event handling if the resolver sends webview navigation hints for same-document heading/block navigation.

Before:

```ts
if (this.wikilinkIndex) {
    this.wikilinkIndex.onDidChange(async () => {
        const index = await this.wikilinkIndex!.get(uri);
        handler.emit("updateWikilinkIndex", index);
    });
}
```

After:

```ts
const wikilinkIndexSubscription = this.wikilinkIndex?.onDidChange(async () => {
    const index = await this.wikilinkIndex!.get(uri);
    handler.emit("updateWikilinkIndex", index);
});
handler.panel.onDidDispose(() => wikilinkIndexSubscription?.dispose());
```

### MODIFY

```path
/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkResolver.ts
```

Planned changes:

- Route heading/block reveal after target resolution.
- For custom markdown editor targets, use a conservative first pass:
  - open target in `cweijan.markdownViewer`
  - if heading/block exists, also open/reveal the same document in the text editor only when the active visible text editor is available for reliable VS Code reveal, or document the limitation if custom webview cannot reveal.
- Tighten unsafe target filtering for URI schemes so `[[https://...]]`, `[[mailto:...]]`, and `[[vscode://...]]` are not offered as note creation targets.
- Keep workspace boundary checks.

Before:

```ts
if (MARKDOWN_EXTENSIONS.has(ext)) {
    await vscode.commands.executeCommand('vscode.openWith', target, 'cweijan.markdownViewer');
}
```

After:

```ts
if (MARKDOWN_EXTENSIONS.has(ext)) {
    await vscode.commands.executeCommand('vscode.openWith', target, 'cweijan.markdownViewer');
    await this.revealFragment(target, link);
}
```

Implementation detail:

- `revealFragment()` will open the text document in a non-destructive editor reveal path only for `link.heading` / `link.blockId`.
- If custom webview-level reveal is unavailable in this phase, Phase 3 completion will state that heading/block click opens the note and text-editor reveal is used for exact location.

### ADD

```path
/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkPhase3Test.mjs
```

Purpose:

- Provide a lightweight Node regression harness for pure string-level Phase 3 behavior without adding a new test framework.
- Import the exported pure helpers from `resource/vditor/util.js` instead of duplicating the algorithms in the test file.
- The test may only exercise helper functions that are browser-global free; importing `util.js` in Node must not require `document`, `MutationObserver`, `navigator`, `window`, or `handler` at module evaluation time.
- Assert:
  - block IDs are stripped for display/unresolved target keys.
  - ordinary Markdown link hrefs are not classified as wikilinks.
  - `[[Note]]`, `[[Note#Heading]]`, `[[Note^block]]`, `[[Note#Heading^block]]`, and `[[Alias Target|Alias]]` remain wikilink bodies.
  - IR marker routing converts `[[Note]]` to `Note` before emitting `openWikilink`.

### MODIFY

```path
/Users/jun/Developer/new/700_projects/code-office/package.json
```

Planned changes:

- Add a focused script:

```json
"test:wikilink-phase3": "node src/test/wikilinkPhase3Test.mjs"
```

The existing release scripts remain unchanged in this phase.

## 4. Verification Plan

Static verification:

```bash
cd /Users/jun/Developer/new/700_projects/code-office
npm run test:wikilink-phase3
npm run typecheck
npm run build
```

Packaging smoke not required for every Phase 3 code edit, but if webview bundle output changes unexpectedly:

```bash
cd /Users/jun/Developer/new/700_projects/code-office
node scripts/verify-vsix.mjs
```

Expected current caveat:

- `verify-vsix.mjs` currently requires `.vscodeignore` to include `DEVELOPMENT_LOG.md` per `/Users/jun/Developer/new/700_projects/code-office/scripts/verify-vsix.mjs`. That release packaging rule is a separate release-gate fix and not part of this phase unless it blocks build verification.

Manual/CU E2E:

- Use VS Code Insiders app id `com.microsoft.VSCodeInsiders`.
- Open `/Users/jun/Developer/new/700_projects/code-office/structure/00-structure-hub.md`.
- Verify markdown custom editor loads.
- Verify rendered wikilink click/double-click opens the target note.
- Verify ordinary relative Markdown links do not trigger create-note flow.
- Verify unresolved wikilink shows feedback and create prompt; cancel in read-only repo.
- Open `/Users/jun/Developer/new/700_projects/code-office/resource/rhwp-studio/samples/basic/KTX.hwp` and verify HWP editor still loads. Do not save repo fixture.
- HWP smoke depends on local sample fixtures under `/Users/jun/Developer/new/700_projects/code-office/resource/rhwp-studio/samples/`, which are intentionally excluded from VSIX packaging. If the sample path is missing on a clean checkout, use the same local fixture prerequisite as `/Users/jun/Developer/new/700_projects/code-office/scripts/verify-hwp-hardening.mjs` rather than treating it as a Phase 3 code failure.

## 5. Out Of Scope

- Phase 4 PPTX fixture/performance work.
- Phase 5 Markdown CJK fixture and rendering fixes.
- Phase 6 Excel strikethrough fixture/import/export checks.
- Release/public docs Marketplace CTA fixes.
- Dependency audit remediation.
- Reverting or committing the existing dirty HWP sample.

## 6. Rollback Plan

- All changes are scoped to webview click processing, markdown provider listener lifecycle, wikilink resolver, one test script, and one package script.
- If manual QA reveals custom-editor heading/block reveal causes focus churn, keep file-open behavior and document exact anchor reveal as deferred to a later custom-webview scroll protocol.
