import * as vscode from 'vscode';
import { readFileSync } from 'fs';
import { basename, extname } from 'path';
import { MarkdownEditorProvider } from './provider/markdownEditorProvider';
import { OfficeViewerProvider } from './provider/officeViewerProvider';
import { HwpEditorProvider } from './provider/hwp/HwpEditorProvider';
import { HtmlService } from './service/htmlService';
import { MarkdownService } from './service/markdownService';
import { Output } from './common/Output';
import { FileUtil } from './common/fileUtil';
import { ReactApp } from './common/reactApp';
import { Handler } from './common/handler';
import { handleCommonEvent } from './provider/compress/commonHandler';
import { convertPresentationWithLibreOffice } from './service/pptx/libreOfficeConverter';
import { parseWikilinkBody, ParsedWikilink } from './service/wikilink/wikilinkParser';
import { WikilinkResolver } from './service/wikilink/wikilinkResolver';
import { WikilinkIndex } from './service/wikilink/wikilinkIndex';
import { WikilinkCompletionProvider } from './provider/wikilink/wikilinkCompletionProvider';
import { WikilinkDocumentLinkProvider } from './provider/wikilink/wikilinkDocumentLinkProvider';
const httpExt = require('./bundle/extension');

export function activate(context: vscode.ExtensionContext) {
	keepOriginDiff();
	void ensureHwpEditorAssociation();
	activeHTTP(context)
	const viewOption = { webviewOptions: { retainContextWhenHidden: true, enableFindWidget: true } };
	FileUtil.init(context)
	ReactApp.init(context)
	const markdownService = new MarkdownService(context);
	const wikilinkIndex = new WikilinkIndex();
	const wikilinkResolver = new WikilinkResolver();
	wikilinkResolver.setIndex(wikilinkIndex);
	const viewerInstance = new OfficeViewerProvider(context);
	const markdownEditorProvider = new MarkdownEditorProvider(context, wikilinkResolver, wikilinkIndex)
	const hwpEditorProvider = new HwpEditorProvider(context);
	context.subscriptions.push(
		vscode.commands.registerCommand('office.quickOpen', () => vscode.commands.executeCommand('workbench.action.quickOpen')),
		vscode.commands.registerCommand('office.markdown.switch', (uri) => { markdownService.switchEditor(uri) }),
		vscode.commands.registerCommand('office.markdown.paste', () => { markdownService.loadClipboardImage() }),
		vscode.commands.registerCommand('office.html.preview', uri => HtmlService.previewHtml(uri, context)),
		vscode.commands.registerCommand('code-office.previewLegacyPresentation', uri => previewLegacyPresentation(uri, context)),
		vscode.commands.registerCommand('code-office.hwp.save', async () => {
			try {
				await hwpEditorProvider.saveActiveHwpDocument();
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				Output.debug(`code-office.hwp.save failed: ${message}`);
				void vscode.window.showErrorMessage(`Failed to save HWP/HWPX document: ${message}`);
			}
		}),
		vscode.commands.registerCommand('code-office.hwp.switchToViewer', () =>
			runHwpCommand('switchToViewer', () => hwpEditorProvider.switchActiveHwpMode('viewer'))),
		vscode.commands.registerCommand('code-office.hwp.switchToEditor', () =>
			runHwpCommand('switchToEditor', () => hwpEditorProvider.switchActiveHwpMode('editor'))),
		vscode.commands.registerCommand('code-office.hwp.exportSvg', (uri?: vscode.Uri) =>
			runHwpCommand('exportSvg', () => hwpEditorProvider.exportActiveHwpSvg(uri))),
		vscode.commands.registerCommand('code-office.hwp.debugOverlay', (uri?: vscode.Uri) =>
			runHwpCommand('debugOverlay', () => hwpEditorProvider.showActiveHwpDebugOverlay(uri))),
		vscode.commands.registerCommand('code-office.hwp.dumpParagraph', (uri?: vscode.Uri) =>
			runHwpCommand('dumpParagraph', () => hwpEditorProvider.dumpActiveHwpParagraph(uri))),
		vscode.commands.registerCommand('code-office.openWikilink', async ({ sourceUri, link }: { sourceUri: string; link: ParsedWikilink }) => {
			await wikilinkResolver.open(vscode.Uri.parse(sourceUri), link);
		}),
		vscode.commands.registerCommand('code-office.openWikilinkBody', async ({ sourceUri, body }: { sourceUri: string; body: string }) => {
			const link = parseWikilinkBody(body);
			if (link) await wikilinkResolver.open(vscode.Uri.parse(sourceUri), link);
		}),
		vscode.languages.registerDocumentLinkProvider({ language: 'markdown', scheme: 'file' }, new WikilinkDocumentLinkProvider()),
		vscode.languages.registerCompletionItemProvider({ language: 'markdown', scheme: 'file' }, new WikilinkCompletionProvider(wikilinkResolver), '[', '#', '|'),
		vscode.window.registerCustomEditorProvider("cweijan.markdownViewer", markdownEditorProvider, viewOption),
		vscode.window.registerCustomEditorProvider("cweijan.markdownViewer.optional", markdownEditorProvider, viewOption),
		vscode.window.registerCustomEditorProvider("cweijan.hwpEditor", hwpEditorProvider, viewOption),
		...viewerInstance.bindCustomEditors(viewOption),
		{ dispose: () => wikilinkIndex.dispose() }
	);
}

export function deactivate() { }

async function runHwpCommand(name: string, task: () => Promise<void>): Promise<void> {
	try {
		await task();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		Output.debug(`code-office.hwp.${name} failed: ${message}`);
		void vscode.window.showErrorMessage(`HWP/HWPX ${name} failed: ${message}`);
	}
}

async function previewLegacyPresentation(uri: vscode.Uri | undefined, context: vscode.ExtensionContext): Promise<void> {
	try {
		const target = await resolveLegacyPresentationUri(uri);
		if (!target) return;

		const result = await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Preparing ${basename(target.fsPath)} preview`,
				cancellable: false,
			},
			() => convertPresentationWithLibreOffice(target.fsPath, context.globalStorageUri.fsPath)
		);
		if (result.warning || !result.pdfPath) {
			vscode.window.showWarningMessage(result.warning || 'LibreOffice did not create a preview PDF.');
			return;
		}
		showLegacyPresentationPdf(vscode.Uri.file(result.pdfPath), target, context);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		Output.debug(`previewLegacyPresentation failed: ${message}`);
		vscode.window.showErrorMessage(`Failed to preview legacy PowerPoint: ${message}`);
	}
}

async function resolveLegacyPresentationUri(uri?: vscode.Uri): Promise<vscode.Uri | undefined> {
	let target = uri;
	if (!target) {
		const picked = await vscode.window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			filters: { 'Legacy PowerPoint': ['ppt'] },
		});
		target = picked?.[0];
	}
	if (!target) return undefined;
	if (target.scheme !== 'file' || extname(target.fsPath).toLowerCase() !== '.ppt') {
		vscode.window.showWarningMessage('Select a local .ppt file to use the LibreOffice fallback preview.');
		return undefined;
	}
	return target;
}

function showLegacyPresentationPdf(pdfUri: vscode.Uri, sourceUri: vscode.Uri, context: vscode.ExtensionContext): void {
	const panel = vscode.window.createWebviewPanel(
		'codeOfficeLegacyPresentation',
		`Preview ${basename(sourceUri.fsPath)}`,
		vscode.ViewColumn.Active,
		{
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [vscode.Uri.file(context.extensionPath), context.globalStorageUri],
		}
	);
	const handler = Handler.bind(panel, pdfUri);
	handleCommonEvent(pdfUri, handler);
	panel.webview.html = buildPdfViewerHtml(panel.webview, context);
}

function buildPdfViewerHtml(webview: vscode.Webview, context: vscode.ExtensionContext): string {
	const baseUrl = webview.asWebviewUri(vscode.Uri.file(`${context.extensionPath}/resource/pdf`))
		.toString().replace(/\?.+$/, '').replace('https://git', 'https://file');
	return readFileSync(`${context.extensionPath}/resource/pdf/viewer.html`, 'utf8').replace('{{baseUrl}}', baseUrl);
}

async function activeHTTP(context: vscode.ExtensionContext) {
	try {
		httpExt.activate(context)
	} catch (error) {
		Output.debug(error)
	}
}

/**
 * 保持 Git diff 等场景使用默认编辑器，避免被本扩展接管。
 */
function keepOriginDiff() {
	try {
		const config = vscode.workspace.getConfiguration("workbench");
		const configKey = 'editorAssociations'
		const editorAssociations = config.get<Record<string, string | undefined>>(configKey) ?? {};
		const key = '{git,gitlens,git-graph}:/**/*.{md,csv,svg}'
		if (editorAssociations[key]) {
			editorAssociations[key] = undefined
			config.update(configKey, editorAssociations, true)
		}
	} catch (error) {
		Output.debug('keepOriginDiff failed: ' + error)
	}
}

async function ensureHwpEditorAssociation(): Promise<void> {
	try {
		const config = vscode.workspace.getConfiguration("workbench");
		const configKey = 'editorAssociations';
		const editorAssociations = { ...(config.get<Record<string, string | undefined>>(configKey) ?? {}) };
		const hwpEditorViewType = 'cweijan.hwpEditor';
		let changed = false;

		for (const pattern of ['*.hwp', '*.hwpx']) {
			const current = editorAssociations[pattern];
			if (!current || current === 'cweijan.officeViewer') {
				editorAssociations[pattern] = hwpEditorViewType;
				changed = true;
			}
		}

		if (changed) await config.update(configKey, editorAssociations, true);
	} catch (error) {
		Output.debug('ensureHwpEditorAssociation failed: ' + error);
	}
}
