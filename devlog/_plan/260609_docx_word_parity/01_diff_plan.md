# 01 DOCX Word-Parity Diff Plan

Date: 2026-06-09
Project root: /Users/jun/Developer/new/700_projects/code-office

## Phase 1: Fixture Manifest And Local QA Boundary

### NEW

`/Users/jun/Developer/new/700_projects/code-office/scripts/docx-word-parity-fixtures.mjs`

Purpose:

- Read local-only DOCX fixture paths from a gitignored JSON file.
- Verify the local-only DOCX fixture paths exist without committing those paths.
- Compute SHA-256 hashes without copying files into git.
- Write a generated manifest to:
  `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260609_docx_word_parity/fixtures.local.generated.md`

Complete content plan:

```js
import { createHash } from 'node:crypto';
import { stat, readFile, writeFile } from 'node:fs/promises';

const fixtureConfigPath = new URL('../.docx-word-parity-fixtures.local.json', import.meta.url);

async function hashFile(path) {
  const data = await readFile(path);
  return createHash('sha256').update(data).digest('hex');
}

async function main() {
  const fixtures = JSON.parse(await readFile(fixtureConfigPath, 'utf8'));
  const rows = [];
  for (const fixture of fixtures) {
    const info = await stat(fixture.path);
    rows.push({ id: fixture.id, exists: true, size: info.size, sha256: await hashFile(fixture.path) });
  }
  await writeFile(outputPath, markdownTable(rows));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### NEW GENERATED, NOT PRIVATE BYTES

`/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260609_docx_word_parity/fixtures.local.generated.md`

Purpose:

- Stores only fixture ID, size, hash, and existence status.
- Does not include absolute DOCX paths.
- Does not include DOCX file bytes.

### MODIFY

`/Users/jun/Developer/new/700_projects/code-office/.gitignore`

Before:

```gitignore
# current project ignore rules
```

After:

```gitignore
# Local QA manifests can contain private absolute file paths.
.docx-word-parity-fixtures.local.json
devlog/_plan/260609_docx_word_parity/fixtures.local.generated.md
```

## Phase 2: eigenpal Edit Tuning

### NEW

`/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/docxEditorTuning.ts`

Purpose:

- Keep all DOCX edit fidelity knobs stable and testable outside the component.
- Avoid inline arrays for `fontFamilies` because eigenpal docs require stable
  references.

Complete content plan:

```ts
import type { DocxEditorProps } from '@eigenpal/docx-editor-react';

type FontFamilies = NonNullable<DocxEditorProps['fontFamilies']>;

export const DOCX_EDITOR_INITIAL_ZOOM = 1.0;

export const DOCX_EDITOR_FONT_FAMILIES: FontFamilies = [
  { name: 'Malgun Gothic', fontFamily: '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans CJK KR", "Noto Sans KR", sans-serif', category: 'sans-serif' },
  { name: 'Apple SD Gothic Neo', fontFamily: '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans CJK KR", "Noto Sans KR", sans-serif', category: 'sans-serif' },
  { name: 'Noto Sans CJK KR', fontFamily: '"Noto Sans CJK KR", "Noto Sans KR", "Malgun Gothic", sans-serif', category: 'sans-serif' },
  { name: 'Noto Sans KR', fontFamily: '"Noto Sans KR", "Noto Sans CJK KR", "Malgun Gothic", sans-serif', category: 'sans-serif' },
  { name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif', category: 'sans-serif' },
  { name: 'Times New Roman', fontFamily: '"Times New Roman", Times, serif', category: 'serif' },
  { name: 'Cambria', fontFamily: 'Cambria, Georgia, serif', category: 'serif' },
  { name: 'Calibri', fontFamily: 'Calibri, "Aptos", Arial, sans-serif', category: 'sans-serif' },
  { name: 'Aptos', fontFamily: 'Aptos, Calibri, Arial, sans-serif', category: 'sans-serif' },
];
```

### MODIFY

`/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.tsx`

Before:

```tsx
const [documentBuffer, setDocumentBuffer] = useState<ArrayBuffer | null>(null);
...
handler.on(DOCX_EVENTS.openBuffer, ({ buffer }: { buffer: number[] }) => {
...
<DocxEditor
    ref={editorRef}
    documentBuffer={documentBuffer}
    mode="editing"
    showToolbar={true}
    showZoomControl={true}
    showRuler={true}
    onChange={handleChange}
    onSave={handleSave}
    onError={handleError}
/>
```

After:

```tsx
import {
    DOCX_EDITOR_FONT_FAMILIES,
    DOCX_EDITOR_INITIAL_ZOOM,
} from './docxEditorTuning';

const [documentName, setDocumentName] = useState('Document.docx');
...
handler.on(DOCX_EVENTS.openBuffer, ({ buffer, fileName }: { buffer: number[]; fileName?: string }) => {
    if (fileName) setDocumentName(fileName);
...
const handleFontsLoaded = useCallback(() => {
    editorRef.current?.getEditorRef()?.relayout();
}, []);
...
<DocxEditor
    ref={editorRef}
    documentBuffer={documentBuffer}
    mode="editing"
    documentName={documentName}
    documentNameEditable={false}
    fontFamilies={DOCX_EDITOR_FONT_FAMILIES}
    initialZoom={DOCX_EDITOR_INITIAL_ZOOM}
    showToolbar={true}
    showZoomControl={true}
    showRuler={true}
    rulerUnit="cm"
    showMarginGuides={true}
    marginGuideColor="#94a3b8"
    showOutline={false}
    showOutlineButton={false}
    onFontsLoaded={handleFontsLoaded}
    onChange={handleChange}
    onSave={handleSave}
    onError={handleError}
/>
```

### MODIFY

`/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.css`

Before:

```css
.docx-editor-container {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #f8fafc;
}
```

After:

```css
.docx-editor-container {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #dfe4ea;
}

.docx-editor-container .ep-root {
    width: 100%;
    height: 100%;
    min-height: 0;
}

.docx-editor-container .layout-page-content,
.docx-editor-container .docx-editor-page,
.docx-editor-container .docx-run-editable,
.docx-editor-container .docx-paragraph-editable {
    font-family: "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans CJK KR", "Noto Sans KR", sans-serif;
}
```

## Phase 3: Tests

### MODIFY

`/Users/jun/Developer/new/700_projects/code-office/src/test/docxEditorProviderTest.mjs`

Before:

```js
assert.match(
    wordSource,
    /label:\s*['"]Edit['"],\s*value:\s*['"]editor['"]/,
    'Word.tsx should expose an explicit Edit mode control'
);
```

After:

```js
assert.match(
    wordSource,
    /DOCX_EDITOR_FONT_FAMILIES/,
    'Word.tsx should use stable DOCX editor font families'
);

assert.match(
    wordSource,
    /onFontsLoaded=\{handleFontsLoaded\}/,
    'Word.tsx should relayout after editor fonts load'
);

assert.match(
    wordSource,
    /showMarginGuides=\{true\}/,
    'Word.tsx should expose page margin guides in edit mode'
);
```

## Phase 4: SuperDoc Spike Boundary

### NEW

`/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260609_docx_word_parity/02_superdoc_spike.md`

Purpose:

- Record SuperDoc version, license, docs, and spike instructions.
- Explicitly state that SuperDoc must not be imported by production source.
- If a temporary SuperDoc app is needed, create it outside the repo under
  `/tmp/code-office-docx-superdoc-spike`.

## Phase 5: Screenshot Matrix

### NEW

`/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260609_docx_word_parity/03_screenshot_matrix.md`

Purpose:

- Record Computer Use screenshot results.
- Per fixture, compare:
  - Microsoft Word
  - code-office View
  - code-office Edit before tuning
  - code-office Edit after tuning
  - SuperDoc spike
- Score 0/1/2 for:
  - Korean font fidelity
  - table fidelity
  - page width and margins
  - line wrapping
  - images
  - headers and footers
  - overall readability

## Verification Commands

Run after implementation:

```bash
npm run test:docx-editor-provider
npm run typecheck
npm run build
node scripts/docx-word-parity-fixtures.mjs
```

Manual/runtime verification:

```text
Computer Use:
1. Open the same DOCX in Microsoft Word.
2. Capture page 1 and any visibly broken page from Word.
3. Open the same DOCX in already-open VS Code/VS Code Insiders.
4. Capture code-office View.
5. Switch to Edit and capture code-office tuned Edit.
6. If SuperDoc spike app exists, capture the same page there.
7. Record all screenshots and scores in 03_screenshot_matrix.md.
```
