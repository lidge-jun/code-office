/**
 * PPTX Phase 4+ Test — verify pptxHandler build and PPTX bundle integrity.
 *
 * After rolling PPTX back to view-only, this test verifies:
 * 1. pptxHandler.ts builds successfully via esbuild (no compile errors)
 * 2. Webview bundle includes the PPTX viewer chunk
 * 3. visual thumbnail / resizable pane / speaker notes support is present
 * 4. edit/save/dirty/pptx-svg surfaces are not present
 */

import { strict as assert } from 'assert';
import * as esbuild from 'esbuild';
import { mkdtemp, readFile, rm, readdir, stat } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const tempDir = await mkdtemp(path.join(tmpdir(), 'code-office-pptx-phase4-'));
try {
    // Test 1: pptxHandler.ts builds without errors via esbuild
    const handlerOut = path.join(tempDir, 'pptxHandler.bundle.js');
    const result = await esbuild.build({
        entryPoints: [path.join(repoRoot, 'src/provider/handlers/pptxHandler.ts')],
        outfile: handlerOut,
        platform: 'node',
        bundle: true,
        format: 'esm',
        logLevel: 'silent',
        external: ['vscode'],
        alias: { '@': path.join(repoRoot, 'src') },
        write: true,
    });
    assert.equal(result.errors.length, 0, 'pptxHandler should build with zero errors');
    console.log('  ✓ pptxHandler.ts builds successfully');

    // Test 2: PptxEditorProvider builds without errors
    const providerOut = path.join(tempDir, 'PptxEditorProvider.bundle.js');
    const providerResult = await esbuild.build({
        entryPoints: [path.join(repoRoot, 'src/provider/pptx/PptxEditorProvider.ts')],
        outfile: providerOut,
        platform: 'node',
        bundle: true,
        format: 'esm',
        logLevel: 'silent',
        external: ['vscode'],
        alias: { '@': path.join(repoRoot, 'src') },
        write: true,
    });
    assert.equal(providerResult.errors.length, 0, 'PptxEditorProvider should build with zero errors');
    console.log('  ✓ PptxEditorProvider.ts builds successfully');

    // Test 3: PPTX metadata helper builds without errors
    const metadataOut = path.join(tempDir, 'pptxMetadata.bundle.js');
    const metadataResult = await esbuild.build({
        entryPoints: [path.join(repoRoot, 'src/react/view/pptx/pptxMetadata.ts')],
        outfile: metadataOut,
        platform: 'browser',
        bundle: true,
        format: 'esm',
        logLevel: 'silent',
        write: true,
    });
    assert.equal(metadataResult.errors.length, 0, 'pptxMetadata should build with zero errors');
    console.log('  ✓ pptxMetadata.ts builds successfully');

    // Test 4: SlideThumbnail builds without errors
    const thumbnailOut = path.join(tempDir, 'SlideThumbnail.bundle.js');
    const thumbnailResult = await esbuild.build({
        entryPoints: [path.join(repoRoot, 'src/react/view/pptx/SlideThumbnail.tsx')],
        outfile: thumbnailOut,
        platform: 'browser',
        bundle: true,
        format: 'esm',
        logLevel: 'silent',
        write: true,
    });
    assert.equal(thumbnailResult.errors.length, 0, 'SlideThumbnail should build with zero errors');
    console.log('  ✓ SlideThumbnail.tsx builds successfully');

    const presenterOut = path.join(tempDir, 'PptxPresenterChrome.bundle.js');
    const presenterResult = await esbuild.build({
        entryPoints: [path.join(repoRoot, 'src/react/view/pptx/PptxPresenterChrome.tsx')],
        outfile: presenterOut,
        platform: 'browser',
        bundle: true,
        format: 'esm',
        logLevel: 'silent',
        write: true,
    });
    assert.equal(presenterResult.errors.length, 0, 'PptxPresenterChrome should build with zero errors');
    console.log('  ✓ PptxPresenterChrome.tsx builds successfully');

    const statusBarOut = path.join(tempDir, 'PptxStatusBar.bundle.js');
    const statusBarResult = await esbuild.build({
        entryPoints: [path.join(repoRoot, 'src/react/view/pptx/PptxStatusBar.tsx')],
        outfile: statusBarOut,
        platform: 'browser',
        bundle: true,
        format: 'esm',
        logLevel: 'silent',
        write: true,
    });
    assert.equal(statusBarResult.errors.length, 0, 'PptxStatusBar should build with zero errors');
    console.log('  ✓ PptxStatusBar.tsx builds successfully');

    // Test 5: source assertions for view-only PPTX lifecycle
    const pptxSource = await readFile(path.join(repoRoot, 'src/react/view/pptx/Pptx.tsx'), 'utf8');
    const thumbnailSource = await readFile(path.join(repoRoot, 'src/react/view/pptx/SlideThumbnail.tsx'), 'utf8');
    const presenterSource = await readFile(path.join(repoRoot, 'src/react/view/pptx/PptxPresenterChrome.tsx'), 'utf8');
    const statusBarSource = await readFile(path.join(repoRoot, 'src/react/view/pptx/PptxStatusBar.tsx'), 'utf8');
    const handlerSource = await readFile(path.join(repoRoot, 'src/provider/handlers/pptxHandler.ts'), 'utf8');
    const metadataSource = await readFile(path.join(repoRoot, 'src/react/view/pptx/pptxMetadata.ts'), 'utf8');

    assert.match(
        pptxSource,
        /PptxViewer\.open\(/,
        'Pptx.tsx should render through pptx-renderer'
    );
    assert.match(
        pptxSource,
        /setZoom\(/,
        'Pptx.tsx should keep view zoom controls'
    );
    assert.match(
        statusBarSource,
        /pptx-viewer__statusbar/,
        'Pptx.tsx should render a PowerPoint-like bottom status/action bar'
    );
    assert.match(
        pptxSource,
        /Slide \$\{currentSlide \+ 1\} of \$\{slideCount\} slides/,
        'Pptx.tsx should expose Slide n of N slides status text'
    );
    assert.match(
        statusBarSource,
        /Toggle speaker notes comments/,
        'Pptx.tsx should expose Notes/Comments as the speaker-notes toggle'
    );
    assert.match(
        pptxSource,
        /pptx-viewer__sidebar/,
        'Pptx.tsx should render a slide sidebar'
    );
    assert.match(
        pptxSource,
        /<Splitter/,
        'Pptx.tsx should use Splitter for resizable PowerPoint-like panes'
    );
    assert.match(
        pptxSource,
        /collapsible/,
        'Pptx.tsx should expose collapsible pane behavior'
    );
    assert.match(
        statusBarSource,
        /Collapse slide thumbnails/,
        'Pptx.tsx should expose an explicit bottom control to collapse the slide thumbnail pane'
    );
    assert.match(
        statusBarSource,
        /Show slide thumbnails/,
        'Pptx.tsx should expose an explicit restore control when the slide thumbnail pane is collapsed'
    );
    assert.match(
        statusBarSource,
        /Toggle slide grid navigation/,
        'Pptx.tsx should expose a visual grid navigation mode'
    );
    assert.match(
        statusBarSource,
        /Toggle fullscreen slide view/,
        'Pptx.tsx should expose a fullscreen/focused slide mode'
    );
    assert.match(
        statusBarSource,
        /Toggle presenter view/,
        'Pptx.tsx should expose a same-tab presenter mode'
    );
    assert.match(
        statusBarSource,
        /<Slider/,
        'Pptx.tsx should use a zoom slider in the bottom bar'
    );
    assert.match(
        pptxSource,
        /Notes \/ Comments/,
        'Pptx.tsx should render a speaker notes panel'
    );
    assert.match(
        pptxSource,
        /ArrowRight|PageDown|Backspace/,
        'Pptx.tsx should support keyboard navigation in fullscreen/presenter modes'
    );
    assert.match(
        pptxSource,
        /!\s*focusMode\s*&&\s*!\s*presenterMode/,
        'Pptx.tsx should hide the normal status bar in fullscreen and presenter modes'
    );
    assert.match(
        presenterSource,
        /Next slide/,
        'PptxPresenterChrome should render a PowerPoint-like next-slide preview'
    );
    assert.match(
        presenterSource,
        /Presenter slide filmstrip/,
        'PptxPresenterChrome should render a bottom filmstrip'
    );
    assert.match(
        presenterSource,
        /End Show/,
        'PptxPresenterChrome should expose an End Show presenter exit'
    );
    assert.doesNotMatch(
        presenterSource,
        /Click to add notes/,
        'PptxPresenterChrome should not imply note editing in a view-only viewer'
    );
    assert.match(
        thumbnailSource,
        /renderSlideToContainer/,
        'SlideThumbnail should render real visual thumbnails from pptx-renderer'
    );
    assert.match(
        thumbnailSource,
        /\.dispose\(\)/,
        'SlideThumbnail should dispose external thumbnail SlideHandle resources'
    );
    assert.match(
        thumbnailSource,
        /ResizeObserver/,
        'SlideThumbnail should rerender visual thumbnails after sidebar resize'
    );
    assert.match(
        metadataSource,
        /notesSlide/,
        'pptxMetadata should extract speaker notes relationships'
    );
    assert.doesNotMatch(
        handlerSource,
        /requestId\s*===\s*['"]__autosave['"]/,
        'pptxHandler should not contain dead __autosave save-response handling'
    );
    assert.doesNotMatch(
        handlerSource,
        /PptxSaveBridge|pptxDirtyChanged|pptxSaveRequest|pptxSaveResponse/,
        'pptxHandler should not contain edit save bridge events'
    );
    assert.doesNotMatch(
        pptxSource,
        /pptx-svg|PptxSvgRenderer|Apply QA note|Slide text|updateShapeText|exportPptx|pptxDirtyChanged|pptxSaveRequest|pptxSaveResponse|<Input\.TextArea|ViewMode|Export to PDF/,
        'Pptx.tsx should not expose partial edit mode, PDF export, save bridge, or pptx-svg runtime'
    );
    console.log('  ✓ PPTX view-only source assertions passed');

    // Test 6: Webview build output exists and contains PPTX viewer asset
    const webviewDir = path.join(repoRoot, 'out/webview/assets');
    try {
        const files = await readdir(webviewDir);
        const pptxJs = files.find(f => f.startsWith('Pptx-') && f.endsWith('.js'));
        const wasmFile = files.find(f => f.endsWith('.wasm'));

        assert.ok(pptxJs, 'Pptx bundle chunk should exist in out/webview/assets/');
        assert.ok(!wasmFile, 'PPTX view-only bundle should not ship pptx-svg WASM');

        // Verify PPTX chunk is substantial enough to contain the viewer code.
        const pptxStat = await stat(path.join(webviewDir, pptxJs));
        assert.ok(pptxStat.size > 100_000,
            `Pptx chunk should be > 100KB (got ${(pptxStat.size / 1024).toFixed(0)}KB)`);

        console.log(`  ✓ Pptx chunk: ${pptxJs} (${(pptxStat.size / 1024).toFixed(0)}KB)`);
        console.log('  ✓ No PPTX WASM edit asset emitted');
    } catch (e) {
        if (e.code === 'ENOENT') {
            console.log('  ⊘ (skipping webview asset check — run npm run build first)');
        } else {
            throw e;
        }
    }

    console.log('pptx phase4 checks passed');
} finally {
    await rm(tempDir, { recursive: true, force: true });
}
