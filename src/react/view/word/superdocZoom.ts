export function applySuperDocZoom(instance: unknown, bodyEditor: unknown, zoom: number): void {
    const activeEditor = instance && typeof instance === 'object'
        ? (instance as { activeEditor?: unknown }).activeEditor
        : undefined;
    const editorCandidates = [bodyEditor, activeEditor];
    for (const candidate of editorCandidates) {
        if (!candidate || typeof candidate !== 'object') continue;
        const maybeEditorZoomable = candidate as { setZoom?: (value: number) => void };
        if (typeof maybeEditorZoomable.setZoom !== 'function') continue;
        maybeEditorZoomable.setZoom(zoom);
        return;
    }
    if (!instance || typeof instance !== 'object') return;
    const maybeSuperDocZoomable = instance as { setZoom?: (percent: number) => void };
    if (typeof maybeSuperDocZoomable.setZoom !== 'function') return;
    maybeSuperDocZoomable.setZoom(Math.round(zoom * 100));
}
