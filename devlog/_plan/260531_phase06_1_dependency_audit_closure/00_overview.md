# Phase 06.1 Dependency Audit Closure Plan

Scope: Phase 06.1 only

Project root: `/Users/jun/Developer/new/700_projects/code-office`

## Current State

Phase 6 added `@xmldom/xmldom` as a dev dependency so the Excel strikethrough test can provide `DOMParser` in Node. The install surfaced existing `npm audit` findings, but `@xmldom/xmldom@0.8.13` is not one of the vulnerable packages.

Fresh audit snapshot:

- `npm audit --json` reports 10 vulnerabilities: 2 low, 2 moderate, 3 high, 3 critical.
- `package-lock.json` exists locally but is ignored by `.gitignore`; only `package.json` is tracked.
- Direct vulnerable dependencies are `esbuild`, `file-type`, `x-data-spreadsheet`, and `xlsx`.
- Transitive vulnerable chain is `x-data-spreadsheet -> opencollective -> inquirer/external-editor/tmp/minimist/node-fetch`.

Code usage snapshot:

- `src/react/view/excel/excel_reader.ts` and `src/react/view/excel/excel_writer.ts` import `xlsx-js-style`, not direct `xlsx`.
- `src/react/view/excel/excel_writer.ts` imports `x-data-spreadsheet` only as a TypeScript type annotation.
- `src/react/view/excel/Excel.tsx` uses the local `src/react/view/excel/x-spreadsheet/index.ts` implementation at runtime.
- `src/service/markdownService.ts` dynamically imports `file-type` for pasted image extension detection.
- `build.ts` uses direct `esbuild`; Vite already brings a separate patched `esbuild@0.25.12`.

## Acceptance Criteria

1. The Phase 06.1 plan is recorded under `devlog/_plan/260531_phase06_1_dependency_audit_closure/`.
2. Employee plan verification reviews the audit classification before implementation.
3. Direct `xlsx` is removed if static search confirms it is unused outside metadata and generated bundles.
4. `x-data-spreadsheet` runtime exposure is reduced if the direct package import is only used as a type.
5. A deterministic audit classifier script exists and distinguishes:
   - closed findings,
   - accepted semver-major upgrade findings,
   - no-fix upstream findings,
   - unexpected new findings.
6. `package.json` exposes the classifier as a script.
7. Final documentation records why `npm audit fix` was not run and what risk remains.
8. Verification passes with dependency audit evidence plus focused build/test gates.

## Planned Diffs

### MODIFY `package.json`

Planned safe dependency changes:

1. Remove direct `xlsx` because code imports `xlsx-js-style` and direct `xlsx` is not used.
2. Keep `x-data-spreadsheet` only if TypeScript cannot use the local spreadsheet type cleanly; otherwise remove the npm dependency and type against the local implementation.
3. Do not run `npm audit fix` or `npm audit fix --force`.
4. Do not upgrade `file-type` or direct `esbuild` in Phase 06.1 unless employee review and local verification prove the breaking surface is small enough.

Planned scripts:

```json
"audit:phase06-1": "node scripts/audit-phase06-1.mjs"
```

### ADD `scripts/audit-phase06-1.mjs`

The script will:

1. Run `npm audit --json` with `child_process.spawnSync`.
2. Parse `auditReportVersion: 2`.
3. Compare advisories against a reviewed allowlist.
4. Fail on unexpected packages or unexpected advisory URLs.
5. Print a compact status table.
6. Exit 0 when only reviewed findings remain; exit 1 for audit parser failure or new/unclassified findings.

Reviewed findings expected after safe removals:

- `esbuild` / GHSA-67mh-4wv8-2f99: accepted for Phase 06.1 because the safe fix is a semver-major build-tool upgrade. Track as Phase 06.2.
- `file-type` / GHSA-5v7r-6r5c-r473: accepted for Phase 06.1 because the safe fix is a semver-major ESM API upgrade touching pasted-image handling. Track as Phase 06.2.
- `x-data-spreadsheet` / GHSA-x5cw-843f-r366: only acceptable if still installed after type cleanup. Track as Phase 06.2 replacement/migration if retained.
- `opencollective` chain: only acceptable if still pulled by `x-data-spreadsheet`; otherwise must disappear with dependency cleanup.

### ADD `devlog/_fin/260531_phase06_1_dependency_audit_closure/README.md`

Record:

- Audit before/after counts.
- Dependency changes made.
- Commands run and exit results.
- Explicit rationale for not running `npm audit fix`.
- Remaining risk table and next-phase recommendation.

## Verification Plan

Automated:

```bash
cd /Users/jun/Developer/new/700_projects/code-office
npm run audit:phase06-1
npm audit --json
npm ls xlsx x-data-spreadsheet esbuild file-type @xmldom/xmldom
npm run test:excel-phase6
npm run test:markdown-phase5
npm run typecheck
npm run package
```

Employee verification:

- Backend: audit dependency graph and verify package changes do not remove used runtime APIs.
- Frontend: audit Excel spreadsheet import/type path and check that webview runtime is not affected.
- Docs: audit final devlog clarity, accepted-risk wording, and verification evidence.

## Non-Goals

- No `npm audit fix` or `npm audit fix --force`.
- No broad dependency modernization.
- No x-spreadsheet UI migration.
- No `file-type@22` migration unless Phase 06.1 evidence shows it is trivial and low-risk.
- No direct `esbuild@0.28` migration unless Phase 06.1 evidence shows the build/package gate is clean and the employee audit signs off.

## Rollback

Rollback is a single commit revert for files changed in this phase:

- `package.json`
- `scripts/audit-phase06-1.mjs`
- `src/react/view/excel/excel_writer.ts` if the type import is changed.
- `devlog/_fin/260531_phase06_1_dependency_audit_closure/README.md`
