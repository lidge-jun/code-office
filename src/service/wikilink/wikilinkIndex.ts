import * as path from 'path';
import * as vscode from 'vscode';

const IGNORED_SEGMENTS = new Set(['node_modules', '.git', 'out']);

interface FolderCache {
    files: Map<string, vscode.Uri>;
    basenames: Set<string>;
}

function isIgnored(fsPath: string): boolean {
    return fsPath.split(path.sep).some(s => IGNORED_SEGMENTS.has(s));
}

function basenameKey(fsPath: string): string {
    return path.basename(fsPath).replace(/\.(md|markdown)$/i, '').toLowerCase();
}

export class WikilinkIndex {
    private cache = new Map<string, FolderCache>();
    private watcher: vscode.FileSystemWatcher | undefined;
    private folderSub: vscode.Disposable;
    private ready: Promise<void>;
    private readonly _onDidChange = new vscode.EventEmitter<vscode.WorkspaceFolder>();
    readonly onDidChange = this._onDidChange.event;

    constructor() {
        this.ready = this.build();
        this.watcher = vscode.workspace.createFileSystemWatcher('**/*.{md,markdown}');
        this.watcher.onDidCreate(uri => { if (this.add(uri)) this.fire(uri); });
        this.watcher.onDidDelete(uri => { if (this.remove(uri)) this.fire(uri); });
        this.folderSub = vscode.workspace.onDidChangeWorkspaceFolders(() => { this.ready = this.build(); });
    }

    async get(sourceUri: vscode.Uri): Promise<string[]> {
        await this.ready;
        return this.getCached(sourceUri);
    }

    getCached(sourceUri: vscode.Uri): string[] {
        const folder = vscode.workspace.getWorkspaceFolder(sourceUri);
        if (!folder) return [];
        return this.getCachedForFolder(folder);
    }

    async getForFolder(folder: vscode.WorkspaceFolder): Promise<string[]> {
        await this.ready;
        return this.getCachedForFolder(folder);
    }

    getCachedForFolder(folder: vscode.WorkspaceFolder): string[] {
        const entry = this.cache.get(folder.uri.toString());
        return entry ? [...entry.basenames] : [];
    }

    async getFiles(folder: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
        await this.ready;
        return this.getCachedFiles(folder);
    }

    getCachedFiles(folder: vscode.WorkspaceFolder): vscode.Uri[] {
        const entry = this.cache.get(folder.uri.toString());
        return entry ? [...entry.files.values()] : [];
    }

    async listFiles(folder: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
        return this.getFiles(folder);
    }

    private async scanFiles(folder: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
        const pattern = new vscode.RelativePattern(folder, '**/*.{md,markdown}');
        const files = await vscode.workspace.findFiles(pattern);
        return files.filter(uri => !isIgnored(uri.fsPath));
    }

    private async build(): Promise<void> {
        this.cache.clear();
        const folders = vscode.workspace.workspaceFolders ?? [];
        await Promise.all(folders.map(async folder => {
            const files = await this.scanFiles(folder);
            this.cache.set(folder.uri.toString(), createFolderCache(files));
        }));
    }

    private add(uri: vscode.Uri): boolean {
        if (isIgnored(uri.fsPath)) return false;
        const folder = vscode.workspace.getWorkspaceFolder(uri);
        if (!folder) return false;
        const key = folder.uri.toString();
        const entry = this.ensureCache(key);
        entry.files.set(uri.toString(), uri);
        entry.basenames.add(basenameKey(uri.fsPath));
        return true;
    }

    private remove(uri: vscode.Uri): boolean {
        const folder = vscode.workspace.getWorkspaceFolder(uri);
        if (!folder) return false;
        const entry = this.cache.get(folder.uri.toString());
        if (!entry) return false;
        const removed = entry.files.delete(uri.toString());
        if (!removed) return false;
        entry.basenames = basenamesFor([...entry.files.values()]);
        return true;
    }

    private ensureCache(key: string): FolderCache {
        if (!this.cache.has(key)) this.cache.set(key, createFolderCache([]));
        return this.cache.get(key)!;
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

function createFolderCache(files: vscode.Uri[]): FolderCache {
    return {
        files: new Map(files.map(uri => [uri.toString(), uri])),
        basenames: basenamesFor(files),
    };
}

function basenamesFor(files: vscode.Uri[]): Set<string> {
    return new Set(files.map(uri => basenameKey(uri.fsPath)));
}
