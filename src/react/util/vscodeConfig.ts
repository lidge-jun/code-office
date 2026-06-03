export interface OfficeWebviewConfigs {
    route: string;
    rhwpStudioUrl?: string;
    rhwpStudioHtml?: string;
    rhwpStudioBaseUrl?: string;
    hwpInitialMode?: 'viewer' | 'editor';
    hwpExperimentalSave?: boolean;
    webviewFrameSources?: string[];
    webviewConnectSources?: string[];
    language?: string;
    config?: unknown;
}

let configs: OfficeWebviewConfigs | null = null;

export function getConfigs(): OfficeWebviewConfigs | null {
    if (configs) return configs;
    const elem = document.getElementById('office-configs')
    if (!elem) return null;
    const value = elem.getAttribute('data-config');
    if (!value || value == '{{configs}}') return null;
    configs = JSON.parse(value) as OfficeWebviewConfigs;
    return configs;
}
