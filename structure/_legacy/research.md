# Research Notes

## Summary

조사는 세 갈래로 정리했습니다. 첫째, VS Code custom editor/WebView 구조는 현재 코드 구조와 잘 맞습니다. 둘째, Obsidian식 위키링크는 Markdown/Vditor WebView 계층에서 처리하는 것이 맞습니다. 셋째, PPTX는 OOXML ZIP 패키지라 “텍스트/미디어 추출형 기본 미리보기”는 가능하지만 PowerPoint 수준의 풀 렌더링은 고위험입니다.

## agbrowse Grok Expert

Standalone `agbrowse`로 Grok Expert 질의를 실행했습니다.

- vendor: `grok`
- model: `expert`
- session: `01KSBXRY8G9BAEKW7REYNQ3FWM`
- URL: https://grok.com/c/8bcf7dc7-f002-4b78-b04e-325b43a16396?rid=6b50322b-c3c4-4779-9e90-fef035387d6b

Grok의 결론은 “코드 수정 전 아키텍처 기준선, 라이선스/고지 문서, 위키링크/PPTX/취소선 feature plan을 먼저 분리하라”였습니다. Grok 답변은 보조 조사 산출물이며, 아래 공식 문서 링크를 1차 근거로 둡니다.

## VS Code Custom Editor

VS Code custom editor는 사용자 인터페이스인 WebView와 파일을 이해하는 document model이 분리됩니다. 텍스트형 리소스는 `CustomTextEditorProvider`, 바이너리/readonly 리소스는 `CustomReadonlyEditorProvider` 또는 `CustomEditorProvider`가 맞습니다.

> 출처: [VS Code Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)

이 프로젝트의 현재 구조는 이 모델과 일치합니다. Markdown은 `CustomTextEditorProvider`, Office/PDF/image/zip/font 계열은 readonly custom editor provider로 라우팅됩니다.

## WebView Security And Resource Loading

VS Code WebView는 보안상 로컬 파일에 직접 접근하지 못하고, 로컬 리소스는 `Webview.asWebviewUri`를 통해 변환해야 합니다. 기본 접근 범위는 extension install directory와 현재 workspace이며, 추가 접근은 `localResourceRoots`로 제한해야 합니다.

> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

따라서 위키링크를 구현할 때는 `[[Page]]`를 바로 `file://`이나 임의 경로로 열지 말고, extension host에서 workspace 내부 경로로 검증한 뒤 VS Code API로 열어야 합니다.

## Obsidian Wiki Links

Obsidian은 internal link 형식으로 `[[Three laws of motion]]`, `[[Three laws of motion.md]]` 같은 Wikilink 형식을 지원합니다. 표시 텍스트는 `[[Example|Custom name]]`처럼 파이프 문자로 바꿀 수 있고, heading anchor는 `[[Note#Heading]]` 형태를 씁니다. File/link 설정에는 shortest unique path, current file relative path, vault absolute path 전략도 있으므로, `code-office` Phase 2는 현재 문서 기준 가장 가까운 note와 workspace shortest unique path를 조합하는 resolver로 잡습니다.

> 출처: [Obsidian Internal Links](https://help.obsidian.md/Linking%20notes%20and%20files/Internal%20links)
> 출처: [Obsidian Settings - Files and links](https://help.obsidian.md/settings)

이 프로젝트의 첫 구현 범위는 아래 정도가 현실적입니다.

- `[[Page]]`
- `[[Page.md]]`
- `[[folder/Page]]`
- `[[Page|Alias]]`
- `[[Page#Heading]]`

보류할 범위:

- backlinks graph
- rename tracking
- hover preview
- `![[embed]]`
- block reference `^block`
- vault-wide alias resolution

## PPTX Research

Microsoft Open XML PresentationML 문서에서 slide part는 단일 슬라이드의 내용을 담고, presentation part와 relationship으로 연결됩니다. 최소 presentation package에는 `ppt/presentation.xml`, slide master/layout/theme, slide parts 등이 들어갑니다.

> 출처: [Microsoft Learn - Structure of a PresentationML document](https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document)

PPTX는 ZIP 패키지 안에 XML parts와 media files가 들어 있는 구조입니다. 이 때문에 첫 단계에서 `adm-zip` 같은 기존 ZIP 파서를 이용해 `ppt/slides/slide*.xml`의 텍스트 run과 `ppt/media/*`를 추출하는 기본 미리보기는 가능합니다.

> 출처: [Microsoft Learn - Structure of a PresentationML document](https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document)

하지만 full fidelity 렌더링은 어렵습니다. 실제 PowerPoint 렌더링은 slide master, layout, theme, DrawingML, chart, table, SmartArt, animation, transition, embedded media, EMF/WMF 같은 요소가 복합적으로 적용됩니다. 첫 구현은 “텍스트/미디어 요약형 preview”로 잡는 것이 안전합니다.

## MIT License And Attribution

MIT 라이선스 계열 고지는 복사/수정/배포 시 copyright notice, permission notice, disclaimer가 모든 복사본 또는 substantial portions에 포함되어야 한다는 조건을 둡니다.

> 출처: [MIT Copyright Notice](https://web.mit.edu/ivlib/www/copyright.html)

따라서 GitHub fork 표시 없이 새 repo로 가는 것은 가능하지만, 원본 LICENSE와 원 저작권 고지는 보존해야 합니다. README에서 “Fork” 섹션은 제거할 수 있어도 `NOTICE` 또는 `License and attribution` 섹션은 남겨야 합니다. 현재 가져온 `rjwang1982/vscode-office`는 `cweijan/vscode-office`의 fork이므로 attribution에는 두 repo 계열을 모두 적습니다.

> 출처: [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office)
> 출처: [cweijan/vscode-office](https://github.com/cweijan/vscode-office)

## Research Conclusions

1. 코드 수정 전 `structure/architecture.md`와 devlog phase plan이 필요합니다.
2. Wiki link는 Markdown WebView DOM/render/click 계층과 extension host resolver를 나누는 방향이 맞습니다.
3. PPTX는 첫 단계에서 text/media extraction preview로 제한하는 것이 현실적입니다.
4. 취소선은 현재 스크린샷 기준 Markdown/Vditor CJK inline formatting이 1순위이고, spreadsheet strike style은 2순위입니다.
5. rebrand와 license attribution은 기능 구현 전에 먼저 정리하는 편이 안전하며, Phase 1에서 public metadata/README/NOTICE까지 반영했습니다.
