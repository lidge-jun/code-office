import { readFileSync } from 'fs';
import * as vscode from 'vscode';
import { getCodeOfficeSetting } from './hwpSettings';

const DEFAULT_RHWP_STUDIO_URL = '';

export interface RhwpStudioConfig {
    rhwpStudioUrl?: string;
    rhwpStudioHtml?: string;
    rhwpStudioBaseUrl?: string;
    webviewFrameSources: string[];
    webviewConnectSources: string[];
}

export function getRhwpStudioConfig(
    webview: vscode.Webview,
    rhwpStudioRoot: vscode.Uri,
): RhwpStudioConfig {
    const configured = getCodeOfficeSetting<string>('hwp.studioUrl', DEFAULT_RHWP_STUDIO_URL)?.trim();
    if (!configured) {
        return getBundledRhwpStudioConfig(webview, rhwpStudioRoot);
    }
    try {
        const rhwpStudioUrl = new URL(configured).toString();
        return {
            rhwpStudioUrl,
            webviewFrameSources: [rhwpStudioUrl],
            webviewConnectSources: [rhwpStudioUrl],
        };
    } catch {
        void vscode.window.showWarningMessage('Invalid code-office.hwp.studioUrl. Falling back to bundled rhwp-studio.');
        return getBundledRhwpStudioConfig(webview, rhwpStudioRoot);
    }
}

function getBundledRhwpStudioConfig(webview: vscode.Webview, rhwpStudioRoot: vscode.Uri): RhwpStudioConfig {
    const indexUri = vscode.Uri.joinPath(rhwpStudioRoot, 'index.html');
    const baseUrl = webview.asWebviewUri(rhwpStudioRoot).toString();
    return {
        rhwpStudioHtml: readFileSync(indexUri.fsPath, 'utf8'),
        rhwpStudioBaseUrl: baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
        webviewFrameSources: [],
        webviewConnectSources: [],
    };
}
