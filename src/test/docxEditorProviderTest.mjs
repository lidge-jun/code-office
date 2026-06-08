import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const wordSource = await readFile(path.join(root, 'src/react/view/word/Word.tsx'), 'utf8');
const wordCssSource = await readFile(path.join(root, 'src/react/view/word/Word.css'), 'utf8');
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

assert.match(
    wordSource,
    /import\s+\{\s*renderAsync\s*\}\s+from\s+['"]docx-preview['"]/,
    'Word.tsx should keep the docx-preview viewer path for high-fidelity read mode'
);

assert.match(
    wordSource,
    /useState<['"]viewer['"]\s*\|\s*['"]editor['"]>\(['"]viewer['"]\)/,
    'Word.tsx should default DOCX files to viewer mode, not the experimental editor'
);

assert.match(
    wordSource,
    /label:\s*['"]View['"],\s*value:\s*['"]viewer['"]/,
    'Word.tsx should expose an explicit View mode control'
);

assert.match(
    wordSource,
    /label:\s*['"]Edit['"],\s*value:\s*['"]editor['"]/,
    'Word.tsx should expose an explicit Edit mode control'
);

assert.match(
    wordSource,
    /DOCX_EDITOR_FONT_FAMILIES/,
    'Word.tsx should use stable DOCX editor font families'
);

assert.match(
    wordSource,
    /onFontsLoaded=\{handleFontsLoaded\}/,
    'Word.tsx should relayout after editor fonts load'
);

assert.match(
    wordSource,
    /showMarginGuides=\{true\}/,
    'Word.tsx should expose page margin guides in edit mode'
);

assert.match(
    wordCssSource,
    /\.docx-editor-container \.layout-page/,
    'Word.css should tune the eigenpal page surface in edit mode'
);

assert.match(
    wordCssSource,
    /font-family:\s*"Malgun Gothic"/,
    'Word.css should prefer Malgun Gothic for Korean DOCX edit rendering'
);

assert.match(
    wordCssSource,
    /word-break:\s*keep-all/,
    'Word.css should keep Korean words together where possible'
);

assert.match(
    wordCssSource,
    /overflow-wrap:\s*anywhere/,
    'Word.css should prevent long table-cell content from overflowing the edit surface'
);

assert.match(
    wordCssSource,
    /table\.docx-table/,
    'Word.css should include scoped table tuning for eigenpal DOCX edit mode'
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
