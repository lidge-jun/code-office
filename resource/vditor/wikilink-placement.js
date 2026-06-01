const DEFAULT_EDGE_RATIO = 0.35;

export function getWikilinkRevealPlacementFromTextOffset(offset, length) {
    const position = Number(offset);
    const size = Number(length);
    if (!Number.isFinite(position) || !Number.isFinite(size) || size < 0) return null;
    if (position <= 0) return 'before';
    if (position >= size) return 'after';
    return null;
}

export function getWikilinkRevealPlacementFromClientX(clientX, left, right, edgeRatio = DEFAULT_EDGE_RATIO) {
    const x = Number(clientX);
    const start = Number(left);
    const end = Number(right);
    const ratio = Number(edgeRatio);
    if (![x, start, end, ratio].every(Number.isFinite) || end <= start || ratio <= 0 || ratio >= 0.5) return null;
    const width = end - start;
    if (x <= start + width * ratio) return 'before';
    if (x >= end - width * ratio) return 'after';
    return null;
}

export function isWikilinkSourceOffset(text, offset) {
    const position = Number(offset);
    if (!Number.isFinite(position)) return false;
    const pattern = /!?\[\[[^\]\r\n]+\]\]/g;
    let match;
    while ((match = pattern.exec(String(text || ''))) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;
        if (position >= start && position <= end) return true;
    }
    return false;
}
