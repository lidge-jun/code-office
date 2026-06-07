import { getWikilinkRevealTargetAtEvent, isPointInsideWikilinkSource, isSelectionInsideWikilinkSource } from './wikilink-dom.js';
import {
    applyWikilinkCompletion as applySourceWikilinkCompletion,
    filterWikilinkCompletionTargets as filterSourceWikilinkCompletionTargets,
    findWikilinkCompletionContext as findSourceWikilinkCompletionContext,
    insertPrintableIntoWikilinkContext,
    isSupportedWikilinkAuthoringTarget,
} from './wikilink-source-transaction.js';
export { getWikilinkRevealPlacementFromClientX, getWikilinkRevealPlacementFromTextOffset } from './wikilink-placement.js';
export {
    applyWikilinkCompletion,
    createWikilinkPairTransaction,
    findWikilinkCompletionContext,
    insertPrintableIntoWikilinkContext,
    isSupportedWikilinkAuthoringTarget,
} from './wikilink-source-transaction.js';

let completionTargets = [];
const revealedWikilinkTextNodes = new WeakSet();
const EDITABLE_ROOT_SELECTOR = '.vditor-ir .vditor-reset, .vditor-wysiwyg .vditor-reset, .vditor-sv .vditor-reset, .vditor-reset';

export function setWikilinkCompletionTargets(list) {
    completionTargets = Array.isArray(list) ? [...new Set(list.filter(Boolean))].sort() : [];
}

export function filterWikilinkCompletionTargets(query, targets = completionTargets, limit = 12) {
    return filterSourceWikilinkCompletionTargets(query, targets, limit);
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

export function pairMarkdownInsertedBracket(previous, next) {
    const before = String(previous ?? '');
    const after = String(next ?? '');
    let start = 0;
    while (start < before.length && before[start] === after[start]) start += 1;
    let beforeEnd = before.length;
    let afterEnd = after.length;
    while (beforeEnd > start && afterEnd > start && before[beforeEnd - 1] === after[afterEnd - 1]) {
        beforeEnd -= 1;
        afterEnd -= 1;
    }
    if (before.slice(start, beforeEnd) !== '') return null;
    const inserted = after.slice(start, afterEnd);
    if (inserted.startsWith('[[') && !inserted.includes(']]') && !/[\r\n]/.test(inserted)) {
        const body = inserted.slice(2);
        return {
            value: `${before.slice(0, start)}[[${body}]]${before.slice(start)}`,
            selectionStart: start + 2 + body.length,
            selectionEnd: start + 2 + body.length,
        };
    }
    if (inserted !== '[') return null;
    return pairTextareaWikilink(before, start, start, '[');
}

export function isMarkdownInsertedWikilinkPair(previous, next) {
    const before = String(previous ?? '');
    const after = String(next ?? '');
    let start = 0;
    while (start < before.length && before[start] === after[start]) start += 1;
    let beforeEnd = before.length;
    let afterEnd = after.length;
    while (beforeEnd > start && afterEnd > start && before[beforeEnd - 1] === after[afterEnd - 1]) {
        beforeEnd -= 1;
        afterEnd -= 1;
    }
    if (before.slice(start, beforeEnd) !== '') return false;
    const inserted = after.slice(start, afterEnd);
    if (inserted === '[[]]') return true;
    return inserted === '[]]' && start > 0 && before[start - 1] === '[';
}

export function moveLeakedPrintableIntoEmptyWikilink(previous, next) {
    const before = String(previous ?? '');
    const after = String(next ?? '');
    if (!before.includes('[[]]') || !after.includes('[[]]')) return null;
    let start = 0;
    while (start < before.length && start < after.length && before[start] === after[start]) start += 1;
    let beforeEnd = before.length;
    let afterEnd = after.length;
    while (beforeEnd > start && afterEnd > start && before[beforeEnd - 1] === after[afterEnd - 1]) {
        beforeEnd -= 1;
        afterEnd -= 1;
    }
    if (before.slice(start, beforeEnd) !== '') return null;
    const inserted = after.slice(start, afterEnd);
    if (!isSingleWikilinkBodyCharacter(inserted)) return null;
    if (`${after.slice(0, start)}${after.slice(afterEnd)}` !== before) return null;
    const pairIndex = before.indexOf('[[]]');
    return {
        value: `${before.slice(0, pairIndex + 2)}${inserted}${before.slice(pairIndex + 2)}`,
        selectionStart: pairIndex + 2 + inserted.length,
        selectionEnd: pairIndex + 2 + inserted.length,
    };
}

export function isTextOffsetInsideEmptyWikilinkBody(text, offset) {
    const value = String(text ?? '');
    const position = Math.max(0, Math.min(Number(offset) || 0, value.length));
    const index = value.indexOf('[[]]');
    return index >= 0 && position === index + 2;
}

function isSingleWikilinkBodyCharacter(value) {
    if (typeof value !== 'string' || !value) return false;
    if (value === '[' || value === ']') return false;
    if (/[\r\n]/.test(value)) return false;
    return Array.from(value).length === 1;
}

export function pairMarkdownUnclosedWikilinkOpen(value) {
    const text = String(value ?? '');
    const open = text.lastIndexOf('[[');
    if (open < 0) return null;
    const body = text.slice(open + 2);
    if (body.includes(']]') || /[\r\n]/.test(body)) return null;
    return {
        value: `${text.slice(0, open)}[[${body}]]`,
        selectionStart: open + 2 + body.length,
        selectionEnd: open + 2 + body.length,
    };
}

export function focusFirstEmptyWikilinkBody(root = document) {
    if (typeof document !== 'object' || typeof NodeFilter !== 'object') return false;
    for (const scope of getEditableRoots(root)) {
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (isProtectedNode(node)) continue;
            const text = node.textContent || '';
            const index = text.indexOf('[[]]');
            if (index < 0) continue;
            const editableRoot = node.parentElement?.closest?.(EDITABLE_ROOT_SELECTOR);
            editableRoot?.focus?.({ preventScroll: true });
            const selection = document.getSelection?.();
            const range = document.createRange();
            range.setStart(node, index + 2);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
            return true;
        }
    }
    return false;
}

function getEditableRoots(root = document) {
    const roots = root?.querySelectorAll?.(EDITABLE_ROOT_SELECTOR);
    if (roots?.length) return [...roots].filter(node => node?.isConnected !== false);
    return root ? [root] : [];
}

export function findTextareaWikilinkContext(value, position) {
    return findSourceWikilinkCompletionContext(value, position);
}

export function applyTextareaWikilinkCompletion(value, context, target) {
    return applySourceWikilinkCompletion(value, context, target);
}
export function setupWikilinkAuthoring(editor, options = {}) {
    const {
        getSourceValue = () => '',
        setSourceValue = () => { },
        getActiveSourceSelection = () => null,
        setActiveSourceSelection = () => { },
        clearActiveSourceSelection = () => { },
        applySourceTransaction = transaction => {
            setSourceValue(transaction.value);
            editor?.setValue?.(transaction.value);
        },
        rawSource,
        runPostProcessing = () => { },
    } = options;
    const popup = createPopup();
    const refresh = () => window.setTimeout?.(() => runPostProcessing(), 0);
    const repairSource = () => repairInsertedWikilinkOpenSource(editor, {
        getSourceValue,
        setSourceValue,
        popup,
        refresh,
    });
    const collapseFromOutsideClick = () => {
        if (!isSelectionInsideRevealedWikilinkSource()) {
            refresh();
            window.setTimeout?.(() => runPostProcessing(), 80);
            return;
        }
        window.__codeOfficeForceWikilinkCollapse = true;
        window.clearTimeout?.(window.__codeOfficeForceWikilinkCollapseTimer);
        window.__codeOfficeForceWikilinkCollapseTimer = window.setTimeout?.(() => {
            window.__codeOfficeForceWikilinkCollapse = false;
        }, 250);
        refresh();
        window.setTimeout?.(() => runPostProcessing(), 80);
    };

    installContenteditablePairing(popup, refresh, repairSource, {
        getSourceValue,
        getActiveSourceSelection,
        setActiveSourceSelection,
        clearActiveSourceSelection,
        applySourceTransaction,
    });
    installBoundarySourceReveal(refresh, collapseFromOutsideClick);
    if (rawSource) installTextareaAuthoring(rawSource, popup);

    return {
        refresh,
        completeOpen: () => completeInsertedWikilinkOpen(popup, refresh) || repairSource(),
        close: () => popup.close(),
        dispose: () => popup.destroy(),
    };
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

function showSourceSuggestions(popup, sourceAdapter) {
    const active = sourceAdapter?.getActiveSourceSelection?.();
    if (!active) return false;
    const value = String(sourceAdapter.getSourceValue?.() ?? '');
    const position = Number(active.selectionStart);
    if (!Number.isFinite(position)) {
        sourceAdapter.clearActiveSourceSelection?.();
        return false;
    }
    const context = findSourceWikilinkCompletionContext(value, position);
    if (!context) {
        popup.close();
        sourceAdapter.clearActiveSourceSelection?.();
        return false;
    }
    const targets = filterWikilinkCompletionTargets(context.query);
    if (!targets.length) {
        popup.close();
        return true;
    }
    popup.open(targets, getSelectionAnchorElement(), target => {
        const transaction = applySourceWikilinkCompletion(value, context, target);
        if (!transaction) return;
        sourceAdapter.applySourceTransaction?.(transaction);
        sourceAdapter.setActiveSourceSelection?.({
            selectionStart: transaction.selectionStart,
            selectionEnd: transaction.selectionEnd,
            context: transaction.context,
        });
        sourceAdapter.clearActiveSourceSelection?.();
    });
    return true;
}

function installContenteditablePairing(popup, refresh, repairSource, sourceAdapter = {}) {
    let pendingOpenBracket = null;
    let pendingEmptyWikilinkText = '';
    let repairingLeakedDomText = false;
    const startEmptyWikilinkCaretGuard = () => {
        if (!pendingEmptyWikilinkText) return;
        [0, 16, 50, 120, 250, 500, 900, 1400].forEach(delay => {
            window.setTimeout?.(() => {
                if (!pendingEmptyWikilinkText || !hasEmptyWikilinkBody()) {
                    return;
                }
                if (repairLeakedDomText()) return;
                if (!isSelectionInsideEmptyWikilinkBody()) focusFirstEmptyWikilinkBody();
            }, delay);
        });
    };
    const startLeakRepairPolling = () => {
        if (!pendingEmptyWikilinkText) return;
        [32, 64, 120, 250, 500, 900, 1400, 2500, 4000].forEach(delay => {
            window.setTimeout?.(() => {
                if (!pendingEmptyWikilinkText || !hasEmptyWikilinkBody()) return;
                repairLeakedDomText();
            }, delay);
        });
    };
    const rememberEmptyWikilinkText = () => {
        const capture = () => {
            if (pendingEmptyWikilinkText) return;
            const text = collectEditableTextSnapshot();
            pendingEmptyWikilinkText = text.includes('[[]]') ? text : '';
            if (pendingEmptyWikilinkText) {
                startLeakRepairPolling();
                startEmptyWikilinkCaretGuard();
            }
        };
        capture();
        [0, 16, 50].forEach(delay => window.setTimeout?.(capture, delay));
    };
    const repairLeakedDomText = () => {
        if (repairingLeakedDomText || !pendingEmptyWikilinkText) return false;
        const current = collectEditableTextSnapshot();
        const repaired = moveLeakedPrintableIntoEmptyWikilink(pendingEmptyWikilinkText, current);
        if (!repaired) return false;
        repairingLeakedDomText = true;
        try {
            const inserted = removeSingleLeakedTextCharacter(pendingEmptyWikilinkText, current);
            if (!inserted) return false;
            if (!insertTextIntoFirstEmptyWikilinkBody(inserted)) {
                return false;
            }
            pendingEmptyWikilinkText = '';
            refresh();
            showContenteditableSuggestions(popup);
            return true;
        } finally {
            window.setTimeout?.(() => {
                repairingLeakedDomText = false;
            }, 0);
        }
    };
    const rememberOpenBracket = () => {
        pendingOpenBracket = {
            root: getFocusedEditableRoot(),
            expiresAt: Date.now() + 1200,
        };
        window.setTimeout?.(() => {
            if (pendingOpenBracket?.expiresAt <= Date.now()) pendingOpenBracket = null;
        }, 1300);
    };
    const consumePendingOpenBracket = () => {
        const currentRoot = getFocusedEditableRoot();
        if (!pendingOpenBracket || pendingOpenBracket.expiresAt <= Date.now() || pendingOpenBracket.root !== currentRoot) {
            pendingOpenBracket = null;
            return false;
        }
        pendingOpenBracket = null;
        return Boolean(currentRoot);
    };

    window.addEventListener('beforeinput', event => {
        if (routeBeforeInputThroughSource(event, popup, refresh, sourceAdapter)) {
            return;
        }
        if (insertBeforeInputTextIntoEmptyWikilink(event, popup, refresh)) {
            return;
        }
        if (event.inputType !== 'insertText' || event.data !== '[' || isProtectedSelection()) return;
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
        keepCaretInEmptyWikilinkBody();
        refresh();
        rememberEmptyWikilinkText();
        showContenteditableSuggestions(popup);
    }, true);

    window.addEventListener('keydown', event => {
        if (popup.handleKeydown(event)) return;
        if (routeKeydownThroughSource(event, popup, refresh, sourceAdapter)) {
            return;
        }
        if (insertPrintableKeyIntoEmptyWikilink(event, popup, refresh)) {
            return;
        }
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
        if (!isPreviousCharacter('[') && !consumePendingOpenBracket()) {
            rememberOpenBracket();
            return;
        }
        event.preventDefault();
        document.execCommand('insertText', false, '[]]');
        moveSelectionLeft(2);
        keepCaretInEmptyWikilinkBody();
        refresh();
        rememberEmptyWikilinkText();
        showContenteditableSuggestions(popup);
    }, isMacPlatform() ? true : undefined);

    const completeOrSuggest = () => {
        if (repairLeakedDomText()) return;
        if (completeInsertedWikilinkOpen(popup, refresh)) {
            rememberEmptyWikilinkText();
            return;
        }
        if (repairSource()) return;
        showSourceSuggestions(popup, sourceAdapter) || showContenteditableSuggestions(popup);
    };
    document.addEventListener('keyup', completeOrSuggest);
    window.addEventListener('keyup', completeOrSuggest, true);
    document.addEventListener('mouseup', () => {
        sourceAdapter.clearActiveSourceSelection?.();
        showContenteditableSuggestions(popup);
    });
    window.addEventListener('input', () => {
        if (repairLeakedDomText()) return;
        if (completeInsertedWikilinkOpen(popup, refresh)) {
            rememberEmptyWikilinkText();
            return;
        }
        repairSource();
    }, true);
    installInsertedOpenObserver(popup, refresh, repairSource, () => {
        if (repairLeakedDomText()) return true;
        rememberEmptyWikilinkText();
        return false;
    });
}

function routeKeydownThroughSource(event, popup, refresh, sourceAdapter) {
    if (!shouldRoutePrintableKeyThroughSource(event)) return false;
    return routePrintableTextThroughSource(event, event.key, popup, refresh, sourceAdapter);
}

function routeBeforeInputThroughSource(event, popup, refresh, sourceAdapter) {
    if (!event || event.defaultPrevented || event.inputType !== 'insertText') return false;
    if (typeof event.data !== 'string' || Array.from(event.data).length !== 1) return false;
    return routePrintableTextThroughSource(event, event.data, popup, refresh, sourceAdapter);
}

function routePrintableTextThroughSource(event, text, popup, refresh, sourceAdapter) {
    const active = sourceAdapter.getActiveSourceSelection?.();
    if (!active || !isSingleWikilinkBodyCharacter(text)) return false;
    const value = String(sourceAdapter.getSourceValue?.() ?? '');
    const position = Number(active.selectionStart);
    if (!Number.isFinite(position) || !isSupportedWikilinkAuthoringTarget(value, position)) {
        sourceAdapter.clearActiveSourceSelection?.();
        return false;
    }
    const context = findSourceWikilinkCompletionContext(value, position);
    if (!context) {
        sourceAdapter.clearActiveSourceSelection?.();
        return false;
    }
    const transaction = insertPrintableIntoWikilinkContext(value, context, text);
    if (!transaction) return false;
    event.preventDefault();
    sourceAdapter.applySourceTransaction?.(transaction);
    sourceAdapter.setActiveSourceSelection?.({
        selectionStart: transaction.selectionStart,
        selectionEnd: transaction.selectionEnd,
        context: transaction.context,
    });
    refresh();
    showSourceSuggestions(popup, sourceAdapter);
    return true;
}

function shouldRoutePrintableKeyThroughSource(event) {
    if (!event || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return false;
    if (event.key === '[' || event.key === ']' || event.key === 'Backspace' || event.key === 'Delete') return false;
    return typeof event.key === 'string' && Array.from(event.key).length === 1;
}

function shouldRoutePrintableKeyIntoEmptyWikilink(event) {
    if (!event || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return false;
    if (event.key === '[' || event.key === ']' || event.key === 'Backspace' || event.key === 'Delete') return false;
    if (typeof event.key !== 'string' || event.key.length !== 1) return false;
    if (isProtectedSelection()) return false;
    return hasEmptyWikilinkBody();
}

function insertPrintableKeyIntoEmptyWikilink(event, popup, refresh) {
    if (!shouldRoutePrintableKeyIntoEmptyWikilink(event)) return false;
    event.preventDefault();
    if (!insertTextIntoFirstEmptyWikilinkBody(event.key) && !insertTextIntoFocusedEmptyWikilinkBody(event.key)) {
        return false;
    }
    refresh();
    showContenteditableSuggestions(popup);
    return true;
}

function insertBeforeInputTextIntoEmptyWikilink(event, popup, refresh) {
    if (!shouldRouteBeforeInputTextIntoEmptyWikilink(event)) return false;
    event.preventDefault();
    if (!insertTextIntoFirstEmptyWikilinkBody(event.data) && !insertTextIntoFocusedEmptyWikilinkBody(event.data)) {
        return false;
    }
    refresh();
    showContenteditableSuggestions(popup);
    return true;
}

function shouldRouteBeforeInputTextIntoEmptyWikilink(event) {
    if (!event || event.defaultPrevented || event.inputType !== 'insertText') return false;
    if (typeof event.data !== 'string' || event.data.length !== 1) return false;
    if (event.data === '[' || event.data === ']') return false;
    if (isProtectedSelection()) return false;
    return hasEmptyWikilinkBody();
}

function hasEmptyWikilinkBody(root = document) {
    if (typeof document !== 'object' || typeof NodeFilter !== 'object') return false;
    const scopes = getEditableRoots(root);
    for (const scope of scopes) {
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            if (!isProtectedNode(walker.currentNode) && (walker.currentNode.textContent || '').includes('[[]]')) return true;
        }
    }
    return false;
}

function isSelectionInsideEmptyWikilinkBody() {
    const selection = document.getSelection?.();
    if (!selection || !selection.isCollapsed) return false;
    const node = selection.anchorNode;
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;
    return isTextOffsetInsideEmptyWikilinkBody(node.textContent || '', selection.anchorOffset);
}

function dispatchSelectionInput(data) {
    const selection = document.getSelection?.();
    const anchor = selection?.anchorNode;
    const target = anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor;
    target?.dispatchEvent?.(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data,
    }));
}

export function insertTextIntoFirstEmptyWikilinkBody(text, root = document) {
    const inserted = String(text ?? '');
    if (!inserted) return false;
    if (typeof document !== 'object' || typeof NodeFilter !== 'object') return false;
    for (const scope of getEditableRoots(root)) {
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (isProtectedNode(node)) continue;
            if (insertTextIntoEmptyWikilinkNode(node, inserted)) return true;
        }
    }
    return false;
}

function insertTextIntoFocusedEmptyWikilinkBody(text) {
    const context = findTextNodeWikilinkContext();
    if (!context || context.bodyStart !== context.bodyEnd) return false;
    return insertTextIntoEmptyWikilinkNode(context.node, text, context.bodyStart - 2);
}

function insertTextIntoEmptyWikilinkNode(node, inserted, startIndex = -1) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;
    const text = node.textContent || '';
    const index = startIndex >= 0 ? startIndex : text.indexOf('[[]]');
    if (index < 0 || text.slice(index, index + 4) !== '[[]]') return false;
    node.textContent = `${text.slice(0, index + 2)}${inserted}${text.slice(index + 2)}`;
    const cursor = index + 2 + inserted.length;
    placeCaretInTextNode(node, cursor);
    node.parentElement?.dispatchEvent?.(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: inserted,
    }));
    return true;
}

function placeCaretInTextNode(node, offset) {
    const selection = document.getSelection?.();
    if (!selection) return;
    const range = document.createRange();
    range.setStart(node, Math.max(0, Math.min(offset, (node.textContent || '').length)));
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

function collectEditableTextSnapshot(root = document) {
    if (typeof document !== 'object' || typeof NodeFilter !== 'object') return '';
    const parts = [];
    for (const scope of getEditableRoots(root)) {
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!isProtectedNode(node)) parts.push(node.textContent || '');
        }
    }
    return parts.join('\n');
}

function findSingleInsertedTextOffset(previous, current) {
    const before = String(previous ?? '');
    const after = String(current ?? '');
    let start = 0;
    while (start < before.length && start < after.length && before[start] === after[start]) start += 1;
    let beforeEnd = before.length;
    let afterEnd = after.length;
    while (beforeEnd > start && afterEnd > start && before[beforeEnd - 1] === after[afterEnd - 1]) {
        beforeEnd -= 1;
        afterEnd -= 1;
    }
    if (before.slice(start, beforeEnd) !== '') return -1;
    const inserted = after.slice(start, afterEnd);
    if (!isSingleWikilinkBodyCharacter(inserted)) return -1;
    return start;
}

function removeSingleLeakedTextCharacter(previous, current, root = document) {
    const insertedOffset = findSingleInsertedTextOffset(previous, current);
    if (insertedOffset < 0) return '';
    const inserted = String(current ?? '').slice(insertedOffset, insertedOffset + 1);
    let seen = 0;
    for (const scope of getEditableRoots(root)) {
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (isProtectedNode(node)) continue;
            const text = node.textContent || '';
            const separator = seen > 0 ? 1 : 0;
            const start = seen + separator;
            const end = start + text.length;
            if (insertedOffset >= start && insertedOffset < end) {
                const local = insertedOffset - start;
                node.textContent = `${text.slice(0, local)}${text.slice(local + inserted.length)}`;
                node.parentElement?.dispatchEvent?.(new InputEvent('input', {
                    bubbles: true,
                    inputType: 'deleteContentBackward',
                    data: null,
                }));
                return inserted;
            }
            seen = end;
        }
    }
    return '';
}

function installInsertedOpenObserver(popup, refresh, repairSource, beforeComplete = () => false) {
    if (typeof MutationObserver !== 'function') return;
    const host = document.getElementById('vditor') || document.body;
    if (!host) return;
    let pending = false;
    const completeSoon = () => {
        if (pending) return;
        pending = true;
        window.setTimeout?.(() => {
            pending = false;
            if (beforeComplete()) return;
            if (completeInsertedWikilinkOpen(popup, refresh)) return;
            repairSource();
        }, 0);
    };
    const observer = new MutationObserver(mutations => {
        if (beforeComplete()) return;
        for (const mutation of mutations) {
            if (mutation.type === 'characterData' && textNodeHasInsertedWikilinkOpen(mutation.target)) {
                completeSoon();
                return;
            }
            for (const node of mutation.addedNodes || []) {
                if (nodeContainsInsertedWikilinkOpen(node)) {
                    completeSoon();
                    return;
                }
            }
        }
    });
    observer.observe(host, { childList: true, characterData: true, subtree: true });
}

function repairInsertedWikilinkOpenSource(editor, { getSourceValue, setSourceValue, popup, refresh }) {
    if (window.__codeOfficeWikilinkProgrammaticInput) return false;
    const current = editor?.getValue?.();
    if (typeof current !== 'string') return false;
    const previous = typeof getSourceValue === 'function' ? getSourceValue() : '';
    const paired = pairMarkdownInsertedBracket(previous, current) || pairMarkdownUnclosedWikilinkOpen(current);
    if (!paired) return false;
    window.__codeOfficeWikilinkProgrammaticInput = true;
    try {
        editor.setValue?.(paired.value);
        setSourceValue(paired.value);
    } finally {
        window.setTimeout?.(() => {
            window.__codeOfficeWikilinkProgrammaticInput = false;
        }, 32);
    }
    keepCaretInEmptyWikilinkBody();
    refresh();
    showContenteditableSuggestions(popup);
    return true;
}

function textNodeHasInsertedWikilinkOpen(node) {
    return Boolean(node?.nodeType === Node.TEXT_NODE
        && !isProtectedNode(node)
        && /(?:^|[^\]])\[\[[^\]\r\n]*$/.test(node.textContent || ''));
}

function nodeContainsInsertedWikilinkOpen(node) {
    if (!node) return false;
    if (textNodeHasInsertedWikilinkOpen(node)) return true;
    if (node.nodeType !== Node.ELEMENT_NODE || isProtectedNode(node)) return false;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
        if (textNodeHasInsertedWikilinkOpen(walker.currentNode)) return true;
    }
    return false;
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

function installBoundarySourceReveal(refresh, collapseFromOutsideClick) {
    const maybeRefresh = () => window.setTimeout?.(() => {
        if (isSelectionInsideWikilinkSource()) return;
        if (revealWikilinkAtBoundary()) return;
        refresh();
    }, 0);

    document.addEventListener('mousedown', event => {
        const target = getWikilinkRevealTargetAtEvent(event);
        if (!target) {
            if (!isPointInsideWikilinkSource(event.clientX, event.clientY)) collapseFromOutsideClick();
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        revealWikilinkElement(target.span, target.placement === 'after');
    }, true);

    document.addEventListener('selectionchange', maybeRefresh);
    document.addEventListener('mouseup', maybeRefresh, true);
    document.addEventListener('keyup', maybeRefresh, true);
    window.addEventListener('input', maybeRefresh, true);
}

function revealWikilinkAtBoundary() {
    const selection = document.getSelection?.();
    if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return false;
    const anchor = selection.anchorNode;
    const offset = selection.anchorOffset;
    if (!anchor) return false;
    const span = findBoundaryWikilinkElement(anchor, offset);
    if (!span) return false;
    const placeAfter = shouldPlaceCaretAfterRevealedWikilink(anchor, offset, span);
    return revealWikilinkElement(span, placeAfter);
}
function revealWikilinkElement(span, placeAfter) {
    const body = span.getAttribute('data-wikilink');
    if (!body) return false;
    const selection = document.getSelection?.();
    if (!selection) return false;
    const text = document.createTextNode(`[[${body}]]`);
    revealedWikilinkTextNodes.add(text);
    span.replaceWith(text);
    const cursor = placeAfter ? text.textContent.length : 0;
    const range = document.createRange();
    range.setStart(text, cursor);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
}

function isSelectionInsideRevealedWikilinkSource() {
    const selection = document.getSelection?.();
    const node = selection?.isCollapsed ? selection.anchorNode : null;
    return Boolean(node?.nodeType === Node.TEXT_NODE && revealedWikilinkTextNodes.has(node));
}

function findBoundaryWikilinkElement(anchor, offset) {
    if (anchor.nodeType === Node.ELEMENT_NODE) {
        const before = anchor.childNodes[offset - 1];
        const after = anchor.childNodes[offset];
        return getWikilinkElement(after) || getWikilinkElement(before);
    }
    if (anchor.nodeType !== Node.TEXT_NODE) return null;
    const text = anchor.textContent || '';
    const own = anchor.parentElement?.closest?.('[data-wikilink]');
    if (own && (offset === 0 || offset === text.length)) return own;
    if (offset === 0) return getAdjacentWikilinkElement(anchor, 'previousSibling');
    if (offset === text.length) return getAdjacentWikilinkElement(anchor, 'nextSibling');
    return null;
}

function getAdjacentWikilinkElement(node, property) {
    let current = node;
    while (current && !current[property]) current = current.parentNode;
    return getWikilinkElement(current?.[property]);
}
function shouldPlaceCaretAfterRevealedWikilink(anchor, offset, span) {
    if (anchor.nodeType === Node.ELEMENT_NODE) {
        return span === anchor.childNodes[offset - 1];
    }
    if (anchor.nodeType !== Node.TEXT_NODE) return false;
    return offset === (anchor.textContent || '').length;
}

function getWikilinkElement(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;
    if (node.matches?.('[data-wikilink]')) return node;
    return node.querySelector?.('[data-wikilink]') || null;
}

function findTextNodeWikilinkContext() {
    const selection = document.getSelection?.();
    if (!selection || !selection.isCollapsed) return findFocusedEditableWikilinkContext();
    const node = selection.anchorNode;
    const offset = selection.anchorOffset;
    if (!node || node.nodeType !== Node.TEXT_NODE) return findFocusedEditableWikilinkContext();
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

function findFocusedEditableWikilinkContext() {
    const root = getFocusedEditableRoot();
    if (!root) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let context = null;
    while (walker.nextNode()) {
        const current = walker.currentNode;
        const text = current.textContent || '';
        const open = text.lastIndexOf('[[');
        if (open < 0) continue;
        const closeBefore = text.lastIndexOf(']]', Math.max(0, text.length - 1));
        if (closeBefore > open) continue;
        const closeAfter = text.indexOf(']]', open + 2);
        if (closeAfter < 0) continue;
        context = {
            node: current,
            bodyStart: open + 2,
            bodyEnd: closeAfter,
            query: text.slice(open + 2, closeAfter),
        };
    }
    return context;
}

function isPreviousCharacter(character) {
    const selection = document.getSelection?.();
    if (!selection || !selection.isCollapsed) return false;
    const node = selection.anchorNode;
    const offset = selection.anchorOffset;
    if (node?.nodeType === Node.TEXT_NODE && offset > 0 && node.textContent?.[offset - 1] === character) {
        return true;
    }
    const textBeforeCursor = getTextBeforeSelection();
    return textBeforeCursor.endsWith(character);
}
function getTextBeforeSelection() {
    const selection = document.getSelection?.();
    if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return '';
    const root = getSelectionEditableRoot();
    if (!root) return '';
    try {
        const range = selection.getRangeAt(0).cloneRange();
        range.selectNodeContents(root);
        range.setEnd(selection.anchorNode, selection.anchorOffset);
        return range.toString();
    } catch {
        return '';
    }
}

function getSelectionEditableRoot() {
    const element = getSelectionAnchorElement();
    return element?.closest?.(EDITABLE_ROOT_SELECTOR) || null;
}

function getFocusedEditableRoot() {
    const active = document.activeElement;
    return active?.closest?.(EDITABLE_ROOT_SELECTOR)
        || getSelectionEditableRoot()
        || document.querySelector?.(EDITABLE_ROOT_SELECTOR)
        || null;
}

function getFocusedEditablePlainText() {
    const root = getFocusedEditableRoot();
    return root?.innerText || root?.textContent || '';
}

function shouldCompleteInsertedWikilinkOpen() {
    if (isProtectedSelection()) return false;
    const textBeforeCursor = getTextBeforeSelection();
    if (textBeforeCursor.endsWith('[[')) {
        const textAfterCursor = getTextAfterSelection();
        return !textAfterCursor.startsWith(']]');
    }
    return getFocusedEditablePlainText().endsWith('[[');
}

function completeInsertedWikilinkOpen(popup, refresh) {
    const candidate = findInsertedWikilinkOpenCandidate();
    if (candidate && insertClosingWikilinkPairAtSelection(candidate)) {
        keepCaretInEmptyWikilinkBody();
        refresh();
        showContenteditableSuggestions(popup);
        return true;
    }
    if (!shouldCompleteInsertedWikilinkOpen()) return false;
    if (!insertClosingWikilinkPairAtSelection()) {
        document.execCommand('insertText', false, ']]');
        moveSelectionLeft(2);
    }
    keepCaretInEmptyWikilinkBody();
    refresh();
    showContenteditableSuggestions(popup);
    return true;
}

function keepCaretInEmptyWikilinkBody() {
    [0, 16, 50, 120].forEach(delay => {
        window.setTimeout?.(() => focusFirstEmptyWikilinkBody(), delay);
    });
}

function insertClosingWikilinkPairAtSelection(candidate = findInsertedWikilinkOpenCandidate()) {
    if (!candidate) return false;
    const { node, offset } = candidate;
    if (isProtectedNode(node)) return false;
    const text = node.textContent || '';
    if (!text.slice(0, offset).endsWith('[[') || text.slice(offset).startsWith(']]')) return false;
    node.textContent = `${text.slice(0, offset)}]]${text.slice(offset)}`;
    const selection = document.getSelection?.();
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    node.parentElement?.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ']]' }));
    return true;
}

function findInsertedWikilinkOpenCandidate() {
    const selection = document.getSelection?.();
    if (selection?.isCollapsed && selection.rangeCount > 0) {
        const node = selection.anchorNode;
        const offset = selection.anchorOffset;
        if (node?.nodeType === Node.TEXT_NODE) return { node, offset };
    }
    const root = getFocusedEditableRoot();
    if (!root) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let candidate = null;
    while (walker.nextNode()) {
        const current = walker.currentNode;
        const text = current.textContent || '';
        if (text.endsWith('[[')) candidate = { node: current, offset: text.length };
    }
    return candidate;
}

function getTextAfterSelection() {
    const selection = document.getSelection?.();
    if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return '';
    const root = getSelectionEditableRoot();
    if (!root) return '';
    try {
        const range = selection.getRangeAt(0).cloneRange();
        range.selectNodeContents(root);
        range.setStart(selection.anchorNode, selection.anchorOffset);
        return range.toString();
    } catch {
        return '';
    }
}

function isProtectedSelection() {
    const element = getSelectionAnchorElement();
    return Boolean(element?.closest?.('code, pre, textarea, kbd, samp, [data-type="code-block"]'));
}

function isProtectedNode(node) {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
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
