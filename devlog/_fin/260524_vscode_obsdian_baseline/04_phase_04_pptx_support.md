# 04 Phase 04 — PPTX Support

## Goal

`.pptx` 파일을 VS Code 안에서 기본 미리보기할 수 있게 한다. 첫 단계는 PowerPoint full fidelity 렌더러가 아니라 text/media extraction preview로 제한한다.

## Research Baseline

PresentationML에서 slide part는 개별 슬라이드 내용을 담고, presentation part와 relationship으로 연결된다. 실제 `.pptx` package에는 `ppt/presentation.xml`, slide master/layout/theme, slide parts, relationships, media 등이 들어간다.

> 출처: [Microsoft Learn - Structure of a PresentationML document](https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document)

## Why Full Fidelity Is High Risk

PowerPoint와 같은 렌더링을 하려면 아래를 처리해야 한다.

- slide master
- slide layout
- theme fonts/colors
- DrawingML shapes
- text boxes and run styles
- tables and charts
- images and media
- SmartArt
- animations and transitions
- embedded objects
- EMF/WMF and platform-specific assets

따라서 첫 구현은 “문서를 빠르게 훑는 preview”로 제한한다.

## First-Pass Feature Shape

Supported:

- `.pptx`
- `.pptm` if macro content is ignored
- `.ppsx` if package shape is compatible
- slide list
- slide text extraction from `ppt/slides/slide*.xml`
- media list from `ppt/media/*`
- basic slide metadata

Not supported:

- `.ppt` binary OLE format
- full layout fidelity
- animation/transition playback
- chart rendering
- editable PowerPoint

## Likely Touch Points

Do not execute yet.

```text
MODIFY package.json
  - add filenamePattern for *.pptx, *.pptm, *.ppsx

MODIFY src/provider/officeViewerProvider.ts
  - route pptx-like extensions to powerpoint
  - call a PowerPoint handler before ReactApp.view

ADD src/provider/handlers/powerPointHandler.ts
  - parse package with existing zip dependency
  - emit slide data to WebView

ADD src/react/view/powerpoint/PowerPoint.tsx
  - render slide list and extracted text/media

ADD src/react/view/powerpoint/PowerPoint.less
  - dense VS Code-compatible preview styles

MODIFY src/react/main.tsx
  - add route case powerpoint
```

## Dependency Policy

First pass should avoid new dependencies. Existing dependency surface already includes ZIP parsing facilities through bundled `adm-zip` and related zip utilities.

If first pass is not enough, future research can compare:

- LibreOffice external conversion
- Pandoc path
- server-side conversion
- browser-side OOXML renderer
- PowerPoint automation on supported OS only

## Tests To Add Later

- synthetic PPTX fixture with two slides
- slide text extraction unit test
- malformed PPTX error path
- media extraction path
- WebView render smoke

## Done Criteria

- `.pptx` opens with a clear preview
- unsupported features are stated in UI/docs
- malformed package fails gracefully
- no new heavy dependency added without approval
- build passes
