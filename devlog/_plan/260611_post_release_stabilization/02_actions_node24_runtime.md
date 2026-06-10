---
created: 2026-06-11
tags: [code-office, github-actions, node24, pabcd-cycle-02]
---
# 02 GitHub Actions Node 24 Runtime

## P - Problem

GitHub has started warning that JavaScript actions running on Node.js 20 are
deprecated. Current workflows still use older official action majors where
Node 24 runtime replacements are available.

## A - Approach

Upgrade only official actions with current Node 24 runtime releases:

- `actions/checkout@v5`
- `actions/setup-node@v5`
- `actions/upload-artifact@v7`
- `actions/download-artifact@v8`
- `actions/attest-build-provenance@v3`

For `setup-node@v5`, explicitly disable automatic package-manager caching
because the repository currently uses `npm install` without lockfile-cache
assumptions in CI.

Reference evidence checked on 2026-06-11:

- `actions/checkout` release `v5.0.0` updates checkout to Node 24.
- `actions/setup-node` release `v5` upgrades the action from Node 20 to Node 24
  and recommends runner `v2.327.1` or newer.
- GitHub's Node 20 deprecation notice states Node 20 actions are being
  deprecated and Node 24 migration is the planned path.
- `actions/download-artifact@v7` release notes state Node 24 runtime; latest
  release stream is newer.
- `actions/upload-artifact` README/release stream documents Node 24 capable
  artifact actions and current examples use `@v7`.

## B - Build Changes

- Update `.github/workflows/main.yml`.
- Update `.github/workflows/pages.yml`.
- Update `.github/workflows/release.yml`.
- Update `scripts/verify-vsix.mjs` to lock the new action versions.

## C - Check Plan

- `node scripts/verify-vsix.mjs`
- `npm run typecheck`
- CI after later push/tag will verify hosted runner compatibility.

## D - Done Criteria

- Repository workflows no longer reference `actions/checkout@v4`,
  `actions/setup-node@v4`, `actions/upload-artifact@v4`, or
  `actions/attest-build-provenance@v2`.

