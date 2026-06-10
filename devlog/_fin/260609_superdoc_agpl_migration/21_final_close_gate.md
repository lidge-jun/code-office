# Final Computer Use Close Gate

Date: 2026-06-10

Purpose:

- Close the prior same-window Computer Use blocker with fresh runtime proof.
- Verify the installed VSIX can open DOCX, switch View/Edit, save with Cmd+S, and return to clean View mode.
- Confirm the saved marker reached the physical DOCX ZIP/XML, not only the WebView state.

Environment:

```text
VS Code Insiders existing user window: /Applications/Visual Studio Code - Insiders.app
Installed VSIX: /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix
Safe QA document: /tmp/code-office-review-valid.docx
Runtime marker: QA_CLOSE_260610
```

Recovered Computer Use precondition:

```text
screencapture -x /tmp/code-office-cu-recheck.png
PASS: /tmp/code-office-cu-recheck.png is PNG image data, 3024 x 1964.

pkill -f SkyComputerUseService || true
PASS: mcp__computer_use__.get_app_state(app="com.microsoft.VSCodeInsiders") succeeded after service restart.
```

Runtime verification:

```text
Computer Use opened the already-running VS Code Insiders window.
Selected /tmp/code-office-review-valid.docx.
View mode observed:
  DOCX SuperDoc viewer mode
  code-office review E2E valid DOCX
  Second paragraph for visual smoke. QA_E2E_260610

Switched to Edit mode.
Edit mode observed:
  DOCX SuperDoc edit mode
  Save button visible
  SuperDoc toolbar visible

Inserted marker:
  QA_CLOSE_260610

Dirty-state evidence before save:
  Explorer showed "Explorer (Shift+Cmd+E) - 1 unsaved file"
  selected DOCX tab close action showed dirty-dot glyph

Pressed Cmd+S in the same VS Code Insiders window.

Clean-state evidence after save:
  Explorer no longer showed "1 unsaved file"
  selected DOCX tab close action returned to the normal close glyph

Switched Edit -> View.
View mode observed:
  DOCX SuperDoc viewer mode
  no Save button
  no edit toolbar
  code-office review E2E valid DOCX
  Second paragraph for visual smoke. QA_E2E_260610 QA_CLOSE_260610
```

Disk persistence verification:

```text
python3 - <<'PY'
import zipfile
path='/tmp/code-office-review-valid.docx'
with zipfile.ZipFile(path) as z:
    text='\n'.join(z.read(name).decode('utf-8', errors='ignore') for name in z.namelist() if name.startswith('word/') and name.endswith('.xml'))
print('QA_CLOSE_260610=' + str('QA_CLOSE_260610' in text))
print('QA_E2E_260610=' + str('QA_E2E_260610' in text))
PY

QA_CLOSE_260610=True
QA_E2E_260610=True
```

Close verdict:

```text
PASS: Build/package gate previously passed via npm run release:local.
PASS: code-office-3.7.47.vsix installed into VS Code Insiders.
PASS: Same-window Computer Use runtime verification completed.
PASS: View mode is clean and read-only in the tested path.
PASS: Edit mode accepts text, marks dirty, saves with Cmd+S, and clears dirty state.
PASS: Edit -> View shows the saved marker.
PASS: Disk DOCX XML contains the saved marker.
```
