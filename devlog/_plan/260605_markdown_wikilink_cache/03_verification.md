# Markdown Wikilink Cache Verification

## Automated Verification

```text
npx tsc --noEmit
PASS: exit code 0
```

```text
npm run test:wikilink-resolver
PASS: wikilink resolver checks passed
```

```text
npm run typecheck
PASS: exit code 0
```

```text
npm run test:markdown
PASS: all Markdown parser, authoring, resolver, phase5, and live/raw checks passed
```

```text
npm run test:ci
PASS: Markdown, Office, and security suites passed
```

```text
npm run build
PASS: production build completed in 2.98s
```

```text
npm run release:local
PASS: verify:release, package:verify, HWP hardening verification, VSIX packaging,
and VSIX artifact inspection passed
```

Generated artifact:

```text
/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.46.vsix
```

Installed extension:

```text
code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.46.vsix --force
PASS: Extension 'code-office-3.7.46.vsix' was successfully installed.
```

```text
code-insiders --list-extensions --show-versions
PASS: jun6161.code-office@3.7.46
```

## Runtime Smoke

Created temporary smoke vault:

```text
/tmp/code-office-md-smoke
Markdown file count: 1001
```

Opened in VS Code Insiders:

```text
code-insiders --new-window /tmp/code-office-md-smoke /tmp/code-office-md-smoke/Source.md
```

Computer Use verified:

- Window title: `Source.md — code-office-md-smoke`
- Active extension webview authority includes `extensionId=jun6161.code-office`
- Rendered Markdown content is visible:
  - `Source`
  - `Note 0001`
  - `Middle`
  - `Note 1000`
- No long blocking wait was observed before the editor rendered.

## Hot Path Verification

Source inspection after implementation:

- `MarkdownEditorProvider` initial open payload calls
  `completionTargetsCached(uri)`, not `completionTargets(uri)`.
- `WikilinkResolver.listMarkdownFiles(folder)` returns
  `index.getFiles(folder)` when an index is attached.
- `WikilinkIndex.getFiles(folder)` waits for readiness and returns
  `getCachedFiles(folder)`.
- `workspace.findFiles()` remains only in:
  - `WikilinkIndex.scanFiles()` for initial/rebuild discovery.
  - `WikilinkResolver` no-index fallback.

## Residual Risk

- **Cold index build still scans once.** The root fix removes repeated
  per-open/per-click/per-completion scans, but the first `WikilinkIndex.build()`
  still calls `workspace.findFiles()` once per workspace folder. Very large
  workspaces can still pay that one-time startup/index-readiness cost.
- **Async refresh can briefly show stale or empty wikilink metadata.** Initial
  Markdown open now uses cached snapshots so the editor can render immediately.
  If the cache is not ready, unresolved-link markers and completion targets can
  be empty until `pushWikilinkDataWhenReady()` sends
  `updateWikilinkIndex` and `updateWikilinkCompletionTargets`.
- **No-index fallback still performs broad discovery.** `WikilinkResolver`
  preserves the existing no-index fallback for isolated construction and tests.
  Production activation calls `wikilinkResolver.setIndex(wikilinkIndex)`, so this
  fallback is outside the normal Markdown editor hot path.
- **Runtime smoke is observational, not a timed SLA.** The VS Code Insiders smoke
  proved that a 1,001-file Markdown workspace renders through the code-office
  webview without an observed long blocking wait. It does not establish a
  numeric latency budget or performance trace threshold.
- **Provider wiring is partly protected by source inspection.** The resolver
  regression test enforces that an attached index avoids `workspace.findFiles()`;
  the current provider wiring was verified by source review and runtime smoke.
  A future provider regression should add or update tests if this path changes.
