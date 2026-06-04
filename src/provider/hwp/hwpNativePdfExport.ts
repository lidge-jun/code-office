import { access, stat } from 'fs/promises';
import { constants } from 'fs';
import { execFile } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import * as vscode from 'vscode';

const runFile = promisify(execFile);
const NATIVE_PDF_TIMEOUT_MS = 120000;

export interface HwpNativePdfExportResult {
    targetUri: vscode.Uri;
    pageCount?: number;
    byteCount: number;
}

interface NativeExportJson {
    backend?: string;
    pages?: number;
    bytes?: number;
}

export async function exportHwpNativePdf(
    extensionUri: vscode.Uri,
    sourceUri: vscode.Uri,
    targetUri: vscode.Uri,
): Promise<HwpNativePdfExportResult | undefined> {
    if (sourceUri.scheme !== 'file' || targetUri.scheme !== 'file') {
        return undefined;
    }
    const helper = await resolveNativePdfHelper(extensionUri);
    if (!helper) return undefined;

    const { stdout } = await runFile(helper, ['--input', sourceUri.fsPath, '--output', targetUri.fsPath], {
        timeout: NATIVE_PDF_TIMEOUT_MS,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
    });
    const output = parseNativeOutput(stdout);
    const written = await stat(targetUri.fsPath);
    return {
        targetUri,
        pageCount: output?.pages,
        byteCount: output?.bytes ?? written.size,
    };
}

async function resolveNativePdfHelper(extensionUri: vscode.Uri): Promise<string | undefined> {
    const platformKey = `${process.platform}-${process.arch}`;
    const binaryName = process.platform === 'win32' ? 'rhwp-pdf-export.exe' : 'rhwp-pdf-export';
    const helperPath = join(extensionUri.fsPath, 'resource', 'rhwp-native', platformKey, binaryName);
    try {
        await access(helperPath, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
        return helperPath;
    } catch {
        return undefined;
    }
}

function parseNativeOutput(stdout: string): NativeExportJson | undefined {
    const line = stdout.trim().split(/\r?\n/).reverse().find((value) => value.trim().startsWith('{'));
    if (!line) return undefined;
    try {
        const parsed = JSON.parse(line) as NativeExportJson;
        return parsed.backend === 'rhwp-native' ? parsed : undefined;
    } catch {
        return undefined;
    }
}
