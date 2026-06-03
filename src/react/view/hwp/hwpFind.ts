import type { RenderedHwpPage } from './hwpTypes';

export interface HwpViewerSearchMatch {
    pageNumber: number;
    text: string;
}

export function isFindShortcut(event: KeyboardEvent): boolean {
    return (event.metaKey || event.ctrlKey)
        && !event.altKey
        && event.key.toLowerCase() === 'f';
}

export function stopShortcutPropagation(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
}

export function findViewerTextMatches(pages: RenderedHwpPage[], query: string): HwpViewerSearchMatch[] {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return [];
    return pages.flatMap((page) => {
        const text = extractSvgText(page.svg);
        return normalizeSearchText(text).includes(normalizedQuery)
            ? [{ pageNumber: page.pageNumber, text }]
            : [];
    });
}

export async function findRhwpTextMatches(query: string): Promise<HwpViewerSearchMatch[]> {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return [];
    const bridge = (window as Window & {
        __rhwpBridge?: {
            searchAllText?: (payload: {
                query: string;
                caseSensitive: boolean;
                includeCells: boolean;
            }) => Promise<unknown>;
        };
    }).__rhwpBridge;
    if (!bridge?.searchAllText) return [];
    const result = await bridge.searchAllText({
        query,
        caseSensitive: false,
        includeCells: true,
    });
    return normalizeRhwpSearchResult(result);
}

export function openRhwpEditorFind(container: HTMLElement | null): boolean {
    if (!container) return false;
    const root = container.querySelector<HTMLElement>('.rhwp-local-studio') ?? container;
    const findCommand = root.querySelector<HTMLElement>('[data-cmd="edit:find"]');
    if (findCommand) {
        dispatchRhwpCommand(findCommand);
        return true;
    }
    const findButton = Array.from(root.querySelectorAll('button')).find((button) => {
        const label = [
            button.textContent,
            button.getAttribute('aria-label'),
            button.getAttribute('title'),
        ].join(' ');
        return /\bfind\b/i.test(label) || label.includes('찾기');
    });
    if (findButton instanceof HTMLElement) {
        dispatchRhwpCommand(findButton);
        return true;
    }
    const focusTarget = root.querySelector<HTMLElement>('[contenteditable="true"], textarea, input') ?? root;
    focusTarget.focus();
    return focusTarget.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'f',
        code: 'KeyF',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
    }));
}

function dispatchRhwpCommand(element: HTMLElement): void {
    element.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        button: 0,
    }));
    element.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        button: 0,
    }));
    element.click();
    element.focus();
}

function extractSvgText(svg: string): string {
    try {
        const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
        return parsed.documentElement.textContent ?? '';
    } catch {
        return svg.replace(/<[^>]*>/g, ' ');
    }
}

function normalizeSearchText(value: string): string {
    return value.trim().toLocaleLowerCase();
}

function normalizeRhwpSearchResult(value: unknown): HwpViewerSearchMatch[] {
    const parsed = parseJsonResult(value);
    const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { matches?: unknown }).matches)
            ? (parsed as { matches: unknown[] }).matches
            : [];
    return items.map((item, index) => {
        const record = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {};
        return {
            pageNumber: getSearchPageNumber(record) ?? 1,
            text: getSearchText(record) ?? String(index + 1),
        };
    });
}

function parseJsonResult(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return [];
    }
}

function getSearchPageNumber(record: Record<string, unknown>): number | undefined {
    for (const key of ['pageNumber', 'page', 'pageIndex']) {
        const value = record[key];
        if (typeof value === 'number') return key === 'pageIndex' ? value + 1 : value;
    }
    return undefined;
}

function getSearchText(record: Record<string, unknown>): string | undefined {
    for (const key of ['text', 'preview', 'matchedText', 'content']) {
        const value = record[key];
        if (typeof value === 'string') return value;
    }
    return undefined;
}
