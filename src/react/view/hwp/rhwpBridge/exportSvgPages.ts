import { sanitizeHwpSvg } from '../../../../common/hwpSvgSanitizer';
import type { SecureRhwpEditor } from './types';

export async function exportSvgPages(
    editor: SecureRhwpEditor,
    options: { debugOverlay?: boolean } = {},
): Promise<string[]> {
    let debugOverlayEnabled = false;
    if (options.debugOverlay) {
        debugOverlayEnabled = await editor.setDebugOverlay(true)
            .then((value) => value !== false)
            .catch(() => false);
    }
    try {
        const count = await editor.pageCount();
        if (!Number.isInteger(count) || count <= 0) {
            throw new Error('HWP viewer did not report any pages.');
        }
        const pages: string[] = [];
        for (let page = 0; page < count; page += 1) {
            const svg = await editor.getPageSvg(page);
            if (!svg || typeof svg !== 'string') {
                throw new Error(`HWP viewer returned an empty SVG for page ${page + 1}.`);
            }
            pages.push(sanitizeHwpSvg(svg));
        }
        return pages;
    } finally {
        if (debugOverlayEnabled) {
            await editor.setDebugOverlay(false).catch(() => {
                // The export already owns the command result; debug reset failure is non-fatal.
            });
        }
    }
}
