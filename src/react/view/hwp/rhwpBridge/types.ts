export const DEFAULT_RHWP_REQUEST_TIMEOUT_MS = 120000;
export const DEFAULT_RHWP_READY_TIMEOUT_MS = 90000;

export type HwpLoadStatusPayload =
    | { status: 'loading' }
    | { status: 'loaded'; pageCount?: number }
    | { status: 'warning'; message: string }
    | { status: 'failed'; message: string };

export interface SecureRhwpEditorOptions {
    studioUrl?: string;
    studioHtml?: string;
    studioBaseUrl?: string;
    expectedOrigin?: string;
    expectedOrigins?: string[];
    targetOrigin?: string;
    width: string;
    height: string;
    requestTimeoutMs?: number;
    readyTimeoutMs?: number;
    onLoadStatus?: (status: HwpLoadStatusPayload) => void;
}

export interface SecureRhwpEditor {
    loadFile(data: Uint8Array, fileName: string): Promise<unknown | undefined>;
    exportHwp(): Promise<ArrayBuffer | Uint8Array | number[]>;
    exportHwpx(): Promise<ArrayBuffer | Uint8Array | number[]>;
    pageCount(): Promise<number>;
    getPageSvg(page: number): Promise<string>;
    setDebugOverlay(enabled: boolean): Promise<unknown>;
    markClean(): Promise<unknown>;
    destroy(): void;
}

export interface RhwpResponse {
    type: 'rhwp-response';
    id: number;
    token?: string;
    error?: string;
    result?: unknown;
}
