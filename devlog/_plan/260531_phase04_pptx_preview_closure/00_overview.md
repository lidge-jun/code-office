# Phase 4 PPTX Preview Closure Plan

Scope: Phase 4 only

Project root: `/Users/jun/Developer/new/700_projects/code-office`

## Current State

Phase 4 is partially implemented:

- `package.json` registers `*.pptx` for `cweijan.officeViewer`.
- `src/provider/officeViewerProvider.ts` routes `.pptx` to `route = "pptx"`.
- `src/provider/handlers/pptxHandler.ts` parses slide order, text, and slide images from OOXML ZIP parts.
- `src/react/view/pptx/Pptx.tsx` renders a basic text/media preview with zoom controls.

The remaining Phase 4 work is closure hardening: compatible extension coverage, parser testability, malformed package behavior, and E2E proof in VS Code Insiders.

## Acceptance Criteria

1. `.pptx`, `.pptm`, and `.ppsx` use the same read-only PPTX preview route.
2. Presentation parsing is isolated in a pure module that can be tested without VS Code APIs.
3. A generated two-slide fixture proves slide order, extracted text, and embedded image data URIs.
4. A generated 32-slide fixture proves the parser handles 30+ slides without throwing.
5. A malformed package returns a payload-level error instead of throwing through the provider.
6. Existing build gates pass: `npm run test:pptx-phase4`, `npm run typecheck`, `npm run package`.
7. VS Code Insiders E2E opens a generated `.pptx` and displays the PPTX React view.
8. VS Code Insiders E2E opens a generated 32-slide deck, scrolls to the last slide, and verifies zoom controls keep visible state.

## Planned Diffs

### MODIFY `package.json`

Add compatible PowerPoint OOXML selectors:

```diff
 					{
 						"filenamePattern": "*.pptx"
+					},
+					{
+						"filenamePattern": "*.pptm"
+					},
+					{
+						"filenamePattern": "*.ppsx"
 					},
```

Add a focused Phase 4 test script:

```diff
 		"test:wikilink-phase3": "node src/test/wikilinkPhase3Test.mjs",
+		"test:pptx-phase4": "node src/test/pptxPhase4Test.mjs",
```

### ADD `src/provider/handlers/pptxReader.ts`

Move the pure parser types and functions out of `pptxHandler.ts`:

```ts
import AdmZip from 'adm-zip';
import * as cheerio from 'cheerio';
import { basename, extname, posix } from 'path';

export interface PptxSlide {
    index: number;
    title: string;
    text: string[];
    images: string[];
}

export interface PptxPayload {
    fileName: string;
    slides: PptxSlide[];
    fallbackPdfPath?: string;
    warning?: string;
    error?: string;
}

export async function readPresentation(filePath: string): Promise<PptxPayload> {
    try {
        const zip = new AdmZip(filePath);
        const slideEntries = readSlideEntryNames(zip);
        const slides = slideEntries.map((entryName, index) => parseSlide(zip, entryName, index + 1));
        return {
            fileName: basename(filePath),
            slides,
            warning: slides.length === 0 ? 'No slides were found in this PPTX package.' : undefined,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            fileName: basename(filePath),
            slides: [],
            error: message,
        };
    }
}

// Keep existing helper behavior from pptxHandler.ts:
// readSlideEntryNames, readPresentationSlideOrder, readRelationships,
// parseSlide, readSlideImages, normalizeRelationshipTarget, slideNumber,
// mimeForPath.
```

### MODIFY `src/provider/handlers/pptxHandler.ts`

Reduce the provider handler to VS Code message binding only:

```diff
-import AdmZip from 'adm-zip';
-import * as cheerio from 'cheerio';
-import { basename, extname, posix } from 'path';
 import { Handler } from '@/common/handler';
+import { readPresentation } from './pptxReader';
-
-export interface PptxSlide { ... }
-export interface PptxPayload { ... }
 
 export function handlePptx(uri: { fsPath: string }, handler: Handler): void {
     handler.on('init', async () => {
         handler.emit('pptxData', await readPresentation(uri.fsPath));
     });
 }
```

### MODIFY `src/provider/officeViewerProvider.ts`

Route macro-enabled and slideshow packages through the same parser:

```diff
             case ".pptx":
+            case ".pptm":
+            case ".ppsx":
                 route = 'pptx';
                 handlePptx(uri, handler);
                 break;
```

### ADD `src/test/pptxPhase4Test.mjs`

Use only generated temporary fixtures. The test will:

1. Bundle `src/provider/handlers/pptxReader.ts` to a temp ESM file with `esbuild`.
2. Generate a two-slide OOXML ZIP with:
   - `ppt/presentation.xml`
   - `ppt/_rels/presentation.xml.rels`
   - `ppt/slides/slide1.xml`
   - `ppt/slides/slide2.xml`
   - `ppt/slides/_rels/slide2.xml.rels`
   - `ppt/media/image1.png`
3. Assert:
   - two slides are returned in presentation order
   - slide titles/text are extracted
   - slide image is emitted as `data:image/png;base64,...`
4. Generate a 32-slide deck and assert 32 slides are returned.
5. Write invalid bytes to `.pptx` and assert `error` is set with `slides.length === 0`.

### MODIFY `src/react/view/pptx/Pptx.tsx`

Keep the existing route and layout, but make zoom state explicit so `+/-` values outside the preset segmented options still have visible UI state:

```diff
                     <Button size="small" onClick={() => setZoom(value => Math.max(70, value - 10))}>-</Button>
+                    <span className="pptx-viewer__zoom-value">{zoom}%</span>
                     <Segmented
                         size="small"
                         value={zoom}
```

No broad redesign in this phase. Other UI edits are limited to keeping loading/error/warning display stable and avoiding large-deck layout regressions.

### MODIFY `src/react/view/pptx/Pptx.less`

Add a stable fixed-width zoom readout:

```diff
 .pptx-viewer__controls {
     display: flex;
     gap: 8px;
     align-items: center;
     flex-wrap: wrap;
     justify-content: flex-end;
 }
+
+.pptx-viewer__zoom-value {
+    min-width: 42px;
+    text-align: center;
+    font-variant-numeric: tabular-nums;
+    color: #444c56;
+}
```

## Verification Plan

Automated:

```bash
cd /Users/jun/Developer/new/700_projects/code-office
npm run test:pptx-phase4
npm run typecheck
npm run package
```

Employee verification:

- Backend: audit parser extraction, package routing, and malformed-file behavior.
- Frontend: audit `Pptx.tsx` rendering state and large slide list UI risks.
- Docs: verify `structure/roadmap.md` and devlog scope stay aligned; no unrelated Phase 5/6 drift.

Manual/CU E2E:

1. Install `/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.6.vsix`.
2. Generate `/tmp/code-office-phase4-e2e.pptx` with the same test fixture builder.
3. Open it in VS Code Insiders.
4. Verify the selected tab is `code-office-phase4-e2e.pptx`, the React route displays the file name, slide count, extracted text, and an image preview.
5. Generate `/tmp/code-office-phase4-32slides.pptx`.
6. Open it in VS Code Insiders.
7. Verify the slide count is 32, scroll reaches slide 32, and `+/-` zoom changes keep the numeric zoom readout visible.

## Non-Goals

- Exact PowerPoint layout fidelity.
- Chart, SmartArt, animation, transition, embedded object rendering.
- Legacy `.ppt` binary conversion; the existing context command remains separate.
- Phase 5 Markdown CJK formatting.
- Phase 6 Excel strikethrough preservation.

## Rollback

All Phase 4 code changes are limited to:

- `package.json`
- `src/provider/handlers/pptxHandler.ts`
- `src/provider/handlers/pptxReader.ts`
- `src/provider/officeViewerProvider.ts`
- `src/react/view/pptx/Pptx.tsx`
- `src/react/view/pptx/Pptx.less`
- `src/test/pptxPhase4Test.mjs`

Rollback is a single commit revert if any parser or routing regression appears.
