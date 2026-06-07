/**
 * PPTX Viewer Provider — CustomEditorProvider for .pptx/.pptm/.ppsx files.
 *
 * PPTX remains a CustomEditor so it can own the default open path and route the
 * file URI into the WebView renderer. Editing was removed after QA because the
 * partial text panel behaved worse than an honest view-only tool.
 */

import * as vscode from 'vscode';
import { Handler } from '@/common/handler';
import { ReactApp } from '@/common/reactApp';
import { handleCommonEvent } from '@/provider/compress/commonHandler';
import { handlePptx } from '@/provider/handlers/pptxHandler';
import { PptxCustomDocument } from './PptxCustomDocument';

const VIEW_TYPE = 'cweijan.pptxEditor';

export class PptxEditorProvider implements vscode.CustomReadonlyEditorProvider<PptxCustomDocument> {
    constructor(private readonly context: vscode.ExtensionContext) {}

    public static register(
        context: vscode.ExtensionContext,
        viewOption: { webviewOptions: vscode.WebviewPanelOptions },
    ): vscode.Disposable {
        return vscode.window.registerCustomEditorProvider(VIEW_TYPE, new PptxEditorProvider(context), viewOption);
    }

    public async openCustomDocument(
        uri: vscode.Uri,
        openContext: vscode.CustomDocumentOpenContext,
        _token: vscode.CancellationToken,
    ): Promise<PptxCustomDocument> {
        return new PptxCustomDocument(uri);
    }

    public resolveCustomEditor(
        document: PptxCustomDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken,
    ): void | Thenable<void> {
        const webview = webviewPanel.webview;
        const folderPath = vscode.Uri.joinPath(document.uri, '..');
        webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(this.context.extensionPath), folderPath],
        };

        const handler = Handler.bind(webviewPanel, document.uri);
        document.handler = handler;
        document.webviewPanel = webviewPanel;
        webviewPanel.onDidDispose(() => this.clearDocument(document));
        handleCommonEvent(document.uri, handler);

        handlePptx(document.uri, handler);

        return ReactApp.view(webview, { route: 'pptx' });
    }

    private clearDocument(document: PptxCustomDocument): void {
        document.dispose();
    }
}
