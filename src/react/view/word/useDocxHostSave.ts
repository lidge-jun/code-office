import { useCallback, useEffect, useRef } from 'react';
import { handler } from '../../util/vscode';
import { DOCX_EVENTS, DOCX_HOST_SAVE_TIMEOUT_MS } from './docxConstants';
import type { HostSaveResult, HostSaveWaiter } from './docxTypes';

export function useDocxHostSave(setDirty: (dirty: boolean) => void) {
    const saveRequestTimerRef = useRef<number | null>(null);
    const hostSaveInProgressRef = useRef(false);
    const hostSaveWaitersRef = useRef<HostSaveWaiter[]>([]);

    const requestHostSave = useCallback(() => {
        setDirty(true);
        if (saveRequestTimerRef.current !== null) {
            window.clearTimeout(saveRequestTimerRef.current);
        }
        saveRequestTimerRef.current = window.setTimeout(() => {
            saveRequestTimerRef.current = null;
            handler.emit(DOCX_EVENTS.hostSaveRequest);
        }, 50);
    }, [setDirty]);

    const resolveHostSaveWaiters = useCallback((result: HostSaveResult) => {
        const waiters = hostSaveWaitersRef.current.splice(0);
        for (const waiter of waiters) waiter(result);
    }, []);

    const requestHostSaveAndWait = useCallback(async (): Promise<void> => {
        setDirty(true);
        if (saveRequestTimerRef.current !== null) {
            window.clearTimeout(saveRequestTimerRef.current);
            saveRequestTimerRef.current = null;
        }
        await new Promise<void>((resolve, reject) => {
            const complete: HostSaveWaiter = (result) => {
                window.clearTimeout(timer);
                if (result.success) {
                    resolve();
                } else {
                    reject(new Error(result.error || 'DOCX save failed before switching to View mode.'));
                }
            };
            const timer = window.setTimeout(() => {
                hostSaveWaitersRef.current = hostSaveWaitersRef.current.filter((waiter) => waiter !== complete);
                reject(new Error('Timed out while saving DOCX document before switching to View mode.'));
            }, DOCX_HOST_SAVE_TIMEOUT_MS);
            hostSaveWaitersRef.current.push(complete);
            handler.emit(DOCX_EVENTS.hostSaveRequest);
        });
    }, [setDirty]);

    useEffect(() => () => {
        if (saveRequestTimerRef.current !== null) {
            window.clearTimeout(saveRequestTimerRef.current);
        }
        resolveHostSaveWaiters({ success: false, error: 'DOCX editor was closed.' });
    }, [resolveHostSaveWaiters]);

    return {
        hostSaveInProgressRef,
        requestHostSave,
        requestHostSaveAndWait,
        resolveHostSaveWaiters,
    };
}
