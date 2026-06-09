# Markdown Wikilink Cache Research

## Problem

Opening a Markdown document through `MarkdownEditorProvider` can still wait on
workspace-wide Markdown discovery. The current cache only stores note basenames,
while `WikilinkResolver.completionTargets()` still asks for Markdown files and
reaches `vscode.workspace.findFiles()` through `WikilinkIndex.listFiles()`.

## Evidence

### Open Payload

`src/provider/markdownEditorProvider.ts`

- `buildOpenPayload()` awaits `wikilinkIndex.get(uri)`.
- `buildOpenPayload()` also awaits `wikilinkResolver.completionTargets(uri)`.
- `pushWikilinkDataWhenReady()` repeats `completionTargets(uri)` after open.

### Resolver

`src/service/wikilink/wikilinkResolver.ts`

- `completionTargets()` calls `listMarkdownFiles(workspaceFolder)`.
- `findCandidates()` also calls `listMarkdownFiles(workspaceFolder)`.
- `listMarkdownFiles(folder)` delegates to `this.index.listFiles(folder)` when
  an index is attached.

### Index

`src/service/wikilink/wikilinkIndex.ts`

- `listFiles(folder)` currently calls `vscode.workspace.findFiles()` every time.
- `build()` uses `listFiles(folder)`, so changing `listFiles()` directly would
  break the initial discovery unless the scan path is split from the cached read
  path.

## Root Cause

The cache and scan responsibilities are mixed. `WikilinkIndex` builds a basename
cache, but it does not own a resident URI list that resolver/completion can reuse.
As a result, "cache-backed" resolver calls can still rescan the workspace.

## Target Architecture

`WikilinkIndex` should own all Markdown discovery state:

```text
WikilinkIndex
  scan once at activation / workspace-folder change
  cache markdown file URIs per workspace folder
  cache note basenames per workspace folder
  update both caches from FileSystemWatcher create/delete events

WikilinkResolver
  use cached URI lists for click resolution and completion
  keep workspace.findFiles only as no-index fallback

MarkdownEditorProvider
  open immediately with cached snapshots
  send fresh wikilink data asynchronously after index readiness
```

## Success Criteria

- Markdown open payload does not await workspace-wide file discovery.
- With an attached `WikilinkIndex`, resolver completion/candidate paths use
  cached URI lists instead of calling `workspace.findFiles()`.
- `npm run test:markdown`, `npm run test:ci`, and `npm run build` pass.
- A local VSIX is packaged, installed into VS Code Insiders, and a Markdown file
  smoke-open is verified.

