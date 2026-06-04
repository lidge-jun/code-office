/**
 * PPTX handler — extension host side.
 *
 * Sends the file URI to the WebView so pptx-renderer can fetch and render
 * directly in the browser. Replaces the old cheerio-based text extraction.
 */

import { basename } from 'path';
import { Handler } from '@/common/handler';
import { Uri } from 'vscode';

export function handlePptx(uri: { fsPath: string }, handler: Handler): void {
    handler.on('init', async () => {
        const fsPath = uri.fsPath;
        const webviewUri = handler.panel.webview.asWebviewUri(Uri.file(fsPath));
        handler.emit('pptxOpen', {
            path: webviewUri.toString(),
            name: basename(fsPath),
        });
    });
}
