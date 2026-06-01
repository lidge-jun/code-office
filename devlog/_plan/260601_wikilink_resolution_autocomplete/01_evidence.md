# Wikilink Resolution Evidence

## Scope

This evidence file closes the 2026-06-01 wikilink resolution and Markdown rendering goal:

- Extensionless wikilinks such as `[[NoExtNote]]` are treated as Markdown note links.
- Explicit Markdown extensions such as `[[NoExtNote.md]]` and `[[NoExtNote.markdown]]` are treated as Markdown note links.
- Explicit non-Markdown extensions such as `[[Attachment.pdf]]` remain raw text and are not resolved as note links.
- Duplicate note names resolve by the closest source-directory path, matching the Obsidian-style nearest note behavior.
- Unsupported raw wikilinks do not trigger a no-op DOM replacement loop in the Markdown WebView.

## Plan And Audit

- Plan document: `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260601_wikilink_resolution_autocomplete/00_overview.md`
- Plan audit: Backend employee reported `DONE` after two revisions that added explicit non-Markdown raw handling, export parity, and resolver ranking scope.
- Planning commits:
  - `2aeee27 docs(markdown): plan wikilink resolution closure`
  - `ecda523 docs(markdown): refine wikilink closure plan audit`
  - `a2b5803 docs(markdown): cover wikilink export policy`

## Implementation

- Policy/parser/export/resolver implementation commit:
  - `07b5a46 fix(markdown): align wikilink resolution policy`
- Unsupported raw wikilink render-loop fix commit:
  - `851c371 fix(markdown): stop unsupported wikilink render loop`

Key implementation files:

- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkParser.ts`
- `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkResolver.ts`
- `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/util.js`
- `/Users/jun/Developer/new/700_projects/code-office/src/service/markdown/markdown-pdf.js`
- `/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkParserTest.mjs`
- `/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkResolverTest.mjs`

## Automated Verification

Local verification:

- `npm run test:markdown`: PASS
- `npm run typecheck`: PASS
- `npm run release:local`: PASS, generated `/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.15.vsix`
- `code-insiders --list-extensions --show-versions | rg '^jun6161\.code-office@'`: `jun6161.code-office@3.7.15`

Backend employee verification:

- Verdict: `DONE`
- Evidence: employee reran `npm run test:markdown` and `npm run typecheck`; inspected `resource/vditor/util.js`; confirmed unsupported `[[Attachment.pdf]]` now returns no replacement element and `replaceTextNode` skips no-op DOM replacement when no supported wikilink was rendered.
- Employee also confirmed extensionless, `.md`, and `.markdown` wikilinks remain supported; explicit non-Markdown extensions remain raw; nearest-path resolver behavior remains covered by `src/test/wikilinkResolverTest.mjs`.

## Package Verification

- `.vscodeignore` includes `.tmp/**`, preventing local smoke fixtures from entering the VSIX.
- VSIX listing for `/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.15.vsix` includes runtime files such as `resource/vditor/util.js`, `resource/vditor/index.js`, and `resource/vditor/index.html`.
- VSIX listing did not include `.tmp/` after the package was rebuilt.

## GUI Verification

The initial GUI smoke on `3.7.14` reproduced the failure: opening a fixture containing unsupported raw `[[Attachment.pdf]]` caused a VS Code Insiders non-responsive window state. Root cause was a no-op text-node replacement loop in Markdown post-processing.

After the `3.7.15` fix:

- Installed VSIX: `/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.15.vsix`
- Installed extension in VS Code Insiders: `jun6161.code-office@3.7.15`
- Isolated GUI fixture root: `/tmp/code-office-wikilink-3715-smoke`
- Screenshot evidence:
  - `/tmp/code-office-insiders-3715-profile3-rendered.png`
  - `/tmp/code-office-insiders-3715-after-dismiss.png`

Frontend employee GUI verification:

- First GUI attempt: `NEEDS_FIX`, because the existing user Insiders window had multiple stale tabs and dirty structure docs, and the Markdown editor area was blank. No user documents were saved or closed.
- Second GUI attempt after opening an isolated Insiders profile and confirming the active custom editor WebView: `DONE`.
- Observed custom editor WebView contained `extensionId=jun6161.code-office`.
- Observed rendered content:
  - `Extensionless: NoExtNote`
  - `Markdown explicit: NoExtNote`
  - `Unsupported raw: [[Attachment.pdf]]`
  - `Closest duplicate: SameName`
  - `Edit target: 안읠 수정하고`
- No Finder Save As, Save, or user-document prompt appeared during the successful GUI verification.
- No UI hang was observed in the successful GUI verification.

## Residual Notes

The active user VS Code Insiders profile still has unrelated dirty structure docs open. They were intentionally not saved, closed, or reverted.

The repo status after implementation keeps those unrelated user edits out of the wikilink commits.
