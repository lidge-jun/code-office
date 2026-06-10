import JSZip from 'jszip';
import { extractDocxText, normalizeEditorText, splitEditorTextLines } from './docxText';

export function readEditorTextSnapshot(surface: HTMLElement | null): string {
    if (!surface) return '';
    const editorRoots = Array.from(surface.querySelectorAll<HTMLElement>(
        '.ProseMirror[contenteditable="true"], [contenteditable="true"], .ProseMirror, [role="textbox"], .superdoc-page, .superdoc__page'
    ));
    const textCandidates = editorRoots
        .map((element) => sanitizeEditorSnapshotText(element.innerText))
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);
    if (textCandidates[0]) return textCandidates[0].trim();

    const fallbackSurface = surface.cloneNode(true) as HTMLElement;
    fallbackSurface.querySelectorAll('.docx-shell__toolbar, .docx-shell__warning, .superdoc-toolbar-container, [role="toolbar"]').forEach((element) => {
        element.remove();
    });
    return sanitizeEditorSnapshotText(fallbackSurface.innerText).trim();
}

export function sanitizeEditorSnapshotText(value: string): string {
    return splitEditorTextLines(value)
        .filter(isRelevantVisibleLine)
        .join('\n');
}

export function getChangedTextSnippets(currentText: string, persistedText: string): string[] {
    const persisted = normalizeEditorText(persistedText);
    return getRelevantTextTokens(currentText).filter((token) => !persisted.includes(token)).slice(0, 5);
}

export async function getMissingVisibleTextSnippetsFromSource(sourceBuffer: ArrayBuffer | null, currentText: string): Promise<string[]> {
    if (!sourceBuffer) return [];
    try {
        const zip = await JSZip.loadAsync(sourceBuffer.slice(0));
        const documentXml = await zip.file('word/document.xml')?.async('string');
        if (!documentXml) return [];
        const sourceText = normalizeEditorText(extractDocxText(documentXml));
        return mergeTextSnippets(
            getRelevantTextTokens(currentText).filter((token) => !sourceText.includes(token)),
            splitEditorTextLines(currentText).filter((line) => isRelevantVisibleLine(line) && !sourceText.includes(normalizeEditorText(line))),
        );
    } catch {
        return [];
    }
}

export function isRelevantVisibleLine(value: string): boolean {
    const normalized = normalizeEditorText(value);
    if (normalized.length < 4 || normalized.length > 180) return false;
    if (/^(DOCX|SuperDoc (viewer|edit) mode|Rendering document|Loading document)$/i.test(normalized)) return false;
    if (/\b(DOCX export warning|Save failed|Rendering document|Loading document|Loading)$/i.test(normalized)) return false;
    if (/\b(unset|selected|tracked changes|overflow items|cursor moved)\b/i.test(normalized)) return false;
    return !/^(View|Edit|Save|Undo|Bold|Italic|Underline|Color|Highlight|Table|Document mode)$/i.test(normalized);
}

export function mergeTextSnippets(...groups: string[][]): string[] {
    return Array.from(new Set(groups.flat())).slice(0, 5);
}

export function getRelevantTextTokens(value: string): string[] {
    const ignoredUiTokens = new Set([
        'accept', 'actions', 'align', 'bold', 'bullet', 'color', 'document', 'family',
        'font', 'highlight', 'image', 'indent', 'italic', 'left', 'list', 'mode',
        'numbered', 'overflow', 'redo', 'reject', 'strikethrough', 'table', 'text',
        'tracked', 'underline', 'undo', 'undefined', 'unset', 'zoom', 'changes', 'items', 'selected', 'size',
        'cursor', 'moved', 'rendering', 'loading', 'warning', 'failed', 'superdoc', 'export',
    ]);
    const tokens = normalizeEditorText(value).split(' ').filter((token) => token.length >= 4);
    return Array.from(new Set(tokens.filter((token) => {
        const normalized = token.toLowerCase().replace(/[^a-z0-9_가-힣]/g, '');
        return normalized
            && !/^\d+$/.test(normalized)
            && !ignoredUiTokens.has(normalized);
    })));
}
