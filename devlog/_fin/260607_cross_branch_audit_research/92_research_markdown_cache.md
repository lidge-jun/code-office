# Research 92 — Markdown Wikilink Cache Audit

Branch: `main`
Worktree: `/Users/jun/Developer/new/700_projects/code-office`

## Verdict

**PASS.**

The Markdown open-speed root fix is implemented on `main` and has the strongest
evidence trail among the three audited areas. The hot path no longer needs to
wait for broad `workspace.findFiles()` discovery before sending the initial open
payload to the WebView.

## Root Cause Restated

Before the fix, opening a Markdown document could call:

```text
MarkdownEditorProvider open payload
  -> WikilinkResolver.completionTargets(uri)
  -> listMarkdownFiles(workspaceFolder)
  -> WikilinkIndex.listFiles(folder)
  -> vscode.workspace.findFiles(...)
```

In a large workspace this made Markdown open feel slow because opening one file
could wait on broad Markdown file discovery.

## Evidence

Initial open payload:

- `/Users/jun/Developer/new/700_projects/code-office/src/provider/markdownEditorProvider.ts:99`
  builds the initial payload.
- `/Users/jun/Developer/new/700_projects/code-office/src/provider/markdownEditorProvider.ts:105`
  reads `wikilinkIndex.getCached(uri)`.
- `/Users/jun/Developer/new/700_projects/code-office/src/provider/markdownEditorProvider.ts:106`
  reads `wikilinkResolver.completionTargetsCached(uri)`.
- `/Users/jun/Developer/new/700_projects/code-office/src/provider/markdownEditorProvider.ts:142`
  emits the open payload.
- `/Users/jun/Developer/new/700_projects/code-office/src/provider/markdownEditorProvider.ts:145`
  starts async refresh after initial open.

Index ownership:

- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkIndex.ts:56`
  exposes `getFiles(folder)`.
- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkIndex.ts:57`
  waits for readiness.
- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkIndex.ts:58`
  returns `getCachedFiles(folder)`.
- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkIndex.ts:70`
  keeps broad scanning isolated in `scanFiles(folder)`.
- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkIndex.ts:76`
  uses scan during index build/rebuild.

Resolver behavior:

- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkResolver.ts:123`
  starts Markdown file listing.
- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkResolver.ts:124`
  uses `index.getFiles(folder)` when an index is attached.
- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkResolver.ts:125`
  keeps `workspace.findFiles()` only for no-index fallback.
- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkResolver.ts:139`
  exposes `completionTargetsCached(sourceUri)`.
- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkResolver.ts:145`
  reads `index.getCachedFiles(workspaceFolder)`.

Production wiring:

- `/Users/jun/Developer/new/700_projects/code-office/src/extension.ts:30`
  constructs `WikilinkIndex`.
- `/Users/jun/Developer/new/700_projects/code-office/src/extension.ts:31`
  constructs `WikilinkResolver`.
- `/Users/jun/Developer/new/700_projects/code-office/src/extension.ts:32`
  attaches the index with `wikilinkResolver.setIndex(wikilinkIndex)`.
- `/Users/jun/Developer/new/700_projects/code-office/src/extension.ts:34`
  passes resolver and index into `MarkdownEditorProvider`.

Existing verification:

- `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260605_markdown_wikilink_cache/03_verification.md`
  records `npx tsc --noEmit`, `npm run test:wikilink-resolver`,
  `npm run typecheck`, `npm run test:markdown`, `npm run test:ci`,
  `npm run build`, `npm run release:local`, VSIX install into VS Code
  Insiders, and a 1,001-file runtime smoke.

## Findings

### 1. Open path is no longer blocked by broad scan

The open payload now uses cached snapshots. If the cache is not ready, the editor
can still open with empty/stale wikilink metadata and receive fresh data later.

### 2. Broad scan is still present, but moved to the right owner

`workspace.findFiles()` still exists, but only in:

- cold/rebuild index scan
- resolver no-index fallback

That matches the chosen architecture: `WikilinkIndex` owns discovery and file
list cache; Markdown open/click/completion paths should use the attached index.

### 3. Runtime evidence exists

The previous verification recorded a VSIX install and a VS Code Insiders smoke
with 1,001 Markdown files. It was observational, not a timed SLA, but it is
enough to support the root-fix claim that broad discovery no longer blocks the
initial open payload.

## Residual Risks

These are already documented in the prior verification file and remain accepted:

- cold index build still scans once per workspace folder
- initial metadata can be empty/stale until async refresh
- no-index fallback still performs broad discovery
- runtime smoke was observational, not a numeric latency benchmark
- provider wiring is partly protected by source inspection rather than a full
  end-to-end provider test

## Follow-up Recommendation

Keep this fix on `main`. If performance is questioned again, add a timed trace
around `buildOpenPayload()`, `pushWikilinkDataWhenReady()`, and
`WikilinkIndex.build()` so future reports can distinguish open latency from cold
index latency.
