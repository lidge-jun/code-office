# PPTX Pure JavaScript Renderer Research

PPTX 지원은 기본값을 “로컬에서 바로 열리는 읽기 전용 preview”로 잡는 게 맞습니다. 현재 `OfficeViewerProvider`는 이미 `CustomReadonlyEditorProvider`라서 `.pptx`를 selector에 추가하고 React WebView에 `pptx` route를 추가하는 구조가 자연스럽습니다.

> 출처: [VS Code Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)
> 로컬 근거: `package.json`, `src/provider/officeViewerProvider.ts`, `src/react/main.tsx`, `src/common/reactApp.ts`

## 후보 1: aiden0z/pptx-renderer

`aiden0z/pptx-renderer`는 browser-native TypeScript 렌더러입니다. README 기준으로 OOXML `.pptx`를 파싱해 HTML/SVG DOM으로 렌더링하고, shape, text, image, table, chart, SmartArt, group, background, gradient 등을 지원한다고 설명합니다. `PptxViewer.open(arrayBuffer, container, { listOptions: { windowed: true } })` 형태의 API가 있어 VS Code WebView와 잘 맞습니다.

> 출처: [aiden0z/pptx-renderer README](https://github.com/aiden0z/pptx-renderer)
> 출처: [aiden0z/pptx-renderer Viewer.ts](https://github.com/aiden0z/pptx-renderer/blob/main/src/core/Viewer.ts)

이 후보의 장점은 large deck에서 windowed rendering을 쓸 수 있다는 점입니다. WebView 안에서 전체 slide를 한 번에 DOM에 붙이면 메모리와 layout cost가 커지는데, 이 repo는 `renderList({ windowed: true, batchSize })`, `IntersectionObserver`, zoom/fit mode 같은 viewer concern을 이미 갖고 있습니다.

> 출처: [aiden0z/pptx-renderer Viewer.ts](https://github.com/aiden0z/pptx-renderer/blob/main/src/core/Viewer.ts)

주의점은 라이선스가 Apache-2.0이라는 점입니다. MIT 프로젝트에 Apache-2.0 dependency를 추가하는 것은 일반적으로 가능하지만, NOTICE/라이선스 고지와 marketplace 배포 문서에 반영해야 합니다. 지금 단계에서는 코드를 복사하지 말고 dependency 후보로만 기록합니다.

> 출처: [aiden0z/pptx-renderer GitHub metadata](https://github.com/aiden0z/pptx-renderer)

## 후보 2: javier-mora/pptx-to-html

`javier-mora/pptx-to-html`은 PPTX를 absolute-positioned HTML로 바꾸는 TypeScript 라이브러리입니다. `PptxReader`는 JSZip으로 ArrayBuffer를 읽고 `ppt/presentation.xml`의 slide size를 계산하며, `HtmlRenderer`는 text, image, shape, table, chart element를 HTML string으로 출력합니다.

> 출처: [javier-mora/pptx-to-html PptxReader.ts](https://github.com/javier-mora/pptx-to-html/blob/main/src/core/PptxReader.ts)
> 출처: [javier-mora/pptx-to-html HtmlRenderer.ts](https://github.com/javier-mora/pptx-to-html/blob/main/src/renderer/HtmlRenderer.ts)

이 후보는 viewer UI를 직접 만들어야 합니다. 반대로 말하면, `src/react/view/pptx/Pptx.tsx` 같은 route에 붙일 때 제어가 쉽습니다. 1차 MVP에서 “슬라이드 HTML 리스트 + zoom + slide count”만 원하면 구현 부담은 낮습니다.

> 출처: [javier-mora/pptx-to-html README](https://github.com/javier-mora/pptx-to-html)

한계는 README에 직접 적혀 있습니다. animations, transitions, SmartArt, audio/video, 3D, advanced charts, embedded fonts 등은 범위 밖입니다. 그러므로 이 후보를 택하면 README에 “preview fidelity is best-effort”를 명시해야 합니다.

> 출처: [javier-mora/pptx-to-html README](https://github.com/javier-mora/pptx-to-html)

## 후보 3: g21589/PPTX2HTML

`PPTX2HTML`은 pure JavaScript로 PPTX를 HTML로 바꾸는 오래된 MIT 프로젝트입니다. worker가 JSZip으로 PPTX를 열고 `[Content_Types].xml`, slide size, theme, slide layout/master relationship을 읽어 slide HTML과 progress message를 post합니다.

> 출처: [PPTX2HTML README](https://github.com/g21589/PPTX2HTML)
> 출처: [PPTX2HTML worker.js](https://github.com/g21589/PPTX2HTML/blob/master/js/worker.js)

이 후보는 repo 구조가 현재 extension의 WebView worker 설계에 참고가 됩니다. 하지만 `importScripts`, global function, old browser compatibility 중심이라 새 TypeScript/Vite/React route에 직접 가져오면 정리 비용이 큽니다. 코드 복사보다는 PPTX OOXML 처리 순서 참고용으로 두는 게 맞습니다.

> 출처: [PPTX2HTML worker.js](https://github.com/g21589/PPTX2HTML/blob/master/js/worker.js)

## 후보 4: vue-office

`vue-office`는 Word, Excel, PDF, PPTX preview를 제공하는 web component 집합입니다. repo metadata 기준 MIT 라이선스이고, `core/packages/vue-pptx` 하위 패키지가 존재합니다. 다만 이번 조사에서 `core/packages/vue-pptx/README.md` raw URL은 404였기 때문에 상세 API 근거로는 사용하지 않았습니다.

> 출처: [501351981/vue-office](https://github.com/501351981/vue-office)

이 후보는 기존 repo가 React 기반 WebView이기 때문에 바로 붙이기에는 Vue runtime 또는 wrapper 비용이 생깁니다. PPTX만 위해 Vue 의존성을 넣는 것은 1차 MVP에서는 과합니다. 단, 기존 `vscode-office`와 office preview 계열 접근이 비슷해서 UX 참고 후보로는 남겨둡니다.

> 출처: [501351981/vue-office](https://github.com/501351981/vue-office)
> 로컬 근거: `src/react/main.tsx`

## 추천 결론

1차 spike는 `@aiden0z/pptx-renderer`를 가장 먼저 검토하는 것이 좋습니다. 이유는 브라우저 런타임 중심, TypeScript, viewer lifecycle, windowed rendering, zoom/fit mode가 이미 있어서 VS Code WebView에 붙일 때 app 쪽 코드가 얇아질 가능성이 높기 때문입니다.

> 출처: [aiden0z/pptx-renderer README](https://github.com/aiden0z/pptx-renderer)
> 출처: [aiden0z/pptx-renderer Viewer.ts](https://github.com/aiden0z/pptx-renderer/blob/main/src/core/Viewer.ts)

2차 후보는 `javier-mora/pptx-to-html`입니다. fidelity 목표를 낮추고 dependency surface를 작게 가져가고 싶다면 이쪽이 더 단순합니다. 다만 navigation, thumbnail, windowing, zoom UI는 직접 구현해야 합니다.

> 출처: [javier-mora/pptx-to-html](https://github.com/javier-mora/pptx-to-html)

## 예상 수정 지점

```text
package.json
  contributes.customEditors[officeViewer].selector += "*.pptx"
  keywords += "pptx", "powerpoint"

src/provider/officeViewerProvider.ts
  case ".pptx": route = "pptx"
  optional: .ppt는 LibreOffice fallback phase에서만 검토

src/react/main.tsx
  const Pptx = lazy(() => import("./view/pptx/Pptx.tsx"))
  case "pptx": return <Pptx />

src/react/view/pptx/
  Pptx.tsx
  Pptx.less
  pptx_reader.ts 또는 renderer adapter
```

이 단계에서 `.ppt`까지 같이 열면 구현 성격이 달라집니다. `.ppt`는 legacy binary format이라 pure JS OOXML renderer와 맞지 않고, LibreOffice 변환형 fallback으로 분리하는 편이 낫습니다.

> 출처: [mutyai/pptviewer LibreOffice converter](https://github.com/mutyai/pptviewer/blob/main/src/libreoffice-converter.ts)
> 출처: [PPTX Viewer Pro marketplace](https://marketplace.visualstudio.com/items?itemName=PptxViewerPro.pptx-viewer-pro)
