import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const tmpDir = await fsMkdtemp();
const bundlePath = path.join(tmpDir, 'wikilink-resolver.cjs');

await esbuild.build({
    entryPoints: [path.join(root, 'src/service/wikilink/wikilinkResolver.ts')],
    outfile: bundlePath,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    plugins: [{
        name: 'vscode-shim',
        setup(build) {
            build.onResolve({ filter: /^vscode$/ }, () => ({ path: 'vscode', namespace: 'vscode-shim' }));
            build.onLoad({ filter: /.*/, namespace: 'vscode-shim' }, () => ({
                contents: 'module.exports = {};',
                loader: 'js',
            }));
        },
    }],
});

const requireBundle = createRequire(import.meta.url);
const { directoryDistance, rankWikilinkCandidates } = requireBundle(bundlePath);

assert.equal(directoryDistance('/vault/a', '/vault/a'), 0);
assert.equal(directoryDistance('/vault/a', '/vault/b'), 2);
assert.equal(directoryDistance('/vault/a/b', '/vault/a/c/d'), 3);

const files = [
    '/vault/b/Note.md',
    '/vault/a/Note.md',
    '/vault/a/deeper/Note.md',
    '/vault/a/Other.md',
];

assert.deepEqual(
    rankWikilinkCandidates('/vault', '/vault/a', files, 'Note').map(item => item.relative),
    ['a/Note.md', 'a/deeper/Note.md', 'b/Note.md'],
    'basename links should rank nearest markdown candidates first'
);

assert.deepEqual(
    rankWikilinkCandidates('/vault', '/vault/a', files, 'deeper/Note').map(item => item.relative),
    ['a/deeper/Note.md'],
    'path-qualified links should still use suffix path matching'
);

assert.deepEqual(
    rankWikilinkCandidates('/vault', '/vault/a', [
        '/vault/b/Beta.md',
        '/vault/b/Alpha.md',
    ], 'Alpha').map(item => item.relative),
    ['b/Alpha.md'],
    'target basename should filter before tie ordering'
);

assert.deepEqual(
    rankWikilinkCandidates('/vault', '/vault/a', [
        '/vault/c/Note.md',
        '/vault/b/Note.md',
    ], 'Note').map(item => item.relative),
    ['b/Note.md', 'c/Note.md'],
    'equal distance ties should fall back to relative label ordering'
);

console.log('wikilink resolver checks passed');

async function fsMkdtemp() {
    const { mkdtemp } = await import('node:fs/promises');
    return mkdtemp(path.join(os.tmpdir(), 'code-office-wikilink-resolver-'));
}
