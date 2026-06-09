# Markdown Wikilink Cache Plan

## Phase 1: Resident Index Ownership

Modify `src/service/wikilink/wikilinkIndex.ts`.

- Replace basename-only cache with per-folder entries containing:
  - `files: Map<string, vscode.Uri>` keyed by `uri.toString()` to prevent
    duplicate watcher events from inflating completion/candidate lists
  - `basenames: Set<string>`
- Split scan and cached read paths:
  - `scanFiles(folder)` calls `workspace.findFiles()` and is used only by
    `build()`.
  - `getFiles(folder)` waits for readiness and returns cached URIs.
  - `getCachedFiles(folder)` returns current cached URIs without scanning.
- Keep basename APIs (`get`, `getCached`, `getForFolder`, `getCachedForFolder`)
  intact for the existing webview unresolved-link payload.
- Update watcher handlers so create/delete mutate both `files` and `basenames`.
- Keep ignored directory filtering for `node_modules`, `.git`, and `out`.

## Phase 2: Resolver Uses Cache

Modify `src/service/wikilink/wikilinkResolver.ts`.

- Make `listMarkdownFiles(folder)` return `index.getFiles(folder)` when an index
  is attached.
- Add `completionTargetsCached(sourceUri)` for non-blocking open payloads.
- Use cached URI lists for completion and candidate ranking when the index exists.
- Keep the no-index fallback behavior for isolated tests or unexpected runtime
  construction without `setIndex()`. This fallback may still call
  `workspace.findFiles()`, but production extension activation always attaches
  the index in `src/extension.ts`.
- `noteBasenameIndex(sourceUri)` remains index-backed when `sourceUri` is
  provided. Its no-source fallback can keep the existing broad scan because it
  is not used by the Markdown open path.
- `WikilinkCompletionProvider` and `resolveExportTarget()` are covered
  transitively by this resolver change and must be re-verified after editing.

## Phase 3: Markdown Open Becomes Non-Blocking

Modify `src/provider/markdownEditorProvider.ts`.

- Build the initial open payload from cached snapshots:
  - `wikilinkIndex.getCached(uri)`
  - `wikilinkResolver.completionTargetsCached(uri)`
- Keep `pushWikilinkDataWhenReady()` to send fresh data after index readiness.
- Reload should also open from cached snapshots and then refresh asynchronously.

## Phase 4: Regression Coverage

Modify `src/test/wikilinkResolverTest.mjs`.

- Add bundled runtime tests that instantiate resolver/index-like objects.
- Assert cached completion targets are produced without workspace discovery.
- Assert async completion targets use the attached index file list and do not use
  `workspace.findFiles()` when an index is present.
- Extend the `vscode` esbuild shim with controllable `workspace`, `Uri`, and
  `RelativePattern` behavior so resolver methods, not only pure functions, are
  covered.

## Phase 5: Verification and Packaging

Run:

```bash
npm run test:markdown
npm run test:ci
npm run build
npm run release:local
code-insiders --install-extension ./code-office-<version>.vsix --force
```

Then smoke-open a Markdown fixture in VS Code Insiders and verify the installed
extension can load a Markdown document without the previous full-rescan path.

Runtime pass criteria:

- Install the newly packaged VSIX into VS Code Insiders with `--force`.
- Open a temporary workspace containing a generated Markdown vault with at least
  1,000 `.md` files.
- Open one Markdown file with the code-office Markdown editor.
- Verify the editor renders the file and does not show a long blocking wait.
- Verify the packaged source no longer has a production hot path where
  `MarkdownEditorProvider` open calls `WikilinkResolver.completionTargets()` and
  reaches `WikilinkIndex.scanFiles()`.
