# 94 Research Strikethrough Deep Dive

## 요약

취소선 개선의 핵심은 Markdown보다 Excel입니다. Vditor 쪽은 toolbar와 CSS가 이미 존재하고, x-spreadsheet renderer도 `style.strike`를 그릴 수 있습니다. 현재 빠진 부분은 `excel_reader.ts`가 SheetJS cell style을 x-spreadsheet style로 넘기지 않는 bridge입니다.

> 로컬 근거: `resource/vditor/util.js`
> 로컬 근거: `src/react/view/excel/excel_reader.ts`
> 로컬 근거: `src/react/view/excel/x-spreadsheet/core/data_proxy.js`
> 로컬 근거: `src/react/view/excel/x-spreadsheet/canvas/draw.js`

## 구현 영향

```text
src/react/view/excel/excel_reader.ts
src/react/view/excel/x-spreadsheet/core/data_proxy.js
src/react/view/excel/x-spreadsheet/canvas/draw.js
```

1차 구현은 cell 전체 strike만 대상으로 잡고, rich text run 일부 strike는 별도 phase로 분리합니다.

> 세부 문서: [structure/research_notes/04_strikethrough_paths.md](../../../structure/research_notes/04_strikethrough_paths.md)
