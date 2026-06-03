import { Alert } from 'antd';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
    HWP_EVENTS,
    type HwpErrorPayload,
    type HwpFileDataPayload,
    type HwpMode,
    type HwpModePayload,
    type HwpSaveResultPayload,
    type HwpViewerCommandPayload,
    type HwpVscodeSaveRequestPayload,
} from '../../../common/hwpMessageSchema';
import { handler } from '../../util/vscode.ts';
import { getConfigs } from '../../util/vscodeConfig.ts';
import { HwpEditorSurface } from './HwpEditorSurface';
import { HwpViewer } from './HwpViewer';
import { renderPdfPages } from './hwpPdfPages';
import type { RenderedHwpPage } from './hwpTypes';
import { createSecureRhwpEditor } from './rhwpBridge/createSecureRhwpEditor';
import { exportSvgPages } from './rhwpBridge/exportSvgPages';
import { DEFAULT_RHWP_REQUEST_TIMEOUT_MS, type HwpLoadStatusPayload, type SecureRhwpEditor } from './rhwpBridge/types';
import './Hwp.less';

export default function Hwp() {
    const configs = getConfigs();
    const configuredRhwpStudioHtml = configs?.rhwpStudioHtml;
    const configuredRhwpStudioBaseUrl = configs?.rhwpStudioBaseUrl;
    const configuredRhwpStudioUrl = resolveRhwpStudioUrl(configs?.rhwpStudioUrl);
    const hwpSaveEnabled = configs?.hwpExperimentalSave !== false;
    const initialMode = configs?.hwpInitialMode === 'editor' ? 'editor' : 'viewer';
    const editorRef = useRef<SecureRhwpEditor | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dirtyRef = useRef(false);
    const savingRef = useRef(false);
    const modeRef = useRef<HwpMode>(initialMode);
    const pagesRef = useRef<RenderedHwpPage[]>([]);
    const pendingViewerSwitchRef = useRef(false);
    const fileNameRef = useRef('');
    const isHwpxRef = useRef(false);
    const [mode, setMode] = useState<HwpMode>(initialMode);
    const [pages, setPages] = useState<RenderedHwpPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [renderingViewer, setRenderingViewer] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const [isHwpx, setIsHwpx] = useState(false);
    const [fileName, setFileName] = useState('');

    const setDirtyState = useCallback((value: boolean) => {
        if (dirtyRef.current === value) return;
        dirtyRef.current = value;
        setDirty(value);
        handler.emit(HWP_EVENTS.dirtyChanged, { isDirty: value });
    }, []);

    const setSavingState = useCallback((value: boolean) => {
        savingRef.current = value;
        setSaving(value);
    }, []);

    const commitMode = useCallback((nextMode: HwpMode) => {
        modeRef.current = nextMode;
        setMode(nextMode);
        handler.emit(HWP_EVENTS.modeChanged, { mode: nextMode });
    }, []);

    const markRhwpCleanAfterSave = useCallback(() => {
        void editorRef.current?.markClean().catch(() => {
            // Remote rhwp studios may not expose markClean; VS Code save success still owns host clean state.
        });
    }, []);

    const renderViewerPages = useCallback(async (debugOverlay = false) => {
        if (!editorRef.current) throw new Error('HWP viewer is not ready.');
        setRenderingViewer(true);
        try {
            const svgs = await exportSvgPages(editorRef.current, { debugOverlay });
            const rendered = svgs.map((svg, index) => ({ pageNumber: index + 1, svg }));
            if (!debugOverlay) {
                pagesRef.current = rendered;
                setPages(rendered);
            }
            return rendered;
        } finally {
            setRenderingViewer(false);
        }
    }, []);

    const enterViewerMode = useCallback(async () => {
        await renderViewerPages(false);
        commitMode('viewer');
    }, [commitMode, renderViewerPages]);

    const exportCurrentDocument = useCallback(async (requestedFormat?: 'hwp' | 'hwpx') => {
        if (!editorRef.current) throw new Error('HWP editor is not ready.');
        const format = requestedFormat ?? (isHwpxRef.current ? 'hwpx' : 'hwp');
        const documentBytes = format === 'hwpx'
            ? await editorRef.current.exportHwpx()
            : await editorRef.current.exportHwp();
        return {
            bytes: toNumberArray(documentBytes),
            sourceFileName: fileNameRef.current,
            isHwpx: format === 'hwpx',
            format,
        };
    }, []);

    const requestNativeSave = useCallback(() => {
        if (!editorRef.current || savingRef.current) return;
        if (modeRef.current === 'viewer' && !dirtyRef.current) return;
        setSavingState(true);
        setError(null);
        handler.emit(HWP_EVENTS.nativeSave);
    }, [setSavingState]);

    const requestModeChange = useCallback(async (payload: HwpModePayload) => {
        if (payload.mode === modeRef.current) return;
        if (payload.mode === 'editor') {
            commitMode('editor');
            return;
        }
        if (dirtyRef.current && modeRef.current === 'editor') {
            pendingViewerSwitchRef.current = true;
            setSaveMsg('Saving before switching to Viewer...');
            requestNativeSave();
            return;
        }
        try {
            await enterViewerMode();
        } catch (e) {
            setError(`Viewer render failed: ${e instanceof Error ? e.message : String(e)}`);
        }
    }, [commitMode, enterViewerMode, requestNativeSave]);

    const runViewerCommand = useCallback(async (payload: HwpViewerCommandPayload) => {
        try {
            const cachedPages = pagesRef.current;
            const canUseCachedPages = (payload.command === 'exportSvg' || payload.command === 'exportPdf') && cachedPages.length > 0;
            const rendered = canUseCachedPages
                ? cachedPages
                : await renderViewerPages(payload.command === 'debugOverlay');
            if (payload.command === 'exportPdf') {
                handler.emit(HWP_EVENTS.viewerCommandResult, {
                    requestId: payload.requestId,
                    command: payload.command,
                    success: true,
                    pngs: await renderPdfPages(rendered),
                });
                return;
            }
            handler.emit(HWP_EVENTS.viewerCommandResult, {
                requestId: payload.requestId,
                command: payload.command,
                success: true,
                svgs: rendered.map((page) => page.svg),
            });
        } catch (e) {
            handler.emit(HWP_EVENTS.viewerCommandResult, {
                requestId: payload.requestId,
                command: payload.command,
                success: false,
                error: e instanceof Error ? e.message : String(e),
            });
        }
    }, [renderViewerPages]);

    useEffect(() => {
        function handleRhwpDirtyChanged(event: Event): void {
            const detail = (event as CustomEvent<unknown>).detail;
            if (!isRhwpDirtyDetail(detail)) return;
            setDirtyState(detail.isDirty);
        }

        window.addEventListener('rhwp-dirty-changed', handleRhwpDirtyChanged);
        return () => window.removeEventListener('rhwp-dirty-changed', handleRhwpDirtyChanged);
    }, [setDirtyState]);

    useEffect(() => {
        function handleNativeSaveShortcut(event: KeyboardEvent): void {
            if (!isSaveShortcut(event)) return;
            event.preventDefault();
            event.stopPropagation();
            requestNativeSave();
        }

        window.addEventListener('keydown', handleNativeSaveShortcut, true);
        return () => window.removeEventListener('keydown', handleNativeSaveShortcut, true);
    }, [requestNativeSave]);

    useEffect(() => {
        function handleUserEdit(event: Event): void {
            if (loading || saving || !editorRef.current || modeRef.current !== 'editor') return;
            if (!isEventInsideHwpEditor(event, containerRef.current)) return;
            if (event instanceof KeyboardEvent && !isEditingKey(event)) return;
            setDirtyState(true);
        }

        const editEvents = ['beforeinput', 'input', 'paste', 'cut', 'compositionend'];
        editEvents.forEach((eventName) => window.addEventListener(eventName, handleUserEdit, true));
        window.addEventListener('keydown', handleUserEdit, true);
        return () => {
            editEvents.forEach((eventName) => window.removeEventListener(eventName, handleUserEdit, true));
            window.removeEventListener('keydown', handleUserEdit, true);
        };
    }, [loading, saving, setDirtyState]);

    useEffect(() => {
        let destroyed = false;

        async function loadHwpData(data: HwpFileDataPayload): Promise<void> {
            if (data.error) {
                setError(data.error);
                setLoading(false);
                return;
            }

            fileNameRef.current = data.fileName;
            isHwpxRef.current = data.isHwpx;
            setFileName(data.fileName);
            setIsHwpx(data.isHwpx);
            setDirtyState(false);
            setError(null);
            setWarning(null);
            setSaveMsg(null);
            setLoading(true);

            try {
                if (!containerRef.current) {
                    setLoading(false);
                    return;
                }
                const editor = editorRef.current ?? await createRhwpEditor(containerRef.current, data);
                if (destroyed) { editor.destroy(); return; }
                editorRef.current = editor;
                await editor.loadFile(new Uint8Array(data.buffer), data.fileName);
                if (modeRef.current === 'viewer') await enterViewerMode();
            } catch (e) {
                setError(`Failed to load: ${e instanceof Error ? e.message : String(e)}`);
                setLoading(false);
            }
        }

        async function handleVscodeSave(payload: HwpVscodeSaveRequestPayload): Promise<void> {
            try {
                const exported = await exportCurrentDocument(payload.format);
                handler.emit(HWP_EVENTS.vscodeSavePayload, {
                    requestId: payload.requestId,
                    success: true,
                    ...exported,
                });
            } catch (e) {
                handler.emit(HWP_EVENTS.vscodeSavePayload, {
                    requestId: payload.requestId,
                    success: false,
                    error: e instanceof Error ? e.message : String(e),
                });
            }
        }

        async function handleSaveResult(result: HwpSaveResultPayload): Promise<void> {
            setSavingState(false);
            if (result.success) {
                markRhwpCleanAfterSave();
                setDirtyState(false);
                const msg = result.convertedFromHwpx
                    ? `Saved as HWP: ${result.savedPath}`
                    : `Saved ${result.format?.toUpperCase() ?? 'document'} successfully`;
                setSaveMsg(msg);
                if (pendingViewerSwitchRef.current) {
                    pendingViewerSwitchRef.current = false;
                    await enterViewerMode();
                }
                setTimeout(() => setSaveMsg(null), 3000);
            } else {
                pendingViewerSwitchRef.current = false;
                setSaveMsg(null);
                setError(`Save failed: ${result.error}`);
            }
        }

        handler
            .on(HWP_EVENTS.fileData, loadHwpData)
            .on(HWP_EVENTS.reloadFile, loadHwpData)
            .on(HWP_EVENTS.vscodeSave, handleVscodeSave)
            .on(HWP_EVENTS.modeChangeRequest, requestModeChange)
            .on(HWP_EVENTS.viewerCommand, runViewerCommand)
            .on(HWP_EVENTS.saveResult, handleSaveResult)
            .on(HWP_EVENTS.error, (payload: HwpErrorPayload) => {
                setError(payload.error);
                setLoading(false);
            })
            .emit(HWP_EVENTS.init);

        return () => {
            destroyed = true;
            editorRef.current?.destroy();
        };

        function handleLoadStatus(status: HwpLoadStatusPayload): void {
            if (destroyed) return;
            if (status.status === 'loading') {
                setLoading(true);
            } else if (status.status === 'loaded') {
                setError(null);
                setWarning(null);
                setLoading(false);
            } else if (status.status === 'warning') {
                setWarning(status.message);
                setLoading(false);
            } else if (status.status === 'failed') {
                setError(status.message);
                setLoading(false);
            }
        }

        async function createRhwpEditor(container: HTMLElement, data: HwpFileDataPayload): Promise<SecureRhwpEditor> {
            const studioHtml = data.studioHtml ?? configuredRhwpStudioHtml;
            const studioBaseUrl = data.studioBaseUrl ?? configuredRhwpStudioBaseUrl;
            const studioUrl = studioHtml ? undefined : configuredRhwpStudioUrl;
            if (!studioHtml && !studioUrl) {
                throw new Error('HWP editor is not configured: missing local rhwp-studio bundle.');
            }
            return await createSecureRhwpEditor(container, {
                studioUrl,
                studioHtml,
                studioBaseUrl,
                width: '100%',
                height: '100%',
                requestTimeoutMs: DEFAULT_RHWP_REQUEST_TIMEOUT_MS,
                onLoadStatus: handleLoadStatus,
            });
        }
    }, [
        configuredRhwpStudioBaseUrl,
        configuredRhwpStudioHtml,
        configuredRhwpStudioUrl,
        enterViewerMode,
        exportCurrentDocument,
        markRhwpCleanAfterSave,
        requestModeChange,
        runViewerCommand,
        setDirtyState,
        setSavingState,
    ]);

    return (
        <div className="hwp-container">
            {error && <Alert type="error" message={error} closable onClose={() => setError(null)} />}
            {warning && <Alert type="warning" message={warning} closable onClose={() => setWarning(null)} />}
            {saveMsg && <Alert type="success" message={saveMsg} banner />}
            {mode === 'viewer' && (
                <HwpViewer
                    fileName={fileName}
                    pages={pages}
                    loading={loading || renderingViewer}
                    onEdit={() => void requestModeChange({ mode: 'editor' })}
                    onExportSvg={() => handler.emit(HWP_EVENTS.viewerCommandRequest, { command: 'exportSvg' })}
                    onExportPdf={() => handler.emit(HWP_EVENTS.viewerCommandRequest, { command: 'exportPdf' })}
                    onDebugOverlay={() => handler.emit(HWP_EVENTS.viewerCommandRequest, { command: 'debugOverlay' })}
                    onDumpParagraph={() => handler.emit(HWP_EVENTS.viewerCommandRequest, { command: 'dumpParagraph' })}
                />
            )}
            <div className={mode === 'editor' ? 'hwp-editor-surface' : 'hwp-editor-surface hwp-editor-surface-hidden'}>
                <HwpEditorSurface
                    fileName={fileName}
                    dirty={dirty}
                    isHwpx={isHwpx}
                    loading={loading || renderingViewer}
                    saving={saving || renderingViewer}
                    hwpSaveEnabled={hwpSaveEnabled}
                    containerRef={containerRef}
                    onSave={requestNativeSave}
                    onView={() => void requestModeChange({ mode: 'viewer' })}
                />
            </div>
        </div>
    );
}

function toNumberArray(value: ArrayBuffer | Uint8Array | number[]): number[] {
    if (Array.isArray(value)) return value;
    if (value instanceof Uint8Array) return Array.from(value);
    return Array.from(new Uint8Array(value));
}

function resolveRhwpStudioUrl(configuredUrl?: string): string | undefined {
    if (configuredUrl) return configuredUrl;
    const baseHref = document.querySelector('base')?.href;
    if (!baseHref) return undefined;
    try {
        const baseUrl = new URL(baseHref);
        const isVsCodeResource = baseUrl.protocol.startsWith('vscode-webview')
            || baseUrl.hostname.endsWith('vscode-cdn.net');
        if (!isVsCodeResource) return undefined;
        return new URL('../../resource/rhwp-studio/index.html', baseUrl).toString();
    } catch {
        return undefined;
    }
}

function isRhwpDirtyDetail(value: unknown): value is { isDirty: boolean } {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { isDirty?: unknown }).isDirty === 'boolean';
}

function isSaveShortcut(event: KeyboardEvent): boolean {
    return (event.metaKey || event.ctrlKey)
        && !event.altKey
        && event.key.toLowerCase() === 's';
}

function isEventInsideHwpEditor(event: Event, container: HTMLElement | null): boolean {
    if (!container) return false;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    if (path.includes(container)) return true;
    return event.target instanceof Node && container.contains(event.target);
}

function isEditingKey(event: KeyboardEvent): boolean {
    if (isSaveShortcut(event)) return false;
    if (event.metaKey || event.ctrlKey || event.altKey) return false;
    if (event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Enter') return true;
    return event.key.length === 1;
}
