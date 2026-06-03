import type { HwpPdfPagePayload } from '../../../common/hwpMessageSchema';
import type { RenderedHwpPage } from './hwpTypes';

const DEFAULT_PAGE_WIDTH = 595;
const DEFAULT_PAGE_HEIGHT = 842;
const MAX_CANVAS_SIDE = 4096;

interface SvgDimensions {
    width: number;
    height: number;
}

export async function renderPdfPages(pages: RenderedHwpPage[]): Promise<HwpPdfPagePayload[]> {
    return await Promise.all(pages.map((page) => renderPdfPage(page)));
}

async function renderPdfPage(page: RenderedHwpPage): Promise<HwpPdfPagePayload> {
    const dimensions = readSvgDimensions(page.svg);
    const scale = Math.min(1, MAX_CANVAS_SIDE / Math.max(dimensions.width, dimensions.height));
    const width = Math.max(1, Math.round(dimensions.width * scale));
    const height = Math.max(1, Math.round(dimensions.height * scale));
    const pngBase64 = await renderSvgToPngBase64(page.svg, width, height);
    return {
        pageNumber: page.pageNumber,
        pngBase64,
        width,
        height,
    };
}

function readSvgDimensions(svg: string): SvgDimensions {
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = document.documentElement;
    if (!root || root.nodeName.toLowerCase() !== 'svg') {
        throw new Error('HWP viewer returned invalid SVG for PDF export.');
    }

    const width = parseSvgLength(root.getAttribute('width'));
    const height = parseSvgLength(root.getAttribute('height'));
    if (width && height) return { width, height };

    const viewBox = root.getAttribute('viewBox')?.trim().split(/\s+/).map(Number);
    if (viewBox && viewBox.length === 4 && viewBox.every(Number.isFinite) && viewBox[2] > 0 && viewBox[3] > 0) {
        return { width: viewBox[2], height: viewBox[3] };
    }

    return { width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT };
}

function parseSvgLength(value: string | null): number | undefined {
    const match = value?.trim().match(/^([0-9]+(?:\.[0-9]+)?)/);
    if (!match) return undefined;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

async function renderSvgToPngBase64(svg: string, width: number, height: number): Promise<string> {
    const blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
        const image = await loadImage(blobUrl);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas rendering is unavailable for HWP PDF export.');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
    } finally {
        URL.revokeObjectURL(blobUrl);
    }
}

async function loadImage(url: string): Promise<HTMLImageElement> {
    return await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to rasterize HWP SVG page for PDF export.'));
        image.src = url;
    });
}
