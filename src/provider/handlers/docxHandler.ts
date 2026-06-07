/**
 * DOCX handler — extension host side.
 *
 * Bridges the WebView DocxEditor with the VS Code save lifecycle.
 * Follows the same pattern as hwpHandler.ts:
 *   - On "init", reads the file and sends the buffer to the webview
 *   - Tracks dirty state from the webview
 *   - Handles save requests/responses via requestId matching
 */

import { basename } from 'path';
import { Handler } from '@/common/handler';
import { commands, Uri, workspace } from 'vscode';

const DOCX_EVENTS = {
    init: 'init',
    open: 'open',
    openBuffer: 'openBuffer',
    dirtyChanged: 'docxDirtyChanged',
    hostSaveRequest: 'docxHostSaveRequest',
    saveRequest: 'docxSaveRequest',
    saveResponse: 'docxSaveResponse',
} as const;

interface DocxSaveResponsePayload {
    requestId: string;
    success: boolean;
    bytes?: number[];
    error?: string;
}

interface PendingSave {
    resolve: (payload: DocxSaveResponsePayload) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
}

interface DocxHandlerOptions {
    onDirtyChange?: (isDirty: boolean) => void;
    onSaveResponse?: (payload: DocxSaveResponsePayload) => void;
}

const SAVE_TIMEOUT_MS = 60000;

export class DocxSaveBridge {
    private pendingSaves = new Map<string, PendingSave>();

    constructor(
        private handler: Handler,
    ) {
        this.handler.on(DOCX_EVENTS.saveResponse, (payload: DocxSaveResponsePayload) => {
            this.resolvePendingSave(payload);
        });
    }

    async requestSave(): Promise<DocxSaveResponsePayload> {
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return new Promise<DocxSaveResponsePayload>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingSaves.delete(requestId);
                reject(new Error('Timed out while saving DOCX document.'));
            }, SAVE_TIMEOUT_MS);

            this.pendingSaves.set(requestId, { resolve, reject, timer });
            this.handler.emit(DOCX_EVENTS.saveRequest, { requestId });
        });
    }

    private resolvePendingSave(payload: DocxSaveResponsePayload): void {
        const pending = this.pendingSaves.get(payload.requestId);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pendingSaves.delete(payload.requestId);
        if (payload.success) {
            pending.resolve(payload);
        } else {
            pending.reject(new Error(payload.error || 'DOCX save failed.'));
        }
    }

    destroy(): void {
        for (const [, pending] of this.pendingSaves) {
            clearTimeout(pending.timer);
            pending.reject(new Error('DOCX editor was closed.'));
        }
        this.pendingSaves.clear();
    }
}

export function handleDocx(
    uri: { fsPath: string },
    handler: Handler,
    options: DocxHandlerOptions = {},
): DocxSaveBridge {
    const fsPath = uri.fsPath;
    const fileUri = Uri.file(fsPath);

    // On init, read the file and send buffer to the webview
    handler.on(DOCX_EVENTS.init, async () => {
        try {
            const buffer = await workspace.fs.readFile(fileUri);
            handler.emit(DOCX_EVENTS.openBuffer, {
                fileName: basename(fsPath),
                buffer: Array.from(buffer),
            });
        } catch (e) {
            handler.emit(DOCX_EVENTS.open, {
                path: handler.panel.webview.asWebviewUri(fileUri).toString(),
            });
        }
    });

    // Track dirty state
    handler.on(DOCX_EVENTS.dirtyChanged, (content: { isDirty: boolean }) => {
        options.onDirtyChange?.(content.isDirty);
    });

    handler.on(DOCX_EVENTS.hostSaveRequest, async () => {
        await commands.executeCommand('workbench.action.files.save');
    });

    return new DocxSaveBridge(handler);
}
