import { basename, extname } from 'path';
import { ReactApp } from '@/common/reactApp';
import { Handler } from '@/common/handler';
import {
    HWP_EVENTS,
    type HwpMode,
    type HwpPdfPagePayload,
    type HwpModePayload,
    type HwpViewerCommand,
    type HwpViewerCommandResultPayload,
    type HwpVscodeSaveResponsePayload,
} from '@/common/hwpMessageSchema';
import { handleCommonEvent } from '@/provider/compress/commonHandler';
import { handleHwp } from '@/provider/handlers/hwpHandler';
import { HwpCustomDocument } from './HwpCustomDocument';
import { buildHwpDebugOverlayHtml } from './hwpDebugOverlay';
import { dumpHwpParagraph } from './hwpParagraphDump';
import { exportHwpPdfWithNativeFirst } from './hwpPdfExportFlow';
import { getCodeOfficeSetting } from './hwpSettings';
import { getRhwpStudioConfig } from './hwpStudioConfig';
import { getHwpFormatFromPath, validateHwpFile, writeHwpDocument } from './hwpSaveService';
import * as vscode from 'vscode';

const VIEW_TYPE = 'cweijan.hwpEditor';
const EXPORT_TIMEOUT_MS = 120000;
const VIEWER_COMMAND_TIMEOUT_MS = 120000;
const HWP_LAST_MODE_STORAGE_KEY = 'code-office.hwp.lastMode';

interface PendingExport {
    documentUri: string;
    resolve: (payload: HwpVscodeSaveResponsePayload) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
}

interface PendingViewerCommand {
    documentUri: string;
    command: HwpViewerCommand;
    resolve: (payload: HwpViewerCommandResultPayload) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
}
export class HwpEditorProvider implements vscode.CustomEditorProvider<HwpCustomDocument> {
    private readonly changeEmitter = new vscode.EventEmitter<vscode.CustomDocumentContentChangeEvent<HwpCustomDocument>>();
    public readonly onDidChangeCustomDocument = this.changeEmitter.event;
    private readonly pendingExports = new Map<string, PendingExport>();
    private readonly pendingViewerCommands = new Map<string, PendingViewerCommand>();
    private readonly savingDocuments = new Set<string>();
    private readonly documents = new Set<HwpCustomDocument>();
    private readonly paragraphOutput = vscode.window.createOutputChannel('code-office HWP Paragraph Dump');

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
        document.mode = this.getLastMode();
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
        const rhwpStudio = getRhwpStudioConfig(webview, rhwpStudioRoot);
        handleHwp(document.uri, handler, {
            initialBuffer: document.initialBuffer,
            onDirtyChange: (isDirty) => this.setDirty(document, isDirty),
            onNativeSave: async () => this.saveActiveDocument(document),
            onVscodeSavePayload: (payload) => this.resolvePendingExport(payload),
            onModeChange: (payload) => this.handleModeChanged(document, payload),
            onViewerCommandRequest: (payload) => this.handleViewerCommandRequest(document, payload.command),
            onViewerCommandResult: (payload) => this.resolvePendingViewerCommand(payload),
        });

        return ReactApp.view(webview, {
            route: 'hwp',
            rhwpStudioUrl: rhwpStudio.rhwpStudioUrl,
            rhwpStudioHtml: rhwpStudio.rhwpStudioHtml,
            rhwpStudioBaseUrl: rhwpStudio.rhwpStudioBaseUrl,
            hwpInitialMode: document.mode,
            hwpExperimentalSave: this.isExperimentalSaveEnabled(),
            webviewFrameSources: rhwpStudio.webviewFrameSources,
            webviewConnectSources: rhwpStudio.webviewConnectSources,
        });
    }
    public async saveCustomDocument(document: HwpCustomDocument, token: vscode.CancellationToken): Promise<void> {
        if (document.mode === 'viewer' && !document.isDirty) return;
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

    public async switchActiveHwpMode(mode: HwpMode): Promise<void> {
        const document = this.getActiveDocument();
        if (!document?.handler) {
            throw new Error('No active HWP/HWPX editor is available.');
        }
        document.handler.emit(HWP_EVENTS.modeChangeRequest, { mode });
    }

    public async exportActiveHwpSvg(uri?: vscode.Uri): Promise<void> {
        const document = this.resolveTargetDocument(uri);
        const svgs = await this.requestViewerSvgCommand(document, 'exportSvg');
        const targetFolder = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            defaultUri: vscode.Uri.joinPath(document.uri, '..'),
            openLabel: 'Export SVG pages',
        });
        const folder = targetFolder?.[0];
        if (!folder) return;

        const baseName = basename(document.uri.fsPath).replace(/\.[^.]+$/, '');
        await Promise.all(svgs.map((svg, index) => {
            const target = vscode.Uri.joinPath(folder, `${baseName}_p${index + 1}.svg`);
            return vscode.workspace.fs.writeFile(target, Buffer.from(svg, 'utf8'));
        }));
        void vscode.window.showInformationMessage(`Exported ${svgs.length} HWP SVG page(s).`);
    }
    public async exportActiveHwpPdf(uri?: vscode.Uri): Promise<void> {
        const document = this.resolveTargetDocument(uri);
        await exportHwpPdfWithNativeFirst({
            extensionUri: this.context.extensionUri, document,
            saveIfDirty: () => this.saveActiveDocument(document),
            requestImagePages: () => this.requestViewerPdfCommand(document),
        });
    }

    public async showActiveHwpDebugOverlay(uri?: vscode.Uri): Promise<void> {
        const document = this.resolveTargetDocument(uri);
        const svgs = await this.requestViewerSvgCommand(document, 'debugOverlay');
        const panel = vscode.window.createWebviewPanel(
            'codeOfficeHwpDebugOverlay',
            `Debug Overlay ${basename(document.uri.fsPath)}`,
            vscode.ViewColumn.Beside,
            { enableScripts: false },
        );
        panel.webview.html = buildHwpDebugOverlayHtml(document, svgs);
    }

    public async dumpActiveHwpParagraph(uri?: vscode.Uri): Promise<void> {
        const openDocument = uri ? this.findOpenDocument(uri) : this.getActiveDocument();
        if (openDocument?.isDirty) {
            throw new Error('Save the HWP/HWPX document before dumping paragraph metadata.');
        }
        const target = uri ?? openDocument?.uri;
        if (!target) {
            throw new Error('No HWP/HWPX document is available to dump.');
        }
        await dumpHwpParagraph(target, this.context.extensionPath, this.paragraphOutput);
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
                documentUri: document.uri.toString(),
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

    private async requestViewerCommandPayload(
        document: HwpCustomDocument,
        command: HwpViewerCommand,
    ): Promise<HwpViewerCommandResultPayload> {
        if (!document.handler || !document.webviewPanel) {
            throw new Error('HWP viewer webview is not active; open the document before using this command.');
        }
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const payload = await new Promise<HwpViewerCommandResultPayload>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingViewerCommands.delete(requestId);
                reject(new Error(`Timed out while running HWP viewer command: ${command}`));
            }, VIEWER_COMMAND_TIMEOUT_MS);
            this.pendingViewerCommands.set(requestId, {
                documentUri: document.uri.toString(),
                command,
                resolve,
                reject,
                timer,
            });
            document.handler?.emit(HWP_EVENTS.viewerCommand, { requestId, command });
        });
        if (!payload.success) {
            throw new Error(payload.error || `HWP viewer command failed: ${command}`);
        }
        return payload;
    }

    private async requestViewerSvgCommand(
        document: HwpCustomDocument,
        command: Extract<HwpViewerCommand, 'exportSvg' | 'debugOverlay'>,
    ): Promise<string[]> {
        const payload = await this.requestViewerCommandPayload(document, command);
        if (!payload.svgs) throw new Error(`HWP viewer command did not return SVG pages: ${command}`);
        return payload.svgs;
    }

    private async requestViewerPdfCommand(document: HwpCustomDocument): Promise<HwpPdfPagePayload[]> {
        const payload = await this.requestViewerCommandPayload(document, 'exportPdf');
        if (!payload.pngs) throw new Error('HWP viewer command did not return PDF pages.');
        return payload.pngs;
    }

    private async saveActiveDocument(document: HwpCustomDocument): Promise<void> {
        const key = document.uri.toString();
        if (this.savingDocuments.has(key)) return;
        if (document.mode === 'viewer' && !document.isDirty) return;
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

    private resolvePendingViewerCommand(payload: HwpViewerCommandResultPayload): void {
        const pending = this.pendingViewerCommands.get(payload.requestId);
        if (!pending || pending.command !== payload.command) return;
        clearTimeout(pending.timer);
        this.pendingViewerCommands.delete(payload.requestId);
        if (payload.success) {
            pending.resolve(payload);
            return;
        }
        pending.reject(new Error(payload.error || `HWP viewer command failed: ${payload.command}`));
    }

    private handleModeChanged(document: HwpCustomDocument, payload: HwpModePayload): void {
        document.mode = payload.mode;
        this.setLastMode(payload.mode);
    }

    private async handleViewerCommandRequest(
        document: HwpCustomDocument,
        command: HwpViewerCommand,
    ): Promise<void> {
        if (command === 'exportSvg') {
            await this.exportActiveHwpSvg(document.uri);
            return;
        }
        if (command === 'exportPdf') {
            await this.exportActiveHwpPdf(document.uri);
            return;
        }
        if (command === 'dumpParagraph') {
            await this.dumpActiveHwpParagraph(document.uri);
            return;
        }
        await this.showActiveHwpDebugOverlay(document.uri);
    }

    private setDirty(document: HwpCustomDocument, isDirty: boolean): void {
        if (document.isDirty === isDirty) return;
        document.isDirty = isDirty;
        if (isDirty) {
            this.changeEmitter.fire({ document });
        }
    }

    private clearDocument(document: HwpCustomDocument): void {
        this.rejectPendingForDocument(document, 'HWP webview was closed.');
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

    private resolveTargetDocument(uri?: vscode.Uri): HwpCustomDocument {
        if (uri) {
            const document = this.findOpenDocument(uri);
            if (document) return document;
        }
        const active = this.getActiveDocument();
        if (active) return active;
        throw new Error('Open the HWP/HWPX document in code-office before using this viewer command.');
    }

    private findOpenDocument(uri: vscode.Uri): HwpCustomDocument | undefined {
        for (const document of this.documents) {
            if (document.uri.toString() === uri.toString()) return document;
        }
        return undefined;
    }

    private rejectPendingForDocument(document: HwpCustomDocument, message: string): void {
        const documentUri = document.uri.toString();
        for (const [requestId, pending] of this.pendingExports.entries()) {
            if (pending.documentUri !== documentUri) continue;
            clearTimeout(pending.timer);
            this.pendingExports.delete(requestId);
            pending.reject(new Error(message));
        }
        for (const [requestId, pending] of this.pendingViewerCommands.entries()) {
            if (pending.documentUri !== documentUri) continue;
            clearTimeout(pending.timer);
            this.pendingViewerCommands.delete(requestId);
            pending.reject(new Error(message));
        }
    }

    private isExperimentalSaveEnabled(): boolean {
        return getCodeOfficeSetting<boolean>('hwp.experimentalSave', true);
    }

    private getLastMode(): HwpMode {
        const mode = this.context.globalState.get<HwpMode>(HWP_LAST_MODE_STORAGE_KEY);
        return mode === 'editor' || mode === 'viewer' ? mode : 'viewer';
    }

    private setLastMode(mode: HwpMode): void {
        void this.context.globalState.update(HWP_LAST_MODE_STORAGE_KEY, mode);
    }

    private getExplicitHwpFormat(uri: vscode.Uri): 'hwp' | 'hwpx' | undefined {
        const ext = extname(uri.fsPath).toLowerCase();
        if (ext === '.hwp') return 'hwp';
        if (ext === '.hwpx') return 'hwpx';
        return undefined;
    }
}
