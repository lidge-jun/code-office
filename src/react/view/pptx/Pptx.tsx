import { Alert, Button, Segmented, Spin } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PptxViewer, RECOMMENDED_ZIP_LIMITS } from '@aiden0z/pptx-renderer';
import { handler } from '../../util/vscode.ts';
import './Pptx.less';

/**
 * PPTX Viewer — high-fidelity rendering via @aiden0z/pptx-renderer.
 *
 * Replaces the old cheerio-based text-only extraction with full HTML/SVG
 * slide rendering (shapes, SmartArt, charts, tables, gradients).
 *
 * Communication with extension host:
 *   Extension → WebView:
 *     "pptxOpen" → { path: string }   (WebView-accessible URI for the .pptx file)
 *
 *   WebView → Extension:
 *     "init"    → signals ready
 */

export default function Pptx() {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState('');
    const [slideCount, setSlideCount] = useState(0);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [zoom, setZoom] = useState(100);

    const destroyViewer = useCallback(() => {
        if (viewerRef.current) {
            try { viewerRef.current.destroy(); } catch { /* ignore */ }
            viewerRef.current = null;
        }
    }, []);

    const applyZoom = useCallback(async (newZoom: number) => {
        setZoom(newZoom);
        if (viewerRef.current) {
            try {
                await viewerRef.current.setZoom(newZoom);
            } catch { /* ignore if not supported */ }
        }
    }, []);

    useEffect(() => {
        handler.on('pptxOpen', async ({ path, name }: { path: string; name?: string }) => {
            setLoading(true);
            setError(null);
            setFileName(name || '');
            destroyViewer();

            try {
                const response = await fetch(path);
                const buffer = await response.arrayBuffer();

                if (!containerRef.current) {
                    throw new Error('Container element not available');
                }

                // Clear previous content
                containerRef.current.innerHTML = '';

                const viewer = await PptxViewer.open(buffer, containerRef.current, {
                    zipLimits: RECOMMENDED_ZIP_LIMITS,
                    fitMode: 'contain',
                    listOptions: { windowed: true, batchSize: 8 },
                    onSlideChange: (index: number) => {
                        setCurrentSlide(index);
                    },
                    onRenderComplete: () => {
                        setLoading(false);
                    },
                });

                viewerRef.current = viewer;

                // Get slide count from the viewer's presentation model
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

        // Legacy fallback: support old pptxData event for backward compatibility
        handler.on('pptxData', () => {
            // Old cheerio-based handler sent parsed data — we ignore it now
            // and wait for pptxOpen with the file path instead
        });

        handler.emit('init');

        return () => {
            destroyViewer();
        };
    }, [destroyViewer]);

    const goToSlide = useCallback(async (index: number) => {
        if (!viewerRef.current) return;
        try {
            await viewerRef.current.goToSlide(index);
            setCurrentSlide(index);
        } catch { /* ignore */ }
    }, []);

    if (error && !loading) {
        return (
            <main className="pptx-viewer">
                <Alert
                    type="error"
                    message="Unable to preview presentation"
                    description={error}
                    showIcon
                />
            </main>
        );
    }

    return (
        <main className="pptx-viewer">
            <header className="pptx-viewer__header">
                <div>
                    <h1>{fileName || 'Presentation'}</h1>
                    {slideCount > 0 && (
                        <p>
                            {slideCount} slide{slideCount !== 1 ? 's' : ''}
                            {currentSlide >= 0 ? ` — Slide ${currentSlide + 1}` : ''}
                        </p>
                    )}
                </div>
                <div className="pptx-viewer__controls">
                    <Button
                        size="small"
                        disabled={currentSlide <= 0}
                        onClick={() => goToSlide(currentSlide - 1)}
                    >
                        ◀
                    </Button>
                    <span className="pptx-viewer__zoom-value">
                        {currentSlide + 1}/{slideCount || '?'}
                    </span>
                    <Button
                        size="small"
                        disabled={currentSlide >= slideCount - 1}
                        onClick={() => goToSlide(currentSlide + 1)}
                    >
                        ▶
                    </Button>

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
                </div>
            </header>

            {loading && (
                <div className="pptx-viewer__loading">
                    <Spin size="large" />
                    <p>Rendering slides…</p>
                </div>
            )}

            <div
                ref={containerRef}
                className="pptx-viewer__renderer"
                style={{ display: loading ? 'none' : 'block' }}
            />
        </main>
    );
}
