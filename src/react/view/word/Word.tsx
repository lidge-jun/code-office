import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WheelEvent } from 'react';
import type { SuperDocEditorUpdateEvent, SuperDocRef, SuperDocTransactionEvent } from '@superdoc-dev/react';
import '@superdoc-dev/react/style.css';
import { handler } from '../../util/vscode';
import {
    DOCX_EVENTS,
    DOCX_EXPORT_TIMEOUT_MS,
    DOCX_MIME,
    DOCX_REPAIR_TIMEOUT_MS,
} from './docxConstants';
import { DocxModeToolbar } from './DocxModeToolbar';
import { exportEditorDocx } from './docxExport';
import { withTimeout, normalizeDocumentName, stripDocxExtension } from './docxRuntimeUtils';
import { repairDocxTextFromSnapshots } from './docxSaveRepair';
import { assertDocxContainsTextSnippets } from './docxSaveValidation';
import {
    getChangedTextSnippets,
    getMissingVisibleTextSnippetsFromSource,
    mergeTextSnippets,
    readEditorTextSnapshot,
} from './docxSnapshot';
import type { DocxMode, DocxSavePurpose, HostSaveResult } from './docxTypes';
import { DocxEmptyState, DocxErrorState, DocxLoadingState } from './DocxLoadState';
import { formatUnknownError } from './superdocExceptions';
import { applySuperDocZoom } from './superdocZoom';
import { SuperDocSurface } from './SuperDocSurface';
import { useDocxHostSave } from './useDocxHostSave';
import { useDocxKeyboardSave } from './useDocxKeyboardSave';
import { useDocxRenderTimeout } from './useDocxRenderTimeout';
import './Word.css';

export default function Word() {
    const superdocRef = useRef<SuperDocRef>(null);
    const bodyEditorRef = useRef<unknown>(null);
    const editorSurfaceRef = useRef<HTMLElement | null>(null);
    const editorTextSnapshotRef = useRef('');
    const lastPersistedTextSnapshotRef = useRef('');
    const exportCurrentDocumentRef = useRef<() => Promise<ArrayBuffer>>(async () => {
        throw new Error('SuperDoc editor is not ready.');
    });
    const [documentBuffer, setDocumentBuffer] = useState<ArrayBuffer | null>(null);
    const [documentVersion, setDocumentVersion] = useState(0);
    const latestSaveBufferRef = useRef<ArrayBuffer | null>(null);
    const documentLoadedRef = useRef(false);
    const [loading, setLoading] = useState(true);
    const [rendering, setRendering] = useState(false);
    const [mode, setMode] = useState<DocxMode>('viewer');
    const [documentName, setDocumentName] = useState('Document.docx');
    const [zoomScale, setZoomScale] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const isDirtyRef = useRef(false);

    const documentFile = useMemo(() => {
        if (!documentBuffer) return null;
        return new File([documentBuffer.slice(0)], normalizeDocumentName(documentName), { type: DOCX_MIME });
    }, [documentBuffer, documentName]);

    const setDirty = useCallback((dirty: boolean) => {
        if (isDirtyRef.current === dirty) return;
        isDirtyRef.current = dirty;
        handler.emit(DOCX_EVENTS.dirtyChanged, { isDirty: dirty });
    }, []);

    const updateDocumentBuffer = useCallback((buffer: ArrayBuffer) => {
        documentLoadedRef.current = true;
        setDocumentBuffer(buffer);
        latestSaveBufferRef.current = buffer;
        setDocumentVersion((version) => version + 1);
    }, []);

    const { hostSaveInProgressRef, requestHostSave, requestHostSaveAndWait, resolveHostSaveWaiters } = useDocxHostSave(setDirty);

    const exportCurrentDocument = useCallback(async (): Promise<ArrayBuffer> => {
        const instance = superdocRef.current?.getInstance();
        if (!instance) {
            if (latestSaveBufferRef.current) return latestSaveBufferRef.current.slice(0);
            throw new Error('SuperDoc editor is not ready.');
        }
        const sourceBuffer = latestSaveBufferRef.current ?? documentBuffer;
        const activeEditor = (instance as { activeEditor?: unknown }).activeEditor;
        const bodyEditorBlob = await exportEditorDocx(bodyEditorRef.current, sourceBuffer);
        const activeEditorBlob = bodyEditorBlob ?? (
            activeEditor && activeEditor !== bodyEditorRef.current
                ? await exportEditorDocx(activeEditor, sourceBuffer)
                : null
        );
        if (!activeEditorBlob && sourceBuffer) {
            throw new Error('SuperDoc editor export did not expose live DOCX bytes.');
        }
        const blob = activeEditorBlob ?? await instance.export({
            exportType: ['docx'],
            exportedName: stripDocxExtension(documentName),
            triggerDownload: false,
        });
        return await blob.arrayBuffer();
    }, [documentBuffer, documentName]);

    useEffect(() => {
        exportCurrentDocumentRef.current = exportCurrentDocument;
    }, [exportCurrentDocument]);

    const handleSave = useCallback(() => {
        if (!hostSaveInProgressRef.current) requestHostSave();
    }, [requestHostSave]);

    const handleViewerWheel = useCallback((event: WheelEvent<HTMLElement>) => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        const nextZoom = Math.min(2.5, Math.max(0.5, zoomScale - event.deltaY * 0.002));
        const roundedZoom = Number(nextZoom.toFixed(2));
        setZoomScale(roundedZoom);
        applySuperDocZoom(superdocRef.current?.getInstance(), bodyEditorRef.current, roundedZoom);
    }, [zoomScale]);

    const handleTransaction = useCallback((event: SuperDocTransactionEvent) => {
        bodyEditorRef.current = event.editor;
        if (mode === 'editor' && event.transaction.docChanged) setDirty(true);
    }, [mode, setDirty]);

    const refreshEditorTextSnapshot = useCallback(() => {
        editorTextSnapshotRef.current = readEditorTextSnapshot(editorSurfaceRef.current);
    }, []);

    const handleEditorUpdate = useCallback((_event: SuperDocEditorUpdateEvent) => {
        bodyEditorRef.current = _event.editor;
        if (mode !== 'editor') return;
        const nextSnapshot = readEditorTextSnapshot(editorSurfaceRef.current);
        if (nextSnapshot === editorTextSnapshotRef.current) return;
        editorTextSnapshotRef.current = nextSnapshot;
        setDirty(true);
    }, [mode, setDirty]);

    const switchToViewer = useCallback(async () => {
        if (mode !== 'editor') {
            setMode('viewer');
            return;
        }
        const wasDirty = isDirtyRef.current;
        setLoading(true);
        setError(null);
        setWarning(null);
        try {
            if (wasDirty) {
                await requestHostSaveAndWait();
                const savedBuffer = latestSaveBufferRef.current;
                if (savedBuffer) updateDocumentBuffer(savedBuffer);
                setDirty(false);
            }
            setMode('viewer');
        } catch (e) {
            setError(`Failed to prepare viewer mode: ${formatUnknownError(e)}`);
        } finally {
            setLoading(false);
        }
    }, [mode, requestHostSaveAndWait, setDirty, updateDocumentBuffer]);

    useEffect(() => {
        handler.on(DOCX_EVENTS.open, async ({ path }: { path: string }) => {
            setLoading(true);
            setRendering(true);
            setError(null);
            try {
                const response = await fetch(path);
                const buffer = await response.arrayBuffer();
                setWarning(null);
                updateDocumentBuffer(buffer);
            } catch (e) {
                setError(`Failed to load document: ${formatUnknownError(e)}`);
            } finally {
                setLoading(false);
            }
        });

        handler.on(DOCX_EVENTS.openBuffer, ({ buffer, fileName }: { buffer: number[]; fileName?: string }) => {
            setLoading(true);
            setRendering(true);
            setError(null);
            try {
                if (fileName) setDocumentName(fileName);
                const arrayBuffer = new Uint8Array(buffer).buffer;
                setWarning(null);
                updateDocumentBuffer(arrayBuffer);
            } catch (e) {
                setError(`Failed to parse buffer: ${formatUnknownError(e)}`);
            } finally {
                setLoading(false);
            }
        });

        handler.on(DOCX_EVENTS.saveRequest, async ({ requestId, purpose = 'save' }: { requestId: string; purpose?: DocxSavePurpose }) => {
            hostSaveInProgressRef.current = true;
            try {
                const currentSnapshot = readEditorTextSnapshot(editorSurfaceRef.current) || editorTextSnapshotRef.current;
                const sourceBuffer = latestSaveBufferRef.current ?? documentBuffer;
                let snippets = mergeTextSnippets(
                    getChangedTextSnippets(currentSnapshot, lastPersistedTextSnapshotRef.current),
                    await getMissingVisibleTextSnippetsFromSource(sourceBuffer, currentSnapshot),
                );
                let buffer: ArrayBuffer | null = null;
                let nextWarning: string | null = null;
                let exportOrValidationError: unknown = null;
                if (sourceBuffer && !snippets.length) {
                    buffer = sourceBuffer.slice(0);
                }
                if (!buffer) {
                    try {
                        buffer = await withTimeout(
                            exportCurrentDocumentRef.current(),
                            DOCX_EXPORT_TIMEOUT_MS,
                            'Timed out while exporting DOCX document.',
                        );
                        snippets = mergeTextSnippets(
                            snippets,
                            await getMissingVisibleTextSnippetsFromSource(buffer, currentSnapshot),
                        );
                        try {
                            await assertDocxContainsTextSnippets(buffer, snippets);
                        } catch (validationError) {
                            nextWarning = `DOCX export warning: ${formatUnknownError(validationError)}`;
                        }
                    } catch (e) {
                        exportOrValidationError = e;
                        const patchedBuffer = await withTimeout(
                            repairDocxTextFromSnapshots(
                                documentBuffer,
                                sourceBuffer,
                                currentSnapshot,
                                lastPersistedTextSnapshotRef.current,
                                snippets,
                            ),
                            DOCX_REPAIR_TIMEOUT_MS,
                            'Timed out while repairing DOCX export.',
                        );
                        if (!patchedBuffer) throw e;
                        buffer = patchedBuffer;
                        latestSaveBufferRef.current = buffer;
                        nextWarning = null;
                    }
                }
                if (!buffer) {
                    throw exportOrValidationError instanceof Error
                        ? exportOrValidationError
                        : new Error('DOCX export did not produce bytes.');
                }
                latestSaveBufferRef.current = buffer;
                handler.emit(DOCX_EVENTS.saveResponse, {
                    requestId,
                    success: true,
                    bytes: Array.from(new Uint8Array(buffer)),
                });
                refreshEditorTextSnapshot();
                lastPersistedTextSnapshotRef.current = editorTextSnapshotRef.current;
                setWarning(nextWarning);
                if (purpose === 'save') {
                    setDirty(false);
                }
            } catch (e) {
                setWarning(`Save failed: ${formatUnknownError(e)}`);
                resolveHostSaveWaiters({ success: false, error: formatUnknownError(e) });
                handler.emit(DOCX_EVENTS.saveResponse, {
                    requestId,
                    success: false,
                    error: formatUnknownError(e),
                });
            } finally {
                hostSaveInProgressRef.current = false;
            }
        });

        handler.on(DOCX_EVENTS.hostSaveCompleted, (result: HostSaveResult) => {
            resolveHostSaveWaiters(result);
        });

        let initAttempts = 0;
        const requestDocumentOpen = () => {
            initAttempts += 1;
            handler.emit(DOCX_EVENTS.init);
        };
        requestDocumentOpen();
        const initRetryTimer = window.setInterval(() => {
            if (documentLoadedRef.current || initAttempts >= 8) {
                window.clearInterval(initRetryTimer);
                return;
            }
            requestDocumentOpen();
        }, 750);
        return () => window.clearInterval(initRetryTimer);
    }, [refreshEditorTextSnapshot, resolveHostSaveWaiters, setDirty, updateDocumentBuffer]);

    useDocxKeyboardSave(mode, hostSaveInProgressRef, requestHostSave);
    useDocxRenderTimeout(rendering, documentVersion, mode, setRendering, setWarning);

    if (error) {
        return <DocxErrorState error={error} />;
    }

    if (loading && !documentFile) {
        return <DocxLoadingState />;
    }

    if (!documentFile) {
        return <DocxEmptyState />;
    }

    return (
        <div className="docx-shell">
            <DocxModeToolbar
                mode={mode}
                onModeChange={(nextMode) => {
                    if (nextMode === 'viewer') {
                        void switchToViewer();
                    } else {
                        setError(null);
                        setWarning(null);
                        setMode('editor');
                    }
                }}
                onSave={handleSave}
            />
            {warning ? <div className="docx-shell__warning">{warning}</div> : null}
            <SuperDocSurface
                bodyEditorRef={bodyEditorRef}
                documentFile={documentFile}
                documentName={documentName}
                documentVersion={documentVersion}
                editorSurfaceRef={editorSurfaceRef}
                editorTextSnapshotRef={editorTextSnapshotRef}
                lastPersistedTextSnapshotRef={lastPersistedTextSnapshotRef}
                mode={mode}
                refreshEditorTextSnapshot={refreshEditorTextSnapshot}
                rendering={rendering}
                setError={setError}
                setLoading={setLoading}
                setRendering={setRendering}
                setWarning={setWarning}
                superdocRef={superdocRef}
                zoomScale={zoomScale}
                onEditorUpdate={handleEditorUpdate}
                onTransaction={handleTransaction}
                onWheel={handleViewerWheel}
            />
        </div>
    );
}
