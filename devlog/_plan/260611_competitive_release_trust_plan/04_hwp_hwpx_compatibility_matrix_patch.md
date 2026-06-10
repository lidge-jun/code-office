# 04 HWP/HWPX Compatibility Matrix Patch

## Problem

The strongest competitive wedge is HWP/HWPX editing, but public evidence must
prove what is safe. A high install count is not needed if fixture evidence is
credible. Without a matrix, users cannot distinguish supported workflows from
best-effort rendering.

## Patch Scope

### NEW `docs/HWP-HWPX-COMPATIBILITY.md`

Content outline:

```markdown
# HWP/HWPX Compatibility Matrix

## Evidence Policy

- Public fixtures are synthetic or redacted.
- Private fixtures may be used for local QA, but only hash/screenshot result is
  recorded.
- Each row is verified against the release version named in the table.

## Matrix

| Fixture | Format | Open | View | Edit | Save | Reopen | PDF Export | Known Limitations |
|---|---|---|---|---|---|---|---|---|
| simple-text | HWP | pass | pass | pass | pass | pass | pass | none |
| table-basic | HWPX | pass | pass | pass | pass | pass | pass | ... |

## Legend

- pass: verified in VS Code Insiders with packaged VSIX.
- limited: works with documented degradation.
- fail: known unsupported behavior.
- untested: not claimed.
```

### NEW `test-fixtures/hwp/README.md`

Rules:

- Only synthetic/redacted fixtures are committed.
- Personal user documents are prohibited.
- Fixture generation instructions must be reproducible.

### NEW or MODIFY verification script

Preferred path:

- Extend `scripts/verify-hwp-hardening.mjs` only for structural gates.
- Add a separate matrix helper if needed:
  - `scripts/verify-hwp-compatibility-matrix.mjs`

The matrix helper should validate that every public fixture row has:

- fixture path or private-hash reference;
- release version;
- open/view/edit/save/reopen status;
- known limitation field;
- screenshot or command evidence.

## Manual QA Requirement

Computer Use must verify at least:

1. HWP open in Viewer mode.
2. Switch to Editor mode.
3. Dirty dot appears only after edit.
4. Cmd+S clears dirty state.
5. Switch back to Viewer after successful save.
6. Failed save stays in Editor.
7. HWPX follows the same pattern.

## Acceptance Criteria

- The public docs no longer make broad HWP/HWPX claims without a matrix.
- Each supported claim has a fixture or explicit manual evidence row.
- Known limitations are visible before users edit real documents.
