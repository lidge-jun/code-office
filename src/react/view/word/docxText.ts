export function normalizeEditorText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

export function splitEditorTextLines(value: string): string[] {
    return value
        .split(/\r?\n/)
        .map((line) => normalizeEditorText(line).replace(/^\*+|\*+$/g, '').trim())
        .filter(Boolean);
}

export function extractDocxText(documentXml: string): string {
    const matches = documentXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g);
    return Array.from(matches, (match) => decodeXmlText(match[1])).join(' ');
}

export function decodeXmlText(value: string): string {
    return value
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');
}

export function encodeXmlText(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
