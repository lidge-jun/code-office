# Phase 5 Markdown CJK Inline Formatting Plan

Scope: Phase 5 only

Project root: `/Users/jun/Developer/new/700_projects/code-office`

## Current State

Phase 5 is about Markdown/Vditor inline formatting, not Excel. The roadmap and baseline plan both split Excel strikethrough into Phase 6.

The current Markdown path already has a lightweight post-processing hook:

- `resource/vditor/index.js` calls `installMarkdownPostProcessing()` after Vditor is ready.
- `resource/vditor/util.js` runs `repairRenderedInlineMarkdown()` and `markRenderedWikilinks()` from a `MutationObserver`.
- `src/service/markdown/markdown-pdf.js` exports Markdown through `markdown-it`, which already renders `~~...~~` as `<s>` and `**...**` as `<strong>`.

The remaining gap is closure quality: CJK/table/nested inline fixtures need to be reproducible and covered by tests, the post-processor needs to be safer around nested markers, and the supported mode behavior must be documented.

## Acceptance Criteria

1. Markdown CJK fixture includes Korean/CJK sentences, table cells, `~~strike~~`, `**bold**`, and nested `**~~bold strike~~**`.
2. Rendered non-editable Vditor roots repair leaked `~~...~~` and `**...**` markers into `del` and `strong` nodes without touching code/pre/link/wiki elements.
3. Nested inline marker combinations repair correctly within a bounded pass count.
4. Export HTML renders the same CJK fixture with `<s>`/`<del>` and `<strong>` semantics, with no raw markers in normal paragraph/table text.
5. WYSIWYG/IR/SV mode differences are documented: editable roots are not globally rewritten because that risks cursor and selection corruption; preview/export roots are repaired and verified.
6. Excel strikethrough remains out of scope and is left for Phase 6.
7. Build gates pass: `npm run test:markdown-phase5`, `npm run test:wikilink-phase3`, `npm run typecheck`, `npm run package`.
8. VS Code Insiders E2E opens the generated Markdown fixture and verifies visible CJK strike/bold rendering plus export path smoke evidence.

## Planned Diffs

### ADD `src/test/fixtures/phase5-cjk-inline.md`

Create a generated-but-checked-in Markdown fixture:

````markdown
# Phase 5 CJK Inline Formatting

한국어 문장 안의 ~~이전 값~~ 과 **새 값** 을 함께 표시한다.

- 목록 안의 ~~취소선 항목~~ 과 **굵은 항목**
- 중첩 서식: **~~굵은 취소선~~**

| 항목 | 값 |
| --- | --- |
| 근무시간 | 주 6일 x 1011h + 일요일 4h = **6470h/주** |
| 변경 | ~~기존 계산~~ -> **새 계산** |
| 중첩 | **~~표 안 굵은 취소선~~** |

중국어 문장: 旧值 ~~删除~~ 与 **新增**.
일본어 문장: 古い値 ~~削除~~ と **追加**.

`inline code ~~삭제 금지~~ **굵게 금지**`

```text
code block ~~삭제 금지~~ **굵게 금지**
```

<pre>pre block ~~삭제 금지~~ **굵게 금지**</pre>
````

Use ASCII `x` and `->` in the fixture to keep the file simple while still covering CJK text.

### MODIFY `resource/vditor/util.js`

Split the inline repair logic into small testable helpers, then keep DOM mutation behavior scoped to rendered/non-editable roots.

Planned shape:

```diff
 export function runMarkdownPostProcessing() {
     repairRenderedInlineMarkdown();
     markRenderedWikilinks();
 }
+
+export function buildInlineMarkdownRepairParts(text) {
+    // Return an ordered list of { type: 'text' | 'strong' | 'del', text }
+    // for one safe inline layer. It ignores unmatched markers and avoids
+    // crossing line boundaries.
+}
 
 function repairRenderedInlineMarkdown() {
     markdownContentRoots().forEach(root => {
-        for (let pass = 0, changed = 1; changed && pass < 4; pass++) changed = replaceTextMarkers(root, /(\*\*([^*\r\n][^*\r\n]*?)\*\*|~~([^~\r\n][^~\r\n]*?)~~)/g, (match) => {
-            const element = document.createElement(match[2] ? 'strong' : 'del');
-            element.textContent = match[2] || match[3];
-            return element;
-        });
+        for (let pass = 0, changed = 1; changed && pass < 4; pass++) {
+            changed = replaceInlineMarkdownMarkers(root);
+        }
     });
 }
+
+function replaceInlineMarkdownMarkers(root) {
+    return replaceTextMarkers(root, INLINE_MARKER_PATTERN, (match) => {
+        const element = document.createElement(match[2] ? 'strong' : 'del');
+        element.textContent = match[2] || match[3];
+        return element;
+    });
+}
```

The exact implementation may keep the current regex if tests prove it covers the fixture, but the helper must be exported so `src/test/markdownPhase5Test.mjs` can validate CJK/nested behavior without a browser.

Do not edit:

- `resource/vditor/vditor.js`
- `resource/vditor/lute.min.js`

### MODIFY `src/service/markdown/markdown-pdf.js`

Expose the HTML conversion function for focused test import without changing runtime export behavior:

```diff
 function convertMarkdownToHtml(filename, type, text, config, wikilinkMap = {}) {
   ...
 }
+
+export const __markdownPhase5Test = {
+  convertMarkdownToHtml,
+};
```

The existing `convertMd` export remains unchanged.

### ADD `src/test/markdownPhase5Test.mjs`

Use esbuild to bundle browser/CommonJS mixed modules into temporary test files, matching the existing Phase 3/4 test style.

Assertions:

1. `buildInlineMarkdownRepairParts('한국어 ~~이전 값~~ **새 값**')` produces text + `del` + `strong` parts and no raw marker text in formatted parts.
2. Nested `**~~굵은 취소선~~**` repairs in bounded passes when applied to text parts.
3. Table fixture lines containing `**6470h/주**`, `~~기존 계산~~`, and `**~~표 안 굵은 취소선~~**` are covered.
4. `convertMarkdownToHtml()` on `phase5-cjk-inline.md` returns HTML containing table output plus strike/bold tags.
5. Normal rendered text outside code blocks has no raw `~~` or `**` markers.
6. Inline code, fenced code, and `<pre>` samples retain their literal `~~` and `**` marker text and do not gain `del`, `s`, or `strong` descendants inside code/pre roots.
7. Raw Markdown fixture source is allowed and expected to contain `~~` and `**`; marker-absence assertions apply only to rendered/exported normal paragraph, list, and table text nodes after excluding code, pre, script, style, link, and wikilink-safe elements.

### MODIFY `package.json`

Add a focused Phase 5 script:

```diff
 		"test:wikilink-phase3": "node src/test/wikilinkPhase3Test.mjs",
 		"test:pptx-phase4": "node src/test/pptxPhase4Test.mjs",
+		"test:markdown-phase5": "node src/test/markdownPhase5Test.mjs",
```

### ADD `devlog/_fin/260531_phase05_markdown_cjk_inline_formatting/README.md`

Record the final behavior after B/C verification:

- Which fixture was tested.
- Why editable WYSIWYG/IR/SV roots are not rewritten globally.
- What preview/export paths are covered.
- Explicit note that Excel strike moves to Phase 6.

This file is created during B after implementation and verification evidence exists.

## Verification Plan

Automated:

```bash
cd /Users/jun/Developer/new/700_projects/code-office
npm run test:markdown-phase5
npm run test:wikilink-phase3
npm run typecheck
npm run package
```

Employee verification:

- Frontend: audit Vditor DOM safety, editable root scoping, CJK/table/nested fixture coverage.
- Backend: audit export conversion exposure and test harness bundling; confirm no runtime export regression.
- Docs: audit Phase 5/6 boundary and final devlog note. If Docs employee times out again, record the timeout and use local docs inspection plus another available employee.

Manual/CU E2E:

1. Install `/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.6.vsix`.
2. Open `/Users/jun/Developer/new/700_projects/code-office/src/test/fixtures/phase5-cjk-inline.md` in VS Code Insiders with the code-office Markdown custom editor.
3. Verify visible Korean/CJK strike and bold render without raw markers in normal paragraph, list, and table preview content, while inline code, fenced code, and pre samples retain literal `~~` and `**` markers and do not contain nested `del`, `s`, or `strong` elements.
4. Switch/inspect modes as feasible and document WYSIWYG/IR/SV differences.
5. Trigger HTML export or use the automated export HTML conversion test as fallback evidence if VS Code export UI is not deterministic.

## Non-Goals

- Excel strikethrough preservation.
- Rich-text partial-cell strike in XLSX.
- Rewriting Vditor parser internals.
- Global mutation of editable WYSIWYG/IR/SV DOM that can corrupt cursor position.
- Full CommonMark compliance beyond the Phase 5 CJK/table/nested fixture.

## Rollback

Rollback is a single commit revert for files in this phase:

- `package.json`
- `resource/vditor/util.js`
- `src/service/markdown/markdown-pdf.js`
- `src/test/markdownPhase5Test.mjs`
- `src/test/fixtures/phase5-cjk-inline.md`
- `devlog/_fin/260531_phase05_markdown_cjk_inline_formatting/README.md`
