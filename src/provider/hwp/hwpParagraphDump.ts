import { basename, join } from 'path';
import { readFileSync } from 'fs';
import * as vscode from 'vscode';

interface RhwpModule {
    initSync(input: { module: Buffer }): unknown;
    HwpDocument: new (data: Uint8Array) => RhwpDocument;
}

interface RhwpDocument {
    getSectionCount(): number;
    getParagraphCount(sectionIndex: number): number;
    getParaPropertiesAt(sectionIndex: number, paragraphIndex: number): string;
    getLineInfo(sectionIndex: number, paragraphIndex: number, charOffset: number): string;
    pageCount?(): number;
    free?(): void;
}

let rhwpModule: RhwpModule | undefined;

export async function dumpHwpParagraph(
    uri: vscode.Uri,
    extensionPath: string,
    output: vscode.OutputChannel,
): Promise<void> {
    if (uri.scheme !== 'file') {
        throw new Error('Paragraph dump supports local HWP/HWPX files only.');
    }

    const rhwp = loadRhwpModule(extensionPath);
    const bytes = readFileSync(uri.fsPath);
    const document = new rhwp.HwpDocument(new Uint8Array(bytes));
    try {
        const sectionIndex = await pickSection(document);
        if (sectionIndex === undefined) return;
        const paragraphIndex = await pickParagraph(document, sectionIndex);
        if (paragraphIndex === undefined) return;

        output.clear();
        output.appendLine(`HWP paragraph dump: ${basename(uri.fsPath)}`);
        output.appendLine(`Path: ${uri.fsPath}`);
        output.appendLine(`Pages: ${document.pageCount?.() ?? 'unknown'}`);
        output.appendLine(`Section: ${sectionIndex + 1}`);
        output.appendLine(`Paragraph: ${paragraphIndex + 1}`);
        output.appendLine('');
        output.appendLine('Paragraph properties');
        output.appendLine(formatJsonString(document.getParaPropertiesAt(sectionIndex, paragraphIndex)));
        output.appendLine('');
        output.appendLine('Line info at char offset 0');
        output.appendLine(formatJsonString(document.getLineInfo(sectionIndex, paragraphIndex, 0)));
        output.show(true);
    } finally {
        document.free?.();
    }
}

function loadRhwpModule(extensionPath: string): RhwpModule {
    if (rhwpModule) return rhwpModule;
    const mediaRoot = join(extensionPath, 'resource', 'rhwp-vscode');
    const wasm = readFileSync(join(mediaRoot, 'rhwp_bg.wasm'));
    const rhwp = require(join(mediaRoot, 'rhwp.js')) as RhwpModule;
    rhwp.initSync({ module: wasm });
    rhwpModule = rhwp;
    return rhwp;
}

async function pickSection(document: RhwpDocument): Promise<number | undefined> {
    const count = document.getSectionCount();
    const picked = await vscode.window.showQuickPick(
        Array.from({ length: count }, (_value, index) => ({
            label: `Section ${index + 1}`,
            index,
        })),
        { placeHolder: 'Select an HWP section to dump' },
    );
    return picked?.index;
}

async function pickParagraph(document: RhwpDocument, sectionIndex: number): Promise<number | undefined> {
    const count = document.getParagraphCount(sectionIndex);
    const picked = await vscode.window.showQuickPick(
        Array.from({ length: count }, (_value, index) => ({
            label: `Paragraph ${index + 1}`,
            index,
        })),
        { placeHolder: 'Select an HWP paragraph to dump' },
    );
    return picked?.index;
}

function formatJsonString(value: string): string {
    try {
        return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
        return value;
    }
}
