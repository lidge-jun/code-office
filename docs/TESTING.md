# Testing and GitHub CI

This project uses small Node-based regression tests plus a release packaging gate.
The goal is to catch file-format regressions before a VSIX is published.

## Local Commands

Run the same test suite that GitHub Actions runs on Ubuntu and Windows:

```bash
npm run typecheck
npm run test:ci
```

Run the full local release gate, including build, HWP hardening checks, VSIX
packaging, and VSIX contents verification:

```bash
npm run release:local
```

## GitHub Actions Gate

`.github/workflows/main.yml` runs two layers:

1. `test` runs on `ubuntu-latest` and `windows-latest`.
2. `package` runs on `ubuntu-latest` after tests pass and uploads the generated
   `code-office-*.vsix` artifact.

The Windows job is intentional. Wikilink path handling supports Windows
drive-letter paths, backslash relative paths, POSIX/Linux absolute paths, `.md`
and `.markdown` notes, and extensionless note targets. Running the same tests on
Windows prevents the path helpers from silently drifting back to POSIX-only
behavior.

## Required Coverage Surface

| Area | Command | What it protects |
|---|---|---|
| TypeScript host + React | `npm run typecheck` | extension host and webview type contracts |
| Markdown / wikilinks | `npm run test:markdown` | parser, live preview, raw source, export, Mermaid/code/CJK/wikilink regressions |
| Office readers | `npm run test:office` | PPTX slide extraction, Excel strikethrough round trip, HWP viewer/editor mode wiring |
| HWP viewer mode | `npm run test:hwp-viewer-mode` | HWP command contributions, mode messages, save-then-view guards, SVG/debug bridge methods, vendored rhwp-vscode paragraph APIs |
| Dependency audit | `npm run test:security` | reviewed npm audit findings only |
| HWP/HWPX hardening | `npm run verify:hwp` | custom editor ownership, save lifecycle, CSP, local rhwp bundle |
| VSIX metadata | `npm run verify:vsix` | package metadata, docs references, bundled rhwp assets, VSIX exclusions |
| Release package | `npm run release:local` | complete local publish gate |

## VS Code Insiders Smoke

After a successful VSIX build, install the latest package into VS Code Insiders
with `code-insiders --install-extension ./code-office-<version>.vsix --force`.
The required HWP/HWPX smoke surface is:

- `.hwp` and `.hwpx` open in Viewer mode by default through `cweijan.hwpEditor`.
- Edit switches to the rhwp editor, and View switches back.
- Dirty Editor → View triggers save first and commits Viewer only after save success.
- Save failure, cancellation, or timeout leaves the tab in Editor.
- Clean Viewer `Cmd+S` / `Ctrl+S` does not open a browser or Finder save dialog.
- The last selected HWP mode is reused on the next HWP/HWPX tab.
- Command Palette smoke covers `HWP/HWPX: Save as PDF`, `HWP/HWPX: Export SVG Pages`, `HWP/HWPX: Show Debug Overlay`, and `HWP/HWPX: Dump Paragraph`.
- Computer Use screenshots must capture the default Viewer, Edit mode, and at least one command smoke result before release.

## When Adding Tests

- Add focused tests under `src/test/` for parser, renderer, reader, writer, and
  bridge behavior.
- Wire new format-level tests into `test:ci` through a grouped script such as
  `test:office` or `test:markdown`.
- Keep package/release assertions in `scripts/verify-vsix.mjs` when the behavior
  is about marketplace metadata, GitHub docs, CI workflows, or VSIX contents.
- Do not rely on manual VS Code screenshots as the only proof. Add a deterministic
  script-level regression first, then use manual or Computer Use smoke testing
  for final UI confidence.
