import { useEffect, useRef, useState, useCallback } from 'react';
import { DocxEditor, type DocxEditorRef } from '@eigenpal/docx-editor-react';
import '@eigenpal/docx-editor-react/styles.css';
import { handler } from '../../util/vscode';
import './Word.css';

/**
 * DOCX Editor view — replaces the old read-only docx-preview with an
 * interactive WYSIWYG editor powered by @eigenpal/docx-editor-react.
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
    const [documentBuffer, setDocumentBuffer] = useState<ArrayBuffer | null>(null);
    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        // Legacy path: extension sends file URL, we fetch the ArrayBuffer
        handler.on(DOCX_EVENTS.open, async ({ path }: { path: string }) => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(path);
                const buffer = await response.arrayBuffer();
                setDocumentBuffer(buffer);
            } catch (e) {
                setError(`Failed to load document: ${e instanceof Error ? e.message : String(e)}`);
            } finally {
                setLoading(false);
            }
        });

        // New path: extension sends binary buffer directly via postMessage
        handler.on(DOCX_EVENTS.openBuffer, ({ buffer }: { buffer: number[] }) => {
            setLoading(true);
            setError(null);
            try {
                const arrayBuffer = new Uint8Array(buffer).buffer;
                setDocumentBuffer(arrayBuffer);
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
                if (!editorRef.current) {
                    throw new Error('Editor not ready');
                }
                const buffer = await editorRef.current.save();
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
    }, [setDirty]);

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
        <div className="docx-editor-container">
            <DocxEditor
                ref={editorRef}
                documentBuffer={documentBuffer}
                mode="editing"
                showToolbar={true}
                showZoomControl={true}
                showRuler={true}
                onChange={handleChange}
                onSave={handleSave}
                onError={handleError}
            />
        </div>
    );
}
