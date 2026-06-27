---
created: 2026-06-28
tags: [code-office, rhwp, verification, r2]
---
# R2 Verification — rhwp v0.7.16 Re-pin

## Implementation

- Rebuilt `vendor/rhwp-studio-dist/` from upstream tag `v0.7.16` (`de02159…`).
- No local find-dialog patch required (upstream merged Enter capture at v0.7.14+).
- `build.ts` `rewriteRhwpStudioForWebview()` now detects minified bridge symbols via regex instead of hardcoded `xu`/`gu`/`cu`/`Wl` names.

## Automated gates

| Command | Result | Notes |
| --- | --- | --- |
| `npm run build` | PASS | Bridge injected into `resource/rhwp-studio/assets/index--aak5hpq.js` |
| `npm run verify:hwp` | PASS | All hardening assertions green |
| `npm run verify:hwp-compatibility` | PASS | Matrix scoped to `code-office@3.7.50` |
| `npm run package:verify` | PASS | VSIX `code-office-3.7.50.vsix` includes v0.7.16 rhwp assets |
| `npm run release:local` | FAIL (pre-existing) | Stops at `tsc --noEmit` on `vditor/` DOM/test types — unrelated to rhwp re-pin |

## Bridge patch evidence

- `window.__rhwpBridge` present with `Rf`/`Nf`/`Tf`/`Lf`/`af` symbols (v0.7.16 minify names).
- `token:t.token` in postMessage responses.
- `rhwp-dirty-changed` CustomEvent bridged via `af.isDirty()`.
- HWPX status text patched to VS Code save messaging.

## Manual smoke (deferred)

Computer Use HWP/HWPX View→Edit→save→reopen + find-dialog Enter gate was not run in this pass. Recommend before marketplace publish.

## Docs updated

- `vendor/rhwp-studio-dist/VERSION.md`
- `structure/03-hwp-subsystem.md` → rhwp Upstream Tracking table
