# Research 91 — PPTX Branch Audit

Branch: `dev_pptx`
Worktree: `/Users/jun/Developer/new/700_projects/code-office--dev_pptx`

## Verdict

**Backend architecture PASS. High-fidelity view routing PASS. Complete PPTX
editing remains unproven.**

The branch replaces the legacy text/image extraction path with a dedicated PPTX
custom editor and adds a view/edit split. The view side is materially better.
The edit side is currently closer to a WASM render/export scaffold than a
complete user-facing editor. Backend's late-arrived read-only audit passed
provider registration, lifecycle, file IO/save semantics, and Markdown merge
safety; Frontend still flagged the lack of user mutation/dirty-state editing.

## Evidence

Branch commits:

```text
2c9d959 feat(pptx): replace cheerio text extraction with pptx-renderer for high-fidelity rendering
a6346e0 feat(pptx): add dual-mode View/Edit with pptx-svg WASM editing
9502085 feat(pptx): add PptxEditorProvider with CustomEditorProvider save lifecycle
12dd9ea chore(pptx): remove legacy cheerio-based pptxReader
1276ec3 fix(pptx): use Uint8Array instead of Buffer.from, add proper imports
61267fd test(pptx): rewrite pptxPhase4Test for new pptx-renderer + pptx-svg architecture
```

Registration and routing:

- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/package.json`
  registers `onCustomEditor:cweijan.pptxEditor`.
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/package.json:381`
  defines the `cweijan.pptxEditor` custom editor.
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/extension.ts:76`
  registers `PptxEditorProvider.register(context, viewOption)`.
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/provider/officeViewerProvider.ts`
  removes PPTX extensions from the legacy read-only provider.

View path:

- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx:122`
  opens the PPTX with `PptxViewer.open(...)` in view mode.
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx:123`
  uses recommended ZIP limits.
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx:125`
  uses windowed slide rendering.

Edit/export path:

- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx:58`
  starts edit rendering with `pptx-svg`.
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx:65`
  calls `renderer.renderSlideSvg(slideIndex)`.
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx:66`
  injects the SVG into the container.
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx:146`
  calls `renderer.exportPptx()` for save.

Provider lifecycle:

- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/provider/pptx/PptxEditorProvider.ts:61`
  wires `handlePptx()` with dirty state.
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/provider/pptx/PptxEditorProvider.ts:69`
  implements `saveCustomDocument()`.
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/provider/pptx/PptxEditorProvider.ts:75`
  writes exported bytes through `vscode.workspace.fs.writeFile()`.

## Findings

### 1. Provider lifecycle and view mode passed backend architecture audit

The `pptx-renderer` path is a credible replacement for the old cheerio-based
`pptxReader.ts` extraction. The branch also deletes the old reader and rewrites
the phase-four test around the new architecture.

### 2. Edit mode lacks user mutation wiring

The edit mode renders SVG, but the audit did not find user-driven mutation
logic:

- no shape selection state
- no text editing UI
- no transform/fill/style update controls
- no contenteditable or form control tied to selected slide content
- no `setIsDirty(true)` path in `Pptx.tsx`
- no `pptxDirtyChanged` event with `isDirty: true`

The grep evidence found only:

- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx:157`
  `setIsDirty(false)`
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx:158`
  `pptxDirtyChanged` with `isDirty: false`
- `/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx:174`
  `setIsDirty(false)` on open

This means a normal user action does not appear to mark the custom document
dirty. Since `PptxEditorProvider.saveCustomDocument()` returns immediately when
`document.isDirty` is false, the save lifecycle is unlikely to run for normal
interactive editing.

### 3. Export exists but does not prove editing

`exportPptx()` can return bytes, but without a mutation path the exported PPTX
may be only the loaded original round-tripped through the renderer. This is still
valuable plumbing, but it is not enough to claim complete PPTX editing.

### 4. Runtime evidence is missing

The branch has build/test evidence in earlier devlog, but lacks a runtime smoke
showing:

- open a PPTX in VS Code Dev Host
- render view mode with realistic fidelity
- switch to edit mode
- modify a visible object or text
- mark document dirty
- save to disk
- reopen and verify the modification persisted

## Residual Risks

- `pptx-svg` WASM initialization in VS Code WebView needs runtime proof.
- SVG injection is not yet an editing surface by itself.
- Dirty/save lifecycle is not connected to any positive user mutation event.
- Bundle and WASM size need VSIX/install impact evidence.
- Existing tests prove architecture artifacts more than real editing behavior.

## Merge Gate Recommendation

Do not merge `dev_pptx` as complete PPTX editing. It can be described as
high-fidelity view plus experimental WASM export plumbing. Complete editing
requires at least one concrete mutation path, dirty-state propagation, and
runtime save/reopen verification.
