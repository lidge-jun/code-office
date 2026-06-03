---
created: 2026-06-03
tags: [code-office, hwp, react, webview, rhwp-bridge]
---
# Phase 2 - WebView Viewer Runtime

## New

```path
/Users/jun/Developer/new/700_projects/code-office/src/react/view/hwp/hwpTypes.ts
```

Define shared local React-side types:

- `HwpMode = 'viewer' | 'editor'`
- `HwpViewerCommand = 'exportSvg' | 'debugOverlay'`
- `HwpRenderedPage`
- narrow helpers for command payloads.

## New

```path
/Users/jun/Developer/new/700_projects/code-office/src/react/view/hwp/HwpViewer.tsx
```

Render read-only SVG pages returned by the rhwp bridge:

- receive `pages`
- show page count and loading status
- keep pages visually inspectable with VS Code theme variables
- expose a compact overflow/dev menu for `Export SVG` and `Debug Overlay`
- primary control is `Edit`

## New

```path
/Users/jun/Developer/new/700_projects/code-office/src/react/view/hwp/HwpEditorSurface.tsx
```

Extract the existing editor toolbar/editor rendering from `Hwp.tsx`:

- filename
- dirty badge
- loading/saving status
- Save HWP/HWPX button
- View button
- rhwp runtime mount element

This keeps `Hwp.tsx` below the 500-line limit.

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/src/react/view/hwp/Hwp.tsx
```

Convert `Hwp.tsx` into a controller:

- initialize mode from `configs.hwpInitialMode`
- load file into a single `SecureRhwpEditor`
- render SVG pages after load and after successful save
- switch between Viewer and Editor without registering a new custom editor
- on dirty Editor -> Viewer:
  - set pending target `viewer`
  - show saving status
  - emit `HWP_EVENTS.nativeSave`
- on `saveResult.success`: mark clean, re-render SVG pages, set mode viewer, emit `modeChanged`
- the emitted event must be `HWP_EVENTS.modeChanged` (`'hwp:modeChanged'`), not a bare `modeChanged` string
  - on failure: stay editor, show error, do not emit `modeChanged`

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/src/react/view/hwp/Hwp.less
```

Add:

- `.hwp-viewer`
- `.hwp-viewer-pages`
- `.hwp-viewer-page`
- `.hwp-runtime-host`
- hidden runtime host style that keeps rhwp initialized without exposing editing controls while Viewer mode is active.

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/src/react/view/hwp/rhwpBridge/types.ts
```

Extend `SecureRhwpEditor`:

- `pageCount(): Promise<number>`
- `getPageSvg(page: number): Promise<string>`
- `exportPageSvgs(debugOverlay?: boolean): Promise<string[]>`
- `setDebugOverlay(enabled: boolean): Promise<unknown>` only if the bundled/runtime bridge can expose it safely.

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/src/react/view/hwp/rhwpBridge/createSecureRhwpEditor.ts
```

Expose local and remote calls for:

- `pageCount`
- `getPageSvg`
- `setDebugOverlay`, implemented through build-time bridge injection when the current runtime does not expose it directly.

Required local path changes:

- extend `RawRhwpBridge`
- extend returned local editor object
- extend returned remote editor object
- extend `callLocalBridge` switch for `pageCount`, `getPageSvg`, and any debug overlay method

Keep additions small. Because this file is already near the 500-line hard limit, extract SVG export helpers to:

```path
/Users/jun/Developer/new/700_projects/code-office/src/react/view/hwp/rhwpBridge/exportSvgPages.ts
```

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/build.ts
```

If `setDebugOverlay` is not already present in the patched `window.__rhwpBridge`, extend the rhwp-studio patch injection so the bridge exposes a debug overlay toggle backed by the runtime's `set_debug_overlay`/document API. Add a build-time assertion so packaging fails when the debug bridge cannot be injected.

Remote `studioUrl` mode policy:

- Prefer patching the rhwp-studio postMessage RPC switch for `pageCount`, `getPageSvg`, and `setDebugOverlay` when the remote runtime is the same patched code-office bundle.
- If a third-party remote studio does not support those methods, Viewer SVG/dev commands must fail loudly with a precise unsupported message.
- The bundled local mode remains the production default and must support Viewer SVG rendering.

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/src/common/hwpMessageSchema.ts
```

Add validated message events:

- `HWP_EVENTS.modeChanged = 'hwp:modeChanged'`
- `HWP_EVENTS.modeChangeRequest = 'hwp:modeChangeRequest'`
- `HWP_EVENTS.viewerCommand = 'hwp:viewerCommand'`
- `HWP_EVENTS.viewerCommandResult = 'hwp:viewerCommandResult'`

Payloads must reject unknown commands and malformed SVG arrays.

## Modify

```path
/Users/jun/Developer/new/700_projects/code-office/src/common/handler.ts
```

Add the new inbound HWP events to the allowlist only after schema guards exist.

Only WebView -> Host events belong in the inbound allowlist:

- `HWP_EVENTS.modeChanged` (`'hwp:modeChanged'`)
- `HWP_EVENTS.viewerCommandResult` (`'hwp:viewerCommandResult'`)

Host -> WebView requests such as `modeChangeRequest` and `viewerCommand` must be emitted by the host and validated on the React side, not accepted as inbound host commands from arbitrary WebView payloads.

All verifier string checks must use the `hwp:` wire prefix or the `HWP_EVENTS.*` constant names. Bare strings such as `modeChanged` must not be added to `handler.ts`.
