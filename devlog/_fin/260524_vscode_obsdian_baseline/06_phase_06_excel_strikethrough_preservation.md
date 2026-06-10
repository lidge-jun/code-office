# 06 Phase 06 — Excel Strikethrough Preservation

## Goal

Markdown CJK inline formatting이 먼저 안정된 뒤, Excel preview에서 XLSX cell strike style을 보존한다.

## Why This Is After Markdown CJK

사용자가 보낸 스크린샷은 spreadsheet가 아니라 Markdown/Vditor 화면이다. 따라서 Excel 취소선은 같은 “취소선” 범주에 있어도 2순위로 둔다.

> 로컬 근거: `/Users/jun/.cli-jaw-3462/uploads/1779601501317_e12c495e_Screenshot2026-05-24at24440PM.png`

## Likely Touch Points

```text
src/react/view/excel/excel_reader.ts
src/react/view/excel/excel_writer.ts
src/react/view/excel/x-spreadsheet/core/data_proxy.js
src/react/view/excel/x-spreadsheet/canvas/draw.js
```

## Investigation

현재 reader는 SheetJS worksheet를 `sheet_to_json(ws, { raw: false, header: 1 })`로 text 배열로 바꾸는 흐름이다. 이 경로에서 cell style이 사라질 수 있으므로, 먼저 raw worksheet cell에 strike 정보가 들어오는지 fixture로 확인해야 한다.

> 로컬 근거: `src/react/view/excel/excel_reader.ts`

x-spreadsheet renderer는 `style.strike`가 있으면 strike line을 그릴 수 있다. 따라서 첫 spike는 renderer보다 reader/style bridge에 둔다.

> 로컬 근거: `src/react/view/excel/x-spreadsheet/core/data_proxy.js`, `src/react/view/excel/x-spreadsheet/canvas/draw.js`

## Test Matrix

```text
plain text + strike
bold + strike
underline + strike
wrapped text + strike
rich text run 중 일부만 strike
```

1차 구현은 cell 전체 strike만 목표로 한다. rich text run 일부 strike는 별도 범위로 둔다.

## Done Criteria

- strike fixture `.xlsx` 준비
- cell-level strike가 preview에 표시
- bold/italic/underline과 같이 있어도 깨지지 않음
- rich text partial strike 지원 여부 문서화
- build passes
