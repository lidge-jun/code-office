import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import * as esbuild from 'esbuild';
import * as cheerio from 'cheerio';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const fixturePath = path.join(root, 'src/test/fixtures/phase5-cjk-inline.md');
const fixture = fs.readFileSync(fixturePath, 'utf8');

const util = await import(pathToFileURL(path.join(root, 'resource/vditor/util.js')));

function repairTextLayers(text, maxPasses = 4) {
    let parts = [{ type: 'text', text }];
    for (let pass = 0; pass < maxPasses; pass++) {
        let changed = false;
        parts = parts.flatMap(part => {
            if (!part.text.includes('~~') && !part.text.includes('**')) return [part];
            const repaired = util.buildInlineMarkdownRepairParts(part.text);
            if (repaired.length === 1 && repaired[0].type === 'text' && repaired[0].text === part.text) return [part];
            changed = true;
            return repaired.map(next => ({
                type: next.type === 'text' ? part.type : next.type,
                text: next.text,
                parent: part.type === 'text' ? undefined : part.type,
            }));
        });
        if (!changed) break;
    }
    return parts;
}

function assertNoMarkers(value, label) {
    assert.equal(value.includes('~~'), false, `${label} should not expose raw strike markers`);
    assert.equal(value.includes('**'), false, `${label} should not expose raw bold markers`);
}

const simpleParts = util.buildInlineMarkdownRepairParts('한국어 ~~이전 값~~ 과 **새 값**');
assert.deepEqual(simpleParts, [
    { type: 'text', text: '한국어 ' },
    { type: 'del', text: '이전 값' },
    { type: 'text', text: ' 과 ' },
    { type: 'strong', text: '새 값' },
]);

const nestedParts = repairTextLayers('중첩 **~~굵은 취소선~~** 끝');
assert.ok(nestedParts.some(part => part.type === 'del' && part.parent === 'strong' && part.text === '굵은 취소선'));
assertNoMarkers(nestedParts.map(part => part.text).join(''), 'nested repaired text');

for (const required of ['**6470h/주**', '~~기존 계산~~', '**~~표 안 굵은 취소선~~**']) {
    assert.ok(fixture.includes(required), `fixture should contain ${required}`);
}

for (const required of [
    '`inline code ~~삭제 금지~~ **굵게 금지**`',
    'code block ~~삭제 금지~~ **굵게 금지**',
    '<pre>pre block ~~삭제 금지~~ **굵게 금지**</pre>',
]) {
    assert.ok(fixture.includes(required), `fixture should contain protected sample ${required}`);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-office-markdown-phase5-'));
const bundlePath = path.join(tmpDir, 'markdown-pdf.cjs');
await esbuild.build({
    entryPoints: [path.join(root, 'src/service/markdown/markdown-pdf.js')],
    outfile: bundlePath,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['puppeteer-core'],
    plugins: [{
        name: 'vscode-shim',
        setup(build) {
            build.onResolve({ filter: /^vscode$/ }, () => ({ path: 'vscode', namespace: 'vscode-shim' }));
            build.onLoad({ filter: /.*/, namespace: 'vscode-shim' }, () => ({
                contents: 'module.exports = { Uri: { file: fsPath => ({ fsPath }) } };',
                loader: 'js',
            }));
        },
    }],
});

const requireBundle = createRequire(import.meta.url);
const { __markdownPhase5Test } = requireBundle(bundlePath);
const html = __markdownPhase5Test.convertMarkdownToHtml(fixturePath, 'html', fixture, { breaks: false }, {});
const $ = cheerio.load(html);
const wikilinkHtml = __markdownPhase5Test.convertMarkdownToHtml(
    fixturePath,
    'html',
    'Valid [[Note]] and raw [[Attachment.pdf]] and markdown [[Folder/Other.md|Other]].',
    { breaks: false },
    {
        Note: { href: 'Note.md', resolved: true },
        'Folder/Other.md|Other': { href: 'Folder/Other.md', resolved: true },
    }
);
const $wikilinks = cheerio.load(wikilinkHtml);

assert.ok($('table').length >= 1, 'export should render markdown table');
assert.ok($('s, del').length >= 1, 'export should render strikethrough tags');
assert.ok($('strong').length >= 1, 'export should render bold tags');
assert.ok($('td strong').text().includes('6470h/주'), 'table cell bold should render');
assert.ok($('td s, td del').text().includes('기존 계산'), 'table cell strike should render');
assert.ok($('td strong s, td strong del').text().includes('표 안 굵은 취소선'), 'nested table strike should render');
assert.equal($wikilinks('a.code-office-wikilink').length, 2, 'export should link supported Markdown wikilinks');
assert.equal($wikilinks('a').text().includes('Attachment.pdf'), false, 'export should not link explicit non-Markdown extensions');
assert.ok($wikilinks.text().includes('[[Attachment.pdf]]'), 'export should keep explicit non-Markdown wikilink text raw');

$('p, li, td').each((_, element) => {
    const clone = $(element).clone();
    clone.find('code, pre, script, style, a, kbd, samp, [data-wikilink]').remove();
    assertNoMarkers(clone.text(), `normal rendered node ${$(element).html()}`);
});

assert.ok(fixture.includes('~~') && fixture.includes('**'), 'raw source should keep markdown markers');
assert.ok($('code').text().includes('inline code ~~삭제 금지~~ **굵게 금지**'), 'inline code should retain markers');
assert.ok($('pre code').text().includes('code block ~~삭제 금지~~ **굵게 금지**'), 'fenced code should retain markers');
assert.ok($('pre').text().includes('pre block ~~삭제 금지~~ **굵게 금지**'), 'pre block should retain markers');

$('code, pre').each((_, element) => {
    assert.equal($(element).find('del, s, strong').length, 0, 'code/pre should not contain formatted descendants');
});

console.log('markdown phase5 checks passed');
