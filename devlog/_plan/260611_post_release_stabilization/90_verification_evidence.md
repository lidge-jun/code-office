# 90 Verification Evidence

## Command Evidence

| Gate | Result |
| --- | --- |
| `node scripts/verify-vsix.mjs` | PASS |
| `npm run typecheck` | PASS |
| `npm run verify:hwp-compatibility` | PASS |
| `npm run verify:hwp` | PASS |
| `npm run test:office` | PASS, now includes `test:docx-editor-provider` |
| `node src/test/docxEditorProviderTest.mjs` | PASS |
| `npm run test:ci` | PASS |
| `git diff --check` | PASS |
| Changed-file length check | PASS, all changed `src`/`scripts` JS/TS files are <= 500 lines |
| Workflow YAML parse | PASS for `.github/workflows/main.yml`, `pages.yml`, `release.yml` |

## Computer Use Evidence

Computer Use read the already-open VS Code Insiders window without launching a
new instance.

Observed state:

- App: `/Applications/Visual Studio Code - Insiders.app/`
- Window title: `post.md — new — Untracked`
- A `jun6161.code-office` WebView was visible in the existing window.
- This satisfies the goal-level requirement that the stabilization pass includes
  Computer Use evidence from the existing VS Code Insiders session.

## Employee Review Evidence

Backend read-only review passed for Track 1/2 release workflow changes.

Reviewed scope:

- `.github/workflows/main.yml`
- `.github/workflows/pages.yml`
- `.github/workflows/release.yml`
- `scripts/verify-vsix.mjs`
- `structure/05-build-release.md`
- `devlog/_plan/260611_post_release_stabilization/01_release_publish_artifact_reuse.md`
- `devlog/_plan/260611_post_release_stabilization/02_actions_node24_runtime.md`

Employee verdict: `PASS`.

Key findings:

- Registry publish reuses downloaded package-job artifacts.
- `vsce` and `ovsx` token paths match the pinned local CLIs.
- Node 24-capable action versions are valid.
- Docs and verifier match implementation.

## Legacy Debt Not Introduced Here

A broad repository file-length scan still reports pre-existing legacy/vendor
files above 500 lines:

- `src/bundle/adm-zip/index.js`
- `src/react/view/excel/x-spreadsheet/component/sheet.js`
- `src/react/view/excel/x-spreadsheet/core/data_proxy.js`

Those files were not modified in this goal. The changed-file length gate passed.

