# Phase 6 Excel Strikethrough Preservation

## Summary

Phase 6 closes Excel strikethrough preservation for whole-cell styles. The existing reader, writer, and renderer already had the main strike bridge; this phase adds the fixture, automated round-trip coverage, renderer wiring checks, and E2E target.

## Fixture

The generated E2E fixture is:

`/tmp/code-office-phase6-strike.xlsx`

It contains:

- A1 plain strike.
- A2 bold + strike.
- A3 italic + strike.
- A4 underline + strike.
- A5 wrapped text + strike.

## Supported

Whole-cell strike is supported and verified through:

- XLSX fixture generation with `xlsx-js-style`.
- `loadSheets()` mapping from OOXML font strike into x-spreadsheet `styles[].strike`.
- `export_xlsx()` writing x-spreadsheet `style.strike` back into OOXML.
- A secondary OOXML check for `<strike/>` in `xl/styles.xml`.
- Static renderer checks that `table.js` passes `style.strike` and `draw.js` draws the line.

## Boundaries

Rich-text partial-run strike inside one cell is not supported in Phase 6. Supporting that requires a richer text model than the current cell-level x-spreadsheet style bridge.

Wrapped text is present as a visual/E2E row. Phase 6 does not add wrap import fidelity; it verifies that strike survives on that row.

## Verification

Required gates:

```bash
npm run test:excel-phase6
npm run test:markdown-phase5
npm run typecheck
npm run package
```

Manual E2E target:

`/tmp/code-office-phase6-strike.xlsx`

Expected E2E result:

- Excel preview opens A1:A5.
- Strike-through is visible on each row.
- Bold, italic, and underline combinations do not hide the strike line.

Observed CU E2E evidence:

- VS Code Insiders opened `/tmp/code-office-phase6-strike.xlsx` through the code-office Excel preview.
- The visible grid showed A1 `plain strike`, A2 `bold strike`, A3 `italic strike`, A4 `underline strike`, and A5 `wrapped strike line 1 / line 2`.
- Strike-through lines were visible across all five rows, including the bold, italic, underline, and wrapped-text variants.
- The active sheet tab was `Strike`.
