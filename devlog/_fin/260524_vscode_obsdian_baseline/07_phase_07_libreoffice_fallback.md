# 07 Phase 07 — LibreOffice Fallback

## Goal

PPTX pure JavaScript preview로 보기 어려운 복잡한 deck이나 legacy `.ppt` 파일을 위한 optional fallback을 설계한다. 이 기능은 기본 preview가 아니라 사용자가 명시적으로 켜는 고급 옵션으로 둔다.

## Why This Comes After PPTX MVP

`.pptx`는 OOXML ZIP package라 browser-side renderer와 맞지만, `.ppt`는 legacy binary format이라 같은 구현 경로에 묶기 어렵다. 먼저 `.pptx` preview MVP를 안정화하고, fidelity 한계가 확인된 뒤 fallback을 붙이는 것이 안전하다.

> 출처: [mutyai/pptviewer LibreOffice converter](https://github.com/mutyai/pptviewer/blob/main/src/libreoffice-converter.ts)

## Proposed Changes For Future Phase

Do not execute yet.

```text
MODIFY package.json
  - add optional pptx fallback settings
  - add .ppt selector only if fallback support is approved

MODIFY src/provider/officeViewerProvider.ts
  - route .pptx to JS renderer by default
  - route .ppt or fallback mode through conversion service only when enabled

ADD src/service/pptx/libreOfficeConverter.ts
  - resolve configured LibreOffice path
  - check installation
  - convert to PDF in temp directory
  - enforce timeout and error reporting

MODIFY resource/pdf or existing PDF viewer bridge if needed
  - reuse existing PDF.js viewer for converted PDFs
```

## Settings Draft

```text
vscode-office.pptx.mode = "js" | "libreoffice"
vscode-office.pptx.libreOfficePath = ""
vscode-office.pptx.conversionTimeoutMs = 30000
```

The final configuration prefix may change after rebrand. This draft keeps the current prefix only to describe the existing code state.

## Risk Controls

- Do not run external conversion automatically without explicit mode.
- Do not expose local command details to WebView script.
- Validate output PDF existence before opening.
- Capture stderr and show actionable errors.
- Clean or reuse temp files predictably.
- Keep `.ppt` support documented as fallback-only.

## Done Criteria

- LibreOffice path resolution is configurable.
- Missing LibreOffice shows a clear prompt.
- Conversion success opens converted PDF in existing viewer.
- Conversion failure surfaces the command error safely.
- `.pptx` JS preview remains the default.
- Build still passes.
