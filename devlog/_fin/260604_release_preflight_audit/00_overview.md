---
created: 2026-06-04
tags: [code-office, release-audit, documentation, cross-platform, github-pages]
---

# Release Preflight Audit

## Scope

Audit the recent `origin/main..HEAD` commits before publishing:

- Documentation coverage for the HWP/HWPX Viewer/Editor, PDF export, and find-search changes.
- Cross-platform compatibility risk in native helper packaging, path handling, and CI coverage.
- GitHub Pages product surface freshness.
- README coverage across the public README set.
- `structure/` currency after recent source, script, and devlog changes.

## Findings Closed In This Pass

| Area | Correction |
|---|---|
| Structure hub | Removed stray wikilink test text, updated snapshot version to `3.7.17`, documented HWP Viewer/Editor, native PDF, find search, and corrected rhwp attribution URL. |
| Build release runbook | Added native rhwp PDF helper phase, current-platform packaging note, VSIX verification scope, and canonical `release:local` process. |
| Devlog map | Added the 2026-06-03 HWP Viewer plan and this 2026-06-04 release preflight audit plan; refreshed baseline phase statuses. |
| GitHub Pages | Strengthened HWP/HWPX section with default Viewer, Edit/View switching, Save PDF, SVG text search highlighting, and platform-scoped native helper behavior. |
| README set | Clarified current-platform native helper packaging and added Viewer/Editor find shortcut behavior. |
| Release verification | Strengthened `scripts/verify-vsix.mjs` so README and GitHub Pages can no longer omit the HWP PDF/find/platform documentation surface silently. |
| CI/platform guard | Added Rust toolchain setup for the package job, made native helper existence checks Windows-safe, and ignored generated `.tmp/` test output. |

## Verification Evidence

Fresh commands run during the audit after the final edits:

```bash
npm run verify:hwp
npm run verify:vsix
npm run typecheck
npm run test:ci
npm run package:verify
git diff --check
```

Results:

- `npm run verify:hwp`: PASS, including the new Windows-safe native helper existence check.
- `npm run verify:vsix`: PASS, including README/GitHub Pages checks for HWP Viewer+Editor, Save PDF, find highlighting, and platform-scoped native helper documentation.
- `npm run typecheck`: PASS.
- `npm run test:ci`: PASS; Markdown, Office/HWP viewer mode, and dependency audit suites passed.
- `npm run package:verify`: PASS; rebuilt the native rhwp PDF helper, rebuilt the extension/webview, packaged `code-office-3.7.17.vsix`, and verified VSIX contents.
- `git diff --check`: PASS.
- Local GitHub Pages render smoke: PASS via `cli-jaw browser` on `file:///Users/jun/Developer/new/700_projects/code-office/docs/index.html`; DOM evaluation returned `hwpViewer=true`, `savePdf=true`, `find=true`, `nativeHelper=true`, `release=true`; screenshot saved at `/Users/jun/.cli-jaw-3462/screenshots/screenshot_1780552636123.png`.
