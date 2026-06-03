const FORBIDDEN_SVG_TAGS = [
    'script',
    'foreignObject',
    'iframe',
    'object',
    'embed',
    'link',
    'meta',
    'base',
    'form',
    'input',
    'button',
    'textarea',
    'select',
    'video',
    'audio',
    'canvas',
];

const FORBIDDEN_TAG_PATTERN = new RegExp(
    `<\\s*(${FORBIDDEN_SVG_TAGS.join('|')})\\b[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>`,
    'gi',
);
const FORBIDDEN_SELF_CLOSING_TAG_PATTERN = new RegExp(
    `<\\s*(${FORBIDDEN_SVG_TAGS.join('|')})\\b[^>]*\\/?>`,
    'gi',
);

export function sanitizeHwpSvg(svg: string): string {
    if (typeof svg !== 'string' || !/<svg[\s>]/i.test(svg)) {
        throw new Error('HWP viewer returned invalid SVG markup.');
    }
    return svg
        .replace(FORBIDDEN_TAG_PATTERN, '')
        .replace(FORBIDDEN_SELF_CLOSING_TAG_PATTERN, '')
        .replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/\s+(?:href|xlink:href|src)\s*=\s*(['"])\s*(?:javascript:|data:text\/html|data:image\/svg\+xml)[\s\S]*?\1/gi, '')
        .replace(/\s+style\s*=\s*(['"])[\s\S]*?(?:url\s*\(|@import|expression\s*\()[\s\S]*?\1/gi, '');
}

export function sanitizeHwpSvgPages(svgs: string[]): string[] {
    return svgs.map((svg) => sanitizeHwpSvg(svg));
}
