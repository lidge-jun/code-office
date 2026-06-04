/**
 * DOCX Editor Provider — CustomEditorProvider for .docx/.dotx files.
 *
 * Follows the HwpEditorProvider pattern:
 *   - openCustomDocument: reads file into DocxCustomDocument
 *   - resolveCustomEditor: sets up WebView with DocxEditor component
 *   - saveCustomDocument: requests export from WebView via DocxSaveBridge
 *
 * The WebView uses @eigenpal/docx-editor-react for full WYSIWYG editing.
 */

import * as vscode from 'vscode';
import { Handler } from '@/common/handler';
import { ReactApp } from '@/common/reactApp';
import { handleCommonEvent } from '@/provider/compress/commonHandler';
import { handleDocx, DocxSaveBridge } from '@/provider/handlers/docxHandler';
import { DocxCustomDocument } from './DocxCustomDocument';

const VIEW_TYPE = 'cweijan.docxEditor';

export class DocxEditorProvider implements vscode.CustomEditorProvider<DocxCustomDocument> {
    private readonly changeEmitter = new vscode.EventEmitter<vscode.CustomDocumentContentChangeEvent<DocxCustomDocument>>();
    public readonly onDidChangeCustomDocument = this.changeEmitter.event;
    private readonly documents = new Set<DocxCustomDocument>();
    private readonly saveBridges = new Map<string, DocxSaveBridge>();

    constructor(private readonly context: vscode.ExtensionContext) {}

    public static register(
        context: vscode.ExtensionContext,
        viewOption: { webviewOptions: vscode.WebviewPanelOptions },
    ): vscode.Disposable {
        return vscode.window.registerCustomEditorProvider(
            VIEW_TYPE,
            new DocxEditorProvider(context),
            viewOption,
        );
    }

    public async openCustomDocument(
        uri: vscode.Uri,
        openContext: vscode.CustomDocumentOpenContext,
        _token: vscode.CancellationToken,
    ): Promise<DocxCustomDocument> {
        const initialBuffer = openContext.backupId
            ? await vscode.workspace.fs.readFile(vscode.Uri.parse(openContext.backupId))
            : openContext.untitledDocumentData;
        return new DocxCustomDocument(uri, initialBuffer);
    }

    public resolveCustomEditor(
        document: DocxCustomDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken,
    ): void | Thenable<void> {
        const webview = webviewPanel.webview;
        const folderPath = vscode.Uri.joinPath(document.uri, '..');

        webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(this.context.extensionPath),
                folderPath,
            ],
        };

        const handler = Handler.bind(webviewPanel, document.uri);
        document.handler = handler;
        document.webviewPanel = webviewPanel;
        this.documents.add(document);

        webviewPanel.onDidDispose(() => this.clearDocument(document));
        handleCommonEvent(document.uri, handler);

        // Set up DOCX handler with save bridge
        const bridge = handleDocx(document.uri, handler, {
            onDirtyChange: (isDirty) => this.setDirty(document, isDirty),
        });
        this.saveBridges.set(document.uri.toString(), bridge);

        // Render the React WebView with the 'word' route
        return ReactApp.view(webview, { route: 'word' });
    }

    public async saveCustomDocument(
        document: DocxCustomDocument,
        _token: vscode.CancellationToken,
    ): Promise<void> {
        if (!document.isDirty) return;

        const bridge = this.saveBridges.get(document.uri.toString());
        if (!bridge) {
            throw new Error('DOCX save bridge not available.');
        }

        const payload = await bridge.requestSave();
        if (!payload.success) {
            throw new Error(payload.error || 'DOCX save failed.');
        }

        if (payload.bytes) {
            const buffer = Buffer.from(payload.bytes);
            await vscode.workspace.fs.writeFile(document.uri, buffer);
        }

        this.setDirty(document, false);
    }

    public async saveCustomDocumentAs(
        document: DocxCustomDocument,
        destination: vscode.Uri,
        _token: vscode.CancellationToken,
    ): Promise<void> {
        const bridge = this.saveBridges.get(document.uri.toString());
        if (!bridge) {
            throw new Error('DOCX save bridge not available.');
        }

        const payload = await bridge.requestSave();
        if (!payload.success) {
            throw new Error(payload.error || 'DOCX save failed.');
        }

        if (payload.bytes) {
            const buffer = Buffer.from(payload.bytes);
            await vscode.workspace.fs.writeFile(destination, buffer);
        }

        this.setDirty(document, false);
    }

    public async revertCustomDocument(
        document: DocxCustomDocument,
        _token: vscode.CancellationToken,
    ): Promise<void> {
        // Re-read the file from disk and send to WebView
        const buffer = await vscode.workspace.fs.readFile(document.uri);
        document.handler?.emit('openBuffer', {
            buffer: Array.from(buffer),
        });
        this.setDirty(document, false);
    }

    public async backupCustomDocument(
        document: DocxCustomDocument,
        context: vscode.CustomDocumentBackupContext,
        _token: vscode.CancellationToken,
    ): Promise<vscode.CustomDocumentBackup> {
        // Try to get current state from the editor
        const bridge = this.saveBridges.get(document.uri.toString());
        if (bridge) {
            try {
                const payload = await bridge.requestSave();
                if (payload.success && payload.bytes) {
                    const buffer = Buffer.from(payload.bytes);
                    await vscode.workspace.fs.writeFile(context.destination, buffer);
                    return { id: context.destination.toString(), delete: () => vscode.workspace.fs.delete(context.destination) };
                }
            } catch { /* fall through to copy original */ }
        }

        // Fallback: copy the original file
        await vscode.workspace.fs.copy(document.uri, context.destination, { overwrite: true });
        return { id: context.destination.toString(), delete: () => vscode.workspace.fs.delete(context.destination) };
    }

    private setDirty(document: DocxCustomDocument, isDirty: boolean): void {
        if (document.isDirty === isDirty) return;
        document.isDirty = isDirty;
        if (isDirty) {
            this.changeEmitter.fire({ document });
        }
    }

    private clearDocument(document: DocxCustomDocument): void {
        const key = document.uri.toString();
        const bridge = this.saveBridges.get(key);
        if (bridge) {
            bridge.destroy();
            this.saveBridges.delete(key);
        }
        this.documents.delete(document);
        document.dispose();
    }
}
