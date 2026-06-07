/**
 * PPTX Phase 4+ Test — verify pptxHandler build and PPTX bundle integrity.
 *
 * After rolling PPTX back to view-only, this test verifies:
 * 1. pptxHandler.ts builds successfully via esbuild (no compile errors)
 * 2. Webview bundle includes the PPTX viewer chunk
 * 3. edit/save/dirty/pptx-svg surfaces are not present
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

    // Test 3: source assertions for view-only PPTX lifecycle
    const pptxSource = await readFile(path.join(repoRoot, 'src/react/view/pptx/Pptx.tsx'), 'utf8');
    const handlerSource = await readFile(path.join(repoRoot, 'src/provider/handlers/pptxHandler.ts'), 'utf8');

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
        /pptx-svg|PptxSvgRenderer|Apply QA note|Slide text|updateShapeText|exportPptx|pptxDirtyChanged|pptxSaveRequest|pptxSaveResponse|<Input\.TextArea|ViewMode/,
        'Pptx.tsx should not expose partial edit mode, save bridge, or pptx-svg runtime'
    );
    console.log('  ✓ PPTX view-only source assertions passed');

    // Test 4: Webview build output exists and contains PPTX viewer asset
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
