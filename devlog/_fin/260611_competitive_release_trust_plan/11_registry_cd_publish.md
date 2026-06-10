# 11 Registry CD Publish

## Decision

Registry publication is tag-gated. A normal `main` push runs CI and uploads a
VSIX artifact, but does not publish to public registries. A `v*.*.*` tag runs
the release workflow, creates GitHub Release artifacts/checksums/provenance, and
then publishes to VS Marketplace and Open VSX when the required repository
secrets exist.

## Implemented Files

| File | Change |
| --- | --- |
| `.github/workflows/release.yml` | Added `publish-registries` job gated by `refs/tags/`. |
| `scripts/verify-vsix.mjs` | Added assertions for tag-only registry publish, secret validation, and publish scripts. |
| `structure/05-build-release.md` | Documented `VSCE_PAT` / `OVSX_PAT` and tag-only CD flow. |
| `README.md`, `README-KO.md`, `README-CN.md` | Documented main-push artifact vs tag-push registry publish behavior. |

## Required Secrets

- `VSCE_PAT`: VS Marketplace token for `vsce publish`.
- `OVSX_PAT`: Open VSX token for `ovsx publish`.

The workflow intentionally fails the tag publish job with a clear error if a
required secret is missing.
