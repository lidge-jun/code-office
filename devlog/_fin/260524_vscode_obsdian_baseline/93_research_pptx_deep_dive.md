# 93 Research PPTX Deep Dive

## 요약

PPTX는 pure JS renderer를 기본값으로 보고 LibreOffice 변환형은 fallback으로 분리합니다. 1차 후보는 `aiden0z/pptx-renderer`, 2차 후보는 `javier-mora/pptx-to-html`입니다. `PPTX2HTML`은 코드 구조 참고용으로 남깁니다.

> 출처: [aiden0z/pptx-renderer](https://github.com/aiden0z/pptx-renderer)
> 출처: [javier-mora/pptx-to-html](https://github.com/javier-mora/pptx-to-html)
> 출처: [g21589/PPTX2HTML](https://github.com/g21589/PPTX2HTML)

## 구현 영향

```text
package.json
src/provider/officeViewerProvider.ts
src/react/main.tsx
src/react/view/pptx/Pptx.tsx
```

`.pptx`와 `.ppt`는 같은 phase에 묶지 않는 것이 좋습니다. `.pptx`는 OOXML pure JS renderer로, `.ppt`는 LibreOffice fallback으로 성격이 다릅니다.

> 출처: [mutyai/pptviewer LibreOffice converter](https://github.com/mutyai/pptviewer/blob/main/src/libreoffice-converter.ts)
> 세부 문서: [structure/research_notes/02_pptx_js_renderers.md](../../../structure/research_notes/02_pptx_js_renderers.md)
> 세부 문서: [structure/research_notes/03_pptx_conversion_fallbacks.md](../../../structure/research_notes/03_pptx_conversion_fallbacks.md)
