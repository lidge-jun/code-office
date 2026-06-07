import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const authoring = await import(pathToFileURL(path.join(root, 'resource/vditor/wikilink-authoring.js')));
const source = await import(pathToFileURL(path.join(root, 'resource/vditor/wikilink-source-transaction.js')));

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

assert.deepEqual(
    authoring.pairMarkdownInsertedBracket('# Smoke\n\n[', '# Smoke\n\n[['),
    { value: '# Smoke\n\n[[]]', selectionStart: 11, selectionEnd: 11 },
    'Live Preview input diff should pair a second [ in the Markdown source'
);

assert.deepEqual(
    authoring.pairMarkdownInsertedBracket('# Smoke\n\n', '# Smoke\n\n[['),
    { value: '# Smoke\n\n[[]]', selectionStart: 11, selectionEnd: 11 },
    'Live Preview input diff should pair batched [[ insertions in the Markdown source'
);

assert.deepEqual(
    source.pairMarkdownInsertedBracket('# Smoke\n\n', '# Smoke\n[['),
    {
        value: '# Smoke\n[[]]',
        selectionStart: 10,
        selectionEnd: 10,
        context: { open: 8, close: 12, bodyStart: 10, bodyEnd: 10, query: '' },
    },
    'source pairing should tolerate Vditor collapsing a blank line while inserting [['
);

assert.deepEqual(
    authoring.pairMarkdownInsertedBracket('# Smoke\n\n', '# Smoke\n[['),
    { value: '# Smoke\n[[]]', selectionStart: 10, selectionEnd: 10 },
    'authoring pairing should tolerate Vditor collapsing a blank line while inserting [['
);

assert.deepEqual(
    source.pairMarkdownInsertedBracket('# Smoke\n\n', '# Smoke\n\n[[1'),
    { value: '# Smoke\n\n[[1]]', selectionStart: 12, selectionEnd: 12, context: { open: 9, close: 14, bodyStart: 11, bodyEnd: 12, query: '1' } },
    'Live Preview input diff should close batched [[query insertions from automation or IME-like input'
);

assert.deepEqual(
    authoring.pairMarkdownInsertedBracket('before [ after', 'before [[ after'),
    { value: 'before [[]] after', selectionStart: 9, selectionEnd: 9 },
    'Live Preview input diff should pair a second [ inserted in the middle of the Markdown source'
);

assert.equal(
    authoring.isMarkdownInsertedWikilinkPair('# Smoke\n\n[', '# Smoke\n\n[[]]'),
    true,
    'Live Preview input diff should detect pairs that contenteditable authoring already completed'
);

assert.equal(
    authoring.isMarkdownInsertedWikilinkPair('# Smoke\n\n', '# Smoke\n\n[[]]'),
    true,
    'Live Preview input diff should detect batched completed wikilink pairs'
);

assert.equal(
    authoring.isMarkdownInsertedWikilinkPair('# Smoke\n\n', '# Smoke\n\n[[Draft]]'),
    false,
    'Live Preview input diff should not treat a filled wikilink as an empty pair insert'
);

assert.deepEqual(
    authoring.moveLeakedPrintableIntoEmptyWikilink('# Wikilink Smoke\n\n[[]]', '# 1Wikilink Smoke\n\n[[]]'),
    { value: '# Wikilink Smoke\n\n[[1]]', selectionStart: 21, selectionEnd: 21 },
    'Live Preview should move a leaked printable character into the pending empty wikilink body'
);

assert.deepEqual(
    authoring.moveLeakedPrintableIntoEmptyWikilink('before [[]] after', 'before [[]] afterㅇ'),
    { value: 'before [[ㅇ]] after', selectionStart: 10, selectionEnd: 10 },
    'Live Preview leak repair should support a single composed non-ASCII character'
);

assert.equal(
    authoring.moveLeakedPrintableIntoEmptyWikilink('# Smoke\n\n[[]]', '# Smoke\n\n[[1]]'),
    null,
    'Live Preview leak repair should ignore already-correct wikilink body input'
);

assert.equal(
    authoring.moveLeakedPrintableIntoEmptyWikilink('# Smoke\n\n[[]]', '# Smoke\n\n[[]]12'),
    null,
    'Live Preview leak repair should ignore multi-character insertions'
);

assert.equal(
    authoring.isTextOffsetInsideEmptyWikilinkBody('[[]]', 2),
    true,
    'empty wikilink caret guard should recognize the body insertion point'
);

assert.equal(
    authoring.isTextOffsetInsideEmptyWikilinkBody('[[]]', 4),
    false,
    'empty wikilink caret guard should not treat the right edge as the body'
);

assert.equal(
    authoring.pairMarkdownInsertedBracket('before [', 'before [x'),
    null,
    'Live Preview input diff should ignore non-[ insertions'
);

assert.deepEqual(
    authoring.pairMarkdownUnclosedWikilinkOpen('# Smoke\n\n[['),
    { value: '# Smoke\n\n[[]]', selectionStart: 11, selectionEnd: 11 },
    'source repair should pair a raw unclosed [[ even after Vditor has accepted it'
);

assert.deepEqual(
    authoring.pairMarkdownUnclosedWikilinkOpen('# Smoke\n\n[[Draft'),
    { value: '# Smoke\n\n[[Draft]]', selectionStart: 16, selectionEnd: 16 },
    'source transaction should close an unclosed [[query body from batched or paste-like input'
);

const context = authoring.findTextareaWikilinkContext('before [[Da]] after', 11);
assert.deepEqual(
    context,
    { open: 7, close: 13, bodyStart: 9, bodyEnd: 11, query: 'Da' },
    'textarea context should capture the active wikilink body range'
);

assert.deepEqual(
    authoring.applyTextareaWikilinkCompletion('before [[Da]] after', context, 'Daily Note'),
    { value: 'before [[Daily Note]] after', selectionStart: 21, selectionEnd: 21, context: null },
    'completion should replace only the body and keep one closing bracket pair'
);

assert.equal(
    authoring.findTextareaWikilinkContext('`[[Not a link]]`', 5),
    null,
    'source helper should not trigger wikilink completion inside inline code'
);

assert.deepEqual(
    authoring.findWikilinkCompletionContext('before [[Da', 11),
    { open: 7, close: null, bodyStart: 9, bodyEnd: 11, query: 'Da' },
    'source context should support unclosed [[query before Vditor has inserted closing brackets'
);

assert.deepEqual(
    authoring.applyWikilinkCompletion('before [[Da', authoring.findWikilinkCompletionContext('before [[Da', 11), 'Daily Note'),
    { value: 'before [[Daily Note]]', selectionStart: 21, selectionEnd: 21, context: null },
    'open source completion should append exactly one closing bracket pair'
);

assert.deepEqual(
    source.insertPrintableIntoWikilinkContext('# Wikilink Smoke\n\n[[]]', source.findWikilinkCompletionContext('# Wikilink Smoke\n\n[[]]', 20), '1'),
    { value: '# Wikilink Smoke\n\n[[1]]', selectionStart: 21, selectionEnd: 21, context: { open: 18, close: 23, bodyStart: 20, bodyEnd: 21, query: '1' } },
    'printable source insertion should keep text inside the active empty wikilink body'
);

assert.deepEqual(
    source.findWikilinkCompletionContext('[[abc]]', 5),
    { open: 0, close: 7, bodyStart: 2, bodyEnd: 5, query: 'abc' },
    'closed source context should stay active at the body end'
);

assert.deepEqual(
    source.findWikilinkCompletionContext('[[]]', 2),
    { open: 0, close: 4, bodyStart: 2, bodyEnd: 2, query: '' },
    'empty closed source context should stay active inside the body'
);

assert.equal(
    source.findWikilinkCompletionContext('[[abc]]', 7),
    null,
    'closed source context should be inactive after the closing brackets'
);

assert.deepEqual(
    source.recoverWikilinkCompletionSelection('[[ㅁㅇㄴㄹㅁㅇ]]', {
        selectionStart: 9,
        selectionEnd: 9,
        context: source.findWikilinkCompletionContext('[[ㅁㅇㄴㄹㅁㅇㄹ]]', 9),
    }),
    {
        selectionStart: 8,
        selectionEnd: 8,
        context: { open: 0, close: 10, bodyStart: 2, bodyEnd: 8, query: 'ㅁㅇㄴㄹㅁㅇ' },
    },
    'body-end Backspace should recover stale source selection to the new closed wikilink body end'
);

assert.deepEqual(
    source.recoverWikilinkCompletionSelectionAfterChange('[[abcd]]', '[[acd]]', {
        selectionStart: 4,
        selectionEnd: 4,
        context: source.findWikilinkCompletionContext('[[abcd]]', 4),
    }),
    {
        selectionStart: 3,
        selectionEnd: 3,
        context: { open: 0, close: 7, bodyStart: 2, bodyEnd: 5, query: 'a' },
    },
    'middle Backspace should recover source selection to the real post-edit caret'
);

assert.deepEqual(
    source.recoverWikilinkCompletionSelectionAfterChange('[[abcd]]', '[[abd]]', {
        selectionStart: 4,
        selectionEnd: 4,
        context: source.findWikilinkCompletionContext('[[abcd]]', 4),
    }),
    {
        selectionStart: 4,
        selectionEnd: 4,
        context: { open: 0, close: 7, bodyStart: 2, bodyEnd: 5, query: 'ab' },
    },
    'middle Delete should keep source selection at the real post-edit caret'
);

assert.deepEqual(
    source.applyWikilinkCompletion('[[ㅁㅇㄴㄹㅁㅇ]]', source.findWikilinkCompletionContext('[[ㅁㅇㄴㄹㅁㅇ]]', 8), 'Daily Note'),
    { value: '[[Daily Note]]', selectionStart: 14, selectionEnd: 14, context: null },
    'closed source completion should replace only the body and keep one closing bracket pair'
);

assert.equal(
    authoring.filterWikilinkCompletionTargets('', Array.from({ length: 1000 }, (_, index) => `Note ${String(index).padStart(4, '0')}`), 12).length,
    12,
    'popup-facing authoring filter should cap large target lists'
);

assert.equal(
    source.isSupportedWikilinkAuthoringTarget('```\\n[[Nope]]\\n```', 5),
    false,
    'source helper should reject fenced code blocks'
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

assert.equal(
    authoring.getWikilinkRevealPlacementFromClientX(12, 10, 110),
    'before',
    'clicking the visual left edge should reveal before even when browser caret offsets are imprecise'
);

assert.equal(
    authoring.getWikilinkRevealPlacementFromClientX(108, 10, 110),
    'after',
    'clicking the visual right edge should reveal after even when browser caret offsets are imprecise'
);

assert.equal(
    authoring.getWikilinkRevealPlacementFromClientX(60, 10, 110),
    null,
    'clicking the visual center should preserve normal rendered wikilink activation'
);

{
    const dispatched = [];
    const node = {
        nodeType: 3,
        textContent: '[[]]',
        parentElement: {
            closest: () => null,
            dispatchEvent: event => dispatched.push(event),
        },
    };
    const range = {
        setStart(target, offset) {
            this.target = target;
            this.offset = offset;
        },
        collapse(value) {
            this.collapsed = value;
        },
    };
    const previousDocument = globalThis.document;
    const previousNode = globalThis.Node;
    const previousNodeFilter = globalThis.NodeFilter;
    const previousInputEvent = globalThis.InputEvent;
    globalThis.Node = { TEXT_NODE: 3, ELEMENT_NODE: 1 };
    globalThis.NodeFilter = { SHOW_TEXT: 4 };
    globalThis.InputEvent = class {
        constructor(type, init) {
            this.type = type;
            Object.assign(this, init);
        }
    };
    globalThis.document = {
        createTreeWalker() {
            let consumed = false;
            return {
                currentNode: null,
                nextNode() {
                    if (consumed) return false;
                    consumed = true;
                    this.currentNode = node;
                    return true;
                },
            };
        },
        createRange() {
            return range;
        },
        getSelection() {
            return {
                removeAllRanges() {
                    this.removed = true;
                },
                addRange(nextRange) {
                    this.range = nextRange;
                },
            };
        },
    };
    try {
        assert.equal(
            authoring.insertTextIntoFirstEmptyWikilinkBody('1', { querySelectorAll: () => [] }),
            true,
            'printable key routing should mutate the first empty wikilink body directly'
        );
        assert.equal(node.textContent, '[[1]]');
        assert.equal(range.offset, 3);
        assert.equal(dispatched[0]?.inputType, 'insertText');
        assert.equal(dispatched[0]?.data, '1');
    } finally {
        globalThis.document = previousDocument;
        globalThis.Node = previousNode;
        globalThis.NodeFilter = previousNodeFilter;
        globalThis.InputEvent = previousInputEvent;
    }
}

console.log('wikilink authoring checks passed');
