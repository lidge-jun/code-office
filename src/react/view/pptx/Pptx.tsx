import { Alert, Button, Spin, Splitter } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PptxViewer, RECOMMENDED_ZIP_LIMITS } from '@aiden0z/pptx-renderer';
import { handler } from '../../util/vscode.ts';
import { PptxPresenterChrome } from './PptxPresenterChrome.tsx';
import { PptxStatusBar } from './PptxStatusBar.tsx';
import { SlideThumbnail } from './SlideThumbnail.tsx';
import { loadPptxMetadata, type PptxSlideMetadata } from './pptxMetadata.ts';
import './Pptx.less';
import './PptxPresenter.less';

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
    const [sidebarSize, setSidebarSize] = useState(240);
    const [lastSidebarSize, setLastSidebarSize] = useState(240);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [notesSize, setNotesSize] = useState(180);
    const [lastNotesSize, setLastNotesSize] = useState(180);
    const [notesVisible, setNotesVisible] = useState(true);
    const [gridMode, setGridMode] = useState(false);
    const [focusMode, setFocusMode] = useState(false);
    const [presenterMode, setPresenterMode] = useState(false);

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

    const collapseSidebar = useCallback(() => {
        setLastSidebarSize(Math.max(144, sidebarSize));
        setSidebarCollapsed(true);
        setThumbnailRenderVersion(version => version + 1);
    }, [sidebarSize]);

    const restoreSidebar = useCallback(() => {
        setSidebarCollapsed(false);
        setSidebarSize(Math.max(144, lastSidebarSize));
        setThumbnailRenderVersion(version => version + 1);
    }, [lastSidebarSize]);

    const toggleSidebar = useCallback(() => {
        if (sidebarCollapsed) {
            restoreSidebar();
        } else {
            collapseSidebar();
        }
    }, [collapseSidebar, restoreSidebar, sidebarCollapsed]);

    const toggleNotes = useCallback(() => {
        if (notesVisible) {
            setLastNotesSize(Math.max(56, notesSize));
            setNotesVisible(false);
        } else {
            setNotesVisible(true);
            setNotesSize(Math.max(56, lastNotesSize));
        }
    }, [lastNotesSize, notesSize, notesVisible]);

    const openGrid = useCallback(() => {
        setGridMode(true);
        setFocusMode(false);
        setPresenterMode(false);
        setThumbnailRenderVersion(version => version + 1);
    }, []);

    const toggleFocusMode = useCallback(() => {
        setFocusMode(value => {
            const next = !value;
            if (next) {
                setGridMode(false);
                setPresenterMode(false);
            }
            return next;
        });
    }, []);

    const togglePresenterMode = useCallback(() => {
        setPresenterMode(value => {
            const next = !value;
            if (next) {
                setGridMode(false);
                setFocusMode(false);
                setNotesVisible(true);
            }
            return next;
        });
    }, []);

    useEffect(() => {
        handler.on('pptxOpen', async ({ path, name }: { path: string; name?: string }) => {
            setLoading(true);
            setViewerReady(false);
            setError(null);
            setFileName(name || '');
            setSlideCount(0);
            setCurrentSlide(0);
            setSlides([]);
            setGridMode(false);
            setFocusMode(false);
            setPresenterMode(false);
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

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isTextInput = target?.closest('input, textarea, [contenteditable="true"]');
            if (isTextInput) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                if (gridMode) {
                    setGridMode(false);
                    return;
                }
                if (focusMode) {
                    setFocusMode(false);
                    return;
                }
                if (presenterMode) {
                    setPresenterMode(false);
                }
                return;
            }

            if (!focusMode && !presenterMode) return;

            if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
                event.preventDefault();
                void goToSlide(Math.min(slideCount - 1, currentSlide + 1));
                return;
            }

            if (event.key === 'ArrowLeft' || event.key === 'PageUp' || event.key === 'Backspace') {
                event.preventDefault();
                void goToSlide(Math.max(0, currentSlide - 1));
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [currentSlide, focusMode, goToSlide, gridMode, presenterMode, slideCount]);

    useEffect(() => {
        if (!viewerReady || !viewerRef.current) return;
        const frame = window.requestAnimationFrame(() => {
            void viewerRef.current?.renderSlide(currentSlide);
        });
        return () => window.cancelAnimationFrame(frame);
    }, [focusMode, presenterMode, currentSlide, viewerReady]);

    const activeSlide = slides[currentSlide];
    const nextSlide = currentSlide + 1 < slideCount ? slides[currentSlide + 1] : null;
    const activeNotes = activeSlide?.notes || [];
    const hideSidebar = sidebarCollapsed || focusMode || presenterMode || gridMode;
    const showNotes = notesVisible && !focusMode && !gridMode && !presenterMode;
    const sidebarPanelSize = hideSidebar ? 0 : sidebarSize;
    const notesPanelSize = showNotes ? notesSize : 0;
    const statusSlideLabel = slideCount > 0
        ? `Slide ${currentSlide + 1} of ${slideCount} slides`
        : 'Slide 0 of 0 slides';

    if (error && !loading) {
        return (
            <main className="pptx-viewer">
                <Alert type="error" message="Unable to preview presentation" description={error} showIcon />
            </main>
        );
    }

    return (
        <main className={`pptx-viewer${focusMode ? ' is-focus-mode' : ''}${presenterMode ? ' is-presenter-mode' : ''}${gridMode ? ' is-grid-mode' : ''}`}>
            {!focusMode && !presenterMode && (
            <header className="pptx-viewer__header">
                <div>
                    <h1>{fileName || 'Presentation'}</h1>
                    {slideCount > 0 && (
                        <p>{statusSlideLabel}</p>
                    )}
                </div>
            </header>
            )}

            <Splitter
                className="pptx-viewer__workspace"
                onResize={sizes => {
                    const nextSidebarSize = sizes[0] ?? sidebarSize;
                    setSidebarSize(nextSidebarSize);
                    if (nextSidebarSize > 0) {
                        setLastSidebarSize(nextSidebarSize);
                        setSidebarCollapsed(false);
                    }
                }}
                onResizeEnd={() => setThumbnailRenderVersion(version => version + 1)}
                onCollapse={(collapsed, sizes) => {
                    setSidebarCollapsed(collapsed[0] ?? false);
                    const nextSidebarSize = sizes[0] ?? sidebarSize;
                    if (nextSidebarSize > 0) setLastSidebarSize(nextSidebarSize);
                    setThumbnailRenderVersion(version => version + 1);
                }}
            >
                <Splitter.Panel
                    className="pptx-viewer__sidebar-panel"
                    size={sidebarPanelSize}
                    min={hideSidebar ? 0 : 144}
                    max={420}
                    resizable={!hideSidebar}
                    collapsible={{ end: true, showCollapsibleIcon: false }}
                >
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
                        <div className="pptx-viewer__sidebar-footer">
                            <Button size="small" block onClick={collapseSidebar} aria-label="Collapse slide thumbnails">
                                ‹ Hide
                            </Button>
                        </div>
                    </aside>
                </Splitter.Panel>

                <Splitter.Panel className="pptx-viewer__stage-panel" min={320}>
                    {hideSidebar && !focusMode && !presenterMode && !gridMode && (
                        <button
                            type="button"
                            className="pptx-viewer__sidebar-restore"
                            onClick={restoreSidebar}
                            aria-label="Show slide thumbnails"
                        >
                            › Slides
                        </button>
                    )}
                    <Splitter
                        layout="vertical"
                        className="pptx-viewer__stage-splitter"
                        onResize={sizes => {
                            const nextNotesSize = sizes[1] ?? notesSize;
                            if (nextNotesSize > 0) {
                                setNotesSize(nextNotesSize);
                                setLastNotesSize(nextNotesSize);
                                setNotesVisible(true);
                            }
                        }}
                        onCollapse={(collapsed, sizes) => {
                            const nextCollapsed = collapsed[1] ?? false;
                            setNotesVisible(!nextCollapsed);
                            const nextNotesSize = sizes[1] ?? notesSize;
                            if (nextNotesSize > 0) setLastNotesSize(nextNotesSize);
                        }}
                    >
                        <Splitter.Panel className="pptx-viewer__preview-panel" min={280}>
                            <section className="pptx-viewer__stage" aria-label="Slide preview">
                                {focusMode && (
                                    <Button
                                        size="small"
                                        className="pptx-viewer__focus-exit"
                                        onClick={toggleFocusMode}
                                        aria-label="Exit fullscreen slide view"
                                    >
                                        Exit Fullscreen
                                    </Button>
                                )}
                                {loading && (
                                    <div className="pptx-viewer__loading">
                                        <Spin size="large" />
                                        <p>Rendering slides...</p>
                                    </div>
                                )}
                                <div
                                    ref={containerRef}
                                    className="pptx-viewer__renderer"
                                    style={{ display: !loading && !gridMode ? 'block' : 'none' }}
                                />
                                {presenterMode && (
                                    <PptxPresenterChrome
                                        viewer={viewerRef.current}
                                        viewerReady={viewerReady}
                                        slides={slides}
                                        currentSlide={currentSlide}
                                        slideCount={slideCount}
                                        activeNotes={activeNotes}
                                        nextSlide={nextSlide}
                                        renderVersion={thumbnailRenderVersion}
                                        statusSlideLabel={statusSlideLabel}
                                        onEnd={togglePresenterMode}
                                        onPrevious={() => goToSlide(currentSlide - 1)}
                                        onNext={() => goToSlide(currentSlide + 1)}
                                        onSelectSlide={goToSlide}
                                    />
                                )}
                                {gridMode && (
                                    <section className="pptx-viewer__grid" aria-label="Slide grid navigation">
                                        <div className="pptx-viewer__grid-header">
                                            <strong>Slide grid</strong>
                                            <Button size="small" onClick={() => setGridMode(false)}>Close Grid</Button>
                                        </div>
                                        <div className="pptx-viewer__grid-list">
                                            {slides.map(slide => (
                                                <SlideThumbnail
                                                    key={`grid-${slide.index}`}
                                                    viewer={viewerReady ? viewerRef.current : null}
                                                    index={slide.index}
                                                    title={slide.title}
                                                    active={slide.index === currentSlide}
                                                    renderVersion={thumbnailRenderVersion}
                                                    onSelect={index => {
                                                        void goToSlide(index);
                                                        setGridMode(false);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </section>
                        </Splitter.Panel>

                        <Splitter.Panel
                            className="pptx-viewer__notes-panel"
                            size={notesPanelSize}
                            min={showNotes ? 56 : 0}
                            max="45%"
                            resizable={showNotes}
                            collapsible={{ start: true, showCollapsibleIcon: false }}
                        >
                            <section className="pptx-viewer__notes" aria-label="Speaker notes">
                                <div className="pptx-viewer__notes-header">
                                    <div className="pptx-viewer__panel-title">Notes / Comments</div>
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
            <PptxStatusBar
                statusSlideLabel={statusSlideLabel}
                currentSlide={currentSlide}
                slideCount={slideCount}
                zoom={zoom}
                showNotes={showNotes}
                sidebarCollapsed={sidebarCollapsed}
                focusMode={focusMode}
                presenterMode={presenterMode}
                gridMode={gridMode}
                viewerReady={viewerReady}
                hasSlides={slides.length > 0}
                onPrevious={() => goToSlide(currentSlide - 1)}
                onNext={() => goToSlide(currentSlide + 1)}
                onToggleNotes={toggleNotes}
                onToggleSidebar={toggleSidebar}
                onToggleGrid={gridMode ? () => setGridMode(false) : openGrid}
                onToggleFocus={toggleFocusMode}
                onTogglePresenter={togglePresenterMode}
                onZoom={applyZoom}
            />
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
