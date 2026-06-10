export function buildSrcdocHtml(html: string, baseUrl?: string): string {
    if (!baseUrl) return html;
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return html.replace(/(src|href)="\.\/([^"]+)"/g, (_match, attr: string, path: string) => {
        const resolvedUrl = new URL(path, normalizedBase).toString();
        return `${attr}="${escapeHtmlAttribute(resolvedUrl)}"`;
    });
}

export function resolveStudioResourceUrl(value: string, baseUrl?: string): string {
    if (!baseUrl || !value.startsWith('./')) return value;
    return new URL(value.slice(2), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

function escapeHtmlAttribute(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
