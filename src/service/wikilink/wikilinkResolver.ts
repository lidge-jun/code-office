import * as path from 'path';
import * as vscode from 'vscode';
import { isSupportedWikilink, ParsedWikilink } from './wikilinkParser';
import { WikilinkIndex } from './wikilinkIndex';

interface Candidate {
    uri: vscode.Uri;
    label: string;
    description: string;
    score: number;
}

export interface RankedWikilinkCandidate {
    fsPath: string;
    relative: string;
    label: string;
    score: number;
}

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);

export class WikilinkResolver {
    private index?: WikilinkIndex;

    setIndex(index: WikilinkIndex): void { this.index = index; }

    async open(sourceUri: vscode.Uri, link: ParsedWikilink): Promise<void> {
        try {
            const target = await this.resolve(sourceUri, link);
            if (!target) return;
            const ext = path.extname(target.fsPath).toLowerCase();
            if (MARKDOWN_EXTENSIONS.has(ext)) {
                await vscode.commands.executeCommand('vscode.openWith', target, 'cweijan.markdownViewer');
                await this.revealFragment(target, link);
            } else {
                const document = await vscode.workspace.openTextDocument(target);
                await vscode.window.showTextDocument(document);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Unable to open wikilink: ${message}`);
        }
    }

    async resolve(sourceUri: vscode.Uri, link: ParsedWikilink): Promise<vscode.Uri | undefined> {
        if (!isSupportedWikilink(link)) return undefined;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(sourceUri);
        if (!workspaceFolder) {
            vscode.window.showWarningMessage('Wikilinks require a workspace folder.');
            return undefined;
        }

        const rawTarget = link.target.trim();
        if (isUnsafeTarget(rawTarget)) {
            vscode.window.showWarningMessage('URI schemes are not supported in wikilinks.');
            return undefined;
        }
        const target = normalizeTarget(rawTarget);
        if (!target) {
            return link.heading || link.blockId ? sourceUri : undefined;
        }

        const sourceDir = path.dirname(sourceUri.fsPath);
        const targetHasPath = hasExplicitPath(target);
        if (targetHasPath) {
            const direct = await this.resolveDirect(sourceDir, workspaceFolder.uri.fsPath, target);
            if (direct) return direct;
        }

        const candidates = await this.findCandidates(workspaceFolder, sourceDir, target);
        if (candidates.length === 0) {
            return this.offerCreateNote(sourceUri, workspaceFolder, target);
        }

        return candidates[0].uri;
    }

    /** Non-interactive export resolution — reuses the click path's scoring for true parity. */
    async resolveExportTarget(
        sourceUri: vscode.Uri,
        link: ParsedWikilink
    ): Promise<{ href: string; resolved: boolean } | undefined> {
        if (!isSupportedWikilink(link)) return { href: '', resolved: false };
        const rawTarget = link.target.trim();
        if (!rawTarget) return undefined;                       // heading/block-only → caller emits same-doc anchor
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(sourceUri);
        if (!workspaceFolder || isUnsafeTarget(rawTarget)) return { href: '', resolved: false };
        const target = normalizeTarget(rawTarget);
        if (!target) return undefined;
        const sourceDir = path.dirname(sourceUri.fsPath);
        if (hasExplicitPath(target)) {                          // parity: direct path resolves first
            const direct = await this.resolveDirect(sourceDir, workspaceFolder.uri.fsPath, target);
            if (direct) return { href: relativeDisplayPath(sourceDir, direct.fsPath), resolved: true };
        }
        const candidates = await this.findCandidates(workspaceFolder, sourceDir, target);
        if (candidates.length === 0) return { href: '', resolved: false };
        return { href: relativeDisplayPath(sourceDir, candidates[0].uri.fsPath), resolved: true };
    }

    /** Lowercased basenames of all markdown notes — used by the webview to flag unresolved wikilinks. */
    async noteBasenameIndex(sourceUri?: vscode.Uri): Promise<string[]> {
        if (this.index && sourceUri) return this.index.get(sourceUri);
        const files = await this.listMarkdownFiles();
        return [...new Set(files.map(u => stripMarkdownExtension(path.basename(u.fsPath)).toLowerCase()))];
    }

    private async offerCreateNote(
        sourceUri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder, target: string
    ): Promise<vscode.Uri | undefined> {
        const name = stripMarkdownExtension(path.basename(normalizePath(target)));
        if (!name) return undefined;
        const pick = await vscode.window.showInformationMessage(
            `Note "${name}" not found. Create it?`, { modal: true }, 'Create');
        if (pick !== 'Create') return undefined;
        const dest = path.resolve(path.dirname(sourceUri.fsPath),
            targetHasMarkdownExtension(target) ? target : `${target}.md`);
        if (!isInside(workspaceFolder.uri.fsPath, dest)) return undefined;
        const uri = vscode.Uri.file(dest);
        await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(`# ${name}\n`));
        return uri;
    }

    async listMarkdownFiles(folder?: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
        if (folder && this.index) return this.index.listFiles(folder);
        const allFiles = await Promise.all([
            vscode.workspace.findFiles('**/*.md'),
            vscode.workspace.findFiles('**/*.markdown'),
        ]);
        return allFiles.flat().filter(uri => !isIgnoredPath(uri.fsPath));
    }

    async completionTargets(sourceUri: vscode.Uri): Promise<string[]> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(sourceUri);
        if (!workspaceFolder) return [];
        const files = await this.listMarkdownFiles(workspaceFolder);
        const sourceDir = path.dirname(sourceUri.fsPath);

        return files
            .filter(uri => uri.toString() !== sourceUri.toString())
            .map(uri => this.targetForFile(workspaceFolder.uri.fsPath, sourceDir, uri.fsPath))
            .sort((a, b) => a.localeCompare(b));
    }

    private async resolveDirect(sourceDir: string, workspaceRoot: string, target: string): Promise<vscode.Uri | undefined> {
        const candidates = resolveWikilinkPathCandidates(sourceDir, target);
        const flavor = pathFlavor(sourceDir, workspaceRoot, target);

        for (const candidate of candidates) {
            const resolved = flavor.normalize(candidate);
            if (!isInside(workspaceRoot, resolved)) continue;
            try {
                const uri = vscode.Uri.file(resolved);
                const stat = await vscode.workspace.fs.stat(uri);
                if (stat.type === vscode.FileType.File) return uri;
            } catch {
                // Missing direct files are expected; workspace search handles fallback.
            }
        }

        return undefined;
    }

    private async findCandidates(workspaceFolder: vscode.WorkspaceFolder, sourceDir: string, target: string): Promise<Candidate[]> {
        const files = await this.listMarkdownFiles(workspaceFolder);
        return rankWikilinkCandidates(
            workspaceFolder.uri.fsPath,
            sourceDir,
            files.map(uri => uri.fsPath),
            target
        ).map(candidate => ({
            uri: vscode.Uri.file(candidate.fsPath),
            label: candidate.label,
            description: workspaceFolder.name,
            score: candidate.score,
        }));
    }

    private targetForFile(workspaceRoot: string, sourceDir: string, filePath: string): string {
        const sameDirRelative = relativeDisplayPath(sourceDir, filePath);
        if (!sameDirRelative.startsWith('..')) return stripMarkdownExtension(sameDirRelative);
        return stripMarkdownExtension(relativeDisplayPath(workspaceRoot, filePath));
    }

    private revealHeading(editor: vscode.TextEditor, document: vscode.TextDocument, heading: string): void {
        const wanted = slugifyHeading(heading);
        for (let line = 0; line < document.lineCount; line += 1) {
            const text = document.lineAt(line).text;
            const match = text.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
            if (!match) continue;
            if (slugifyHeading(match[1]) !== wanted) continue;
            const position = new vscode.Position(line, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.AtTop);
            return;
        }
    }

    private revealBlock(editor: vscode.TextEditor, document: vscode.TextDocument, blockId: string): void {
        const pattern = new RegExp(`(^|\\s)\\^${escapeRegExp(blockId)}(\\s*$)`);
        for (let line = 0; line < document.lineCount; line += 1) {
            const text = document.lineAt(line).text;
            if (!pattern.test(text)) continue;
            const position = new vscode.Position(line, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.AtTop);
            return;
        }
    }

    private async revealFragment(target: vscode.Uri, link: ParsedWikilink): Promise<void> {
        if (!link.heading && !link.blockId) return;
        const document = await vscode.workspace.openTextDocument(target);
        const editor = await vscode.window.showTextDocument(document, { preview: false });
        if (link.blockId) {
            this.revealBlock(editor, document, link.blockId);
            return;
        }
        if (link.heading) this.revealHeading(editor, document, link.heading);
    }
}

function normalizeTarget(target: string): string {
    return target.trim().replace(/\\/g, '/');
}

function isUnsafeTarget(target: string): boolean {
    const normalized = normalizeTarget(target);
    const isWindowsAbsolute = path.win32.isAbsolute(normalized);
    return normalized.startsWith('//')
        || /^file(?::|\/\/)/i.test(normalized)
        || (!isWindowsAbsolute && /^[a-z][a-z0-9+.-]*:/i.test(normalized))
        || target.includes('\0');
}

function hasExplicitPath(target: string): boolean {
    return normalizePath(target).includes('/');
}

function normalizePath(value: string): string {
    return value.replace(/\\/g, '/');
}

function isWindowsDrivePath(value: string): boolean {
    return /^[a-zA-Z]:[\\/]/.test(value) || /^[a-zA-Z]:\//.test(normalizePath(value));
}

function pathFlavor(...values: string[]): path.PlatformPath {
    return values.some(isWindowsDrivePath) ? path.win32 : path.posix;
}

function basenameOfPath(value: string): string {
    return normalizePath(value).split('/').pop() || value;
}

function dirnameOfPath(value: string): string {
    return pathFlavor(value).dirname(value);
}

function relativeDisplayPath(from: string, to: string): string {
    const flavor = pathFlavor(from, to);
    return normalizePath(flavor.relative(from, to));
}

function stripMarkdownExtension(value: string): string {
    const ext = path.extname(value).toLowerCase();
    return MARKDOWN_EXTENSIONS.has(ext) ? value.slice(0, -ext.length) : value;
}

function targetHasMarkdownExtension(value: string): boolean {
    return MARKDOWN_EXTENSIONS.has(path.extname(value).toLowerCase());
}

export function resolveWikilinkPathCandidates(sourceDir: string, target: string): string[] {
    const normalized = normalizeTarget(target);
    const flavor = pathFlavor(sourceDir, normalized);
    const candidates = targetHasMarkdownExtension(normalized)
        ? [normalized]
        : [`${normalized}.md`, `${normalized}.markdown`];

    return candidates.map(candidate => {
        if (flavor.isAbsolute(candidate) || path.posix.isAbsolute(candidate) || path.win32.isAbsolute(candidate)) {
            return flavor.normalize(candidate);
        }
        return flavor.resolve(sourceDir, candidate);
    });
}

function isIgnoredPath(value: string): boolean {
    const normalized = normalizePath(value);
    return normalized.includes('/node_modules/') || normalized.includes('/.git/') || normalized.includes('/out/');
}

function isInside(root: string, target: string): boolean {
    const flavor = pathFlavor(root, target);
    const relative = flavor.relative(root, target);
    return Boolean(relative) && !relative.startsWith('..') && !flavor.isAbsolute(relative);
}

export function rankWikilinkCandidates(
    workspaceRoot: string,
    sourceDir: string,
    files: string[],
    target: string
): RankedWikilinkCandidate[] {
    const flavor = pathFlavor(workspaceRoot, sourceDir, target, ...files);
    const normalizedTarget = normalizePath(target);
    const targetBase = stripMarkdownExtension(basenameOfPath(normalizedTarget)).toLowerCase();
    const targetHasPath = normalizedTarget.includes('/');

    return files
        .filter(fsPath => {
            const relative = normalizePath(flavor.relative(workspaceRoot, fsPath));
            if (targetHasPath) {
                const withoutExt = stripMarkdownExtension(relative).toLowerCase();
                return withoutExt.endsWith(stripMarkdownExtension(normalizedTarget).toLowerCase());
            }
            return stripMarkdownExtension(basenameOfPath(fsPath)).toLowerCase() === targetBase;
        })
        .map(fsPath => {
            const relative = normalizePath(flavor.relative(workspaceRoot, fsPath));
            return {
                fsPath,
                relative,
                label: relative,
                score: directoryDistance(sourceDir, dirnameOfPath(fsPath)) + relative.length / 10000,
            };
        })
        .sort((a, b) => a.score - b.score || a.label.localeCompare(b.label));
}

export function directoryDistance(fromDir: string, toDir: string): number {
    const fromParts = normalizePath(fromDir).split('/').filter(Boolean);
    const toParts = normalizePath(toDir).split('/').filter(Boolean);
    let common = 0;
    while (fromParts[common] && fromParts[common] === toParts[common]) common += 1;
    return (fromParts.length - common) + (toParts.length - common);
}

function slugifyHeading(value: string): string {
    return value.trim().toLowerCase()
        .replace(/[`*_~[\]()]/g, '')
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-');
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
