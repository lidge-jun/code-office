import { Button, Segmented } from 'antd';
import JSZip from 'jszip';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    SuperDocEditor,
    type SuperDocEditorCreateEvent,
    type SuperDocEditorUpdateEvent,
    type SuperDocRef,
    type SuperDocTransactionEvent,
} from '@superdoc-dev/react';
import '@superdoc-dev/react/style.css';
import CaladeaBoldUrl from '../../../../node_modules/superdoc/dist/fonts/Caladea-Bold.woff2?url';
import CaladeaBoldItalicUrl from '../../../../node_modules/superdoc/dist/fonts/Caladea-BoldItalic.woff2?url';
import CaladeaItalicUrl from '../../../../node_modules/superdoc/dist/fonts/Caladea-Italic.woff2?url';
import CaladeaRegularUrl from '../../../../node_modules/superdoc/dist/fonts/Caladea-Regular.woff2?url';
import CarlitoBoldUrl from '../../../../node_modules/superdoc/dist/fonts/Carlito-Bold.woff2?url';
import CarlitoBoldItalicUrl from '../../../../node_modules/superdoc/dist/fonts/Carlito-BoldItalic.woff2?url';
import CarlitoItalicUrl from '../../../../node_modules/superdoc/dist/fonts/Carlito-Italic.woff2?url';
import CarlitoRegularUrl from '../../../../node_modules/superdoc/dist/fonts/Carlito-Regular.woff2?url';
import LiberationMonoBoldUrl from '../../../../node_modules/superdoc/dist/fonts/LiberationMono-Bold.woff2?url';
import LiberationMonoBoldItalicUrl from '../../../../node_modules/superdoc/dist/fonts/LiberationMono-BoldItalic.woff2?url';
import LiberationMonoItalicUrl from '../../../../node_modules/superdoc/dist/fonts/LiberationMono-Italic.woff2?url';
import LiberationMonoRegularUrl from '../../../../node_modules/superdoc/dist/fonts/LiberationMono-Regular.woff2?url';
import LiberationSansBoldUrl from '../../../../node_modules/superdoc/dist/fonts/LiberationSans-Bold.woff2?url';
import LiberationSansBoldItalicUrl from '../../../../node_modules/superdoc/dist/fonts/LiberationSans-BoldItalic.woff2?url';
import LiberationSansItalicUrl from '../../../../node_modules/superdoc/dist/fonts/LiberationSans-Italic.woff2?url';
import LiberationSansRegularUrl from '../../../../node_modules/superdoc/dist/fonts/LiberationSans-Regular.woff2?url';
import LiberationSerifBoldUrl from '../../../../node_modules/superdoc/dist/fonts/LiberationSerif-Bold.woff2?url';
import LiberationSerifBoldItalicUrl from '../../../../node_modules/superdoc/dist/fonts/LiberationSerif-BoldItalic.woff2?url';
import LiberationSerifItalicUrl from '../../../../node_modules/superdoc/dist/fonts/LiberationSerif-Italic.woff2?url';
import LiberationSerifRegularUrl from '../../../../node_modules/superdoc/dist/fonts/LiberationSerif-Regular.woff2?url';
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
const DOCX_EXPORT_TIMEOUT_MS = 10000;
const DOCX_REPAIR_TIMEOUT_MS = 10000;
const DOCX_RENDER_TIMEOUT_MS = 12000;
const DOCX_USER = {
    name: 'code-office',
    email: 'code-office@example.invalid',
    color: '#185abd',
};

const SUPERDOC_FONT_ASSET_URLS: Record<string, string> = {
    'Caladea-Bold.woff2': CaladeaBoldUrl,
    'Caladea-BoldItalic.woff2': CaladeaBoldItalicUrl,
    'Caladea-Italic.woff2': CaladeaItalicUrl,
    'Caladea-Regular.woff2': CaladeaRegularUrl,
    'Carlito-Bold.woff2': CarlitoBoldUrl,
    'Carlito-BoldItalic.woff2': CarlitoBoldItalicUrl,
    'Carlito-Italic.woff2': CarlitoItalicUrl,
    'Carlito-Regular.woff2': CarlitoRegularUrl,
    'LiberationMono-Bold.woff2': LiberationMonoBoldUrl,
    'LiberationMono-BoldItalic.woff2': LiberationMonoBoldItalicUrl,
    'LiberationMono-Italic.woff2': LiberationMonoItalicUrl,
    'LiberationMono-Regular.woff2': LiberationMonoRegularUrl,
    'LiberationSans-Bold.woff2': LiberationSansBoldUrl,
    'LiberationSans-BoldItalic.woff2': LiberationSansBoldItalicUrl,
    'LiberationSans-Italic.woff2': LiberationSansItalicUrl,
    'LiberationSans-Regular.woff2': LiberationSansRegularUrl,
    'LiberationSerif-Bold.woff2': LiberationSerifBoldUrl,
    'LiberationSerif-BoldItalic.woff2': LiberationSerifBoldItalicUrl,
    'LiberationSerif-Italic.woff2': LiberationSerifItalicUrl,
    'LiberationSerif-Regular.woff2': LiberationSerifRegularUrl,
};

const DOCX_SUPERDOC_MODULES = {
    comments: {
        readOnly: true,
        allowResolve: false,
        showResolved: false,
    },
    trackChanges: {
        enabled: false,
        visible: false,
        mode: 'off',
    },
} as const;

const DOCX_EVENTS = {
    init: 'init',
    open: 'open',
    openBuffer: 'openBuffer',
    dirtyChanged: 'docxDirtyChanged',
    hostSaveRequest: 'docxHostSaveRequest',
    saveRequest: 'docxSaveRequest',
    saveResponse: 'docxSaveResponse',
} as const;

type DocxSavePurpose = 'save' | 'backup';

export default function Word() {
    const superdocRef = useRef<SuperDocRef>(null);
    const bodyEditorRef = useRef<unknown>(null);
    const editorSurfaceRef = useRef<HTMLElement | null>(null);
    const editorTextSnapshotRef = useRef('');
    const lastPersistedTextSnapshotRef = useRef('');
    const saveRequestTimerRef = useRef<number | null>(null);
    const exportCurrentDocumentRef = useRef<() => Promise<ArrayBuffer>>(async () => {
        throw new Error('SuperDoc editor is not ready.');
    });
    const [documentBuffer, setDocumentBuffer] = useState<ArrayBuffer | null>(null);
    const [documentVersion, setDocumentVersion] = useState(0);
    const latestSaveBufferRef = useRef<ArrayBuffer | null>(null);
    const [loading, setLoading] = useState(true);
    const [rendering, setRendering] = useState(false);
    const [mode, setMode] = useState<'viewer' | 'editor'>('viewer');
    const [documentName, setDocumentName] = useState('Document.docx');
    const [zoomScale, setZoomScale] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
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
        setDocumentVersion((version) => version + 1);
    }, []);

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

    const handleViewerWheel = useCallback((event: React.WheelEvent<HTMLElement>) => {
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
            const buffer = await withTimeout(
                exportCurrentDocument(),
                DOCX_EXPORT_TIMEOUT_MS,
                'Timed out while preparing DOCX viewer mode.',
            );
            updateDocumentBuffer(buffer);
            if (wasDirty) setDirty(true);
            setMode('viewer');
        } catch (e) {
            setError(`Failed to prepare viewer mode: ${formatUnknownError(e)}`);
        } finally {
            setLoading(false);
        }
    }, [exportCurrentDocument, mode, setDirty, updateDocumentBuffer]);

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
                if (!buffer) {
                    throw exportOrValidationError instanceof Error
                        ? exportOrValidationError
                        : new Error('DOCX export did not produce bytes.');
                }
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
    }, [refreshEditorTextSnapshot, setDirty, updateDocumentBuffer]);

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
    }, [mode, requestHostSave]);

    useEffect(() => () => {
        if (saveRequestTimerRef.current !== null) {
            window.clearTimeout(saveRequestTimerRef.current);
        }
    }, []);

    useEffect(() => {
        if (!rendering) return undefined;
        const timer = window.setTimeout(() => {
            setRendering(false);
            setWarning('DOCX render is taking longer than expected. Check DevTools for SuperDoc or font loading warnings.');
        }, DOCX_RENDER_TIMEOUT_MS);
        return () => window.clearTimeout(timer);
    }, [rendering, documentVersion, mode]);

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
                                setWarning(null);
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
            {warning ? <div className="docx-shell__warning">{warning}</div> : null}
            <main
                ref={editorSurfaceRef}
                className="docx-superdoc-container"
                data-docx-mode={mode}
                onWheel={handleViewerWheel}
            >
                {rendering ? <div className="docx-viewer__status">Rendering document...</div> : null}
                <SuperDocEditor
                    key={`${documentName}:${documentVersion}`}
                    ref={superdocRef}
                    className="docx-superdoc"
                    style={{ width: '100%', height: '100%' }}
                    contained={true}
                    document={documentFile}
                    documentMode={mode === 'viewer' ? 'viewing' : 'editing'}
                    role="editor"
                    user={DOCX_USER}
                    title={documentName}
                    hideToolbar={false}
                    allowSelectionInViewMode={true}
                    modules={DOCX_SUPERDOC_MODULES}
                    telemetry={{ enabled: false }}
                    fonts={{
                        resolveAssetUrl: ({ file }) => SUPERDOC_FONT_ASSET_URLS[file] ?? file,
                    }}
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
                        applySuperDocZoom(superdocRef.current?.getInstance(), bodyEditorRef.current, zoomScale);
                        setRendering(false);
                        setLoading(false);
                        refreshEditorTextSnapshot();
                        lastPersistedTextSnapshotRef.current = editorTextSnapshotRef.current;
                    }}
                    onEditorCreate={(event: SuperDocEditorCreateEvent) => {
                        bodyEditorRef.current = event.editor;
                        applySuperDocZoom(superdocRef.current?.getInstance(), event.editor, zoomScale);
                        setRendering(false);
                        setLoading(false);
                        refreshEditorTextSnapshot();
                        lastPersistedTextSnapshotRef.current = editorTextSnapshotRef.current;
                    }}
                    onEditorUpdate={handleEditorUpdate}
                    onTransaction={handleTransaction}
                    onContentError={(event) => {
                        setRendering(false);
                        setLoading(false);
                        setError(`SuperDoc content error: ${extractErrorMessage(event)}`);
                    }}
                    onException={(event) => {
                        setRendering(false);
                        setLoading(false);
                        const message = `SuperDoc exception: ${extractErrorMessage(event)}`;
                        if (isFatalSuperDocException(event)) {
                            setError(message);
                        } else if (!isIgnorableSuperDocException(event)) {
                            setWarning(message);
                        }
                    }}
                />
            </main>
        </div>
    );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    let timer: number | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => {
        if (timer !== undefined) window.clearTimeout(timer);
    });
}

function applySuperDocZoom(instance: unknown, bodyEditor: unknown, zoom: number): void {
    const activeEditor = instance && typeof instance === 'object'
        ? (instance as { activeEditor?: unknown }).activeEditor
        : undefined;
    const editorCandidates = [bodyEditor, activeEditor];
    for (const candidate of editorCandidates) {
        if (!candidate || typeof candidate !== 'object') continue;
        const maybeEditorZoomable = candidate as { setZoom?: (value: number) => void };
        if (typeof maybeEditorZoomable.setZoom !== 'function') continue;
        maybeEditorZoomable.setZoom(zoom);
        return;
    }
    if (!instance || typeof instance !== 'object') return;
    const maybeSuperDocZoomable = instance as { setZoom?: (percent: number) => void };
    if (typeof maybeSuperDocZoomable.setZoom !== 'function') return;
    maybeSuperDocZoomable.setZoom(Math.round(zoom * 100));
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

function isFatalSuperDocException(event: unknown): boolean {
    if (!event || typeof event !== 'object') return true;
    const payload = event as { stage?: unknown; code?: unknown };
    if (payload.stage === 'document-init') return true;
    if (payload.code === 'password-required') return true;
    return false;
}

function isIgnorableSuperDocException(event: unknown): boolean {
    const message = extractErrorMessage(event);
    return /Cannot read properties of undefined \(reading ['"]elements['"]\)/.test(message);
}

function extractErrorMessage(event: unknown): string {
    if (event instanceof Error) return event.message;
    if (typeof event === 'string') return event;
    if (event && typeof event === 'object' && 'error' in event) {
        return formatUnknownError((event as { error: unknown }).error);
    }
    return formatUnknownError(event);
}

function readEditorTextSnapshot(surface: HTMLElement | null): string {
    if (!surface) return '';
    const editorRoots = Array.from(surface.querySelectorAll<HTMLElement>(
        '.ProseMirror[contenteditable="true"], [contenteditable="true"], .ProseMirror, [role="textbox"], .superdoc-page'
    ));
    const textCandidates = editorRoots
        .map((element) => sanitizeEditorSnapshotText(element.innerText))
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);
    if (textCandidates[0]) return textCandidates[0].trim();

    const fallbackSurface = surface.cloneNode(true) as HTMLElement;
    fallbackSurface.querySelectorAll('.docx-shell__toolbar, .docx-shell__warning, .superdoc-toolbar-container, [role="toolbar"]').forEach((element) => {
        element.remove();
    });
    return sanitizeEditorSnapshotText(fallbackSurface.innerText).trim();
}

function sanitizeEditorSnapshotText(value: string): string {
    return splitEditorTextLines(value)
        .filter(isRelevantVisibleLine)
        .join('\n');
}

async function exportEditorDocx(editor: unknown, sourceBuffer: ArrayBuffer | null): Promise<Blob | null> {
    if (!editor || typeof editor !== 'object' || !('exportDocx' in editor)) return null;
    const exportDocx = (editor as {
        exportDocx?: (params?: {
            commentsType?: string;
            isFinalDoc?: boolean;
            fieldsHighlightColor?: string | null;
            exportXmlOnly?: boolean;
            getUpdatedDocs?: boolean;
        }) => Promise<Blob | ArrayBuffer | string | Record<string, string | null>>;
    }).exportDocx;
    if (typeof exportDocx !== 'function') return null;

    const exportOptions = {
        commentsType: 'external',
        isFinalDoc: false,
        fieldsHighlightColor: null,
    };

    if (sourceBuffer) {
        try {
            const updatedDocs = await exportDocx.call(editor, {
                ...exportOptions,
                getUpdatedDocs: true,
            });
            if (isUpdatedDocMap(updatedDocs)) {
                return await patchDocxParts(sourceBuffer, updatedDocs);
            }
        } catch (e) {
            if (isSuperDocElementsError(e)) throw e;
            /* try the next SuperDoc export strategy */
        }

        try {
            const documentXml = await exportDocx.call(editor, {
                ...exportOptions,
                exportXmlOnly: true,
            });
            if (typeof documentXml === 'string' && documentXml.includes('<w:document')) {
                return await patchDocxParts(sourceBuffer, { 'word/document.xml': documentXml });
            }
        } catch (e) {
            if (isSuperDocElementsError(e)) throw e;
            /* try the package-level SuperDoc export fallback */
        }
    }

    try {
        const exported = await exportDocx.call(editor, exportOptions);
        if (exported instanceof Blob) return exported;
        if (exported instanceof ArrayBuffer) return new Blob([exported], { type: DOCX_MIME });
    } catch (e) {
        if (isSuperDocElementsError(e)) throw e;
        /* allow the caller to try another editor or instance.export */
    }
    return null;
}

function isSuperDocElementsError(error: unknown): boolean {
    return /Cannot read properties of undefined \(reading ['"]elements['"]\)/.test(formatUnknownError(error));
}

function isUpdatedDocMap(value: unknown): value is Record<string, string | null> {
    if (!value || typeof value !== 'object' || value instanceof Blob || value instanceof ArrayBuffer) return false;
    return Object.values(value as Record<string, unknown>).every((entry) => entry === null || typeof entry === 'string');
}

function getChangedTextSnippets(currentText: string, persistedText: string): string[] {
    const persisted = normalizeEditorText(persistedText);
    return getRelevantTextTokens(currentText).filter((token) => !persisted.includes(token)).slice(0, 5);
}

async function getMissingVisibleTextSnippetsFromSource(sourceBuffer: ArrayBuffer | null, currentText: string): Promise<string[]> {
    if (!sourceBuffer) return [];
    try {
        const zip = await JSZip.loadAsync(sourceBuffer.slice(0));
        const documentXml = await zip.file('word/document.xml')?.async('string');
        if (!documentXml) return [];
        const sourceText = normalizeEditorText(extractDocxText(documentXml));
        return mergeTextSnippets(
            getRelevantTextTokens(currentText).filter((token) => !sourceText.includes(token)),
            splitEditorTextLines(currentText).filter((line) => isRelevantVisibleLine(line) && !sourceText.includes(normalizeEditorText(line))),
        );
    } catch {
        return [];
    }
}

function isRelevantVisibleLine(value: string): boolean {
    const normalized = normalizeEditorText(value);
    if (normalized.length < 4 || normalized.length > 180) return false;
    if (/^(DOCX|SuperDoc (viewer|edit) mode|Rendering document|Loading document)$/i.test(normalized)) return false;
    if (/\b(unset|selected|tracked changes|overflow items|cursor moved)\b/i.test(normalized)) return false;
    return !/^(View|Edit|Save|Undo|Bold|Italic|Underline|Color|Highlight|Table|Document mode)$/i.test(normalized);
}

function mergeTextSnippets(...groups: string[][]): string[] {
    return Array.from(new Set(groups.flat())).slice(0, 5);
}

function getRelevantTextTokens(value: string): string[] {
    const ignoredUiTokens = new Set([
        'accept', 'actions', 'align', 'bold', 'bullet', 'color', 'document', 'family',
        'font', 'highlight', 'image', 'indent', 'italic', 'left', 'list', 'mode',
        'numbered', 'overflow', 'redo', 'reject', 'strikethrough', 'table', 'text',
        'tracked', 'underline', 'undo', 'undefined', 'unset', 'zoom', 'changes', 'items', 'selected', 'size',
        'cursor', 'moved',
    ]);
    const tokens = normalizeEditorText(value).split(' ').filter((token) => token.length >= 4);
    return Array.from(new Set(tokens.filter((token) => {
        const normalized = token.toLowerCase().replace(/[^a-z0-9_가-힣]/g, '');
        return normalized
            && !/^\d+$/.test(normalized)
            && !ignoredUiTokens.has(normalized);
    })));
}

async function assertDocxContainsTextSnippets(buffer: ArrayBuffer, snippets: string[]): Promise<void> {
    if (!snippets.length) return;
    const zip = await JSZip.loadAsync(buffer.slice(0));
    const documentXml = await zip.file('word/document.xml')?.async('string');
    if (!documentXml) throw new Error('Exported DOCX is missing word/document.xml.');

    const exportedText = normalizeEditorText(extractDocxText(documentXml));
    const missing = snippets.filter((snippet) => !exportedText.includes(normalizeEditorText(snippet)));
    if (missing.length) {
        throw new Error(`SuperDoc export did not include current edits: ${missing.join(', ')}`);
    }
}

async function patchDocxTextFromSnapshots(
    sourceBuffer: ArrayBuffer | null,
    currentText: string,
    persistedText: string,
    snippets: string[],
): Promise<ArrayBuffer | null> {
    if (!sourceBuffer || !snippets.length) return null;
    const currentLines = splitEditorTextLines(currentText);
    const persistedLines = splitEditorTextLines(persistedText);
    if (!currentLines.length) return null;

    const replacements: Array<{ from: string; to: string }> = [];
    for (let index = 0; index < Math.min(currentLines.length, persistedLines.length); index += 1) {
        const from = persistedLines[index];
        const to = currentLines[index];
        if (!from || !to || from === to) continue;
        if (!snippets.some((snippet) => normalizeEditorText(to).includes(normalizeEditorText(snippet)))) continue;
        replacements.push({ from, to });
    }
    const zip = await JSZip.loadAsync(sourceBuffer.slice(0));
    let documentXml = await zip.file('word/document.xml')?.async('string');
    if (!documentXml) return null;

    const documentParagraphs = extractDocxParagraphTexts(documentXml);
    const insertions: Array<{ anchor: string; text: string; position: 'before' | 'after' }> = [];
    const bodyEndInsertions: string[] = [];
    currentLines.forEach((currentLine, index) => {
        if (!snippets.some((snippet) => normalizeEditorText(currentLine).includes(normalizeEditorText(snippet)))) {
            return;
        }
        const from = findBestSourceParagraph(currentLine, documentParagraphs);
        if (from && !replacements.some((replacement) => replacement.from === from && replacement.to === currentLine)) {
            replacements.push({ from, to: currentLine });
            return;
        }
        const insertion = findInsertionPointForNewLine(currentLines, index, documentParagraphs);
        if (insertion && !insertions.some((entry) => entry.anchor === insertion.anchor && entry.text === currentLine)) {
            insertions.push({ ...insertion, text: currentLine });
        } else if (!bodyEndInsertions.some((line) => normalizeEditorText(line) === normalizeEditorText(currentLine))) {
            bodyEndInsertions.push(currentLine);
        }
    });
    if (!replacements.length && !insertions.length && !bodyEndInsertions.length) return null;

    let patched = false;
    for (const replacement of replacements) {
        const nextXml = replaceParagraphText(documentXml, replacement.from, replacement.to);
        if (nextXml !== documentXml) {
            documentXml = nextXml;
            patched = true;
        }
    }
    for (const insertion of insertions) {
        const nextXml = insertParagraphTextAdjacent(documentXml, insertion.anchor, insertion.text, insertion.position);
        if (nextXml !== documentXml) {
            documentXml = nextXml;
            patched = true;
        }
    }
    for (const insertedText of bodyEndInsertions) {
        const nextXml = insertParagraphBeforeBodyEnd(documentXml, insertedText);
        if (nextXml !== documentXml) {
            documentXml = nextXml;
            patched = true;
        }
    }
    if (!patched) return null;

    zip.file('word/document.xml', documentXml);
    return await zip.generateAsync({
        type: 'arraybuffer',
        mimeType: DOCX_MIME,
        compression: 'DEFLATE',
    });
}

async function repairDocxTextFromSnapshots(
    documentBuffer: ArrayBuffer | null,
    sourceBuffer: ArrayBuffer | null,
    currentText: string,
    persistedText: string,
    snippets: string[],
): Promise<ArrayBuffer | null> {
    const candidateSnippets = mergeTextSnippets(
        snippets,
        splitEditorTextLines(currentText).filter(isRelevantVisibleLine),
    );
    const attempts: Array<() => Promise<ArrayBuffer | null>> = [
        () => appendDocxTextSnippets(documentBuffer, candidateSnippets),
        () => appendDocxTextSnippets(sourceBuffer, candidateSnippets),
        () => patchDocxTextFromSnapshots(sourceBuffer, currentText, persistedText, candidateSnippets),
        () => patchDocxTextFromSnapshots(documentBuffer, currentText, persistedText, candidateSnippets),
    ];

    for (const attempt of attempts) {
        try {
            const repaired = await attempt();
            if (!repaired) continue;
            return repaired;
        } catch {
            // Continue to the next deterministic XML repair strategy.
        }
    }
    return null;
}

async function appendDocxTextSnippets(sourceBuffer: ArrayBuffer | null, snippets: string[]): Promise<ArrayBuffer | null> {
    if (!sourceBuffer || !snippets.length) return null;
    const zip = await JSZip.loadAsync(sourceBuffer.slice(0));
    let documentXml = await zip.file('word/document.xml')?.async('string');
    if (!documentXml) return null;

    let patched = false;
    for (const snippet of snippets) {
        const normalizedSnippet = normalizeEditorText(snippet);
        if (!normalizedSnippet || normalizeEditorText(extractDocxText(documentXml)).includes(normalizedSnippet)) continue;
        const nextXml = insertParagraphBeforeSectionOrBodyEnd(documentXml, normalizedSnippet);
        if (nextXml !== documentXml) {
            documentXml = nextXml;
            patched = true;
        }
    }
    if (!patched) return null;

    zip.file('word/document.xml', documentXml);
    return await zip.generateAsync({
        type: 'arraybuffer',
        mimeType: DOCX_MIME,
        compression: 'DEFLATE',
    });
}

function extractDocxParagraphTexts(documentXml: string): string[] {
    return Array.from(documentXml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g), (match) => normalizeEditorText(extractDocxText(match[0])))
        .filter((text) => text.length >= 4);
}

function findBestSourceParagraph(currentLine: string, paragraphTexts: string[]): string | null {
    const normalizedLine = normalizeEditorText(currentLine);
    const candidates = paragraphTexts.filter((paragraphText) => {
        const normalizedParagraph = normalizeEditorText(paragraphText);
        return normalizedLine === normalizedParagraph
            || normalizedLine.startsWith(`${normalizedParagraph} `)
            || normalizedLine.includes(normalizedParagraph)
            || hasStrongParagraphTokenOverlap(normalizedLine, normalizedParagraph);
    });
    candidates.sort((a, b) => {
        const scoreDelta = getParagraphOverlapScore(normalizedLine, b) - getParagraphOverlapScore(normalizedLine, a);
        return scoreDelta || b.length - a.length;
    });
    return candidates[0] ?? null;
}

function findInsertionPointForNewLine(
    currentLines: string[],
    lineIndex: number,
    paragraphTexts: string[],
): { anchor: string; position: 'before' | 'after' } | null {
    for (let previous = lineIndex - 1; previous >= 0; previous -= 1) {
        const anchor = findBestSourceParagraph(currentLines[previous], paragraphTexts);
        if (anchor) return { anchor, position: 'after' };
    }
    for (let next = lineIndex + 1; next < currentLines.length; next += 1) {
        const anchor = findBestSourceParagraph(currentLines[next], paragraphTexts);
        if (anchor) return { anchor, position: 'before' };
    }
    return null;
}

function hasStrongParagraphTokenOverlap(currentLine: string, paragraphText: string): boolean {
    const paragraphTokens = getComparableParagraphTokens(paragraphText);
    if (paragraphTokens.length < 2) return false;
    const lineTokens = new Set(getComparableParagraphTokens(currentLine));
    const overlap = paragraphTokens.filter((token) => lineTokens.has(token)).length;
    return overlap >= Math.min(2, paragraphTokens.length)
        && overlap / paragraphTokens.length >= 0.5;
}

function getParagraphOverlapScore(currentLine: string, paragraphText: string): number {
    const paragraphTokens = getComparableParagraphTokens(paragraphText);
    if (!paragraphTokens.length) return 0;
    const lineTokens = new Set(getComparableParagraphTokens(currentLine));
    const overlap = paragraphTokens.filter((token) => lineTokens.has(token)).length;
    return overlap / paragraphTokens.length;
}

function getComparableParagraphTokens(value: string): string[] {
    return normalizeEditorText(value)
        .split(' ')
        .map((token) => token.toLowerCase().replace(/[^a-z0-9_가-힣-]/g, ''))
        .filter((token) => token.length >= 2 && !/^xmlpatch\d+_ok_\d+/i.test(token));
}

function splitEditorTextLines(value: string): string[] {
    return value
        .split(/\r?\n/)
        .map((line) => normalizeEditorText(line).replace(/^\*+|\*+$/g, '').trim())
        .filter(Boolean);
}

function replaceParagraphText(documentXml: string, fromText: string, toText: string): string {
    const target = normalizeEditorText(fromText);
    return documentXml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraphXml) => {
        const paragraphText = normalizeEditorText(extractDocxText(paragraphXml));
        if (paragraphText !== target) return paragraphXml;
        let firstTextNode = true;
        return paragraphXml.replace(/(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g, (_match, open: string, _text: string, close: string) => {
            if (firstTextNode) {
                firstTextNode = false;
                return `${open}${encodeXmlText(toText)}${close}`;
            }
            return `${open}${close}`;
        });
    });
}

function insertParagraphTextAdjacent(
    documentXml: string,
    anchorText: string,
    insertedText: string,
    position: 'before' | 'after',
): string {
    const target = normalizeEditorText(anchorText);
    const insertedParagraph = `<w:p><w:r><w:t>${encodeXmlText(insertedText)}</w:t></w:r></w:p>`;
    let inserted = false;
    return documentXml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraphXml) => {
        if (inserted) return paragraphXml;
        const paragraphText = normalizeEditorText(extractDocxText(paragraphXml));
        if (paragraphText !== target) return paragraphXml;
        inserted = true;
        return position === 'before'
            ? `${insertedParagraph}${paragraphXml}`
            : `${paragraphXml}${insertedParagraph}`;
    });
}

function insertParagraphBeforeBodyEnd(documentXml: string, insertedText: string): string {
    const insertedParagraph = `<w:p><w:r><w:t>${encodeXmlText(insertedText)}</w:t></w:r></w:p>`;
    return insertParagraphBeforeSectionOrBodyEnd(documentXml, insertedText, insertedParagraph);
}

function insertParagraphBeforeSectionOrBodyEnd(
    documentXml: string,
    insertedText: string,
    paragraphXml = `<w:p><w:r><w:t>${encodeXmlText(insertedText)}</w:t></w:r></w:p>`,
): string {
    if (documentXml.includes('</w:body>')) {
        if (/<w:sectPr\b[\s\S]*?<\/w:sectPr>/.test(documentXml)) {
            return documentXml.replace(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/, `${paragraphXml}$&`);
        }
        if (/<w:sectPr\s*\/>/.test(documentXml)) {
            return documentXml.replace(/<w:sectPr\s*\/>/, `${paragraphXml}$&`);
        }
        return documentXml.replace('</w:body>', `${paragraphXml}</w:body>`);
    }
    return documentXml;
}

function extractDocxText(documentXml: string): string {
    const matches = documentXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g);
    return Array.from(matches, (match) => decodeXmlText(match[1])).join(' ');
}

function decodeXmlText(value: string): string {
    return value
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');
}

function encodeXmlText(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function normalizeEditorText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

async function patchDocxParts(sourceBuffer: ArrayBuffer, updatedDocs: Record<string, string | null>): Promise<Blob> {
    const zip = await JSZip.loadAsync(sourceBuffer.slice(0));
    for (const [path, content] of Object.entries(updatedDocs)) {
        if (!path) continue;
        if (content === null) {
            zip.remove(path);
        } else {
            zip.file(path, content);
        }
    }
    return await zip.generateAsync({
        type: 'blob',
        mimeType: DOCX_MIME,
        compression: 'DEFLATE',
    });
}
