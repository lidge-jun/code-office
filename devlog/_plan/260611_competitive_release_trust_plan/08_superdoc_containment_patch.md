# 08 SuperDoc Containment Patch

## Problem

SuperDoc makes DOCX editable inside the workspace, but it is not the primary
moat. It introduces license, bundle, API, and fidelity risk. The project should
use SuperDoc while keeping failures contained.

## Patch Scope

### MODIFY `docs/FAQ.md`

Add a DOCX/SuperDoc section:

- why SuperDoc is bundled;
- why the project is AGPL-3.0-or-later;
- what DOCX editing supports;
- what DOCX fidelity is not guaranteed;
- how fallback read-only mode works.

### MODIFY `NOTICE.md`

Ensure SuperDoc attribution and license impact are explicit.

### MODIFY `src/react/view/word/Word.tsx`

Planned behavior:

- SuperDoc load failure renders a stable error panel.
- Export/save failure returns a bridge error.
- Fallback read-only mode is available for unsupported documents.
- View mode remains clean.

### ADD DOCX regression tests

Potential locations:

- extend existing `src/test/docxEditorProvider*.mjs` files;
- or add `src/test/docxSuperdocContainmentTest.mjs`;
- add `scripts/verify-docx-superdoc.mjs` only if a script-level package gate is
  needed.

Required coverage:

- load valid DOCX;
- handle SuperDoc exception;
- save bridge rejects failed export;
- View/Edit switch does not lose dirty state.

## Acceptance Criteria

- SuperDoc is presented as a bounded engine, not as a perfect Word replacement.
- AGPL implication is clear.
- DOCX failures are recoverable and do not corrupt user files.
