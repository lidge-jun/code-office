# Phase 6 Excel Strikethrough Preservation Plan

Scope: Phase 6 only

Project root: `/Users/jun/Developer/new/700_projects/code-office`

## Current State

The Excel strike bridge is already mostly present in code:

- `src/react/view/excel/excel_reader.ts` reads XLSX font styles through `xlsx-js-style`, parses `xl/styles.xml`, maps `<strike/>` to `style.strike`, and sends style indexes into x-spreadsheet cells.
- `src/react/view/excel/x-spreadsheet/canvas/draw.js` already draws a strike line when `style.strike` is true.
- `src/react/view/excel/x-spreadsheet/component/table.js` passes `style.strike` into the canvas draw call.
- `src/react/view/excel/excel_writer.ts` writes `style.strike` back as `font.strike`.

The Phase 6 gap is closure: generated fixtures, round-trip tests, explicit unsupported rich-text documentation, and VS Code Insiders E2E proof.

## Acceptance Criteria

1. A generated `.xlsx` fixture covers plain strike, bold+strike, italic+strike, underline+strike, and wrapped text+strike.
2. `loadSheets()` maps each cell-level strike style to x-spreadsheet `styles[].strike === true`.
3. Bold, italic, and underline remain present when combined with strike.
4. `export_xlsx()` preserves cell-level strike when x-spreadsheet data is written back to XLSX.
5. Rich-text partial-run strike is documented as unsupported in Phase 6; only whole-cell strike is covered.
6. Renderer path is verified statically: `table.js` passes `style.strike`, and `draw.js` draws the line.
7. Build gates pass: `npm run test:excel-phase6`, `npm run test:markdown-phase5`, `npm run typecheck`, `npm run package`.
8. VS Code Insiders E2E opens the generated `.xlsx` fixture and visually shows strike cells in the Excel preview.

## Planned Diffs

### ADD `src/test/excelPhase6Test.mjs`

Create a focused Node test using `xlsx-js-style` and the same esbuild pattern as Phase 4/5.

The test will:

1. Generate `/tmp/code-office-phase6-strike.xlsx` with:
   - `A1`: plain strike.
   - `A2`: bold + strike.
   - `A3`: italic + strike.
   - `A4`: underline + strike.
   - `A5`: wrapped text + strike.
2. Bundle `src/react/view/excel/excel_reader.ts` to CJS and set `global.DOMParser` from `@xmldom/xmldom`; Node already provides `TextDecoder`.
3. Assert `loadSheets(buffer, '.xlsx')` produces cells with style indexes.
4. Assert referenced styles contain:
   - `strike: true` for A1:A5.
   - `font.bold: true` for A2.
   - `font.italic: true` for A3.
   - `underline: true` for A4.
5. Bundle `src/react/view/excel/excel_writer.ts` with async `esbuild.build()` plus a `../../util/vscode` shim so `handler.emit('save', array)` can be captured.
6. Export a minimal x-spreadsheet mock that implements `getData()` and contains `rows.len`, numeric row keys, `cells`, and `styles`.
7. Verify writer round-trip by feeding the captured exported bytes back through the bundled `loadSheets()` reader and asserting `styles[].strike === true`; do not assert `XLSX.read(...).Sheets.Sheet1.A1.s.font.strike`, because `xlsx-js-style` does not reliably surface font strike on reread.
8. As a secondary writer proof, inspect OOXML package text and assert `xl/styles.xml` contains `<strike/>` and the target sheet cell has an `s="..."` style reference.
9. Verify source renderer wiring by reading:
   - `src/react/view/excel/x-spreadsheet/component/table.js`
   - `src/react/view/excel/x-spreadsheet/canvas/draw.js`

### MODIFY `package.json`

Add a focused Phase 6 test script and a Node DOM parser dev dependency:

```diff
 		"test:pptx-phase4": "node src/test/pptxPhase4Test.mjs",
 		"test:markdown-phase5": "node src/test/markdownPhase5Test.mjs",
+		"test:excel-phase6": "node src/test/excelPhase6Test.mjs",
```

```diff
 	"devDependencies": {
+		"@xmldom/xmldom": "^0.8.10",
 		"@types/node": "^22.15.2",
```

### ADD `devlog/_fin/260531_phase06_excel_strikethrough_preservation/README.md`

Record closure evidence:

- Fixture path: `/tmp/code-office-phase6-strike.xlsx`.
- Whole-cell strike is supported.
- Bold/italic/underline combinations are preserved.
- Wrapped text is included as a visual/E2E fixture row; Phase 6 does not add wrap import assertions because the reader currently does not map wrap text style.
- Rich text partial-run strike is unsupported in Phase 6 and should be handled by a later richer text model if needed.
- Renderer path is already present and verified.

No planned edits to:

- `src/react/view/excel/excel_reader.ts`
- `src/react/view/excel/excel_writer.ts`
- `src/react/view/excel/x-spreadsheet/component/table.js`
- `src/react/view/excel/x-spreadsheet/canvas/draw.js`

Those files already contain the implementation; Phase 6 only locks it with tests unless audit or tests reveal a defect.

## Verification Plan

Automated:

```bash
cd /Users/jun/Developer/new/700_projects/code-office
npm run test:excel-phase6
npm run test:markdown-phase5
npm run typecheck
npm run package
```

Employee verification:

- Backend: audit reader/writer bundling, style mapping, and round-trip assertions.
- Frontend: audit renderer path and VS Code Insiders visual E2E expectations.
- Data: audit fixture matrix and rich-text non-goal boundary.

Manual/CU E2E:

1. Install `/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.6.vsix`.
2. Open `/tmp/code-office-phase6-strike.xlsx` in VS Code Insiders.
3. Verify the Excel preview shows rows A1:A5 and visually renders strike-through text.
4. Verify bold/italic/underline combinations do not hide the strike line.

## Non-Goals

- Rich-text partial-run strike inside one cell.
- New wrap-text import fidelity; wrapped strike is a visual fixture row only.
- XLS binary `.xls` style coverage beyond the existing writer path.
- ODS-specific strike fidelity.
- Changing x-spreadsheet renderer internals unless the fixture fails.

## Rollback

Rollback is a single commit revert for files in this phase:

- `package.json`
- `src/test/excelPhase6Test.mjs`
- `devlog/_fin/260531_phase06_excel_strikethrough_preservation/README.md`
