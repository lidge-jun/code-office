# PPTX Conversion Fallback Research

PPTX preview에는 두 길이 있습니다. 첫 번째는 WebView 안에서 PPTX를 직접 파싱해 HTML/SVG로 그리는 방식이고, 두 번째는 extension host에서 LibreOffice 같은 외부 프로그램으로 PDF/PNG로 변환한 뒤 PDF.js 또는 이미지 viewer로 보여주는 방식입니다. `code-office`의 기본값은 pure JS가 맞고, 변환형은 fallback 또는 optional feature로 보는 것이 안전합니다.

> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
> 출처: [mutyai/pptviewer](https://github.com/mutyai/pptviewer)
> 출처: [PPTX Viewer Pro marketplace](https://marketplace.visualstudio.com/items?itemName=PptxViewerPro.pptx-viewer-pro)

## mutyai/pptviewer 패턴

`mutyai/pptviewer`는 `CustomReadonlyEditorProvider`로 PPT 파일을 열고, LibreOffice 설치 여부를 확인한 뒤 PPT/PPTX를 PDF로 변환하고 PDF.js viewer에 넘깁니다. WebView의 `localResourceRoots`에는 extension resource, 원본 파일 폴더, temp directory가 들어갑니다.

> 출처: [mutyai/pptviewer ppt-editor-provider.ts](https://github.com/mutyai/pptviewer/blob/main/src/ppt-editor-provider.ts)

`LibreOfficeConverter`는 설정값, `LIBREOFFICE_PATH`, OS별 기본 경로, PATH를 순서대로 확인합니다. 변환은 `soffice --headless --convert-to pdf --outdir <tmp> <pptPath>` 형태로 수행하고, 30초 timeout과 기존 PDF cache mtime 검사를 둡니다.

> 출처: [mutyai/pptviewer libreoffice-converter.ts](https://github.com/mutyai/pptviewer/blob/main/src/libreoffice-converter.ts)

이 방식의 장점은 fidelity입니다. PowerPoint 자체가 아닌 LibreOffice라 완벽하지는 않지만, 복잡한 layout, font fallback, chart, legacy `.ppt`에서 pure JS renderer보다 나은 결과가 나올 수 있습니다. 단점은 사용자가 LibreOffice를 설치해야 하고, 변환 실패/timeout/권한/임시 파일 정리 문제가 생긴다는 점입니다.

> 출처: [mutyai/pptviewer libreoffice-converter.ts](https://github.com/mutyai/pptviewer/blob/main/src/libreoffice-converter.ts)
> 출처: [PPTX Viewer Pro marketplace](https://marketplace.visualstudio.com/items?itemName=PptxViewerPro.pptx-viewer-pro)

## 현재 repo와의 결합 방식

현재 repo는 PDF viewer를 이미 `resource/pdf/viewer.html`로 포함하고 있습니다. LibreOffice fallback을 도입한다면 별도 PDF viewer를 새로 넣기보다 기존 PDF.js resource를 재사용하는 편이 맞습니다.

> 로컬 근거: `src/provider/officeViewerProvider.ts`, `resource/pdf/viewer.html`

하지만 fallback을 `OfficeViewerProvider`에 바로 섞으면 provider가 너무 커집니다. `src/provider/pptx/libreOfficeConverter.ts` 또는 `src/service/pptx/libreOfficeConverter.ts`처럼 분리하고, `officeViewerProvider.ts`는 route 결정과 message bridge만 담당하게 하는 편이 낫습니다.

> 출처: [mutyai/pptviewer libreoffice-converter.ts](https://github.com/mutyai/pptviewer/blob/main/src/libreoffice-converter.ts)
> 로컬 근거: `src/provider/officeViewerProvider.ts`

## Optional 설정값

변환형 fallback을 넣는다면 설정값은 최소 세 개가 필요합니다.

```text
vscode-office.pptx.mode = "js" | "libreoffice" | "auto"
vscode-office.pptx.libreOfficePath = ""
vscode-office.pptx.conversionTimeoutMs = 30000
```

기본값은 `"js"`가 적절합니다. `"auto"`는 pure JS 실패 시 LibreOffice로 넘어가는 UX지만, 실패 원인이 파일 손상인지 renderer 한계인지 구분하기 어려워 사용자가 예측하기 어렵습니다. 따라서 1차 배포에서는 수동 fallback이 더 명확합니다.

> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
> 출처: [mutyai/pptviewer libreoffice-converter.ts](https://github.com/mutyai/pptviewer/blob/main/src/libreoffice-converter.ts)

## 보안/운영 리스크

외부 프로세스 실행은 WebView pure JS보다 리스크가 큽니다. extension host가 로컬 파일 경로를 받아 `spawn`을 실행하므로, 경로 검증, timeout, stderr capture, temp directory 관리, output file existence 확인이 필수입니다.

> 출처: [mutyai/pptviewer libreoffice-converter.ts](https://github.com/mutyai/pptviewer/blob/main/src/libreoffice-converter.ts)

WebView에서는 임시 PDF URI만 받아야 합니다. 원본 PPTX 경로나 변환 명령을 WebView script에 노출하지 않는 편이 안전합니다. VS Code WebView는 VS Code API에 직접 접근할 수 없고, extension host와 메시지로 통신해야 하므로 이 경계를 명확히 유지해야 합니다.

> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

## 도입 순서

1. `.pptx` pure JS preview를 먼저 구현합니다.
2. `.ppt`는 아직 지원하지 않는다고 명시합니다.
3. 사용자가 fidelity 이슈를 겪는 샘플을 모읍니다.
4. LibreOffice fallback을 optional mode로 설계합니다.
5. fallback을 켤 때만 `libreOfficePath` 설정과 설치 안내 UI를 보여줍니다.

이 순서가 좋은 이유는 기본 확장이 외부 설치물 없이 동작해야 marketplace 진입 장벽이 낮기 때문입니다. LibreOffice fallback은 “복잡한 파일을 더 잘 보기 위한 고급 옵션”으로 남기는 편이 UX가 명확합니다.

> 출처: [PPTX Viewer Pro marketplace](https://marketplace.visualstudio.com/items?itemName=PptxViewerPro.pptx-viewer-pro)
> 출처: [mutyai/pptviewer](https://github.com/mutyai/pptviewer)
