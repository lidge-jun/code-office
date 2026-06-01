# Wikilink Resolution And Autocomplete Closure

## Context

This plan closes the remaining Obsidian-style wikilink gaps reported on 2026-06-01:

1. `[[Name]]` without an explicit extension must be treated as a Markdown note target, so leaving or blurring the token renders a wikilink instead of dropping the brackets and leaving plain text.
2. `[[Name.pdf]]`, `[[Name.docx]]`, or any other explicit non-Markdown extension must stay raw text and must not become a code-office wikilink.
3. Same-name Markdown files must resolve automatically to the nearest file by path distance, following the project direction for Obsidian-like closest-note behavior. The user must not be asked to pick unless a later explicit policy changes this.
4. The earlier `[[` authoring/autocomplete plan must be carried forward here instead of staying only as research.

## Existing Plan And Research Sources

- `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260524_vscode_obsdian_baseline/02_phase_02_obsidian_closest_wikilinks.md`
- `/Users/jun/Developer/new/700_projects/code-office/structure/07-wikilink-authoring-autocomplete-research.md`
- Obsidian Help, Settings: "New link format" includes "Shortest path when possible", "Relative path to file", and "Absolute path in vault".
- Obsidian Help, Internal links: wikilinks support `[[Example]]`, `[[Example.md]]`, fragments, and aliases.

## Current Code Facts

- `src/service/wikilink/wikilinkParser.ts` currently parses any `[[...]]` body that is non-empty, including explicit non-Markdown extensions.
- `resource/vditor/util.js` currently renders any `[[...]]` text node into a `[data-wikilink]` span, except embeds.
- `src/service/wikilink/wikilinkResolver.ts` currently resolves Markdown files, but same-name basename links can still prompt a QuickPick instead of always choosing the nearest candidate.
- `resource/vditor/wikilink-authoring.js` already implements `[[` pair insertion, suggestions, and rendered-link raw source reveal, but it does not centralize target validity for non-Markdown explicit extensions.

## Implementation Plan

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkParser.ts`

- Add exported helpers:
  - `isSupportedWikilink(link: ParsedWikilink): boolean`
  - `isSupportedWikilinkBody(body: string, embed?: boolean): boolean`
  - `hasExplicitNonMarkdownExtension(target: string): boolean`
- Treat heading-only and block-only wikilinks as supported.
- Treat no-extension targets as Markdown note targets.
- Treat `.md` and `.markdown` targets as supported.
- Treat any other explicit extension as unsupported, so `findWikilinks()` and native VS Code DocumentLink behavior leave it as raw text.
- Use `isSupportedWikilinkBody()` inside `parseWikilinkBody()` so every host call site receives `undefined` for unsupported explicit non-Markdown links.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/util.js`

- Mirror the same target-validity rule on the WebView side.
- Export `isSupportedWikilinkBody(body: string): boolean` from the WebView utility for parity tests.
- Keep `![[embed]]` out of scope.
- Keep `[[#Heading]]` and `[[^block]]` supported.
- Render `[[Name]]`, `[[Name.md]]`, and `[[folder/Name]]`.
- Leave `[[Name.pdf]]`, `[[Name.docx]]`, and other non-Markdown extension targets as literal raw text.
- Ensure click/open detection also ignores unsupported explicit non-Markdown targets.
- Wire the new helper through all raw matching paths:
  - `findWikilinkInTextNode()`
  - `findWikilinkByRangeAtPoint()`
  - `isWikilinkBody()`
  - the IR marker click path that reads marker text as `[[...]]`
- Explicitly route blur/caret-exit rendering through the normal `refresh() -> runMarkdownPostProcessing()` path for newly typed `[[Name]]`; forced collapse remains limited to revealed rendered-link text nodes.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/resource/vditor/wikilink-authoring.js`

- Filter autocomplete targets through Markdown-note-only targets if needed.
- Keep pair insertion for `[[` unchanged.
- Preserve current code/inline-code protection.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/src/service/wikilink/wikilinkResolver.ts`

- Reuse parser target-validity helpers before opening or resolving.
- Export pure helpers:
  - `directoryDistance(fromDir: string, toDir: string): number`
  - `rankWikilinkCandidates(workspaceRoot: string, sourceDir: string, files: string[], target: string): RankedWikilinkCandidate[]`
- Define `RankedWikilinkCandidate` as `{ fsPath: string; relative: string; label: string; score: number }`.
- Auto-pick the first sorted nearest candidate for all valid Markdown note candidates instead of prompting.
- Keep direct explicit relative path resolution first.
- Keep export/open parity: both `resolve()` and `resolveExportTarget()` use the same candidate ordering.
- Keep missing note creation only for supported Markdown targets.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/src/service/markdown/markdown-pdf.js`

- Gate `markdownItWikilink()` and `parseWikilinkExportBody()` with the same explicit non-Markdown-extension policy.
- Keep `[[Note]]`, `[[Note.md]]`, `[[folder/Note]]`, `[[#Heading]]`, and `[[^block]]` export behavior.
- Leave `[[Note.pdf]]`, `[[Note.docx]]`, and other explicit non-Markdown extension targets as raw text in exported HTML/PDF/DOCX flows.
- Add export-path regression coverage through the existing Markdown test file instead of introducing a second export parser.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkPhase3Test.mjs`

- Add assertions:
  - `[[Note]]` is a valid wikilink body.
  - `[[Note.md]]` is a valid wikilink body.
  - `[[folder/Note]]` is a valid wikilink body.
  - `[[Note.pdf]]` is not a valid wikilink body.
  - `[[Note.docx]]` is not a valid wikilink body.
- Add WebView parity assertions through the exported `resource/vditor/util.js` helper.

### ADD `/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkParserTest.mjs`

- Import the TypeScript parser by bundling it with `esbuild`, following the existing test pattern used by `src/test/pptxPhase4Test.mjs`.
- Verify host parser policy:
  - `parseWikilinkBody('Note')` returns a parsed link.
  - `parseWikilinkBody('Note.md')` returns a parsed link.
  - `parseWikilinkBody('folder/Note')` returns a parsed link.
  - `parseWikilinkBody('Note.pdf')` returns `undefined`.
  - `findWikilinks('[[Note.pdf]] [[Note]]')` returns only `[[Note]]`.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkAuthoringTest.mjs`

- No behavior change is required in `wikilink-authoring.js` unless implementation shows host-fed targets are not Markdown-only. Existing host `completionTargets()` already lists Markdown files only.
- Preserve existing pair insertion and selection wrapping assertions.

### ADD `/Users/jun/Developer/new/700_projects/code-office/src/test/wikilinkResolverTest.mjs`

- Add focused resolver scoring tests with the newly exported pure helpers, avoiding VS Code UI.
- Verify nearest-path ordering for duplicate basenames:
  - source `/vault/a/current.md`
  - candidates `/vault/a/Note.md`, `/vault/b/Note.md`
  - nearest result sorts first.
- Verify explicit path still wins where valid.
- Verify deterministic tie fallback by shortest relative label, then locale order.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/package.json`

- Add `test:wikilink-parser` and `test:wikilink-resolver` to the Markdown test chain.
- Bump package version only after the implementation passes local and Insiders smoke.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/CHANGELOG.md`

- Add a release note for the wikilink resolver/rendering policy after verification.

## Verification Plan

1. Plan audit employee must PASS.
2. Code verification employee must PASS after implementation.
3. Run:
   - `npm run test:markdown`
   - `npm run release:local`
4. Verify export path:
   - `[[Note.pdf]]` remains raw text in Markdown export tests.
   - `[[Note]]` still exports as a normal wikilink anchor.
5. Install the generated VSIX into current VS Code Insiders.
6. Reload VS Code Insiders.
7. Computer Use smoke:
   - `[[NoExtNote]]` renders as a wikilink after caret leaves.
   - `[[NoExtNote.md]]` renders as a wikilink after caret leaves.
   - `[[SomeFile.pdf]]` stays raw text.
   - duplicate `[[SameName]]` opens the nearest Markdown file without QuickPick.

## Success Criteria

- The plan audit reports PASS.
- The implementation verification reports DONE/PASS.
- Each topic above has at least one passing code-level test or Computer Use smoke.
- No non-Markdown explicit extension is silently converted into a wikilink.
- Current VS Code Insiders loads the fixed VSIX and passes the smoke path.
