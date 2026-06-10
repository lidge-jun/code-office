# 05 Phase 05 — Markdown CJK Inline Formatting

## Goal

스크린샷 기준으로 “취소선 처리”의 1차 대상은 Markdown/Vditor의 CJK inline formatting 문제다. Excel 취소선 style 보존은 Phase 06에서 별도 처리한다.

## Ambiguity

현재 “취소선 처리”는 두 의미가 가능하지만 우선순위가 다르다.

1. Markdown editor에서 CJK 문장, table cell, `~~text~~`, `**bold**` 조합이 WYSIWYG/IR/preview에서 일관되지 않음
2. Excel-like spreadsheet viewer/editor에서 cell strike style import/render/export가 깨짐

이 둘은 다른 코드 경로이며, Phase 05는 1번만 다룬다. 2번은 `06_phase_06_excel_strikethrough_preservation.md`의 범위다.

> 로컬 근거: `/Users/jun/.cli-jaw-3462/uploads/1779601501317_e12c495e_Screenshot2026-05-24at24440PM.png`

## Markdown Path

Likely touch points:

```text
resource/vditor/index.js
resource/vditor/util.js
resource/vditor/vditor.js
src/provider/markdownEditorProvider.ts
```

Investigate:

- `~~text~~` renders as strike in each mode
- `**bold**` does not leak raw marker text in Korean/CJK table cells
- strike range does not cross unrelated Korean/CJK text or markdown markers
- toolbar strike writes correct Markdown
- external update preserves `~~text~~`
- HTML/DOCX/PDF export preserves strike

Avoid first:

- direct edits to `resource/vditor/vditor.js`
- Lute parser modifications

## Test Matrix

Markdown:

- `~~simple~~`
- `**~~bold strike~~**`
- `~~multi word Korean 취소선~~`
- strike inside list item
- strike inside table cell
- Korean table cell with `주 6일 × 1011h + 일요일 4h = **6470h/주**`
- Korean sentence with old value struck and new bold value

## Done Criteria

- Markdown CJK path is treated as primary
- failing behavior is reproduced first
- implementation is limited to the confirmed path
- Excel strike remains scoped to Phase 06
- build passes
- regression notes are added to devlog
