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
    /import\s+\{\s*SuperDocEditor,\s*type\s+SuperDocRef\s*\}\s+from\s+['"]@superdoc-dev\/react['"]/,
    'Word.tsx should use the SuperDoc React runtime for DOCX rendering and editing'
);

assert.match(
    wordSource,
    /import\s+['"]@superdoc-dev\/react\/style\.css['"]/,
    'Word.tsx should import the SuperDoc stylesheet'
);

assert.match(
    wordSource,
    /new\s+File\(\[documentBuffer\.slice\(0\)\],\s*normalizeDocumentName\(documentName\),\s*\{\s*type:\s*DOCX_MIME\s*\}\)/,
    'Word.tsx should pass DOCX bytes to SuperDoc as a File object'
);

assert.match(
    wordSource,
    /documentMode=\{mode\s*===\s*['"]viewer['"]\s*\?\s*['"]viewing['"]\s*:\s*['"]editing['"]\}/,
    'Word.tsx should map code-office View/Edit mode to SuperDoc viewing/editing mode'
);

assert.match(
    wordSource,
    /role=\{mode\s*===\s*['"]viewer['"]\s*\?\s*['"]viewer['"]\s*:\s*['"]editor['"]\}/,
    'Word.tsx should map code-office View/Edit mode to SuperDoc viewer/editor roles'
);

assert.match(
    wordSource,
    /layoutEngineOptions=\{\{[\s\S]*?flowMode:\s*['"]paginated['"][\s\S]*?virtualization:/,
    'Word.tsx should request SuperDoc paginated layout with bounded virtualization'
);

assert.match(
    wordSource,
    /allowSelectionInViewMode=\{true\}/,
    'Word.tsx should allow text selection in read-only SuperDoc view mode'
);

assert.match(
    wordSource,
    /const\s+instance\s*=\s*superdocRef\.current\?\.getInstance\(\)/,
    'Word.tsx should export through the live SuperDoc instance'
);

assert.match(
    wordSource,
    /instance\.export\(\{[\s\S]*?exportType:\s*\[['"]docx['"]\][\s\S]*?triggerDownload:\s*false/,
    'Word.tsx should export DOCX bytes without triggering a browser download'
);

assert.match(
    wordSource,
    /bytes:\s*Array\.from\(new\s+Uint8Array\(buffer\)\)/,
    'Word.tsx should send exported DOCX bytes back to the extension host'
);

assert.match(
    wordSource,
    /useState<['"]viewer['"]\s*\|\s*['"]editor['"]>\(['"]viewer['"]\)/,
    'Word.tsx should default DOCX files to viewer mode'
);

assert.match(
    wordSource,
    /if\s*\(\s*mode\s*!==\s*['"]editor['"]\s*\)\s*return;[\s\S]*?requestHostSave\(\)/,
    'Word.tsx should ignore Cmd/Ctrl+S in viewer mode instead of marking read-only tabs dirty'
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
    wordCssSource,
    /\.docx-superdoc-container/,
    'Word.css should define the SuperDoc container surface'
);

assert.match(
    wordCssSource,
    /--doc-page-shadow:/,
    'Word.css should keep Word-style page shadow tokens for DOCX rendering'
);

assert.match(
    wordCssSource,
    /font-family:\s*"Malgun Gothic"/,
    'Word.css should prefer Malgun Gothic for Korean DOCX rendering'
);

assert.match(
    wordCssSource,
    /word-break:\s*keep-all/,
    'Word.css should keep Korean words together where possible'
);

assert.match(
    wordCssSource,
    /overflow-wrap:\s*anywhere/,
    'Word.css should prevent long table-cell content from overflowing the DOCX surface'
);

assert.doesNotMatch(
    wordSource + wordCssSource,
    /@eigenpal\/docx-editor-react|docx-editor--word-parity|DOCX_EDITOR_FONT_FAMILIES/,
    'DOCX product source should not import or tune the removed eigenpal runtime'
);

assert.doesNotMatch(
    wordSource + wordCssSource,
    /docx-preview|renderAsync|docx-wrapper|section\.docx|annotateDocxPreviewPages|fitDocxPreviewToViewport/,
    'DOCX product source should not keep the removed docx-preview runtime path'
);

assert.doesNotMatch(
    wordSource + handlerSource,
    /LibreOffice|soffice|docxOpenPdfPreview|pdf-frame/,
    'DOCX product source should not depend on LibreOffice/PDF iframe fallback'
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
