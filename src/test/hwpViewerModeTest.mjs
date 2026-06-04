import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function firstExistingPath(relativePaths) {
    for (const relativePath of relativePaths) {
        const absolutePath = path.join(root, relativePath);
        if (fs.existsSync(absolutePath)) {
            return absolutePath;
        }
    }
    assert.fail(`missing expected fixture: ${relativePaths.join(' or ')}`);
}

const packageJson = JSON.parse(read('package.json'));
const commands = new Set(packageJson.contributes.commands.map((command) => command.command));
const customEditors = packageJson.contributes.customEditors;
const hwpEditor = customEditors.find((editor) => editor.viewType === 'cweijan.hwpEditor');

assert.equal(hwpEditor?.priority, 'default', 'HWP/HWPX should still open through the existing custom editor entry');
assert.equal(customEditors.some((editor) => editor.viewType === 'rhwp.hwpViewer'), false, 'should not add a second rhwp.hwpViewer entry');
for (const command of [
    'code-office.hwp.switchToViewer',
    'code-office.hwp.switchToEditor',
    'code-office.hwp.exportSvg',
    'code-office.hwp.exportPdf',
    'code-office.hwp.debugOverlay',
    'code-office.hwp.dumpParagraph',
]) {
    assert.ok(commands.has(command), `${command} should be contributed`);
}

const schemaSource = read('src/common/hwpMessageSchema.ts');
for (const event of [
    'modeChangeRequest',
    'modeChanged',
    'viewerCommandRequest',
    'viewerCommand',
    'viewerCommandResult',
]) {
    assert.ok(schemaSource.includes(event), `schema should include ${event}`);
}

const handlerSource = read('src/common/handler.ts');
assert.ok(handlerSource.includes('HWP_EVENTS.modeChanged'), 'webview should be allowed to report committed mode changes');
assert.ok(handlerSource.includes('HWP_EVENTS.viewerCommandRequest'), 'viewer toolbar should request host commands');
assert.ok(handlerSource.includes('HWP_EVENTS.viewerCommandResult'), 'webview should return viewer command results');

const providerSource = read('src/provider/hwp/HwpEditorProvider.ts');
assert.ok(providerSource.includes('HWP_LAST_MODE_STORAGE_KEY'), 'provider should persist last HWP mode');
assert.ok(providerSource.includes("return mode === 'editor' || mode === 'viewer' ? mode : 'viewer'"), 'first open should default to viewer');
assert.ok(providerSource.includes("document.mode === 'viewer' && !document.isDirty"), 'clean viewer save should be a no-op');
assert.ok(providerSource.includes('switchActiveHwpMode'), 'provider should expose mode switching');
assert.ok(providerSource.includes('requestViewerCommand'), 'provider should use webview SVG/debug command RPC');
assert.ok(providerSource.includes('exportActiveHwpPdf'), 'provider should expose PDF export');
assert.ok(providerSource.includes('exportHwpPdf'), 'provider should write PDF exports');
assert.ok(providerSource.includes('dumpHwpParagraph'), 'provider should expose paragraph dump');
assert.ok(providerSource.includes('Save the HWP/HWPX document before dumping paragraph metadata'), 'dirty paragraph dump should be blocked');
assert.ok(providerSource.includes('rejectPendingForDocument'), 'provider should reject pending RPC when a webview closes');

const hwpSource = read('src/react/view/hwp/Hwp.tsx');
assert.ok(hwpSource.includes("const initialMode = configs?.hwpInitialMode === 'editor' ? 'editor' : 'viewer'"), 'webview should honor initial mode with viewer default');
assert.ok(hwpSource.includes('pendingViewerSwitchRef'), 'dirty editor to viewer should wait for save success');
assert.ok(hwpSource.includes("modeRef.current === 'viewer' && !dirtyRef.current"), 'clean viewer Cmd+S should not emit native save');
assert.ok(hwpSource.includes('savingRef.current'), 'saving UI state should not recreate the rhwp init effect');
assert.ok(hwpSource.includes('pagesRef'), 'viewer commands should reuse rendered pages when possible');
assert.ok(hwpSource.includes("payload.command === 'exportSvg' || payload.command === 'exportPdf'"), 'SVG/PDF export should not force a second rhwp render when viewer pages are already available');
assert.ok(hwpSource.includes('renderPdfPages'), 'viewer should rasterize SVG pages before PDF export');
assert.ok(hwpSource.includes('setSaveMsg(null);'), 'failed save-then-view should clear stale save status');
assert.ok(hwpSource.includes('exportSvgPages'), 'viewer should render pages through SVG export helper');
assert.ok(hwpSource.includes('HWP_EVENTS.viewerCommandRequest'), 'viewer toolbar should request host command handling');
assert.ok(hwpSource.includes("{ command: 'dumpParagraph' }"), 'viewer developer menu should request paragraph dump');
assert.ok(hwpSource.includes("{ command: 'exportPdf' }"), 'viewer toolbar should request PDF export');
assert.ok(hwpSource.includes('isFindShortcut'), 'HWP webview should intercept Cmd/Ctrl+F');
assert.ok(hwpSource.includes('stopShortcutPropagation(event)'), 'HWP find should prevent VS Code default find from taking over');
assert.ok(hwpSource.includes('openRhwpEditorFind(containerRef.current)'), 'Editor Cmd/Ctrl+F should open rhwp internal find');
assert.ok(hwpSource.includes('setViewerSearchOpen(true)'), 'Viewer Cmd/Ctrl+F should open the HWP viewer search UI');
assert.ok(hwpSource.includes('useHwpViewerSearch(pages, viewerSearchQuery)'), 'Viewer find should use the rhwp-aware search hook');
assert.ok(hwpSource.includes('handleRhwpEditorFindEnter(containerRef.current, event)'), 'Editor find Enter should stay inside the rhwp find dialog');

const hwpViewerSource = read('src/react/view/hwp/HwpViewer.tsx');
assert.ok(hwpViewerSource.includes('onExportPdf'), 'viewer props should expose PDF export');
assert.ok(hwpViewerSource.includes('Save PDF'), 'viewer toolbar should include PDF save');
assert.ok(hwpViewerSource.includes('onDumpParagraph'), 'viewer props should expose paragraph dump');
assert.ok(hwpViewerSource.includes('Dump Paragraph'), 'viewer developer menu should include paragraph dump');
assert.ok(hwpViewerSource.includes('Find in HWP viewer'), 'viewer toolbar should include a find input');
assert.ok(hwpViewerSource.includes('scrollIntoView'), 'viewer search should navigate to matched pages');
assert.ok(hwpViewerSource.includes('decorateSvgSearchHits'), 'viewer search should decorate rendered SVG matches');
assert.ok(hwpViewerSource.includes('data-hwp-search-active'), 'viewer search should scroll the active SVG match into view');

const hwpFindSource = read('src/react/view/hwp/hwpFind.ts');
assert.ok(hwpFindSource.includes('findViewerTextMatches'), 'viewer find should scan rendered SVG text');
assert.ok(hwpFindSource.includes('DOMParser'), 'viewer find should parse SVG instead of string-searching tags');
assert.ok(hwpFindSource.includes('decorateSvgSearchHits'), 'viewer find should support rendered SVG match highlighting');
assert.ok(hwpFindSource.includes('data-hwp-search-hit'), 'viewer find should mark SVG search hit elements');
assert.ok(hwpFindSource.includes('data-hwp-search-active'), 'viewer find should mark the active SVG search hit');
assert.ok(hwpFindSource.includes('countOccurrences'), 'viewer find should count multiple matches inside rendered text elements');
assert.ok(hwpFindSource.includes('findRhwpTextMatches'), 'viewer find should keep rhwp document text search fallback');
assert.ok(hwpFindSource.includes('searchAllText'), 'viewer find should call the rhwp text search bridge');
assert.ok(hwpFindSource.includes('openRhwpEditorFind'), 'editor find helper should target rhwp controls');
assert.ok(hwpFindSource.includes('stopImmediatePropagation'), 'find shortcut should stop same-target VS Code/browser handlers');
assert.ok(hwpFindSource.includes('[data-cmd="edit:find"]'), 'editor find helper should target the rhwp command element directly');
assert.ok(hwpFindSource.includes("new MouseEvent('mousedown'"), 'editor find helper should dispatch rhwp mousedown commands');
assert.ok(hwpFindSource.includes('handleRhwpEditorFindEnter'), 'editor find helper should capture Enter while rhwp find is open');
assert.ok(hwpFindSource.includes('previousButton') && hwpFindSource.includes('nextButton'), 'editor find Enter should route to previous/next find buttons');
assert.equal(hwpFindSource.includes('document.activeElement'), false, 'editor find Enter must not trust activeElement after rhwp moves focus to the document surface');

const rhwpStudioRoot = fs.existsSync(path.join(root, 'resource/rhwp-studio/index.html'))
    ? 'resource/rhwp-studio'
    : 'vendor/rhwp-studio-dist';
const rhwpIndexSource = read(`${rhwpStudioRoot}/index.html`);
const rhwpAssetMatch = rhwpIndexSource.match(/src="(?:\.\/|\/)?assets\/([^"]+\.js)"/);
assert.ok(rhwpAssetMatch, 'bundled rhwp studio should reference a main JS asset');
const rhwpStudioAssetSource = read(`${rhwpStudioRoot}/assets/${rhwpAssetMatch[1]}`);
assert.ok(rhwpStudioAssetSource.includes('keyCaptureHandler'), 'vendored rhwp find dialog should install a document-level key capture handler');
assert.ok(rhwpStudioAssetSource.includes('addEventListener(`keydown`,this.keyCaptureHandler,!0)'), 'vendored rhwp find dialog should capture keydown before the editor surface handles Enter');
assert.ok(rhwpStudioAssetSource.includes('this.isFindEnter'), 'vendored rhwp find dialog should route plain Enter/Shift+Enter inside find');

const hwpViewerSearchHookSource = read('src/react/view/hwp/useHwpViewerSearch.ts');
assert.ok(hwpViewerSearchHookSource.includes('svgMatches.length > 0'), 'viewer search hook should prefer SVG matches when they can be highlighted');
assert.ok(hwpViewerSearchHookSource.includes('findRhwpTextMatches'), 'viewer search hook should keep rhwp text search fallback');
assert.ok(hwpViewerSearchHookSource.includes('findViewerTextMatches'), 'viewer search hook should keep SVG text fallback');

const hwpPdfPagesSource = read('src/react/view/hwp/hwpPdfPages.ts');
assert.ok(hwpPdfPagesSource.includes('canvas.toDataURL'), 'PDF export should rasterize SVG pages in the webview');
assert.ok(hwpPdfPagesSource.includes('MAX_CANVAS_SIDE'), 'PDF export should cap canvas size');

const hwpPdfExportSource = read('src/provider/hwp/hwpPdfExport.ts');
assert.ok(hwpPdfExportSource.includes('PDFDocument.create'), 'provider should assemble PDF with pdf-lib');
assert.ok(hwpPdfExportSource.includes('showSaveDialog'), 'PDF export should use an explicit save dialog');
assert.ok(hwpPdfExportSource.includes('embedPng'), 'PDF export should embed rendered PNG pages');

const bridgeSource = read('src/react/view/hwp/rhwpBridge/createSecureRhwpEditor.ts');
for (const method of ['pageCount', 'getPageSvg', 'setDebugOverlay']) {
    assert.ok(bridgeSource.includes(method), `secure bridge should expose ${method}`);
}
const buildSource = read('build.ts');
assert.ok(buildSource.includes('setDebugOverlay:async'), 'build should inject direct debug overlay bridge');
assert.ok(buildSource.includes('typeof X.set_debug_overlay'), 'debug overlay bridge should tolerate rhwp builds without set_debug_overlay');
assert.ok(buildSource.includes('case`getPageSvg`'), 'build should patch postMessage SVG bridge');
assert.ok(buildSource.includes('case`searchAllText`'), 'build should patch postMessage text search bridge');
assert.ok(buildSource.includes('searchAllText:async'), 'build should inject direct text search bridge');
assert.ok(buildSource.includes('case`setDebugOverlay`'), 'build should patch postMessage debug bridge');

const exportSvgPagesSource = read('src/react/view/hwp/rhwpBridge/exportSvgPages.ts');
assert.ok(exportSvgPagesSource.includes('debugOverlayEnabled'), 'debug SVG export should track whether the overlay was actually enabled');
assert.ok(exportSvgPagesSource.includes('.catch(() => false)'), 'debug SVG export should fall back when the renderer has no debug overlay API');

const sanitizerOut = path.join(root, '.tmp', 'hwpSvgSanitizer.mjs');
fs.mkdirSync(path.dirname(sanitizerOut), { recursive: true });
await esbuild.build({
    entryPoints: [path.join(root, 'src/common/hwpSvgSanitizer.ts')],
    outfile: sanitizerOut,
    bundle: true,
    platform: 'node',
    format: 'esm',
});
const { sanitizeHwpSvg } = await import(pathToFileURL(sanitizerOut));
const sanitized = sanitizeHwpSvg('<svg onload="alert(1)"><script>alert(1)</script><foreignObject>x</foreignObject><a href="javascript:alert(1)">x</a><text>ok</text></svg>');
assert.equal(sanitized.includes('<script'), false, 'SVG sanitizer should remove script tags');
assert.equal(sanitized.includes('foreignObject'), false, 'SVG sanitizer should remove foreignObject');
assert.equal(sanitized.includes('onload'), false, 'SVG sanitizer should remove event handler attributes');
assert.equal(sanitized.includes('javascript:'), false, 'SVG sanitizer should remove javascript URLs');
assert.ok(sanitized.includes('<text>ok</text>'), 'SVG sanitizer should preserve normal SVG text');

const rhwpMedia = path.join(root, 'resource/rhwp-vscode');
assert.ok(fs.existsSync(path.join(rhwpMedia, 'rhwp.js')), 'vendored rhwp-vscode glue should exist');
assert.ok(fs.existsSync(path.join(rhwpMedia, 'rhwp_bg.wasm')), 'vendored rhwp-vscode WASM should exist');
const rhwp = require(path.join(rhwpMedia, 'rhwp.js'));
rhwp.initSync({ module: fs.readFileSync(path.join(rhwpMedia, 'rhwp_bg.wasm')) });
const hwpFixturePath = firstExistingPath([
    'resource/rhwp-studio/samples/biz_plan.hwp',
    'vendor/rhwp-studio-dist/samples/biz_plan.hwp',
]);
const documentBytes = fs.readFileSync(hwpFixturePath);
const document = new rhwp.HwpDocument(new Uint8Array(documentBytes));
try {
    assert.ok(document.getSectionCount() > 0, 'paragraph dump fixture should expose sections');
    assert.ok(document.getParagraphCount(0) > 0, 'paragraph dump fixture should expose paragraphs');
    assert.ok(document.getParaPropertiesAt(0, 0).includes('alignment'), 'paragraph dump should return paragraph properties JSON');
    assert.ok(document.getLineInfo(0, 0, 0).includes('lineIndex'), 'paragraph dump should return line info JSON');
} finally {
    document.free?.();
}

console.log('hwp viewer mode checks passed');
