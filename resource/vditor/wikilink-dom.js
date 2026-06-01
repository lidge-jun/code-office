import {
    getWikilinkRevealPlacementFromClientX,
    getWikilinkRevealPlacementFromTextOffset,
    isWikilinkSourceOffset,
} from './wikilink-placement.js';

const OUTSIDE_EDGE_MARGIN = 8;

export function getWikilinkRevealTargetAtEvent(event) {
    const direct = event.target?.closest?.('[data-wikilink]');
    if (direct) {
        const placement = getWikilinkPlacementForSpan(event, direct);
        if (placement) return { span: direct, placement };
    }
    return getAdjacentWikilinkAtPoint(event.clientX, event.clientY);
}

export function isPointInsideWikilinkSource(x, y) {
    const root = document.elementFromPoint?.(x, y)?.closest?.('.vditor-wysiwyg, .vditor-preview, .vditor-ir');
    if (!root) return false;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            return /\[\[[^\]\r\n]+\]\]/.test(node.textContent || '')
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
        }
    });
    while (walker.nextNode()) {
        if (isPointInWikilinkSourceNode(walker.currentNode, x, y)) return true;
    }
    return false;
}

function getWikilinkPlacementForSpan(event, span) {
    const rect = span.getBoundingClientRect?.();
    const visual = rect ? getWikilinkRevealPlacementFromClientX(event.clientX, rect.left, rect.right) : null;
    if (visual) return visual;
    const range = getCaretRangeFromPoint(event.clientX, event.clientY);
    if (!range) return null;
    const node = range.startContainer;
    if (node?.nodeType !== Node.TEXT_NODE || !node.parentElement?.closest?.('[data-wikilink]')) return null;
    return getWikilinkRevealPlacementFromTextOffset(range.startOffset, (node.textContent || '').length);
}

function getAdjacentWikilinkAtPoint(x, y) {
    for (const span of document.querySelectorAll('[data-wikilink]')) {
        const rect = span.getBoundingClientRect?.();
        if (!rect || y < rect.top - 2 || y > rect.bottom + 2) continue;
        if (x >= rect.left - OUTSIDE_EDGE_MARGIN && x <= rect.left) return { span, placement: 'before' };
        if (x >= rect.right && x <= rect.right + OUTSIDE_EDGE_MARGIN) return { span, placement: 'after' };
    }
    return null;
}

function isPointInWikilinkSourceNode(node, x, y) {
    const pattern = /!?\[\[[^\]\r\n]+\]\]/g;
    let match;
    while ((match = pattern.exec(node.textContent || '')) !== null) {
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const hit = [...range.getClientRects()].some(rect => x >= rect.left - 2 && x <= rect.right + 2 && y >= rect.top - 2 && y <= rect.bottom + 2);
        range.detach?.();
        if (hit) return true;
    }
    return false;
}

function getCaretRangeFromPoint(x, y) {
    if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
    const position = document.caretPositionFromPoint?.(x, y);
    if (!position) return null;
    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    range.collapse(true);
    return range;
}

export function isSelectionInsideWikilinkSource() {
    const selection = document.getSelection?.();
    const node = selection?.isCollapsed ? selection.anchorNode : null;
    return node?.nodeType === Node.TEXT_NODE && isWikilinkSourceOffset(node.textContent || '', selection.anchorOffset);
}
