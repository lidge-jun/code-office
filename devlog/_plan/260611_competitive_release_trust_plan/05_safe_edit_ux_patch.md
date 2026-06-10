# 05 Safe Edit UX Patch

## Problem

Editing trust is more important than feature count. Users will uninstall if a
document appears saved but reopens broken, if the dirty dot lies, or if View/Edit
switching loses state.

## Patch Scope

### HWP/HWPX

Relevant files:

- `src/provider/hwp/HwpEditorProvider.ts`
- `src/provider/hwp/hwpSaveService.ts`
- `src/react/view/hwp/Hwp.tsx`
- `src/common/hwpMessageSchema.ts`
- `scripts/verify-hwp-hardening.mjs`

Planned behavior:

- Before entering Editor mode from Viewer for the first time, create or offer a
  recovery copy if the file is outside a temporary workspace.
- Show an explicit warning when:
  - large file threshold is exceeded or approached, using `MAX_HWP_BYTES` in
    `hwpSaveService.ts` as the implementation anchor;
  - proprietary font substitution is reported by the runtime. If rhwp-studio
    exposes no stable font-substitution API, document this as unsupported and
    show a generic font-fidelity warning only in Editor entry copy;
  - unsupported features are reported by a future runtime bridge method. If no
    bridge signal exists, do not fake detection; show a generic limitation note
    and record the missing bridge hook as follow-up;
  - save/export is best-effort or fallback-based.
- On failed save:
  - keep Editor mode;
  - keep dirty state;
  - show the host error;
  - never switch to Viewer.
- Add a "Save Copy" path for risky edits.

Implementation contract:

- Add a host-owned command or toolbar action named `Save Copy...` rather than
  overloading normal Cmd+S.
- Recovery copy destination should default beside the source file as
  `<basename>.code-office-backup.<ext>` unless the file is untitled or in a temp
  workspace.
- Editor-entry warning is cancellable. Cancel keeps Viewer mode.
- Acceptance assertions belong in `scripts/verify-hwp-hardening.mjs`; visual
  confirmation belongs in Computer Use smoke.

### DOCX

Relevant files:

- `src/provider/docx/DocxEditorProvider.ts`
- `src/provider/handlers/docxHandler.ts`
- `src/react/view/word/Word.tsx`
- `src/react/view/word/*`

Planned behavior:

- View mode must never show dirty dot.
- Edit -> View must save or explicitly cancel; no silent state loss.
- SuperDoc exceptions must render as recoverable UI states.
- Save failures must not return success to the provider bridge.
- Fallback read-only mode must be explicit:
  - first choice: SuperDoc read-only if the engine loaded but editing/export
    failed;
  - second choice: a minimal metadata/error panel with "Open externally" and
    "Retry" actions;
  - do not silently route through the legacy office viewer unless a provider
    handoff design is written and audited.

## Verification

Automated:

```bash
npm run test:hwp-hardening
npm run test:office
npm run typecheck
```

Manual Computer Use:

- Install packaged VSIX into VS Code Insiders.
- Open safe HWP copy and safe HWPX copy.
- Verify dirty dot, Cmd+S, failed-save, Viewer/Edit switch.
- Open safe DOCX copy.
- Verify View dirty dot absence, Edit dirty dot behavior, Cmd+S, Edit -> View.
- Verify DOCX SuperDoc load failure, export failure, and dirty-state behavior
  with tests under `src/test/docxEditorProvider*.mjs` or a new
  `src/test/docxSuperdocContainmentTest.mjs`.

## Acceptance Criteria

- Dirty state matches real save lifecycle.
- Failed save never appears successful.
- Risk warnings are visible before destructive edits.
- View mode remains clean unless there is a real unsaved edit.
