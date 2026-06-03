import { basename } from 'path';
import { PDFDocument } from 'pdf-lib';
import type { HwpPdfPagePayload } from '@/common/hwpMessageSchema';
import * as vscode from 'vscode';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const MAX_PDF_PAGE_SIZE = 14400;

export interface HwpPdfExportResult {
    targetUri: vscode.Uri;
    pageCount: number;
}

export async function showHwpPdfSaveDialog(sourceUri: vscode.Uri): Promise<vscode.Uri | undefined> {
    const defaultName = basename(sourceUri.fsPath).replace(/\.[^.]+$/, '.pdf');
    return await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.joinPath(sourceUri, '..', defaultName),
        filters: { PDF: ['pdf'] },
        saveLabel: 'Save PDF',
        title: 'Save HWP/HWPX as PDF',
    });
}

export async function exportHwpPdf(
    sourceUri: vscode.Uri,
    pages: HwpPdfPagePayload[],
    targetUri?: vscode.Uri,
): Promise<HwpPdfExportResult | undefined> {
    if (pages.length === 0) {
        throw new Error('HWP viewer did not return pages for PDF export.');
    }

    const resolvedTargetUri = targetUri ?? await showHwpPdfSaveDialog(sourceUri);
    if (!resolvedTargetUri) return undefined;

    const pdfBytes = await buildHwpPdf(pages, basename(sourceUri.fsPath));
    await vscode.workspace.fs.writeFile(resolvedTargetUri, Buffer.from(pdfBytes));
    return { targetUri: resolvedTargetUri, pageCount: pages.length };
}

async function buildHwpPdf(pages: HwpPdfPagePayload[], title: string): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    pdf.setTitle(title);
    pdf.setCreator('code-office');
    pdf.setProducer('code-office HWP/HWPX viewer');

    for (const page of pages) {
        const width = normalizePdfDimension(page.width);
        const height = normalizePdfDimension(page.height);
        const imageBytes = decodePng(page.pngBase64);
        const image = await pdf.embedPng(imageBytes);
        const pdfPage = pdf.addPage([width, height]);
        pdfPage.drawImage(image, { x: 0, y: 0, width, height });
    }

    return await pdf.save();
}

function normalizePdfDimension(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error('HWP PDF export received an invalid page size.');
    }
    return Math.min(Math.max(value, 1), MAX_PDF_PAGE_SIZE);
}

function decodePng(base64: string): Uint8Array {
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length < PNG_SIGNATURE.length || !PNG_SIGNATURE.every((value, index) => buffer[index] === value)) {
        throw new Error('HWP PDF export received an invalid PNG page.');
    }
    return new Uint8Array(buffer);
}
