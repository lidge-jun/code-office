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

