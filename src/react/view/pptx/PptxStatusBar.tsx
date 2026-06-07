import { Button, Slider } from 'antd';

type PptxStatusBarProps = {
    statusSlideLabel: string;
    currentSlide: number;
    slideCount: number;
    zoom: number;
    showNotes: boolean;
    sidebarCollapsed: boolean;
    focusMode: boolean;
    presenterMode: boolean;
    gridMode: boolean;
    viewerReady: boolean;
    hasSlides: boolean;
    onPrevious: () => void;
    onNext: () => void;
    onToggleNotes: () => void;
    onToggleSidebar: () => void;
    onToggleGrid: () => void;
    onToggleFocus: () => void;
    onTogglePresenter: () => void;
    onZoom: (zoom: number) => void;
};

export function PptxStatusBar({
    statusSlideLabel,
    currentSlide,
    slideCount,
    zoom,
    showNotes,
    sidebarCollapsed,
    focusMode,
    presenterMode,
    gridMode,
    viewerReady,
    hasSlides,
    onPrevious,
    onNext,
    onToggleNotes,
    onToggleSidebar,
    onToggleGrid,
    onToggleFocus,
    onTogglePresenter,
    onZoom,
}: PptxStatusBarProps) {
    return (
        <footer className="pptx-viewer__statusbar" aria-label="PowerPoint viewer controls">
            <div className="pptx-viewer__status-primary">
                <span className="pptx-viewer__slide-status">{statusSlideLabel}</span>
                <Button size="small" disabled={currentSlide <= 0} onClick={onPrevious} aria-label="Previous slide">‹</Button>
                <Button size="small" disabled={currentSlide >= slideCount - 1} onClick={onNext} aria-label="Next slide">›</Button>
            </div>
            <div className="pptx-viewer__status-actions">
                <Button size="small" onClick={onToggleNotes} aria-label="Toggle speaker notes comments" aria-pressed={showNotes} disabled={focusMode || gridMode || presenterMode}>
                    Notes
                </Button>
                <Button size="small" onClick={onToggleSidebar} aria-label={sidebarCollapsed ? 'Show slide thumbnails' : 'Collapse slide thumbnails'} aria-pressed={!sidebarCollapsed && !focusMode && !presenterMode && !gridMode} disabled={focusMode || presenterMode || gridMode}>
                    Sidebar
                </Button>
                <Button size="small" onClick={onToggleGrid} aria-label="Toggle slide grid navigation" aria-pressed={gridMode} disabled={!viewerReady || !hasSlides || presenterMode}>
                    Grid
                </Button>
                <Button size="small" onClick={onToggleFocus} aria-label="Toggle fullscreen slide view" aria-pressed={focusMode} disabled={!viewerReady || presenterMode}>
                    Fullscreen
                </Button>
                <Button size="small" onClick={onTogglePresenter} aria-label="Toggle presenter view" aria-pressed={presenterMode} disabled={!viewerReady || focusMode}>
                    Presenter
                </Button>
            </div>
            <div className="pptx-viewer__zoom-control" aria-label="Zoom slider">
                <Button size="small" onClick={() => onZoom(Math.max(50, zoom - 10))} aria-label="Zoom out">−</Button>
                <Slider
                    className="pptx-viewer__zoom-slider"
                    min={50}
                    max={300}
                    step={10}
                    value={zoom}
                    tooltip={{ formatter: value => `${value}%` }}
                    onChange={value => onZoom(Number(value))}
                />
                <span className="pptx-viewer__zoom-value">{zoom}%</span>
                <Button size="small" onClick={() => onZoom(Math.min(300, zoom + 10))} aria-label="Zoom in">+</Button>
            </div>
        </footer>
    );
}
