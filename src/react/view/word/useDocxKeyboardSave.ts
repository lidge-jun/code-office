import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { DocxMode } from './docxTypes';

export function useDocxKeyboardSave(
    mode: DocxMode,
    hostSaveInProgressRef: RefObject<boolean>,
    requestHostSave: () => void,
) {
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent): void {
            if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 's') {
                if (mode !== 'editor') return;
                if (hostSaveInProgressRef.current) return;
                event.preventDefault();
                event.stopPropagation();
                requestHostSave();
            }
        }
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [hostSaveInProgressRef, mode, requestHostSave]);
}
