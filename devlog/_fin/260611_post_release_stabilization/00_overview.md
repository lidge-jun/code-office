---
created: 2026-06-11
tags: [code-office, release, stabilization, pabcd]
---
# Post-Release Stabilization

## Objective

After the public `v3.7.49` release, close six stabilization tracks with
documented PABCD cycles, fresh verification, and Computer Use evidence before
calling the repository ready for the next release iteration.

## Scope

1. Remove duplicate registry publish builds from the tag release workflow.
2. Remove GitHub Actions Node.js 20 deprecation warnings where current official
   action releases provide a Node 24 runtime.
3. Update the 2026-06-11 competitive release trust plan with final release
   evidence and move it from `_plan` to `_fin`.
4. Strengthen HWP/HWPX compatibility fixture verification without committing
   private documents.
5. Split oversized HWP provider/rhwp bridge responsibilities into smaller
   modules while preserving public provider behavior.
6. Re-check DOCX/SuperDoc failure-state containment and read-only fallback
   behavior so known SuperDoc exceptions remain non-fatal.

## PABCD Cycle Map

| Cycle | Track | Evidence owner |
| --- | --- | --- |
| 01 | Release publish artifact reuse | `.github/workflows/release.yml`, `scripts/verify-vsix.mjs`, `structure/05-build-release.md` |
| 02 | GitHub Actions Node 24 migration | `.github/workflows/*.yml`, `scripts/verify-vsix.mjs` |
| 03 | Competitive trust plan closure | `devlog/_fin/260611_competitive_release_trust_plan/` |
| 04 | HWP/HWPX compatibility fixture gate | `docs/HWP-HWPX-COMPATIBILITY.md`, `scripts/verify-hwp-compatibility-matrix.mjs` |
| 05 | HWP module boundary cleanup | `src/provider/hwp/*`, `src/react/view/hwp/rhwpBridge/*`, `structure/03-hwp-subsystem.md` |
| 06 | DOCX/SuperDoc failure-state checks | `src/react/view/word/*`, `src/test/docx*`, `structure/04-viewer-architecture.md` |

## Guardrails

- Do not introduce a broad new user-facing feature in this goal.
- Keep completed evidence intact when moving devlog folders.
- Do not commit private HWP/HWPX/DOCX files.
- Do not push unless explicitly requested in the same turn.
- Computer Use verification must use the already-open VS Code Insiders window.

## Baseline Evidence

- Baseline branch: `main`
- Baseline HEAD: `87b214fcd2b557c030156fba2619fba33498ee08`
- Baseline tag: `v3.7.49`
- Baseline state: `git status --short --branch` returned `## main...origin/main`
- Release evidence already present:
  - GitHub Release: `https://github.com/lidge-jun/code-office/releases/tag/v3.7.49`
  - Release workflow: `https://github.com/lidge-jun/code-office/actions/runs/27292380696`
  - VS Marketplace/Open VSX public package version: `3.7.49`

