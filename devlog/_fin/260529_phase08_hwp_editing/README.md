# Phase 8: HWP/HWPX Native Editing — DONE

**Completed**: 2026-05-29
**Plan**: `devlog/_fin/260524_vscode_obsdian_baseline/08_phase_08_hwp_hwpx_native_support.md` through `08.2g_*`

## Summary

Implemented full HWP/HWPX editing inside VS Code using a bundled local rhwp-studio WASM runtime. This was the most complex phase, involving custom editor lifecycle, atomic file writes, binary format validation, WebView security hardening, and a dual-mode bridge (local + remote) for the WASM editor.

## Architecture

```
User → Ctrl+S → HwpEditorProvider → requestExport(requestId)
                                         ↓
                               WebView (Hwp.tsx) → rhwpBridge
                                         ↓
                               WASM (rhwp-studio) → exportHwp() → Uint8Array
                                         ↓
                               vscodeSavePayload → Host
                                         ↓
                               validateExportedDocument (magic + size)
                                         ↓
                               atomicWriteFile (temp → rename)
```

## What Changed

### Extension Host
- `src/provider/hwp/HwpEditorProvider.ts` (316 lines): Full `CustomEditorProvider` with dirty/save/revert/backup lifecycle, 120s export timeout, config cascading
- `src/provider/hwp/hwpSaveService.ts` (131 lines): Atomic write, magic number validation (OLE `D0CF11E0`, ZIP `504B0304`), 50MB size cap, format mismatch detection, toolbar save dialog
- `src/provider/hwp/HwpCustomDocument.ts`: Document model with buffer and dispose
- `src/provider/handlers/hwpHandler.ts` (122 lines): WebView event bindings, experimental toolbar save flow
- `src/common/hwpMessageSchema.ts` (166 lines): 12 typed events with runtime validation

### React WebView
- `src/react/view/hwp/Hwp.tsx` (~280 lines): Editor component with state machine (loading → editing → saving), keyboard shortcuts, dirty tracking
- `src/react/view/hwp/rhwpBridge/createSecureRhwpEditor.ts` (463 lines): Dual-mode bridge — local (direct `__rhwpBridge`) and remote (postMessage RPC with token auth)
- `src/react/view/hwp/rhwpBridge/types.ts` + `validateRhwpMessage.ts`: Interface definitions and message validation

### Build Pipeline
- `build.ts`: rhwp-studio post-processing — asset path rewrite, PWA strip, JS bridge injection, postMessage patch, token tracking

### Verification
- `scripts/verify-hwp-hardening.mjs`: Release gate script checking activation, provider, priority, lifecycle, handler bindings

## Security Hardening (Sub-phases 8.2a through 8.2g)

| Sub-phase | Focus |
|---|---|
| 8.2a | Exact diffs for security implementation |
| 8.2b | Revalidation fixes for backend audit findings |
| 8.2c | Frontend revalidation fixes |
| 8.2d | Security implementation plan |
| 8.2e | Frontend verification plan |
| 8.2f | Full editing recovery audit |
| 8.2g | Lifecycle hardening completion |

All sub-phases passed backend and frontend employee audits before implementation.
