# Phase 06.2 Dependency Major Upgrade Plan

Scope: Phase 06.2 only

Project root: `/Users/jun/Developer/new/700_projects/code-office`

## Current State

Phase 06.1 reduced `npm audit --package-lock=false` from 10 findings to 2 moderate findings:

- `esbuild@0.14.54` with npm's fixed version at `0.28.0`.
- `file-type@19.6.0` with npm's fixed version at `22.0.1`.

Both fixes are semver-major upgrades, so Phase 06.1 intentionally classified them instead of running `npm audit fix --force`.

## Acceptance Criteria

1. Upgrade direct `esbuild` to the npm-audit fixed line.
2. Upgrade direct `file-type` to the npm-audit fixed line.
3. Keep `MarkdownService.imgExtGuide()` behavior intact.
4. Keep `build.ts` behavior intact with the newer esbuild API.
5. `npm audit --json --package-lock=false` reports zero vulnerabilities.
6. Phase 5/6 focused tests, typecheck, build, and packaging pass.
7. Final devlog records the zero-audit result and verification evidence.

## Planned Diffs

### MODIFY `package.json`

```diff
- "esbuild": "^0.14.54"
+ "esbuild": "^0.28.0"

- "file-type": "^19.6.0"
+ "file-type": "^22.0.1"
```

Also add `audit:phase06` as an alias for the existing Phase 06 audit classifier so the final command name reflects the broader Phase 6 audit closure.

### MODIFY `scripts/audit-phase06-1.mjs`

Keep the script path for compatibility with Phase 06.1 evidence, but make the printed status generic to Phase 06. The classifier already exits 0 when npm reports zero vulnerabilities.

## Verification Plan

```bash
cd /Users/jun/Developer/new/700_projects/code-office
npm audit --json --package-lock=false
npm run audit:phase06
npm ls esbuild file-type xlsx x-data-spreadsheet @xmldom/xmldom
npm run test:excel-phase6
npm run test:markdown-phase5
npm run typecheck
npm run build
npm run package
```

## Non-Goals

- No broad dependency modernization outside `esbuild` and `file-type`.
- No lockfile policy change; `package-lock.json` remains ignored by repository policy.
- No markdown image UX changes beyond verifying the existing `fileTypeFromFile()` dynamic import still compiles.
