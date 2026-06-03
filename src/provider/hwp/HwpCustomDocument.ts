import * as vscode from 'vscode';
import type { Handler } from '@/common/handler';
import type { HwpMode } from '@/common/hwpMessageSchema';

export class HwpCustomDocument implements vscode.CustomDocument {
    public handler?: Handler;
    public webviewPanel?: vscode.WebviewPanel;
    public initialBuffer?: Uint8Array;
    public isDirty = false;
    public mode: HwpMode = 'viewer';

    constructor(
        public readonly uri: vscode.Uri,
        initialBuffer?: Uint8Array,
    ) {
        this.initialBuffer = initialBuffer;
    }

    dispose(): void {
        this.handler = undefined;
        this.webviewPanel = undefined;
        this.initialBuffer = undefined;
    }
}
