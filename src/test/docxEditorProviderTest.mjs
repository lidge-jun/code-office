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
    /hostSaveCompleted:\s*'docxHostSaveCompleted'/,
    'Word.tsx should define a host-save completion event so mode switches can wait for real VS Code saves'
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
    /role=["']editor["']/,
    'Word.tsx should keep the SuperDoc role stable so View/Edit mode switches do not rebuild the editor'
);

assert.match(
    wordSource,
    /hideToolbar=\{false\}/,
    'Word.tsx should keep the SuperDoc toolbar container stable and hide it with CSS in viewer mode'
);

assert.match(
    wordSource,
    /const\s+DOCX_SUPERDOC_MODULES\s*=\s*\{[\s\S]*?trackChanges:\s*\{[\s\S]*?enabled:\s*false[\s\S]*?visible:\s*false[\s\S]*?mode:\s*['"]off['"]/,
    'Word.tsx should disable SuperDoc tracked-change UI through stable modules.trackChanges config'
);

assert.match(
    wordSource,
    /modules=\{DOCX_SUPERDOC_MODULES\}/,
    'Word.tsx should pass stable SuperDoc modules config instead of deprecated top-level trackChanges props'
);

assert.doesNotMatch(
    wordSource,
    /trackChanges=\{\{/,
    'Word.tsx should not use deprecated top-level SuperDoc trackChanges config'
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
    /const\s+bodyEditorBlob\s*=\s*await\s+exportEditorDocx\(bodyEditorRef\.current,\s*sourceBuffer\)/,
    'Word.tsx should prefer exporting the body editor that produced edit transactions'
);

assert.match(
    wordSource,
    /activeEditor\s*&&\s*activeEditor\s*!==\s*bodyEditorRef\.current[\s\S]*?await\s+exportEditorDocx\(activeEditor,\s*sourceBuffer\)/,
    'Word.tsx should avoid calling the same SuperDoc editor export path twice for one save'
);

assert.doesNotMatch(
    wordSource,
    /nativeExportBrokenRef|SuperDoc native DOCX export is disabled after a prior elements exception/,
    'Word.tsx should not permanently disable native SuperDoc export after one transient elements exception'
);

assert.match(
    wordSource,
    /exportCurrentDocumentRef\.current\s*=\s*exportCurrentDocument/,
    'Word.tsx should keep the latest exporter in a ref so message handlers do not need to re-register on every document buffer change'
);

assert.match(
    wordSource,
    /buffer\s*=\s*await\s+withTimeout\([\s\S]*?exportCurrentDocumentRef\.current\(\)[\s\S]*?DOCX_EXPORT_TIMEOUT_MS/,
    'Word.tsx save requests should call the latest exporter ref with an inner timeout from the single registered webview message handler'
);

assert.match(
    wordSource,
    /let\s+buffer:\s*ArrayBuffer\s*\|\s*null\s*=\s*null[\s\S]*?try\s*\{[\s\S]*?buffer\s*=\s*await\s+withTimeout\([\s\S]*?exportCurrentDocumentRef\.current\(\)[\s\S]*?catch\s*\(e\)\s*\{[\s\S]*?repairDocxTextFromSnapshots/,
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
    /getUpdatedDocs:\s*true[\s\S]*?catch\s*\(e\)\s*\{[\s\S]*?if\s*\(\s*isSuperDocElementsError\(e\)\s*\)\s*throw\s+e[\s\S]*?try the next SuperDoc export strategy/,
    'Word.tsx should stop native export retries on SuperDoc elements errors but continue for other export shapes'
);

assert.match(
    wordSource,
    /exportXmlOnly:\s*true/,
    'Word.tsx should first request raw live document XML from SuperDoc before accepting package-level export fallbacks'
);

assert.match(
    wordSource,
    /exportXmlOnly:\s*true[\s\S]*?catch\s*\(e\)\s*\{[\s\S]*?if\s*\(\s*isSuperDocElementsError\(e\)\s*\)\s*throw\s+e[\s\S]*?try the package-level SuperDoc export fallback/,
    'Word.tsx should stop native export retries on SuperDoc elements errors during exportXmlOnly'
);

assert.match(
    wordSource,
    /exportDocx\.call\(editor,\s*exportOptions\)[\s\S]*?catch\s*\(e\)\s*\{[\s\S]*?if\s*\(\s*isSuperDocElementsError\(e\)\s*\)\s*throw\s+e[\s\S]*?allow the caller to try another editor or instance\.export/,
    'Word.tsx should return null instead of throwing when editor-level full export fails'
);

assert.match(
    wordSource,
    /async\s+function\s+patchDocxParts[\s\S]*?JSZip\.loadAsync[\s\S]*?zip\.file\(path,\s*content\)[\s\S]*?generateAsync/,
    'Word.tsx should patch updated DOCX XML parts into the source ZIP instead of accepting stale original bytes'
);

assert.match(
    wordSource,
    /const\s+sourceBuffer\s*=\s*latestSaveBufferRef\.current\s*\?\?\s*documentBuffer[\s\S]*?withTimeout\([\s\S]*?repairDocxTextFromSnapshots\(\s*documentBuffer,\s*sourceBuffer,\s*currentSnapshot,\s*lastPersistedTextSnapshotRef\.current,\s*snippets,\s*\)[\s\S]*?DOCX_REPAIR_TIMEOUT_MS/,
    'Word.tsx should repair stale SuperDoc exports through deterministic DOCX XML fallback before failing save'
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
    /buffer\s*=\s*await\s+withTimeout\([\s\S]*?exportCurrentDocumentRef\.current\(\)[\s\S]*?getMissingVisibleTextSnippetsFromSource\(buffer,\s*currentSnapshot\)[\s\S]*?try\s*\{[\s\S]*?assertDocxContainsTextSnippets\(buffer,\s*snippets\)[\s\S]*?catch\s*\(validationError\)[\s\S]*?DOCX export warning/,
    'Word.tsx should warn on stale-looking successful SuperDoc exports without forcing the slow XML repair path'
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
    /const\s+attempts:\s*Array<\(\)\s*=>\s*Promise<ArrayBuffer\s*\|\s*null>>\s*=\s*\[[\s\S]*?patchDocxTextFromSnapshots\(sourceBuffer[\s\S]*?patchDocxTextFromSnapshots\(documentBuffer/,
    'Word.tsx should retry visible-text XML repair against the original document buffer if the stale SuperDoc export buffer is not patchable'
);

assert.match(
    wordSource,
    /repairDocxTextFromSnapshots\(\s*documentBuffer,\s*sourceBuffer,\s*currentSnapshot,\s*lastPersistedTextSnapshotRef\.current,\s*snippets,\s*\)/,
    'Word.tsx should route failed SuperDoc saves through the deterministic DOCX XML repair helper'
);

assert.match(
    wordSource,
    /const\s+\[zoomScale,\s*setZoomScale\]\s*=\s*useState\(1\)/,
    'Word.tsx should track DOCX viewer zoom locally for VS Code WebView pinch gestures'
);

assert.match(
    wordSource,
    /const\s+handleViewerWheel\s*=\s*useCallback\([\s\S]*?event\.ctrlKey[\s\S]*?event\.metaKey[\s\S]*?event\.preventDefault\(\)[\s\S]*?Math\.min\(2\.5,\s*Math\.max\(0\.5/,
    'Word.tsx should handle trackpad pinch-style ctrl/meta wheel zoom with bounded scale'
);

assert.match(
    wordSource,
    /applySuperDocZoom\(superdocRef\.current\?\.getInstance\(\),\s*bodyEditorRef\.current,\s*roundedZoom\)/,
    'Word.tsx should route DOCX pinch zoom through SuperDoc setZoom instead of CSS zoom'
);

assert.match(
    wordSource,
    /function\s+applySuperDocZoom[\s\S]*?editorCandidates\s*=\s*\[bodyEditor,\s*activeEditor\][\s\S]*?maybeEditorZoomable\.setZoom\(zoom\)[\s\S]*?maybeSuperDocZoomable\.setZoom\(Math\.round\(zoom\s*\*\s*100\)\)/,
    'Word.tsx should send multiplier zoom to SuperDoc editors and percent zoom to the SuperDoc shell instance'
);

assert.match(
    wordSource,
    /async\s+function\s+appendDocxTextSnippets[\s\S]*?word\/document\.xml[\s\S]*?insertParagraphBeforeSectionOrBodyEnd[\s\S]*?generateAsync/,
    'Word.tsx should implement a final DOCX XML append safety net for new edit text'
);

assert.match(
    wordSource,
    /async\s+function\s+repairDocxTextFromSnapshots[\s\S]*?appendDocxTextSnippets\(documentBuffer,\s*candidateSnippets\)[\s\S]*?appendDocxTextSnippets\(sourceBuffer,\s*candidateSnippets\)[\s\S]*?patchDocxTextFromSnapshots\(sourceBuffer[\s\S]*?patchDocxTextFromSnapshots\(documentBuffer[\s\S]*?catch\s*\{[\s\S]*?Continue to the next deterministic XML repair strategy/,
    'Word.tsx should try append-first repair and isolate each repair failure so one bad strategy cannot block later fallbacks'
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
    /function\s+insertParagraphBeforeBodyEnd[\s\S]*?insertParagraphBeforeSectionOrBodyEnd\(documentXml,\s*insertedText,\s*insertedParagraph\)/,
    'Word.tsx should route brand-new blank-DOCX text through the section-safe body insertion helper'
);

assert.match(
    wordSource,
    /function\s+insertParagraphBeforeSectionOrBodyEnd[\s\S]*?documentXml\.includes\(['"]<\/w:body>['"]\)[\s\S]*?documentXml\.replace\(\/<w:sectPr\\b\[\\s\\S\]\*\?<\\\/w:sectPr>\/[\s\S]*?documentXml\.replace\(\/<w:sectPr\\s\*\\\/>\/[\s\S]*?documentXml\.replace\(['"]<\/w:body>['"]/,
    'Word.tsx should insert fallback paragraphs before section properties instead of after them'
);

assert.match(
    wordSource,
    /const\s+bodyEndInsertions:\s*string\[\]\s*=\s*\[\][\s\S]*?bodyEndInsertions\.push\(currentLine\)[\s\S]*?insertParagraphBeforeBodyEnd/,
    'Word.tsx should queue no-anchor visible edits for body-end insertion during save repair'
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
    /try\s*\{[\s\S]*?await\s+assertDocxContainsTextSnippets\(buffer,\s*snippets\)[\s\S]*?\}\s*catch\s*\(validationError\)\s*\{[\s\S]*?nextWarning\s*=/,
    'Word.tsx should validate exported DOCX XML and downgrade false-negative snippet mismatches to a warning'
);

assert.match(
    wordSource,
    /const\s+DOCX_EXPORT_TIMEOUT_MS\s*=\s*10000/,
    'Word.tsx should cap native DOCX export time so Cmd+S cannot hang until the host bridge timeout'
);

assert.match(
    wordSource,
    /telemetry=\{\{\s*enabled:\s*false\s*\}\}/,
    'Word.tsx should disable SuperDoc telemetry inside the VS Code WebView CSP sandbox'
);

assert.match(
    wordSource,
    /fonts=\{\{[\s\S]*?resolveAssetUrl:\s*\(\{\s*file\s*\}\)\s*=>\s*SUPERDOC_FONT_ASSET_URLS\[file\]/,
    'Word.tsx should resolve SuperDoc bundled fonts through Vite/WebView-safe asset URLs'
);

assert.match(
    wordSource,
    /Carlito-Regular\.woff2['"]:\s*CarlitoRegularUrl[\s\S]*?LiberationSerif-Regular\.woff2['"]:\s*LiberationSerifRegularUrl/,
    'Word.tsx should include metric-compatible SuperDoc bundled font assets used by DOCX layout'
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

assert.doesNotMatch(
    wordSource,
    /hideToolbar=\{mode\s*===\s*['"]viewer['"]\}/,
    'Word.tsx should not change hideToolbar during View/Edit switches because the React wrapper rebuilds on that prop'
);

assert.doesNotMatch(
    wordSource,
    /role=\{mode\s*===/,
    'Word.tsx should not change SuperDoc role during View/Edit switches because the React wrapper rebuilds on that prop'
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
    /function\s+isIgnorableSuperDocException[\s\S]*?Cannot read properties of undefined[\s\S]*?elements/,
    'Word.tsx should suppress the noisy nonfatal SuperDoc elements exception from the user-facing surface'
);

assert.match(
    wordSource,
    /function\s+isIgnorableSuperDocException[\s\S]*?elements\|comments/,
    'Word.tsx should suppress SuperDoc comments-shape exceptions the same way it suppresses elements-shape exceptions'
);

assert.match(
    wordSource,
    /onException=\{\(event\)\s*=>\s*\{[\s\S]*?if\s*\(isFatalSuperDocException\(event\)\)[\s\S]*?setError\(message\)[\s\S]*?else\s+if\s*\(!isIgnorableSuperDocException\(event\)\)[\s\S]*?setWarning\(message\)/,
    'Word.tsx should show only actionable nonfatal SuperDoc warnings, not repeated upstream elements noise'
);

assert.match(
    wordSource,
    /DOCX_RENDER_TIMEOUT_MS\s*=\s*12000[\s\S]*?setWarning\(['"]DOCX render is taking longer than expected/,
    'Word.tsx should expose long SuperDoc render hangs instead of leaving users in an indefinite loading state'
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
    /const\s+requestHostSaveAndWait\s*=\s*useCallback[\s\S]*?DOCX_HOST_SAVE_TIMEOUT_MS[\s\S]*?handler\.emit\(DOCX_EVENTS\.hostSaveRequest\)/,
    'Word.tsx should expose a host-save waiter for Edit to View transitions'
);

assert.match(
    wordSource,
    /handler\.on\(DOCX_EVENTS\.hostSaveCompleted[\s\S]*?resolveHostSaveWaiters\(result\)/,
    'Word.tsx should resolve host-save waiters only after the extension host reports save completion'
);

assert.match(
    wordSource,
    /const\s+switchToViewer\s*=\s*useCallback[\s\S]*?if\s*\(wasDirty\)\s*\{[\s\S]*?await\s+requestHostSaveAndWait\(\)[\s\S]*?setDirty\(false\)[\s\S]*?setMode\(['"]viewer['"]\)/,
    'Word.tsx should auto-save dirty edits before switching to View and leave View mode clean'
);

assert.doesNotMatch(
    wordSource.match(/const\s+switchToViewer\s*=\s*useCallback[\s\S]*?\},\s*\[[^\]]*\]\);/)?.[0] ?? '',
    /if\s*\(\s*wasDirty\s*\)\s*setDirty\(true\)/,
    'Word.tsx should not re-mark the DOCX dirty after switching into View mode'
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

assert.match(
    wordSource,
    /\.superdoc-page/,
    'Word.tsx should read save-verification text from rendered SuperDoc pages when the editor exposes a broad document role'
);

assert.match(
    wordSource,
    /fallbackSurface\.querySelectorAll\(['"][\s\S]*?\.superdoc-toolbar-container[\s\S]*?\[role=["']toolbar["'][\s\S]*?element\.remove\(\)/,
    'Word.tsx should remove SuperDoc toolbar/status surfaces before falling back to broad visible text'
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
    /\.docx-superdoc-container\[data-docx-mode=["']viewer["']\]\s+\.superdoc-toolbar-container[\s\S]*?display:\s*none/,
    'Word.css should hide the stable SuperDoc toolbar container in viewer mode without changing hideToolbar'
);

assert.match(
    wordCssSource,
    /\.docx-superdoc\.superdoc-wrapper,[\s\S]*?\.docx-superdoc\s+\.superdoc-editor-container\s*\{[\s\S]*?width:\s*100%[\s\S]*?height:\s*100%[\s\S]*?min-width:\s*0[\s\S]*?min-height:\s*0/,
    'Word.css should keep the outer SuperDoc wrapper and mount container full-size'
);

assert.match(
    wordCssSource,
    /\.docx-superdoc\s+\.superdoc-editor-container\s*\{[\s\S]*?flex:\s*1\s+1\s+auto[\s\S]*?overflow:\s*hidden/,
    'Word.css should keep the SuperDoc mount full-width while leaving scroll ownership to the contained editor'
);

assert.doesNotMatch(
    wordCssSource,
    /\.docx-superdoc\s+\.superdoc-editor-container[\s\S]*?display:\s*block\s*!important/,
    'Word.css should not override SuperDoc loading-time inline display:none'
);

assert.doesNotMatch(
    wordCssSource,
    /\.docx-superdoc\s+\.superdoc-layout\s*\{[\s\S]*?width:\s*100%/,
    'Word.css should not override SuperDoc calculated page layout width'
);

assert.match(
    wordCssSource,
    /\.docx-superdoc\s+\.superdoc__layers,[\s\S]*?\.docx-superdoc\s+\.superdoc__document,[\s\S]*?\.docx-superdoc\s+\.superdoc__sub-document\s*\{[\s\S]*?width:\s*100%[\s\S]*?min-width:\s*0/,
    'Word.css should keep the SuperDoc document rail full-width so scrollbars align with the WebView edge'
);

assert.match(
    wordCssSource,
    /\.docx-superdoc\s+\.superdoc__layers\s*\{[\s\S]*?flex:\s*1\s+1\s+auto/,
    'Word.css should let SuperDoc layers fill the available editor rail without stretching pages'
);

assert.match(
    wordCssSource,
    /\.docx-superdoc\s+\.superdoc-editor-container\s*>\s*:is\(\.super-editor-container\.contained,\s*\.presentation-editor\)\s*\{[\s\S]*?width:\s*100%[\s\S]*?height:\s*100%[\s\S]*?overflow:\s*auto[\s\S]*?scrollbar-gutter:\s*stable\s+both-edges[\s\S]*?touch-action:\s*pan-x\s+pan-y\s+pinch-zoom/,
    'Word.css should make the actual SuperDoc scroll host fill the WebView rail and support trackpad/pinch gestures'
);

assert.match(
    wordCssSource,
    /\.docx-superdoc\s+\.presentation-editor\s*\{[\s\S]*?min-inline-size:\s*100%[\s\S]*?padding-inline:\s*24px/,
    'Word.css should make the gray DOCX canvas span the scrollport without forcing page width'
);

assert.match(
    wordCssSource,
    /\.docx-superdoc\s+\.presentation-editor__viewport\s*\{[\s\S]*?inline-size:\s*max-content[\s\S]*?max-inline-size:\s*none[\s\S]*?margin-inline:\s*auto/,
    'Word.css should center SuperDoc calculated page rails at the viewport layer'
);

assert.match(
    wordCssSource,
    /\.docx-superdoc\s+\.presentation-editor__viewport\s*>\s*\.superdoc-layout\s*\{[\s\S]*?margin-inline:\s*auto/,
    'Word.css may center SuperDoc layout through margins but must not force its width'
);

assert.match(
    wordCssSource,
    /\.docx-superdoc\s+\.super-editor-container\.contained\s*\{[\s\S]*?width:\s*100%[\s\S]*?align-items:\s*stretch/,
    'Word.css should stretch the SuperDoc contained editor host to the full rail instead of shrink-wrapping it left'
);

assert.match(
    wordCssSource,
    /\.docx-superdoc\s+\.super-editor-container\.contained\s*>\s*\.super-editor\s*\{[\s\S]*?width:\s*100%[\s\S]*?min-width:\s*inherit[\s\S]*?margin-inline:\s*0/,
    'Word.css should preserve SuperDoc intrinsic min-width math while keeping the host full-width'
);

const superdocLayoutBlock = wordCssSource.match(
    /\.docx-superdoc\s+\.superdoc-layout\s*\{[\s\S]*?\}/,
)?.[0] ?? '';

assert.doesNotMatch(
    superdocLayoutBlock,
    /(max-width|zoom|overflow-y):/,
    'Word.css should not override SuperDoc calculated layout max-width, zoom, or scroll ownership'
);

assert.doesNotMatch(
    wordCssSource.match(
        /\.docx-superdoc\s+\.superdoc__layers,[\s\S]*?\.docx-superdoc\s+\.superdoc__sub-document\s*\{[\s\S]*?\}/,
    )?.[0] ?? '',
    /(overflow|height):/,
    'Word.css should not override SuperDoc sub-document scroll ownership or height internals'
);

assert.doesNotMatch(
    wordCssSource,
    /\.docx-superdoc\s+\.presentation-editor__pages[\s\S]*?(width|max-width|overflow):|\.docx-superdoc\s+\.superdoc-layout\s*\{[\s\S]*?width:/,
    'Word.css should not override SuperDoc calculated page-list or layout width'
);

assert.match(
    wordCssSource,
    /\.docx-superdoc-container\s*\{[\s\S]*?overflow:\s*hidden/,
    'Word.css should contain DOCX pinch/trackpad gestures at the outer embedded editor surface'
);

assert.doesNotMatch(
    wordCssSource,
    /--docx-superdoc-zoom|zoom:\s*var\(--docx-superdoc-zoom/,
    'Word.css should not use CSS zoom for DOCX pages because SuperDoc owns viewport and painter sizing'
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
    /hostSaveCompleted:\s*'docxHostSaveCompleted'/,
    'docxHandler.ts should define the host save completion event'
);

assert.match(
    handlerSource,
    /handler\.on\(DOCX_EVENTS\.hostSaveRequest[\s\S]*?handler\.emit\(DOCX_EVENTS\.hostSaveCompleted,\s*\{\s*success:\s*true\s*\}\)[\s\S]*?handler\.emit\(DOCX_EVENTS\.hostSaveCompleted,\s*\{[\s\S]*?success:\s*false/,
    'docxHandler.ts should report host save success or failure back to the WebView'
);

assert.match(
    handlerSource,
    /commands\.executeCommand\(['"]workbench\.action\.files\.save['"]\)/,
    'docxHandler.ts should route WebView-originated saves through the VS Code native save command'
);

assert.doesNotMatch(
    providerSource.match(/handleDocx\(document\.uri,\s*handler,\s*\{[\s\S]*?\}\);/)?.[0] ?? '',
    /onNativeSave/,
    'DocxEditorProvider should not bypass the CustomEditorProvider save lifecycle for WebView Save/Cmd+S'
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
