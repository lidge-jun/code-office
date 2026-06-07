/**
 * PPTX Editor Provider — CustomEditorProvider for .pptx/.pptm/.ppsx files.
 *
 * View mode: @aiden0z/pptx-renderer (high-fidelity HTML/SVG)
 * Edit mode: pptx-svg (MoonBit→WASM round-trip editing)
 * Save: pptx-svg exportPptx() → bytes → fs.writeFile
 */

import { basename } from 'path';
import * as vscode from 'vscode';
import { Handler } from '@/common/handler';
import { ReactApp } from '@/common/reactApp';
import { handleCommonEvent } from '@/provider/compress/commonHandler';
import { handlePptx, PptxSaveBridge } from '@/provider/handlers/pptxHandler';
import { PptxCustomDocument } from './PptxCustomDocument';

const VIEW_TYPE = 'cweijan.pptxEditor';

export class PptxEditorProvider implements vscode.CustomEditorProvider<PptxCustomDocument> {
    private readonly changeEmitter = new vscode.EventEmitter<vscode.CustomDocumentContentChangeEvent<PptxCustomDocument>>();
    public readonly onDidChangeCustomDocument = this.changeEmitter.event;
    private readonly documents = new Set<PptxCustomDocument>();
    private readonly saveBridges = new Map<string, PptxSaveBridge>();

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
        this.documents.add(document);
        webviewPanel.onDidDispose(() => this.clearDocument(document));
        handleCommonEvent(document.uri, handler);

        const bridge = handlePptx(document.uri, handler, {
            onDirtyChange: (isDirty) => this.setDirty(document, isDirty),
        });
        this.saveBridges.set(document.uri.toString(), bridge);

        return ReactApp.view(webview, { route: 'pptx' });
    }

    public async saveCustomDocument(document: PptxCustomDocument, _token: vscode.CancellationToken): Promise<void> {
        if (!document.isDirty) return;
        const bridge = this.saveBridges.get(document.uri.toString());
        if (!bridge) throw new Error('PPTX save bridge not available.');
        const payload = await bridge.requestSave();
        if (!payload.success) throw new Error(payload.error || 'PPTX save failed.');
        if (payload.bytes) await vscode.workspace.fs.writeFile(document.uri, new Uint8Array(payload.bytes));
        this.setDirty(document, false);
    }

    public async saveCustomDocumentAs(document: PptxCustomDocument, destination: vscode.Uri, _token: vscode.CancellationToken): Promise<void> {
        const bridge = this.saveBridges.get(document.uri.toString());
        if (!bridge) throw new Error('PPTX save bridge not available.');
        const payload = await bridge.requestSave();
        if (!payload.success) throw new Error(payload.error || 'PPTX save failed.');
        if (payload.bytes) await vscode.workspace.fs.writeFile(destination, new Uint8Array(payload.bytes));
        this.setDirty(document, false);
    }

    public async saveActivePptxDocument(): Promise<void> {
        const document = this.getActiveDocument();
        if (!document) {
            throw new Error('No active PPTX editor is available to save.');
        }
        await this.saveActiveDocument(document);
    }

    public async revertCustomDocument(document: PptxCustomDocument, _token: vscode.CancellationToken): Promise<void> {
        const webviewUri = document.handler?.panel.webview.asWebviewUri(document.uri);
        if (webviewUri) {
            document.handler?.emit('pptxOpen', {
                path: webviewUri.toString(),
                name: basename(document.uri.fsPath),
            });
        }
        this.setDirty(document, false);
    }

    public async backupCustomDocument(document: PptxCustomDocument, context: vscode.CustomDocumentBackupContext, _token: vscode.CancellationToken): Promise<vscode.CustomDocumentBackup> {
        const bridge = this.saveBridges.get(document.uri.toString());
        if (bridge) {
            try {
                const payload = await bridge.requestSave();
                if (payload.success && payload.bytes) {
                    await vscode.workspace.fs.writeFile(context.destination, new Uint8Array(payload.bytes));
                    return { id: context.destination.toString(), delete: () => vscode.workspace.fs.delete(context.destination) };
                }
            } catch { /* fall through */ }
        }
        await vscode.workspace.fs.copy(document.uri, context.destination, { overwrite: true });
        return { id: context.destination.toString(), delete: () => vscode.workspace.fs.delete(context.destination) };
    }

    private setDirty(document: PptxCustomDocument, isDirty: boolean): void {
        if (document.isDirty === isDirty) return;
        document.isDirty = isDirty;
        if (isDirty) this.changeEmitter.fire({ document });
    }

    private async saveActiveDocument(document: PptxCustomDocument): Promise<void> {
        const bridge = this.saveBridges.get(document.uri.toString());
        if (!bridge) throw new Error('PPTX save bridge not available.');
        const payload = await bridge.requestSave();
        if (!payload.success) throw new Error(payload.error || 'PPTX save failed.');
        if (!payload.bytes) throw new Error('PPTX save did not return document bytes.');
        await vscode.workspace.fs.writeFile(document.uri, new Uint8Array(payload.bytes));
        this.setDirty(document, false);
    }

    private getActiveDocument(): PptxCustomDocument | undefined {
        for (const document of this.documents) {
            if (document.webviewPanel?.active) return document;
        }
        return undefined;
    }

    private clearDocument(document: PptxCustomDocument): void {
        const key = document.uri.toString();
        const bridge = this.saveBridges.get(key);
        if (bridge) { bridge.destroy(); this.saveBridges.delete(key); }
        this.documents.delete(document);
        document.dispose();
    }
}
