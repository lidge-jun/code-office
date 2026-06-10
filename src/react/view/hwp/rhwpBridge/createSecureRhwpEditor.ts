import { validateRhwpResponse } from './validateRhwpMessage';
import { buildSrcdocHtml, resolveStudioResourceUrl } from './localStudioResources';
import {
    DEFAULT_RHWP_READY_TIMEOUT_MS,
    DEFAULT_RHWP_REQUEST_TIMEOUT_MS,
    type SecureRhwpEditor,
    type SecureRhwpEditorOptions,
} from './types';

interface PendingRequest {
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
    timeout: number;
}

interface RawRhwpBridge {
    ready(): Promise<boolean>;
    loadFile(payload: { data: number[]; fileName: string; skipUnsavedGuard: boolean }): Promise<unknown>;
    exportHwp(): Promise<ArrayBuffer | Uint8Array | number[]>;
    exportHwpx(): Promise<ArrayBuffer | Uint8Array | number[]>;
    pageCount(): Promise<number>;
    getPageSvg(payload: { page: number }): Promise<string>;
    setDebugOverlay(payload: { enabled: boolean }): Promise<unknown>;
    markClean(): Promise<unknown>;
}

declare global {
    interface Window {
        __rhwpBridge?: RawRhwpBridge;
    }
}

export async function createSecureRhwpEditor(
    container: HTMLElement,
    options: SecureRhwpEditorOptions,
): Promise<SecureRhwpEditor> {
    if (options.studioHtml) {
        return await createLocalRhwpEditor(container, options);
    }
    return await createIframeRhwpEditor(container, options);
}

async function createLocalRhwpEditor(
    container: HTMLElement,
    options: SecureRhwpEditorOptions,
): Promise<SecureRhwpEditor> {
    const mount = document.createElement('div');
    const cleanup: Array<() => void> = [];
    const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_RHWP_REQUEST_TIMEOUT_MS;
    const readyTimeoutMs = options.readyTimeoutMs ?? DEFAULT_RHWP_READY_TIMEOUT_MS;
    let destroyed = false;

    mount.className = 'rhwp-local-studio';
    mount.style.width = options.width;
    mount.style.height = options.height;
    container.replaceChildren(mount);

    try {
        await mountLocalStudio(mount, options.studioHtml ?? '', options.studioBaseUrl, cleanup);
        const bridge = await waitForLocalBridge(readyTimeoutMs);

        const request = async (
            method: string,
            params: Record<string, unknown> = {},
            timeoutMs = requestTimeoutMs,
        ): Promise<unknown> => {
            if (destroyed) throw new Error('Editor destroyed');
            return await withTimeout(callLocalBridge(bridge, method, params), method, timeoutMs);
        };

        return {
            async loadFile(data: Uint8Array, fileName: string): Promise<unknown | undefined> {
                return await loadDocument(request, data, fileName, options);
            },
            async exportHwp(): Promise<ArrayBuffer | Uint8Array | number[]> {
                return await request('exportHwp') as ArrayBuffer | Uint8Array | number[];
            },
            async exportHwpx(): Promise<ArrayBuffer | Uint8Array | number[]> {
                return await request('exportHwpx') as ArrayBuffer | Uint8Array | number[];
            },
            async pageCount(): Promise<number> {
                return await request('pageCount') as number;
            },
            async getPageSvg(page: number): Promise<string> {
                return await request('getPageSvg', { page }) as string;
            },
            async setDebugOverlay(enabled: boolean): Promise<unknown> {
                return await request('setDebugOverlay', { enabled });
            },
            async markClean(): Promise<unknown> {
                return await request('markClean');
            },
            destroy(): void {
                destroyed = true;
                cleanup.splice(0).reverse().forEach((dispose) => dispose());
                mount.remove();
            },
        };
    } catch (error) {
        cleanup.splice(0).reverse().forEach((dispose) => dispose());
        mount.remove();
        throw error;
    }
}

async function createIframeRhwpEditor(
    container: HTMLElement,
    options: SecureRhwpEditorOptions,
): Promise<SecureRhwpEditor> {
    const iframe = document.createElement('iframe');
    const expectedOrigin = options.expectedOrigin ?? resolveExpectedOrigin(options);
    const expectedOrigins = new Set(options.expectedOrigins ?? resolveExpectedOrigins(options, expectedOrigin));
    const targetOrigin = options.targetOrigin ?? resolveTargetOrigin(options, expectedOrigin);
    const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_RHWP_REQUEST_TIMEOUT_MS;
    const readyTimeoutMs = options.readyTimeoutMs ?? DEFAULT_RHWP_READY_TIMEOUT_MS;
    const bridgeToken = createBridgeToken();
    const pending = new Map<number, PendingRequest>();
    let requestId = 0;
    let destroyed = false;

    iframe.style.width = options.width;
    iframe.style.height = options.height;
    iframe.style.border = '0';
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write; fullscreen');
    iframe.setAttribute('sandbox', [
        'allow-scripts',
        'allow-same-origin',
        'allow-forms',
        'allow-downloads',
        'allow-modals',
        'allow-popups',
        'allow-popups-to-escape-sandbox',
    ].join(' '));
    if (options.studioUrl) {
        iframe.src = options.studioUrl;
    } else {
        throw new Error('Missing rhwp-studio URL');
    }

    function onMessage(event: MessageEvent): void {
        if (event.source !== iframe.contentWindow) return;
        if (!expectedOrigins.has(event.origin)) return;

        const message = validateRhwpResponse(event.data);
        if (!message) return;
        if (message.token !== undefined && message.token !== bridgeToken) return;

        const pendingRequest = pending.get(message.id);
        if (!pendingRequest) return;

        window.clearTimeout(pendingRequest.timeout);
        pending.delete(message.id);

        if (message.error) {
            pendingRequest.reject(new Error(message.error));
            return;
        }
        pendingRequest.resolve(message.result);
    }

    function request(method: string, params: Record<string, unknown> = {}, timeoutMs = requestTimeoutMs): Promise<unknown> {
        if (destroyed) return Promise.reject(new Error('Editor destroyed'));
        return requestPostMessage(method, params, timeoutMs);
    }

    function requestPostMessage(
        method: string,
        params: Record<string, unknown>,
        timeoutMs: number,
    ): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const id = ++requestId;
            const timeout = window.setTimeout(() => {
                pending.delete(id);
                reject(new Error(`Request timeout: ${method}`));
            }, timeoutMs);

            pending.set(id, { resolve, reject, timeout });
            iframe.contentWindow?.postMessage({ type: 'rhwp-request', id, token: bridgeToken, method, params }, targetOrigin);
        });
    }

    async function waitReady(): Promise<void> {
        const deadline = Date.now() + readyTimeoutMs;
        while (Date.now() < deadline) {
            try {
                if (await request('ready', {}, 1000)) return;
            } catch {
                // Retry while rhwp-studio initializes its WASM runtime.
            }
            await new Promise((resolve) => window.setTimeout(resolve, 500));
        }
        throw new Error(`Editor initialization timeout after ${Math.round(readyTimeoutMs / 1000)}s`);
    }

    window.addEventListener('message', onMessage);
    await waitForIframeLoad(iframe, container);
    await waitReady();

    return {
        async loadFile(data: Uint8Array, fileName: string): Promise<unknown | undefined> {
            return await loadDocument(request, data, fileName, options);
        },
        async exportHwp(): Promise<ArrayBuffer | Uint8Array | number[]> {
            return await request('exportHwp') as ArrayBuffer | Uint8Array | number[];
        },
        async exportHwpx(): Promise<ArrayBuffer | Uint8Array | number[]> {
            return await request('exportHwpx') as ArrayBuffer | Uint8Array | number[];
        },
        async pageCount(): Promise<number> {
            return await request('pageCount') as number;
        },
        async getPageSvg(page: number): Promise<string> {
            return await request('getPageSvg', { page }) as string;
        },
        async setDebugOverlay(enabled: boolean): Promise<unknown> {
            return await request('setDebugOverlay', { enabled });
        },
        async markClean(): Promise<unknown> {
            return await request('markClean');
        },
        destroy(): void {
            destroyed = true;
            window.removeEventListener('message', onMessage);
            pending.forEach((pendingRequest) => {
                window.clearTimeout(pendingRequest.timeout);
                pendingRequest.reject(new Error('Editor destroyed'));
            });
            pending.clear();
            iframe.remove();
        },
    };
}

async function loadDocument(
    request: (method: string, params?: Record<string, unknown>) => Promise<unknown>,
    data: Uint8Array,
    fileName: string,
    options: SecureRhwpEditorOptions,
): Promise<unknown | undefined> {
    options.onLoadStatus?.({ status: 'loading' });
    try {
        const result = await request('loadFile', { data: Array.from(data), fileName, skipUnsavedGuard: true });
        const pageCount = getPageCount(result);
        options.onLoadStatus?.(pageCount === undefined ? { status: 'loaded' } : { status: 'loaded', pageCount });
        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('timeout')) {
            options.onLoadStatus?.({ status: 'warning', message });
            return undefined;
        }
        options.onLoadStatus?.({ status: 'failed', message });
        throw error;
    }
}

function waitForIframeLoad(iframe: HTMLIFrameElement, container: HTMLElement): Promise<void> {
    return new Promise((resolve, reject) => {
        iframe.onload = () => resolve();
        iframe.onerror = () => reject(new Error('Failed to load rhwp-studio iframe'));
        container.appendChild(iframe);
    });
}

function resolveExpectedOrigin(options: SecureRhwpEditorOptions): string {
    if (options.studioUrl) return new URL(options.studioUrl).origin;
    if (options.studioHtml) return window.location.origin;
    throw new Error('Missing rhwp-studio URL or HTML');
}

function resolveExpectedOrigins(options: SecureRhwpEditorOptions, expectedOrigin: string): string[] {
    const origins = [expectedOrigin];
    if (options.studioHtml || isVsCodeWebviewUrl(options.studioUrl)) {
        origins.push('null');
    }
    return origins;
}

function resolveTargetOrigin(options: SecureRhwpEditorOptions, expectedOrigin: string): string {
    return options.studioHtml || isVsCodeWebviewUrl(options.studioUrl) ? '*' : expectedOrigin;
}

function isVsCodeWebviewUrl(value?: string): boolean {
    if (!value) return false;
    try {
        const protocol = new URL(value).protocol;
        return protocol === 'vscode-webview:' || protocol === 'vscode-resource:';
    } catch {
        return false;
    }
}

function createBridgeToken(): string {
    try {
        const values = new Uint32Array(4);
        window.crypto.getRandomValues(values);
        return Array.from(values, (value) => value.toString(16).padStart(8, '0')).join('');
    } catch {
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
}

function getPageCount(value: unknown): number | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const record = value as Record<string, unknown>;
    return typeof record.pageCount === 'number' ? record.pageCount : undefined;
}

async function mountLocalStudio(
    mount: HTMLElement,
    html: string,
    baseUrl: string | undefined,
    cleanup: Array<() => void>,
): Promise<void> {
    const documentHtml = buildSrcdocHtml(html, baseUrl);
    const parsed = new DOMParser().parseFromString(documentHtml, 'text/html');
    const fragment = document.createDocumentFragment();

    Array.from(parsed.body.childNodes).forEach((node) => {
        fragment.appendChild(document.importNode(node, true));
    });
    mount.appendChild(fragment);

    const overrideStyle = document.createElement('style');
    overrideStyle.textContent = [
        '.hwp-editor .rhwp-local-studio,',
        '.hwp-editor .rhwp-local-studio #studio-root { width: 100%; height: 100%; }',
        '.hwp-editor .rhwp-local-studio { overflow: hidden; }',
    ].join('\n');
    document.head.appendChild(overrideStyle);
    cleanup.push(() => overrideStyle.remove());

    const stylesheets = Array.from(parsed.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
    for (const stylesheet of stylesheets) {
        const href = stylesheet.getAttribute('href');
        if (!href) continue;
        await appendStylesheet(resolveStudioResourceUrl(href, baseUrl), cleanup);
    }

    if (baseUrl) cleanup.push(installLocalStudioFetchRewrite(baseUrl));
    const scripts = Array.from(parsed.head.querySelectorAll<HTMLScriptElement>('script[src]'));
    for (const script of scripts) {
        const src = script.getAttribute('src');
        if (!src) continue;
        await appendScript(resolveStudioResourceUrl(src, baseUrl), script.type, cleanup);
    }
}

function appendStylesheet(href: string, cleanup: Array<() => void>): Promise<void> {
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to load rhwp-studio stylesheet: ${href}`));
        document.head.appendChild(link);
        cleanup.push(() => link.remove());
    });
}

function appendScript(src: string, type: string, cleanup: Array<() => void>): Promise<void> {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        if (type) script.type = type;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load rhwp-studio script: ${src}`));
        document.body.appendChild(script);
        cleanup.push(() => script.remove());
    });
}

function installLocalStudioFetchRewrite(baseUrl: string): () => void {
    const originalFetch = window.fetch;
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const rewritten = rewriteLocalStudioFetchInput(input, baseUrl);
        return originalFetch.call(window, rewritten, init);
    }) as typeof window.fetch;
    return () => {
        window.fetch = originalFetch;
    };
}

function rewriteLocalStudioFetchInput(input: RequestInfo | URL, baseUrl: string): RequestInfo | URL {
    const value = getFetchInputUrl(input);
    const rewrittenUrl = value ? rewriteLocalStudioAssetUrl(value, baseUrl) : undefined;
    if (!rewrittenUrl) return input;
    if (typeof input === 'string') return rewrittenUrl;
    if (input instanceof URL) return new URL(rewrittenUrl);
    if (typeof Request !== 'undefined' && input instanceof Request) return new Request(rewrittenUrl, input);
    return input;
}

function getFetchInputUrl(input: RequestInfo | URL): string | undefined {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
    return undefined;
}

function rewriteLocalStudioAssetUrl(value: string, baseUrl: string): string | undefined {
    try {
        const url = new URL(value, window.location.href);
        const assetMatch = url.pathname.match(/\/assets\/([^/]+\.wasm)$/);
        if (!assetMatch) return undefined;
        const fileName = assetMatch[1];
        if (!/^[A-Za-z0-9._-]+$/.test(fileName)) return undefined;
        const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        return new URL(`assets/${fileName}`, normalizedBase).toString();
    } catch {
        return undefined;
    }
}

async function waitForLocalBridge(timeoutMs: number): Promise<RawRhwpBridge> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const bridge = window.__rhwpBridge;
        if (bridge) {
            try {
                if (await withTimeout(bridge.ready(), 'ready', 1000)) return bridge;
            } catch {
                // Retry while rhwp-studio initializes its WASM runtime.
            }
        }
        await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
    throw new Error(`Editor initialization timeout after ${Math.round(timeoutMs / 1000)}s`);
}

async function callLocalBridge(
    bridge: RawRhwpBridge,
    method: string,
    params: Record<string, unknown>,
): Promise<unknown> {
    switch (method) {
        case 'ready':
            return await bridge.ready();
        case 'loadFile':
            return await bridge.loadFile({
                data: params.data as number[],
                fileName: typeof params.fileName === 'string' ? params.fileName : 'document.hwp',
                skipUnsavedGuard: params.skipUnsavedGuard === true,
            });
        case 'exportHwp':
            return await bridge.exportHwp();
        case 'exportHwpx':
            return await bridge.exportHwpx();
        case 'pageCount':
            return await bridge.pageCount();
        case 'getPageSvg':
            return await bridge.getPageSvg({
                page: typeof params.page === 'number' ? params.page : 0,
            });
        case 'setDebugOverlay':
            return await bridge.setDebugOverlay({ enabled: params.enabled === true });
        case 'markClean':
            return await bridge.markClean();
        default:
            throw new Error(`Unknown local rhwp method: ${method}`);
    }
}

function withTimeout<T>(promise: Promise<T>, method: string, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error(`Request timeout: ${method}`)), timeoutMs);
        promise.then(
            (value) => {
                window.clearTimeout(timeout);
                resolve(value);
            },
            (error) => {
                window.clearTimeout(timeout);
                reject(error);
            },
        );
    });
}
