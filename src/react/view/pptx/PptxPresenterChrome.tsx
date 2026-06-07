import { Button } from 'antd';
import type { PptxViewer } from '@aiden0z/pptx-renderer';
import { SlideThumbnail } from './SlideThumbnail.tsx';
import type { PptxSlideMetadata } from './pptxMetadata.ts';

type PptxPresenterChromeProps = {
    viewer: PptxViewer | null;
    viewerReady: boolean;
    slides: PptxSlideMetadata[];
    currentSlide: number;
    slideCount: number;
    activeNotes: string[];
    nextSlide: PptxSlideMetadata | null;
    renderVersion: number;
    statusSlideLabel: string;
    onEnd: () => void;
    onPrevious: () => void;
    onNext: () => void;
    onSelectSlide: (index: number) => void;
};

export function PptxPresenterChrome({
    viewer,
    viewerReady,
    slides,
    currentSlide,
    slideCount,
    activeNotes,
    nextSlide,
    renderVersion,
    statusSlideLabel,
    onEnd,
    onPrevious,
    onNext,
    onSelectSlide,
}: PptxPresenterChromeProps) {
    return (
        <>
            <div className="pptx-viewer__presenter-banner">
                <div className="pptx-viewer__presenter-actions">
                    <Button size="small" onClick={onEnd}>End Show</Button>
                    <span>Presenter</span>
                </div>
                <strong>{statusSlideLabel}</strong>
                <span>{new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            </div>
            <div className="pptx-viewer__presenter-current-controls" aria-label="Presenter current slide controls">
                <Button size="large" disabled={currentSlide <= 0} onClick={onPrevious} aria-label="Previous slide">
                    ‹
                </Button>
                <span>Slide {currentSlide + 1} of {slideCount}</span>
                <Button size="large" disabled={currentSlide >= slideCount - 1} onClick={onNext} aria-label="Next slide">
                    ›
                </Button>
            </div>
            <aside className="pptx-viewer__presenter-side" aria-label="Presenter notes and next slide">
                <section className="pptx-viewer__presenter-next">
                    <div className="pptx-viewer__presenter-heading">Next slide</div>
                    {nextSlide ? (
                        <SlideThumbnail
                            viewer={viewerReady ? viewer : null}
                            index={nextSlide.index}
                            title={nextSlide.title}
                            active={false}
                            renderVersion={renderVersion}
                            onSelect={onSelectSlide}
                        />
                    ) : (
                        <div className="pptx-viewer__empty-panel">End of presentation</div>
                    )}
                </section>
                <section className="pptx-viewer__presenter-notes">
                    <div className="pptx-viewer__presenter-heading">Notes / Comments</div>
                    {activeNotes.length > 0 ? (
                        <div className="pptx-viewer__notes-body">
                            {activeNotes.map((line, index) => (
                                <p key={`presenter-${index}-${line}`}>{line}</p>
                            ))}
                        </div>
                    ) : (
                        <div className="pptx-viewer__empty-panel">No speaker notes for this slide.</div>
                    )}
                </section>
            </aside>
            <div className="pptx-viewer__presenter-filmstrip" aria-label="Presenter slide filmstrip">
                {slides.map(slide => (
                    <SlideThumbnail
                        key={`presenter-filmstrip-${slide.index}`}
                        viewer={viewerReady ? viewer : null}
                        index={slide.index}
                        title={slide.title}
                        active={slide.index === currentSlide}
                        renderVersion={renderVersion}
                        onSelect={onSelectSlide}
                    />
                ))}
            </div>
        </>
    );
}
