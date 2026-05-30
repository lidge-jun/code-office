import { basename, extname } from 'path';
import { readFileSync } from 'fs';
import { ReactApp } from '@/common/reactApp';
import { Handler } from '@/common/handler';
import { HWP_EVENTS, type HwpVscodeSaveResponsePayload } from '@/common/hwpMessageSchema';
import { handleCommonEvent } from '@/provider/compress/commonHandler';
import { handleHwp } from '@/provider/handlers/hwpHandler';
import { HwpCustomDocument } from './HwpCustomDocument';
import { getHwpFormatFromPath, validateHwpFile, writeHwpDocument } from './hwpSaveService';
import * as vscode from 'vscode';

const VIEW_TYPE = 'cweijan.hwpEditor';
const DEFAULT_RHWP_STUDIO_URL = '';
const EXPORT_TIMEOUT_MS = 120000;

interface RhwpStudioConfig {
    rhwpStudioUrl?: string;
    rhwpStudioHtml?: string;
    rhwpStudioBaseUrl?: string;
    webviewFrameSources: string[];
    webviewConnectSources: string[];
}

interface PendingExport {
    resolve: (payload: HwpVscodeSaveResponsePayload) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
}

export class HwpEditorProvider implements vscode.CustomEditorProvider<HwpCustomDocument> {
    private readonly changeEmitter = new vscode.EventEmitter<vscode.CustomDocumentContentChangeEvent<HwpCustomDocument>>();
    public readonly onDidChangeCustomDocument = this.changeEmitter.event;
    private readonly pendingExports = new Map<string, PendingExport>();
    private readonly savingDocuments = new Set<string>();
    private readonly documents = new Set<HwpCustomDocument>();

    constructor(private readonly context: vscode.ExtensionContext) { }

    public static register(
        context: vscode.ExtensionContext,
        viewOption: { webviewOptions: vscode.WebviewPanelOptions },
    ): vscode.Disposable {
        return vscode.window.registerCustomEditorProvider(VIEW_TYPE, new HwpEditorProvider(context), viewOption);
    }

    public async openCustomDocument(
        uri: vscode.Uri,
        openContext: vscode.CustomDocumentOpenContext,
        _token: vscode.CancellationToken,
    ): Promise<HwpCustomDocument> {
        const initialBuffer = openContext.backupId
            ? await vscode.workspace.fs.readFile(vscode.Uri.parse(openContext.backupId))
            : openContext.untitledDocumentData;
        return new HwpCustomDocument(uri, initialBuffer);
    }

    public resolveCustomEditor(
        document: HwpCustomDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken,
    ): void | Thenable<void> {
        const webview = webviewPanel.webview;
        const folderPath = vscode.Uri.joinPath(document.uri, '..');
        const rhwpStudioRoot = vscode.Uri.file(`${this.context.extensionPath}/resource/rhwp-studio`);
        webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(this.context.extensionPath),
                rhwpStudioRoot,
                folderPath,
                this.context.globalStorageUri,
            ],
        };

        const handler = Handler.bind(webviewPanel, document.uri);
        document.handler = handler;
        document.webviewPanel = webviewPanel;
        this.documents.add(document);
        webviewPanel.onDidDispose(() => this.clearDocument(document));
        handleCommonEvent(document.uri, handler);
        const rhwpStudio = this.getRhwpStudioConfig(webview, rhwpStudioRoot);
        handleHwp(document.uri, handler, {
            initialBuffer: document.initialBuffer,
            onDirtyChange: (isDirty) => this.setDirty(document, isDirty),
            onNativeSave: async () => this.saveActiveDocument(document),
            onVscodeSavePayload: (payload) => this.resolvePendingExport(payload),
        });

        return ReactApp.view(webview, {
            route: 'hwp',
            rhwpStudioUrl: rhwpStudio.rhwpStudioUrl,
            rhwpStudioHtml: rhwpStudio.rhwpStudioHtml,
            rhwpStudioBaseUrl: rhwpStudio.rhwpStudioBaseUrl,
            hwpExperimentalSave: this.isExperimentalSaveEnabled(),
            webviewFrameSources: rhwpStudio.webviewFrameSources,
            webviewConnectSources: rhwpStudio.webviewConnectSources,
        });
    }

    public async saveCustomDocument(document: HwpCustomDocument, token: vscode.CancellationToken): Promise<void> {
        const key = document.uri.toString();
        this.savingDocuments.add(key);
        try {
            const payload = await this.requestExport(document, token);
            await this.writePayload(document.uri, payload, undefined, { atomic: false });
            this.setDirty(document, false);
            document.handler?.emit(HWP_EVENTS.saveResult, {
                success: true,
                savedPath: document.uri.fsPath,
                format: payload.format,
            });
        } finally {
            this.savingDocuments.delete(key);
        }
    }

    public async saveCustomDocumentAs(
        document: HwpCustomDocument,
        destination: vscode.Uri,
        token: vscode.CancellationToken,
    ): Promise<void> {
        const targetFormat = this.getExplicitHwpFormat(destination) ?? getHwpFormatFromPath(document.uri.fsPath);
        const payload = await this.requestExport(document, token, targetFormat);
        await this.writePayload(destination, payload, targetFormat);
        this.setDirty(document, false);
        document.handler?.emit(HWP_EVENTS.saveResult, {
            success: true,
            savedPath: destination.fsPath,
            format: payload.format,
        });
    }

    public async saveActiveHwpDocument(): Promise<void> {
        const document = this.getActiveDocument();
        if (!document) {
            throw new Error('No active HWP/HWPX editor is available to save.');
        }
        await this.saveActiveDocument(document);
    }

    public async revertCustomDocument(document: HwpCustomDocument, _token: vscode.CancellationToken): Promise<void> {
        const buffer = await vscode.workspace.fs.readFile(document.uri);
        validateHwpFile(buffer, extname(document.uri.fsPath).toLowerCase());
        document.initialBuffer = buffer;
        document.handler?.emit(HWP_EVENTS.reloadFile, {
            fileName: basename(document.uri.fsPath),
            buffer: Array.from(buffer),
            fileSize: buffer.byteLength,
            isHwpx: extname(document.uri.fsPath).toLowerCase() === '.hwpx',
        });
        this.setDirty(document, false);
    }

    public async backupCustomDocument(
        document: HwpCustomDocument,
        context: vscode.CustomDocumentBackupContext,
        token: vscode.CancellationToken,
    ): Promise<vscode.CustomDocumentBackup> {
        const payload = await this.requestExport(document, token).catch(async () => {
            const buffer = await vscode.workspace.fs.readFile(document.uri);
            const fallbackPayload: HwpVscodeSaveResponsePayload = {
                requestId: 'fallback-backup',
                success: true,
                bytes: Array.from(buffer),
                sourceFileName: basename(document.uri.fsPath),
                isHwpx: extname(document.uri.fsPath).toLowerCase() === '.hwpx',
                format: getHwpFormatFromPath(document.uri.fsPath),
            };
            return fallbackPayload;
        });
        await this.writePayload(context.destination, payload);
        return {
            id: context.destination.toString(),
            delete: async () => {
                try {
                    await vscode.workspace.fs.delete(context.destination);
                } catch {
                    // VS Code treats missing backup files as already cleaned up.
                }
            },
        };
    }

    private async requestExport(
        document: HwpCustomDocument,
        token: vscode.CancellationToken,
        requestedFormat = getHwpFormatFromPath(document.uri.fsPath),
    ): Promise<HwpVscodeSaveResponsePayload> {
        if (!document.handler || !document.webviewPanel) {
            throw new Error('HWP editor webview is not active; open the document before saving.');
        }
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const format = requestedFormat;
        const payload = await new Promise<HwpVscodeSaveResponsePayload>((resolve, reject) => {
            const timer = setTimeout(() => {
                cancel.dispose();
                this.pendingExports.delete(requestId);
                reject(new Error('Timed out while exporting the HWP document.'));
            }, EXPORT_TIMEOUT_MS);
            const cancel = token.onCancellationRequested(() => {
                clearTimeout(timer);
                cancel.dispose();
                this.pendingExports.delete(requestId);
                reject(new Error('HWP export cancelled.'));
            });
            this.pendingExports.set(requestId, {
                resolve: (value) => {
                    cancel.dispose();
                    resolve(value);
                },
                reject: (error) => {
                    cancel.dispose();
                    reject(error);
                },
                timer,
            });
            document.handler?.emit(HWP_EVENTS.vscodeSave, { requestId, format });
        });
        if (!payload.success) {
            throw new Error(payload.error || 'HWP export failed.');
        }
        return payload;
    }

    private async saveActiveDocument(document: HwpCustomDocument): Promise<void> {
        const key = document.uri.toString();
        if (this.savingDocuments.has(key)) return;
        if (!document.webviewPanel) {
            throw new Error('HWP editor webview is not active; open the document before saving.');
        }
        this.setDirty(document, true);
        document.webviewPanel.reveal(undefined, true);
        await vscode.commands.executeCommand('workbench.action.files.save');
        if (document.isDirty) {
            throw new Error('VS Code did not run the HWP save lifecycle for the active editor.');
        }
    }

    private async writePayload(
        uri: vscode.Uri,
        payload: HwpVscodeSaveResponsePayload,
        expectedFormat = this.getExplicitHwpFormat(uri),
        options?: { atomic?: boolean },
    ): Promise<void> {
        if (!payload.bytes || !payload.format) {
            throw new Error(payload.error || 'HWP export did not return document bytes.');
        }
        if (expectedFormat && payload.format !== expectedFormat) {
            throw new Error(`Refusing to write ${payload.format.toUpperCase()} bytes to ${expectedFormat.toUpperCase()} destination.`);
        }
        await writeHwpDocument(uri, new Uint8Array(payload.bytes), payload.format, options);
    }

    private resolvePendingExport(payload: HwpVscodeSaveResponsePayload): void {
        const pending = this.pendingExports.get(payload.requestId);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pendingExports.delete(payload.requestId);
        if (payload.success) {
            pending.resolve(payload);
            return;
        }
        pending.reject(new Error(payload.error || 'HWP export failed.'));
    }

    private setDirty(document: HwpCustomDocument, isDirty: boolean): void {
        if (document.isDirty === isDirty) return;
        document.isDirty = isDirty;
        if (isDirty) {
            this.changeEmitter.fire({ document });
        }
    }

    private clearDocument(document: HwpCustomDocument): void {
        this.documents.delete(document);
        document.handler = undefined;
        document.webviewPanel = undefined;
    }

    private getActiveDocument(): HwpCustomDocument | undefined {
        for (const document of this.documents) {
            if (document.webviewPanel?.active) return document;
        }
        return undefined;
    }

    private getRhwpStudioConfig(webview: vscode.Webview, rhwpStudioRoot: vscode.Uri): RhwpStudioConfig {
        const configured = getCodeOfficeSetting<string>('hwp.studioUrl', DEFAULT_RHWP_STUDIO_URL)?.trim();
        if (!configured) {
            return this.getBundledRhwpStudioConfig(webview, rhwpStudioRoot);
        }
        try {
            const rhwpStudioUrl = new URL(configured).toString();
            return {
                rhwpStudioUrl,
                webviewFrameSources: [rhwpStudioUrl],
                webviewConnectSources: [rhwpStudioUrl],
            };
        } catch {
            void vscode.window.showWarningMessage('Invalid code-office.hwp.studioUrl. Falling back to bundled rhwp-studio.');
            return this.getBundledRhwpStudioConfig(webview, rhwpStudioRoot);
        }
    }

    private getBundledRhwpStudioConfig(webview: vscode.Webview, rhwpStudioRoot: vscode.Uri): RhwpStudioConfig {
        const indexUri = vscode.Uri.joinPath(rhwpStudioRoot, 'index.html');
        const baseUrl = webview.asWebviewUri(rhwpStudioRoot).toString();
        return {
            rhwpStudioHtml: readFileSync(indexUri.fsPath, 'utf8'),
            rhwpStudioBaseUrl: baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
            webviewFrameSources: [],
            webviewConnectSources: [],
        };
    }

    private isExperimentalSaveEnabled(): boolean {
        return getCodeOfficeSetting<boolean>('hwp.experimentalSave', true);
    }

    private getExplicitHwpFormat(uri: vscode.Uri): 'hwp' | 'hwpx' | undefined {
        const ext = extname(uri.fsPath).toLowerCase();
        if (ext === '.hwp') return 'hwp';
        if (ext === '.hwpx') return 'hwpx';
        return undefined;
    }
}

function getCodeOfficeSetting<T>(key: string, defaultValue: T): T {
    const current = getUserSetting<T>('code-office', key);
    if (current !== undefined) return current;
    const legacy = getUserSetting<T>('vscode-obsdian', key);
    if (legacy !== undefined) return legacy;
    return vscode.workspace.getConfiguration('code-office').get<T>(key, defaultValue);
}

function getUserSetting<T>(section: string, key: string): T | undefined {
    const inspected = vscode.workspace.getConfiguration(section).inspect<T>(key);
    return inspected?.workspaceFolderLanguageValue
        ?? inspected?.workspaceFolderValue
        ?? inspected?.workspaceLanguageValue
        ?? inspected?.workspaceValue
        ?? inspected?.globalLanguageValue
        ?? inspected?.globalValue;
}
