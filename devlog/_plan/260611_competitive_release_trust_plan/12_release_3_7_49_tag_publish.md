# 12 Release 3.7.49 Tag Publish

## Context

`3.7.48` is already public on VS Marketplace and Open VSX, so reusing that
version for a tag-driven publish would fail or create misleading release
evidence. The next public automation proof uses `3.7.49`.

## Scope

- Bump package metadata from `3.7.48` to `3.7.49`.
- Keep registry publication tag-gated, not main-push-gated.
- Push `main`, verify CI and Pages, then push `v3.7.49`.
- Verify the tag workflow creates GitHub Release assets and publishes both:
  - VS Marketplace: `jun6161.code-office`
  - Open VSX: `lidge-jun.code-office`

## Verification Plan

1. Run release verification locally before commit:
   - `node scripts/verify-vsix.mjs`
   - `npm run verify:hwp-compatibility`
   - `npm run release:local`
2. Push the version bump commit to `main`.
3. Watch GitHub Actions CI and GitHub Pages runs for the pushed commit.
4. Push `v3.7.49`.
5. Watch the release workflow until the package and registry publish jobs finish.
6. Query public registry APIs and GitHub Release assets for `3.7.49`.

## Safety Notes

- Main branch pushes still only produce CI/package artifacts.
- Marketplace/Open VSX publication only happens on version tags.
- The release workflow validates `VSCE_PAT` and `OVSX_PAT` before publishing.
