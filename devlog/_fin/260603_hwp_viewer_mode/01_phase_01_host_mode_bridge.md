---
created: 2026-06-03
tags: [code-office, hwp, extension-host, commands]
---
# Phase 1 - Host Mode and Command Bridge

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/package.json
```

Add Command Palette contributions:

- `code-office.hwp.switchToViewer`
- `code-office.hwp.switchToEditor`
- `code-office.hwp.exportSvg`
- `code-office.hwp.debugOverlay`
- `code-office.hwp.dumpParagraph`

Add HWP/HWPX editor title/context entries where VS Code supports context placement for HWP resources. The primary in-webview toolbar remains the main user surface.

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/src/extension.ts
```

Register the new commands against the existing `HwpEditorProvider` instance:

- `switchActiveHwpMode('viewer')`
- `switchActiveHwpMode('editor')`
- `exportActiveHwpSvg(uri?)`
- `showActiveHwpDebugOverlay(uri?)`
- `dumpHwpParagraph(uri?)`

Do not register a separate `rhwp.hwpViewer` provider. Keep `vscode.window.registerCustomEditorProvider("cweijan.hwpEditor", hwpEditorProvider, viewOption)`.

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/src/provider/hwp/HwpCustomDocument.ts
```

Add document-local mode metadata:

- `mode: 'viewer' | 'editor'`
- optional pending command callback IDs only if required by provider implementation.

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/src/provider/hwp/HwpEditorProvider.ts
```

Add:

- `private readonly modeStorageKey = 'code-office.hwp.lastMode'`
- `getLastMode(): 'viewer' | 'editor'`
- `setLastMode(mode)`
- `switchActiveHwpMode(mode)`
- `handleModeChanged(document, mode)`
- `exportActiveHwpSvg(uri?)`
- `showActiveHwpDebugOverlay(uri?)`
- `dumpHwpParagraph(uri?)`

The provider should pass `hwpInitialMode` to `ReactApp.view`.

Mode persistence uses `context.globalState`, matching the existing Markdown provider persistence pattern. Mode persistence is only updated after the WebView confirms `HWP_EVENTS.modeChanged` (`'hwp:modeChanged'`). For dirty Editor -> Viewer, React must confirm only after save success.

In `resolveCustomEditor`, set `document.mode = getLastMode()` before calling `ReactApp.view`, then pass `hwpInitialMode: document.mode`. Host-side save guards depend on this initial mode being available before the WebView sends mode updates.

Clean Editor -> Viewer must not force an export. The provider/WebView mode-switch path should check the current dirty state and skip native save when the document is already clean. Existing `saveActiveDocument` currently flips dirty before `workbench.action.files.save`; this behavior must not be used for clean mode-only switches.

`saveActiveHwpDocument()` needs an explicit guard:

- if active document mode is Viewer and `document.isDirty === false`, return without calling `saveActiveDocument()`
- if active document mode is Viewer but dirty is true because a pending Editor save is in progress, call the native save lifecycle
- if active document mode is Editor, preserve existing Cmd/Ctrl+S behavior

`saveCustomDocument()` also needs the parallel clean Viewer guard because VS Code File > Save / Save All can invoke the custom editor save lifecycle directly:

- if document mode is Viewer and `document.isDirty === false`, return without `requestExport`
- dirty Viewer/pending Editor saves still go through the existing request export and validation path

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/src/common/reactApp.ts
```

Extend the WebView config contract with:

- `hwpInitialMode?: 'viewer' | 'editor'`

This prevents `ReactApp.view` calls from drifting outside TypeScript config types.

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/src/react/util/vscodeConfig.ts
```

Extend `OfficeWebviewConfigs` with:

- `hwpInitialMode?: 'viewer' | 'editor'`

Default behavior remains in the HWP controller: missing or invalid config resolves to `viewer`.

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/src/provider/handlers/hwpHandler.ts
```

Extend `HwpHandlerOptions` with callbacks:

- `onModeChange?: (mode) => void`
- `onViewerCommandResult?: (payload) => void`

Wire inbound mode and command result events after schema validation.

`HwpEditorProvider.resolveCustomEditor` must pass these callbacks into `handleHwp`:

- `onModeChange: (mode) => this.handleModeChanged(document, mode)`
- `onViewerCommandResult: (payload) => this.resolveViewerCommand(document, payload)`

## Host Failure Policy

- Command invocation with no active HWP/HWPX editor shows a VS Code error.
- Save failure in dirty switch is surfaced through existing `saveResult` and a VS Code notification.
- `lastMode` is never updated on failed dirty switch.
- Ctrl/Cmd+S in Viewer mode is allowed to call the command but should be a no-op for clean Viewer documents; if the document is dirty because an Editor session is pending save, it must route through the native save lifecycle.
