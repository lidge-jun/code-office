import { useEffect, useRef, useState } from 'react';
import type { PptxViewer, SlideHandle } from '@aiden0z/pptx-renderer';

type SlideThumbnailProps = {
    viewer: PptxViewer | null;
    index: number;
    title: string;
    active: boolean;
    renderVersion: number;
    onSelect: (index: number) => void;
};

export function SlideThumbnail({
    viewer,
    index,
    title,
    active,
    renderVersion,
    onSelect,
}: SlideThumbnailProps) {
    const hostRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<SlideHandle | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

    useEffect(() => {
        const host = hostRef.current;
        if (!viewer || !host) return;

        let cancelled = false;
        let frame: number | null = null;
        let lastRenderSize = '';

        const render = () => {
            frame = null;
            if (cancelled) return;
            const width = Math.max(80, host.clientWidth - 12);
            const height = Math.max(45, host.clientHeight - 12);
            const renderSize = `${Math.round(width)}x${Math.round(height)}`;
            if (renderSize === lastRenderSize && handleRef.current) return;

            lastRenderSize = renderSize;
            setStatus('loading');
            handleRef.current?.dispose();
            handleRef.current = null;
            host.innerHTML = '';

            const scaleX = viewer.slideWidth > 0 ? width / viewer.slideWidth : 0.12;
            const scaleY = viewer.slideHeight > 0 ? height / viewer.slideHeight : scaleX;
            const scale = Math.min(scaleX, scaleY);
            const mount = document.createElement('div');
            mount.className = 'pptx-viewer__thumb-mount';
            mount.style.width = `${viewer.slideWidth * scale}px`;
            mount.style.height = `${viewer.slideHeight * scale}px`;
            host.appendChild(mount);

            const handle = viewer.renderSlideToContainer(index, mount, scale);
            handleRef.current = handle;
            if (!handle) {
                setStatus('error');
                return;
            }
            void handle.ready.then(
                () => { if (!cancelled) setStatus('ready'); },
                () => { if (!cancelled) setStatus('error'); },
            );
        };

        const scheduleRender = () => {
            if (frame !== null) {
                window.cancelAnimationFrame(frame);
            }
            frame = window.requestAnimationFrame(render);
        };

        scheduleRender();
        const resizeObserver = new ResizeObserver(scheduleRender);
        resizeObserver.observe(host);

        return () => {
            cancelled = true;
            resizeObserver.disconnect();
            if (frame !== null) {
                window.cancelAnimationFrame(frame);
            }
            handleRef.current?.dispose();
            handleRef.current = null;
            host.innerHTML = '';
        };
    }, [viewer, index, renderVersion]);

    return (
        <button
            type="button"
            className={`pptx-viewer__thumb-item${active ? ' is-active' : ''}`}
            onClick={() => onSelect(index)}
            aria-label={`Slide ${index + 1}: ${title}`}
        >
            <span className="pptx-viewer__thumb-number">{index + 1}</span>
            <span className="pptx-viewer__thumb-frame">
                <span ref={hostRef} className="pptx-viewer__thumb-host" aria-hidden="true" />
                {status !== 'ready' && (
                    <span className="pptx-viewer__thumb-state">
                        {status === 'error' ? 'Preview unavailable' : 'Rendering preview'}
                    </span>
                )}
            </span>
            <span className="pptx-viewer__thumb-title">{title}</span>
        </button>
    );
}
