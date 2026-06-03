export const HWP_EVENTS = {
    init: 'hwp:init',
    fileData: 'hwp:fileData',
    requestSave: 'hwp:requestSave',
    saveResult: 'hwp:saveResult',
    dirtyChanged: 'hwp:dirtyChanged',
    nativeSave: 'hwp:nativeSave',
    vscodeSave: 'hwp:vscodeSave',
    vscodeSavePayload: 'hwp:vscodeSavePayload',
    modeChangeRequest: 'hwp:modeChangeRequest',
    modeChanged: 'hwp:modeChanged',
    viewerCommandRequest: 'hwp:viewerCommandRequest',
    viewerCommand: 'hwp:viewerCommand',
    viewerCommandResult: 'hwp:viewerCommandResult',
    reloadFile: 'hwp:reloadFile',
    error: 'hwp:error',
} as const;

export type HwpEventName = typeof HWP_EVENTS[keyof typeof HWP_EVENTS];
export type HwpMode = 'viewer' | 'editor';
export type HwpViewerCommand = 'exportSvg' | 'exportPdf' | 'debugOverlay' | 'dumpParagraph';

export interface HwpPdfPagePayload {
    pageNumber: number;
    pngBase64: string;
    width: number;
    height: number;
}

export interface HwpFileDataPayload {
    fileName: string;
    buffer: number[];
    fileSize: number;
    isHwpx: boolean;
    studioHtml?: string;
    studioBaseUrl?: string;
    error?: string;
}

export interface HwpSavePayload {
    bytes: number[];
    sourceFileName: string;
    isHwpx: boolean;
    format: 'hwp' | 'hwpx';
}

export interface HwpSaveResultPayload {
    success: boolean;
    savedPath?: string;
    convertedFromHwpx?: boolean;
    format?: 'hwp' | 'hwpx';
    error?: string;
}

export interface HwpDirtyChangedPayload {
    isDirty: boolean;
}

export interface HwpVscodeSaveRequestPayload {
    requestId: string;
    format: 'hwp' | 'hwpx';
}

export interface HwpVscodeSaveResponsePayload {
    requestId: string;
    success: boolean;
    bytes?: number[];
    sourceFileName?: string;
    isHwpx?: boolean;
    format?: 'hwp' | 'hwpx';
    error?: string;
}

export interface HwpErrorPayload {
    error: string;
}

export interface HwpModePayload {
    mode: HwpMode;
}

export interface HwpViewerCommandPayload {
    requestId: string;
    command: HwpViewerCommand;
}

export interface HwpViewerCommandRequestPayload {
    command: HwpViewerCommand;
}

export interface HwpViewerCommandResultPayload {
    requestId: string;
    command: HwpViewerCommand;
    success: boolean;
    svgs?: string[];
    pngs?: HwpPdfPagePayload[];
    error?: string;
}

const HWP_EVENT_VALUES = new Set<string>(Object.values(HWP_EVENTS));

export function isHwpEvent(value: unknown): value is HwpEventName {
    return typeof value === 'string' && HWP_EVENT_VALUES.has(value);
}

export function validateHwpPayload(type: HwpEventName, payload: unknown): boolean {
    switch (type) {
        case HWP_EVENTS.init:
            return payload === undefined || isEmptyObject(payload);
        case HWP_EVENTS.fileData:
            return isHwpFileDataPayload(payload);
        case HWP_EVENTS.requestSave:
            return isHwpSavePayload(payload);
        case HWP_EVENTS.saveResult:
            return isHwpSaveResultPayload(payload);
        case HWP_EVENTS.dirtyChanged:
            return isHwpDirtyChangedPayload(payload);
        case HWP_EVENTS.nativeSave:
            return payload === undefined || isEmptyObject(payload);
        case HWP_EVENTS.vscodeSave:
            return isHwpVscodeSaveRequestPayload(payload);
        case HWP_EVENTS.vscodeSavePayload:
            return isHwpVscodeSaveResponsePayload(payload);
        case HWP_EVENTS.modeChangeRequest:
        case HWP_EVENTS.modeChanged:
            return isHwpModePayload(payload);
        case HWP_EVENTS.viewerCommand:
            return isHwpViewerCommandPayload(payload);
        case HWP_EVENTS.viewerCommandRequest:
            return isHwpViewerCommandRequestPayload(payload);
        case HWP_EVENTS.viewerCommandResult:
            return isHwpViewerCommandResultPayload(payload);
        case HWP_EVENTS.reloadFile:
            return isHwpFileDataPayload(payload);
        case HWP_EVENTS.error:
            return isHwpErrorPayload(payload);
        default:
            return false;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEmptyObject(value: unknown): boolean {
    return isRecord(value) && Object.keys(value).length === 0;
}

function isByteArray(value: unknown): value is number[] {
    return Array.isArray(value) && value.every((item) =>
        Number.isInteger(item) && item >= 0 && item <= 255
    );
}

function isHwpFileDataPayload(value: unknown): value is HwpFileDataPayload {
    if (!isRecord(value)) return false;
    return typeof value.fileName === 'string'
        && isByteArray(value.buffer)
        && typeof value.fileSize === 'number'
        && value.fileSize >= 0
        && typeof value.isHwpx === 'boolean'
        && (value.studioHtml === undefined || typeof value.studioHtml === 'string')
        && (value.studioBaseUrl === undefined || typeof value.studioBaseUrl === 'string')
        && (value.error === undefined || typeof value.error === 'string');
}

function isHwpSavePayload(value: unknown): value is HwpSavePayload {
    if (!isRecord(value)) return false;
    return isByteArray(value.bytes)
        && value.bytes.length > 0
        && typeof value.sourceFileName === 'string'
        && typeof value.isHwpx === 'boolean'
        && (value.format === 'hwp' || value.format === 'hwpx');
}

function isHwpSaveResultPayload(value: unknown): value is HwpSaveResultPayload {
    if (!isRecord(value)) return false;
    return typeof value.success === 'boolean'
        && (value.savedPath === undefined || typeof value.savedPath === 'string')
        && (value.convertedFromHwpx === undefined || typeof value.convertedFromHwpx === 'boolean')
        && (value.format === undefined || value.format === 'hwp' || value.format === 'hwpx')
        && (value.error === undefined || typeof value.error === 'string');
}

function isHwpDirtyChangedPayload(value: unknown): value is HwpDirtyChangedPayload {
    return isRecord(value) && typeof value.isDirty === 'boolean';
}

function isHwpVscodeSaveRequestPayload(value: unknown): value is HwpVscodeSaveRequestPayload {
    if (!isRecord(value)) return false;
    return typeof value.requestId === 'string'
        && (value.format === 'hwp' || value.format === 'hwpx');
}

function isHwpVscodeSaveResponsePayload(value: unknown): value is HwpVscodeSaveResponsePayload {
    if (!isRecord(value)) return false;
    if (typeof value.requestId !== 'string' || typeof value.success !== 'boolean') return false;
    if (value.success) {
        return isByteArray(value.bytes)
            && value.bytes.length > 0
            && typeof value.sourceFileName === 'string'
            && typeof value.isHwpx === 'boolean'
            && (value.format === 'hwp' || value.format === 'hwpx');
    }
    return value.error === undefined || typeof value.error === 'string';
}

function isHwpErrorPayload(value: unknown): value is HwpErrorPayload {
    return isRecord(value) && typeof value.error === 'string';
}

function isHwpModePayload(value: unknown): value is HwpModePayload {
    return isRecord(value) && isHwpMode(value.mode);
}

function isHwpMode(value: unknown): value is HwpMode {
    return value === 'viewer' || value === 'editor';
}

function isHwpViewerCommandPayload(value: unknown): value is HwpViewerCommandPayload {
    return isRecord(value)
        && typeof value.requestId === 'string'
        && isHwpViewerCommand(value.command);
}

function isHwpViewerCommandRequestPayload(value: unknown): value is HwpViewerCommandRequestPayload {
    return isRecord(value) && isHwpViewerCommand(value.command);
}

function isHwpViewerCommand(value: unknown): value is HwpViewerCommand {
    return value === 'exportSvg' || value === 'exportPdf' || value === 'debugOverlay' || value === 'dumpParagraph';
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isHwpPdfPagePayload(value: unknown): value is HwpPdfPagePayload {
    if (!isRecord(value)) return false;
    return typeof value.pageNumber === 'number'
        && Number.isInteger(value.pageNumber)
        && value.pageNumber > 0
        && typeof value.pngBase64 === 'string'
        && value.pngBase64.length > 0
        && typeof value.width === 'number'
        && Number.isFinite(value.width)
        && value.width > 0
        && typeof value.height === 'number'
        && Number.isFinite(value.height)
        && value.height > 0;
}

function isHwpPdfPagePayloadArray(value: unknown): value is HwpPdfPagePayload[] {
    return Array.isArray(value) && value.every(isHwpPdfPagePayload);
}

function isHwpViewerCommandResultPayload(value: unknown): value is HwpViewerCommandResultPayload {
    if (!isRecord(value)) return false;
    if (typeof value.requestId !== 'string'
        || !isHwpViewerCommand(value.command)
        || typeof value.success !== 'boolean') {
        return false;
    }
    if (value.success) {
        if (value.command === 'exportPdf') {
            return isHwpPdfPagePayloadArray(value.pngs) && value.pngs.length > 0;
        }
        return isStringArray(value.svgs) && value.svgs.length > 0;
    }
    return value.error === undefined || typeof value.error === 'string';
}
