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
| Phase 3 Wikilink WebView and Export | Implemented, needs final E2E evidence | `npm run test:wikilink-phase3`, VS Code Insiders markdown open/click screenshot. |
| Phase 4 PPTX Preview | Implemented, needs final E2E evidence | `npm run test:pptx-phase4`, VS Code Insiders generated PPTX screenshot. |
| Phase 5 Markdown CJK Inline Formatting | Completed | `npm run test:markdown-phase5`, VS Code Insiders Markdown fixture screenshot. |
| Phase 6 Excel Strikethrough | Completed | `npm run test:excel-phase6`, VS Code Insiders XLSX fixture screenshot. |
| Phase 8 HWP/HWPX Editing | Shipped, active render parity issue | Cmd+S repeat proof, complex HWP/HWPX render parity against `edwardkim.rhwp-vscode`, screenshot evidence. |
| Phase 8.2 HWP Security and Lifecycle | Shipped, active render parity issue | `npm run verify:hwp`, VSIX verification, lifecycle E2E evidence. |

## Explicitly Excluded

Phase 7 LibreOffice fallback is excluded by user instruction. The existing
optional command and settings may remain, but this goal will not implement,
smoke, or E2E LibreOffice fallback.

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

## Remaining Work

1. Run full static and packaging gates: `npm run typecheck`, `npm run build`,
   `npm run verify:hwp`, and `npm run package:verify`.
2. Generate or locate deterministic fixtures for Phase 3, Phase 4, Phase 5,
   Phase 6, and complex HWP/HWPX rendering.
3. Use Computer Use in VS Code Insiders to collect screenshot evidence for each
   included phase.
4. Compare the same complex HWP/HWPX document in `edwardkim.rhwp-vscode` and
   `jun6161.code-office`.
5. If code-office render differs materially, investigate the rhwp-studio mount,
   sizing, canvas backend, CSS containment, and bridge path. Fork or patch rhwp
   if the upstream runtime is the root cause.
6. Update docs and structure/devlog records after implementation.
7. Commit in small atomic units, push, and verify a clean worktree.

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

