---
created: 2026-06-03
tags: [code-office, hwp, verification, docs, vsix]
---
# Phase 3 - Features, Docs, and Verification

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/src/provider/hwp/HwpEditorProvider.ts
```

Implement `exportActiveHwpSvg`:

- resolve command URI from explicit explorer/context URI or active HWP document
- request `exportSvg` from the WebView
- prompt for destination folder
- write `basename_p{n}.svg`
- show completion notification with Reveal action

Implement `showActiveHwpDebugOverlay`:

- request `debugOverlay` SVGs from WebView
- write a temporary HTML page under OS temp
- open it with `vscode.open`

Implement `dumpHwpParagraph`:

- follow upstream rhwp-vscode pattern
- initialize rhwp WASM host against the real local runtime layout, not a hardcoded root `rhwp_bg.wasm`
- discover the content-hashed WASM under `resource/rhwp-studio/assets/` from `index.html`/asset metadata, or use `resource/rhwp-studio/rhwp.js` plus the matching hashed `rhwp_bg-*.wasm`
- open the selected HWP/HWPX bytes
- quick-pick section and paragraph
- output paragraph properties and line info to a `code-office HWP Dump` output channel
- if HWPX direct dump is unsupported by current WASM API, fail loudly with a precise error and document the limit.

If extension-host rhwp initialization proves unreliable, use the active WebView document instance for dump RPC instead of adding a second WASM lifecycle. Do not silently fall back between the two; choose the first proven path during B and lock it with verifier checks.

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/scripts/verify-hwp-hardening.mjs
```

Add strict checks:

- HWP initial mode config is passed to React.
- `src/common/reactApp.ts` and `src/react/util/vscodeConfig.ts` include `hwpInitialMode`.
- `HWP_EVENTS.modeChanged = 'hwp:modeChanged'` and `HWP_EVENTS.modeChangeRequest = 'hwp:modeChangeRequest'` events are schema-validated.
- `handler.ts` inbound allowlist uses `HWP_EVENTS.modeChanged` and `HWP_EVENTS.viewerCommandResult`, not bare event strings.
- Viewer commands are contributed and registered.
- Save-then-switch uses `HWP_EVENTS.nativeSave`, not toolbar direct write.
- Failed save path keeps mode unchanged.
- Clean Viewer switches skip unnecessary native save/export.
- clean Viewer Cmd/Ctrl+S no-ops through an explicit `saveActiveHwpDocument` guard.
- clean Viewer File > Save / Save All no-ops through an explicit `saveCustomDocument` guard before `requestExport`.
- last mode persistence uses `context.globalState` and only updates after `HWP_EVENTS.modeChanged`.
- Bridge exposes `pageCount` and `getPageSvg`.
- Debug overlay bridge is either present and asserted or the command emits a precise unsupported error.
- HWP view renders a read-only Viewer path.
- No `rhwp.hwpViewer` custom editor is contributed.

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/scripts/verify-vsix.mjs
```

Add strict checks:

- README and docs mention default HWP/HWPX Viewer.
- VSIX includes the rhwp runtime needed for viewer SVG rendering and paragraph dump.
- VSIX contains no upstream rhwp-vscode extension duplicate provider.

## New

```path
/Users/jun/Developer/new/700_projects/code-office/src/test/hwpViewerModeTest.mjs
```

Static behavioral regression test:

- package commands exist
- no separate `rhwp.hwpViewer` custom editor exists
- `cweijan.hwpEditor` remains default
- schema accepts valid viewer mode payloads and rejects malformed ones by source inspection
- HWP React code contains save-then-switch pending mode logic
- HWP React code contains read-only SVG Viewer rendering path

Wire into:

```path
/Users/jun/Developer/new/700_projects/code-office/package.json
```

Add:

- `test:hwp-viewer-mode`
- include it in `test:office` or `test:ci`

## Modify Docs

```path
/Users/jun/Developer/new/700_projects/code-office/README.md
/Users/jun/Developer/new/700_projects/code-office/README-KO.md
/Users/jun/Developer/new/700_projects/code-office/README-CN.md
/Users/jun/Developer/new/700_projects/code-office/docs/FAQ.md
/Users/jun/Developer/new/700_projects/code-office/docs/FAQ.ko.md
/Users/jun/Developer/new/700_projects/code-office/docs/ARCHITECTURE.md
/Users/jun/Developer/new/700_projects/code-office/docs/TESTING.md
/Users/jun/Developer/new/700_projects/code-office/structure/03-hwp-subsystem.md
/Users/jun/Developer/new/700_projects/code-office/structure/04-viewer-architecture.md
/Users/jun/Developer/new/700_projects/code-office/structure/05-build-release.md
```

Document:

- default Viewer behavior
- Edit/View switching
- dirty save-then-switch policy
- last mode persistence
- SVG/debug/dump developer functions
- trust boundary and no separate rhwp provider
- VS Code Insiders smoke requirements
- current HWP dirty payload field is `isDirty`, not `dirty`

## Final Manual Verification

Build and package:

```bash
npm run release:local
```

Install latest generated VSIX into VS Code Insiders:

```bash
code-insiders --install-extension ./code-office-<version>.vsix --force
```

Computer Use smoke:

1. Open bundled or temp `.hwp` sample.
2. Verify default Viewer and screenshot.
3. Click Edit; verify Editor/rhwp toolbar and screenshot.
4. Make a small edit; click View; verify save-then-switch and screenshot.
5. Force or simulate save failure if practical; verify Editor remains and error appears.
6. Close/reopen or open another HWP/HWPX; verify lastMode persistence.
7. Run `code-office.hwp.exportSvg`; verify SVG files.
8. Run `code-office.hwp.debugOverlay`; verify HTML opens.
9. Run `code-office.hwp.dumpParagraph`; verify output channel content or precise unsupported message.
