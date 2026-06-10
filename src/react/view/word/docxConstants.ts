export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const DOCX_EXPORT_TIMEOUT_MS = 10000;
export const DOCX_REPAIR_TIMEOUT_MS = 10000;
export const DOCX_RENDER_TIMEOUT_MS = 12000;
export const DOCX_HOST_SAVE_TIMEOUT_MS = 30000;

export const DOCX_USER = {
    name: 'code-office',
    email: 'code-office@example.invalid',
    color: '#185abd',
};

export const DOCX_SUPERDOC_MODULES = {
    comments: {
        readOnly: true,
        allowResolve: false,
        showResolved: false,
    },
    trackChanges: {
        enabled: false,
        visible: false,
        mode: 'off',
    },
} as const;

export const DOCX_EVENTS = {
    init: 'init',
    open: 'open',
    openBuffer: 'openBuffer',
    dirtyChanged: 'docxDirtyChanged',
    hostSaveRequest: 'docxHostSaveRequest',
    hostSaveCompleted: 'docxHostSaveCompleted',
    saveRequest: 'docxSaveRequest',
    saveResponse: 'docxSaveResponse',
} as const;
