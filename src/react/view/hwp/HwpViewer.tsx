import { Button, Spin } from 'antd';
import type { RenderedHwpPage } from './hwpTypes';

interface HwpViewerProps {
    fileName: string;
    pages: RenderedHwpPage[];
    loading: boolean;
    onEdit: () => void;
    onExportSvg: () => void;
    onExportPdf: () => void;
    onDebugOverlay: () => void;
    onDumpParagraph: () => void;
}

export function HwpViewer({
    fileName,
    pages,
    loading,
    onEdit,
    onExportSvg,
    onExportPdf,
    onDebugOverlay,
    onDumpParagraph,
}: HwpViewerProps) {
    return (
        <div className="hwp-viewer-shell">
            <div className="hwp-toolbar">
                <span className="hwp-filename">{fileName}</span>
                {loading && (
                    <span className="hwp-status" role="status" aria-live="polite">
                        <Spin size="small" />
                        Rendering Viewer
                    </span>
                )}
                <Button size="small" onClick={onEdit}>Edit</Button>
                <Button size="small" onClick={onExportPdf}>Save PDF</Button>
                <details className="hwp-dev-menu">
                    <summary>Developer</summary>
                    <button type="button" onClick={onExportSvg}>Export SVG</button>
                    <button type="button" onClick={onExportPdf}>Save PDF</button>
                    <button type="button" onClick={onDebugOverlay}>Debug Overlay</button>
                    <button type="button" onClick={onDumpParagraph}>Dump Paragraph</button>
                </details>
            </div>
            <div className="hwp-viewer-pages" aria-label="HWP viewer pages">
                {pages.map((page) => (
                    <article className="hwp-viewer-page" key={page.pageNumber}>
                        <div
                            className="hwp-viewer-svg"
                            dangerouslySetInnerHTML={{ __html: page.svg }}
                        />
                    </article>
                ))}
            </div>
        </div>
    );
}
