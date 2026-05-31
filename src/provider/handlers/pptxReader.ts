import AdmZip from 'adm-zip';
import * as cheerio from 'cheerio';
import { basename, extname, posix } from 'path';

export interface PptxSlide {
    index: number;
    title: string;
    text: string[];
    images: string[];
}

export interface PptxPayload {
    fileName: string;
    slides: PptxSlide[];
    fallbackPdfPath?: string;
    warning?: string;
    error?: string;
}

export async function readPresentation(filePath: string): Promise<PptxPayload> {
    try {
        const zip = new AdmZip(filePath);
        const slideEntries = readSlideEntryNames(zip);

        const slides = slideEntries.map((entryName, index) => parseSlide(zip, entryName, index + 1));
        return {
            fileName: basename(filePath),
            slides,
            warning: slides.length === 0 ? 'No slides were found in this PPTX package.' : undefined,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            fileName: basename(filePath),
            slides: [],
            error: message,
        };
    }
}

function readSlideEntryNames(zip: AdmZip): string[] {
    const orderedEntries = readPresentationSlideOrder(zip);
    if (orderedEntries.length > 0) return orderedEntries;
    return zip.getEntries()
        .map(entry => entry.entryName)
        .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => slideNumber(a) - slideNumber(b));
}

function readPresentationSlideOrder(zip: AdmZip): string[] {
    const presentation = zip.getEntry('ppt/presentation.xml');
    const rels = zip.getEntry('ppt/_rels/presentation.xml.rels');
    if (!presentation || !rels) return [];

    const relTargets = readRelationships(rels.getData().toString('utf8'));
    const $ = cheerio.load(presentation.getData().toString('utf8'), { xmlMode: true });
    return $('p\\:sldId')
        .map((_, element) => {
            const relId = $(element).attr('r:id');
            const target = relId ? relTargets.get(relId) : undefined;
            return target && zip.getEntry(target) ? target : null;
        })
        .get()
        .filter((entryName, index, entries) => Boolean(entryName) && entries.indexOf(entryName) === index);
}

function readRelationships(xml: string): Map<string, string> {
    const $ = cheerio.load(xml, { xmlMode: true });
    const relTargets = new Map<string, string>();
    $('Relationship').each((_, element) => {
        const id = $(element).attr('Id');
        const type = $(element).attr('Type') || '';
        const target = $(element).attr('Target') || '';
        if (!id || !target || !type.includes('/slide')) return;
        relTargets.set(id, normalizeRelationshipTarget('ppt', target));
    });
    return relTargets;
}

function parseSlide(zip: AdmZip, entryName: string, index: number): PptxSlide {
    const xml = zip.readAsText(entryName);
    const $ = cheerio.load(xml, { xmlMode: true });
    const text = $('a\\:t').map((_, element) => $(element).text().trim()).get().filter(Boolean);
    const images = readSlideImages(zip, entryName);
    return {
        index,
        title: text[0] || `Slide ${index}`,
        text,
        images,
    };
}

function readSlideImages(zip: AdmZip, slideEntryName: string): string[] {
    const relsName = slideEntryName.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
    const rels = zip.getEntry(relsName);
    if (!rels) return [];

    const $ = cheerio.load(rels.getData().toString('utf8'), { xmlMode: true });
    const images: string[] = [];
    $('Relationship').each((_, element) => {
        const type = $(element).attr('Type') || '';
        const target = $(element).attr('Target') || '';
        if (!type.includes('/image') || !target) return;
        const mediaPath = normalizeRelationshipTarget(posix.dirname(slideEntryName), target);
        const media = zip.getEntry(mediaPath);
        if (!media) return;
        images.push(`data:${mimeForPath(mediaPath)};base64,${media.getData().toString('base64')}`);
    });
    return images;
}

function normalizeRelationshipTarget(baseDir: string, target: string): string {
    const normalizedTarget = target.replace(/\\/g, '/');
    if (normalizedTarget.startsWith('/')) return posix.normalize(normalizedTarget.slice(1));
    return posix.normalize(posix.join(baseDir, normalizedTarget)).replace(/^\.\//, '');
}

function slideNumber(entryName: string): number {
    const match = entryName.match(/slide(\d+)\.xml$/);
    return match ? Number(match[1]) : 0;
}

function mimeForPath(filePath: string): string {
    switch (extname(filePath).toLowerCase()) {
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.gif':
            return 'image/gif';
        case '.webp':
            return 'image/webp';
        case '.svg':
            return 'image/svg+xml';
        default:
            return 'image/png';
    }
}
