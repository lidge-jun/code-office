/**
 * DOCX Editor Provider — CustomEditorProvider for .docx/.dotx files.
 *
 * Follows the HwpEditorProvider pattern:
 *   - openCustomDocument: reads file into DocxCustomDocument
 *   - resolveCustomEditor: sets up WebView with DocxEditor component
 *   - saveCustomDocument: requests export from WebView via DocxSaveBridge
 *
 * The WebView uses SuperDoc for browser-native DOCX rendering and editing.
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
            ? await this.tryReadBackup(openContext.backupId)
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
            initialBuffer: document.initialBuffer,
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
        await this.writeDocumentFromWebview(document);
    }

    public async saveActiveDocxDocument(): Promise<void> {
        const document = this.getActiveDocument();
        if (!document) {
            throw new Error('No active DOCX editor is available to save.');
        }
        await this.saveActiveDocument(document);
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
            const buffer = new Uint8Array(payload.bytes);
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
                const payload = await bridge.requestSave('backup');
                if (payload.success && payload.bytes) {
                    const buffer = new Uint8Array(payload.bytes);
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

    private async saveActiveDocument(document: DocxCustomDocument): Promise<void> {
        if (!document.webviewPanel) {
            throw new Error('DOCX editor webview is not active; open the document before saving.');
        }
        document.webviewPanel.reveal(undefined, true);
        await this.writeDocumentFromWebview(document);
    }

    private async writeDocumentFromWebview(document: DocxCustomDocument): Promise<void> {
        const bridge = this.saveBridges.get(document.uri.toString());
        if (!bridge) {
            throw new Error('DOCX save bridge not available.');
        }

        const payload = await bridge.requestSave();
        if (!payload.success) {
            throw new Error(payload.error || 'DOCX save failed.');
        }

        if (payload.bytes) {
            const buffer = new Uint8Array(payload.bytes);
            await vscode.workspace.fs.writeFile(document.uri, buffer);
        }

        this.setDirty(document, false);
    }

    private getActiveDocument(): DocxCustomDocument | undefined {
        for (const document of this.documents) {
            if (document.webviewPanel?.active) return document;
        }
        return undefined;
    }

    private async tryReadBackup(backupId: string): Promise<Uint8Array | undefined> {
        try {
            return await vscode.workspace.fs.readFile(vscode.Uri.parse(backupId));
        } catch {
            return undefined;
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
