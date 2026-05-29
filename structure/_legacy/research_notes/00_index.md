# code-office Deep Research Notes

이 폴더는 `vscode-office` 기반 새 repo를 `code-office` 방향으로 바꾸기 전, 조사 결과를 기능별로 쪼개서 고정하는 공간입니다. 지금 단계의 산출물은 코드가 아니라 “나중에 구현자가 바로 파일을 열고 시작할 수 있는 지도”입니다.

> 출처: [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office)
> 출처: [cweijan/vscode-office](https://github.com/cweijan/vscode-office)
> 출처: [VS Code Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)
> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

## 문서 분할

- [../direction.md](../direction.md): 최종 제품 방향, attribution 원칙, 기능 우선순위
- [../roadmap.md](../roadmap.md): phase별 실행 순서와 완료 기준
- [01_wikilink_architecture.md](01_wikilink_architecture.md): Obsidian식 `[[wikilink]]` 파싱, 자동완성, 이동, preview 클릭 처리
- [02_pptx_js_renderers.md](02_pptx_js_renderers.md): 순수 JS/브라우저 기반 PPTX 렌더러 후보와 WebView 통합 방식
- [03_pptx_conversion_fallbacks.md](03_pptx_conversion_fallbacks.md): LibreOffice/PDF 변환형 대안과 왜 fallback으로만 볼지
- [04_strikethrough_paths.md](04_strikethrough_paths.md): Markdown 취소선과 Excel cell style 취소선 개선 경로
- [05_rebrand_distribution.md](05_rebrand_distribution.md): 새 repo rebrand, MIT 고지, marketplace 공개 전 체크포인트
- [06_implementation_matrix.md](06_implementation_matrix.md): 기능별 수정 파일, 의존성, 검증 항목 매트릭스

## 현재 판단 요약

위키링크는 “Vditor 내부만 패치”보다 확장 host 쪽의 `CompletionItemProvider`, `DocumentLinkProvider`, 파일 인덱스, WebView postMessage를 나눠 구현하는 쪽이 안전합니다. 편집기 자동완성/alt-click은 VS Code API가 처리하고, Vditor preview 클릭은 WebView 메시지로 extension host에 위임하는 구조가 유지보수성이 좋습니다.

> 출처: [Foam link completion source](https://github.com/foambubble/foam/blob/main/packages/foam-vscode/src/vscode/features/navigation/link-completion.ts)
> 출처: [Markdown Preview Enhanced wikilink document link provider](https://github.com/shd101wyy/vscode-markdown-preview-enhanced/blob/develop/src/wikilink-document-link-provider.ts)
> 로컬 근거: `src/extension.ts`, `src/provider/markdownEditorProvider.ts`, `resource/vditor/index.js`

PPTX는 첫 구현에서 “완전 편집”이 아니라 읽기 전용 preview로 잡아야 합니다. `OfficeViewerProvider`가 이미 `CustomReadonlyEditorProvider`이고 React route를 주입하는 구조라서, `*.pptx` selector와 `route='pptx'`를 추가하는 방식이 가장 자연스럽습니다.

> 출처: [VS Code Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)
> 로컬 근거: `package.json` customEditors, `src/provider/officeViewerProvider.ts`, `src/react/main.tsx`, `src/common/reactApp.ts`

취소선은 Markdown 쪽보다 Excel 쪽이 실제 개선 포인트입니다. Vditor toolbar에는 이미 `strike`가 있고, x-spreadsheet canvas도 `style.strike`를 그릴 수 있지만, 현재 `excel_reader.ts`가 SheetJS 결과를 `{ text }` 중심으로 변환해서 cell style을 넘기지 않습니다.

> 로컬 근거: `resource/vditor/util.js`, `src/react/view/excel/x-spreadsheet/canvas/draw.js`, `src/react/view/excel/x-spreadsheet/core/data_proxy.js`, `src/react/view/excel/excel_reader.ts`

## 후보 기술 MLB 20-80 스케일

아래 점수는 지금 repo에 붙일 때의 실용성 기준입니다. 50이 평균, 60은 좋은 선택, 70 이상은 강한 후보입니다.

| 영역 | 후보 | 적합도 | 이유 |
|---|---:|---:|---|
| 위키링크 editor provider | Foam 패턴 | 70 | VS Code completion/section/block anchor 구조가 이미 잘 분리되어 있음 |
| 위키링크 editor provider | Markdown Preview Enhanced 패턴 | 65 | 최근 wikilink document link/hover/creation UX가 좋지만 라이선스 확인 없이 코드 복사는 금지 |
| 위키링크 regex/conversion | obsidian-links 패턴 | 55 | Obsidian 링크 변환 UX 참고용으로 좋지만 VS Code 통합 코드는 아님 |
| PPTX 순수 JS | `@aiden0z/pptx-renderer` | 70 | 브라우저 native, windowed rendering, 테스트 구조가 강함 |
| PPTX 순수 JS | `@jvmr/pptx-to-html` | 55 | 구조가 단순해 붙이기 쉽지만 fidelity 한계가 문서화되어 있음 |
| PPTX 순수 JS | `PPTX2HTML` | 45 | MIT이고 구조 참고는 가능하지만 오래된 worker/global JS 스타일 |
| PPTX 변환형 | LibreOffice -> PDF.js | 55 | fidelity는 좋을 수 있으나 외부 설치 의존성 때문에 기본값으로는 무거움 |
| 취소선 Excel | SheetJS style bridge | 60 | 현재 renderer가 이미 strike를 그릴 수 있어 reader bridge만 생기면 효과가 큼 |

> 출처: [Foam repository](https://github.com/foambubble/foam)
> 출처: [Markdown Preview Enhanced releases](https://github.com/shd101wyy/vscode-markdown-preview-enhanced/releases)
> 출처: [aiden0z/pptx-renderer](https://github.com/aiden0z/pptx-renderer)
> 출처: [javier-mora/pptx-to-html](https://github.com/javier-mora/pptx-to-html)
> 출처: [g21589/PPTX2HTML](https://github.com/g21589/PPTX2HTML)
> 출처: [mutyai/pptviewer](https://github.com/mutyai/pptviewer)

## Grok Expert 추가 세션

이번 추가 조사에서는 Grok Expert를 별도 세션으로 다시 돌렸고, 결과는 “아이디어 후보”로만 사용했습니다. Grok가 제안한 일부 source는 repo 경로/라이선스가 현재 작업 기준과 다를 수 있어서, 문서에는 GitHub API와 raw source로 재확인한 내용만 강한 결론으로 반영했습니다.

> 출처: [Grok Expert session 01KSC3ESY0JG61FRT0M5KYM964](https://grok.com/c/1b1d7513-8624-48f5-9071-10cc8fa19538?rid=3eb1129d-622f-49ac-ae64-de226d43547c)
