import {
    SuperDocEditor,
    type SuperDocEditorCreateEvent,
    type SuperDocEditorUpdateEvent,
    type SuperDocRef,
    type SuperDocTransactionEvent,
} from '@superdoc-dev/react';
import type { MutableRefObject, RefObject, WheelEvent } from 'react';
import { DOCX_SUPERDOC_MODULES, DOCX_USER } from './docxConstants';
import type { DocxMode } from './docxTypes';
import { SUPERDOC_FONT_ASSET_URLS } from './superdocFonts';
import { extractErrorMessage, isFatalSuperDocException, isIgnorableSuperDocException } from './superdocExceptions';
import { applySuperDocZoom } from './superdocZoom';

type SuperDocSurfaceProps = {
    bodyEditorRef: MutableRefObject<unknown>;
    documentFile: File;
    documentName: string;
    documentVersion: number;
    editorSurfaceRef: RefObject<HTMLElement | null>;
    editorTextSnapshotRef: MutableRefObject<string>;
    lastPersistedTextSnapshotRef: MutableRefObject<string>;
    mode: DocxMode;
    refreshEditorTextSnapshot: () => void;
    rendering: boolean;
    setError: (message: string | null) => void;
    setLoading: (loading: boolean) => void;
    setRendering: (rendering: boolean) => void;
    setWarning: (message: string | null) => void;
    superdocRef: RefObject<SuperDocRef | null>;
    zoomScale: number;
    onEditorUpdate: (event: SuperDocEditorUpdateEvent) => void;
    onTransaction: (event: SuperDocTransactionEvent) => void;
    onWheel: (event: WheelEvent<HTMLElement>) => void;
};

export function SuperDocSurface({
    bodyEditorRef,
    documentFile,
    documentName,
    documentVersion,
    editorSurfaceRef,
    editorTextSnapshotRef,
    lastPersistedTextSnapshotRef,
    mode,
    refreshEditorTextSnapshot,
    rendering,
    setError,
    setLoading,
    setRendering,
    setWarning,
    superdocRef,
    zoomScale,
    onEditorUpdate,
    onTransaction,
    onWheel,
}: SuperDocSurfaceProps) {
    const handleReady = () => {
        applySuperDocZoom(superdocRef.current?.getInstance(), bodyEditorRef.current, zoomScale);
        setRendering(false);
        setLoading(false);
        refreshEditorTextSnapshot();
        lastPersistedTextSnapshotRef.current = editorTextSnapshotRef.current;
    };

    const handleEditorCreate = (event: SuperDocEditorCreateEvent) => {
        bodyEditorRef.current = event.editor;
        applySuperDocZoom(superdocRef.current?.getInstance(), event.editor, zoomScale);
        setRendering(false);
        setLoading(false);
        refreshEditorTextSnapshot();
        lastPersistedTextSnapshotRef.current = editorTextSnapshotRef.current;
    };

    return (
        <main
            ref={editorSurfaceRef}
            className="docx-superdoc-container"
            data-docx-mode={mode}
            onWheel={onWheel}
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
                onReady={handleReady}
                onEditorCreate={handleEditorCreate}
                onEditorUpdate={onEditorUpdate}
                onTransaction={onTransaction}
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
    );
}
