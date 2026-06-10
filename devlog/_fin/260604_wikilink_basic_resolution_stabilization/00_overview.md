# Wikilink Basic Resolution Stabilization

Date: 2026-06-04
Goal: keep the unfinished WebView `[[` autocomplete/dropdown authoring work off `main`, preserve it on a dev branch, and verify the production baseline for basic wikilink rendering/resolution.
Status: archived to `_fin` on 2026-06-10. The stabilization decision is preserved as historical context and superseded by the later `260608_markdown_wikilink_obsidian_qa` production/runtime QA closure.

## Decision

The WebView-local `[[` pair insertion, popup dropdown, and source-transaction authoring experiment is not production-ready because Computer Use/accessibility batched input can still leave `[[1` as raw content in the Vditor surface.

The production line should therefore keep only the stable wikilink features:

- render supported inactive wikilinks as wikilink links
- support `[[Note]]`
- support `[[Note.md]]`
- support `[[relative/path/Note.md]]`
- support `[[/absolute/path/Note.md]]`
- support Windows drive absolute paths such as `[[C:\vault\Note.md]]`
- reject explicit non-Markdown targets such as `[[Note.pdf]]`, `[[Note.docx]]`, and `[[relative/Note.pdf]]`

## Branch Plan

1. Create `dev/wikilink-authoring-autocomplete` from the current dirty state.
2. Commit the unfinished authoring/autocomplete/dropdown experiment to that dev branch so the work is not lost.
3. Push the dev branch.
4. Return to `main` with a clean production baseline.
5. Add or keep only documentation/test evidence for the stable basic wikilink behavior on `main`.
6. Verify and push `main`.

## Main Verification Scope

Commands:

```bash
git diff --check
npm run test:wikilink-phase3
npm run test:wikilink-resolver
npm run test:markdown
npm run typecheck
```

Expected evidence:

- `test:wikilink-phase3` proves rendered wikilink recognition accepts Markdown targets and rejects non-Markdown explicit extensions.
- `test:wikilink-resolver` proves relative, parent-relative, POSIX absolute, Windows relative, and Windows drive absolute Markdown path candidates resolve correctly.
- `test:markdown` proves the wikilink behavior does not regress Mermaid, CJK strikethrough, live/raw, resolver, and phase3 checks.
- `typecheck` proves the production TypeScript surface still compiles.

## Non-Goals

- Do not ship WebView-local `[[` popup/dropdown autocomplete on `main`.
- Do not continue patching Computer Use/accessibility batched `[[` insertion on `main`.
- Do not add new UI around the dropdown/autocomplete feature until the dev branch has a reliable source-transaction controller.
