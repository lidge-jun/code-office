# Phase 07 DOCX E2E Clearance

Date: 2026-06-10

## Scope

This follow-up clears the Phase 06 Computer Use blocker for the 03-series
structure review gate.

The blocker was not a source-code module violation. It was an incomplete runtime
observation: the fresh DOCX tab was judged while the code-office WebView had not
yet exposed the rendered SuperDoc tree through accessibility.

## Plan Alignment

The 03-series structural intent remains intact.

- `src/react/view/word/Word.tsx` remains the coordinator at 346 lines.
- DOCX leaf modules remain split under `src/react/view/word/`.
- No new barrel export was introduced.
- No DOCX save-repair ownership moved back into `Word.tsx`.
- No runtime patch was needed for this clearance pass.

Line-count evidence:

```text
wc -l src/react/view/word/*.ts src/react/view/word/*.tsx src/react/view/word/Word.css | sort -n
result: Word.tsx 346 lines; all authored DOCX modules below 500 lines
```

## Computer Use E2E

Tool path: Computer Use against the already-open `Visual Studio Code - Insiders`
window. No new Insiders window was opened.

Fixture:

```text
/tmp/code-office-review-valid.docx
```

Disk validation:

```text
file /tmp/code-office-review-valid.docx
result: Microsoft Word 2007+
```

Observed View-mode render:

- Active tab: `/tmp/code-office-review-valid.docx`
- WebView title: `Office Viewer`
- WebView text: `DOCX SuperDoc viewer mode`
- Segmented control: `View` selected, `Edit` available
- Rendered document text:
  - `code-office review E2E valid DOCX`
  - `Second paragraph for visual smoke.`

Observed Edit-mode behavior:

- Switched to `Edit`.
- WebView text changed to `DOCX SuperDoc edit mode`.
- SuperDoc toolbar appeared.
- Save button appeared.
- Edited the safe fixture text to include `QA_E2E_260610`.
- VS Code showed one unsaved file while dirty.

Observed save behavior:

```text
Computer Use action: Cmd+S
result: tab dirty marker cleared
```

Disk verification after save:

```text
python3 zip read /tmp/code-office-review-valid.docx word/document.xml
result: contains_marker True for QA_E2E_260610
```

Observed Edit -> View behavior:

- Switched back to `View`.
- WebView text changed to `DOCX SuperDoc viewer mode`.
- SuperDoc edit toolbar disappeared.
- Save button disappeared.
- Rendered text still included `QA_E2E_260610`.
- No dirty dot remained on the DOCX tab.

## Outcome

Phase 06's stale deleted-file case is still documented and remains useful:
`/tmp/code-office-docx-save-qa.docx` no longer existed, so the zip error there
was valid behavior for a stale tab rather than a product regression.

The fresh valid DOCX E2E blocker is now cleared. The installed code-office
runtime rendered the valid DOCX, entered edit mode, persisted an edit through
Cmd+S, and returned to clean View mode inside the existing VS Code Insiders
window.

