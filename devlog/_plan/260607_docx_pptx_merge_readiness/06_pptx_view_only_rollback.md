# PPTX View-only Rollback

## Decision

Remove the partial PPTX edit feature and keep PPTX as a view-only custom viewer.

Reason:

```text
GUI QA showed that the text side panel was not good enough to present as an
editor. A partial editor with fragile Delete/Backspace behavior is more harmful
than a clear viewer.
```

This rollback keeps the high-fidelity viewing path and removes the misleading
edit promise.

## Scope

Keep:

```text
.pptx/.pptm/.ppsx default custom editor route
@aiden0z/pptx-renderer high-fidelity preview
slide navigation
zoom controls
view-only runtime smoke path
```

Remove:

```text
pptx-svg dependency
WASM edit runtime
View/Edit mode switch
Slide text side panel
Apply QA note smoke action
pptxDirtyChanged event
pptxSaveRequest / pptxSaveResponse save bridge
code-office.pptx.save command
Cmd+S custom PPTX keybinding
```

## Implementation Evidence

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.tsx
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/pptx/Pptx.less
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/provider/handlers/pptxHandler.ts
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/provider/pptx/PptxEditorProvider.ts
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/provider/pptx/PptxCustomDocument.ts
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/extension.ts
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/package.json
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/test/pptxPhase4Test.mjs
```

## Verification Plan

Automated:

```text
npx tsc --noEmit
npm run build
npm run test:pptx-phase4
npm run test:ci
npm run package
```

Runtime:

```text
Install /Users/jun/Developer/new/700_projects/code-office--dev_pptx/code-office-3.7.46.vsix into VS Code Insiders.
Open a temporary copy of a real PPTX.
Verify that PPTX opens as PPTX Viewer (code-office).
Verify that no Edit toggle, no Slide text panel, and no Apply QA note action are visible.
Verify slide navigation and zoom controls remain visible.
```

## Verification Results

Automated:

```text
npx tsc --noEmit
result: PASS

npm run build
result: PASS
PPTX chunk: out/webview/assets/Pptx-CuELZvKC.js, 1,438.26 kB
PPTX WASM edit asset: absent

npm run test:pptx-phase4
result: PASS
evidence:
- pptxHandler.ts builds successfully
- PptxEditorProvider.ts builds successfully
- PPTX view-only source assertions passed
- No PPTX WASM edit asset emitted

npm run test:ci
result: PASS
coverage:
- markdown tests
- office tests, including pptx phase4
- phase06 security audit

npm run package
result: PASS
VSIX: /Users/jun/Developer/new/700_projects/code-office--dev_pptx/code-office-3.7.46.vsix
size: 38.55 MB
```

Runtime:

```text
code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office--dev_pptx/code-office-3.7.46.vsix --force
result: PASS

Opened /tmp/code-office-pptx-view-only-smoke.pptx in the already-open VS Code Insiders window.
Source copy: /Users/jun/Downloads/ESG_Peer_Comparison_Group4.pptx
Original downloaded file was not saved or modified.

Observed controls:
- filename heading
- 16 slides / current slide counter
- previous/next slide buttons
- 75% / 100% / 150% zoom control
- +/- zoom buttons

Observed absent:
- Edit toggle
- Slide text panel
- Apply QA note button
- editable textarea
- dirty/save UI

Runtime interaction:
- Next slide button changed Slide 1 -> Slide 2
- 150% zoom radio selected and enlarged slide rendering
```
