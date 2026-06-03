import { Button, Spin } from 'antd';
import type React from 'react';

interface HwpEditorSurfaceProps {
    fileName: string;
    dirty: boolean;
    isHwpx: boolean;
    loading: boolean;
    saving: boolean;
    hwpSaveEnabled: boolean;
    containerRef: React.RefObject<HTMLDivElement>;
    onSave: () => void;
    onView: () => void;
}

export function HwpEditorSurface({
    fileName,
    dirty,
    isHwpx,
    loading,
    saving,
    hwpSaveEnabled,
    containerRef,
    onSave,
    onView,
}: HwpEditorSurfaceProps) {
    return (
        <>
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
                <Button size="small" onClick={onView} loading={saving}>View</Button>
                {hwpSaveEnabled && (
                    <Button type="primary" size="small" onClick={onSave} loading={saving}>
                        {isHwpx ? 'Save HWPX' : 'Save HWP'}
                    </Button>
                )}
            </div>
            <div ref={containerRef} className="hwp-editor" />
        </>
    );
}
