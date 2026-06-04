import { Alert, Button, Segmented, Spin } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PptxViewer, RECOMMENDED_ZIP_LIMITS } from '@aiden0z/pptx-renderer';
import { PptxRenderer as PptxSvgRenderer } from 'pptx-svg';
import { handler } from '../../util/vscode.ts';
import './Pptx.less';

/**
 * PPTX Viewer + Editor
 *
 * Two rendering modes:
 *   1. VIEW mode: @aiden0z/pptx-renderer for high-fidelity HTML/SVG DOM
 *   2. EDIT mode: pptx-svg (WASM) for interactive SVG editing + round-trip export
 *
 * Communication with extension host:
 *   Extension → WebView:
 *     "pptxOpen"        → { path, name }  (file URI for fetch)
 *     "pptxSaveRequest" → { requestId }   (host requests save)
 *
 *   WebView → Extension:
 *     "init"              → ready
 *     "pptxDirtyChanged"  → { isDirty }
 *     "pptxSaveResponse"  → { requestId, success, bytes?, error? }
 */

type ViewMode = 'view' | 'edit';

export default function Pptx() {
    const containerRef = useRef<HTMLDivElement>(null);
    const editContainerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);
    const svgRendererRef = useRef<PptxSvgRenderer | null>(null);
    const pptxBufferRef = useRef<ArrayBuffer | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState('');
    const [slideCount, setSlideCount] = useState(0);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [zoom, setZoom] = useState(100);
    const [mode, setMode] = useState<ViewMode>('view');
    const [isDirty, setIsDirty] = useState(false);

    const destroyViewer = useCallback(() => {
        if (viewerRef.current) {
            try { viewerRef.current.destroy(); } catch { /* ignore */ }
            viewerRef.current = null;
        }
    }, []);

    const applyZoom = useCallback(async (newZoom: number) => {
        setZoom(newZoom);
        if (viewerRef.current && mode === 'view') {
            try { await viewerRef.current.setZoom(newZoom); } catch { /* ignore */ }
        }
    }, [mode]);

    // Render a slide in edit mode using pptx-svg
    const renderEditSlide = useCallback((slideIndex: number) => {
        const renderer = svgRendererRef.current;
        const container = editContainerRef.current;
        if (!renderer || !container) return;

        try {
            const svgString = renderer.renderSlideSvg(slideIndex);
            container.innerHTML = svgString;

            // Make shapes interactive — click to select
            const svgEl = container.querySelector('svg');
            if (svgEl) {
                svgEl.style.width = '100%';
                svgEl.style.height = 'auto';
                svgEl.style.cursor = 'default';
            }
        } catch (e) {
            console.error('[PptxSvgRenderer] renderSlideSvg failed:', e);
        }
    }, []);

    // Initialize pptx-svg renderer for editing
    const initEditMode = useCallback(async () => {
        const buffer = pptxBufferRef.current;
        if (!buffer) return;

        setLoading(true);
        try {
            if (!svgRendererRef.current) {
                const renderer = new PptxSvgRenderer();
                await renderer.init(); // WASM auto-loaded in browser
                svgRendererRef.current = renderer;
            }

            await svgRendererRef.current.loadPptx(buffer);
            const count = svgRendererRef.current.getSlideCount();
            setSlideCount(count);
            renderEditSlide(currentSlide);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(`Failed to initialize editor: ${msg}`);
            console.error('[PptxSvgRenderer]', e);
        } finally {
            setLoading(false);
        }
    }, [currentSlide, renderEditSlide]);

    // Switch between view and edit modes
    const switchMode = useCallback(async (newMode: ViewMode) => {
        if (newMode === mode) return;
        setMode(newMode);

        if (newMode === 'edit') {
            destroyViewer(); // Clean up pptx-renderer DOM
            await initEditMode();
        } else {
            // Re-render in view mode using pptx-renderer
            const buffer = pptxBufferRef.current;
            if (!buffer || !containerRef.current) return;

            setLoading(true);
            try {
                containerRef.current.innerHTML = '';
                const viewer = await PptxViewer.open(buffer, containerRef.current, {
                    zipLimits: RECOMMENDED_ZIP_LIMITS,
                    fitMode: 'contain',
                    listOptions: { windowed: true, batchSize: 8 },
                    onSlideChange: (index: number) => setCurrentSlide(index),
                    onRenderComplete: () => setLoading(false),
                });
                viewerRef.current = viewer;
            } catch (e) {
                setError(`Failed to switch to view mode: ${e instanceof Error ? e.message : String(e)}`);
            } finally {
                setLoading(false);
            }
        }
    }, [mode, destroyViewer, initEditMode]);

    // Save handler: export modified PPTX via pptx-svg
    const handleSave = useCallback(async (requestId: string) => {
        try {
            const renderer = svgRendererRef.current;
            if (!renderer) {
                throw new Error('SVG renderer not initialized. Switch to Edit mode first.');
            }

            const exported = await renderer.exportPptx();
            const bytes = Array.from(new Uint8Array(exported));

            handler.emit('pptxSaveResponse', {
                requestId,
                success: true,
                bytes,
            });

            // Update the cached buffer with the exported version
            pptxBufferRef.current = exported;
            setIsDirty(false);
            handler.emit('pptxDirtyChanged', { isDirty: false });
        } catch (e) {
            handler.emit('pptxSaveResponse', {
                requestId,
                success: false,
                error: e instanceof Error ? e.message : String(e),
            });
        }
    }, []);

    useEffect(() => {
        handler.on('pptxOpen', async ({ path, name }: { path: string; name?: string }) => {
            setLoading(true);
            setError(null);
            setFileName(name || '');
            setMode('view');
            setIsDirty(false);
            destroyViewer();

            try {
                const response = await fetch(path);
                const buffer = await response.arrayBuffer();
                pptxBufferRef.current = buffer;

                if (!containerRef.current) {
                    throw new Error('Container element not available');
                }

                containerRef.current.innerHTML = '';

                const viewer = await PptxViewer.open(buffer, containerRef.current, {
                    zipLimits: RECOMMENDED_ZIP_LIMITS,
                    fitMode: 'contain',
                    listOptions: { windowed: true, batchSize: 8 },
                    onSlideChange: (index: number) => setCurrentSlide(index),
                    onRenderComplete: () => setLoading(false),
                });

                viewerRef.current = viewer;
                const count = viewer.presentation?.slides?.length ?? 0;
                setSlideCount(count);

                if (count === 0) {
                    setError('No slides found in this presentation.');
                }
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                setError(`Failed to render presentation: ${message}`);
                console.error('[PptxViewer]', e);
            } finally {
                setLoading(false);
            }
        });

        // Legacy fallback
        handler.on('pptxData', () => { /* ignored — use pptxOpen */ });

        // Save request from extension host
        handler.on('pptxSaveRequest', ({ requestId }: { requestId: string }) => {
            handleSave(requestId);
        });

        handler.emit('init');

        return () => { destroyViewer(); };
    }, [destroyViewer, handleSave]);

    // Navigate to slide in edit mode
    const goToSlide = useCallback(async (index: number) => {
        if (index < 0 || index >= slideCount) return;
        setCurrentSlide(index);

        if (mode === 'view' && viewerRef.current) {
            try { await viewerRef.current.goToSlide(index); } catch { /* */ }
        } else if (mode === 'edit') {
            renderEditSlide(index);
        }
    }, [mode, slideCount, renderEditSlide]);

    if (error && !loading) {
        return (
            <main className="pptx-viewer">
                <Alert type="error" message="Unable to preview presentation" description={error} showIcon />
            </main>
        );
    }

    return (
        <main className="pptx-viewer">
            <header className="pptx-viewer__header">
                <div>
                    <h1>{fileName || 'Presentation'}{isDirty ? ' •' : ''}</h1>
                    {slideCount > 0 && (
                        <p>
                            {slideCount} slide{slideCount !== 1 ? 's' : ''}
                            {currentSlide >= 0 ? ` — Slide ${currentSlide + 1}` : ''}
                            {mode === 'edit' ? ' (Editing)' : ''}
                        </p>
                    )}
                </div>
                <div className="pptx-viewer__controls">
                    {/* Mode toggle */}
                    <Segmented
                        size="small"
                        value={mode}
                        options={[
                            { label: '👁 View', value: 'view' },
                            { label: '✏️ Edit', value: 'edit' },
                        ]}
                        onChange={value => switchMode(value as ViewMode)}
                    />

                    {/* Navigation */}
                    <Button size="small" disabled={currentSlide <= 0} onClick={() => goToSlide(currentSlide - 1)}>◀</Button>
                    <span className="pptx-viewer__zoom-value">{currentSlide + 1}/{slideCount || '?'}</span>
                    <Button size="small" disabled={currentSlide >= slideCount - 1} onClick={() => goToSlide(currentSlide + 1)}>▶</Button>

                    {/* Zoom (view mode only) */}
                    {mode === 'view' && (
                        <>
                            <Button size="small" onClick={() => applyZoom(Math.max(50, zoom - 10))}>−</Button>
                            <Segmented
                                size="small"
                                value={zoom}
                                options={[
                                    { label: '75%', value: 75 },
                                    { label: '100%', value: 100 },
                                    { label: '150%', value: 150 },
                                ]}
                                onChange={value => applyZoom(Number(value))}
                            />
                            <Button size="small" onClick={() => applyZoom(Math.min(300, zoom + 10))}>+</Button>
                        </>
                    )}
                </div>
            </header>

            {loading && (
                <div className="pptx-viewer__loading">
                    <Spin size="large" />
                    <p>{mode === 'edit' ? 'Initializing editor…' : 'Rendering slides…'}</p>
                </div>
            )}

            {/* View mode: pptx-renderer */}
            <div
                ref={containerRef}
                className="pptx-viewer__renderer"
                style={{ display: mode === 'view' && !loading ? 'block' : 'none' }}
            />

            {/* Edit mode: pptx-svg */}
            <div
                ref={editContainerRef}
                className="pptx-viewer__editor"
                style={{ display: mode === 'edit' && !loading ? 'block' : 'none' }}
            />
        </main>
    );
}
