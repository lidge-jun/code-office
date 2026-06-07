import JSZip from 'jszip';

export type PptxSlideMetadata = {
    index: number;
    title: string;
    lines: string[];
    notes: string[];
};

const SLIDE_PATH_RE = /^ppt\/slides\/slide(\d+)\.xml$/;
const NOTES_REL_TYPE = '/notesSlide';

export async function loadPptxMetadata(buffer: ArrayBuffer): Promise<PptxSlideMetadata[]> {
    const zip = await JSZip.loadAsync(buffer);
    const slideEntries = Object.keys(zip.files)
        .map(path => ({ path, match: path.match(SLIDE_PATH_RE) }))
        .filter((entry): entry is { path: string; match: RegExpMatchArray } => Boolean(entry.match))
        .sort((a, b) => Number(a.match[1]) - Number(b.match[1]));

    return Promise.all(slideEntries.map(async ({ path, match }, zeroBasedIndex) => {
        const slideNumber = Number(match[1]);
        const slideXml = await zip.file(path)?.async('text') || '';
        const lines = extractTextLines(slideXml);
        const notesPath = await findNotesPath(zip, path, slideNumber);
        const notesXml = notesPath ? await zip.file(notesPath)?.async('text') : '';
        const notes = notesXml ? extractTextLines(notesXml) : [];

        return {
            index: zeroBasedIndex,
            title: lines[0] || `Slide ${slideNumber}`,
            lines,
            notes,
        };
    }));
}

function extractTextLines(xml: string): string[] {
    if (!xml) return [];
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) return [];

    const raw = Array.from(doc.getElementsByTagName('*'))
        .filter(node => node.localName === 't')
        .map(node => node.textContent?.replace(/\s+/g, ' ').trim() || '')
        .filter(Boolean);

    return Array.from(new Set(raw));
}

async function findNotesPath(zip: JSZip, slidePath: string, slideNumber: number): Promise<string | undefined> {
    const relsPath = slidePath.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
    const relsXml = await zip.file(relsPath)?.async('text');
    if (relsXml) {
        const doc = new DOMParser().parseFromString(relsXml, 'application/xml');
        const relationship = Array.from(doc.getElementsByTagName('*')).find(node =>
            node.localName === 'Relationship' &&
            (node.getAttribute('Type') || '').includes(NOTES_REL_TYPE)
        );
        const target = relationship?.getAttribute('Target');
        if (target) {
            const resolved = resolvePptxTarget('ppt/slides', target);
            if (zip.file(resolved)) return resolved;
        }
    }

    const fallback = `ppt/notesSlides/notesSlide${slideNumber}.xml`;
    return zip.file(fallback) ? fallback : undefined;
}

function resolvePptxTarget(baseDir: string, target: string): string {
    const parts = `${baseDir}/${target}`.split('/');
    const normalized: string[] = [];
    for (const part of parts) {
        if (!part || part === '.') continue;
        if (part === '..') {
            normalized.pop();
            continue;
        }
        normalized.push(part);
    }
    return normalized.join('/');
}

