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
| `npm run release:local` | PASS (2026-06-28) | Required `tsconfig.json` exclude `vditor`; `hwpViewerModeTest.mjs` updated for dynamic bridge patches |

## Bridge patch evidence

- `window.__rhwpBridge` present with `Rf`/`Nf`/`Tf`/`Lf`/`af` symbols (v0.7.16 minify names).
- `token:t.token` in postMessage responses.
- `rhwp-dirty-changed` CustomEvent bridged via `af.isDirty()`.
- HWPX status text patched to VS Code save messaging.

## Patch #1281 resolution (find-dialog Enter capture)

- Upstream v0.7.16 bundle includes `keyCaptureHandler`, `isFindEnter`, and `addEventListener(\`keydown\`,this.keyCaptureHandler,!0)` (grep `vendor/rhwp-studio-dist/assets/index--aak5hpq.js`).
- `npm run verify:hwp` asserts vendored find-dialog Enter capture (hardening script).
- Local patch `f887dca` / PR #1281 superseded — no separate patch commit on v0.7.16 pin.

## Release gate follow-up (2026-06-28)

- `tsconfig.json`: exclude vendored `vditor/` from root `tsc` (extension typecheck scope only).
- `src/test/hwpViewerModeTest.mjs`: assert dynamic bridge patch markers instead of hardcoded minified `case\`getPageSvg\`` literals.

## Manual smoke (deferred)

Computer Use HWP/HWPX View→Edit→save→reopen + find-dialog Enter gate was not run in this pass. Recommend before marketplace publish.

## Docs updated

- `vendor/rhwp-studio-dist/VERSION.md`
- `structure/03-hwp-subsystem.md` → rhwp Upstream Tracking table
