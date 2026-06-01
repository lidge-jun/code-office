import assert from 'node:assert/strict';
import {
    displayWikilink,
    isSupportedWikilinkBody,
    isWikilinkBody,
    stripWikilinkFragment,
} from '../../resource/vditor/util.js';

function markerBody(value) {
    return isWikilinkBody(value) ? value.trim().slice(2, -2) : null;
}

assert.equal(stripWikilinkFragment('Note'), 'Note');
assert.equal(stripWikilinkFragment('Note#Heading'), 'Note');
assert.equal(stripWikilinkFragment('Note^block'), 'Note');
assert.equal(stripWikilinkFragment('Note#Heading^block'), 'Note');
assert.equal(stripWikilinkFragment('Folder/Note.md|Alias'), 'Folder/Note.md');
assert.equal(stripWikilinkFragment('#Heading'), '');
assert.equal(stripWikilinkFragment('^block'), '');

assert.equal(displayWikilink('Note'), 'Note');
assert.equal(displayWikilink('Folder/Note.md'), 'Note');
assert.equal(displayWikilink('/vault/Folder/Note.md'), 'Note');
assert.equal(displayWikilink(String.raw`C:\vault\Folder\Note.md`), 'Note');
assert.equal(displayWikilink('Note#Heading'), 'Heading');
assert.equal(displayWikilink('Note^block'), 'Note');
assert.equal(displayWikilink('Note#Heading^block'), 'Heading');
assert.equal(displayWikilink('Alias Target|Alias'), 'Alias');

assert.equal(isWikilinkBody('[[Note]]'), true);
assert.equal(isWikilinkBody('[[Note#Heading]]'), true);
assert.equal(isWikilinkBody('[[Note^block]]'), true);
assert.equal(isWikilinkBody('[[Note#Heading^block]]'), true);
assert.equal(isWikilinkBody('[[Alias Target|Alias]]'), true);
assert.equal(isWikilinkBody('[[Note.md]]'), true);
assert.equal(isWikilinkBody('[[Folder/Note]]'), true);
assert.equal(isWikilinkBody('[[./Folder/Note]]'), true);
assert.equal(isWikilinkBody('[[../Folder/Note.md]]'), true);
assert.equal(isWikilinkBody('[[/vault/Folder/Note]]'), true);
assert.equal(isWikilinkBody('[[/vault/Folder/Note.md]]'), true);
assert.equal(isWikilinkBody(String.raw`[[.\Folder\Note]]`), true);
assert.equal(isWikilinkBody(String.raw`[[..\Folder\Note.md]]`), true);
assert.equal(isWikilinkBody(String.raw`[[C:\vault\Folder\Note]]`), true);
assert.equal(isWikilinkBody(String.raw`[[C:\vault\Folder\Note.md]]`), true);
assert.equal(isWikilinkBody('[[Note.pdf]]'), false);
assert.equal(isWikilinkBody('[[Note.docx]]'), false);
assert.equal(isWikilinkBody('[[/vault/Folder/Note.pdf]]'), false);
assert.equal(isWikilinkBody(String.raw`[[C:\vault\Folder\Note.pdf]]`), false);
assert.equal(isWikilinkBody('./relative.md'), false);
assert.equal(isWikilinkBody('mailto:test@example.com'), false);
assert.equal(isWikilinkBody('https://example.com'), false);
assert.equal(isWikilinkBody('[label](./relative.md)'), false);

assert.equal(isSupportedWikilinkBody('Note'), true);
assert.equal(isSupportedWikilinkBody('Note.md'), true);
assert.equal(isSupportedWikilinkBody('Folder/Note'), true);
assert.equal(isSupportedWikilinkBody('./Folder/Note'), true);
assert.equal(isSupportedWikilinkBody('../Folder/Note.md'), true);
assert.equal(isSupportedWikilinkBody('/vault/Folder/Note'), true);
assert.equal(isSupportedWikilinkBody('/vault/Folder/Note.md'), true);
assert.equal(isSupportedWikilinkBody(String.raw`.\Folder\Note`), true);
assert.equal(isSupportedWikilinkBody(String.raw`..\Folder\Note.md`), true);
assert.equal(isSupportedWikilinkBody(String.raw`C:\vault\Folder\Note`), true);
assert.equal(isSupportedWikilinkBody(String.raw`C:\vault\Folder\Note.md`), true);
assert.equal(isSupportedWikilinkBody('#Heading'), true);
assert.equal(isSupportedWikilinkBody('^block'), true);
assert.equal(isSupportedWikilinkBody('Note.pdf'), false);
assert.equal(isSupportedWikilinkBody('Note.docx'), false);
assert.equal(isSupportedWikilinkBody('/vault/Folder/Note.pdf'), false);
assert.equal(isSupportedWikilinkBody(String.raw`C:\vault\Folder\Note.pdf`), false);

assert.equal(markerBody('[[Note]]'), 'Note');
assert.equal(markerBody('[[Note#Heading]]'), 'Note#Heading');
assert.equal(markerBody('[[Note.pdf]]'), null);
assert.equal(markerBody('./relative.md'), null);

console.log('wikilink phase3 checks passed');
