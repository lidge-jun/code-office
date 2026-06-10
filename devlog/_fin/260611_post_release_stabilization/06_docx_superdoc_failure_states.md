---
created: 2026-06-11
tags: [code-office, docx, superdoc, pabcd-cycle-06]
---
# 06 DOCX/SuperDoc Failure-State Checks

## P - Problem

The DOCX/SuperDoc integration has several fragile failure states: noisy upstream
`elements`/`comments` exceptions, render hangs, View/Edit dirty transitions, and
viewer-mode saves. These are already handled in product code, but the assertions
are spread across broad DOCX structure/surface/save tests.

## A - Approach

Add a focused failure-state assertion module that documents and verifies the
contract without changing runtime behavior.

## B - Build Changes

- Add `src/test/docxEditorProviderFailureStateAssertions.mjs`.
- Wire it into `src/test/docxEditorProviderTest.mjs`.
- Keep product code unchanged unless the assertions reveal a real gap.

## C - Check Plan

- `npm run test:office`
- `npm run typecheck`

## D - Done Criteria

- Tests explicitly prove SuperDoc noisy exceptions are nonfatal.
- Tests explicitly prove document-init/password failures remain fatal.
- Tests explicitly prove viewer-mode save is suppressed and dirty Edit->View
  waits for host save completion.

