import { handler } from "../../util/vscode";
import * as XLSX from 'xlsx-js-style';
import type Spreadsheet from "./x-spreadsheet/index";

function dataToSheet(xws) {
    const aoa = [[]];
    const rowobj = xws.rows;
    const styleCells = [];
    for (let ri = 0; ri < rowobj.len; ++ri) {
        const row = rowobj[ri];
        if (!row) continue;
        aoa[ri] = [];
        /* eslint-disable no-loop-func */
        Object.keys(row.cells).forEach(function (k) {
            const idx = +k;
            if (isNaN(idx)) return;
            const cell = row.cells[k];
            aoa[ri][idx] = cell.formula ? formulaCell(cell) : cell.text;
            if (cell.style !== undefined) {
                styleCells.push({ ri, ci: idx, style: xws.styles?.[cell.style] });
            }
        });
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    styleCells.forEach(({ ri, ci, style }) => {
        const mapped = xStyleToSheetStyle(style);
        if (!mapped) return;
        const address = XLSX.utils.encode_cell({ r: ri, c: ci });
        if (!ws[address]) return;
        ws[address].s = mapped;
    });
    return ws;
}

function formulaCell(cell) {
    const value = cell.value ?? cell.text;
    return {
        f: String(cell.formula).replace(/^=/, ''),
        v: value,
        t: typeof value === 'number' ? 'n' : 's',
    };
}

function xStyleToSheetStyle(style) {
    if (!style) return undefined;
    const font = style.font || {};
    if (!style.strike && !style.underline && !font.bold && !font.italic) return undefined;
    return {
        font: {
            name: font.name || 'Arial',
            sz: font.size || 10,
            bold: Boolean(font.bold),
            italic: Boolean(font.italic),
            strike: Boolean(style.strike),
            underline: style.underline ? 'single' : undefined,
        },
    };
}

function xtos(sdata) {
    const out = XLSX.utils.book_new();
    sdata.forEach(function (xws) {
        const ws = dataToSheet(xws)
        XLSX.utils.book_append_sheet(out, ws, xws.name);
    });
    return out;
}

export function export_xlsx(spreadSheet: Spreadsheet, extName: string) {
    extName = extName.replace('.', '')
    if (extName == 'xlsx' || extName == 'xls' || extName == 'ods') {
        const new_wb = xtos(spreadSheet.getData());
        const buffer = XLSX.write(new_wb, { bookType: extName, type: "array", cellStyles: true });
        const array = [...new Uint8Array(buffer)];
        handler.emit('save', array)
    } else if (extName == "csv") {
        const csvContent = XLSX.utils.sheet_to_csv(dataToSheet(spreadSheet.getData()[0]));
        handler.emit('save', csvContent)
    }
};
