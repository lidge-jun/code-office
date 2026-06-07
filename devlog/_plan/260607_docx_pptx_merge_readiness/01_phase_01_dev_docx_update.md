# Phase 01 — dev_docx Update Plan

## Scope

Update `dev_docx` onto current `main` and close DOCX-specific pre-QA blockers.

Worktree:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_docx
```

## Required Changes

- Merge current `main` into `dev_docx`.
- Preserve `main` Markdown wikilink cache files and tests.
- Preserve DOCX custom editor routing.
- Replace ambiguous `__autosave` behavior with explicit host-save request flow.
- Add focused regression/source assertion for DOCX save event semantics.

## Acceptance Criteria

| Requirement | Evidence |
|---|---|
| `dev_docx` contains current `main` Markdown cache fix | `npm run test:markdown` PASS and source inspection |
| `.docx/.dotx` route to `cweijan.docxEditor` | package/provider source inspection |
| WebView `Cmd+S` requests host save | focused test/source assertion |
| `__autosave` disk-write claim removed | focused test/source assertion |
| Provider save bridge still exports bytes | `npm run build` PASS and focused test/source assertion |

## Residual Risk

Runtime edit/save/reopen still requires manual VS Code GUI QA after this goal.

## Implementation Evidence

Branch commits:

```text
4d3a83e Merge branch 'main' into dev_docx
573f4bd fix(docx): route editor save through VS Code lifecycle
0827528 Merge branch 'main' into dev_docx
3a7f750 Merge branch 'main' into dev_docx
```

`573f4bd` is the implementation commit. Later merge commits are main/devlog
syncs so the branch remains merge-ready with current Markdown cache work.

Changed files in the DOCX fix commit:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_docx/package.json
/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/provider/handlers/docxHandler.ts
/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/react/view/word/Word.tsx
/Users/jun/Developer/new/700_projects/code-office--dev_docx/src/test/docxEditorProviderTest.mjs
```

Implemented behavior:

- `Word.tsx` defines and emits `docxHostSaveRequest`.
- `docxHandler.ts` handles `docxHostSaveRequest` by calling
  `workbench.action.files.save`.
- `Word.tsx` no longer emits `docxSaveResponse` with
  `requestId: "__autosave"`.
- `DocxSaveBridge` remains the only requestId-based save-response owner.
- `test:docx-editor-provider` source assertions cover the event and save
  lifecycle boundaries.

Verification:

```text
npm run test:docx-editor-provider
PASS on branch tip 3a7f750: docx editor provider checks passed
```
