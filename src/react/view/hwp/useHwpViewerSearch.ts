import { useEffect, useState } from 'react';
import { findRhwpTextMatches, findViewerTextMatches, type HwpViewerSearchMatch } from './hwpFind';
import type { RenderedHwpPage } from './hwpTypes';

export function useHwpViewerSearch(pages: RenderedHwpPage[], query: string): HwpViewerSearchMatch[] {
    const [matches, setMatches] = useState<HwpViewerSearchMatch[]>([]);

    useEffect(() => {
        let disposed = false;

        async function updateMatches(): Promise<void> {
            const svgMatches = findViewerTextMatches(pages, query);
            if (svgMatches.length > 0) {
                if (!disposed) setMatches(svgMatches);
                return;
            }
            try {
                const rhwpMatches = await findRhwpTextMatches(query);
                if (!disposed) setMatches(rhwpMatches);
            } catch {
                if (!disposed) setMatches(svgMatches);
            }
        }

        void updateMatches();
        return () => {
            disposed = true;
        };
    }, [pages, query]);

    return matches;
}
