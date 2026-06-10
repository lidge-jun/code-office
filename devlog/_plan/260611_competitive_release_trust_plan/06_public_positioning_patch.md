# 06 Public Positioning Patch

## Problem

The public copy currently risks sounding like a broad inherited viewer bundle.
The stronger frame is narrower and more credible:

> Local HWP/HWPX editing and cross-format document review inside VS Code.

Markdown is workspace glue, not an Obsidian replacement. DOCX/PPTX/PDF/XLSX are
supporting document review surfaces. HWP/HWPX is the wedge.

## Patch Scope

### MODIFY `README.md`

First-screen message should lead with:

- local HWP/HWPX editing;
- VS Code native save lifecycle;
- cross-format document review;
- local-first trust boundaries.

Demote:

- "everything viewer" language;
- Obsidian-like comparison language;
- broad file-type inventory before the wedge is clear.

### MODIFY `README-KO.md` and `README-CN.md`

Keep the same positioning in localized docs.

### MODIFY `docs/index.html`

Add first-viewport copy:

- HWP/HWPX local editing;
- DOCX/Markdown/PPTX/PDF evidence review;
- release trust links;
- compatibility matrix link.

### MODIFY Marketplace/Open VSX package metadata if needed

Relevant file:

- `package.json`

Potential description:

```text
Local HWP/HWPX editing and cross-format document review for VS Code.
```

Keep category/tag scope accurate. Do not imply full office-suite fidelity.

## Acceptance Criteria

- A new user can understand the primary value in 10 seconds.
- Public copy does not invite a losing comparison against Obsidian or full
  Microsoft/Hancom office suites.
- Copy distinguishes editable surfaces from read-only/review surfaces.
