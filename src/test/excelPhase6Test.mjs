import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { DOMParser } from '@xmldom/xmldom';

globalThis.DOMParser = DOMParser;

const require = createRequire(import.meta.url);
const XLSX = require('xlsx-js-style');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturePath = '/tmp/code-office-phase6-strike.xlsx';

function makeWorkbookBuffer() {
    const rows = [
        ['plain strike'],
        ['bold strike'],
        ['italic strike'],
        ['underline strike'],
        ['wrapped strike line 1\nline 2'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const styles = [
        { font: { strike: true } },
        { font: { strike: true, bold: true } },
        { font: { strike: true, italic: true } },
        { font: { strike: true, underline: 'single' } },
        { font: { strike: true }, alignment: { wrapText: true } },
    ];
    styles.forEach((style, index) => {
        const address = XLSX.utils.encode_cell({ r: index, c: 0 });
        ws[address].s = style;
    });
    ws['!cols'] = [{ wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Strike');
    return XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
}

function toArrayBuffer(value) {
    if (value instanceof ArrayBuffer) return value;
    if (ArrayBuffer.isView(value)) return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    return Uint8Array.from(value).buffer;
}

function readPackageText(buffer, packagePath) {
    const cfb = XLSX.CFB.read(new Uint8Array(toArrayBuffer(buffer)), { type: 'array' });
    const normalized = packagePath.replace(/^\/+/, '');
    const index = cfb.FullPaths.findIndex(item => item === `Root Entry/${normalized}` || item.endsWith(`/${normalized}`));
    const entry = cfb.FileIndex[index];
    return entry?.content ? new TextDecoder().decode(entry.content) : '';
}

async function bundleReader(tmpDir) {
    const outfile = path.join(tmpDir, 'excel-reader.cjs');
    await esbuild.build({
        entryPoints: [path.join(root, 'src/react/view/excel/excel_reader.ts')],
        outfile,
        bundle: true,
        platform: 'node',
        format: 'cjs',
    });
    return require(outfile);
}

async function bundleWriter(tmpDir) {
    const outfile = path.join(tmpDir, 'excel-writer.cjs');
    await esbuild.build({
        entryPoints: [path.join(root, 'src/react/view/excel/excel_writer.ts')],
        outfile,
        bundle: true,
        platform: 'node',
        format: 'cjs',
        plugins: [{
            name: 'vscode-handler-shim',
            setup(build) {
                build.onResolve({ filter: /util\/vscode$/ }, () => ({ path: 'vscode-shim', namespace: 'vscode-shim' }));
                build.onLoad({ filter: /.*/, namespace: 'vscode-shim' }, () => ({
                    contents: `
                        exports.handler = {
                            emit(event, data) {
                                globalThis.__excelPhase6Emits = globalThis.__excelPhase6Emits || [];
                                globalThis.__excelPhase6Emits.push({ event, data });
                            }
                        };
                    `,
                    loader: 'js',
                }));
            },
        }],
    });
    return require(outfile);
}

function cellStyle(data, rowIndex) {
    const cell = data.sheets[0].rows[rowIndex].cells[0];
    assert.notEqual(cell.style, undefined, `A${rowIndex + 1} should reference a style`);
    return data.sheets[0].styles[cell.style];
}

function assertRendererWiring() {
    const table = fs.readFileSync(path.join(root, 'src/react/view/excel/x-spreadsheet/component/table.js'), 'utf8');
    const draw = fs.readFileSync(path.join(root, 'src/react/view/excel/x-spreadsheet/canvas/draw.js'), 'utf8');
    assert.match(table, /strike:\s*style\.strike/);
    assert.match(draw, /if\s*\(\s*strike\s*\)\s*{\s*drawFontLine\.call\(this,\s*['"]strike['"]/s);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-office-excel-phase6-'));
const reader = await bundleReader(tmpDir);
const writer = await bundleWriter(tmpDir);

const fixtureBuffer = makeWorkbookBuffer();
fs.writeFileSync(fixturePath, Buffer.from(new Uint8Array(toArrayBuffer(fixtureBuffer))));

const loaded = reader.loadSheets(toArrayBuffer(fixtureBuffer), '.xlsx');
assert.equal(loaded.sheets[0].name, 'Strike');

const plain = cellStyle(loaded, 0);
assert.equal(plain.strike, true);

const bold = cellStyle(loaded, 1);
assert.equal(bold.strike, true);
assert.equal(bold.font.bold, true);

const italic = cellStyle(loaded, 2);
assert.equal(italic.strike, true);
assert.equal(italic.font.italic, true);

const underline = cellStyle(loaded, 3);
assert.equal(underline.strike, true);
assert.equal(underline.underline, true);

const wrapped = cellStyle(loaded, 4);
assert.equal(wrapped.strike, true);

globalThis.__excelPhase6Emits = [];
writer.export_xlsx({
    getData() {
        return [{
            name: 'Exported',
            styles: [{ strike: true, font: { bold: true, italic: true, size: 10, name: 'Arial' } }],
            rows: {
                len: 1,
                0: { cells: { 0: { text: 'exported strike', style: 0 } } },
            },
        }];
    },
}, 'xlsx');

const saveEvent = globalThis.__excelPhase6Emits.find(item => item.event === 'save');
assert.ok(saveEvent, 'writer should emit save');
const exportedBuffer = toArrayBuffer(saveEvent.data);
const exportedLoaded = reader.loadSheets(exportedBuffer, '.xlsx');
const exportedStyle = cellStyle(exportedLoaded, 0);
assert.equal(exportedStyle.strike, true);
assert.equal(exportedStyle.font.bold, true);
assert.equal(exportedStyle.font.italic, true);

const stylesXml = readPackageText(exportedBuffer, 'xl/styles.xml');
const sheetXml = readPackageText(exportedBuffer, 'xl/worksheets/sheet1.xml');
assert.match(stylesXml, /<strike\/>/);
assert.match(sheetXml, /<c[^>]+r="A1"[^>]+s="\d+"/);

assertRendererWiring();

console.log('excel phase6 checks passed');
