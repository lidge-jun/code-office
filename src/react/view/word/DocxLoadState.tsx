type DocxErrorStateProps = {
    error: string;
};

export function DocxErrorState({ error }: DocxErrorStateProps) {
    return (
        <div className="docx-editor-error">
            <p>Failed to load document</p>
            <pre>{error}</pre>
        </div>
    );
}

export function DocxLoadingState() {
    return (
        <div className="docx-editor-loading">
            Loading document...
        </div>
    );
}

export function DocxEmptyState() {
    return (
        <div className="docx-editor-loading">
            No document loaded
        </div>
    );
}
