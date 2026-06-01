export function resolveVditorMode(mode) {
    return mode === 'raw' ? 'ir' : (mode || 'wysiwyg');
}

export function isReadingPreviewShortcut(event, platform = navigator.platform) {
    if (!event || event.altKey || event.shiftKey) return false;
    const key = String(event.key || '').toLowerCase();
    if (key !== 'e') return false;
    const isMac = /Mac/.test(platform || '');
    return isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}

export function isSaveShortcut(event, platform = navigator.platform) {
    if (!event || event.altKey || event.shiftKey) return false;
    const key = String(event.key || '').toLowerCase();
    if (key !== 's') return false;
    const isMac = /Mac/.test(platform || '');
    return isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}

export function setupLiveRawControls(editor, options = {}) {
    const {
        initialContent = '',
        requestedMode = 'ir',
        getSourceValue,
        onSave = () => { },
        onDoSave = () => { },
    } = options;
    const root = document.getElementById('vditor');
    if (!root) {
        return createNoopController(editor);
    }

    const rawSource = createRawSourceTextarea(initialContent);
    root.appendChild(rawSource);

    let rawActive = false;
    let lastRawValue = initialContent;

    const syncButtonState = () => {
        const button = document.querySelector('.vditor-toolbar [data-type="code-office-raw-source"]');
        if (!button) return;
        button.classList.toggle('code-office-raw-source--active', rawActive);
        button.setAttribute('aria-pressed', rawActive ? 'true' : 'false');
    };

    const enterRawSource = ({ focus = true } = {}) => {
        lastRawValue = typeof getSourceValue === 'function' ? getSourceValue() : lastRawValue;
        rawSource.value = lastRawValue;
        rawActive = true;
        root.classList.add('code-office-raw-active');
        syncButtonState();
        if (focus) rawSource.focus();
    };

    const exitRawSource = ({ focus = true } = {}) => {
        if (!rawActive) return;
        lastRawValue = rawSource.value;
        safeSetValue(editor, lastRawValue);
        onSave(lastRawValue);
        rawActive = false;
        root.classList.remove('code-office-raw-active');
        syncButtonState();
        if (focus && typeof editor.focus === 'function') editor.focus();
    };

    const toggleRawSource = () => {
        if (rawActive) exitRawSource();
        else enterRawSource();
    };

    const toggleReadingPreview = () => {
        if (rawActive) exitRawSource({ focus: false });
        const previewButton = document.querySelector('.vditor-toolbar [data-type="preview"]');
        if (previewButton) {
            previewButton.click();
            return;
        }
        if (typeof editor.setPreviewMode === 'function') {
            editor.setPreviewMode('both');
        }
    };

    rawSource.addEventListener('input', () => {
        lastRawValue = rawSource.value;
        onSave(lastRawValue);
    });

    rawSource.addEventListener('keydown', event => {
        if (isSaveShortcut(event)) {
            event.stopPropagation();
            event.preventDefault();
            onDoSave(rawSource.value);
            return;
        }
        if (isReadingPreviewShortcut(event)) {
            event.stopPropagation();
            event.preventDefault();
            toggleReadingPreview();
        }
    });

    window.addEventListener('keydown', event => {
        if (!isReadingPreviewShortcut(event)) return;
        event.stopPropagation();
        event.preventDefault();
        toggleReadingPreview();
    }, /Mac/.test(navigator.platform) ? true : undefined);

    window.addEventListener('code-office-toggle-raw-source', event => {
        event?.preventDefault?.();
        toggleRawSource();
    });

    if (requestedMode === 'raw') {
        setTimeout(() => enterRawSource({ focus: false }));
    }

    return {
        isRawSourceActive: () => rawActive,
        getCurrentValue: () => {
            if (rawActive) return rawSource.value;
            if (typeof getSourceValue === 'function') return getSourceValue();
            return safeGetValue(editor, lastRawValue);
        },
        setExternalValue(content) {
            lastRawValue = content || '';
            if (rawActive) {
                rawSource.value = lastRawValue;
                return;
            }
            safeSetValue(editor, lastRawValue);
        },
        enterRawSource,
        exitRawSource,
        toggleRawSource,
        toggleReadingPreview,
        rawSource,
    };
}

function createRawSourceTextarea(initialContent) {
    const textarea = document.createElement('textarea');
    textarea.className = 'code-office-raw-source';
    textarea.setAttribute('aria-label', 'Raw Markdown Source');
    textarea.setAttribute('spellcheck', 'false');
    textarea.value = initialContent || '';
    return textarea;
}

function safeGetValue(editor, fallback) {
    try {
        return typeof editor.getValue === 'function' ? editor.getValue() : fallback;
    } catch (error) {
        console.warn('code-office raw source getValue failed', error);
        return fallback;
    }
}

function safeSetValue(editor, content) {
    try {
        if (typeof editor.setValue === 'function') editor.setValue(content || '');
    } catch (error) {
        console.warn('code-office raw source setValue failed', error);
    }
}

function createNoopController(editor) {
    return {
        isRawSourceActive: () => false,
        getCurrentValue: () => safeGetValue(editor, ''),
        setExternalValue: content => safeSetValue(editor, content || ''),
        enterRawSource: () => { },
        exitRawSource: () => { },
        toggleRawSource: () => { },
        toggleReadingPreview: () => { },
        rawSource: null,
    };
}
