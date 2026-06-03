import type { RenderedHwpPage } from './hwpTypes';

export interface HwpViewerSearchMatch {
    pageNumber: number;
    text: string;
    matchId?: string;
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
        try {
            const parsed = parseSvg(page.svg);
            const textElements = getSearchableSvgTextElements(parsed);
            return textElements.flatMap((element, elementIndex) => {
                const text = element.textContent ?? '';
                const occurrenceCount = countOccurrences(normalizeSearchText(text), normalizedQuery);
                return Array.from({ length: occurrenceCount }, (_, occurrenceIndex) => ({
                    pageNumber: page.pageNumber,
                    text,
                    matchId: getViewerSearchMatchId(page.pageNumber, elementIndex, occurrenceIndex),
                }));
            });
        } catch {
            const text = extractSvgText(page.svg);
            const occurrenceCount = countOccurrences(normalizeSearchText(text), normalizedQuery);
            return Array.from({ length: occurrenceCount }, (_, occurrenceIndex) => ({
                pageNumber: page.pageNumber,
                text,
                matchId: getViewerSearchMatchId(page.pageNumber, 0, occurrenceIndex),
            }));
        }
    });
}

export function decorateSvgSearchHits(svg: string, query: string, pageNumber: number, activeMatchId?: string): string {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return svg;
    try {
        const parsed = parseSvg(svg);
        const textElements = getSearchableSvgTextElements(parsed);
        textElements.forEach((element, elementIndex) => {
            const text = normalizeSearchText(element.textContent ?? '');
            const occurrenceCount = countOccurrences(text, normalizedQuery);
            if (occurrenceCount === 0) return;
            const isActive = Array.from({ length: occurrenceCount }).some((_, occurrenceIndex) => (
                getViewerSearchMatchId(pageNumber, elementIndex, occurrenceIndex) === activeMatchId
            ));
            markSvgSearchHit(element, isActive);
        });
        return new XMLSerializer().serializeToString(parsed.documentElement);
    } catch {
        return svg;
    }
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

export function handleRhwpEditorFindEnter(container: HTMLElement | null, event: KeyboardEvent): boolean {
    if (!isPlainFindEnter(event) || !container) return false;
    const controls = findRhwpEditorFindControls(container);
    if (!controls) return false;
    stopShortcutPropagation(event);
    dispatchRhwpCommand(event.shiftKey ? controls.previousButton : controls.nextButton);
    controls.input?.focus();
    return true;
}

export function closeRhwpEditorFind(container: HTMLElement | null): boolean {
    if (!container) return false;
    const root = container.querySelector<HTMLElement>('.rhwp-local-studio') ?? container;
    const controls = findRhwpEditorFindControls(container);
    const dialogRoot = controls?.dialogRoot;
    const closeButton = dialogRoot
        ? Array.from(dialogRoot.querySelectorAll<HTMLElement>('button')).find((button) => {
            const label = [
                button.textContent,
                button.getAttribute('aria-label'),
                button.getAttribute('title'),
            ].join(' ').trim().toLocaleLowerCase();
            return label === 'x' || label === '×' || label.includes('close') || label.includes('닫기');
        })
        : undefined;
    if (closeButton) {
        dispatchRhwpCommand(closeButton);
        return true;
    }
    return root.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
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

function isPlainFindEnter(event: KeyboardEvent): boolean {
    return event.key === 'Enter'
        && !event.altKey
        && !event.ctrlKey
        && !event.metaKey
        && !event.isComposing;
}

function findRhwpEditorFindControls(container: HTMLElement): {
    root: HTMLElement;
    dialogRoot?: HTMLElement;
    input?: HTMLInputElement;
    previousButton: HTMLElement;
    nextButton: HTMLElement;
} | undefined {
    const root = container.querySelector<HTMLElement>('.rhwp-local-studio') ?? container;
    const buttons = Array.from(root.querySelectorAll<HTMLElement>('button'));
    const previousButton = findButtonByLabel(buttons, ['이전 찾기', 'find previous', 'previous find']);
    const nextButton = findButtonByLabel(buttons, ['다음 찾기', 'find next', 'next find']);
    if (!previousButton || !nextButton) return undefined;
    const dialogRoot = findSharedFindDialogRoot(root, previousButton, nextButton);
    return {
        root,
        dialogRoot,
        input: dialogRoot?.querySelector<HTMLInputElement>('input[type="text"], input:not([type]), textarea') ?? undefined,
        previousButton,
        nextButton,
    };
}

function findButtonByLabel(buttons: HTMLElement[], labels: string[]): HTMLElement | undefined {
    return buttons.find((button) => {
        const label = [
            button.textContent,
            button.getAttribute('aria-label'),
            button.getAttribute('title'),
        ].join(' ').toLocaleLowerCase();
        return labels.some((candidate) => label.includes(candidate));
    });
}

function findSharedFindDialogRoot(root: HTMLElement, previousButton: HTMLElement, nextButton: HTMLElement): HTMLElement | undefined {
    let current: HTMLElement | null = nextButton.parentElement;
    while (current && current !== root) {
        const text = current.textContent?.toLocaleLowerCase() ?? '';
        if (current.contains(previousButton) && current.querySelector('input, textarea') && (text.includes('찾기') || text.includes('find'))) {
            return current;
        }
        current = current.parentElement;
    }
    return root;
}

function extractSvgText(svg: string): string {
    try {
        const parsed = parseSvg(svg);
        return parsed.documentElement.textContent ?? '';
    } catch {
        return svg.replace(/<[^>]*>/g, ' ');
    }
}

function normalizeSearchText(value: string): string {
    return value.trim().toLocaleLowerCase();
}

function parseSvg(svg: string): Document {
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
    if (parsed.querySelector('parsererror')) throw new Error('Invalid SVG');
    return parsed;
}

function getSearchableSvgTextElements(parsed: Document): Element[] {
    const elements = Array.from(parsed.querySelectorAll('text, tspan'));
    const leafElements = elements.filter((element) => !element.querySelector('text, tspan'));
    return leafElements.length > 0 ? leafElements : elements;
}

function countOccurrences(text: string, query: string): number {
    if (!text || !query) return 0;
    let count = 0;
    let start = 0;
    while (start <= text.length) {
        const index = text.indexOf(query, start);
        if (index < 0) break;
        count += 1;
        start = index + Math.max(query.length, 1);
    }
    return count;
}

function getViewerSearchMatchId(pageNumber: number, elementIndex: number, occurrenceIndex: number): string {
    return `${pageNumber}:${elementIndex}:${occurrenceIndex}`;
}

function markSvgSearchHit(element: Element, active: boolean): void {
    element.setAttribute('data-hwp-search-hit', 'true');
    if (active) element.setAttribute('data-hwp-search-active', 'true');
    const existingStyle = element.getAttribute('style') ?? '';
    const highlightStyle = active
        ? 'fill:rgb(194,65,12);paint-order:stroke;stroke:rgba(255,224,102,.98);stroke-width:7px;stroke-linejoin:round;filter:drop-shadow(0 0 4px rgba(255,145,0,.85));'
        : 'fill:rgb(120,53,15);paint-order:stroke;stroke:rgba(255,214,10,.75);stroke-width:5px;stroke-linejoin:round;';
    element.setAttribute('style', `${existingStyle};${highlightStyle}`);
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
