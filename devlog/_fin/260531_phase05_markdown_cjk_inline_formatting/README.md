# Phase 5 Markdown CJK Inline Formatting

## Summary

Phase 5 keeps the fix scoped to Markdown/Vditor and export rendering. Excel strikethrough is intentionally left for Phase 6.

## Fixture

The regression fixture is:

`/Users/jun/Developer/new/700_projects/code-office/src/test/fixtures/phase5-cjk-inline.md`

It covers:

- Korean paragraph strike and bold.
- Korean list strike, bold, and nested bold strike.
- Markdown table cells with bold, strike, and nested bold strike.
- Chinese and Japanese CJK sentence coverage.
- Inline code, fenced code, and `<pre>` negative samples that must retain literal marker text.

## Mode Boundary

Rendered preview/export roots are safe to repair because they are display surfaces. Editable WYSIWYG/IR/SV roots are not globally rewritten because broad DOM mutation there can corrupt caret, selection, and Vditor internal marker state.

Phase 5 therefore verifies:

- Normal rendered paragraph, list, and table text does not leak raw `~~` or `**` markers.
- Code/pre protected regions keep literal `~~` and `**` markers and do not gain nested `del`, `s`, or `strong` nodes.
- Export HTML renders the same fixture through the production Markdown export converter.

## Verification

Required gates:

```bash
npm run test:markdown-phase5
npm run test:wikilink-phase3
npm run typecheck
npm run package
```

Manual E2E target:

`/Users/jun/Developer/new/700_projects/code-office/src/test/fixtures/phase5-cjk-inline.md`

Expected E2E result:

- Korean/CJK paragraph, list, and table strike/bold are visible without raw markers in normal rendered content.
- Inline code, fenced code, and pre samples retain literal `~~` and `**` markers.
- Excel strike is not evaluated in this phase.
