import JSZip from 'jszip';
import { DOCX_MIME } from './docxConstants';
import { extractDocxText, encodeXmlText, normalizeEditorText, splitEditorTextLines } from './docxText';
import { isRelevantVisibleLine, mergeTextSnippets } from './docxSnapshot';

export async function patchDocxTextFromSnapshots(
    sourceBuffer: ArrayBuffer | null,
    currentText: string,
    persistedText: string,
    snippets: string[],
): Promise<ArrayBuffer | null> {
    if (!sourceBuffer || !snippets.length) return null;
    const currentLines = splitEditorTextLines(currentText);
    const persistedLines = splitEditorTextLines(persistedText);
    if (!currentLines.length) return null;

    const replacements: Array<{ from: string; to: string }> = [];
    for (let index = 0; index < Math.min(currentLines.length, persistedLines.length); index += 1) {
        const from = persistedLines[index];
        const to = currentLines[index];
        if (!from || !to || from === to) continue;
        if (!snippets.some((snippet) => normalizeEditorText(to).includes(normalizeEditorText(snippet)))) continue;
        replacements.push({ from, to });
    }
    const zip = await JSZip.loadAsync(sourceBuffer.slice(0));
    let documentXml = await zip.file('word/document.xml')?.async('string');
    if (!documentXml) return null;

    const documentParagraphs = extractDocxParagraphTexts(documentXml);
    currentLines.forEach((currentLine) => {
        if (!snippets.some((snippet) => normalizeEditorText(currentLine).includes(normalizeEditorText(snippet)))) {
            return;
        }
        const from = findBestSourceParagraph(currentLine, documentParagraphs);
        if (from && !replacements.some((replacement) => replacement.from === from && replacement.to === currentLine)) {
            replacements.push({ from, to: currentLine });
            return;
        }
    });
    if (!replacements.length) return null;

    let patched = false;
    for (const replacement of replacements) {
        const nextXml = replaceParagraphText(documentXml, replacement.from, replacement.to);
        if (nextXml !== documentXml) {
            documentXml = nextXml;
            patched = true;
        }
    }
    if (!patched) return null;

    zip.file('word/document.xml', documentXml);
    return await zip.generateAsync({
        type: 'arraybuffer',
        mimeType: DOCX_MIME,
        compression: 'DEFLATE',
    });
}

export async function repairDocxTextFromSnapshots(
    documentBuffer: ArrayBuffer | null,
    sourceBuffer: ArrayBuffer | null,
    currentText: string,
    persistedText: string,
    snippets: string[],
): Promise<ArrayBuffer | null> {
    const candidateSnippets = mergeTextSnippets(
        snippets,
        splitEditorTextLines(currentText).filter(isRelevantVisibleLine),
    );
    const attempts: Array<() => Promise<ArrayBuffer | null>> = [
        () => patchDocxTextFromSnapshots(sourceBuffer, currentText, persistedText, candidateSnippets),
        () => patchDocxTextFromSnapshots(documentBuffer, currentText, persistedText, candidateSnippets),
    ];

    for (const attempt of attempts) {
        try {
            const repaired = await attempt();
            if (!repaired) continue;
            return repaired;
        } catch {
            // Continue to the next deterministic XML repair strategy.
        }
    }
    return null;
}

export function extractDocxParagraphTexts(documentXml: string): string[] {
    return Array.from(documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g), (match) => normalizeEditorText(extractDocxText(match[0])))
        .filter((text) => text.length >= 4);
}

export function findBestSourceParagraph(currentLine: string, paragraphTexts: string[]): string | null {
    const normalizedLine = normalizeEditorText(currentLine);
    const candidates = paragraphTexts.filter((paragraphText) => {
        const normalizedParagraph = normalizeEditorText(paragraphText);
        return normalizedLine === normalizedParagraph
            || normalizedLine.startsWith(`${normalizedParagraph} `)
            || normalizedLine.includes(normalizedParagraph)
            || hasStrongParagraphTokenOverlap(normalizedLine, normalizedParagraph);
    });
    candidates.sort((a, b) => {
        const scoreDelta = getParagraphOverlapScore(normalizedLine, b) - getParagraphOverlapScore(normalizedLine, a);
        return scoreDelta || b.length - a.length;
    });
    return candidates[0] ?? null;
}

export function hasStrongParagraphTokenOverlap(currentLine: string, paragraphText: string): boolean {
    const paragraphTokens = getComparableParagraphTokens(paragraphText);
    if (paragraphTokens.length < 2) return false;
    const lineTokens = new Set(getComparableParagraphTokens(currentLine));
    const overlap = paragraphTokens.filter((token) => lineTokens.has(token)).length;
    return overlap >= Math.min(2, paragraphTokens.length)
        && overlap / paragraphTokens.length >= 0.5;
}

export function getParagraphOverlapScore(currentLine: string, paragraphText: string): number {
    const paragraphTokens = getComparableParagraphTokens(paragraphText);
    if (!paragraphTokens.length) return 0;
    const lineTokens = new Set(getComparableParagraphTokens(currentLine));
    const overlap = paragraphTokens.filter((token) => lineTokens.has(token)).length;
    return overlap / paragraphTokens.length;
}

export function getComparableParagraphTokens(value: string): string[] {
    return normalizeEditorText(value)
        .split(' ')
        .map((token) => token.toLowerCase().replace(/[^a-z0-9_가-힣-]/g, ''))
        .filter((token) => token.length >= 2 && !/^xmlpatch\d+_ok_\d+/i.test(token));
}

export function replaceParagraphText(documentXml: string, fromText: string, toText: string): string {
    const target = normalizeEditorText(fromText);
    return documentXml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraphXml) => {
        const paragraphText = normalizeEditorText(extractDocxText(paragraphXml));
        if (paragraphText !== target) return paragraphXml;
        let firstTextNode = true;
        return paragraphXml.replace(/(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g, (_match, open: string, _text: string, close: string) => {
            if (firstTextNode) {
                firstTextNode = false;
                return `${open}${encodeXmlText(toText)}${close}`;
            }
            return `${open}${close}`;
        });
    });
}
