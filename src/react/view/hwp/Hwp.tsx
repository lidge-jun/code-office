import { Spin, Alert, Button } from 'antd';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
    HWP_EVENTS,
    type HwpErrorPayload,
    type HwpFileDataPayload,
    type HwpSaveResultPayload,
    type HwpVscodeSaveRequestPayload,
} from '../../../common/hwpMessageSchema';
import { handler } from '../../util/vscode.ts';
import { getConfigs } from '../../util/vscodeConfig.ts';
import { createSecureRhwpEditor } from './rhwpBridge/createSecureRhwpEditor';
import { DEFAULT_RHWP_REQUEST_TIMEOUT_MS, type HwpLoadStatusPayload, type SecureRhwpEditor } from './rhwpBridge/types';
import './Hwp.less';

export default function Hwp() {
    const configs = getConfigs();
    const configuredRhwpStudioHtml = configs?.rhwpStudioHtml;
    const configuredRhwpStudioBaseUrl = configs?.rhwpStudioBaseUrl;
    const configuredRhwpStudioUrl = resolveRhwpStudioUrl(configs?.rhwpStudioUrl);
    const hwpSaveEnabled = configs?.hwpExperimentalSave !== false;
    const editorRef = useRef<SecureRhwpEditor | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dirtyRef = useRef(false);
    const fileNameRef = useRef('');
    const isHwpxRef = useRef(false);
    const [loading, setLoading] = useState(true);
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
        if (!editorRef.current || saving) return;
        setSaving(true);
        setError(null);
        handler.emit(HWP_EVENTS.nativeSave);
    }, [saving]);

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
                const studioHtml = data.studioHtml ?? configuredRhwpStudioHtml;
                const studioBaseUrl = data.studioBaseUrl ?? configuredRhwpStudioBaseUrl;
                const studioUrl = studioHtml ? undefined : configuredRhwpStudioUrl;
                if (!studioHtml && !studioUrl) {
                    setError('HWP editor is not configured: missing local rhwp-studio bundle.');
                    setLoading(false);
                    return;
                }

                const editor = editorRef.current ?? await createSecureRhwpEditor(containerRef.current, {
                    studioUrl,
                    studioHtml,
                    studioBaseUrl,
                    width: '100%',
                    height: '100%',
                    requestTimeoutMs: DEFAULT_RHWP_REQUEST_TIMEOUT_MS,
                    onLoadStatus: handleLoadStatus,
                });
                if (destroyed) { editor.destroy(); return; }
                editorRef.current = editor;

                const binary = new Uint8Array(data.buffer);
                await editor.loadFile(binary, data.fileName);
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

        handler
            .on(HWP_EVENTS.fileData, loadHwpData)
            .on(HWP_EVENTS.reloadFile, loadHwpData)
            .on(HWP_EVENTS.vscodeSave, handleVscodeSave)
            .on(HWP_EVENTS.saveResult, (result: HwpSaveResultPayload) => {
                setSaving(false);
                if (result.success) {
                    setDirtyState(false);
                    const msg = result.convertedFromHwpx
                        ? `Saved as HWP: ${result.savedPath}`
                        : `Saved ${result.format?.toUpperCase() ?? 'document'} successfully`;
                    setSaveMsg(msg);
                    setTimeout(() => setSaveMsg(null), 3000);
                } else {
                    setError(`Save failed: ${result.error}`);
                }
            })
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
    }, [
        configuredRhwpStudioBaseUrl,
        configuredRhwpStudioHtml,
        configuredRhwpStudioUrl,
        exportCurrentDocument,
        setDirtyState,
    ]);

    return (
        <div className="hwp-container">
            {error && <Alert type="error" message={error} closable onClose={() => setError(null)} />}
            {warning && <Alert type="warning" message={warning} closable onClose={() => setWarning(null)} />}
            {saveMsg && <Alert type="success" message={saveMsg} banner />}
            <div className="hwp-toolbar">
                <span className="hwp-filename">{fileName}</span>
                {!hwpSaveEnabled && <span className="hwp-badge">Save disabled by setting</span>}
                {dirty && <span className="hwp-badge hwp-badge-dirty">Unsaved changes</span>}
                {loading && (
                    <span className="hwp-status" role="status" aria-live="polite">
                        <Spin size="small" />
                        Loading HWP
                    </span>
                )}
                {hwpSaveEnabled && (
                    <Button
                        type="primary"
                        size="small"
                        onClick={requestNativeSave}
                        loading={saving}
                    >
                        {isHwpx ? 'Save HWPX' : 'Save HWP'}
                    </Button>
                )}
            </div>
            <div
                ref={containerRef}
                className="hwp-editor"
            />
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
