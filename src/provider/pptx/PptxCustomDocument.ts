import * as vscode from 'vscode';
import type { Handler } from '@/common/handler';

export class PptxCustomDocument implements vscode.CustomDocument {
    public handler?: Handler;
    public webviewPanel?: vscode.WebviewPanel;
    public isDirty = false;

    constructor(
        public readonly uri: vscode.Uri,
    ) {}

    dispose(): void {
        this.handler = undefined;
        this.webviewPanel = undefined;
    }
}
