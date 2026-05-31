# Phase 06.1 Dependency Audit Closure

Scope: Phase 06.1 only

Project root: `/Users/jun/Developer/new/700_projects/code-office`

## Summary

Phase 6 added `@xmldom/xmldom` as a dev dependency for the Excel strikethrough Node test's `DOMParser`. The install surfaced existing `npm audit` findings. Phase 06.1 closes the actionable part of that audit without running `npm audit fix`.

`npm audit fix` and `npm audit fix --force` were intentionally not run because the remaining safe fixes require semver-major migrations for build/runtime dependencies. Phase 06.1 instead removed unused direct vulnerable dependencies and added a deterministic audit classifier for the reviewed residual findings.

## Changes

### `package.json` — remove unused vulnerable direct dependencies

- **Changes**: Removed direct `xlsx` and `x-data-spreadsheet` dependencies. Added `audit:phase06-1`.
- **Impact**: `xlsx` was unused in source; Excel reader/writer use `xlsx-js-style`. Runtime spreadsheet UI already uses the local `src/react/view/excel/x-spreadsheet/index.ts` implementation.
- **Verification**: `npm ls xlsx x-data-spreadsheet esbuild file-type @xmldom/xmldom` no longer lists `xlsx` or `x-data-spreadsheet`.

### `src/react/view/excel/excel_writer.ts` — type against the local spreadsheet implementation

- **Changes**: Replaced `import Spreadsheet from "x-data-spreadsheet"` with `import type Spreadsheet from "./x-spreadsheet/index"`.
- **Impact**: Removes the only source reference to the vulnerable npm `x-data-spreadsheet` package while preserving the writer's `getData()` contract.
- **Verification**: `npm run test:excel-phase6` and `npm run typecheck` passed.

### `scripts/audit-phase06-1.mjs` — deterministic reviewed-audit gate

- **Changes**: Added a script that runs `npm audit --json --package-lock=false`, fails on unexpected advisories, and accepts only the reviewed Phase 06.2 residuals.
- **Impact**: The project now has a stable local command for distinguishing reviewed residual risk from new dependency regressions.
- **Verification**: `npm run audit:phase06-1` passed with only `esbuild` and `file-type` remaining.

## Audit Evidence

Before Phase 06.1:

```text
npm audit --json
total=10 low=2 moderate=2 high=3 critical=3
packages=esbuild,file-type,xlsx,x-data-spreadsheet,opencollective,inquirer,external-editor,minimist,node-fetch,tmp
```

After Phase 06.1 cleanup:

```text
npm run audit:phase06-1
total=2 low=0 moderate=2 high=0 critical=0
PASS: only reviewed Phase 06.1 dependency audit findings remain.
```

```text
npm audit --json --package-lock=false
total=2 low=0 moderate=2 high=0 critical=0
packages=esbuild,file-type
```

## Residual Risk

| Package | Severity | Reason retained in Phase 06.1 | Next phase |
| --- | --- | --- | --- |
| `esbuild` | moderate | Direct build-tool dev dependency. npm reports the fix as `esbuild@0.28.0` semver-major. | Phase 06.2 build-tool upgrade spike |
| `file-type` | moderate | Runtime pasted-image extension detection. npm reports the fix as `file-type@22.0.1` semver-major ESM/API migration. | Phase 06.2 pasted-image dependency migration |

Closed in Phase 06.1:

- `xlsx`
- `x-data-spreadsheet`
- `opencollective`
- `inquirer`
- `external-editor`
- `minimist`
- `node-fetch`
- `tmp`

## Verification

```text
npm prune --package-lock=false
added 2 packages, removed 56 packages, changed 2 packages, and audited 796 packages
2 moderate severity vulnerabilities
```

```text
npm run audit:phase06-1
PASS: only reviewed Phase 06.1 dependency audit findings remain.
```

```text
npm ls xlsx x-data-spreadsheet esbuild file-type @xmldom/xmldom
@xmldom/xmldom@0.8.13
esbuild@0.14.54
file-type@19.6.0
vite -> esbuild@0.25.12
```

```text
npm run test:excel-phase6
excel phase6 checks passed
```

```text
npm run test:markdown-phase5
markdown phase5 checks passed
```

```text
npm run typecheck
exit 0
```

```text
npm run package
build success
verify:hwp PASS
Packaged: /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.6.vsix
```

## Employee Review

Plan review before implementation:

- Backend: PASS; confirmed `xlsx` is unused and `x-data-spreadsheet` can be replaced with a local type import.
- Frontend: PASS; confirmed Excel runtime uses local `x-spreadsheet` and removing npm `x-data-spreadsheet` is frontend-safe after type import cleanup.
- Docs: PASS; confirmed the plan records the `@xmldom/xmldom` context, `npm audit fix` rationale, and residual risk needs.

## Non-Goals

- No `npm audit fix` or `npm audit fix --force`.
- No semver-major `esbuild` migration in Phase 06.1.
- No semver-major `file-type` migration in Phase 06.1.
- No replacement of the local spreadsheet UI implementation.
