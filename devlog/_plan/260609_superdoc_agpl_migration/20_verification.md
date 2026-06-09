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

## 2026-06-09 DOCX Page Centering Patch

User-provided screenshots:

- /Users/jun/.cli-jaw-3462/uploads/1780970396999_fd70cb04_Screenshot2026-06-09at105916AM.png
- /Users/jun/.cli-jaw-3462/uploads/1780970397001_99beed9d_Screenshot2026-06-09at105936AM.png

Observed issue:

- The DOCX surface opened in SuperDoc viewer mode.
- The rendered document/page was visually biased to the left side of the VS Code editor.
- A large gray canvas remained on the right side, so the page did not feel centered in the available editor width.

Root cause hypothesis:

- `Word.css` styled the outer code-office wrapper and imported SuperDoc styles, but did not own the alignment of SuperDoc's `.superdoc-editor-container`, `.superdoc-layout`, and `.superdoc-page` boxes.
- SuperDoc's internal page margin defaults were not enough once embedded inside the VS Code custom editor with side bar and panel visible.

Fix details:

- Make `.superdoc-editor-container` a full-size scrollable flex container.
- Center its child layout horizontally with `justify-content: center`.
- Keep the layout max-content sized so the document page does not stretch to the gray canvas width.
- Force individual `.superdoc-page` instances to use `margin-inline: auto` to counter inline/page-level margin drift.

Fresh verification:

```text
npm run test:docx-editor-provider
docx editor provider checks passed

npm run typecheck
PASS
```

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

## 2026-06-09 WebView Reload Restore Hardening

Observed remaining risk after the final page-centering pass:

- `Developer: Reload Window` could temporarily leave the DOCX custom editor WebView blank until the same DOCX was reopened in the existing VS Code Insiders window.
- This was not a normal hidden-tab issue because `retainContextWhenHidden` is already enabled for custom editors.

Root cause hypothesis:

- The DOCX WebView used a one-shot `init` request from `Word.tsx` to `docxHandler.ts`.
- If the VS Code custom editor restore/reload timing drops that first request or the React route mounts before the extension-side listener is fully ready, no second request asks the extension host to send DOCX bytes.
- `DocxCustomDocument.initialBuffer` existed but was not passed into the DOCX handler, unlike the safer HWP pattern.

Implementation evidence:

```text
/Users/jun/Developer/new/700_projects/code-office/src/provider/docx/DocxEditorProvider.ts
/Users/jun/Developer/new/700_projects/code-office/src/provider/handlers/docxHandler.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.tsx
```

Fix details:

- `DocxEditorProvider` now passes `document.initialBuffer` into `handleDocx()`.
- `handleDocx()` now prefers the provider-owned initial buffer when available, and falls back to `workspace.fs.readFile()` for normal disk opens.
- `Word.tsx` now records when document bytes have actually arrived and retries the `init` request up to eight times at 750ms intervals until the document is loaded.
- The retry is bounded and stops immediately after `openBuffer` / `open` produces document bytes, so it does not create a permanent polling loop.

Fresh verification:

```text
npm run test:docx-editor-provider
docx editor provider checks passed

npm run typecheck
PASS

npm run package:verify
PASS

code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix --force
Extension 'code-office-3.7.47.vsix' was successfully installed.
```

Computer Use verification after installing the rebuilt VSIX into the already-open VS Code Insiders window:

```text
mcp__computer_use__.get_app_state(app="com.microsoft.VSCodeInsiders")
PASS: existing VS Code Insiders window was visible and controllable.
PASS: DOCX tab showed SuperDoc viewer mode and visible document text before reload.

Developer: Reload Window
PASS: same DOCX custom editor briefly blanked during VS Code reload.
PASS: without reopening the file, the same tab restored to DOCX SuperDoc viewer mode.
PASS: visible Korean DOCX body text returned inside the WebView.
PASS: DevTools stayed open for inspection.
NOTE: DevTools still shows unrelated VS Code Git/submodule errors and font fallback warnings.
```

Visual evidence:

```text
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260609_superdoc_agpl_migration/artifacts/docx-reload-restore-after-init-retry.png
```

Independent employee audit:

```text
Frontend employee: PASS
Backend employee: PASS
```

Audited behavior:

- The one-shot `init` loss risk is covered by bounded WebView retry.
- `openBuffer` and `open` both mark the document loaded, so the retry loop stops after either delivery path succeeds.
- Provider-side backup/untitled bytes are now connected to the DOCX handler through `initialBuffer`.
- HWP message validation does not intercept DOCX `init`; HWP events are namespaced as `hwp:*`.

Non-blocking residual risk:

- If a local DOCX read/postMessage round trip takes longer than 750ms, multiple bounded `init` requests may be in flight and SuperDoc may remount more than once during initial restore. Both employees judged this as non-blocking for the current gate because the loop is bounded, stops after bytes arrive, and the installed VSIX reload verification restored the document without reopening.

## 2026-06-09 Layout Collapse / Slow Render Follow-up

User-provided screenshot:

- /Users/jun/.cli-jaw-3462/uploads/1780974272700_e30aa744_Screenshot2026-06-09at120343PM.png

Observed issue:

- The DOCX page could render as a very thin vertical white strip or appear left-biased inside the VS Code custom editor.
- DevTools remained open during verification.
- The visible DevTools errors were dominated by VS Code Git submodule pathspec failures for the opened DOCX path, not by a new fatal SuperDoc exception.
- DevTools also reported font-loading warnings such as slow network fallback font messages.

Employee audit:

- A Frontend employee performed a read-only audit of `Word.css`, `Word.tsx`, and the local SuperDoc dist.
- The employee identified `.docx-superdoc .superdoc-layout { width: 100%; }` as a likely cause of SuperDoc page layout collapse because SuperDoc owns `.superdoc-layout` / `.superdoc-page` sizing.
- The employee also identified SuperDoc virtual spacer behavior as a reason a bad container width can visually collapse into a thin strip.

Fix details:

- Removed the app-level `.superdoc-layout { width: 100%; }` override.
- Kept only the outer SuperDoc wrapper/mount container at full size.
- Added viewport-only centering via `.presentation-editor__viewport { margin-inline: auto; }` so the app does not override SuperDoc's calculated page width.
- Added a 12s DOCX render watchdog so a stuck SuperDoc render does not leave users in an indefinite "Rendering document..." state.
- Kept SuperDoc shell zoom and editor zoom units separate: editor `setZoom()` receives multiplier scale, shell `setZoom()` receives percentage.

Fresh verification:

```text
npm run test:docx-editor-provider
docx editor provider checks passed

npm run typecheck
PASS

npm run package:verify
PASS
Packaged: /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix
```

Installed VSIX:

```text
code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix --force
Extension 'code-office-3.7.47.vsix' was successfully installed.
```

Computer Use verification:

```text
mcp__computer_use__.get_app_state(app="com.microsoft.VSCodeInsiders")
PASS: existing VS Code Insiders window used, not a new Dev Host/window.
PASS: DevTools remained open on the right.
PASS: _official_template_source.docx rendered visibly after reload.
PASS: thin vertical strip collapse no longer reproduced after the layout override removal.
PASS: page position is visually centered in the available editor area after viewport-only centering.
NOTE: DevTools still shows VS Code Git submodule pathspec errors unrelated to SuperDoc rendering.
NOTE: DevTools still shows font loading slow-network fallback warnings; this remains performance debt, not a fatal render blocker.
```

## 2026-06-09 GPT Pro / Employee Rail Centering Follow-up

User-provided screenshot:

- /Users/jun/.cli-jaw-3462/uploads/1780977001955_9be96594_Screenshot2026-06-09at124914PM.png

Observed issue:

- The rendered DOCX page was still visually perceived as left aligned.
- The prior patch centered a SuperDoc viewport layer, but did not fully own the outer scroll rail.
- In multi-page/long-document cases this can make the SuperDoc scroll host appear narrower than the VS Code WebView, which makes the page center look wrong.

Research / reviewer evidence:

- `agbrowse --help` was run to confirm the available `web-ai query` path.
- GPT Pro was queried through `agbrowse web-ai query --vendor chatgpt --model pro --effort standard`.
- A Frontend employee reviewed `Word.css`, `Word.tsx`, and local `node_modules/superdoc/dist/style.css`.
- Both reviewers reached the same root cause:
  - The outer wrapper has both classes on the same element, so `.docx-superdoc .superdoc-wrapper` is the wrong selector. The correct selector is `.docx-superdoc.superdoc-wrapper`.
  - SuperDoc owns page width through internal inline `minWidth` / zoom math. code-office must not force `.superdoc-layout` or page width to `100%`.
  - code-office should make the WebView rail and scroll host full-width, then center SuperDoc's calculated page rail at `.presentation-editor__viewport`.

Implementation evidence:

```text
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.css
/Users/jun/Developer/new/700_projects/code-office/src/test/docxEditorProviderTest.mjs
```

Fix details:

- The code-office wrapper/mount selectors now use `.docx-superdoc.superdoc-wrapper` and full-size `.superdoc-editor-container`.
- `.superdoc__layers`, `.superdoc__document`, and `.superdoc__sub-document` are kept full-width to prevent the document rail from shrink-wrapping left.
- The actual SuperDoc scroll host (`.super-editor-container.contained` or direct `.presentation-editor`) is full-width/full-height with `overflow: auto`, `scrollbar-gutter: stable both-edges`, and `touch-action: pan-x pan-y pinch-zoom`.
- `.presentation-editor` spans the available gray canvas with a fixed side gutter, but the patch does not force SuperDoc page width.
- `.presentation-editor__viewport` uses `inline-size: max-content` plus `margin-inline: auto`, preserving SuperDoc's intrinsic page sizing while centering the page rail.
- `.superdoc-layout` is allowed only `margin-inline: auto`; width/max-width/zoom overrides remain forbidden by the test.

Fresh verification:

```text
npm run test:docx-editor-provider
docx editor provider checks passed

npm run typecheck
PASS

npm run package:verify
PASS
Packaged: /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix
```

Installed VSIX:

```text
code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix --force
Extension 'code-office-3.7.47.vsix' was successfully installed.
```

Computer Use verification:

```text
mcp__computer_use__.get_app_state(app="com.microsoft.VSCodeInsiders")
PASS: existing VS Code Insiders window used; no new Dev Host/window.
PASS: DevTools remained open on the right.
PASS: after Developer: Reload Window and same-window file reopen, the DOCX rendered again.
PASS: document page is visually centered in the available editor region between the Explorer/sidebar and DevTools.
PASS: no thin-strip layout collapse reproduced after the full rail/viewport centering patch.
NOTE: the transient blank WebView after reload recovered after same-window file reopen; this is recorded separately from the centering CSS fix.
NOTE: DevTools still shows VS Code Git submodule pathspec errors and a GitHub Copilot registry 404 unrelated to DOCX rendering.
NOTE: DevTools still shows font loading slow-network fallback warnings; this remains performance debt.
```

Final visual evidence:

```text
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260609_superdoc_agpl_migration/artifacts/docx-centered-after-gpt-pro-rail-fix.png
```

Supplementary local visual artifacts retained from the same DOCX SuperDoc verification goal:

```text
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260609_superdoc_agpl_migration/artifacts/docx-backup-safe-after-cmds-clean.png
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260609_superdoc_agpl_migration/artifacts/docx-centered-after-rail-fix.png
```

## 2026-06-09 DOCX Save/View and Markdown Resource Follow-up

User-provided DevTools/runtime logs:

- SuperDoc DOCX save emitted repeated `TypeError: Cannot read properties of undefined (reading 'comments')` from `exportDocx`.
- Markdown WebView requested missing Vditor highlight files:
  - `resource/vditor/dist/js/highlight.js/styles/dracula.css`
  - `resource/vditor/dist/js/highlight.js/highlight.pack.js`
- VS Code's built-in Git extension reported `fatal: Pathspec ... is in submodule 'devlog'`. This is unrelated to the code-office DOCX/Markdown WebView runtime.

Implementation evidence:

```text
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.tsx
/Users/jun/Developer/new/700_projects/code-office/src/provider/handlers/docxHandler.ts
/Users/jun/Developer/new/700_projects/code-office/src/test/docxEditorProviderTest.mjs
/Users/jun/Developer/new/700_projects/code-office/resource/vditor/dist/js/highlight.js/highlight.pack.js
/Users/jun/Developer/new/700_projects/code-office/resource/vditor/dist/js/highlight.js/styles/dracula.css
```

Fix details:

- `docxHostSaveCompleted` was added to the DOCX WebView/extension-host contract.
- `Edit -> View` now waits for the real VS Code custom-editor save lifecycle to finish before entering View mode.
- Dirty state is explicitly cleared after a successful dirty Edit -> View transition, so View mode should not show the black dirty dot.
- WebView-side save failures now release pending host-save waiters instead of leaving the transition/Cmd+S path hanging.
- SuperDoc `comments` shape exceptions are treated like the previously observed `elements` shape exceptions: nonfatal upstream export-shape noise that should route to the deterministic DOCX XML fallback instead of retrying the same broken native export path.
- Missing legacy Vditor highlight resources were added so the installed Markdown WebView no longer 404s those paths.

Fresh verification:

```text
npm run test:docx-editor-provider
docx editor provider checks passed

npm run typecheck
PASS

npm run test:markdown
PASS

npm run package:verify
PASS
Packaged: /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix

unzip -l code-office-3.7.47.vsix | rg 'resource/vditor/dist/js/highlight.js/(highlight.pack.js|styles/dracula.css)'
PASS: both highlight resources are included in the VSIX
```

Runtime verification still required:

```text
Install /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix into the already-open VS Code Insiders window.
Use Computer Use with DevTools visible.
Verify DOCX Edit -> Cmd+S clears dirty.
Verify DOCX Edit -> View auto-saves first and View mode has no dirty dot.
Verify the repeated SuperDoc comments export exception no longer appears during the save path.
Verify Markdown open no longer logs Vditor highlight.js 404s.
```

## 2026-06-09 DOCX Save Lifecycle Correction

Additional root cause found after the first follow-up:

- The WebView `docxHostSaveRequest` path could call `DocxEditorProvider.saveActiveDocument()` directly through `onNativeSave`.
- That direct write persisted bytes, but it could bypass VS Code's `CustomEditorProvider.saveCustomDocument()` lifecycle.
- Result: Cmd+S / Edit -> View could appear saved while VS Code still considered the custom editor dirty, leaving the black dirty dot visible in View mode.

Implementation evidence:

```text
/Users/jun/Developer/new/700_projects/code-office/src/provider/docx/DocxEditorProvider.ts
/Users/jun/Developer/new/700_projects/code-office/src/provider/handlers/docxHandler.ts
/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.tsx
/Users/jun/Developer/new/700_projects/code-office/src/test/docxEditorProviderTest.mjs
```

Fix details:

- `DocxEditorProvider` no longer passes `onNativeSave` into `handleDocx()` for the WebView save path.
- `docxHostSaveRequest` now falls through to `workbench.action.files.save`, so VS Code invokes the real custom editor save lifecycle and can clear the native dirty state.
- `docxHostSaveCompleted` reports success/failure back to the WebView, and Edit -> View waits for that completion before switching modes.
- Clean save requests now reuse the last known DOCX bytes instead of invoking the broken SuperDoc export path.
- Dirty save requests first use deterministic DOCX XML repair from visible text snapshots; the SuperDoc native export path is retained only as a fallback when no source buffer is available.
- SuperDoc `comments` export-shape exceptions are handled with the same nonfatal routing as the known `elements` exception.

Fresh command evidence:

```text
npm run test:docx-editor-provider
docx editor provider checks passed

npm run typecheck
PASS

npm run test:markdown
PASS

npm run package:verify
PASS
Packaged: /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix

code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix --force
Extension 'code-office-3.7.47.vsix' was successfully installed.
```

Computer Use status:

```text
PASS: Computer Use targeted the already-open VS Code Insiders window.
PASS: DevTools remained available in that window during the attempted runtime follow-up.
BLOCKED: The existing VS Code Insiders window is currently focused inside a Claude Code WebView and an unrelated .gitmodules diff from /Users/jun/Developer/new/700_projects/cli-jaw is open.
BLOCKED: Command Palette keystrokes are being consumed by that WebView, so extension-host reload / same-window DOCX runtime verification cannot be completed without resolving the unrelated dirty/diff state.
BLOCKED: osascript keyboard fallback was not usable because macOS Automation denied System Events keystrokes.
```

Remaining same-window runtime checks after the unrelated VS Code focus/diff state is resolved:

```text
Reload or restart the extension host in the same VS Code Insiders window.
Open a DOCX in code-office.
Verify Cmd+S clears the dirty dot.
Verify Edit -> View auto-saves before switching.
Verify View mode never shows the dirty black dot.
Verify the SuperDoc comments export exception no longer repeats on save.
Open Markdown and verify the Vditor highlight.js 404s are gone.
```
