import { useEffect } from 'react';
import { DOCX_RENDER_TIMEOUT_MS } from './docxConstants';
import type { DocxMode } from './docxTypes';

export function useDocxRenderTimeout(
    rendering: boolean,
    documentVersion: number,
    mode: DocxMode,
    setRendering: (rendering: boolean) => void,
    setWarning: (message: string | null) => void,
) {
    useEffect(() => {
        if (!rendering) return undefined;
        const timer = window.setTimeout(() => {
            setRendering(false);
            setWarning('DOCX render is taking longer than expected. Check DevTools for SuperDoc or font loading warnings.');
        }, DOCX_RENDER_TIMEOUT_MS);
        return () => window.clearTimeout(timer);
    }, [documentVersion, mode, rendering, setRendering, setWarning]);
}
