import { adjustImgPath, getWorkspacePath } from '@/common/fileUtil';
import { readFileSync, writeFileSync } from 'fs';
import { basename, extname, isAbsolute, parse, resolve } from 'path';
import * as vscode from 'vscode';
import { Handler } from '../common/handler';
import { Output } from '../common/Output';
import { WikilinkIndex } from '../service/wikilink/wikilinkIndex';
import { Util } from '../common/util';
import { Holder } from '../service/markdown/holder';
import { MarkdownService } from '../service/markdownService';
import { Global } from '@/common/global';
import { platform } from 'os';
import { WikilinkResolver } from '@/service/wikilink/wikilinkResolver';
import { parseWikilinkBody } from '@/service/wikilink/wikilinkParser';

/**
 * Markdown editor provider using Vditor as the editing engine.
 *
 * @author cweijan (original), RJ.Wang (fork maintainer)
 * @updated 2026-04-23
 */
export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {

    private extensionPath: string;
    private countStatus: vscode.StatusBarItem;
    private state: vscode.Memento;

    constructor(private context: vscode.ExtensionContext, private wikilinkResolver?: WikilinkResolver, private wikilinkIndex?: WikilinkIndex) {
        this.extensionPath = context.extensionPath;
        this.countStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.state = context.globalState
    }

    /**
     * 构建 webview 允许访问的本地资源路径列表。
     * 默认只开放扩展目录、文档所在目录和工作区目录。
     * 当用户开启 viewAbsoluteLocal 时，才开放整个文件系统以支持绝对路径图片。
     */
    private getLocalResourceRoots(docFolder: vscode.Uri): vscode.Uri[] {
        const roots: vscode.Uri[] = [
            vscode.Uri.file(this.extensionPath),
            docFolder,
        ];
        // 添加所有工作区目录
        const folders = vscode.workspace.workspaceFolders;
        if (folders) {
            for (const folder of folders) {
                roots.push(folder.uri);
            }
        }
        // 仅在用户明确开启绝对路径图片支持时，才开放整个文件系统
        if (Global.getConfig<boolean>('viewAbsoluteLocal', false)) {
            roots.push(vscode.Uri.file('/'));
            // Windows 盘符 A-Z
            for (let i = 65; i <= 90; i++) {
                roots.push(vscode.Uri.file(`${String.fromCharCode(i)}:/`));
            }
        }
        return roots;
    }

    resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
        const uri = document.uri;
        const webview = webviewPanel.webview;
        const folderPath = vscode.Uri.joinPath(uri, '..')
        webview.options = {
            enableScripts: true,
            localResourceRoots: this.getLocalResourceRoots(folderPath)
        }
        const handler = Handler.bind(webviewPanel, uri);
        this.handleMarkdown(document, handler, folderPath)
        handler.on('developerTool', () => vscode.commands.executeCommand('workbench.action.toggleDevTools'))
    }

    private handleMarkdown(document: vscode.TextDocument, handler: Handler, folderPath: vscode.Uri) {

        const uri = document.uri;
        const webview = handler.panel.webview;

        let content = document.getText();
        const contextPath = `${this.extensionPath}/resource/vditor`;
        const rootPath = webview.asWebviewUri(vscode.Uri.file(`${contextPath}`)).toString();

        Holder.activeDocument = document;
        handler.panel.onDidChangeViewState(e => {
            Holder.activeDocument = e.webviewPanel.visible ? document : Holder.activeDocument
            if (e.webviewPanel.visible) {
                this.updateCount(content)
                this.countStatus.show()
            } else {
                this.countStatus.hide()
            }
        });

        let lastManualSaveTime: number;
        const config = vscode.workspace.getConfiguration("vscode-office");

        /** Build the payload for the "open" event sent to the WebView. */
        const buildOpenPayload = async () => ({
            title: basename(uri.fsPath),
            config,
            scrollTop: this.state.get(`scrollTop_${document.uri.fsPath}`, 0),
            language: vscode.env.language,
            rootPath, content,
            wikilinkIndex: this.wikilinkIndex?.getCached(uri) ?? [],
            wikilinkCompletionTargets: this.wikilinkResolver?.completionTargetsCached(uri) ?? []
        });

        const pushWikilinkDataWhenReady = (): void => {
            void this.wikilinkIndex?.get(uri).then(index => {
                handler.emit("updateWikilinkIndex", index);
            }, error => {
                Output.debug(`wikilink index update failed: ${error instanceof Error ? error.message : String(error)}`);
            });
            void this.wikilinkResolver?.completionTargets(uri).then(targets => {
                handler.emit("updateWikilinkCompletionTargets", targets);
            }, error => {
                Output.debug(`wikilink completion update failed: ${error instanceof Error ? error.message : String(error)}`);
            });
        };

        /** Read file from disk and update internal state. */
        const reloadFromDisk = (): string => {
            const fileContent = readFileSync(uri.fsPath, 'utf8').replace(/\r/g, '');
            content = fileContent;
            this.updateCount(content);
            return fileContent;
        };

        const wikilinkIndexSubscription = this.wikilinkIndex?.onDidChange(async () => {
            try {
                const index = await this.wikilinkIndex!.get(uri);
                handler.emit("updateWikilinkIndex", index);
                const targets = await this.wikilinkResolver?.completionTargets(uri);
                if (targets) handler.emit("updateWikilinkCompletionTargets", targets);
            } catch (error) {
                Output.debug(`wikilink index update failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        handler.panel.onDidDispose(() => wikilinkIndexSubscription?.dispose());

        handler.on("init", () => {
            void (async () => {
                handler.emit("open", await buildOpenPayload())
                pushWikilinkDataWhenReady();
                this.updateCount(content)
                this.countStatus.show()
            })().catch(error => {
                Output.debug(`markdown open payload failed: ${error instanceof Error ? error.message : String(error)}`);
            });
        }).on("externalUpdate", e => {
            if (lastManualSaveTime && Date.now() - lastManualSaveTime < 800) return;
            const updatedText = e.document.getText()?.replace(/\r/g, '');
            if (content == updatedText) return;
            content = updatedText;
            this.updateCount(content)
            handler.emit("update", updatedText)
        }).on("fileChange", () => {
            if (lastManualSaveTime && Date.now() - lastManualSaveTime < 800) return;
            const prev = content;
            reloadFromDisk();
            if (content !== prev) {
                handler.emit("update", content)
            }
        }).on("reload", () => {
            void (async () => {
                reloadFromDisk();
                void this.updateTextDocument(document, content);
                handler.emit("open", await buildOpenPayload())
                pushWikilinkDataWhenReady();
            })().catch(error => {
                Output.debug(`markdown reload payload failed: ${error instanceof Error ? error.message : String(error)}`);
            });
        }).on("command", (command) => {
            vscode.commands.executeCommand(command)
        }).on("openLink", async (linkUri: string) => {
            try {
                const resReg = /https:\/\/file.*\.net/i;
                if (linkUri.match(resReg)) {
                    const localPath = linkUri.replace(resReg, '')
                    const ext = extname(localPath).toLowerCase();
                    if (ext === '.md' || ext === '.markdown') {
                        await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(localPath), 'cweijan.markdownViewer');
                    } else {
                        await vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(localPath));
                    }
                } else {
                    await vscode.env.openExternal(vscode.Uri.parse(linkUri));
                }
            } catch (error) {
                Output.debug(`openLink failed: ${error instanceof Error ? error.message : String(error)}`);
                throw error;
            }
        }).on("openWikilink", async ({ body }: { body: string }) => {
            try {
                const link = parseWikilinkBody(body);
                if (link) await this.wikilinkResolver?.open(uri, link);
            } catch (error) {
                Output.debug(`openWikilink failed: ${error instanceof Error ? error.message : String(error)}`);
                throw error;
            }
        }).on("scroll", ({ scrollTop }) => {
            this.state.update(`scrollTop_${document.uri.fsPath}`, scrollTop)
        }).on("img", async (img) => {
            const { relPath, fullPath } = adjustImgPath(uri)
            const imagePath = isAbsolute(fullPath) ? fullPath : `${resolve(uri.fsPath, "..")}/${relPath}`.replace(/\\/g, "/");
            writeFileSync(imagePath, Buffer.from(img, 'binary'))
            const fileName = parse(relPath).name;
            const adjustRelPath = await MarkdownService.imgExtGuide(imagePath, relPath);
            vscode.env.clipboard.writeText(`![${fileName}](${adjustRelPath})`)
            vscode.commands.executeCommand("editor.action.clipboardPasteAction")
        }).on("quickOpen", () => {
            vscode.commands.executeCommand('workbench.action.quickOpen');
        }).on("editInVSCode", (full: boolean) => {
            const side = full ? vscode.ViewColumn.Active : vscode.ViewColumn.Beside;
            vscode.commands.executeCommand('vscode.openWith', uri, "default", side);
        }).on("save", (newContent) => {
            if (lastManualSaveTime && Date.now() - lastManualSaveTime < 800) return;
            const normalizedContent = this.normalizeWikilinkOpenPair(newContent);
            content = normalizedContent
            void this.updateTextDocument(document, normalizedContent).then(() => {
                if (normalizedContent !== newContent) handler.emit("update", normalizedContent);
            });
            this.updateCount(content)
        }).on("doSave", async (content) => {
            lastManualSaveTime = Date.now();
            await this.updateTextDocument(document, content)
            this.updateCount(content)
            vscode.commands.executeCommand('workbench.action.files.save');
        }).on("export", (option) => {
            vscode.commands.executeCommand('workbench.action.files.save');
            new MarkdownService(this.context, this.wikilinkResolver).exportMarkdown(uri, option)
        }).on("theme", async (theme) => {
            if (!theme) {
                const themes = [
                    "Auto", "|",
                    "Light", "Obsidian Light", "Solarized", "Warm Light", "Dim Light", "|",
                    "One Dark", "Obsidian Dark", "Github Dark",
                    "Nord", "Monokai", "Dracula",
                ];
                const editorTheme = Global.getConfig('editorTheme');
                const themeItems: vscode.QuickPickItem[] = themes.map(theme => {
                    if (theme == '|') return { label: '|', kind: vscode.QuickPickItemKind.Separator }
                    return { label: theme, description: theme == editorTheme ? 'Current' : undefined }
                })
                theme = await vscode.window.showQuickPick(themeItems, { placeHolder: "Select Editor Theme" });
                if (!theme) return
            }
            handler.emit('theme', theme.label)
            Global.updateConfig('editorTheme', theme.label)
        }).on("saveOutline", (enable) => {
            config.update("openOutline", enable, true)
        }).on('developerTool', () => {
            vscode.commands.executeCommand('workbench.action.toggleDevTools')
        })

        const basePath = Global.getConfig('workspacePathAsImageBasePath') ?
            vscode.Uri.file(getWorkspacePath(folderPath)) : folderPath;
        const baseUrl = webview.asWebviewUri(basePath).toString().replace(/\?.+$/, '').replace('https://git', 'https://file');
        webview.html = Util.buildPath(
            readFileSync(`${this.extensionPath}/resource/vditor/index.html`, 'utf8')
                .replace("{{rootPath}}", rootPath)
                .replace("{{baseUrl}}", baseUrl)
                .replace(`{{configs}}`, JSON.stringify({
                    platform: platform()
                })),
            webview, contextPath);
    }

    private updateCount(content: string) {
        this.countStatus.text = `Line ${content.split(/\r\n|\r|\n/).length}    Count ${content.length}`
    }

    private updateTextDocument(document: vscode.TextDocument, content: any) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), content);
        return vscode.workspace.applyEdit(edit);
    }

    private normalizeWikilinkOpenPair(content: unknown): string {
        // Last-resort save safety net only. WebView authoring owns normal [[ pairing.
        const text = String(content ?? '');
        const open = text.lastIndexOf('[[');
        if (open < 0) return text;
        if (text.slice(open + 2).includes(']]')) return text;
        if (text.slice(open + 2) !== '') return text;
        return `${text.slice(0, open)}[[]]${text.slice(open + 2)}`;
    }

}
