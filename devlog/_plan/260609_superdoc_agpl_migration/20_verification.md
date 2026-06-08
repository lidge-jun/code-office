# 20 Verification - SuperDoc AGPL DOCX Migration

Date: 2026-06-09
Project: code-office
Scope: DOCX WebView engine replacement, AGPL license migration, release packaging, installed VS Code Insiders visual smoke.

## Verification Summary

| Gate | Result | Evidence |
| --- | --- | --- |
| DOCX provider unit/surface test | PASS | `npm run test:docx-editor-provider` |
| TypeScript | PASS | `npm run typecheck` |
| Full project tests | PASS | `npm run test:ci` |
| Production build | PASS | `npm run build` |
| Local VSIX release | PASS | `npm run release:local` |
| VSIX install | PASS | `code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix --force` |
| Computer Use viewer smoke | BLOCKED after latest fix | Computer Use returned `cgWindowNotFound` after VS Code reload; current macOS screenshot showed no VS Code window in the active Space |
| Computer Use edit/save smoke | BLOCKED after latest fix | Must be rerun after the existing VS Code Insiders window is visible to Computer Use |
| Computer Use dirty/Cmd+S lifecycle | BLOCKED after latest fix | Must be rerun after the existing VS Code Insiders window is visible to Computer Use |

## CLI Evidence

Fresh gates were run after the SuperDoc replacement, AGPL migration, pinned runtime, viewer shortcut fix, and nonfatal exception handling fix:

```text
npm run test:docx-editor-provider
npm run typecheck
npm run test:ci
npm run build
npm run release:local
```

Release artifact:

```text
/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix
```

The local release verifier passed and confirmed package contents include AGPL licensing artifacts and exclude local QA fixture files.

Additional fresh gates were run after the 2026-06-09 save-loop and stale-instance fixes:

```text
npm run test:docx-editor-provider
npm run typecheck
npm run release:local
code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix --force
```

The second `npm run release:local` completed successfully. The packaged artifact remained:

```text
/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix
```

## Computer Use Evidence

Installed VSIX:

```text
code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix --force
```

Runtime target:

```text
/Applications/Visual Studio Code - Insiders.app
bundleID: com.microsoft.VSCodeInsiders
```

Smoke fixture:

```text
/tmp/code-office-superdoc-qa.docx
```

Saved screenshots:

```text
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260609_superdoc_agpl_migration/artifacts/superdoc-edit-save-smoke.png
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260609_superdoc_agpl_migration/artifacts/superdoc-viewer-warning-smoke.png
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260609_superdoc_agpl_migration/artifacts/docx-dirty-before-cmds.png
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260609_superdoc_agpl_migration/artifacts/docx-dirty-before-cmds-fixed.png
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260609_superdoc_agpl_migration/artifacts/docx-dirty-after-cmds-fixed.png
```

Observed runtime state:

- Viewer mode displays the DOCX document in the installed extension.
- Edit mode displays SuperDoc toolbar controls, including font family `Malgun Gothic`.
- Korean text and a table are visible in both modes.
- Clicking Save in edit mode no longer replaces the surface with a fatal red error screen.
- A SuperDoc lifecycle warning can still appear: `Cannot read properties of undefined (reading 'elements')`.

## Dirty / Cmd+S Regression Evidence

Root cause fixed on 2026-06-09:

- `DocxEditorProvider.saveActiveDocument()` previously wrote exported bytes directly with `workspace.fs.writeFile()`. That bypassed the VS Code `CustomEditorProvider.saveCustomDocument()` lifecycle used by the tab dirty indicator.
- `Word.tsx` previously treated broad editor updates and global DOM input events as dirty signals. That could mark cursor movement dirty, while a later transaction-only patch missed real text edits in the installed SuperDoc runtime.

Implementation evidence:

```text
/Users/jun/Developer/new/700_projects/code-office/src/provider/docx/DocxEditorProvider.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.tsx
/Users/jun/Developer/new/700_projects/code-office/src/test/docxEditorProviderTest.mjs
```

The final behavior routes active toolbar/WebView saves through VS Code native save (`workbench.action.files.save`) and uses two bounded dirty signals:

- SuperDoc transaction `docChanged` for structural/format edits.
- SuperDoc editor text snapshot comparison for real text edits.

Installed VSIX evidence from the already-open VS Code Insiders window:

```text
VSIX: /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix
Fixture: /tmp/code-office-superdoc-qa.docx
App: /Applications/Visual Studio Code - Insiders.app
Bundle: com.microsoft.VSCodeInsiders
```

Observed state sequence:

| Step | Expected | Observed |
| --- | --- | --- |
| Open DOCX in View mode | Clean tab | Explorer stayed `6 unsaved files`; tab close icon stayed `X` |
| Switch to Edit | Clean tab | Explorer stayed `6 unsaved files`; tab close icon stayed `X` |
| Move cursor inside document | Clean tab | Explorer stayed `6 unsaved files`; tab close icon stayed `X` |
| Type ` DIRTY_OK` | Dirty tab | Explorer changed to `7 unsaved files`; selected tab close icon changed to dirty dot |
| Press `Cmd+S` | Clean tab | Explorer returned to `6 unsaved files`; selected tab close icon returned to `X` |

The un-suffixed `docx-dirty-before-cmds.png` is retained as a pre-final diagnostic capture from the failed dirty/Cmd+S investigation. The `*-fixed.png` captures are the final passing evidence.

Fresh verification commands after the dirty/Cmd+S fix:

```text
npm run test:docx-editor-provider
npm run typecheck
npm run release:local
code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix --force
```

`npm run release:local` included `typecheck`, `test:ci`, production build, native HWP helper build, HWP verifier, VSIX package, and VSIX artifact verifier.

## Current Limitation

The latest implementation treats the observed SuperDoc lifecycle exception as nonfatal and preserves the document surface. This is acceptable for the present migration gate because it prevents the previous fatal UI failure, but it remains a follow-up quality issue for DOCX fidelity and SuperDoc integration hardening.

The warning is explicitly recorded rather than hidden because it may indicate an upstream SuperDoc edge case around minimal/generated DOCX structures. It should be retested against broader real-world local-only QA fixtures before marketplace publication decisions beyond this migration branch.

## 2026-06-09 Save Loop / Stale Instance Follow-up

User-reported regression:

- The DOCX tab appeared to load repeatedly / flicker after reload.
- Toolbar Save and `Cmd+S` had previously produced stale or polluted DOCX output.
- The prior XML fallback had preserved new visible text, but also captured SuperDoc toolbar/status labels such as `Undo unset`, `Bold selected`, and `Accept tracked changes unset` when the broad accessibility surface was used as a text snapshot.

Implementation evidence:

```text
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.tsx
/Users/jun/Developer/new/700_projects/code-office/src/provider/docx/DocxEditorProvider.ts
/Users/jun/Developer/new/700_projects/code-office/src/provider/handlers/docxHandler.ts
/Users/jun/Developer/new/700_projects/code-office/src/test/docxEditorProviderTest.mjs
```

Fix details:

- `Word.tsx` now tracks a `documentVersion` and keys `SuperDocEditor` with `${documentName}:${documentVersion}`. This forces a fresh SuperDoc document instance when new DOCX bytes arrive for the same filename, without remounting only because the user toggles View/Edit.
- `switchToViewer()` now routes exported bytes through `updateDocumentBuffer()` so `documentBuffer`, `latestSaveBufferRef`, and the remount version stay synchronized.
- The save validation path rejects stale successful SuperDoc exports by comparing exported DOCX XML against current visible editor text before telling VS Code save succeeded.
- The XML fallback sanitizes editor snapshots and rejects toolbar/status lines before patching `word/document.xml`.
- Active toolbar save writes through the provider's bridge directly, instead of relying on `workbench.action.files.save` routing back to the active custom editor.

Fresh verification:

```text
npm run test:docx-editor-provider
docx editor provider checks passed

npm run typecheck
PASS

npm run release:local
PASS
```

Installed VSIX:

```text
code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix --force
Extension 'code-office-3.7.47.vsix' was successfully installed.
```

Computer Use blocker after the fresh install:

```text
mcp__computer_use__.get_app_state(app="Visual Studio Code - Insiders")
Computer Use server error -10005: cgWindowNotFound

mcp__computer_use__.get_app_state(app="/Applications/Visual Studio Code - Insiders.app")
Computer Use server error -10005: cgWindowNotFound
```

Additional diagnostic:

```text
screencapture -x /tmp/code-office-docx-current.png
```

The screenshot showed only the macOS desktop wallpaper in the active Space, so the latest Computer Use runtime smoke is not yet complete. This goal must remain open until the already-running VS Code Insiders window is visible to Computer Use and the DOCX View/Edit/Save/Cmd+S smoke is rerun.

## 2026-06-09 Smooth Integration Follow-up

User-reported regression:

- `SuperDoc exception: Cannot read properties of undefined (reading 'elements')` continued to appear in the DOCX surface.
- View/Edit felt less integrated than the HWP/HWPX `rhwp` surface because mode switches could still rebuild or destabilize the embedded editor.

Research evidence:

- `@superdoc-dev/react` README states that changing `documentMode` is handled efficiently without rebuilding the SuperDoc instance.
- The same README states that changing `role` and `hideToolbar` destroys and recreates the SuperDoc instance.
- SuperDoc docs state that top-level `trackChanges` is deprecated and should be replaced by `modules.trackChanges`.

Implementation evidence:

```text
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.tsx
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.css
/Users/jun/Developer/new/700_projects/code-office/src/test/docxEditorProviderTest.mjs
```

Fix details:

- `documentMode` remains the only mode-switching prop. This matches the SuperDoc React wrapper's efficient path and avoids avoidable editor teardown.
- `role` is kept stable as `editor`; viewing is controlled by `documentMode="viewing"`.
- `hideToolbar` is kept stable as `false`; View mode hides `.superdoc-toolbar-container` through CSS instead of changing the SuperDoc prop.
- Deprecated top-level `trackChanges` prop was removed.
- Stable `modules.trackChanges` config disables tracked-change UI: `{ enabled: false, visible: false, mode: "off" }`.
- Stable `modules.comments` config keeps comments read-only/off-path for the present DOCX integration.
- Repeated nonfatal upstream `Cannot read properties of undefined (reading 'elements')` exceptions are no longer surfaced as a user-facing warning banner. Fatal document-init/password failures still render as hard errors, and other actionable nonfatal exceptions still show warnings.

Fresh verification:

```text
npm run test:docx-editor-provider
docx editor provider checks passed

npm run typecheck
PASS
```

Runtime verification remains pending for the same Computer Use precondition recorded above: VS Code Insiders is running but not visible/controllable in the active Space.

Additional Computer Use blocker after installing this patch:

```text
mcp__computer_use__.get_app_state(app="Visual Studio Code - Insiders")
Accessibility error: AXError.cannotComplete

screencapture -x /tmp/code-office-docx-current-after-smooth.png
```

The screenshot showed the macOS Lock Screen, not the VS Code Insiders window. That explains the `AXError.cannotComplete` result. Final DOCX View/Edit/Save/Cmd+S verification still requires an unlocked desktop with the already-running VS Code Insiders window visible.

## 2026-06-09 Repeated TypeError Reduction

User-reported regression:

- `TypeError` / `Cannot read properties of undefined (reading 'elements')` appeared too many times.
- Hiding the warning banner was not enough; the integration needed to stop repeatedly triggering the noisy SuperDoc export paths.

Root cause:

- The save path attempted multiple native SuperDoc export strategies per save:
  - body editor `getUpdatedDocs`
  - body editor `exportXmlOnly`
  - body editor full export
  - active editor export fallback
  - package-level `instance.export`
- For documents that trigger the upstream `elements` exception, that meant one save could produce several internal SuperDoc TypeErrors before falling back to code-office XML repair.

Fix details:

- Added `nativeExportBrokenRef` as a circuit breaker.
- The first known `elements` exception marks native DOCX export as broken for the current editor session.
- Subsequent saves skip noisy native export strategies and go straight to the existing visible-text XML fallback.
- The active editor fallback is skipped when it is the same object as `bodyEditorRef.current`, preventing duplicate export calls against the same SuperDoc editor.
- Non-`elements` export failures can still fall through to later strategies, preserving compatibility for other SuperDoc export shapes.

Fresh verification:

```text
npm run test:docx-editor-provider
docx editor provider checks passed

npm run typecheck
PASS
```

Release/package verification after the patch:

```text
npm run release:local
PASS
Packaged: /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix
```

Local VSIX install after the patch:

```text
code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix --force
Extension 'code-office-3.7.47.vsix' was successfully installed.
```

Computer Use status:

```text
mcp__computer_use__.get_app_state(app="Visual Studio Code - Insiders")
timed out awaiting tools/call after 120s

mcp__computer_use__.list_apps()
Code - Insiders is running

mcp__computer_use__.get_app_state(app="com.microsoft.VSCodeInsiders")
timed out awaiting tools/call after 120s

osascript System Events process read
execution error: osascript is not allowed assistive access. (-25211)

screencapture -x -o /tmp/code-office-docx-post-typeerror-screen.png
Created /tmp/code-office-docx-post-typeerror-screen.png, but the captured image is fully black.
```

Interpretation:

- The latest VSIX is installed and automated release/package checks pass.
- VS Code Insiders is running, but Computer Use cannot currently obtain its accessibility snapshot.
- The non-interactive screenshot fallback is also not usable in the current desktop state because it returns a black frame.
- Final visual DOCX View/Edit/Save/Cmd+S verification is still pending until the existing VS Code Insiders window is accessible to Computer Use.

## License Evidence

The project package metadata and root license now align with SuperDoc's AGPL path:

```text
/Users/jun/Developer/new/700_projects/code-office/package.json
/Users/jun/Developer/new/700_projects/code-office/LICENSE
/Users/jun/Developer/new/700_projects/code-office/NOTICE.md
```

Declared package license:

```text
AGPL-3.0-or-later
```

Bundled SuperDoc runtime pin:

```text
@superdoc-dev/react: ^1.10.0
superdoc: 1.39.0
```

The `superdoc` runtime is pinned because `@superdoc-dev/react@1.10.0` accepts a wide peer range, and a clean install can otherwise resolve a newer `superdoc@2.x` runtime with worse current audit exposure.

## Verdict

The SuperDoc AGPL migration is implemented and packaged, and the installed VS Code Insiders smoke no longer hits the fatal DOCX error screen after Save. The remaining known issue is a nonfatal SuperDoc warning banner, which is documented as follow-up fidelity/integration debt rather than a blocker for the current replacement gate.
