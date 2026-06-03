import { Button, Spin } from 'antd';
import { useEffect, useRef } from 'react';
import type { RenderedHwpPage } from './hwpTypes';

interface HwpViewerProps {
    fileName: string;
    pages: RenderedHwpPage[];
    loading: boolean;
    searchOpen: boolean;
    searchQuery: string;
    searchMatchCount: number;
    searchActiveIndex: number;
    searchActivePageNumber?: number;
    onSearchOpenChange: (open: boolean) => void;
    onSearchQueryChange: (query: string) => void;
    onSearchNext: () => void;
    onSearchPrevious: () => void;
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
    searchOpen,
    searchQuery,
    searchMatchCount,
    searchActiveIndex,
    searchActivePageNumber,
    onSearchOpenChange,
    onSearchQueryChange,
    onSearchNext,
    onSearchPrevious,
    onEdit,
    onExportSvg,
    onExportPdf,
    onDebugOverlay,
    onDumpParagraph,
}: HwpViewerProps) {
    const searchInputRef = useRef<HTMLInputElement>(null);
    const pageRefs = useRef(new Map<number, HTMLElement>());

    useEffect(() => {
        if (searchOpen) searchInputRef.current?.focus();
    }, [searchOpen]);

    useEffect(() => {
        if (searchActivePageNumber === undefined) return;
        pageRefs.current.get(searchActivePageNumber)?.scrollIntoView({
            block: 'center',
            behavior: 'smooth',
        });
    }, [searchActivePageNumber]);

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
                {searchOpen && (
                    <div className="hwp-viewer-search">
                        <input
                            ref={searchInputRef}
                            aria-label="Find in HWP viewer"
                            value={searchQuery}
                            onChange={(event) => onSearchQueryChange(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    if (event.shiftKey) onSearchPrevious();
                                    else onSearchNext();
                                } else if (event.key === 'Escape') {
                                    event.preventDefault();
                                    onSearchOpenChange(false);
                                }
                            }}
                        />
                        <span className="hwp-viewer-search-count" aria-live="polite">
                            {searchMatchCount > 0 ? `${searchActiveIndex + 1}/${searchMatchCount}` : '0/0'}
                        </span>
                        <button type="button" onClick={onSearchPrevious} aria-label="Previous HWP viewer search result">
                            Prev
                        </button>
                        <button type="button" onClick={onSearchNext} aria-label="Next HWP viewer search result">
                            Next
                        </button>
                        <button type="button" onClick={() => onSearchOpenChange(false)} aria-label="Close HWP viewer search">
                            Close
                        </button>
                    </div>
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
                    <article
                        className={
                            page.pageNumber === searchActivePageNumber
                                ? 'hwp-viewer-page hwp-viewer-page-search-active'
                                : 'hwp-viewer-page'
                        }
                        key={page.pageNumber}
                        ref={(element) => {
                            if (element) pageRefs.current.set(page.pageNumber, element);
                            else pageRefs.current.delete(page.pageNumber);
                        }}
                    >
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
