import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const markdownRoot = path.join(root, 'src/service/markdown');
const allowedCommonJsFiles = new Set([
    'html-export.js',
    'markdown-pdf.js',
    'outline.js',
    'ext/markdown-it-katex.js',
    'ext/markdown-it-mermaid.ts',
]);

function collectFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((entry) => {
        const absolutePath = path.join(dir, entry.name);
        if (entry.isDirectory()) return collectFiles(absolutePath);
        return /\.(js|ts)$/.test(entry.name) ? [absolutePath] : [];
    });
}

for (const target of ['html-export.js', 'markdown-pdf.js', 'outline.js']) {
    const source = fs.readFileSync(path.join(markdownRoot, target), 'utf8');
    assert.match(source, /require\(/, `${target} is a known legacy CommonJS Markdown export module`);
}

for (const absolutePath of collectFiles(markdownRoot)) {
    const relativePath = path.relative(markdownRoot, absolutePath).split(path.sep).join('/');
    const source = fs.readFileSync(absolutePath, 'utf8');
    const usesCommonJs = /require\(|module\.exports|exports\./.test(source);
    if (usesCommonJs) {
        assert.ok(
            allowedCommonJsFiles.has(relativePath),
            `${relativePath} should not add new CommonJS in Markdown export code without an explicit ESM migration plan`,
        );
    }
}

const markdownServiceSource = fs.readFileSync(path.join(root, 'src/service/markdownService.ts'), 'utf8');
assert.match(
    markdownServiceSource,
    /import\s+\{\s*convertMd\s*\}\s+from\s+["']\.\/markdown\/markdown-pdf["']/,
    'MarkdownService should keep the current Markdown export entrypoint stable until an explicit ESM migration',
);

console.log('markdown CommonJS boundary checks passed');
