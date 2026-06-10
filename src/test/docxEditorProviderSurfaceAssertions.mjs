import assert from 'node:assert/strict';

export function runDocxSurfaceAssertions(context) {
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
        combinedWordSource + wordCssSource,
        /@eigenpal\/docx-editor-react|docx-editor--word-parity|DOCX_EDITOR_FONT_FAMILIES/,
        'DOCX product source should not import or tune the removed eigenpal runtime'
    );

    assert.doesNotMatch(
        combinedWordSource + wordCssSource,
        /docx-preview|renderAsync|docx-wrapper|section\.docx|annotateDocxPreviewPages|fitDocxPreviewToViewport/,
        'DOCX product source should not keep the removed docx-preview runtime path'
    );

    assert.doesNotMatch(
        combinedWordSource + handlerSource,
        /LibreOffice|soffice|docxOpenPdfPreview|pdf-frame/,
        'DOCX product source should not depend on LibreOffice/PDF iframe fallback'
    );

    assert.doesNotMatch(
        combinedWordSource,
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
}
