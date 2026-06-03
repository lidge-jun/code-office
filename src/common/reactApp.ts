import * as http from 'http';
import * as fs from 'fs';
import * as vscode from 'vscode';

interface ViewOption {
    route: string;
    rhwpStudioUrl?: string;
    rhwpStudioHtml?: string;
    rhwpStudioBaseUrl?: string;
    hwpInitialMode?: 'viewer' | 'editor';
    hwpExperimentalSave?: boolean;
    webviewFrameSources?: string[];
    webviewConnectSources?: string[];
}

export class ReactApp {

    private static webviewPath: string;
    public static IS_DEV = false;
    public static init(context: vscode.ExtensionContext) {
        this.webviewPath = context.extensionPath + '/out/webview'
        this.IS_DEV = context.extensionMode == vscode.ExtensionMode.Development
    }

    public static async view(webview: vscode.Webview, option: ViewOption) {
        const html = await this.readContent()
        const configs = JSON.stringify({
            ...option,
            language: vscode.env.language,
            config: vscode.workspace.getConfiguration('vscode-office')
        })
        webview.html = this.injectCsp(this.buildPath(html, webview), webview, option)
            .replace(`{{configs}}`, escapeHtmlAttribute(configs))
    }

    private static async readContent(): Promise<string> {
        if (this.IS_DEV) {
            const data = await new Promise<string>((resolve, reject) => {
                http.get('http://127.0.0.1:5739/index.html', (res) => {
                    let body = '';
                    res.on('data', (chunk) => body += chunk);
                    res.on('end', () => resolve(body));
                    res.on('error', reject);
                }).on('error', reject);
            });
            return data.replace('/@vite/client', 'http://127.0.0.1:5739/@vite/client')
        }
        const targetPath = `${this.webviewPath}/index.html`;
        return fs.readFileSync(targetPath, 'utf8')
    }

    private static buildPath(data: string, webview: vscode.Webview): string {
        const baseUrl = ReactApp.getBaseUrl(webview);
        if (this.IS_DEV) {
            return data.replace('<base href="/">', `<base href="${baseUrl}/">`);
        }
        return data
            .replace('<base href="/">', '')
            .replace(/(src|href)="\.\/assets\//g, `$1="${baseUrl}/assets/`);
    }

    private static injectCsp(data: string, webview: vscode.Webview, option: ViewOption): string {
        const frameSources = sanitizeCspSources(option.webviewFrameSources);
        const connectSources = sanitizeCspSources(option.webviewConnectSources);
        const frameSourceText = frameSources.length > 0 ? ` ${frameSources.join(' ')}` : '';
        const connectSourceText = connectSources.length > 0 ? ` ${connectSources.join(' ')}` : '';
        const csp = this.IS_DEV
            ? [
                "default-src 'none'",
                "base-uri 'self' http://127.0.0.1:5739",
                `img-src 'self' http://127.0.0.1:5739 ${webview.cspSource} vscode-webview: https://*.vscode-cdn.net data: blob:`,
                `font-src 'self' http://127.0.0.1:5739 ${webview.cspSource} vscode-webview: https://*.vscode-cdn.net data:`,
                `style-src 'self' http://127.0.0.1:5739 ${webview.cspSource} vscode-webview: https://*.vscode-cdn.net 'unsafe-inline'`,
                `script-src 'self' http://127.0.0.1:5739 ${webview.cspSource} vscode-webview: https://*.vscode-cdn.net 'unsafe-eval'`,
                `connect-src 'self' http://127.0.0.1:5739 ws://127.0.0.1:5739 ${webview.cspSource} vscode-webview: https://*.vscode-cdn.net${connectSourceText}`,
                `frame-src 'self' http://127.0.0.1:5739 ${webview.cspSource} vscode-webview: https://*.vscode-cdn.net about: blob: data:${frameSourceText}`,
                `worker-src 'self' http://127.0.0.1:5739 ${webview.cspSource} vscode-webview: blob:`,
            ].join('; ')
            : [
                "default-src 'none'",
                "base-uri 'none'",
                `img-src 'self' ${webview.cspSource} vscode-webview: https://*.vscode-cdn.net data: blob:`,
                `font-src 'self' ${webview.cspSource} vscode-webview: https://*.vscode-cdn.net data:`,
                `style-src 'self' ${webview.cspSource} vscode-webview: https://*.vscode-cdn.net 'unsafe-inline'`,
                `script-src 'self' ${webview.cspSource} vscode-webview: https://*.vscode-cdn.net 'wasm-unsafe-eval'`,
                `connect-src 'self' ${webview.cspSource} vscode-webview: https://*.vscode-cdn.net${connectSourceText}`,
                `frame-src 'self' ${webview.cspSource} vscode-webview: https://*.vscode-cdn.net about: blob: data:${frameSourceText}`,
                `worker-src 'self' ${webview.cspSource} vscode-webview: blob:`,
            ].join('; ');
        return data.replace(
            '<head>',
            `<head><meta http-equiv="Content-Security-Policy" content="${escapeHtmlAttribute(csp)}">`,
        );
    }

    private static getBaseUrl(webview: vscode.Webview) {
        if (this.IS_DEV) {
            return `http://127.0.0.1:5739`;
        }
        return webview.asWebviewUri(vscode.Uri.file(this.webviewPath)).toString();
    }

}

function sanitizeCspSources(sources?: string[]): string[] {
    const sanitized = new Set<string>();
    for (const source of sources ?? []) {
        const origin = toCspOrigin(source);
        if (origin) sanitized.add(origin);
    }
    return Array.from(sanitized);
}

function toCspOrigin(source: string): string | undefined {
    try {
        const url = new URL(source);
        if (url.protocol === 'vscode-webview:' || url.protocol === 'vscode-resource:') {
            return undefined;
        }
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return undefined;
        }
        return `${url.protocol}//${url.host}`;
    } catch {
        return undefined;
    }
}

function escapeHtmlAttribute(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
