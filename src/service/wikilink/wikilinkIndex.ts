import * as path from 'path';
import * as vscode from 'vscode';

const IGNORED_SEGMENTS = new Set(['node_modules', '.git', 'out']);

function isIgnored(fsPath: string): boolean {
    return fsPath.split(path.sep).some(s => IGNORED_SEGMENTS.has(s));
}

function basenameKey(fsPath: string): string {
    return path.basename(fsPath).replace(/\.(md|markdown)$/i, '').toLowerCase();
}

export class WikilinkIndex {
    private cache = new Map<string, Set<string>>();
    private watcher: vscode.FileSystemWatcher | undefined;
    private folderSub: vscode.Disposable;
    private ready: Promise<void>;
    private readonly _onDidChange = new vscode.EventEmitter<vscode.WorkspaceFolder>();
    readonly onDidChange = this._onDidChange.event;

    constructor() {
        this.ready = this.build();
        this.watcher = vscode.workspace.createFileSystemWatcher('**/*.{md,markdown}');
        this.watcher.onDidCreate(uri => { this.add(uri); this.fire(uri); });
        this.watcher.onDidDelete(uri => { this.remove(uri); this.fire(uri); });
        this.folderSub = vscode.workspace.onDidChangeWorkspaceFolders(() => { this.ready = this.build(); });
    }

    async get(sourceUri: vscode.Uri): Promise<string[]> {
        await this.ready;
        return this.getCached(sourceUri);
    }

    getCached(sourceUri: vscode.Uri): string[] {
        const folder = vscode.workspace.getWorkspaceFolder(sourceUri);
        if (!folder) return [];
        const set = this.cache.get(folder.uri.toString());
        return set ? [...set] : [];
    }

    async getForFolder(folder: vscode.WorkspaceFolder): Promise<string[]> {
        await this.ready;
        return this.getCachedForFolder(folder);
    }

    getCachedForFolder(folder: vscode.WorkspaceFolder): string[] {
        const set = this.cache.get(folder.uri.toString());
        return set ? [...set] : [];
    }

    async listFiles(folder: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
        const pattern = new vscode.RelativePattern(folder, '**/*.{md,markdown}');
        const files = await vscode.workspace.findFiles(pattern);
        return files.filter(uri => !isIgnored(uri.fsPath));
    }

    private async build(): Promise<void> {
        this.cache.clear();
        const folders = vscode.workspace.workspaceFolders ?? [];
        await Promise.all(folders.map(async folder => {
            const files = await this.listFiles(folder);
            const set = new Set(files.map(u => basenameKey(u.fsPath)));
            this.cache.set(folder.uri.toString(), set);
        }));
    }

    private add(uri: vscode.Uri): void {
        if (isIgnored(uri.fsPath)) return;
        const folder = vscode.workspace.getWorkspaceFolder(uri);
        if (!folder) return;
        const key = folder.uri.toString();
        if (!this.cache.has(key)) this.cache.set(key, new Set());
        this.cache.get(key)!.add(basenameKey(uri.fsPath));
    }

    private remove(uri: vscode.Uri): void {
        const folder = vscode.workspace.getWorkspaceFolder(uri);
        if (!folder) return;
        this.cache.get(folder.uri.toString())?.delete(basenameKey(uri.fsPath));
    }

    private fire(uri: vscode.Uri): void {
        const folder = vscode.workspace.getWorkspaceFolder(uri);
        if (folder) this._onDidChange.fire(folder);
    }

    dispose(): void {
        this.watcher?.dispose();
        this.folderSub.dispose();
        this._onDidChange.dispose();
    }
}
