import assert from 'node:assert/strict';

export function runDocxFailureStateAssertions(context) {
    const {
        combinedWordSource,
        wordSource,
        docxSources,
    } = context;

    const superdocExceptionsSource = docxSources.get('superdocExceptions.ts') ?? '';
    const keyboardSaveSource = docxSources.get('useDocxKeyboardSave.ts') ?? '';
    const renderTimeoutSource = docxSources.get('useDocxRenderTimeout.ts') ?? '';
    const toolbarSource = docxSources.get('DocxModeToolbar.tsx') ?? '';
    const loadStateSource = docxSources.get('DocxLoadState.tsx') ?? '';

    assert.match(
        superdocExceptionsSource,
        /payload\.stage\s*===\s*['"]document-init['"][\s\S]*?payload\.code\s*===\s*['"]password-required['"]/,
        'DOCX should keep document-init and password-required SuperDoc exceptions fatal'
    );

    assert.match(
        superdocExceptionsSource,
        /Cannot read properties of undefined[\s\S]*?elements\|comments/,
        'DOCX should classify noisy SuperDoc elements/comments shape errors as ignorable'
    );

    assert.match(
        combinedWordSource,
        /onException=\{\(event\)\s*=>\s*\{[\s\S]*?if\s*\(isFatalSuperDocException\(event\)\)[\s\S]*?setError\(message\)[\s\S]*?else\s+if\s*\(!isIgnorableSuperDocException\(event\)\)[\s\S]*?setWarning\(message\)/,
        'DOCX SuperDoc exceptions should route fatal errors to error UI and actionable nonfatal errors to warnings'
    );

    assert.match(
        loadStateSource,
        /export\s+function\s+DocxErrorState[\s\S]*?Failed to load document[\s\S]*?<pre>\{error\}<\/pre>/,
        'DOCX fatal errors should render a visible error state with the underlying message'
    );

    assert.match(
        renderTimeoutSource,
        /DOCX_RENDER_TIMEOUT_MS[\s\S]*?setRendering\(false\)[\s\S]*?setWarning\(['"]DOCX render is taking longer than expected/,
        'DOCX render hangs should turn into a warning instead of an infinite loading state'
    );

    assert.match(
        keyboardSaveSource,
        /if\s*\(\s*mode\s*!==\s*['"]editor['"]\s*\)\s*return;[\s\S]*?if\s*\(\s*hostSaveInProgressRef\.current\s*\)\s*return;[\s\S]*?event\.preventDefault\(\)[\s\S]*?requestHostSave\(\)/,
        'DOCX keyboard save should only intercept Cmd/Ctrl+S in editor mode and avoid duplicate host saves'
    );

    assert.match(
        toolbarSource,
        /mode\s*===\s*['"]editor['"]\s*\?\s*\([\s\S]*?<Button[\s\S]*?onClick=\{onSave\}[\s\S]*?\)\s*:\s*null/,
        'DOCX toolbar Save button should exist only in edit mode'
    );

    assert.match(
        toolbarSource,
        /label:\s*['"]View['"],\s*value:\s*['"]viewer['"][\s\S]*?label:\s*['"]Edit['"],\s*value:\s*['"]editor['"]/,
        'DOCX toolbar should expose explicit View and Edit modes'
    );

    assert.match(
        wordSource,
        /const\s+switchToViewer\s*=\s*useCallback[\s\S]*?const\s+wasDirty\s*=\s*isDirtyRef\.current[\s\S]*?await\s+requestHostSaveAndWait\(\)[\s\S]*?setDirty\(false\)[\s\S]*?setMode\(['"]viewer['"]\)/,
        'DOCX dirty Edit to View should wait for host save completion before entering clean viewer mode'
    );

    assert.match(
        wordSource,
        /catch\s*\(e\)\s*\{[\s\S]*?setError\(`Failed to prepare viewer mode:/,
        'DOCX failed Edit to View preparation should stay recoverable through an explicit error message'
    );
}
