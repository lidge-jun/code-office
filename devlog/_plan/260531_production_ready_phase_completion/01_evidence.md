# Production Ready Evidence

Date: 2026-06-01
Project root: /Users/jun/Developer/new/700_projects/code-office

## Automated Gates

The following commands were run from the project root and passed:

```text
npm run test:wikilink-phase3
npm run test:pptx-phase4
npm run test:markdown-phase5
npm run test:excel-phase6
npm run audit:phase06
npm run typecheck
npm run verify:hwp
npm run package:verify
```

`npm run package:verify` produced and verified:

```text
/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.7.vsix
```

The VSIX was installed into VS Code Insiders before the UI smoke pass.

## Fixtures

```text
/tmp/code-office-e2e-vault/Main.md
/tmp/code-office-e2e-vault/Target Note.md
/tmp/code-office-phase4-e2e.pptx
/tmp/code-office-phase4-32slides.pptx
/tmp/code-office-phase6-strike.xlsx
/tmp/code-office-hwp-e2e/biz_plan-code-office.hwp
/tmp/code-office-hwp-e2e/form-002-code-office.hwpx
```

## Screenshot Evidence

All screenshots are stored under:

```text
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260531_production_ready_phase_completion/evidence
```

### Phase 3 Wikilinks

```text
phase03_wikilink_click_feedback_insiders.png
phase03_wikilink_doubleclick_navigation_target.png
```

The first screenshot proves normal-click feedback on a wikilink in the
code-office Markdown webview. The second screenshot proves the production
navigation path: double-clicking `[[Target Note]]` opens `Target Note.md` in the
same code-office Markdown custom editor. Code inspection confirms the webview
intentionally treats plain click as feedback and opens on double-click,
aux-click, or modifier-click.

### Phase 4 PPTX Preview

```text
phase04_pptx_insiders.png
phase04_pptx_32slides_bottom_insiders.png
```

These screenshots prove generated PPTX rendering and virtualized multi-slide
scrolling through slide 32 without using the excluded LibreOffice fallback path.

### Phase 5 Markdown CJK Inline Formatting

```text
phase05_markdown_cjk_insiders.png
```

This screenshot proves CJK Markdown inline formatting in the code-office
Markdown webview, including table formatting, Korean strikethrough, nested bold
plus strikethrough, inline code preservation, and code block preservation.

### Phase 6 Excel Strikethrough

```text
phase06_excel_strike_insiders.png
```

This screenshot proves XLSX strikethrough rendering across plain, bold, italic,
underline, and wrapped cells in the code-office Excel preview.

### Phase 8 HWP/HWPX Editor

```text
phase08_hwp_code_office_editor_biz_plan.png
phase08_hwp_cmds_repeated_no_finder.png
phase08_hwp_rhwp_viewer_biz_plan.png
phase08_hwp_code_office_editor_page_fit_biz_plan.png
phase08_hwpx_code_office_saved_no_finder.png
```

The HWP screenshots prove a complex Korean `.hwp` loads in the code-office
editor, repeated `Cmd+S` saves through the extension bridge without Finder or
browser Save As, and the same file renders in the installed `edwardkim.rhwp-vscode`
viewer. The page-fit code-office screenshot is the parity comparison screenshot,
because it aligns the editor's page scale with the viewer-only screenshot.

The HWPX screenshot proves a `.hwpx` file loads, handles non-standard line
segment warnings through the auto-correction workflow, and saves with `Cmd+S`
through the `.hwpx` save path without opening Finder or Save As.

## HWP Viewer Comparison

Comparison target:

```text
edwardkim.rhwp-vscode
```

Code-office target:

```text
jun6161.code-office
```

The installed HWP viewer and the code-office editor render the same first page
content for `/tmp/code-office-hwp-e2e/biz_plan-code-office.hwp`: title, Korean
text, horizontal rules, footer text, page count, and page geometry match after
using page-fit in code-office. The viewer-only extension has less UI chrome and
uses a 100% viewer layout; code-office intentionally includes editing toolbar,
status fields, save controls, rulers, and editable canvas state.

No document-content rendering delta requiring an rhwp fork was observed in this
evidence pass.

## Independent Verification

Frontend employee verification was run after recapturing the HWP/HWPX evidence
screenshots. The verifier checked the documentation, screenshot filenames,
actual PNG contents, and VS Code Insiders extension inventory.

Result:

```text
PASS
```

Verified comparison extensions:

```text
edwardkim.rhwp-vscode
jun6161.code-office
```

The verifier confirmed that the HWP viewer screenshot is viewer-only, the
code-office page-fit screenshot is comparable to the viewer's first page, the
repeated `Cmd+S` HWP screenshot shows the code-office editor with no Finder or
Save As dialog, and the HWPX save screenshot shows the code-office HWPX editor
with no Finder or Save As dialog.
