import assert from 'node:assert/strict';

export function runDocxSaveAssertions(context) {
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

    assert.match(
        combinedWordSource,
        /function\s+replaceParagraphText[\s\S]*?extractDocxText\(paragraphXml\)[\s\S]*?encodeXmlText\(toText\)/,
        'Word.tsx should patch DOCX paragraph text safely using XML encoding'
    );

    assert.match(
        combinedWordSource,
        /function\s+findBestSourceParagraph[\s\S]*?normalizedLine\.startsWith\(`\$\{normalizedParagraph\} `\)[\s\S]*?normalizedLine\.includes\(normalizedParagraph\)/,
        'Word.tsx should repair stale SuperDoc exports even when toolbar or accessibility text shifts visible line indexes'
    );

    assert.match(
        combinedWordSource,
        /function\s+hasStrongParagraphTokenOverlap[\s\S]*?overlap\s*>=\s*Math\.min\(2,\s*paragraphTokens\.length\)[\s\S]*?overlap\s*\/\s*paragraphTokens\.length\s*>=\s*0\.5/,
        'Word.tsx should still identify the source paragraph when a new edit splits the original visible paragraph text'
    );

    assert.doesNotMatch(
        combinedWordSource,
        /function\s+findInsertionPointForNewLine/,
        'Word.tsx should not infer insertion anchors for brand-new paragraphs while SuperDoc export is unreliable'
    );

    assert.doesNotMatch(
        docxSaveRepairSource.match(/export\s+async\s+function\s+patchDocxTextFromSnapshots[\s\S]*?zip\.file\('word\/document\.xml',\s*documentXml\)/)?.[0] ?? '',
        /insertions|bodyEndInsertions|insertParagraph/,
        'DOCX replacement repair should not insert new paragraphs when SuperDoc export is unreliable'
    );

    assert.match(
        combinedWordSource,
        /function\s+getComparableParagraphTokens[\s\S]*?!\/\^xmlpatch\\d\+_ok_\\d\+\/i\.test\(token\)/,
        'Word.tsx should ignore QA marker tokens while fuzzy-matching source paragraphs for XML repair'
    );

    assert.doesNotMatch(
        docxSaveRepairSource.match(/export\s+async\s+function\s+patchDocxTextFromSnapshots[\s\S]*?const\s+zip\s*=\s*await\s+JSZip\.loadAsync/)?.[0] ?? '',
        /if\s*\(\s*!\s*replacements\.length\s*\)\s*return\s+null/,
        'DOCX replacement repair should not return before paragraph matching when visible editor lines are shifted by SuperDoc UI text'
    );

    assert.match(
        combinedWordSource,
        /try\s*\{[\s\S]*?await\s+assertDocxContainsTextSnippets\(buffer,\s*snippets\)[\s\S]*?\}\s*catch\s*\(validationError\)\s*\{[\s\S]*?nextWarning\s*=/,
        'Word.tsx should validate exported DOCX XML and downgrade false-negative snippet mismatches to a warning'
    );

    assert.match(
        combinedWordSource,
        /const\s+DOCX_EXPORT_TIMEOUT_MS\s*=\s*10000/,
        'Word.tsx should cap native DOCX export time so Cmd+S cannot hang until the host bridge timeout'
    );

    assert.match(
        combinedWordSource,
        /telemetry=\{\{\s*enabled:\s*false\s*\}\}/,
        'Word.tsx should disable SuperDoc telemetry inside the VS Code WebView CSP sandbox'
    );

    assert.match(
        combinedWordSource,
        /fonts=\{\{[\s\S]*?resolveAssetUrl:\s*\(\{\s*file\s*\}\)\s*=>\s*SUPERDOC_FONT_ASSET_URLS\[file\]/,
        'Word.tsx should resolve SuperDoc bundled fonts through Vite/WebView-safe asset URLs'
    );

    assert.match(
        combinedWordSource,
        /Carlito-Regular\.woff2['"]:\s*CarlitoRegularUrl[\s\S]*?LiberationSerif-Regular\.woff2['"]:\s*LiberationSerifRegularUrl/,
        'Word.tsx should include metric-compatible SuperDoc bundled font assets used by DOCX layout'
    );

    assert.match(
        combinedWordSource,
        /function\s+extractDocxText[\s\S]*?<w:t\\b/,
        'Word.tsx should inspect word/document.xml text nodes for save verification'
    );

    assert.doesNotMatch(
        combinedWordSource,
        /key=\{`\$\{documentName\}-\$\{mode\}`\}/,
        'Word.tsx should not recreate the SuperDoc instance just because the user switches View/Edit mode'
    );

    assert.doesNotMatch(
        combinedWordSource,
        /hideToolbar=\{mode\s*===\s*['"]viewer['"]\}/,
        'Word.tsx should not change hideToolbar during View/Edit switches because the React wrapper rebuilds on that prop'
    );

    assert.doesNotMatch(
        combinedWordSource,
        /role=\{mode\s*===/,
        'Word.tsx should not change SuperDoc role during View/Edit switches because the React wrapper rebuilds on that prop'
    );

    assert.match(
        combinedWordSource,
        /const\s+handleEditorCreate\s*=\s*\(event:\s*SuperDocEditorCreateEvent\)\s*=>\s*\{[\s\S]*?bodyEditorRef\.current\s*=\s*event\.editor[\s\S]*?onEditorCreate=\{handleEditorCreate\}/,
        'DOCX SuperDoc surface should retain the real body editor from SuperDoc creation for save export'
    );

    assert.match(
        combinedWordSource,
        /handleTransaction[\s\S]*?bodyEditorRef\.current\s*=\s*event\.editor/,
        'Word.tsx should refresh the body editor from SuperDoc transactions for save export'
    );

    assert.match(
        combinedWordSource,
        /bytes:\s*Array\.from\(new\s+Uint8Array\(buffer\)\)/,
        'Word.tsx should send exported DOCX bytes back to the extension host'
    );

    assert.match(
        combinedWordSource,
        /function\s+isFatalSuperDocException\([\s\S]*?payload\.stage\s*===\s*['"]document-init['"][\s\S]*?payload\.code\s*===\s*['"]password-required['"]/,
        'Word.tsx should reserve fatal SuperDoc errors for document init/password failures'
    );

    assert.match(
        combinedWordSource,
        /function\s+isIgnorableSuperDocException[\s\S]*?Cannot read properties of undefined[\s\S]*?elements/,
        'Word.tsx should suppress the noisy nonfatal SuperDoc elements exception from the user-facing surface'
    );

    assert.match(
        combinedWordSource,
        /function\s+isIgnorableSuperDocException[\s\S]*?elements\|comments/,
        'Word.tsx should suppress SuperDoc comments-shape exceptions the same way it suppresses elements-shape exceptions'
    );

    assert.match(
        combinedWordSource,
        /onException=\{\(event\)\s*=>\s*\{[\s\S]*?if\s*\(isFatalSuperDocException\(event\)\)[\s\S]*?setError\(message\)[\s\S]*?else\s+if\s*\(!isIgnorableSuperDocException\(event\)\)[\s\S]*?setWarning\(message\)/,
        'Word.tsx should show only actionable nonfatal SuperDoc warnings, not repeated upstream elements noise'
    );

    assert.match(
        combinedWordSource,
        /DOCX_RENDER_TIMEOUT_MS\s*=\s*12000[\s\S]*?setWarning\(['"]DOCX render is taking longer than expected/,
        'Word.tsx should expose long SuperDoc render hangs instead of leaving users in an indefinite loading state'
    );

    assert.match(
        combinedWordSource,
        /useState<DocxMode>\(['"]viewer['"]\)/,
        'Word.tsx should default DOCX files to viewer mode'
    );

    assert.match(
        combinedWordSource,
        /if\s*\(\s*mode\s*!==\s*['"]editor['"]\s*\)\s*return;[\s\S]*?if\s*\(\s*hostSaveInProgressRef\.current\s*\)\s*return;[\s\S]*?requestHostSave\(\)/,
        'Word.tsx should ignore Cmd/Ctrl+S in viewer mode and avoid duplicate saves while a host save is already in flight'
    );

    assert.match(
        combinedWordSource,
        /const\s+requestHostSaveAndWait\s*=\s*useCallback[\s\S]*?DOCX_HOST_SAVE_TIMEOUT_MS[\s\S]*?handler\.emit\(DOCX_EVENTS\.hostSaveRequest\)/,
        'Word.tsx should expose a host-save waiter for Edit to View transitions'
    );

    assert.match(
        combinedWordSource,
        /handler\.on\(DOCX_EVENTS\.hostSaveCompleted[\s\S]*?resolveHostSaveWaiters\(result\)/,
        'Word.tsx should resolve host-save waiters only after the extension host reports save completion'
    );

    assert.match(
        combinedWordSource,
        /const\s+switchToViewer\s*=\s*useCallback[\s\S]*?if\s*\(wasDirty\)\s*\{[\s\S]*?await\s+requestHostSaveAndWait\(\)[\s\S]*?setDirty\(false\)[\s\S]*?setMode\(['"]viewer['"]\)/,
        'Word.tsx should auto-save dirty edits before switching to View and leave View mode clean'
    );

    assert.doesNotMatch(
        wordSource.match(/const\s+switchToViewer\s*=\s*useCallback[\s\S]*?\},\s*\[[^\]]*\]\);/)?.[0] ?? '',
        /if\s*\(\s*wasDirty\s*\)\s*setDirty\(true\)/,
        'Word.tsx should not re-mark the DOCX dirty after switching into View mode'
    );

    assert.match(
        combinedWordSource,
        /event\.transaction\.docChanged/,
        'Word.tsx should mark DOCX dirty for SuperDoc transactions that changed the document'
    );

    assert.match(
        combinedWordSource,
        /readEditorTextSnapshot\(editorSurfaceRef\.current\)[\s\S]*?nextSnapshot\s*===\s*editorTextSnapshotRef\.current[\s\S]*?setDirty\(true\)/,
        'Word.tsx should mark text edits dirty by comparing the SuperDoc editor text snapshot'
    );

    assert.match(
        combinedWordSource,
        /\.ProseMirror\[contenteditable=["']true["']\],\s*\[contenteditable=["']true["']\]/,
        'Word.tsx should read save-verification text from SuperDoc body contenteditable nodes before broad document roles'
    );

    assert.match(
        combinedWordSource,
        /\.superdoc-page/,
        'Word.tsx should read save-verification text from rendered SuperDoc pages when the editor exposes a broad document role'
    );

    assert.match(
        combinedWordSource,
        /fallbackSurface\.querySelectorAll\(['"][\s\S]*?\.superdoc-toolbar-container[\s\S]*?\[role=["']toolbar["'][\s\S]*?element\.remove\(\)/,
        'Word.tsx should remove SuperDoc toolbar/status surfaces before falling back to broad visible text'
    );

    assert.doesNotMatch(
        combinedWordSource,
        /\[role=["']document["']\],\s*\[aria-label=["']Main content area["']\]/,
        'Word.tsx should not prefer broad SuperDoc document containers because they include toolbar text'
    );

    assert.match(
        combinedWordSource,
        /'changes'[\s\S]*'items'[\s\S]*'selected'[\s\S]*'size'/,
        'Word.tsx should ignore SuperDoc toolbar/status tokens when checking save export snippets'
    );

    assert.match(
        combinedWordSource,
        /!\s*\/\^\\d\+\$\/\.test\(normalized\)/,
        'Word.tsx should ignore numeric toolbar/status tokens such as zoom percentages during save verification'
    );

    assert.doesNotMatch(
        combinedWordSource,
        /document\.addEventListener\(['"](beforeinput|input|cut|paste)['"]/,
        'Word.tsx should not use global DOM input listeners that mark cursor movement as dirty'
    );

    assert.doesNotMatch(
        combinedWordSource,
        /const\s+handleEditorUpdate\s*=\s*useCallback\(\(\)\s*=>\s*\{[\s\S]*?setDirty\(true\)/,
        'Word.tsx should not use broad SuperDoc editor-update events without checking editor text changes'
    );

    assert.match(
        combinedWordSource,
        /label:\s*['"]View['"],\s*value:\s*['"]viewer['"]/,
        'Word.tsx should expose an explicit View mode control'
    );

    assert.match(
        combinedWordSource,
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
}
