---
created: 2026-06-11
tags: [code-office, hwp, fixtures, pabcd-cycle-04]
---
# 04 HWP/HWPX Fixture Verification

## P - Problem

The compatibility matrix documents fixture privacy policy, but the release gate
does not yet validate a machine-readable fixture manifest. That makes it too
easy to later add private file paths or vague local evidence to the repository.

## A - Approach

Add a public manifest that is allowed to contain zero committed fixtures today,
but defines the schema for future synthetic/redacted fixtures and local-only
evidence. The verifier should:

- parse the manifest;
- reject private local paths such as `/Users/...`;
- require committed fixture entries to resolve under `test-fixtures/hwp/`;
- require HWP/HWPX fixture extensions;
- require local evidence records to use hashes and notes, not private paths.

## B - Build Changes

- Add `test-fixtures/hwp/manifest.json`.
- Extend `scripts/verify-hwp-compatibility-matrix.mjs`.
- Link the manifest from `docs/HWP-HWPX-COMPATIBILITY.md`.

## C - Check Plan

- `npm run verify:hwp-compatibility`
- `node scripts/verify-vsix.mjs`

## D - Done Criteria

- The release gate can prove fixture policy structure without committing private
  documents.
- Future public fixtures have a validated place to be registered.

