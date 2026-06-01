import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const tmpDir = await fsMkdtemp();
const bundlePath = path.join(tmpDir, 'wikilink-parser.cjs');

await esbuild.build({
    entryPoints: [path.join(root, 'src/service/wikilink/wikilinkParser.ts')],
    outfile: bundlePath,
    bundle: true,
    platform: 'node',
    format: 'cjs',
});

const requireBundle = createRequire(import.meta.url);
const parser = requireBundle(bundlePath);

assert.ok(parser.parseWikilinkBody('Note'), 'no-extension note should parse');
assert.ok(parser.parseWikilinkBody('Note.md'), '.md note should parse');
assert.ok(parser.parseWikilinkBody('Folder/Note'), 'path without extension should parse');
assert.ok(parser.parseWikilinkBody('Folder/Note.markdown'), '.markdown note should parse');
assert.ok(parser.parseWikilinkBody('#Heading'), 'same-doc heading should parse');
assert.ok(parser.parseWikilinkBody('^block'), 'same-doc block should parse');

assert.equal(parser.parseWikilinkBody('Note.pdf'), undefined, 'explicit .pdf target should stay raw');
assert.equal(parser.parseWikilinkBody('Note.docx'), undefined, 'explicit .docx target should stay raw');
assert.equal(parser.parseWikilinkBody('Folder/Note.xlsx'), undefined, 'explicit spreadsheet target should stay raw');

const links = parser.findWikilinks('[[Note.pdf]] [[Note]] [[Folder/Other.md]] [[Doc.docx]]');
assert.deepEqual(links.map(link => link.raw), ['Note', 'Folder/Other.md']);

assert.equal(parser.isSupportedWikilinkBody('Note'), true);
assert.equal(parser.isSupportedWikilinkBody('Note.md'), true);
assert.equal(parser.isSupportedWikilinkBody('Note.pdf'), false);

console.log('wikilink parser checks passed');

async function fsMkdtemp() {
    const { mkdtemp } = await import('node:fs/promises');
    return mkdtemp(path.join(os.tmpdir(), 'code-office-wikilink-parser-'));
}
