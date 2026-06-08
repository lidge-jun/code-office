import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const wordSource = await readFile(path.join(root, 'src/react/view/word/Word.tsx'), 'utf8');
const wordCssSource = await readFile(path.join(root, 'src/react/view/word/Word.css'), 'utf8');
const handlerSource = await readFile(path.join(root, 'src/provider/handlers/docxHandler.ts'), 'utf8');
const providerSource = await readFile(path.join(root, 'src/provider/docx/DocxEditorProvider.ts'), 'utf8');
const saveCustomDocumentSource = providerSource.match(/public\s+async\s+saveCustomDocument[\s\S]*?\n    public\s+async\s+saveActiveDocxDocument/)?.[0] ?? '';

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
    /purpose\s*=\s*['"]save['"]/,
    'Word.tsx should default DOCX export requests to real save purpose'
);

assert.match(
    wordSource,
    /if\s*\(\s*purpose\s*===\s*['"]save['"]\s*\)\s*\{[\s\S]*?setDirty\(false\)/,
    'Word.tsx should clear dirty only for real saves, not backup exports'
);

assert.match(
    wordSource,
    /import\s+\{[\s\S]*?SuperDocEditor[\s\S]*?type\s+SuperDocRef[\s\S]*?\}\s+from\s+['"]@superdoc-dev\/react['"]/,
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
    /const\s+\[documentVersion,\s*setDocumentVersion\]\s*=\s*useState\(0\)/,
    'Word.tsx should track a document byte-version separate from the filename'
);

assert.match(
    wordSource,
    /setDocumentBuffer\(buffer\)[\s\S]*?latestSaveBufferRef\.current\s*=\s*buffer[\s\S]*?setDocumentVersion\(\(version\)\s*=>\s*version\s*\+\s*1\)/,
    'Word.tsx should bump the document version whenever fresh DOCX bytes are loaded'
);

assert.match(
    wordSource,
    /key=\{`\$\{documentName\}:\$\{documentVersion\}`\}/,
    'Word.tsx should recreate the SuperDoc instance when fresh bytes arrive for the same filename'
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
    /const\s+sourceBuffer\s*=\s*latestSaveBufferRef\.current\s*\?\?\s*documentBuffer/,
    'Word.tsx should use the latest source DOCX buffer when patching edited XML parts'
);

assert.match(
    wordSource,
    /const\s+activeEditorBlob\s*=\s*await\s+exportEditorDocx\(bodyEditorRef\.current,\s*sourceBuffer\)\s*\?\?\s*await\s+exportEditorDocx/,
    'Word.tsx should prefer exporting the body editor that produced edit transactions instead of the original document fallback'
);

assert.match(
    wordSource,
    /exportCurrentDocumentRef\.current\s*=\s*exportCurrentDocument/,
    'Word.tsx should keep the latest exporter in a ref so message handlers do not need to re-register on every document buffer change'
);

assert.match(
    wordSource,
    /buffer\s*=\s*await\s+exportCurrentDocumentRef\.current\(\)/,
    'Word.tsx save requests should call the latest exporter ref from the single registered webview message handler'
);

assert.match(
    wordSource,
    /let\s+buffer:\s*ArrayBuffer\s*\|\s*null\s*=\s*null[\s\S]*?try\s*\{[\s\S]*?buffer\s*=\s*await\s+exportCurrentDocumentRef\.current\(\)[\s\S]*?catch\s*\(e\)\s*\{[\s\S]*?patchDocxTextFromSnapshots/,
    'Word.tsx should use the visible-text XML fallback even when the native SuperDoc export throws before producing bytes'
);

assert.doesNotMatch(
    wordSource,
    /handler\.emit\(DOCX_EVENTS\.init\);\s*\},\s*\[[^\]]*exportCurrentDocument/,
    'Word.tsx should not re-emit init when exportCurrentDocument changes after openBuffer updates documentBuffer'
);

assert.match(
    wordSource,
    /async\s+function\s+exportEditorDocx[\s\S]*?exportDocx\.call\(editor/,
    'Word.tsx should export current DOCX edits through the concrete SuperDoc editor when available'
);

assert.match(
    wordSource,
    /getUpdatedDocs:\s*true/,
    'Word.tsx should request live updated DOCX XML parts from the SuperDoc editor before falling back to full export'
);

assert.match(
    wordSource,
    /getUpdatedDocs:\s*true[\s\S]*?catch\s*\{[\s\S]*?try the next SuperDoc export strategy/,
    'Word.tsx should continue to exportXmlOnly if SuperDoc getUpdatedDocs throws for a document shape'
);

assert.match(
    wordSource,
    /exportXmlOnly:\s*true/,
    'Word.tsx should first request raw live document XML from SuperDoc before accepting package-level export fallbacks'
);

assert.match(
    wordSource,
    /exportXmlOnly:\s*true[\s\S]*?catch\s*\{[\s\S]*?try the package-level SuperDoc export fallback/,
    'Word.tsx should continue to package-level export if SuperDoc exportXmlOnly throws for a document shape'
);

assert.match(
    wordSource,
    /exportDocx\.call\(editor,\s*exportOptions\)[\s\S]*?catch\s*\{[\s\S]*?allow the caller to try another editor or instance\.export/,
    'Word.tsx should return null instead of throwing when editor-level full export fails'
);

assert.match(
    wordSource,
    /async\s+function\s+patchDocxParts[\s\S]*?JSZip\.loadAsync[\s\S]*?zip\.file\(path,\s*content\)[\s\S]*?generateAsync/,
    'Word.tsx should patch updated DOCX XML parts into the source ZIP instead of accepting stale original bytes'
);

assert.match(
    wordSource,
    /const\s+sourceBuffer\s*=\s*latestSaveBufferRef\.current\s*\?\?\s*documentBuffer[\s\S]*?patchDocxTextFromSnapshots\([\s\S]*?sourceBuffer[\s\S]*?lastPersistedTextSnapshotRef\.current/,
    'Word.tsx should repair stale SuperDoc exports by patching visible text diffs into word/document.xml before failing save'
);

assert.match(
    wordSource,
    /const\s+sourceBuffer\s*=\s*latestSaveBufferRef\.current\s*\?\?\s*documentBuffer[\s\S]*?getMissingVisibleTextSnippetsFromSource\(sourceBuffer,\s*currentSnapshot\)/,
    'Word.tsx should compare the visible editor text against the actual source DOCX XML so stale persisted snapshots cannot hide edits'
);

assert.match(
    wordSource,
    /async\s+function\s+getMissingVisibleTextSnippetsFromSource[\s\S]*?JSZip\.loadAsync\(sourceBuffer\.slice\(0\)\)[\s\S]*?word\/document\.xml[\s\S]*?!sourceText\.includes\(token\)/,
    'Word.tsx should derive missing visible edit snippets from word/document.xml before accepting a SuperDoc export'
);

assert.match(
    wordSource,
    /buffer\s*=\s*await\s+exportCurrentDocumentRef\.current\(\)[\s\S]*?getMissingVisibleTextSnippetsFromSource\(buffer,\s*currentSnapshot\)[\s\S]*?assertDocxContainsTextSnippets\(buffer,\s*snippets\)/,
    'Word.tsx should reject stale successful SuperDoc exports when the exported DOCX still misses visible editor text'
);

assert.match(
    wordSource,
    /splitEditorTextLines\(currentText\)\.filter\(\(line\)\s*=>\s*isRelevantVisibleLine\(line\)\s*&&\s*!sourceText\.includes\(normalizeEditorText\(line\)\)\)/,
    'Word.tsx should include missing visible lines, not only individual tokens, when validating and patching DOCX saves'
);

assert.match(
    wordSource,
    /function\s+sanitizeEditorSnapshotText[\s\S]*?splitEditorTextLines\(value\)[\s\S]*?filter\(isRelevantVisibleLine\)[\s\S]*?join\('\\n'\)/,
    'Word.tsx should sanitize editor snapshots before DOCX save validation so toolbar text cannot be patched into document XML'
);

assert.match(
    wordSource,
    /function\s+isRelevantVisibleLine[\s\S]*?unset\|selected\|tracked changes\|overflow items\|cursor moved/,
    'Word.tsx should reject SuperDoc toolbar and status lines from visible-text DOCX fallback snippets'
);

assert.match(
    wordSource,
    /function\s+mergeTextSnippets[\s\S]*?new\s+Set\(groups\.flat\(\)\)[\s\S]*?slice\(0,\s*5\)/,
    'Word.tsx should merge persisted-snapshot and source-XML save verification snippets with a bounded set'
);

assert.match(
    wordSource,
    /function\s+getRelevantTextTokens[\s\S]*?'changes'[\s\S]*?'items'[\s\S]*?'selected'[\s\S]*?'size'[\s\S]*?!\/\^\\d\+\$\/\.test\(normalized\)/,
    'Word.tsx should share toolbar/status-token filtering across persisted-snapshot and source-XML comparisons'
);

assert.match(
    wordSource,
    /const\s+sourceBuffer\s*=\s*latestSaveBufferRef\.current\s*\?\?\s*documentBuffer[\s\S]*?patchDocxTextFromSnapshots\([\s\S]*?sourceBuffer[\s\S]*?\)\s*\?\?\s*await\s+patchDocxTextFromSnapshots\([\s\S]*?documentBuffer/,
    'Word.tsx should retry visible-text XML repair against the original document buffer if the stale SuperDoc export buffer is not patchable'
);

assert.doesNotMatch(
    wordSource.match(/const\s+exportCurrentDocument\s*=\s*useCallback[\s\S]*?\},\s*\[documentBuffer,\s*documentName\]\);/)?.[0] ?? '',
    /latestSaveBufferRef\.current\s*=\s*buffer/,
    'Word.tsx should not overwrite the last persisted DOCX buffer with an unverified SuperDoc export'
);

assert.match(
    wordSource,
    /function\s+replaceParagraphText[\s\S]*?extractDocxText\(paragraphXml\)[\s\S]*?encodeXmlText\(toText\)/,
    'Word.tsx should patch DOCX paragraph text safely using XML encoding'
);

assert.match(
    wordSource,
    /function\s+findBestSourceParagraph[\s\S]*?normalizedLine\.startsWith\(`\$\{normalizedParagraph\} `\)[\s\S]*?normalizedLine\.includes\(normalizedParagraph\)/,
    'Word.tsx should repair stale SuperDoc exports even when toolbar or accessibility text shifts visible line indexes'
);

assert.match(
    wordSource,
    /function\s+hasStrongParagraphTokenOverlap[\s\S]*?overlap\s*>=\s*Math\.min\(2,\s*paragraphTokens\.length\)[\s\S]*?overlap\s*\/\s*paragraphTokens\.length\s*>=\s*0\.5/,
    'Word.tsx should still identify the source paragraph when a new edit splits the original visible paragraph text'
);

assert.match(
    wordSource,
    /function\s+findInsertionPointForNewLine[\s\S]*?position:\s*['"]after['"][\s\S]*?position:\s*['"]before['"]/,
    'Word.tsx should find an adjacent source paragraph when a visible edit creates a brand new DOCX paragraph'
);

assert.match(
    wordSource,
    /function\s+insertParagraphTextAdjacent[\s\S]*?<w:p><w:r><w:t>\$\{encodeXmlText\(insertedText\)\}<\/w:t><\/w:r><\/w:p>[\s\S]*?position\s*===\s*['"]before['"]/,
    'Word.tsx should insert new visible edit lines into word/document.xml instead of only replacing existing paragraphs'
);

assert.match(
    wordSource,
    /function\s+getComparableParagraphTokens[\s\S]*?!\/\^xmlpatch\\d\+_ok_\\d\+\/i\.test\(token\)/,
    'Word.tsx should ignore QA marker tokens while fuzzy-matching source paragraphs for XML repair'
);

assert.doesNotMatch(
    wordSource.match(/async\s+function\s+patchDocxTextFromSnapshots[\s\S]*?const\s+zip\s*=\s*await\s+JSZip\.loadAsync/)?.[0] ?? '',
    /if\s*\(\s*!\s*replacements\.length\s*\)\s*return\s+null/,
    'Word.tsx should not return before paragraph matching when visible editor lines are shifted by SuperDoc UI text'
);

assert.match(
    wordSource,
    /await\s+assertDocxContainsTextSnippets\(buffer,\s*snippets\)/,
    'Word.tsx should validate exported DOCX XML contains current visible edits before telling VS Code save succeeded'
);

assert.match(
    wordSource,
    /function\s+extractDocxText[\s\S]*?<w:t\\b/,
    'Word.tsx should inspect word/document.xml text nodes for save verification'
);

assert.doesNotMatch(
    wordSource,
    /key=\{`\$\{documentName\}-\$\{mode\}`\}/,
    'Word.tsx should not recreate the SuperDoc instance just because the user switches View/Edit mode'
);

assert.match(
    wordSource,
    /onEditorCreate=\{\(event:\s*SuperDocEditorCreateEvent\)\s*=>\s*\{[\s\S]*?bodyEditorRef\.current\s*=\s*event\.editor/,
    'Word.tsx should retain the real body editor from SuperDoc creation for save export'
);

assert.match(
    wordSource,
    /handleTransaction[\s\S]*?bodyEditorRef\.current\s*=\s*event\.editor/,
    'Word.tsx should refresh the body editor from SuperDoc transactions for save export'
);

assert.match(
    wordSource,
    /bytes:\s*Array\.from\(new\s+Uint8Array\(buffer\)\)/,
    'Word.tsx should send exported DOCX bytes back to the extension host'
);

assert.match(
    wordSource,
    /function\s+isFatalSuperDocException\([\s\S]*?payload\.stage\s*===\s*['"]document-init['"][\s\S]*?payload\.code\s*===\s*['"]password-required['"]/,
    'Word.tsx should reserve fatal SuperDoc errors for document init/password failures'
);

assert.match(
    wordSource,
    /onException=\{\(event\)\s*=>\s*\{[\s\S]*?if\s*\(isFatalSuperDocException\(event\)\)[\s\S]*?setError\(message\)[\s\S]*?setWarning\(message\)/,
    'Word.tsx should keep nonfatal SuperDoc lifecycle/export exceptions as warnings instead of replacing the document'
);

assert.match(
    wordSource,
    /useState<['"]viewer['"]\s*\|\s*['"]editor['"]>\(['"]viewer['"]\)/,
    'Word.tsx should default DOCX files to viewer mode'
);

assert.match(
    wordSource,
    /if\s*\(\s*mode\s*!==\s*['"]editor['"]\s*\)\s*return;[\s\S]*?if\s*\(\s*hostSaveInProgressRef\.current\s*\)\s*return;[\s\S]*?requestHostSave\(\)/,
    'Word.tsx should ignore Cmd/Ctrl+S in viewer mode and avoid duplicate saves while a host save is already in flight'
);

assert.match(
    wordSource,
    /event\.transaction\.docChanged/,
    'Word.tsx should mark DOCX dirty for SuperDoc transactions that changed the document'
);

assert.match(
    wordSource,
    /readEditorTextSnapshot\(editorSurfaceRef\.current\)[\s\S]*?nextSnapshot\s*===\s*editorTextSnapshotRef\.current[\s\S]*?setDirty\(true\)/,
    'Word.tsx should mark text edits dirty by comparing the SuperDoc editor text snapshot'
);

assert.match(
    wordSource,
    /\.ProseMirror\[contenteditable=["']true["']\],\s*\[contenteditable=["']true["']\]/,
    'Word.tsx should read save-verification text from SuperDoc body contenteditable nodes before broad document roles'
);

assert.doesNotMatch(
    wordSource,
    /\[role=["']document["']\],\s*\[aria-label=["']Main content area["']\]/,
    'Word.tsx should not prefer broad SuperDoc document containers because they include toolbar text'
);

assert.match(
    wordSource,
    /'changes'[\s\S]*'items'[\s\S]*'selected'[\s\S]*'size'/,
    'Word.tsx should ignore SuperDoc toolbar/status tokens when checking save export snippets'
);

assert.match(
    wordSource,
    /!\s*\/\^\\d\+\$\/\.test\(normalized\)/,
    'Word.tsx should ignore numeric toolbar/status tokens such as zoom percentages during save verification'
);

assert.doesNotMatch(
    wordSource,
    /document\.addEventListener\(['"](beforeinput|input|cut|paste)['"]/,
    'Word.tsx should not use global DOM input listeners that mark cursor movement as dirty'
);

assert.doesNotMatch(
    wordSource,
    /const\s+handleEditorUpdate\s*=\s*useCallback\(\(\)\s*=>\s*\{[\s\S]*?setDirty\(true\)/,
    'Word.tsx should not use broad SuperDoc editor-update events without checking editor text changes'
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
    /\.docx-shell__warning/,
    'Word.css should style nonfatal SuperDoc warnings without replacing the document surface'
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
    'docxHandler.ts should keep a VS Code save fallback when no provider host-save callback is registered'
);

assert.match(
    providerSource,
    /private\s+async\s+saveActiveDocument[\s\S]*?await\s+this\.writeDocumentFromWebview\(document\)/,
    'DocxEditorProvider toolbar save should write through the active webview bridge instead of relying on active-editor save routing'
);

assert.doesNotMatch(
    saveCustomDocumentSource,
    /if\s*\(\s*!document\.isDirty\s*\)\s*return/,
    'DocxEditorProvider saveCustomDocument should not skip VS Code requested saves because of an internal dirty-state desync'
);

assert.doesNotMatch(
    providerSource.match(/private\s+async\s+saveActiveDocument[\s\S]*?\n    private\s+async\s+writeDocumentFromWebview/)?.[0] ?? '',
    /if\s*\(\s*!document\.isDirty\s*\)\s*return/,
    'DocxEditorProvider toolbar/Cmd+S save should not skip active saves because of dirty-state message ordering'
);

assert.doesNotMatch(
    providerSource,
    /VS Code did not run the DOCX save lifecycle for the active editor/,
    'DocxEditorProvider toolbar save should not fail just because VS Code did not route workbench.action.files.save to the custom editor'
);

assert.match(
    providerSource,
    /private\s+async\s+writeDocumentFromWebview[\s\S]*?bridge\.requestSave\(\)[\s\S]*?workspace\.fs\.writeFile\(document\.uri,\s*buffer\)[\s\S]*?this\.setDirty\(document,\s*false\)/,
    'DocxEditorProvider should centralize DOCX save writes through the webview export bridge'
);

assert.match(
    providerSource,
    /backupCustomDocument[\s\S]*?bridge\.requestSave\(['"]backup['"]\)/,
    'DocxEditorProvider backupCustomDocument should export with backup purpose so it does not clear dirty state'
);

assert.match(
    providerSource,
    /openContext\.backupId[\s\S]*?this\.tryReadBackup\(openContext\.backupId\)/,
    'DocxEditorProvider openCustomDocument should route backup restores through a stale-backup-safe helper'
);

assert.match(
    providerSource,
    /private\s+async\s+tryReadBackup[\s\S]*?catch\s*\{[\s\S]*?return\s+undefined/,
    'DocxEditorProvider should fall back to the original DOCX when VS Code provides a stale missing backupId'
);

assert.match(
    handlerSource,
    /export\s+type\s+DocxSavePurpose\s*=\s*['"]save['"]\s*\|\s*['"]backup['"]/,
    'docxHandler.ts should type save request purpose'
);

assert.match(
    handlerSource,
    /requestSave\(purpose:\s*DocxSavePurpose\s*=\s*['"]save['"]\)/,
    'DocxSaveBridge should default requestSave to real save purpose'
);

assert.match(
    handlerSource,
    /DOCX_EVENTS\.saveRequest,\s*\{\s*requestId,\s*purpose\s*\}/,
    'DocxSaveBridge should include save purpose in webview save requests'
);

assert.match(
    handlerSource,
    /this\.handler\.on\(DOCX_EVENTS\.saveResponse/,
    'DocxSaveBridge should remain the owner of requestId-based save responses'
);

console.log('docx editor provider checks passed');
