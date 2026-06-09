# Research 90 — DOCX Branch Audit

Branch: `dev_docx`
Worktree: `/Users/jun/Developer/new/700_projects/code-office--dev_docx`

## Verdict

**Backend architecture PASS. User-ready editing remains unproven.**

The branch successfully registers a dedicated DOCX custom editor, routes
`.docx/.dotx` away from the read-only office viewer, loads
`@eigenpal/docx-editor-react`, and implements a host-side save bridge. However,
the audit found unresolved runtime-save risks and missing end-to-end evidence.
Backend's late-arrived read-only audit specifically passed provider
registration, `CustomEditorProvider` lifecycle, and file IO/save semantics.

## Evidence

Branch commits:

```text
f6e3bf4 feat(docx): replace docx-preview with eigenpal/docx-editor for WYSIWYG editing
3fe4a4a feat(docx): add DocxEditorProvider with CustomEditorProvider save lifecycle
de0a716 fix(docx): use Uint8Array instead of Buffer.from for VS Code API compat
```

Registration and routing:

- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/package.json`
  registers `onCustomEditor:cweijan.docxEditor` and a `cweijan.docxEditor`
  custom editor for DOCX.
- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/extension.ts`
  registers `DocxEditorProvider.register(context, viewOption)`.
- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/provider/officeViewerProvider.ts`
  removes DOCX from the read-only office viewer routing.

Provider lifecycle:

- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/provider/docx/DocxEditorProvider.ts:75`
  wires `handleDocx()` with `onDirtyChange`.
- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/provider/docx/DocxEditorProvider.ts:85`
  implements `saveCustomDocument()`.
- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/provider/docx/DocxEditorProvider.ts:96`
  calls `bridge.requestSave()`.
- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/provider/docx/DocxEditorProvider.ts:101`
  writes returned bytes through `vscode.workspace.fs.writeFile()`.

WebView editor:

- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/react/view/word/Word.tsx:163`
  renders `DocxEditor`.
- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/react/view/word/Word.tsx:168`
  sets `mode="editing"`.
- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/react/view/word/Word.tsx:172`
  wires `onChange={handleChange}`.
- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/react/view/word/Word.tsx:173`
  wires `onSave={handleSave}`.

## Findings

### 1. Provider bridge exists and passed backend architecture audit

`DocxEditorProvider` follows the same high-level pattern as the HWP provider:
open document, bind a WebView handler, mark dirty through an event, request
bytes from the WebView, and write them through VS Code FS APIs.

This is a real architectural improvement over the earlier read-only
`docx-preview` path.

### 2. Cmd+S path is suspicious

The WebView intercepts `Cmd/Ctrl+S`:

- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/react/view/word/Word.tsx:124`
- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/react/view/word/Word.tsx:127`
- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/react/view/word/Word.tsx:131`

It prevents the default event and emits only `docxDirtyChanged`.

That means the key handler marks the document dirty but does not directly call
VS Code save, `docxSaveRequest`, or `editorRef.current.save()`. VS Code may still
save through menu/command driven `saveCustomDocument()`, but the direct keyboard
path needs runtime proof or a code fix.

### 3. Editor autosave response has no proven host consumer

The editor `onSave` callback emits:

- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/react/view/word/Word.tsx:56`
- `/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/react/view/word/Word.tsx:59`

The request id is hardcoded as `__autosave`. The host-side bridge resolves
pending save requests by request id. This audit did not find evidence that
`__autosave` is treated as a disk-write request by the extension host.

### 4. Runtime evidence is missing

Existing devlog records build and type success, but the runtime gate is still
open:

- open a real DOCX in Extension Dev Host
- modify document content
- invoke keyboard save
- verify disk bytes changed
- close/reopen and verify persisted content
- verify failed save keeps the dirty document open

## Residual Risks

- DOCX editing library behavior in VS Code WebView is not runtime-proven.
- Keyboard save may mark dirty without actually saving.
- Editor autosave may emit a successful response that no host request is waiting
  for.
- No dedicated automated test proves the provider bridge.
- Large WebView bundle impact is known from previous build output but not tied
  to an install/runtime performance threshold.

## Merge Gate Recommendation

Do not merge `dev_docx` as complete DOCX editing yet. First fix or prove the
`Cmd+S`/autosave lifecycle, add at least one provider bridge regression test,
and run a VS Code Dev Host save/reopen smoke on a fixture DOCX.
