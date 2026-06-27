# R2 rhwp Re-pin Execution Plan — v0.7.13 → v0.7.16

**Goal ID:** ab2aec14-9bb  
**Date:** 2026-06-28  
**Decision:** R1 → RE-PIN to `v0.7.16` (`20_rhwp_repin_decision.md`)

## Objective

Execute playbook §3–§4: rebuild vendored rhwp from `v0.7.16`, re-resolve PR #1281 find-dialog patch, sync bundles, update tracking docs, pass release gates, archive chase devlog, push `main` to `origin`.

## MODIFY

| Path | Action |
|---|---|
| `vendor/rhwp-studio-dist/**` | REPLACE via upstream `rhwp-studio` build + rsync |
| `resource/rhwp-studio/**` | REPLACE via `npm run build` (build.ts copies vendor → resource) |
| `vendor/rhwp-studio-dist/VERSION.md` | UPDATE pin to v0.7.16 / `de02159…`, new patch commit, build env |
| `structure/03-hwp-subsystem.md` | UPDATE rhwp Upstream Tracking table + gap line |
| `devlog/_plan/260627_upstream_rhwp_chase/00_overview.md` | Mark R2 done |
| `devlog/_plan/260627_upstream_rhwp_chase/50_verification.md` | NEW gate evidence |
| `docs/HWP-HWPX-COMPATIBILITY.md` | UPDATE baseline only if release gate requires (stay 3.7.50 unless version bump) |

## Build steps (playbook §3)

```bash
NEW_TAG=v0.7.16
NEW_SHA=de02159ab4d2c5d165d6e25568bad3f8af5ef6cb
git clone https://github.com/edwardkim/rhwp /tmp/rhwp-upstream-v0.7.16
cd /tmp/rhwp-upstream-v0.7.16
git checkout -b code-office/find-dialog-enter-routing v0.7.16
# Re-apply rhwp-studio/src/ui/find-dialog.ts patch from f887dca (PR #1281) if not upstream
wasm-pack build --target web
cd rhwp-studio && npm ci && npm run build
rsync -a --delete dist/ vendor/rhwp-studio-dist/
cd code-office && npm run build   # copies vendor → resource/rhwp-studio + bridge patch
```

## Patch #1281 resolution

- PR #1281 **CLOSED, not merged** on upstream.
- v0.7.14 release notes mention find/go-to Enter — must diff `find-dialog.ts` at v0.7.16 vs patch; apply only missing hunks.

## Verify (THOROUGH)

```bash
npm run verify:hwp-compatibility
npm run release:local
```

Computer Use: VS Code Insiders HWP/HWPX View→Edit→save→reopen + find-dialog Enter gate (dispatch Control if needed).

## Push (user-approved in goal hint)

```bash
git push origin main
```

## Commits (atomic)

1. `chore(rhwp): re-pin vendored studio runtime to v0.7.16`
2. `docs(hwp): update rhwp upstream tracking and R2 verification`
3. `chore(devlog): archive upstream rhwp chase to _fin`
