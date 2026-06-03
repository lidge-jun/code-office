import { basename, extname } from 'path';
import { Handler } from '@/common/handler';
import {
    HWP_EVENTS,
    type HwpDirtyChangedPayload,
    type HwpModePayload,
    type HwpViewerCommandRequestPayload,
    type HwpSavePayload,
    type HwpViewerCommandResultPayload,
    type HwpVscodeSaveResponsePayload,
} from '@/common/hwpMessageSchema';
import { Uri, workspace } from 'vscode';
import {
    resolveToolbarSaveTarget,
    validateExportedDocument,
    validateHwpFile,
    writeHwpDocument,
} from '@/provider/hwp/hwpSaveService';

interface HwpHandlerOptions {
    studioHtml?: string;
    studioBaseUrl?: string;
    initialBuffer?: Uint8Array;
    onDirtyChange?: (isDirty: boolean) => void;
    onNativeSave?: () => Promise<void>;
    onVscodeSavePayload?: (payload: HwpVscodeSaveResponsePayload) => void;
    onModeChange?: (payload: HwpModePayload) => void;
    onViewerCommandRequest?: (payload: HwpViewerCommandRequestPayload) => Promise<void>;
    onViewerCommandResult?: (payload: HwpViewerCommandResultPayload) => void;
}

export function handleHwp(uri: { fsPath: string }, handler: Handler, options: HwpHandlerOptions = {}): void {
    const fsPath = uri.fsPath;
    const fileUri = Uri.file(fsPath);
    const ext = extname(fsPath).toLowerCase();

    handler.on(HWP_EVENTS.init, async () => {
        try {
            const buffer = options.initialBuffer ?? await workspace.fs.readFile(fileUri);
            validateHwpFile(buffer, ext);
            handler.emit(HWP_EVENTS.fileData, {
                fileName: basename(fsPath),
                buffer: Array.from(buffer),
                fileSize: buffer.byteLength,
                isHwpx: ext === '.hwpx',
                studioHtml: options.studioHtml,
                studioBaseUrl: options.studioBaseUrl,
            });
        } catch (e) {
            handler.emit(HWP_EVENTS.fileData, {
                fileName: basename(fsPath),
                buffer: [],
                fileSize: 0,
                isHwpx: ext === '.hwpx',
                error: e instanceof Error ? e.message : String(e),
            });
        }
    });

    handler.on(HWP_EVENTS.dirtyChanged, (content: HwpDirtyChangedPayload) => {
        options.onDirtyChange?.(content.isDirty);
    });

    handler.on(HWP_EVENTS.nativeSave, async () => {
        try {
            await options.onNativeSave?.();
        } catch (e) {
            handler.emit(HWP_EVENTS.saveResult, {
                success: false,
                error: e instanceof Error ? e.message : String(e),
            });
        }
    });

    handler.on(HWP_EVENTS.vscodeSavePayload, (content: HwpVscodeSaveResponsePayload) => {
        options.onVscodeSavePayload?.(content);
    });

    handler.on(HWP_EVENTS.modeChanged, (content: HwpModePayload) => {
        options.onModeChange?.(content);
    });

    handler.on(HWP_EVENTS.viewerCommandRequest, async (content: HwpViewerCommandRequestPayload) => {
        await options.onViewerCommandRequest?.(content);
    });

    handler.on(HWP_EVENTS.viewerCommandResult, (content: HwpViewerCommandResultPayload) => {
        options.onViewerCommandResult?.(content);
    });

    const experimentalSave = getCodeOfficeSetting<boolean>('hwp.experimentalSave', true);
    if (experimentalSave) {
        handler.on(HWP_EVENTS.requestSave, async (content: HwpSavePayload) => {
            try {
                const bytes = new Uint8Array(content.bytes);
                validateExportedDocument(bytes, content.format);
                const targetUri = await resolveToolbarSaveTarget(fileUri, fsPath, ext, content.format);
                if (!targetUri) {
                    handler.emit(HWP_EVENTS.saveResult, {
                        success: false,
                        error: 'Save cancelled',
                    });
                    return;
                }

                await writeHwpDocument(targetUri, bytes, content.format);
                options.onDirtyChange?.(false);
                handler.emit(HWP_EVENTS.saveResult, {
                    success: true,
                    savedPath: targetUri.fsPath,
                    convertedFromHwpx: ext === '.hwpx' && content.format === 'hwp',
                    format: content.format,
                });
            } catch (e) {
                handler.emit(HWP_EVENTS.saveResult, {
                    success: false,
                    error: e instanceof Error ? e.message : String(e),
                });
            }
        });
    }
}

function getCodeOfficeSetting<T>(key: string, defaultValue: T): T {
    const current = getUserSetting<T>('code-office', key);
    if (current !== undefined) return current;
    const legacy = getUserSetting<T>('vscode-obsdian', key);
    if (legacy !== undefined) return legacy;
    return workspace.getConfiguration('code-office').get<T>(key, defaultValue);
}

function getUserSetting<T>(section: string, key: string): T | undefined {
    const inspected = workspace.getConfiguration(section).inspect<T>(key);
    return inspected?.workspaceFolderLanguageValue
        ?? inspected?.workspaceFolderValue
        ?? inspected?.workspaceLanguageValue
        ?? inspected?.workspaceValue
        ?? inspected?.globalLanguageValue
        ?? inspected?.globalValue;
}
