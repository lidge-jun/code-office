import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const fixture = fs.readFileSync(path.join(root, 'src/test/fixtures/markdown-live-raw.md'), 'utf8');
const liveRaw = await import(pathToFileURL(path.join(root, 'resource/vditor/live-raw.js')));
const utilSource = fs.readFileSync(path.join(root, 'resource/vditor/util.js'), 'utf8');

assert.equal(liveRaw.resolveVditorMode('raw'), 'ir', 'raw config should mount Vditor in IR live-preview mode');
assert.equal(liveRaw.resolveVditorMode('sv'), 'sv', 'Vditor built-in modes should pass through');
assert.equal(liveRaw.resolveVditorMode(undefined), 'wysiwyg', 'legacy missing mode fallback should stay stable');

assert.equal(liveRaw.isReadingPreviewShortcut({ key: 'e', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false }, 'MacIntel'), true);
assert.equal(liveRaw.isReadingPreviewShortcut({ key: 'e', metaKey: false, ctrlKey: true, altKey: false, shiftKey: false }, 'Win32'), true);
assert.equal(liveRaw.isReadingPreviewShortcut({ key: 'e', metaKey: true, ctrlKey: true, altKey: false, shiftKey: false }, 'MacIntel'), false);
assert.equal(liveRaw.isReadingPreviewShortcut({ key: 'e', metaKey: true, ctrlKey: false, altKey: true, shiftKey: false }, 'MacIntel'), false);

assert.equal(liveRaw.isSaveShortcut({ key: 's', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false }, 'MacIntel'), true);
assert.equal(liveRaw.isSaveShortcut({ key: 's', metaKey: false, ctrlKey: true, altKey: false, shiftKey: false }, 'Linux x86_64'), true);

const editorMode = packageJson.contributes.configuration.properties['vscode-office.editorMode'];
assert.ok(editorMode.enum.includes('raw'), 'vscode-office.editorMode should expose raw');
assert.equal(editorMode.default, 'ir', 'default editorMode should remain Obsidian-like IR live preview');

for (const required of [
    '```js',
    '```mermaid',
    '[[Daily Note]]',
    '[[Missing Note|Pretty Missing]]',
    '`[[NotALink]] ~~not strike~~ **not bold**`',
    '~~이전 값~~',
    '**새 값**',
    '**~~굵은 취소선~~**',
]) {
    assert.ok(fixture.includes(required), `live/raw fixture should contain ${required}`);
}

assert.ok(utilSource.includes('.vditor-ir__preview'), 'post-processing should include IR preview chunks');
assert.ok(utilSource.includes('.vditor-wysiwyg__preview'), 'post-processing should include WYSIWYG preview chunks');
assert.ok(utilSource.includes('.vditor-ir .vditor-reset'), 'wikilink post-processing should include inactive IR editing roots');
assert.ok(utilSource.includes('pre.matches(\'.vditor-ir > .vditor-reset\')'), 'IR root pre should be eligible while normal code/pre remains protected');
assert.ok(utilSource.includes('isSelectionInTextNode(node)'), 'wikilink post-processing should preserve the active raw caret node');
assert.ok(utilSource.includes('code-office-toggle-raw-source'), 'toolbar should dispatch raw source toggle event');

const indexSource = fs.readFileSync(path.join(root, 'resource/vditor/index.js'), 'utf8');
assert.ok(indexSource.includes('latestMarkdownContent'), 'raw source should preserve the canonical Markdown string separately from rendered DOM');
assert.ok(indexSource.includes('getSourceValue: () => latestMarkdownContent'), 'raw source should not read mutated rendered DOM when opened');
assert.ok(indexSource.includes('__codeOfficeMarkdownPostProcessingInput'), 'render-only post-processing input events should not update the document');
assert.ok(utilSource.includes('getSaveValue ? options.getSaveValue() : editor.getValue()'), 'manual save should prefer canonical Markdown over rendered DOM');

console.log('markdown live/raw checks passed');
