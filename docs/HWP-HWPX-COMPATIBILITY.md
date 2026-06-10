# HWP/HWPX Compatibility Matrix

This page is the public compatibility contract for the `code-office` HWP/HWPX
surface. It is intentionally narrower than "matches Hancom Office perfectly":
the project goal is local, VS Code-native HWP/HWPX viewing, editing, saving, and
review with explicit known limits.

The matrix is release evidence, not marketing copy. A scenario is marked
`verified` only when it is covered by an automated gate, a packaged VSIX smoke,
or a documented Computer Use visual check.

Current public package baseline: `code-office@3.7.49`. Rows marked `verified`
below are scoped to that baseline until a newer release updates this page.

## Status Vocabulary

- **verified**: covered by an automated release gate, packaged VSIX smoke, or a
  documented Computer Use check.
- **limited**: supported for common files, but known to differ for some layouts,
  fonts, or platform combinations.
- **planned**: tracked as future work and not a release claim.
- **unsupported**: deliberately outside the current product contract.

## Public Matrix

| Scenario | Format | Verified in version | Open | View | Edit | Save | Reopen | PDF Export | Evidence | Known Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Basic HWP open/edit/save/reopen | HWP | `code-office@3.7.49` | verified | verified | verified | verified | verified | limited | `scripts/verify-hwp-hardening.mjs`, packaged VSIX smoke, `docs/assets/screenshots/code-office-hwp-editor.png` | Native-quality PDF depends on a matching packaged helper; otherwise image PDF fallback is used. |
| Basic HWPX open/edit/save/reopen | HWPX | `code-office@3.7.49` | verified | verified | verified | verified | verified | limited | `scripts/verify-hwp-hardening.mjs`, packaged VSIX smoke | Complex HWPX round-trip still needs more redacted fixtures. |
| Dirty Editor to Viewer switch | HWP/HWPX | `code-office@3.7.49` | verified | verified | verified | verified | verified | limited | `scripts/verify-hwp-hardening.mjs`, Computer Use save-mode smoke | The mode switch must stay in Editor if save fails or is cancelled. |
| Failed save stays in Editor | HWP/HWPX | `code-office@3.7.49` | verified | verified | verified | verified | verified | unsupported | `scripts/verify-hwp-hardening.mjs` | The failure path protects the original file rather than forcing a Viewer transition. |
| Viewer search and internal shortcuts | HWP/HWPX | `code-office@3.7.49` | verified | verified | limited | not applicable | not applicable | not applicable | `scripts/verify-hwp-hardening.mjs` | Viewer SVG text search is not a full semantic document search engine. |
| SVG export and debug overlay | HWP/HWPX | `code-office@3.7.49` | verified | verified | not applicable | not applicable | not applicable | not applicable | `scripts/verify-hwp-hardening.mjs` | Developer-oriented output for inspection, not a user-facing interchange format. |
| Proprietary Hancom/Microsoft font fidelity | HWP/HWPX | `code-office@3.7.49` | limited | limited | limited | limited | limited | limited | README known-limits section, bundled font notice | Proprietary fonts are not bundled; open and system font fallback is expected. |
| Complex layout parity | HWP/HWPX | `code-office@3.7.49` | limited | limited | limited | limited | limited | limited | local redacted fixture runs; public synthetic suite planned | rhwp is not Hancom Office, so very complex layouts can differ. |
| HWP/HWPX conversion between formats | HWP/HWPX | `code-office@3.7.49` | limited | limited | limited | limited | limited | not applicable | FAQ conversion note | Toolbar save can redirect mismatched output to a new file; silent conversion is not a default promise. |
| Remote rhwp-studio runtime | HWP/HWPX | `code-office@3.7.49` | limited | limited | limited | limited | limited | limited | architecture docs and settings docs | Treat `code-office.hwp.studioUrl` as a trusted-code override; the default runtime is local. |

## Manual Release Smoke

Before publishing a registry build, run the local gate and a packaged VSIX smoke:

```bash
npm run release:local
code-insiders --install-extension ./code-office-<version>.vsix --force
```

The smoke must cover:

1. Open a `.hwp` file in Viewer mode.
2. Switch to Editor, edit text, save with `Cmd+S` / `Ctrl+S`, close, and reopen.
3. Open a `.hwpx` file, edit text, select table/cell content, save, close, and
   reopen.
4. Switch from dirty Editor to Viewer and confirm the save happens before the
   Viewer transition.
5. Trigger PDF export. Native helper output is preferred when the helper matches
   the current platform; fallback image PDF is acceptable on other platforms.
6. Confirm no stale loading banner, repeated false Save As prompt, or false dirty
   dot remains after a clean Viewer transition.

## Private Fixture Policy

Do not commit private HWP/HWPX documents to the repository.

Compatibility testing uses three fixture classes:

- Synthetic fixtures: generated or hand-authored samples that can be committed.
- Redacted fixtures: user documents with all private text and metadata removed
  before commit.
- Local-only fixtures: private files used for manual QA, recorded only by path
  hash, screenshot result, and scenario notes in local devlog evidence.

Public issues should attach synthetic or redacted samples only.

## Release Gate Integration

The release gate keeps this matrix present and structurally valid:

- `scripts/verify-hwp-compatibility-matrix.mjs` checks the matrix headings,
  scenario coverage, status vocabulary, fixture policy, and private-path guard.
- `scripts/verify-vsix.mjs` checks that README, GitHub Pages, FAQ, and release
  docs keep links to the compatibility evidence.
- `npm run verify:release` runs the HWP hardening gate and the compatibility
  matrix verifier before packaging.
