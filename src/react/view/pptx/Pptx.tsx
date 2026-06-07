import { Alert, Button, Segmented, Spin, Splitter } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PptxViewer, RECOMMENDED_ZIP_LIMITS } from '@aiden0z/pptx-renderer';
import { handler } from '../../util/vscode.ts';
import { SlideThumbnail } from './SlideThumbnail.tsx';
import { loadPptxMetadata, type PptxSlideMetadata } from './pptxMetadata.ts';
import './Pptx.less';

/**
 * PPTX Viewer
 *
 * View-only PowerPoint-like layout:
 *   - left visual thumbnail pane
 *   - center current-slide preview
 *   - bottom speaker notes pane
 */

export default function Pptx() {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<PptxViewer | null>(null);

    const [loading, setLoading] = useState(true);
    const [viewerReady, setViewerReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState('');
    const [slideCount, setSlideCount] = useState(0);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [zoom, setZoom] = useState(100);
    const [slides, setSlides] = useState<PptxSlideMetadata[]>([]);
    const [thumbnailRenderVersion, setThumbnailRenderVersion] = useState(0);

    const disposeViewer = useCallback(() => {
        if (!viewerRef.current) return;
        try { viewerRef.current.destroy(); } catch { /* ignore */ }
        viewerRef.current = null;
        setViewerReady(false);
    }, []);

    const applyZoom = useCallback(async (newZoom: number) => {
        setZoom(newZoom);
        if (!viewerRef.current) return;
        try { await viewerRef.current.setZoom(newZoom); } catch { /* ignore */ }
    }, []);

    const goToSlide = useCallback(async (index: number) => {
        if (index < 0 || index >= slideCount) return;
        setCurrentSlide(index);
        if (!viewerRef.current) return;
        try { await viewerRef.current.renderSlide(index); } catch { /* ignore */ }
    }, [slideCount]);

    useEffect(() => {
        handler.on('pptxOpen', async ({ path, name }: { path: string; name?: string }) => {
            setLoading(true);
            setViewerReady(false);
            setError(null);
            setFileName(name || '');
            setSlideCount(0);
            setCurrentSlide(0);
            setSlides([]);
            disposeViewer();

            try {
                const response = await fetch(path);
                const buffer = await response.arrayBuffer();
                let metadata: PptxSlideMetadata[] = [];
                try {
                    metadata = await loadPptxMetadata(buffer);
                } catch (metadataError) {
                    console.warn('[PptxViewer] metadata extraction failed', metadataError);
                }

                if (!containerRef.current) {
                    throw new Error('Container element not available');
                }

                containerRef.current.innerHTML = '';

                const viewer = await PptxViewer.open(buffer, containerRef.current, {
                    renderMode: 'slide',
                    zipLimits: RECOMMENDED_ZIP_LIMITS,
                    fitMode: 'contain',
                    onSlideChange: (index: number) => setCurrentSlide(index),
                    onRenderComplete: () => setLoading(false),
                });

                viewerRef.current = viewer;
                const count = viewer.slideCount;
                setSlideCount(count);
                setSlides(normalizeSlides(metadata, count));
                setViewerReady(true);
                setThumbnailRenderVersion(version => version + 1);

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

        handler.on('pptxData', () => { /* ignored — use pptxOpen */ });
        handler.emit('init');

        return () => { disposeViewer(); };
    }, [disposeViewer]);

    const activeSlide = slides[currentSlide];
    const activeNotes = activeSlide?.notes || [];

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
                    <h1>{fileName || 'Presentation'}</h1>
                    {slideCount > 0 && (
                        <p>
                            {slideCount} slide{slideCount !== 1 ? 's' : ''}
                            {currentSlide >= 0 ? ` - Slide ${currentSlide + 1}` : ''}
                        </p>
                    )}
                </div>
                <div className="pptx-viewer__controls">
                    <Button size="small" disabled={currentSlide <= 0} onClick={() => goToSlide(currentSlide - 1)}>◀</Button>
                    <span className="pptx-viewer__zoom-value">{currentSlide + 1}/{slideCount || '?'}</span>
                    <Button size="small" disabled={currentSlide >= slideCount - 1} onClick={() => goToSlide(currentSlide + 1)}>▶</Button>
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

            <Splitter
                className="pptx-viewer__workspace"
                onResizeEnd={() => setThumbnailRenderVersion(version => version + 1)}
            >
                <Splitter.Panel className="pptx-viewer__sidebar-panel" defaultSize={240} min={144} max={420} collapsible>
                    <aside className="pptx-viewer__sidebar" aria-label="Slides">
                        <div className="pptx-viewer__panel-title">Slides</div>
                        <div className="pptx-viewer__thumb-list">
                            {slides.length > 0 ? slides.map(slide => (
                                <SlideThumbnail
                                    key={slide.index}
                                    viewer={viewerReady ? viewerRef.current : null}
                                    index={slide.index}
                                    title={slide.title}
                                    active={slide.index === currentSlide}
                                    renderVersion={thumbnailRenderVersion}
                                    onSelect={goToSlide}
                                />
                            )) : (
                                <div className="pptx-viewer__empty-panel">Loading slide previews</div>
                            )}
                        </div>
                    </aside>
                </Splitter.Panel>

                <Splitter.Panel className="pptx-viewer__stage-panel" min={320}>
                    <Splitter layout="vertical" className="pptx-viewer__stage-splitter">
                        <Splitter.Panel className="pptx-viewer__preview-panel" min={280}>
                            <section className="pptx-viewer__stage" aria-label="Slide preview">
                                {loading && (
                                    <div className="pptx-viewer__loading">
                                        <Spin size="large" />
                                        <p>Rendering slides...</p>
                                    </div>
                                )}
                                <div
                                    ref={containerRef}
                                    className="pptx-viewer__renderer"
                                    style={{ display: !loading ? 'block' : 'none' }}
                                />
                            </section>
                        </Splitter.Panel>

                        <Splitter.Panel className="pptx-viewer__notes-panel" defaultSize={180} min={56} max="45%" collapsible>
                            <section className="pptx-viewer__notes" aria-label="Speaker notes">
                                <div className="pptx-viewer__notes-header">
                                    <div className="pptx-viewer__panel-title">Speaker notes</div>
                                    <span>Slide {currentSlide + 1}</span>
                                </div>
                                {activeNotes.length > 0 ? (
                                    <div className="pptx-viewer__notes-body">
                                        {activeNotes.map((line, index) => (
                                            <p key={`${index}-${line}`}>{line}</p>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="pptx-viewer__empty-panel">No speaker notes for this slide.</div>
                                )}
                            </section>
                        </Splitter.Panel>
                    </Splitter>
                </Splitter.Panel>
            </Splitter>
        </main>
    );
}

function normalizeSlides(metadata: PptxSlideMetadata[], count: number): PptxSlideMetadata[] {
    return Array.from({ length: count }, (_, index) => {
        return metadata[index] || {
            index,
            title: `Slide ${index + 1}`,
            lines: [],
            notes: [],
        };
    });
}

