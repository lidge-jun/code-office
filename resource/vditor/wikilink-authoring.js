let completionTargets = [];

export function setWikilinkCompletionTargets(list) {
    completionTargets = Array.isArray(list) ? [...new Set(list.filter(Boolean))].sort() : [];
}

export function filterWikilinkCompletionTargets(query, targets = completionTargets, limit = 12) {
    const normalized = String(query || '').trim().toLowerCase();
    const source = Array.isArray(targets) ? targets : [];
    const scored = source
        .map(target => ({ target, score: scoreTarget(target, normalized) }))
        .filter(item => item.score >= 0)
        .sort((a, b) => a.score - b.score || a.target.localeCompare(b.target));
    return scored.slice(0, limit).map(item => item.target);
}

export function pairTextareaWikilink(value, selectionStart, selectionEnd, key = '[') {
    if (key !== '[') return null;
    const start = Number(selectionStart);
    const end = Number(selectionEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    const text = String(value ?? '');
    if (start !== end) {
        const selected = text.slice(start, end);
        return {
            value: `${text.slice(0, start)}[[${selected}]]${text.slice(end)}`,
            selectionStart: start + 2,
            selectionEnd: start + 2 + selected.length,
        };
    }
    if (start > 0 && text[start - 1] === '[') {
        return {
            value: `${text.slice(0, start - 1)}[[]]${text.slice(end)}`,
            selectionStart: start + 1,
            selectionEnd: start + 1,
        };
    }
    return null;
}

export function findTextareaWikilinkContext(value, position) {
    const text = String(value ?? '');
    const pos = Math.max(0, Math.min(Number(position) || 0, text.length));
    const open = text.lastIndexOf('[[', pos);
    if (open < 0) return null;
    const closeBefore = text.lastIndexOf(']]', Math.max(0, pos - 1));
    if (closeBefore > open) return null;
    const closeAfter = text.indexOf(']]', pos);
    if (closeAfter < 0) return null;
    const bodyStart = open + 2;
    return {
        open,
        close: closeAfter + 2,
        bodyStart,
        bodyEnd: closeAfter,
        query: text.slice(bodyStart, pos),
    };
}

export function applyTextareaWikilinkCompletion(value, context, target) {
    const text = String(value ?? '');
    if (!context || typeof target !== 'string') return null;
    const next = `${text.slice(0, context.bodyStart)}${target}${text.slice(context.bodyEnd)}`;
    const cursor = context.bodyStart + target.length;
    return { value: next, selectionStart: cursor, selectionEnd: cursor };
}

export function setupWikilinkAuthoring(editor, options = {}) {
    const {
        rawSource,
        runPostProcessing = () => { },
    } = options;
    const popup = createPopup();
    const refresh = () => window.setTimeout?.(() => runPostProcessing(), 0);

    installContenteditablePairing(popup, refresh);
    installBoundarySourceReveal(refresh);
    if (rawSource) installTextareaAuthoring(rawSource, popup);

    return {
        refresh,
        close: () => popup.close(),
        dispose: () => popup.destroy(),
    };
}

function scoreTarget(target, query) {
    const value = String(target || '').toLowerCase();
    if (!query) return 0;
    if (value === query) return 0;
    if (value.startsWith(query)) return 1;
    const base = value.split('/').pop() || value;
    if (base.startsWith(query)) return 2;
    const index = value.indexOf(query);
    return index >= 0 ? 10 + index : -1;
}

function installTextareaAuthoring(textarea, popup) {
    textarea.addEventListener('keydown', event => {
        if (popup.handleKeydown(event)) return;
        const paired = pairTextareaWikilink(textarea.value, textarea.selectionStart, textarea.selectionEnd, event.key);
        if (!paired) return;
        event.preventDefault();
        textarea.value = paired.value;
        textarea.setSelectionRange(paired.selectionStart, paired.selectionEnd);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        showTextareaSuggestions(textarea, popup);
    });
    textarea.addEventListener('input', () => showTextareaSuggestions(textarea, popup));
    textarea.addEventListener('click', () => showTextareaSuggestions(textarea, popup));
    textarea.addEventListener('blur', () => window.setTimeout?.(() => popup.close(), 120));
}

function showTextareaSuggestions(textarea, popup) {
    const context = findTextareaWikilinkContext(textarea.value, textarea.selectionStart);
    if (!context) {
        popup.close();
        return;
    }
    const targets = filterWikilinkCompletionTargets(context.query);
    if (!targets.length) {
        popup.close();
        return;
    }
    popup.open(targets, textarea, target => {
        const applied = applyTextareaWikilinkCompletion(textarea.value, context, target);
        if (!applied) return;
        textarea.value = applied.value;
        textarea.setSelectionRange(applied.selectionStart, applied.selectionEnd);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
}

function installContenteditablePairing(popup, refresh) {
    window.addEventListener('keydown', event => {
        if (popup.handleKeydown(event)) return;
        if (event.key !== '[' || isProtectedSelection()) return;
        const selection = document.getSelection?.();
        if (!selection || selection.rangeCount === 0) return;
        if (!selection.isCollapsed) {
            const selected = selection.toString();
            if (!selected) return;
            event.preventDefault();
            document.execCommand('insertText', false, `[[${selected}]]`);
            refresh();
            return;
        }
        if (!isPreviousCharacter('[')) return;
        event.preventDefault();
        document.execCommand('insertText', false, '[]]');
        moveSelectionLeft(2);
        refresh();
        showContenteditableSuggestions(popup);
    }, isMacPlatform() ? true : undefined);

    document.addEventListener('keyup', () => showContenteditableSuggestions(popup));
    document.addEventListener('mouseup', () => showContenteditableSuggestions(popup));
}

function showContenteditableSuggestions(popup) {
    if (isProtectedSelection()) {
        popup.close();
        return;
    }
    const context = findTextNodeWikilinkContext();
    if (!context) {
        popup.close();
        return;
    }
    const targets = filterWikilinkCompletionTargets(context.query);
    if (!targets.length) {
        popup.close();
        return;
    }
    popup.open(targets, getSelectionAnchorElement(), target => {
        const selection = document.getSelection?.();
        if (!selection) return;
        const text = context.node.textContent || '';
        context.node.textContent = `${text.slice(0, context.bodyStart)}${target}${text.slice(context.bodyEnd)}`;
        const cursor = context.bodyStart + target.length;
        const range = document.createRange();
        range.setStart(context.node, cursor);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        context.node.parentElement?.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: target }));
    });
}

function installBoundarySourceReveal(refresh) {
    document.addEventListener('selectionchange', () => {
        window.setTimeout?.(() => {
            if (revealWikilinkAtBoundary()) return;
            refresh();
        }, 0);
    });
}

function revealWikilinkAtBoundary() {
    const selection = document.getSelection?.();
    if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return false;
    const anchor = selection.anchorNode;
    const offset = selection.anchorOffset;
    if (!anchor || anchor.nodeType !== Node.ELEMENT_NODE) return false;
    const before = anchor.childNodes[offset - 1];
    const after = anchor.childNodes[offset];
    const span = getWikilinkElement(after) || getWikilinkElement(before);
    if (!span) return false;
    const body = span.getAttribute('data-wikilink');
    if (!body) return false;
    const text = document.createTextNode(`[[${body}]]`);
    const placeAfter = span === before;
    span.replaceWith(text);
    const cursor = placeAfter ? text.textContent.length : 0;
    const range = document.createRange();
    range.setStart(text, cursor);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
}

function getWikilinkElement(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;
    if (node.matches?.('[data-wikilink]')) return node;
    return node.querySelector?.('[data-wikilink]') || null;
}

function findTextNodeWikilinkContext() {
    const selection = document.getSelection?.();
    if (!selection || !selection.isCollapsed) return null;
    const node = selection.anchorNode;
    const offset = selection.anchorOffset;
    if (!node || node.nodeType !== Node.TEXT_NODE) return null;
    const text = node.textContent || '';
    const open = text.lastIndexOf('[[', offset);
    if (open < 0) return null;
    const closeBefore = text.lastIndexOf(']]', Math.max(0, offset - 1));
    if (closeBefore > open) return null;
    const closeAfter = text.indexOf(']]', offset);
    if (closeAfter < 0) return null;
    return {
        node,
        bodyStart: open + 2,
        bodyEnd: closeAfter,
        query: text.slice(open + 2, offset),
    };
}

function isPreviousCharacter(character) {
    const selection = document.getSelection?.();
    if (!selection || !selection.isCollapsed) return false;
    const node = selection.anchorNode;
    const offset = selection.anchorOffset;
    return node?.nodeType === Node.TEXT_NODE && offset > 0 && node.textContent?.[offset - 1] === character;
}

function isProtectedSelection() {
    const element = getSelectionAnchorElement();
    return Boolean(element?.closest?.('code, pre, textarea, kbd, samp, [data-type="code-block"]'));
}

function getSelectionAnchorElement() {
    const node = document.getSelection?.()?.anchorNode;
    if (!node) return null;
    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}

function moveSelectionLeft(count) {
    for (let i = 0; i < count; i += 1) {
        document.getSelection?.().modify?.('move', 'left', 'character');
    }
}

function createPopup() {
    const popup = document.createElement('div');
    popup.className = 'code-office-wikilink-suggest';
    popup.hidden = true;
    document.body.appendChild(popup);
    let items = [];
    let selected = 0;
    let apply = () => { };

    const render = () => {
        popup.innerHTML = '';
        items.forEach((item, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = item;
            button.className = index === selected ? 'is-selected' : '';
            button.addEventListener('mousedown', event => {
                event.preventDefault();
                apply(item);
                close();
            });
            popup.appendChild(button);
        });
    };
    const close = () => {
        popup.hidden = true;
        items = [];
    };
    return {
        open(nextItems, anchor, onApply) {
            items = nextItems;
            selected = 0;
            apply = onApply;
            render();
            positionPopup(popup, anchor);
            popup.hidden = false;
        },
        close,
        destroy() { popup.remove(); },
        handleKeydown(event) {
            if (popup.hidden || !items.length) return false;
            if (event.key === 'ArrowDown') selected = Math.min(items.length - 1, selected + 1);
            else if (event.key === 'ArrowUp') selected = Math.max(0, selected - 1);
            else if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault();
                apply(items[selected]);
                close();
                return true;
            } else if (event.key === 'Escape') {
                close();
                return true;
            } else return false;
            event.preventDefault();
            render();
            return true;
        },
    };
}

function positionPopup(popup, anchor) {
    const rect = anchor?.getBoundingClientRect?.() || getSelectionRect();
    popup.style.left = `${Math.max(8, rect.left)}px`;
    popup.style.top = `${Math.max(8, rect.bottom + 6)}px`;
}

function getSelectionRect() {
    const range = document.getSelection?.()?.rangeCount ? document.getSelection().getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect?.();
    return rect && rect.width + rect.height > 0 ? rect : { left: 8, bottom: 8 };
}

function isMacPlatform() {
    return typeof navigator === 'object' && navigator.userAgent?.includes('Mac OS');
}
