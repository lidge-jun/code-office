/**
 * PPTX handler — extension host side.
 *
 * Sends file URI to WebView for rendering. Handles save lifecycle
 * when the user edits via pptx-svg in the WebView.
 *
 * Events:
 *   Extension → WebView:
 *     "pptxOpen"        → { path, name }  (WebView-accessible URI)
 *     "pptxSaveRequest" → { requestId }   (request save bytes)
 *
 *   WebView → Extension:
 *     "init"              → ready signal
 *     "pptxDirtyChanged"  → { isDirty }
 *     "pptxSaveResponse"  → { requestId, success, bytes?, error? }
 */

import { basename } from 'path';
import { Handler } from '@/common/handler';
import { Uri } from 'vscode';

interface PptxSaveResponsePayload {
    requestId: string;
    success: boolean;
    bytes?: number[];
    error?: string;
}

interface PendingSave {
    resolve: (payload: PptxSaveResponsePayload) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
}

const SAVE_TIMEOUT_MS = 120_000; // 2 minutes for large PPTX export

export class PptxSaveBridge {
    private pendingSaves = new Map<string, PendingSave>();

    constructor(private handler: Handler) {
        this.handler.on('pptxSaveResponse', (payload: PptxSaveResponsePayload) => {
            this.resolvePendingSave(payload);
        });
    }

    async requestSave(): Promise<PptxSaveResponsePayload> {
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return new Promise<PptxSaveResponsePayload>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingSaves.delete(requestId);
                reject(new Error('Timed out while saving PPTX document.'));
            }, SAVE_TIMEOUT_MS);

            this.pendingSaves.set(requestId, { resolve, reject, timer });
            this.handler.emit('pptxSaveRequest', { requestId });
        });
    }

    private resolvePendingSave(payload: PptxSaveResponsePayload): void {
        const pending = this.pendingSaves.get(payload.requestId);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pendingSaves.delete(payload.requestId);
        if (payload.success) {
            pending.resolve(payload);
        } else {
            pending.reject(new Error(payload.error || 'PPTX save failed.'));
        }
    }

    destroy(): void {
        for (const [, pending] of this.pendingSaves) {
            clearTimeout(pending.timer);
            pending.reject(new Error('PPTX editor was closed.'));
        }
        this.pendingSaves.clear();
    }
}

export function handlePptx(
    uri: { fsPath: string },
    handler: Handler,
    options: { onDirtyChange?: (isDirty: boolean) => void } = {},
): PptxSaveBridge {
    const fsPath = uri.fsPath;
    const fileUri = Uri.file(fsPath);

    handler.on('init', async () => {
        const webviewUri = handler.panel.webview.asWebviewUri(fileUri);
        handler.emit('pptxOpen', {
            path: webviewUri.toString(),
            name: basename(fsPath),
        });
    });

    // Track dirty state from WebView
    handler.on('pptxDirtyChanged', (content: { isDirty: boolean }) => {
        options.onDirtyChange?.(content.isDirty);
    });

    return new PptxSaveBridge(handler);
}
