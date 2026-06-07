import * as vscode from 'vscode';
import type { Handler } from '@/common/handler';

export class DocxCustomDocument implements vscode.CustomDocument {
    public handler?: Handler;
    public webviewPanel?: vscode.WebviewPanel;
    public initialBuffer?: Uint8Array;
    public isDirty = false;

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
