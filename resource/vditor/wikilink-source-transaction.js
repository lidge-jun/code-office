export function createWikilinkPairTransaction(value, selectionStart, selectionEnd, key = '[') {
    if (key !== '[') return null;
    const text = String(value ?? '');
    const start = normalizeOffset(selectionStart, text.length);
    const end = normalizeOffset(selectionEnd, text.length);
    if (start == null || end == null) return null;
    if (start !== end) {
        const selected = text.slice(start, end);
        return withContext({
            value: `${text.slice(0, start)}[[${selected}]]${text.slice(end)}`,
            selectionStart: start + 2,
            selectionEnd: start + 2 + selected.length,
        });
    }
    if (start <= 0 || text[start - 1] !== '[') return null;
    return withContext({
        value: `${text.slice(0, start - 1)}[[]]${text.slice(end)}`,
        selectionStart: start + 1,
        selectionEnd: start + 1,
    });
}

export function pairMarkdownInsertedBracket(previous, next) {
    const before = String(previous ?? '');
    const after = String(next ?? '');
    const diff = findSingleInsertion(before, after);
    if (!diff) return null;
    if (diff.inserted === '[[') {
        return withContext({
            value: `${before.slice(0, diff.start)}[[]]${before.slice(diff.start)}`,
            selectionStart: diff.start + 2,
            selectionEnd: diff.start + 2,
        });
    }
    if (diff.inserted !== '[') return null;
    return createWikilinkPairTransaction(before, diff.start, diff.start, '[');
}

export function isMarkdownInsertedWikilinkPair(previous, next) {
    const before = String(previous ?? '');
    const after = String(next ?? '');
    const diff = findSingleInsertion(before, after);
    if (!diff) return false;
    if (diff.inserted === '[[]]') return true;
    return diff.inserted === '[]]' && diff.start > 0 && before[diff.start - 1] === '[';
}

export function findWikilinkCompletionContext(value, position) {
    const text = String(value ?? '');
    const pos = normalizeOffset(position, text.length);
    if (pos == null || !isSupportedWikilinkAuthoringTarget(text, pos)) return null;
    const open = text.lastIndexOf('[[', pos);
    if (open < 0) return null;
    const closeBefore = text.lastIndexOf(']]', Math.max(0, pos - 1));
    if (closeBefore > open) return null;
    const bodyStart = open + 2;
    const query = text.slice(bodyStart, pos);
    if (/[\r\n]/.test(query)) return null;
    const closeAfter = text.indexOf(']]', pos);
    if (closeAfter >= 0) {
        const body = text.slice(bodyStart, closeAfter);
        if (/[\r\n]/.test(body)) return null;
        return { open, close: closeAfter + 2, bodyStart, bodyEnd: closeAfter, query };
    }
    return { open, close: null, bodyStart, bodyEnd: pos, query };
}

export function applyWikilinkCompletion(value, context, target) {
    const text = String(value ?? '');
    if (!context || typeof target !== 'string') return null;
    const bodyStart = normalizeOffset(context.bodyStart, text.length);
    const bodyEnd = normalizeOffset(context.bodyEnd, text.length);
    if (bodyStart == null || bodyEnd == null || bodyEnd < bodyStart) return null;
    const hasClose = Number.isFinite(context.close);
    const suffix = hasClose ? text.slice(bodyEnd) : `]]${text.slice(bodyEnd)}`;
    const next = `${text.slice(0, bodyStart)}${target}${suffix}`;
    const cursor = bodyStart + target.length + 2;
    return withContext({ value: next, selectionStart: cursor, selectionEnd: cursor });
}

export function insertPrintableIntoWikilinkContext(value, context, inserted) {
    const text = String(value ?? '');
    const token = String(inserted ?? '');
    if (!context || !isPrintableWikilinkBodyText(token)) return null;
    const offset = normalizeOffset(context.bodyEnd, text.length);
    if (offset == null) return null;
    const next = `${text.slice(0, offset)}${token}${text.slice(offset)}`;
    const cursor = offset + token.length;
    return withContext({ value: next, selectionStart: cursor, selectionEnd: cursor });
}

export function filterWikilinkCompletionTargets(query, targets = [], limit = 12) {
    const normalized = String(query || '').trim().toLowerCase();
    const source = Array.isArray(targets) ? [...new Set(targets.filter(Boolean))] : [];
    const scored = source
        .map(target => ({ target, score: scoreTarget(target, normalized) }))
        .filter(item => item.score >= 0)
        .sort((a, b) => a.score - b.score || a.target.localeCompare(b.target));
    return scored.slice(0, limit).map(item => item.target);
}

export function isSupportedWikilinkAuthoringTarget(value, position) {
    const text = String(value ?? '');
    const pos = normalizeOffset(position, text.length);
    if (pos == null) return false;
    return !isInsideFencedCode(text, pos) && !isInsideInlineCode(text, pos);
}

export function pairMarkdownUnclosedWikilinkOpen(value) {
    const text = String(value ?? '');
    const open = text.lastIndexOf('[[');
    if (open < 0 || text.slice(open + 2).includes(']]') || text.slice(open + 2) !== '') return null;
    return withContext({
        value: `${text.slice(0, open)}[[]]${text.slice(open + 2)}`,
        selectionStart: open + 2,
        selectionEnd: open + 2,
    });
}

export function moveLeakedPrintableIntoEmptyWikilink(previous, next) {
    const before = String(previous ?? '');
    const after = String(next ?? '');
    if (!before.includes('[[]]') || !after.includes('[[]]')) return null;
    const diff = findSingleInsertion(before, after);
    if (!diff || !isPrintableWikilinkBodyText(diff.inserted)) return null;
    if (`${after.slice(0, diff.start)}${after.slice(diff.end)}` !== before) return null;
    const context = findWikilinkCompletionContext(before, before.indexOf('[[]]') + 2);
    return insertPrintableIntoWikilinkContext(before, context, diff.inserted);
}

export function isTextOffsetInsideEmptyWikilinkBody(value, offset) {
    const text = String(value ?? '');
    const position = normalizeOffset(offset, text.length);
    if (position == null) return false;
    const index = text.indexOf('[[]]');
    return index >= 0 && position === index + 2;
}

function withContext(transaction) {
    return { ...transaction, context: findWikilinkCompletionContext(transaction.value, transaction.selectionStart) };
}

function findSingleInsertion(before, after) {
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
    if (!inserted) return null;
    return { start, end: afterEnd, inserted };
}

function normalizeOffset(value, length) {
    const offset = Number(value);
    if (!Number.isFinite(offset)) return null;
    return Math.max(0, Math.min(offset, length));
}

function isPrintableWikilinkBodyText(value) {
    if (typeof value !== 'string' || !value) return false;
    if (value === '[' || value === ']') return false;
    if (/[\r\n]/.test(value)) return false;
    return Array.from(value).length === 1;
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

function isInsideFencedCode(text, position) {
    const before = text.slice(0, position).split(/\r\n|\r|\n/);
    let fence = null;
    for (const line of before) {
        const match = line.match(/^\s*(```+|~~~+)/);
        if (!match) continue;
        const marker = match[1][0];
        if (!fence) fence = marker;
        else if (fence === marker) fence = null;
    }
    return Boolean(fence);
}

function isInsideInlineCode(text, position) {
    const lineStart = Math.max(text.lastIndexOf('\n', position - 1), text.lastIndexOf('\r', position - 1)) + 1;
    const prefix = text.slice(lineStart, position);
    let count = 0;
    for (let index = 0; index < prefix.length; index += 1) {
        if (prefix[index] !== '`') continue;
        if (index > 0 && prefix[index - 1] === '\\') continue;
        count += 1;
    }
    return count % 2 === 1;
}
