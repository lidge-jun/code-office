# 03 Release Artifact Trust Patch

## Problem

Marketplace and Open VSX publication alone do not prove provenance. The public
GitHub Releases page is currently the missing trust surface. A user should be
able to answer:

- which source tag produced this VSIX?
- which VSIX went to VS Marketplace?
- which remapped VSIX went to Open VSX?
- what SHA-256 checksum should the artifact have?
- what limitations apply to this release?

## Patch Scope

### NEW `.github/workflows/release.yml`

Planned workflow:

```yaml
name: Release

on:
  push:
    tags:
      - "v*.*.*"

permissions:
  contents: write
  id-token: write
  attestations: write

jobs:
  package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - uses: dtolnay/rust-toolchain@stable
      - run: npm ci
      - run: npm run release:local
      - run: npm run package:openvsx
      - run: shasum -a 256 code-office-*.vsix > SHA256SUMS.txt
      - uses: actions/attest-build-provenance@v2
        with:
          subject-path: |
            code-office-*.vsix
            SHA256SUMS.txt
      - uses: softprops/action-gh-release@v2
        with:
          files: |
            code-office-*.vsix
            SHA256SUMS.txt
```

Notes:

- The first iteration should create release artifacts only.
- Registry publishing can be a separate follow-up job after artifact release is
  proven.
- Phase A artifacts prove GitHub release provenance for the CI-built VSIX files.
  They are not expected to be byte-identical to already-published registry VSIX
  files if those registry files were built manually on another platform.
- If `npm run package:openvsx` does not exist in the released package state,
  use the existing Open VSX wrapper script command from `package.json`.

### MODIFY `structure/05-build-release.md`

Add a release automation subsection:

- tag format;
- GitHub Release artifact list;
- checksum generation;
- attestation expectation;
- difference between normal VSIX and Open VSX remapped VSIX;
- manual rollback note.

### MODIFY `README.md`, `README-KO.md`, `README-CN.md`

Add an install verification section:

- GitHub Release URL;
- checksum verification command;
- registry identity mapping:
  - VS Marketplace: `jun6161.code-office`
  - Open VSX: `lidge-jun.code-office`

### MODIFY `docs/index.html`

Add a release trust block on the install page or first install section.

## Verification

Required commands:

```bash
npm run release:local
npm run package:openvsx
shasum -a 256 code-office-*.vsix
git diff --check
```

CI verification:

- Push a test tag on a disposable branch or run workflow manually if converted
  to `workflow_dispatch`.
- Confirm release assets exist.
- Confirm checksums match local artifacts.
- Do not claim checksum equality with an older manually-published registry VSIX
  when the CI artifact bundles a different platform-native helper.

## Acceptance Criteria

- GitHub Releases is no longer empty after the next tag.
- Release artifacts include both VSIX variants and `SHA256SUMS.txt`.
- Release docs explain how to verify an installed artifact.
- Registry artifact checksum parity is claimed only after Marketplace/Open VSX
  publish uses the exact same CI-built artifact.
- No registry token is required for artifact-only release generation.
