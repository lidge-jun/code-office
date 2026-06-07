import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const wordSource = await readFile(path.join(root, 'src/react/view/word/Word.tsx'), 'utf8');
const handlerSource = await readFile(path.join(root, 'src/provider/handlers/docxHandler.ts'), 'utf8');

assert.match(
    wordSource,
    /hostSaveRequest:\s*'docxHostSaveRequest'/,
    'Word.tsx should define the explicit docxHostSaveRequest event'
);

assert.match(
    wordSource,
    /handler\.emit\(DOCX_EVENTS\.hostSaveRequest\)/,
    'Word.tsx should ask the extension host to run the VS Code save lifecycle'
);

assert.doesNotMatch(
    wordSource,
    /requestId:\s*['"]__autosave['"]/,
    'Word.tsx should not emit a fake __autosave save response'
);

assert.match(
    handlerSource,
    /hostSaveRequest:\s*'docxHostSaveRequest'/,
    'docxHandler.ts should define the host save request event'
);

assert.match(
    handlerSource,
    /commands\.executeCommand\(['"]workbench\.action\.files\.save['"]\)/,
    'docxHandler.ts should route host save requests to VS Code save'
);

assert.match(
    handlerSource,
    /this\.handler\.on\(DOCX_EVENTS\.saveResponse/,
    'DocxSaveBridge should remain the owner of requestId-based save responses'
);

console.log('docx editor provider checks passed');
