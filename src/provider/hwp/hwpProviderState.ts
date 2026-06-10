import type {
    HwpViewerCommand,
    HwpViewerCommandResultPayload,
    HwpVscodeSaveResponsePayload,
} from '@/common/hwpMessageSchema';

export const HWP_EDITOR_VIEW_TYPE = 'cweijan.hwpEditor';
export const HWP_EXPORT_TIMEOUT_MS = 120000;
export const HWP_VIEWER_COMMAND_TIMEOUT_MS = 120000;
export const HWP_LAST_MODE_STORAGE_KEY = 'code-office.hwp.lastMode';

export interface PendingHwpExport {
    documentUri: string;
    resolve: (payload: HwpVscodeSaveResponsePayload) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
}

export interface PendingHwpViewerCommand {
    documentUri: string;
    command: HwpViewerCommand;
    resolve: (payload: HwpViewerCommandResultPayload) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
}
