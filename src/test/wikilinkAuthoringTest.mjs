import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const authoring = await import(pathToFileURL(path.join(root, 'resource/vditor/wikilink-authoring.js')));

assert.deepEqual(
    authoring.filterWikilinkCompletionTargets('', ['Projects/Alpha', 'Daily Note']),
    ['Daily Note', 'Projects/Alpha'],
    'empty query should return sorted note targets'
);

assert.deepEqual(
    authoring.filterWikilinkCompletionTargets('al', ['Projects/Alpha', 'Archive/Beta', 'Daily Note']),
    ['Projects/Alpha'],
    'query should rank prefix and substring matches'
);

assert.equal(
    authoring.filterWikilinkCompletionTargets('missing', ['Projects/Alpha']).length,
    0,
    'missing notes should not create synthetic completion targets'
);

assert.deepEqual(
    authoring.pairTextareaWikilink('[', 1, 1, '['),
    { value: '[[]]', selectionStart: 2, selectionEnd: 2 },
    'second [ should pair to [[]] and place the caret inside'
);

assert.deepEqual(
    authoring.pairTextareaWikilink('before selected after', 7, 15, '['),
    { value: 'before [[selected]] after', selectionStart: 9, selectionEnd: 17 },
    'selected text should be wrapped as a wikilink body'
);

assert.equal(
    authoring.pairTextareaWikilink('plain', 5, 5, '['),
    null,
    'first [ should be left to the editor so the second [ can pair'
);

const context = authoring.findTextareaWikilinkContext('before [[Da]] after', 11);
assert.deepEqual(
    context,
    { open: 7, close: 13, bodyStart: 9, bodyEnd: 11, query: 'Da' },
    'textarea context should capture the active wikilink body range'
);

assert.deepEqual(
    authoring.applyTextareaWikilinkCompletion('before [[Da]] after', context, 'Daily Note'),
    { value: 'before [[Daily Note]] after', selectionStart: 19, selectionEnd: 19 },
    'completion should replace only the body and keep one closing bracket pair'
);

assert.equal(
    authoring.findTextareaWikilinkContext('`[[Not a link]]`', 5)?.query,
    'No',
    'pure helper detects raw context; DOM integration owns code/inline-code protection'
);

assert.equal(
    authoring.getWikilinkRevealPlacementFromTextOffset(0, 2),
    'before',
    'clicking the left text boundary of a rendered wikilink should reveal before the raw token'
);

assert.equal(
    authoring.getWikilinkRevealPlacementFromTextOffset(2, 2),
    'after',
    'clicking the right text boundary of a rendered wikilink should reveal after the raw token'
);

assert.equal(
    authoring.getWikilinkRevealPlacementFromTextOffset(1, 2),
    null,
    'clicking inside rendered wikilink text should keep normal link activation behavior'
);

console.log('wikilink authoring checks passed');
