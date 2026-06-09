# 260604 Release Registry Publish

## Goal

Prepare `main` for public registry deployment and publish the current stable baseline from `main`, not from `dev/wikilink-authoring-autocomplete`.

The release target is `code-office` version `3.7.46` on:

- VS Marketplace: `jun6161.code-office`
- Open VSX: `lidge-jun.code-office`

## Current Evidence

- `main` is clean and aligned with `origin/main` at `3356d94`.
- `dev/wikilink-authoring-autocomplete` is pushed at `dc1d240` and contains the abandoned wikilink autocomplete/dropdown experiment.
- `package.json` on `main` is `3.7.46`, higher than the currently observed registry versions:
  - VS Marketplace: `3.7.17`
  - Open VSX: `3.7.13`
- Existing README and GitHub Pages still describe local VSIX as the only verified install path, which will become stale after registry publish.

## Scope

### Phase 1: Documentation and Site Cleanup

Modify:

- `README.md`
- `README-KO.md`
- `README-CN.md`
- `docs/index.html`
- `docs/FAQ.md`
- `docs/FAQ.ko.md`
- `docs/TESTING.md`
- `structure/05-build-release.md`
- `package.json`
- `package-lock.json`
- `scripts/package-openvsx.mjs` (new)
- `scripts/publish-openvsx.mjs` (new)
- `scripts/verify-vsix.mjs`

Intent:

- Replace "local VSIX only" wording with registry-aware install guidance.
- Document Marketplace publisher (`jun6161`) and Open VSX namespace (`lidge-jun`) clearly.
- Add a reproducible Open VSX packaging path that temporarily packages a VSIX with `publisher: "lidge-jun"` so it updates the existing `lidge-jun.code-office` namespace instead of publishing a new `jun6161.code-office` Open VSX entry.
- Add a pinned `ovsx` dev dependency and a gated `publish:openvsx` script so Open VSX publishing is not an ad-hoc `npx` command.
- Keep `main` as the release source of truth and keep the dev branch explicitly non-release.
- Keep GitHub Pages as a static `docs/` site; do not introduce Astro unless the repository already contains an Astro site.

### Phase 2: Edge-Case Verification

Run and record:

- `git diff --check`
- `npm run test:wikilink-phase3`
- `npm run test:wikilink-resolver`
- `npm run test:markdown`
- `npm run test:office`
- `npm run typecheck`
- `npm run release:local`

Extra edge checks:

- Basic Markdown wikilinks render for extensionless, explicit `.md`, relative `.md`, and absolute `.md`.
- Non-md bodies stay raw.
- Release packaging still includes rhwp-studio, rhwp-vscode media, and the current-platform native PDF helper.
- Open VSX packaging produces `code-office-3.7.46-openvsx.vsix` whose manifest publisher is `lidge-jun`, while normal Marketplace packaging still produces `code-office-3.7.46.vsix` with publisher `jun6161`.
- README/Pages registry links are present before publish.

### Phase 3: Independent Audits

Use employees/sub-agents for:

- Docs audit: README, FAQ, release wording, attribution consistency.
- Frontend/site audit: GitHub Pages static site copy, navigation, install section, registry links.
- Backend/release audit: package scripts, cross-platform CI, release/package gates, registry target sanity.

### Phase 4: Commit, Push, CI Tracking

Commit documentation/site/test-gate changes atomically.

Push `main` only after verification passes. Track GitHub Actions until:

- CI workflow passes.
- GitHub Pages workflow passes if docs/site paths changed.

### Phase 5: Registry Publish

Publish only after CI passes:

- VS Marketplace via `npm run publish` / `vsce publish --no-dependencies`.
- Open VSX via `npm run publish:openvsx`, which runs the local release gate, builds `code-office-3.7.46-openvsx.vsix` with `publisher: "lidge-jun"`, then publishes it with pinned `ovsx` using `OVSX_PAT` or `OVSX_TOKEN`.

After publish:

- Verify Marketplace API reports `3.7.46`.
- Verify Open VSX API reports `3.7.46`.
- Record final evidence with `cli-jaw goal update`.

## Non-Goals

- Do not revive the `[[` autocomplete/dropdown implementation on `main`.
- Do not merge `dev/wikilink-authoring-autocomplete`.
- Do not add Astro tooling unless the repository already has an Astro source tree.
- Do not force-push or reset branches.

## Success Criteria

- Docs and Pages accurately describe public registry installation and local VSIX fallback.
- All release gates pass locally.
- `origin/main` contains the release-readiness commit.
- GitHub CI and Pages are green for the pushed commit.
- VS Marketplace and Open VSX both expose `code-office` `3.7.46`.
