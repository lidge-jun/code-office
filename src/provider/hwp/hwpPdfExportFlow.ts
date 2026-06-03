import type { HwpPdfPagePayload } from '@/common/hwpMessageSchema';
import type { HwpCustomDocument } from './HwpCustomDocument';
import { exportHwpNativePdf } from './hwpNativePdfExport';
import { exportHwpPdf, showHwpPdfSaveDialog } from './hwpPdfExport';
import * as vscode from 'vscode';

interface HwpPdfExportFlowOptions {
    extensionUri: vscode.Uri;
    document: HwpCustomDocument;
    saveIfDirty: () => Promise<void>;
    requestImagePages: () => Promise<HwpPdfPagePayload[]>;
}

export async function exportHwpPdfWithNativeFirst(options: HwpPdfExportFlowOptions): Promise<void> {
    const targetUri = await showHwpPdfSaveDialog(options.document.uri);
    if (!targetUri) return;

    if (options.document.isDirty) {
        await options.saveIfDirty();
    }

    const nativeResult = await tryNativeExport(options.extensionUri, options.document.uri, targetUri);
    if (nativeResult) {
        const pages = nativeResult.pageCount ?? '?';
        void vscode.window.showInformationMessage(`Saved ${pages} native HWP PDF page(s): ${nativeResult.targetUri.fsPath}`);
        return;
    }

    const pages = await options.requestImagePages();
    const result = await exportHwpPdf(options.document.uri, pages, targetUri);
    if (!result) return;
    void vscode.window.showInformationMessage(`Saved ${result.pageCount} HWP image PDF page(s): ${result.targetUri.fsPath}`);
}

async function tryNativeExport(
    extensionUri: vscode.Uri,
    sourceUri: vscode.Uri,
    targetUri: vscode.Uri,
): Promise<Awaited<ReturnType<typeof exportHwpNativePdf>> | undefined> {
    try {
        return await exportHwpNativePdf(extensionUri, sourceUri, targetUri);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showWarningMessage(`Native HWP PDF export failed; using image fallback: ${message}`);
        return undefined;
    }
}
