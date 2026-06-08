import { Button, Segmented } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DocxEditor, type DocxEditorRef } from '@eigenpal/docx-editor-react';
import '@eigenpal/docx-editor-react/styles.css';
import { renderAsync } from 'docx-preview';
import { handler } from '../../util/vscode';
import './Word.css';
import {
    DOCX_EDITOR_CLASS_NAME,
    DOCX_EDITOR_FONT_FAMILIES,
    DOCX_EDITOR_INITIAL_ZOOM,
    DOCX_EDITOR_STYLE,
} from './docxEditorTuning';

/**
 * DOCX view/edit surface.
 *
 * The default mode is a high-fidelity read-only docx-preview render. The
 * WYSIWYG editor remains available as an explicit edit mode because it is less
 * reliable for complex Korean DOCX layout than the preview renderer.
 *
 * Communication with the extension host uses the same event bus pattern
 * as the HWP editor:
 *
 *   Extension → WebView:
 *     "open"          → { path: string }   (legacy: fetches .docx via URL)
 *     "openBuffer"    → { buffer: number[] } (new: binary data via postMessage)
 *     "docxSaveRequest" → { requestId }     (host asks for save bytes)
 *
 *   WebView → Extension:
 *     "init"          → signals ready
 *     "docxDirtyChanged"  → { isDirty }
 *     "docxHostSaveRequest" → asks the extension host to run VS Code save
 *     "docxSaveResponse"  → { requestId, success, bytes?, error? }
 */

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
    const editorRef = useRef<DocxEditorRef>(null);
    const saveRequestTimerRef = useRef<number | null>(null);
    const viewerRef = useRef<HTMLDivElement>(null);
    const [documentBuffer, setDocumentBuffer] = useState<ArrayBuffer | null>(null);
    const latestSaveBufferRef = useRef<ArrayBuffer | null>(null);
    const [loading, setLoading] = useState(true);
    const [rendering, setRendering] = useState(false);
    const [mode, setMode] = useState<'viewer' | 'editor'>('viewer');
    const [documentName, setDocumentName] = useState('Document.docx');
    const [error, setError] = useState<string | null>(null);
    const isDirtyRef = useRef(false);
    const hostSaveInProgressRef = useRef(false);

    const setDirty = useCallback((dirty: boolean) => {
        if (isDirtyRef.current === dirty) return;
        isDirtyRef.current = dirty;
        handler.emit(DOCX_EVENTS.dirtyChanged, { isDirty: dirty });
    }, []);

    const handleChange = useCallback(() => {
        setDirty(true);
    }, [setDirty]);

    const handleError = useCallback((err: Error) => {
        console.error('[DocxEditor]', err);
        setError(err.message);
    }, []);

    const updateDocumentBuffer = useCallback((buffer: ArrayBuffer) => {
        setDocumentBuffer(buffer);
        latestSaveBufferRef.current = buffer;
    }, []);

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
        // Editor-local save callbacks do not write to disk directly. The host
        // owns the VS Code save lifecycle and requests bytes with requestId.
        if (!hostSaveInProgressRef.current) requestHostSave();
    }, [requestHostSave]);

    const handleFontsLoaded = useCallback(() => {
        editorRef.current?.getEditorRef()?.relayout();
    }, []);

    const switchToViewer = useCallback(async () => {
        if (!editorRef.current) {
            setMode('viewer');
            return;
        }
        const wasDirty = isDirtyRef.current;
        setLoading(true);
        setError(null);
        try {
            const buffer = await editorRef.current.save();
            if (buffer) {
                latestSaveBufferRef.current = buffer;
                setDocumentBuffer(buffer);
                if (wasDirty) setDirty(true);
            }
            setMode('viewer');
        } catch (e) {
            setError(`Failed to prepare viewer mode: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setLoading(false);
        }
    }, [setDirty]);

    useEffect(() => {
        // Legacy path: extension sends file URL, we fetch the ArrayBuffer
        handler.on(DOCX_EVENTS.open, async ({ path }: { path: string }) => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(path);
                const buffer = await response.arrayBuffer();
                updateDocumentBuffer(buffer);
            } catch (e) {
                setError(`Failed to load document: ${e instanceof Error ? e.message : String(e)}`);
            } finally {
                setLoading(false);
            }
        });

        // New path: extension sends binary buffer directly via postMessage
        handler.on(DOCX_EVENTS.openBuffer, ({ buffer, fileName }: { buffer: number[]; fileName?: string }) => {
            setLoading(true);
            setError(null);
            try {
                if (fileName) setDocumentName(fileName);
                const arrayBuffer = new Uint8Array(buffer).buffer;
                updateDocumentBuffer(arrayBuffer);
            } catch (e) {
                setError(`Failed to parse buffer: ${e instanceof Error ? e.message : String(e)}`);
            } finally {
                setLoading(false);
            }
        });

        // Save request from extension host (e.g. VS Code Cmd+S → saveCustomDocument)
        handler.on(DOCX_EVENTS.saveRequest, async ({ requestId }: { requestId: string }) => {
            hostSaveInProgressRef.current = true;
            try {
                if (!editorRef.current && !latestSaveBufferRef.current) {
                    throw new Error('Editor not ready');
                }
                const buffer = editorRef.current
                    ? await editorRef.current.save()
                    : latestSaveBufferRef.current;
                if (!buffer) {
                    throw new Error('Save returned null');
                }
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
                    error: e instanceof Error ? e.message : String(e),
                });
            } finally {
                hostSaveInProgressRef.current = false;
            }
        });

        handler.emit(DOCX_EVENTS.init);
    }, [setDirty, updateDocumentBuffer]);

    useEffect(() => {
        if (mode !== 'viewer' || !documentBuffer || !viewerRef.current) return;
        let cancelled = false;
        let handleResize: (() => void) | null = null;
        const target = viewerRef.current;
        setRendering(true);
        target.innerHTML = '';
        void (async () => {
            try {
                await renderAsync(documentBuffer.slice(0), target, undefined, {
                    className: 'docx',
                    inWrapper: true,
                    ignoreFonts: false,
                    breakPages: true,
                    ignoreLastRenderedPageBreak: false,
                    renderHeaders: true,
                    renderFooters: true,
                    renderFootnotes: true,
                    renderEndnotes: true,
                    renderComments: true,
                    experimental: true,
                });
                await nextAnimationFrame();
                if (!cancelled) {
                    annotateDocxPreviewPages(target);
                    fitDocxPreviewToViewport(target);
                    handleResize = () => fitDocxPreviewToViewport(target);
                    window.addEventListener('resize', handleResize);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(`Failed to render document preview: ${e instanceof Error ? e.message : String(e)}`);
                }
            } finally {
                if (!cancelled) setRendering(false);
            }
        })();
        return () => {
            cancelled = true;
            if (handleResize) window.removeEventListener('resize', handleResize);
            target.innerHTML = '';
        };
    }, [documentBuffer, mode]);

    // Intercept Ctrl/Cmd+S to trigger save through extension host
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
        const markEditorDirty = () => setDirty(true);
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
    }, [setDirty]);

    useEffect(() => {
        if (mode !== 'editor' || !documentBuffer) return;
        let delayedRelayoutTimer: number | null = null;
        const relayoutFrame = window.requestAnimationFrame(() => {
            editorRef.current?.getEditorRef()?.relayout();
            delayedRelayoutTimer = window.setTimeout(() => {
                editorRef.current?.getEditorRef()?.relayout();
            }, 250);
        });
        return () => {
            window.cancelAnimationFrame(relayoutFrame);
            if (delayedRelayoutTimer !== null) window.clearTimeout(delayedRelayoutTimer);
        };
    }, [documentBuffer, mode]);

    if (error) {
        return (
            <div className="docx-editor-error">
                <p>Failed to load document</p>
                <pre>{error}</pre>
            </div>
        );
    }

    if (loading && !documentBuffer) {
        return (
            <div className="docx-editor-loading">
                Loading document...
            </div>
        );
    }

    if (!documentBuffer) {
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
                        {mode === 'viewer' ? 'Viewer mode' : 'Experimental edit mode'}
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
            {mode === 'viewer' ? (
                <main className="docx-viewer">
                    {rendering ? <div className="docx-viewer__status">Rendering preview...</div> : null}
                    <div className="docx-viewer__surface" ref={viewerRef} />
                </main>
            ) : (
                <main className="docx-editor-container">
                    <DocxEditor
                        ref={editorRef}
                        className={DOCX_EDITOR_CLASS_NAME}
                        style={DOCX_EDITOR_STYLE}
                        documentBuffer={documentBuffer}
                        mode="editing"
                        documentName={documentName}
                        documentNameEditable={false}
                        disableFindReplaceShortcuts={true}
                        fontFamilies={DOCX_EDITOR_FONT_FAMILIES}
                        initialZoom={DOCX_EDITOR_INITIAL_ZOOM}
                        showToolbar={true}
                        showZoomControl={true}
                        showRuler={true}
                        rulerUnit="cm"
                        showMarginGuides={true}
                        marginGuideColor="#94a3b8"
                        showOutline={false}
                        showOutlineButton={false}
                        onFontsLoaded={handleFontsLoaded}
                        onChange={handleChange}
                        onSave={handleSave}
                        onError={handleError}
                    />
                </main>
            )}
        </div>
    );
}

function nextAnimationFrame(): Promise<void> {
    return new Promise(resolve => window.requestAnimationFrame(() => resolve()));
}

function annotateDocxPreviewPages(target: HTMLElement): void {
    const pages = Array.from(target.querySelectorAll<HTMLElement>('section.docx'));
    pages.forEach((page, index) => {
        page.dataset.docxPage = String(index + 1);
        const next = page.nextElementSibling;
        if (next?.matches('section.docx')) {
            page.after(createPageSeparator());
        }
    });
    target.dataset.docxVisualPageCount = String(pages.length);
}

function fitDocxPreviewToViewport(target: HTMLElement): void {
    const wrapper = target.querySelector<HTMLElement>('.docx-wrapper');
    const pages = Array.from(target.querySelectorAll<HTMLElement>('section.docx'));
    if (!wrapper || pages.length === 0) return;

    wrapper.style.zoom = '1';
    const availableWidth = Math.max(target.clientWidth - 48, 320);
    const contentWidth = Math.max(...pages.map(page => Math.max(
        page.getBoundingClientRect().width,
        page.scrollWidth
    )));
    if (!contentWidth || contentWidth <= availableWidth) {
        wrapper.style.removeProperty('zoom');
        target.dataset.docxViewerZoom = '1';
        target.scrollLeft = 0;
        return;
    }

    const zoom = Math.max(0.45, Math.min(1, availableWidth / contentWidth));
    wrapper.style.zoom = zoom.toFixed(3);
    target.dataset.docxViewerZoom = zoom.toFixed(3);
    target.scrollLeft = 0;
}

function createPageSeparator(): HTMLElement {
    const separator = document.createElement('div');
    separator.className = 'docx-viewer__page-separator';
    separator.setAttribute('aria-hidden', 'true');
    return separator;
}
