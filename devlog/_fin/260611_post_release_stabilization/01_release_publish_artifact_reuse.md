---
created: 2026-06-11
tags: [code-office, release, ci, pabcd-cycle-01]
---
# 01 Release Publish Artifact Reuse

## P - Problem

The tag release workflow currently builds release artifacts in the `package`
job, uploads them, and then the `publish-registries` job runs `npm run publish`
and `npm run publish:openvsx`. Those scripts rebuild and repackage artifacts,
so the registry packages can diverge from the attested GitHub Release artifacts.

## A - Approach

Keep `npm run release:local` as the package job gate, but make
`publish-registries` download the already-uploaded release artifact set and
publish those exact VSIX files:

- `code-office-${VERSION}.vsix` for VS Marketplace.
- `code-office-${VERSION}-openvsx.vsix` for Open VSX.
- `SHA256SUMS.txt` checked before publish.

The publish job still installs dependencies so the pinned local `vsce` and
`ovsx` CLIs are used, but it no longer needs Rust or local VSIX rebuilds.

## B - Build Changes

- Update `.github/workflows/release.yml`.
- Update `scripts/verify-vsix.mjs` to assert artifact download/reuse and absence
  of `npm run publish`/`npm run publish:openvsx` in the registry publish job.
- Update `structure/05-build-release.md`.

## C - Check Plan

- `node scripts/verify-vsix.mjs`
- `npm run typecheck`
- Employee review of release workflow semantics.

## D - Done Criteria

- Release workflow publishes registry packages from downloaded artifacts.
- GitHub Release, workflow artifact, Marketplace VSIX, and Open VSX VSIX share
  the same package job origin for a tag.

