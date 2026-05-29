# Implementation Matrix

이 문서는 실제 코드 수정 phase에 들어갈 때 어느 파일을 어떤 순서로 만질지 한 장으로 보기 위한 매트릭스입니다. 지금 단계에서는 코드 수정 없이 조사와 설계만 기록합니다.

> 로컬 근거: `package.json`, `src/extension.ts`, `src/provider/officeViewerProvider.ts`, `src/react/main.tsx`, `resource/vditor/index.js`, `src/react/view/excel/excel_reader.ts`

## 기능별 수정 지도

| 기능 | 1차 수정 파일 | 새 파일 후보 | 검증 |
|---|---|---|---|
| Rebrand | `package.json`, `README.md`, `README-CN.md` | `NOTICE.md` | package metadata audit |
| 위키링크 parser | 없음 | `src/service/wikilink/wikilinkParser.ts` | parser unit test |
| 위키링크 index | `src/extension.ts` 등록부 | `src/service/wikilink/wikilinkIndex.ts` | workspace fixture |
| 위키링크 completion | `src/extension.ts` | `src/provider/wikilink/wikilinkCompletionProvider.ts` | VS Code extension test 또는 manual |
| 위키링크 alt-click | `src/extension.ts` | `src/provider/wikilink/wikilinkDocumentLinkProvider.ts` | `[[Note]]` open |
| 위키링크 Vditor preview click | `src/provider/markdownEditorProvider.ts`, `resource/vditor/index.js` | `src/service/wikilink/wikilinkHtml.ts` | WebView postMessage manual |
| 위키링크 export | `src/service/markdown/markdown-pdf.js` | shared renderer adapter | HTML export sample |
| PPTX route | `package.json`, `src/provider/officeViewerProvider.ts`, `src/react/main.tsx` | `src/react/view/pptx/Pptx.tsx` | sample `.pptx` open |
| PPTX renderer adapter | 없음 | `src/react/view/pptx/pptx_renderer.ts` | small/large deck render |
| LibreOffice fallback | `package.json` settings only if approved | `src/service/pptx/libreOfficeConverter.ts` | conversion failure/success |
| Markdown CJK strike/bold | `resource/vditor/index.js`, `resource/vditor/util.js`, `resource/vditor/vditor.css`, `src/service/markdown/markdown-pdf.js` | fixture docs or regression samples | Korean/CJK table + strike/bold fixture |
| Excel strike | `src/react/view/excel/excel_reader.ts` | possible style mapper | styled `.xlsx` fixture |

> 출처: [VS Code Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)
> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

## Phase A: Rebrand And Attribution

Phase 1은 package public metadata, README, README-CN, NOTICE를 먼저 정리합니다. 내부 command/config/viewType ID는 migration plan 전까지 유지합니다.

> 로컬 근거: `package.json`, `README.md`, `README-CN.md`, `NOTICE.md`
> 출처: [MIT License text reference](https://web.mit.edu/ivlib/www/copyright.html)

## Phase B: 위키링크 최소 기능

최소 기능은 parser, file target completion, document link 이동입니다. 이 세 개가 되면 Vditor preview나 export가 아직 없어도 VS Code editor에서 `[[Note]]` 워크플로가 작동합니다.

> 출처: [Foam link completion provider](https://github.com/foambubble/foam/blob/main/packages/foam-vscode/src/vscode/features/navigation/link-completion.ts)
> 출처: [Markdown Preview Enhanced wikilink document link provider](https://github.com/shd101wyy/vscode-markdown-preview-enhanced/blob/develop/src/wikilink-document-link-provider.ts)

구현자는 아래 순서로 파일을 열면 됩니다.

```text
src/extension.ts
src/provider/markdownEditorProvider.ts
resource/vditor/index.js
src/service/markdown/markdown-pdf.js
```

1차 구현에서는 missing note auto-create를 꺼두는 것이 안전합니다. 링크 resolve와 open이 안정된 뒤 설정값으로 켜는 편이 낫습니다.

> 출처: [Markdown Preview Enhanced wikilink document link provider](https://github.com/shd101wyy/vscode-markdown-preview-enhanced/blob/develop/src/wikilink-document-link-provider.ts)

## Phase C: 위키링크 WebView/export 연결

Vditor preview click과 Markdown export는 Phase B의 parser/resolver를 재사용합니다. WebView는 target text를 extension host로 전달하고, extension host가 closest-note resolve와 ambiguity suggestion을 처리합니다.

> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

## Phase D: PPTX 기본 preview

최소 기능은 `.pptx` 파일을 custom editor로 열고 첫 화면에 slide list를 보여주는 것입니다. 편집, export, slide thumbnail sidebar, speaker notes는 1차 범위가 아닙니다.

> 출처: [aiden0z/pptx-renderer README](https://github.com/aiden0z/pptx-renderer)
> 출처: [javier-mora/pptx-to-html](https://github.com/javier-mora/pptx-to-html)

구현자는 아래 순서로 파일을 열면 됩니다.

```text
package.json
src/provider/officeViewerProvider.ts
src/react/main.tsx
src/react/view/pptx/Pptx.tsx
```

renderer dependency는 바로 추가하지 말고, 샘플 WebView route에서 bundle size와 CSP 문제를 먼저 확인해야 합니다. VS Code WebView는 일반 웹 앱과 다른 sandbox 제약이 있으므로, local resource URI와 script policy를 실제로 확인해야 합니다.

> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

## Phase E: Markdown CJK 취소선/인라인 서식 개선

현재 우선순위는 Markdown/Vditor입니다. 스크린샷에서 보인 문제는 Korean/CJK text, table cell, `~~strike~~`, `**bold**`가 섞일 때 raw marker 노출 또는 strike 범위 오류가 생기는 쪽입니다. Excel 취소선은 Phase F에서 `excel_reader.ts`의 SheetJS cell style bridge로 별도 검증합니다.

> 로컬 근거: `/Users/jun/.cli-jaw-3462/uploads/1779601501317_e12c495e_Screenshot2026-05-24at24440PM.png`
> 로컬 근거: `resource/vditor/index.js`, `resource/vditor/util.js`, `resource/vditor/vditor.css`, `src/service/markdown/markdown-pdf.js`

구현자는 아래 순서로 파일을 열면 됩니다.

```text
resource/vditor/index.js
resource/vditor/util.js
resource/vditor/vditor.css
src/service/markdown/markdown-pdf.js
src/provider/markdownEditorProvider.ts
```

Markdown 쪽은 dependency 추가보다 먼저 fixture 재현과 Vditor generated HTML/CSS 확인이 우선입니다. Excel 취소선은 Phase F에서 별도 검증합니다.

## Phase F: Excel 취소선 보존

Markdown 문제가 닫힌 뒤 Excel strike fixture를 준비합니다. renderer는 strike를 그릴 수 있으므로 reader/style bridge를 먼저 확인합니다.

> 로컬 근거: `src/react/view/excel/excel_reader.ts`, `src/react/view/excel/x-spreadsheet/core/data_proxy.js`, `src/react/view/excel/x-spreadsheet/canvas/draw.js`
> 출처: [SheetJS repository](https://github.com/SheetJS/sheetjs)
> 출처: [xlsx-js-style repository](https://github.com/gitbrent/xlsx-js-style)

기존 `xlsx`가 style을 읽는지 fixture로 먼저 확인하고, 읽히지 않으면 style-aware reader/writer bridge를 적용합니다.

## 최종 검증 묶음

코드 수정 phase에서는 아래 검증이 최소입니다.

```text
npm install
npm run compile 또는 npm run build
VS Code Extension Development Host에서:
  .md open
  [[Note]] completion
  [[Note]] alt-click
  markdown custom editor preview click
  .pptx open
  Markdown CJK strike/bold/table fixture
  styled .xlsx strike render
```

Phase 1 package metadata는 JSON parse와 diff check로 검증합니다. runtime source code phase부터 build와 Extension Development Host smoke test를 기본으로 둡니다.
