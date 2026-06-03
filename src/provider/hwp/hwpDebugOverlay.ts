import { basename } from 'path';
import { sanitizeHwpSvgPages } from '@/common/hwpSvgSanitizer';
import type { HwpCustomDocument } from './HwpCustomDocument';

export function buildHwpDebugOverlayHtml(document: HwpCustomDocument, svgs: string[]): string {
    const pages = sanitizeHwpSvgPages(svgs).map((svg, index) => (
        `<section><h2>Page ${index + 1}</h2><div class="page">${svg}</div></section>`
    )).join('');
    return [
        '<!doctype html><html><head><meta charset="utf-8">',
        '<style>body{font-family:system-ui,sans-serif;margin:0;background:#111;color:#ddd}',
        'section{padding:16px;border-bottom:1px solid #333}.page{background:#fff;display:inline-block}</style>',
        `</head><body><h1>${escapeHtml(basename(document.uri.fsPath))} debug overlay</h1>${pages}</body></html>`,
    ].join('');
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
