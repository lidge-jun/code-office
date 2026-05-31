# Production Ready Phase Completion

Date: 2026-05-31
Scope: All remaining code-office phases except Phase 7 LibreOffice fallback
Project root: /Users/jun/Developer/new/700_projects/code-office

## Goal

Finish every non-LibreOffice phase to production-ready quality, prove each phase
with automated smoke checks, and verify the critical UI flows with Computer Use
screenshots before the goal can be marked done.

The goal is not complete until all six user conditions are satisfied:

1. All phases except Phase 7 are complete.
2. Every included phase has smoke verification.
3. Every included phase has Computer Use plus screenshot verification.
4. HWP/HWPX editing supports repeated Cmd+S without opening Finder or browser
   Save As, and complex HWP rendering is nearly identical to the installed HWP
   viewer extension.
5. New code folders are allowed when they make the fix cleaner.
6. Missing documentation is a failure.

## Included Phases

| Phase | Status at start | Required closure |
|---|---|---|
| Phase 1 Rebrand and Attribution | Completed | Keep release/docs consistent. |
| Phase 2 Wikilink MVP | Completed | Covered by Phase 3 smoke and E2E. |
| Phase 3 Wikilink WebView and Export | Verified | `npm run test:wikilink-phase3`, VS Code Insiders click feedback and double-click navigation screenshots. |
| Phase 4 PPTX Preview | Verified | `npm run test:pptx-phase4`, VS Code Insiders generated PPTX screenshots including 32-slide scroll. |
| Phase 5 Markdown CJK Inline Formatting | Verified | `npm run test:markdown-phase5`, VS Code Insiders Markdown fixture screenshot. |
| Phase 6 Excel Strikethrough | Verified | `npm run test:excel-phase6`, VS Code Insiders XLSX fixture screenshot. |
| Phase 8 HWP/HWPX Editing | Verified | Cmd+S repeat proof, complex HWP/HWPX render evidence, comparison against `edwardkim.rhwp-vscode`. |
| Phase 8.2 HWP Security and Lifecycle | Verified | `npm run verify:hwp`, VSIX verification, lifecycle E2E evidence. |

## Explicitly Excluded

Phase 7 LibreOffice fallback is excluded by user instruction. In this project,
"LibreOffice fallback" means the optional legacy PowerPoint conversion path
that uses local LibreOffice to convert old PowerPoint formats to PDF when the
native PPTX path is insufficient. It is not part of normal PPTX preview, HWP
editing, Markdown, wikilinks, or Excel rendering. The existing optional command
and settings may remain, but this goal will not implement, smoke, or E2E
LibreOffice fallback.

## Baseline Evidence

Fresh checks at goal start:

```text
npm run test:wikilink-phase3
PASS: wikilink phase3 checks passed

npm run test:pptx-phase4
PASS: pptx phase4 checks passed

npm run test:markdown-phase5
PASS: markdown phase5 checks passed

npm run test:excel-phase6
PASS: excel phase6 checks passed

npm run audit:phase06
PASS: no unreviewed Phase 06 dependency audit findings remain.
```

VS Code Insiders extension inventory includes both comparison targets:

```text
edwardkim.rhwp-vscode
jun6161.code-office
```

Additional release gates completed after the baseline:

```text
npm run typecheck
PASS

npm run verify:hwp
PASS: HWP hardening checks passed

npm run package:verify
PASS: build, HWP verification, VSIX package, and VSIX content verification
```

The verified package was installed into VS Code Insiders from:

```text
/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.7.vsix
```

## Final Verification Status

All goal-owned phase evidence is complete. The final automated gate batch,
Computer Use screenshot pass, HWP viewer comparison, and independent Frontend
verification pass completed successfully. The only remaining dirty files at this
stage are pre-existing user changes outside this goal:

```text
/Users/jun/Developer/new/700_projects/code-office/README.md
/Users/jun/Developer/new/700_projects/code-office/docs/index.html
```

## HWP Render Parity Investigation Boundary

The known suspect area is the local rhwp-studio runtime inside the code-office
custom editor WebView:

```text
resource/rhwp-studio
src/react/view/hwp
src/provider/hwp
build.ts
```

The investigation must compare actual rendered evidence rather than assuming
that a green build or green unit test proves parity.

The comparison was performed on:

```text
/tmp/code-office-hwp-e2e/biz_plan-code-office.hwp
```

The `edwardkim.rhwp-vscode` view renders the same document as a viewer-only page
at 100% zoom. The code-office editor renders the same page through the bundled
rhwp-studio runtime and includes editing chrome, toolbar, rulers, save bridge,
and editable canvas state. After using page-fit in code-office, the visible page
content, Korean text, table/line geometry, page count, and title layout match the
installed HWP viewer closely enough for production parity. The remaining
differences are expected editor UI differences rather than document-rendering
differences.
