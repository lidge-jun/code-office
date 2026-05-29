# Strikethrough And Inline Formatting Paths

이번 스크린샷 기준으로 취소선 개선의 1차 대상은 Excel이 아니라 Markdown/Vditor입니다. 한국어/CJK 문장, 표 셀, `~~취소선~~`, `**굵게**`가 섞일 때 raw marker가 노출되거나 취소선 범위가 이상해지는 문제가 먼저입니다.

> 로컬 근거: `/Users/jun/.cli-jaw-3462/uploads/1779601501317_e12c495e_Screenshot2026-05-24at24440PM.png`
> 로컬 근거: `resource/vditor/index.js`, `resource/vditor/util.js`, `resource/vditor/vditor.css`, `src/service/markdown/markdown-pdf.js`

Excel preview의 cell strike style 보존도 필요하지만, 이것은 2차 개선입니다. 두 문제는 코드 경로가 다르므로 같은 “취소선” 단어로 묶지 말고 재현 fixture와 수정 파일을 분리해야 합니다.

## Markdown CJK Inline Formatting

스크린샷에서 보이는 증상은 아래 조합에 가깝습니다.

```markdown
"주 6470H" -> v4.10에서 ... **5054h**로 현실화됨
| 주당 공부 시간 | 주 6일 × 1011h + 일요일 4h = **6470h/주** |
```

눈에 보이는 문제는 다음입니다.

- CJK 문장 중간의 strike line이 의도보다 넓게 보임
- table cell 안에서 `**...**` marker가 raw text처럼 남음
- strike와 bold가 섞인 구간에서 parser/render mode 간 결과가 불안정해 보임

1차 조사 대상은 Vditor mode별 렌더링입니다.

```text
resource/vditor/index.js
resource/vditor/util.js
resource/vditor/vditor.css
src/provider/markdownEditorProvider.ts
src/service/markdown/markdown-pdf.js
```

QA fixture는 한국어/CJK 문장을 반드시 포함해야 합니다. ASCII `~~strike~~`만 통과하면 현재 문제가 재현되지 않습니다.

```markdown
일반 ~~취소선~~ 텍스트
**굵게 ~~겹친 취소선~~**
~~기존 값 6470h~~ -> **5054h**
| 항목 | 값 |
|---|---|
| 주당 공부 시간 | 주 6일 × 1011h + 일요일 4h = **6470h/주** |
```

## Excel Strikethrough Secondary Path

Excel 쪽은 별도 문제입니다. 현재 Excel reader는 SheetJS workbook을 읽고 `sheet_to_json(ws, { raw: false, header: 1 })` 결과를 x-spreadsheet row/cell 형태로 바꿉니다. 이 과정에서 cell text만 `{ text: column }`으로 넣기 때문에 XLSX cell style의 strike 정보가 사라질 가능성이 큽니다.

> 로컬 근거: `src/react/view/excel/excel_reader.ts`

x-spreadsheet 쪽은 이미 `style.strike`를 처리할 준비가 되어 있습니다. `data_proxy.js`는 `property === 'strike'`를 style property로 저장할 수 있고, canvas `draw.js`는 `strike`가 true이면 `drawFontLine('strike', ...)`를 호출합니다. 즉 renderer는 준비되어 있고 reader bridge가 비어 있을 가능성이 높습니다.

> 로컬 근거: `src/react/view/excel/x-spreadsheet/core/data_proxy.js`, `src/react/view/excel/x-spreadsheet/canvas/draw.js`

Excel QA에는 최소 네 케이스가 필요합니다.

```text
1. plain text + strike
2. bold + strike
3. underline + strike
4. mixed rich text run 중 일부만 strike
```

1차 Excel 구현은 cell 전체 strike만 지원해도 됩니다. rich text run 일부만 strike인 케이스는 x-spreadsheet renderer가 cell 내부 run-level style을 처리하는지 별도 확인이 필요합니다.

## 추천 구현 순서

1. Markdown CJK fixture를 만들고 Vditor WYSIWYG/IR/SV mode별로 재현합니다.
2. table cell 내부의 bold marker 노출과 strike 범위를 분리해서 원인을 봅니다.
3. Vditor generated HTML과 CSS 적용 결과를 비교합니다.
4. export HTML/PDF에서도 같은 fixture가 깨지는지 확인합니다.
5. Markdown 문제가 닫힌 뒤 Excel strike fixture를 만듭니다.
6. Excel reader가 raw worksheet cell style을 읽는지 확인합니다.
7. 읽히면 style pool을 만들고 `cell.style` index를 연결합니다.
8. 읽히지 않으면 style-aware parser dependency를 별도 승인받습니다.

이 순서가 맞는 이유는 현재 사용자가 보낸 증거가 Markdown 편집기 렌더링 문제이기 때문입니다. Excel style bridge는 가치가 있지만, 이번 QA 증상과 직접 연결된 1순위는 아닙니다.
