---
created: 2026-06-11
tags: [code-office, hwp, architecture, pabcd-cycle-05]
---
# 05 HWP Module Boundary Cleanup

## P - Problem

`HwpEditorProvider.ts` sits on the dev-skill 500-line limit and mixes provider
lifecycle, pending request state types, timeout constants, and storage keys in a
single file.

## A - Approach

Use the smallest safe split first: move provider-only constants and pending
request interfaces to a colocated module. Do not change runtime behavior,
message names, command registration, save policy, or public exports.

## B - Build Changes

- Add `src/provider/hwp/hwpProviderState.ts`.
- Import constants/types from `HwpEditorProvider.ts`.
- Update `structure/03-hwp-subsystem.md`.

## C - Check Plan

- `npm run typecheck`
- `npm run verify:hwp`
- `wc -l` on the touched source files.

## D - Done Criteria

- `HwpEditorProvider.ts` is below 500 lines.
- HWP save/viewer command behavior is unchanged by type-only/state extraction.

