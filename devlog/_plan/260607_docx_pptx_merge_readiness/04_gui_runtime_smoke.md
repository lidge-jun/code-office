# GUI Runtime Smoke Record

Status: existing VS Code Insiders window smoke passed for DOCX and PPTX

This record captures the first real installed-VSIX smoke run after the merge
readiness branch reached automated QA gates. The test intentionally used the
already-open VS Code Insiders window instead of an Extension Development Host.

## Environment

```text
VS Code app: Visual Studio Code - Insiders
Workspace window: /Users/jun/Developer/new
Installed VSIX: /Users/jun/Developer/new/700_projects/code-office--dev_pptx/code-office-3.7.46.vsix
Temporary QA directory: /tmp/code-office-gui-qa.iCkUR2
DOCX sample: /tmp/code-office-gui-qa.iCkUR2/sample.docx
PPTX sample: /tmp/code-office-gui-qa.iCkUR2/sample.pptx
Runtime save-routing commit: 278d09d47be455c8801468a0b9708a4316da7048
Post-smoke React type-gate commit: 0dcc058dd51dbf20e2ef3678043ad9eec3724428
```

The user workspace had an unrelated modified file open:

```text
/Users/jun/Developer/new/300_permanent/_thread/260303/2_gemini_31_pro/post.md
```

It was left untouched.

## Runtime Finding

VS Code remembered `Text Editor` as the default editor for both `*.docx` and
`*.pptx` in the existing window. Opening the samples directly therefore showed
the built-in binary-file warning first.

Manual recovery path used for the smoke:

```text
Command Palette -> View: Reopen Editor With...
DOCX: DOCX Editor (code-office)
PPTX: PPTX Editor (code-office)
```

Once reopened with the code-office custom editors, both webviews loaded and the
provider save bridges were exercised through `Cmd+S`.

## Implementation Fix Exercised

The installed VSIX included a save-routing fix so custom-editor saves do not
depend on the generic VS Code text save action.

Changed source paths:

```text
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/extension.ts
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/package.json
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/provider/docx/DocxEditorProvider.ts
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/provider/pptx/PptxEditorProvider.ts
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/provider/handlers/docxHandler.ts
/Users/jun/Developer/new/700_projects/code-office--dev_pptx/src/react/view/word/Word.tsx
```

Behavioral change:

```text
Cmd+S inside cweijan.docxEditor -> code-office.docx.save -> DocxEditorProvider direct writeFile
Cmd+S inside cweijan.pptxEditor -> code-office.pptx.save -> PptxEditorProvider direct writeFile
DOCX webview dirty detection also listens to document-level beforeinput/input/cut/paste.
```

## DOCX Smoke Evidence

Action:

```text
Opened /tmp/code-office-gui-qa.iCkUR2/sample.docx in DOCX Editor (code-office)
Inserted marker: ZZZ260607DOCXSAVEZZZ
Pressed Cmd+S in the existing VS Code Insiders window
```

Disk verification:

```text
File: /tmp/code-office-gui-qa.iCkUR2/sample.docx
ZIP member checked: word/document.xml
marker_present=True
contains_ZZZ=True
size=5505
```

Verdict:

```text
DOCX installed-VSIX GUI open/edit/save smoke: PASS
```

## PPTX Smoke Evidence

Action:

```text
Opened /tmp/code-office-gui-qa.iCkUR2/sample.pptx in PPTX Editor (code-office)
Switched View -> Edit
Clicked Apply QA note
Pressed Cmd+S in the existing VS Code Insiders window
```

Disk verification:

```text
File: /tmp/code-office-gui-qa.iCkUR2/sample.pptx
ZIP members checked: ppt/slides/*.xml
marker_present=True
marker_count=1
entries=10
size=3831
Marker text: code-office QA marker 1
```

Verdict:

```text
PPTX installed-VSIX GUI open/edit/save smoke: PASS
```

## Residual QA Notes

- VS Code may keep prior `Text Editor` associations for binary Office files in
  an existing user window. `Reopen Editor With...` correctly exposes the
  code-office editors.
- The smoke proves save bridge persistence on simple sample documents. Broader
  QA should still cover larger real-world DOCX/PPTX fixtures, failed-save
  behavior, reopen-after-save, and default-editor association behavior.
