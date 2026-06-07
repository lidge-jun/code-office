/**
 * PPTX Phase 4+ Test — verify pptxHandler build and PPTX bundle integrity.
 *
 * After migrating from cheerio to pptx-renderer + pptx-svg, this test verifies:
 * 1. pptxHandler.ts builds successfully via esbuild (no compile errors)
 * 2. Webview bundle includes pptx-renderer and pptx-svg assets
 * 3. WASM file is present in build output
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

    // Test 3: source assertions for edit dirty/save lifecycle
    const pptxSource = await readFile(path.join(repoRoot, 'src/react/view/pptx/Pptx.tsx'), 'utf8');
    const handlerSource = await readFile(path.join(repoRoot, 'src/provider/handlers/pptxHandler.ts'), 'utf8');

    assert.doesNotMatch(
        handlerSource,
        /requestId\s*===\s*['"]__autosave['"]/,
        'pptxHandler should not contain dead __autosave save-response handling'
    );
    assert.match(
        pptxSource,
        /handler\.emit\(['"]pptxDirtyChanged['"],\s*\{\s*isDirty:\s*true\s*\}\)/,
        'Pptx.tsx should emit pptxDirtyChanged true from an edit action'
    );
    assert.match(
        pptxSource,
        /renderer\.addParagraph\(/,
        'Pptx.tsx should attempt a real pptx-svg mutation for the edit marker'
    );
    assert.match(
        pptxSource,
        /renderer\.updateShapeText\(/,
        'Pptx.tsx should expose real text-run editing through pptx-svg updateShapeText'
    );
    assert.match(
        pptxSource,
        /extractSlideTextRuns\(renderer\.getSlideXmlRaw\(slideIndex\)\)/,
        'Pptx.tsx should populate editable slide text from the current slide OOXML'
    );
    assert.match(
        pptxSource,
        /<Input\.TextArea/,
        'Pptx.tsx should render editable text inputs in edit mode'
    );
    assert.match(
        pptxSource,
        /renderer\.updateSlideFromSvg\(/,
        'Pptx.tsx should keep SVG snapshot update as a fallback edit scaffold'
    );
    assert.match(
        pptxSource,
        /renderer\.exportPptx\(\)/,
        'Pptx.tsx should keep provider-owned exportPptx save path'
    );
    console.log('  ✓ PPTX dirty/save source assertions passed');

    // Test 4: Webview build output exists and contains PPTX + WASM assets
    const webviewDir = path.join(repoRoot, 'out/webview/assets');
    try {
        const files = await readdir(webviewDir);
        const pptxJs = files.find(f => f.startsWith('Pptx-') && f.endsWith('.js'));
        const wasmFile = files.find(f => f.endsWith('.wasm'));

        assert.ok(pptxJs, 'Pptx bundle chunk should exist in out/webview/assets/');
        assert.ok(wasmFile, 'WASM file should exist in out/webview/assets/ (pptx-svg)');

        // Verify PPTX chunk is substantial (pptx-renderer + pptx-svg should be > 500KB)
        const pptxStat = await stat(path.join(webviewDir, pptxJs));
        assert.ok(pptxStat.size > 500_000,
            `Pptx chunk should be > 500KB (got ${(pptxStat.size / 1024).toFixed(0)}KB)`);

        // Verify WASM is present (pptx-svg WASM ~288KB)
        const wasmStat = await stat(path.join(webviewDir, wasmFile));
        assert.ok(wasmStat.size > 100_000,
            `WASM should be > 100KB (got ${(wasmStat.size / 1024).toFixed(0)}KB)`);

        console.log(`  ✓ Pptx chunk: ${pptxJs} (${(pptxStat.size / 1024).toFixed(0)}KB)`);
        console.log(`  ✓ WASM file:  ${wasmFile} (${(wasmStat.size / 1024).toFixed(0)}KB)`);
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
