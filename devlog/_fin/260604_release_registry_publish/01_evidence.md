# Release Registry Publish Evidence

## Plan and Audit

- Plan created: `devlog/_plan/260604_release_registry_publish/00_overview.md`
- Initial Backend plan audit: FAIL because Open VSX `lidge-jun.code-office` needed a dedicated publisher-adjusted VSIX.
- Amended plan: added `package:openvsx`, `publish:openvsx`, pinned `ovsx`, and `lidge-jun` publisher packaging.
- Re-audit: PASS.

## Implementation

- Added Open VSX packaging script: `scripts/package-openvsx.mjs`
- Added Open VSX publish script: `scripts/publish-openvsx.mjs`
- Added package scripts: `package:openvsx`, `publish:openvsx`
- Pinned `ovsx` dev dependency to `1.0.0`
- Updated README, Korean README, Chinese README, FAQ, testing guide, GitHub Pages, and release runbook to document registry install and Open VSX dual-publisher release flow.
- Updated `scripts/verify-vsix.mjs` to verify registry links/scripts and ignore `-openvsx.vsix` artifacts for the normal latest-VSIX check.

## Verification

- `node --check scripts/package-openvsx.mjs` PASS
- `node --check scripts/publish-openvsx.mjs` PASS
- `git diff --check` PASS
- `node scripts/verify-vsix.mjs` PASS
- `npm run package:openvsx` PASS; created `code-office-3.7.46-openvsx.vsix` with manifest publisher `lidge-jun`
- Manifest check PASS:
  - `package.json` restored to publisher `jun6161`
  - `code-office-3.7.46-openvsx.vsix` manifest publisher is `lidge-jun`
- Backend implementation verifier: DONE
- `npm run typecheck` PASS
- `npm run test:markdown` PASS
- `npm run test:office` PASS
- `npm run test:security` PASS
- `npm run release:local` PASS; created and verified `code-office-3.7.46.vsix`
- Browser snapshot of `docs/index.html` showed:
  - `Install from a registry`
  - `Open Marketplace listing`
  - `Open VSX listing`
  - `Roadmap` navigation
- Screenshot: `/Users/jun/.cli-jaw-3462/screenshots/screenshot_1780581104485.png`

## Release Notes

- `main` remains the release source.
- `dev/wikilink-authoring-autocomplete` remains a non-release branch for the abandoned wikilink dropdown/autocomplete experiment.
- Open VSX publishing must use the `lidge-jun` publisher-adjusted VSIX; publishing the normal `jun6161` VSIX would target the wrong Open VSX namespace.

## Push, CI, and Registry Deployment

- Commit pushed: `d9460b7 chore: prepare registry release publishing`
- GitHub CI PASS: `https://github.com/lidge-jun/code-office/actions/runs/26956118647`
- GitHub Pages PASS: `https://github.com/lidge-jun/code-office/actions/runs/26956117855`
- VS Marketplace publish PASS:
  - `npm run publish`
  - Output: `DONE Published jun6161.code-office v3.7.46.`
  - Duplicate-proof rerun: `npx vsce publish --no-dependencies` failed only because `jun6161.code-office v3.7.46 already exists`
  - Public `vsce show` propagation observed top versions: `3.7.46,3.7.17,3.7.13,3.7.12,3.7.11`
- Open VSX publish PASS:
  - `npm run publish:openvsx`
  - Output: `Published lidge-jun.code-office v3.7.46`
  - Public API verified `latest=3.7.46` and `/3.7.46=3.7.46`
- Final package manifest restored after Open VSX packaging:
  - `publisher=jun6161`
  - `version=3.7.46`
  - `ovsx=1.0.0`
