# Phase 2: Obsidian-style Wikilinks — DONE

**Completed**: 2026-05-29
**Plan**: `devlog/_fin/260524_vscode_obsdian_baseline/02_phase_02_obsidian_closest_wikilinks.md`

## Summary

Implemented `[[wikilink]]` navigation and auto-completion inside the Markdown editor. Wikilinks resolve to the closest matching file in the workspace using a scoring algorithm based on directory distance and path length.

## What Changed

- `src/service/wikilink/wikilinkParser.ts` (89 lines): Regex parser for `[[target|alias#heading^blockId]]` syntax including embed (`![[...]]`)
- `src/service/wikilink/wikilinkResolver.ts` (235 lines): Resolution algorithm with workspace search, scoring, heading/blockId navigation, and QuickPick disambiguation
- `src/provider/wikilink/wikilinkCompletionProvider.ts` (37 lines): CompletionItemProvider triggered by `[`, `#`, `|`
- `src/provider/wikilink/wikilinkDocumentLinkProvider.ts`: DocumentLinkProvider for clickable wikilinks
- `src/extension.ts`: Registration of wikilink providers and `code-office.openWikilink` / `code-office.openWikilinkBody` commands

## Supported Syntax

| Pattern | Example | Resolves to |
|---|---|---|
| Basic | `[[My Note]]` | Closest `My Note.md` in workspace |
| With alias | `[[My Note\|display]]` | Same file, shows "display" |
| With heading | `[[My Note#Section]]` | Jump to `# Section` heading |
| With block ID | `[[My Note^abc123]]` | Jump to `^abc123` block |
| Embed | `![[My Note]]` | Inline embed (parser support) |
