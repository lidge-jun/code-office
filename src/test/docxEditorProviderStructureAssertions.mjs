import assert from 'node:assert/strict';

export function runDocxStructureAssertions(context) {
    const {
    wordSource,
    docxSourceEntries,
    docxSources,
    docxSaveRepairSource,
    combinedWordSource,
    wordCssSource,
    handlerSource,
    providerSource,
    saveCustomDocumentSource,
    } = context;

    assert.ok(wordSource.trimEnd().split(/\r?\n/).length <= 350, 'Word.tsx should stay under the 03.1 coordinator limit');
    for (const [file, source] of docxSourceEntries) {
        assert.ok(source.trimEnd().split(/\r?\n/).length <= 500, `${file} should stay under the dev skill file limit`);
    }

    assert.equal(docxSources.has('index.ts'), false, 'DOCX word modules should avoid a barrel file that hides dependencies');

    assert.doesNotMatch(wordSource, /import\s+JSZip\s+from\s+['"]jszip['"]/, 'Word.tsx should not own DOCX ZIP mutation after modular split');

    assert.match(
        combinedWordSource,
        /hostSaveRequest:\s*'docxHostSaveRequest'/,
        'Word.tsx should define the explicit docxHostSaveRequest event'
    );

    assert.match(
        combinedWordSource,
        /hostSaveCompleted:\s*'docxHostSaveCompleted'/,
        'Word.tsx should define a host-save completion event so mode switches can wait for real VS Code saves'
    );

    assert.match(
        combinedWordSource,
        /handler\.emit\(DOCX_EVENTS\.hostSaveRequest\)/,
        'Word.tsx should ask the extension host to run the VS Code save lifecycle'
    );

    assert.match(
        combinedWordSource,
        /purpose\s*=\s*['"]save['"]/,
        'Word.tsx should default DOCX export requests to real save purpose'
    );

    assert.match(
        combinedWordSource,
        /if\s*\(\s*purpose\s*===\s*['"]save['"]\s*\)\s*\{[\s\S]*?setDirty\(false\)/,
        'Word.tsx should clear dirty only for real saves, not backup exports'
    );

    assert.match(
        combinedWordSource,
        /import\s+\{[\s\S]*?SuperDocEditor[\s\S]*?type\s+SuperDocRef[\s\S]*?\}\s+from\s+['"]@superdoc-dev\/react['"]/,
        'Word.tsx should use the SuperDoc React runtime for DOCX rendering and editing'
    );

    assert.match(
        combinedWordSource,
        /import\s+['"]@superdoc-dev\/react\/style\.css['"]/,
        'Word.tsx should import the SuperDoc stylesheet'
    );

    assert.match(
        combinedWordSource,
        /new\s+File\(\[documentBuffer\.slice\(0\)\],\s*normalizeDocumentName\(documentName\),\s*\{\s*type:\s*DOCX_MIME\s*\}\)/,
        'Word.tsx should pass DOCX bytes to SuperDoc as a File object'
    );

    assert.match(
        combinedWordSource,
        /const\s+\[documentVersion,\s*setDocumentVersion\]\s*=\s*useState\(0\)/,
        'Word.tsx should track a document byte-version separate from the filename'
    );

    assert.match(
        combinedWordSource,
        /setDocumentBuffer\(buffer\)[\s\S]*?latestSaveBufferRef\.current\s*=\s*buffer[\s\S]*?setDocumentVersion\(\(version\)\s*=>\s*version\s*\+\s*1\)/,
        'Word.tsx should bump the document version whenever fresh DOCX bytes are loaded'
    );

    assert.match(
        combinedWordSource,
        /key=\{`\$\{documentName\}:\$\{documentVersion\}`\}/,
        'Word.tsx should recreate the SuperDoc instance when fresh bytes arrive for the same filename'
    );

    assert.match(
        combinedWordSource,
        /documentMode=\{mode\s*===\s*['"]viewer['"]\s*\?\s*['"]viewing['"]\s*:\s*['"]editing['"]\}/,
        'Word.tsx should map code-office View/Edit mode to SuperDoc viewing/editing mode'
    );

    assert.match(
        combinedWordSource,
        /role=["']editor["']/,
        'Word.tsx should keep the SuperDoc role stable so View/Edit mode switches do not rebuild the editor'
    );

    assert.match(
        combinedWordSource,
        /hideToolbar=\{false\}/,
        'Word.tsx should keep the SuperDoc toolbar container stable and hide it with CSS in viewer mode'
    );

    assert.match(
        combinedWordSource,
        /const\s+DOCX_SUPERDOC_MODULES\s*=\s*\{[\s\S]*?trackChanges:\s*\{[\s\S]*?enabled:\s*false[\s\S]*?visible:\s*false[\s\S]*?mode:\s*['"]off['"]/,
        'Word.tsx should disable SuperDoc tracked-change UI through stable modules.trackChanges config'
    );

    assert.match(
        combinedWordSource,
        /modules=\{DOCX_SUPERDOC_MODULES\}/,
        'Word.tsx should pass stable SuperDoc modules config instead of deprecated top-level trackChanges props'
    );

    assert.doesNotMatch(
        combinedWordSource,
        /trackChanges=\{\{/,
        'Word.tsx should not use deprecated top-level SuperDoc trackChanges config'
    );

    assert.match(
        combinedWordSource,
        /layoutEngineOptions=\{\{[\s\S]*?flowMode:\s*['"]paginated['"][\s\S]*?virtualization:/,
        'Word.tsx should request SuperDoc paginated layout with bounded virtualization'
    );

    assert.match(
        combinedWordSource,
        /allowSelectionInViewMode=\{true\}/,
        'Word.tsx should allow text selection in read-only SuperDoc view mode'
    );

    assert.match(
        combinedWordSource,
        /const\s+instance\s*=\s*superdocRef\.current\?\.getInstance\(\)/,
        'Word.tsx should export through the live SuperDoc instance'
    );

    assert.match(
        combinedWordSource,
        /instance\.export\(\{[\s\S]*?exportType:\s*\[['"]docx['"]\][\s\S]*?triggerDownload:\s*false/,
        'Word.tsx should export DOCX bytes without triggering a browser download'
    );

    assert.match(
        combinedWordSource,
        /const\s+sourceBuffer\s*=\s*latestSaveBufferRef\.current\s*\?\?\s*documentBuffer/,
        'Word.tsx should use the latest source DOCX buffer when patching edited XML parts'
    );

    assert.match(
        combinedWordSource,
        /const\s+bodyEditorBlob\s*=\s*await\s+exportEditorDocx\(bodyEditorRef\.current,\s*sourceBuffer\)/,
        'Word.tsx should prefer exporting the body editor that produced edit transactions'
    );

    assert.match(
        combinedWordSource,
        /activeEditor\s*&&\s*activeEditor\s*!==\s*bodyEditorRef\.current[\s\S]*?await\s+exportEditorDocx\(activeEditor,\s*sourceBuffer\)/,
        'Word.tsx should avoid calling the same SuperDoc editor export path twice for one save'
    );

    assert.doesNotMatch(
        combinedWordSource,
        /nativeExportBrokenRef|SuperDoc native DOCX export is disabled after a prior elements exception/,
        'Word.tsx should not permanently disable native SuperDoc export after one transient elements exception'
    );

    assert.match(
        combinedWordSource,
        /exportCurrentDocumentRef\.current\s*=\s*exportCurrentDocument/,
        'Word.tsx should keep the latest exporter in a ref so message handlers do not need to re-register on every document buffer change'
    );

    assert.match(
        combinedWordSource,
        /buffer\s*=\s*await\s+withTimeout\([\s\S]*?exportCurrentDocumentRef\.current\(\)[\s\S]*?DOCX_EXPORT_TIMEOUT_MS/,
        'Word.tsx save requests should call the latest exporter ref with an inner timeout from the single registered webview message handler'
    );

    assert.match(
        combinedWordSource,
        /let\s+buffer:\s*ArrayBuffer\s*\|\s*null\s*=\s*null[\s\S]*?try\s*\{[\s\S]*?buffer\s*=\s*await\s+withTimeout\([\s\S]*?exportCurrentDocumentRef\.current\(\)[\s\S]*?catch\s*\(e\)\s*\{[\s\S]*?repairDocxTextFromSnapshots/,
        'Word.tsx should use the visible-text XML fallback even when the native SuperDoc export throws before producing bytes'
    );

    assert.doesNotMatch(
        combinedWordSource,
        /handler\.emit\(DOCX_EVENTS\.init\);\s*\},\s*\[[^\]]*exportCurrentDocument/,
        'Word.tsx should not re-emit init when exportCurrentDocument changes after openBuffer updates documentBuffer'
    );

    assert.match(
        combinedWordSource,
        /async\s+function\s+exportEditorDocx[\s\S]*?exportDocx\.call\(editor/,
        'Word.tsx should export current DOCX edits through the concrete SuperDoc editor when available'
    );

    assert.match(
        combinedWordSource,
        /getUpdatedDocs:\s*true/,
        'Word.tsx should request live updated DOCX XML parts from the SuperDoc editor before falling back to full export'
    );

    assert.match(
        combinedWordSource,
        /getUpdatedDocs:\s*true[\s\S]*?catch\s*\(e\)\s*\{[\s\S]*?if\s*\(\s*isSuperDocElementsError\(e\)\s*\)\s*throw\s+e[\s\S]*?try the next SuperDoc export strategy/,
        'Word.tsx should stop native export retries on SuperDoc elements errors but continue for other export shapes'
    );

    assert.match(
        combinedWordSource,
        /exportXmlOnly:\s*true/,
        'Word.tsx should first request raw live document XML from SuperDoc before accepting package-level export fallbacks'
    );

    assert.match(
        combinedWordSource,
        /const\s+exportOptions\s*=\s*\{[\s\S]*?commentsType:\s*['"]external['"],[\s\S]*?comments:\s*\[\]/,
        'Word.tsx should pass an explicit empty comments array to SuperDoc exportDocx to avoid comments-shape runtime errors'
    );

    assert.match(
        combinedWordSource,
        /exportXmlOnly:\s*true[\s\S]*?catch\s*\(e\)\s*\{[\s\S]*?if\s*\(\s*isSuperDocElementsError\(e\)\s*\)\s*throw\s+e[\s\S]*?try the package-level SuperDoc export fallback/,
        'Word.tsx should stop native export retries on SuperDoc elements errors during exportXmlOnly'
    );

    assert.match(
        combinedWordSource,
        /exportDocx\.call\(editor,\s*exportOptions\)[\s\S]*?catch\s*\(e\)\s*\{[\s\S]*?if\s*\(\s*isSuperDocElementsError\(e\)\s*\)\s*throw\s+e[\s\S]*?allow the caller to try another editor or instance\.export/,
        'Word.tsx should return null instead of throwing when editor-level full export fails'
    );

    assert.match(
        combinedWordSource,
        /async\s+function\s+patchDocxParts[\s\S]*?JSZip\.loadAsync[\s\S]*?zip\.file\(path,\s*content\)[\s\S]*?generateAsync/,
        'Word.tsx should patch updated DOCX XML parts into the source ZIP instead of accepting stale original bytes'
    );

    assert.match(
        combinedWordSource,
        /const\s+sourceBuffer\s*=\s*latestSaveBufferRef\.current\s*\?\?\s*documentBuffer[\s\S]*?if\s*\(\s*sourceBuffer\s*&&\s*!\s*snippets\.length\s*\)[\s\S]*?buffer\s*=\s*sourceBuffer\.slice\(0\)/,
        'Word.tsx should reuse the source DOCX bytes only for clean saves with no visible edit snippets'
    );

    assert.doesNotMatch(
        wordSource.match(/handler\.on\(DOCX_EVENTS\.saveRequest[\s\S]*?handler\.emit\(DOCX_EVENTS\.saveResponse/)?.[0] ?? '',
        /else\s+if\s*\(\s*sourceBuffer\s*&&\s*snippets\.length\s*\)[\s\S]*?repairDocxTextFromSnapshots/,
        'Word.tsx should not run XML repair before trying the real SuperDoc export for dirty saves'
    );

    assert.match(
        combinedWordSource,
        /const\s+sourceBuffer\s*=\s*latestSaveBufferRef\.current\s*\?\?\s*documentBuffer[\s\S]*?getMissingVisibleTextSnippetsFromSource\(sourceBuffer,\s*currentSnapshot\)/,
        'Word.tsx should compare the visible editor text against the actual source DOCX XML so stale persisted snapshots cannot hide edits'
    );

    assert.match(
        combinedWordSource,
        /async\s+function\s+getMissingVisibleTextSnippetsFromSource[\s\S]*?JSZip\.loadAsync\(sourceBuffer\.slice\(0\)\)[\s\S]*?word\/document\.xml[\s\S]*?!sourceText\.includes\(token\)/,
        'Word.tsx should derive missing visible edit snippets from word/document.xml before accepting a SuperDoc export'
    );

    assert.match(
        combinedWordSource,
        /buffer\s*=\s*await\s+withTimeout\([\s\S]*?exportCurrentDocumentRef\.current\(\)[\s\S]*?getMissingVisibleTextSnippetsFromSource\(buffer,\s*currentSnapshot\)[\s\S]*?try\s*\{[\s\S]*?assertDocxContainsTextSnippets\(buffer,\s*snippets\)[\s\S]*?catch\s*\(validationError\)[\s\S]*?DOCX export warning/,
        'Word.tsx should warn on stale-looking successful SuperDoc exports without forcing the slow XML repair path'
    );

    assert.match(
        combinedWordSource,
        /splitEditorTextLines\(currentText\)\.filter\(\(line\)\s*=>\s*isRelevantVisibleLine\(line\)\s*&&\s*!sourceText\.includes\(normalizeEditorText\(line\)\)\)/,
        'Word.tsx should include missing visible lines, not only individual tokens, when validating and patching DOCX saves'
    );

    assert.match(
        combinedWordSource,
        /function\s+sanitizeEditorSnapshotText[\s\S]*?splitEditorTextLines\(value\)[\s\S]*?filter\(isRelevantVisibleLine\)[\s\S]*?join\('\\n'\)/,
        'Word.tsx should sanitize editor snapshots before DOCX save validation so toolbar text cannot be patched into document XML'
    );

    assert.match(
        combinedWordSource,
        /function\s+isRelevantVisibleLine[\s\S]*?unset\|selected\|tracked changes\|overflow items\|cursor moved/,
        'Word.tsx should reject SuperDoc toolbar and status lines from visible-text DOCX fallback snippets'
    );

    assert.match(
        combinedWordSource,
        /function\s+mergeTextSnippets[\s\S]*?new\s+Set\(groups\.flat\(\)\)[\s\S]*?slice\(0,\s*5\)/,
        'Word.tsx should merge persisted-snapshot and source-XML save verification snippets with a bounded set'
    );

    assert.match(
        combinedWordSource,
        /function\s+getRelevantTextTokens[\s\S]*?'changes'[\s\S]*?'items'[\s\S]*?'selected'[\s\S]*?'size'[\s\S]*?!\/\^\\d\+\$\/\.test\(normalized\)/,
        'Word.tsx should share toolbar/status-token filtering across persisted-snapshot and source-XML comparisons'
    );

    assert.match(
        combinedWordSource,
        /const\s+attempts:\s*Array<\(\)\s*=>\s*Promise<ArrayBuffer\s*\|\s*null>>\s*=\s*\[[\s\S]*?patchDocxTextFromSnapshots\(sourceBuffer[\s\S]*?patchDocxTextFromSnapshots\(documentBuffer/,
        'Word.tsx should retry visible-text XML repair against the original document buffer if the stale SuperDoc export buffer is not patchable'
    );

    assert.match(
        combinedWordSource,
        /repairDocxTextFromSnapshots\(\s*documentBuffer,\s*sourceBuffer,\s*currentSnapshot,\s*lastPersistedTextSnapshotRef\.current,\s*snippets,\s*\)/,
        'Word.tsx should route failed SuperDoc saves through the deterministic DOCX XML repair helper'
    );

    assert.match(
        combinedWordSource,
        /const\s+\[zoomScale,\s*setZoomScale\]\s*=\s*useState\(1\)/,
        'Word.tsx should track DOCX viewer zoom locally for VS Code WebView pinch gestures'
    );

    assert.match(
        combinedWordSource,
        /const\s+handleViewerWheel\s*=\s*useCallback\([\s\S]*?event\.ctrlKey[\s\S]*?event\.metaKey[\s\S]*?event\.preventDefault\(\)[\s\S]*?Math\.min\(2\.5,\s*Math\.max\(0\.5/,
        'Word.tsx should handle trackpad pinch-style ctrl/meta wheel zoom with bounded scale'
    );

    assert.match(
        combinedWordSource,
        /applySuperDocZoom\(superdocRef\.current\?\.getInstance\(\),\s*bodyEditorRef\.current,\s*roundedZoom\)/,
        'Word.tsx should route DOCX pinch zoom through SuperDoc setZoom instead of CSS zoom'
    );

    assert.match(
        combinedWordSource,
        /function\s+applySuperDocZoom[\s\S]*?editorCandidates\s*=\s*\[bodyEditor,\s*activeEditor\][\s\S]*?maybeEditorZoomable\.setZoom\(zoom\)[\s\S]*?maybeSuperDocZoomable\.setZoom\(Math\.round\(zoom\s*\*\s*100\)\)/,
        'Word.tsx should send multiplier zoom to SuperDoc editors and percent zoom to the SuperDoc shell instance'
    );

    assert.doesNotMatch(
        combinedWordSource,
        /appendDocxTextSnippets|insertParagraphBeforeSectionOrBodyEnd|insertParagraphBeforeBodyEnd/,
        'Word.tsx save repair must not append arbitrary visible text into word/document.xml'
    );

    assert.match(
        combinedWordSource,
        /async\s+function\s+repairDocxTextFromSnapshots[\s\S]*?patchDocxTextFromSnapshots\(sourceBuffer[\s\S]*?patchDocxTextFromSnapshots\(documentBuffer[\s\S]*?catch\s*\{[\s\S]*?Continue to the next deterministic XML repair strategy/,
        'Word.tsx should isolate each replacement-only XML repair failure so one bad strategy cannot block later fallbacks'
    );

    assert.doesNotMatch(
        wordSource.match(/const\s+exportCurrentDocument\s*=\s*useCallback[\s\S]*?\},\s*\[documentBuffer,\s*documentName\]\);/)?.[0] ?? '',
        /latestSaveBufferRef\.current\s*=\s*buffer/,
        'Word.tsx should not overwrite the last persisted DOCX buffer with an unverified SuperDoc export'
    );
}
