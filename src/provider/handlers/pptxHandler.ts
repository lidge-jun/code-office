/**
 * PPTX handler — extension host side.
 *
 * Sends file URI to WebView for high-fidelity view-only rendering.
 *
 * Events:
 *   Extension → WebView:
 *     "pptxOpen"        → { path, name }  (WebView-accessible URI)
 *
 *   WebView → Extension:
 *     "init"              → ready signal
 */

import { basename } from 'path';
import { Handler } from '@/common/handler';
import { Uri } from 'vscode';

export function handlePptx(
    uri: { fsPath: string },
    handler: Handler,
): void {
    const fsPath = uri.fsPath;
    const fileUri = Uri.file(fsPath);

    handler.on('init', async () => {
        const webviewUri = handler.panel.webview.asWebviewUri(fileUri);
        handler.emit('pptxOpen', {
            path: webviewUri.toString(),
            name: basename(fsPath),
        });
    });
}
