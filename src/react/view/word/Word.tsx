import { Button, Segmented } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SuperDocEditor, type SuperDocRef } from '@superdoc-dev/react';
import '@superdoc-dev/react/style.css';
import { handler } from '../../util/vscode';
import './Word.css';

/**
 * DOCX view/edit surface.
 *
 * SuperDoc owns both high-fidelity viewing and editing. The VS Code extension
 * host still owns the actual save lifecycle: this WebView only exports bytes
 * when the CustomEditorProvider requests them with a requestId.
 */

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOCX_USER = {
    name: 'code-office',
    email: 'code-office@example.invalid',
    color: '#185abd',
};

const DOCX_EVENTS = {
    init: 'init',
    open: 'open',
    openBuffer: 'openBuffer',
    dirtyChanged: 'docxDirtyChanged',
    hostSaveRequest: 'docxHostSaveRequest',
    saveRequest: 'docxSaveRequest',
    saveResponse: 'docxSaveResponse',
} as const;

export default function Word() {
    const superdocRef = useRef<SuperDocRef>(null);
    const saveRequestTimerRef = useRef<number | null>(null);
    const [documentBuffer, setDocumentBuffer] = useState<ArrayBuffer | null>(null);
    const latestSaveBufferRef = useRef<ArrayBuffer | null>(null);
    const [loading, setLoading] = useState(true);
    const [rendering, setRendering] = useState(false);
    const [mode, setMode] = useState<'viewer' | 'editor'>('viewer');
    const [documentName, setDocumentName] = useState('Document.docx');
    const [error, setError] = useState<string | null>(null);
    const isDirtyRef = useRef(false);
    const hostSaveInProgressRef = useRef(false);

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
        setDocumentBuffer(buffer);
        latestSaveBufferRef.current = buffer;
    }, []);

    const exportCurrentDocument = useCallback(async (): Promise<ArrayBuffer> => {
        const instance = superdocRef.current?.getInstance();
        if (!instance) {
            if (latestSaveBufferRef.current) return latestSaveBufferRef.current.slice(0);
            throw new Error('SuperDoc editor is not ready.');
        }
        const blob = await instance.export({
            exportType: ['docx'],
            exportedName: stripDocxExtension(documentName),
            triggerDownload: false,
        });
        const buffer = await blob.arrayBuffer();
        latestSaveBufferRef.current = buffer;
        return buffer;
    }, [documentName]);

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

    const handleSave = useCallback(() => {
        if (!hostSaveInProgressRef.current) requestHostSave();
    }, [requestHostSave]);

    const handleEditorUpdate = useCallback(() => {
        if (mode === 'editor') setDirty(true);
    }, [mode, setDirty]);

    const switchToViewer = useCallback(async () => {
        if (mode !== 'editor') {
            setMode('viewer');
            return;
        }
        const wasDirty = isDirtyRef.current;
        setLoading(true);
        setError(null);
        try {
            const buffer = await exportCurrentDocument();
            setDocumentBuffer(buffer);
            if (wasDirty) setDirty(true);
            setMode('viewer');
        } catch (e) {
            setError(`Failed to prepare viewer mode: ${formatUnknownError(e)}`);
        } finally {
            setLoading(false);
        }
    }, [exportCurrentDocument, mode, setDirty]);

    useEffect(() => {
        handler.on(DOCX_EVENTS.open, async ({ path }: { path: string }) => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(path);
                const buffer = await response.arrayBuffer();
                updateDocumentBuffer(buffer);
            } catch (e) {
                setError(`Failed to load document: ${formatUnknownError(e)}`);
            } finally {
                setLoading(false);
            }
        });

        handler.on(DOCX_EVENTS.openBuffer, ({ buffer, fileName }: { buffer: number[]; fileName?: string }) => {
            setLoading(true);
            setError(null);
            try {
                if (fileName) setDocumentName(fileName);
                const arrayBuffer = new Uint8Array(buffer).buffer;
                updateDocumentBuffer(arrayBuffer);
            } catch (e) {
                setError(`Failed to parse buffer: ${formatUnknownError(e)}`);
            } finally {
                setLoading(false);
            }
        });

        handler.on(DOCX_EVENTS.saveRequest, async ({ requestId }: { requestId: string }) => {
            hostSaveInProgressRef.current = true;
            try {
                const buffer = await exportCurrentDocument();
                handler.emit(DOCX_EVENTS.saveResponse, {
                    requestId,
                    success: true,
                    bytes: Array.from(new Uint8Array(buffer)),
                });
                setDirty(false);
            } catch (e) {
                handler.emit(DOCX_EVENTS.saveResponse, {
                    requestId,
                    success: false,
                    error: formatUnknownError(e),
                });
            } finally {
                hostSaveInProgressRef.current = false;
            }
        });

        handler.emit(DOCX_EVENTS.init);
    }, [exportCurrentDocument, setDirty, updateDocumentBuffer]);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent): void {
            if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 's') {
                event.preventDefault();
                event.stopPropagation();
                requestHostSave();
            }
        }
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [requestHostSave]);

    useEffect(() => {
        const markEditorDirty = () => {
            if (mode === 'editor') setDirty(true);
        };
        document.addEventListener('beforeinput', markEditorDirty, true);
        document.addEventListener('input', markEditorDirty, true);
        document.addEventListener('cut', markEditorDirty, true);
        document.addEventListener('paste', markEditorDirty, true);
        return () => {
            document.removeEventListener('beforeinput', markEditorDirty, true);
            document.removeEventListener('input', markEditorDirty, true);
            document.removeEventListener('cut', markEditorDirty, true);
            document.removeEventListener('paste', markEditorDirty, true);
            if (saveRequestTimerRef.current !== null) {
                window.clearTimeout(saveRequestTimerRef.current);
            }
        };
    }, [mode, setDirty]);

    if (error) {
        return (
            <div className="docx-editor-error">
                <p>Failed to load document</p>
                <pre>{error}</pre>
            </div>
        );
    }

    if (loading && !documentFile) {
        return (
            <div className="docx-editor-loading">
                Loading document...
            </div>
        );
    }

    if (!documentFile) {
        return (
            <div className="docx-editor-loading">
                No document loaded
            </div>
        );
    }

    return (
        <div className="docx-shell">
            <header className="docx-shell__toolbar">
                <div>
                    <div className="docx-shell__title">DOCX</div>
                    <div className="docx-shell__meta">
                        {mode === 'viewer' ? 'SuperDoc viewer mode' : 'SuperDoc edit mode'}
                    </div>
                </div>
                <div className="docx-shell__actions">
                    <Segmented
                        size="small"
                        value={mode}
                        options={[
                            { label: 'View', value: 'viewer' },
                            { label: 'Edit', value: 'editor' },
                        ]}
                        onChange={(value) => {
                            if (value === 'viewer') {
                                void switchToViewer();
                            } else {
                                setError(null);
                                setMode('editor');
                            }
                        }}
                    />
                    {mode === 'editor' ? (
                        <Button size="small" type="primary" onClick={handleSave}>
                            Save
                        </Button>
                    ) : null}
                </div>
            </header>
            <main className="docx-superdoc-container" data-docx-mode={mode}>
                {rendering ? <div className="docx-viewer__status">Rendering document...</div> : null}
                <SuperDocEditor
                    key={`${documentName}-${mode}`}
                    ref={superdocRef}
                    className="docx-superdoc"
                    style={{ width: '100%', height: '100%' }}
                    contained={true}
                    document={documentFile}
                    documentMode={mode === 'viewer' ? 'viewing' : 'editing'}
                    role={mode === 'viewer' ? 'viewer' : 'editor'}
                    user={DOCX_USER}
                    title={documentName}
                    hideToolbar={mode === 'viewer'}
                    allowSelectionInViewMode={true}
                    comments={{ visible: mode === 'editor' }}
                    trackChanges={{ visible: true }}
                    layoutEngineOptions={{
                        flowMode: 'paginated',
                        virtualization: { enabled: true, window: 7, overscan: 2 },
                    }}
                    uiDisplayFallbackFont={'-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans CJK KR", "Noto Sans KR", sans-serif'}
                    renderLoading={() => (
                        <div className="docx-editor-loading">
                            Loading document...
                        </div>
                    )}
                    onReady={() => {
                        setRendering(false);
                        setLoading(false);
                    }}
                    onEditorCreate={() => {
                        setRendering(false);
                        setLoading(false);
                    }}
                    onEditorUpdate={handleEditorUpdate}
                    onTransaction={handleEditorUpdate}
                    onContentError={(event) => {
                        setRendering(false);
                        setLoading(false);
                        setError(`SuperDoc content error: ${extractErrorMessage(event)}`);
                    }}
                    onException={(event) => {
                        setRendering(false);
                        setLoading(false);
                        setError(`SuperDoc exception: ${extractErrorMessage(event)}`);
                    }}
                />
            </main>
        </div>
    );
}

function normalizeDocumentName(name: string): string {
    return /\.docx$/i.test(name) ? name : `${name}.docx`;
}

function stripDocxExtension(name: string): string {
    return normalizeDocumentName(name).replace(/\.docx$/i, '');
}

function formatUnknownError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return JSON.stringify(error);
}

function extractErrorMessage(event: unknown): string {
    if (event instanceof Error) return event.message;
    if (typeof event === 'string') return event;
    if (event && typeof event === 'object' && 'error' in event) {
        return formatUnknownError((event as { error: unknown }).error);
    }
    return formatUnknownError(event);
}
