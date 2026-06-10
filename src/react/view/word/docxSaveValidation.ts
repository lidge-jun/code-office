import JSZip from 'jszip';
import { extractDocxText, normalizeEditorText } from './docxText';

export async function assertDocxContainsTextSnippets(buffer: ArrayBuffer, snippets: string[]): Promise<void> {
    if (!snippets.length) return;
    const zip = await JSZip.loadAsync(buffer.slice(0));
    const documentXml = await zip.file('word/document.xml')?.async('string');
    if (!documentXml) throw new Error('Exported DOCX is missing word/document.xml.');

    const exportedText = normalizeEditorText(extractDocxText(documentXml));
    const missing = snippets.filter((snippet) => !exportedText.includes(normalizeEditorText(snippet)));
    if (missing.length) {
        throw new Error(`SuperDoc export did not include current edits: ${missing.join(', ')}`);
    }
}
