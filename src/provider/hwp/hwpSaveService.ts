import { basename, dirname, extname, join } from 'path';
import { Uri, window, workspace } from 'vscode';
import type { HwpSavePayload } from '@/common/hwpMessageSchema';

export type HwpFormat = HwpSavePayload['format'];

interface WriteHwpDocumentOptions {
    atomic?: boolean;
}

const MAX_HWP_BYTES = 50 * 1024 * 1024;
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const OVERWRITE = 'Overwrite';
const CHOOSE_ANOTHER = 'Choose Another File';

export function getHwpFormatFromPath(fsPath: string): HwpFormat {
    return extname(fsPath).toLowerCase() === '.hwpx' ? 'hwpx' : 'hwp';
}

export function validateHwpFile(buffer: Uint8Array, ext: string): void {
    if (buffer.byteLength > MAX_HWP_BYTES) {
        throw new Error(`HWP file is too large (${buffer.byteLength} bytes)`);
    }
    const expectedMagic = ext.toLowerCase() === '.hwpx' ? ZIP_MAGIC : OLE_MAGIC;
    if (!hasMagic(buffer, expectedMagic)) {
        throw new Error(`Invalid ${ext || 'HWP'} file signature`);
    }
}

export function validateExportedDocument(bytes: Uint8Array, format: HwpFormat): void {
    if (bytes.byteLength === 0) {
        throw new Error(`Exported ${format.toUpperCase()} is empty`);
    }
    const expectedMagic = format === 'hwpx' ? ZIP_MAGIC : OLE_MAGIC;
    if (!hasMagic(bytes, expectedMagic)) {
        throw new Error(`Exported bytes are not a valid ${format.toUpperCase()} file`);
    }
}

export async function writeHwpDocument(
    targetUri: Uri,
    bytes: Uint8Array,
    format: HwpFormat,
    options: WriteHwpDocumentOptions = {},
): Promise<void> {
    validateExportedDocument(bytes, format);
    if (options.atomic === false) {
        await writeFileInPlace(targetUri, bytes);
        return;
    }
    await atomicWriteFile(targetUri, bytes);
}

export async function resolveToolbarSaveTarget(
    fileUri: Uri,
    fsPath: string,
    ext: string,
    format: HwpFormat,
): Promise<Uri | undefined> {
    if (ext === '.hwpx' && format === 'hwp') {
        const hwpName = basename(fsPath, ext) + '.converted.hwp';
        const targetUri = Uri.file(join(dirname(fsPath), hwpName));
        return await resolveCollision(targetUri, 'Converted HWP already exists.', format);
    }

    const currentFormat = ext === '.hwpx' ? 'hwpx' : 'hwp';
    if (currentFormat === format) return fileUri;

    const defaultUri = Uri.file(join(dirname(fsPath), `${basename(fsPath, ext)}.${format}`));
    const choice = await window.showWarningMessage(
        `Overwrite the current ${currentFormat.toUpperCase()} file with rhwp editor output?`,
        { modal: true },
        OVERWRITE,
        CHOOSE_ANOTHER,
    );
    if (choice === OVERWRITE) return defaultUri;
    if (choice === CHOOSE_ANOTHER) {
        return await window.showSaveDialog({
            defaultUri,
            filters: getFormatFilters(format),
        });
    }
    return undefined;
}

export async function atomicWriteFile(targetUri: Uri, bytes: Uint8Array): Promise<void> {
    const tempUri = Uri.file(`${targetUri.fsPath}.tmp-${Date.now()}`);
    try {
        await workspace.fs.createDirectory(Uri.file(dirname(targetUri.fsPath)));
        await workspace.fs.writeFile(tempUri, bytes);
        await workspace.fs.rename(tempUri, targetUri, { overwrite: true });
    } catch (error) {
        try {
            await workspace.fs.delete(tempUri);
        } catch {
            // Ignore cleanup errors and surface the original write failure.
        }
        throw error;
    }
}

async function writeFileInPlace(targetUri: Uri, bytes: Uint8Array): Promise<void> {
    await workspace.fs.createDirectory(Uri.file(dirname(targetUri.fsPath)));
    await workspace.fs.writeFile(targetUri, bytes);
}

function hasMagic(bytes: Uint8Array, magic: number[]): boolean {
    if (bytes.byteLength < magic.length) return false;
    return magic.every((value, index) => bytes[index] === value);
}

async function resolveCollision(
    targetUri: Uri,
    message: string,
    format: HwpFormat,
): Promise<Uri | undefined> {
    if (!await pathExists(targetUri)) return targetUri;

    const choice = await window.showWarningMessage(
        message,
        { modal: true },
        OVERWRITE,
        CHOOSE_ANOTHER,
    );
    if (choice === OVERWRITE) return targetUri;
    if (choice === CHOOSE_ANOTHER) {
        return await window.showSaveDialog({
            defaultUri: targetUri,
            filters: getFormatFilters(format),
        });
    }
    return undefined;
}

function getFormatFilters(format: HwpFormat): Record<string, string[]> {
    return format === 'hwpx'
        ? { 'HWPX documents': ['hwpx'] }
        : { 'HWP documents': ['hwp'] };
}

async function pathExists(uri: Uri): Promise<boolean> {
    try {
        await workspace.fs.stat(uri);
        return true;
    } catch {
        return false;
    }
}
