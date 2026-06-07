# code-office Direction

## 한 문장 결론

`code-office`은 `vscode-office` 계열의 MIT 라이선스 코드를 새 repo 방식으로 가져와, Office 문서 보기/편집 surface에 Obsidian식 Markdown workflow를 얹는 VS Code extension으로 간다. GitHub fork UI는 쓰지 않지만, 실제 코드 계보와 MIT 고지는 숨기지 않는다.

> 출처: [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office)
> 출처: [cweijan/vscode-office](https://github.com/cweijan/vscode-office)
> 출처: [MIT License text reference](https://web.mit.edu/ivlib/www/copyright.html)

## 제품 정체성

이 프로젝트는 “새로운 Obsidian 전체 클론”이 아니다. 출발점은 VS Code 안에서 Word, Excel, PDF, Markdown, 이미지, 압축 파일 등을 다루는 `vscode-office` 계열 확장이고, 여기에 Obsidian식 Markdown 링크 경험, editable DOCX, PowerPoint-like PPTX review를 추가하는 방향이다.

> 로컬 근거: `package.json`, `src/provider/officeViewerProvider.ts`, `src/provider/markdownEditorProvider.ts`, `resource/vditor/index.js`

사용자에게 보이는 제품 방향은 아래처럼 잡는다.

```text
VS Code 안에서 Office 문서와 Markdown 노트를 빠르게 보고 편집하며,
Markdown에는 Obsidian식 [[wikilink]] 경험을 추가하는 확장.
```

이 방향이면 기존 Office preview 기반을 버리지 않고, `code-office`이라는 이름의 이유도 생깁니다. 핵심은 “Office viewer + Obsidian-style notes workflow”입니다.

## 라이선스와 attribution 방향

새 repo 방식은 유지한다. 즉 GitHub에서 fork 버튼을 눌러 fork badge가 붙은 repo로 운영하지 않는다. 다만 attribution은 반드시 유지한다.

> 출처: [MIT License text reference](https://web.mit.edu/ivlib/www/copyright.html)

현재 가져온 repo 계보는 두 단계로 기록한다.

```text
Original lineage:
- cweijan/vscode-office, original project by Weijan Chen.
- rjwang1982/vscode-office, maintained fork by RJ.Wang.
```

> 출처: [cweijan/vscode-office](https://github.com/cweijan/vscode-office)
> 출처: [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office)

README/NOTICE 권장 문구는 아래로 고정한다.

```text
code-office is based on MIT-licensed vscode-office code.

Original lineage:
- cweijan/vscode-office, original project by Weijan Chen.
- rjwang1982/vscode-office, maintained fork by RJ.Wang.

Original copyright and license notices are preserved.
```

이 문구는 “포크 표시를 일부러 내세우지 않는다”와 “원저작권 고지를 지운다”를 분리합니다. 전자는 제품 브랜딩 선택이고, 후자는 라이선스 의무라서 지키는 것이 맞습니다.

## 우선순위

우선순위는 아래로 고정한다.

```text
1. Rebrand + license/NOTICE 정리
2. Obsidian-style [[wikilink]] 자동완성/이동
3. Wikilink WebView/export integration
4. PowerPoint-like .pptx/.pptm/.ppsx read-only review
5. Markdown CJK inline formatting / strikethrough 렌더링 개선
6. Excel strikethrough style 보존
7. LibreOffice fallback / .ppt legacy support (optional, deferred)
8. HWP/HWPX native support via local rhwp-studio WASM bundle with full editing and secure save lifecycle
```

이 순서가 맞는 이유는 identity와 license 문서가 먼저 정리되어야 README, package metadata, marketplace 문구가 흔들리지 않기 때문입니다. 그 다음 핵심 차별점인 위키링크를 extension host와 WebView/export 양쪽에 붙이고, Office viewer 확장성인 PPTX를 붙입니다.

## 위키링크 방향

위키링크는 Vditor 내부만 수정하지 않는다. parser, workspace index, VS Code provider, WebView bridge, export renderer로 나눈다.

> 출처: [Foam markdown-link parser](https://github.com/foambubble/foam/blob/main/packages/foam-core/src/services/markdown-link.ts)
> 출처: [Foam link completion provider](https://github.com/foambubble/foam/blob/main/packages/foam-vscode/src/vscode/features/navigation/link-completion.ts)
> 출처: [Markdown Preview Enhanced wikilink document link provider](https://github.com/shd101wyy/vscode-markdown-preview-enhanced/blob/develop/src/wikilink-document-link-provider.ts)

지원 문법은 처음부터 너무 넓히지 않는다.

```text
1차:
[[Note]]
[[Note|Alias]]
[[Note#Heading]]

2차:
[[Note^block-id]]
![[Note]]
missing note auto-create
rename sync
```

1차에서 가장 중요한 것은 “입력 중 completion이 뜨고, 클릭하면 파일로 이동한다”입니다. 이때 resolver는 Obsidian식 “가장 가까운 노트” 체감에 맞춘다. 현재 문서 폴더 기준 상대 경로를 먼저 보고, 같은 이름이 여러 개면 현재 문서와 가장 가까운 경로를 우선 후보로 올리며, workspace 전체에서는 가장 짧고 유일한 경로만 자동 확정합니다. 애매하면 임의로 열지 않고 후보를 보여줍니다.

Obsidian은 내부 링크에서 Wikilink, heading link, alias display text를 지원하고, 새 링크 생성 설정에서도 shortest unique path, relative path, vault absolute path 같은 경로 전략을 제공합니다. 이 프로젝트의 MVP는 그중 “relative context + shortest unique path”에 가장 가깝게 맞춥니다.

> 출처: [Obsidian Internal Links](https://help.obsidian.md/Linking%20notes%20and%20files/Internal%20links)
> 출처: [Obsidian Settings - Files and links](https://help.obsidian.md/settings)

## PPTX 방향

PPTX는 “편집기”가 아니라 “읽기 전용 preview”로 시작한다. 현재 provider가 `CustomReadonlyEditorProvider`이므로 이 방향이 기존 구조와 맞습니다.

> 출처: [VS Code Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)
> 로컬 근거: `src/provider/officeViewerProvider.ts`

기본 구현은 pure JS renderer입니다. 1차 후보는 `aiden0z/pptx-renderer`, 2차 후보는 `javier-mora/pptx-to-html`입니다. `PPTX2HTML`은 오래된 구조라 직접 도입보다 OOXML 처리 순서 참고용으로 둡니다.

> 출처: [aiden0z/pptx-renderer](https://github.com/aiden0z/pptx-renderer)
> 출처: [javier-mora/pptx-to-html](https://github.com/javier-mora/pptx-to-html)
> 출처: [g21589/PPTX2HTML](https://github.com/g21589/PPTX2HTML)

`.pptx`와 `.ppt`는 분리한다. `.pptx`는 OOXML zip package라 JS renderer와 맞고, `.ppt`는 legacy binary format이라 LibreOffice fallback 성격입니다. 원본 `vscode-office`에는 LibreOffice 의존성이 없었고, 현재 코드(`libreOfficeConverter.ts`, `previewLegacyPresentation` 커맨드)는 우리가 추가한 것이다. 제거하지 않고 비활성 상태로 유지하며 향후 opt-in 옵션으로 활성화할 수 있도록 남겨둔다.

> 출처: [mutyai/pptviewer LibreOffice converter](https://github.com/mutyai/pptviewer/blob/main/src/libreoffice-converter.ts)

## HWP/HWPX 방향

HWP/HWPX는 Phase 8 구현과 2026-05-29 Insiders 검증으로 full rhwp editing
경로가 실제 동작함을 확인했다. 한 차례 security-first 방향으로
viewer-only default를 적용했지만, 사용자가 이를 명확히 거부했다. 이후
local rhwp-studio bundle, VS Code CustomEditorProvider lifecycle, format-aware
save, dirty bridge, VSIX smoke gate까지 hardening했다.

따라서 제품 방향은 아래로 갱신한다.

```text
1. HWP/HWPX는 full rhwp editing을 default로 제공한다.
2. bundled local `resource/rhwp-studio`는 default runtime이다.
3. live remote rhwp studio는 `code-office.hwp.studioUrl` opt-in으로만 둔다.
4. HWP는 HWP로, HWPX는 HWPX로 저장한다.
5. HWPX 원본은 절대 HWP bytes로 조용히 덮어쓰지 않는다.
6. 저장은 VS Code native custom editor save lifecycle을 따른다.
7. release 전 `npm run release:local`과 VSIX content verification을 통과한다.
```

이 결정은 Phase 8.2f/8.2g 회복 감사와 2026-05-29 follow-up save lifecycle
fix에 기록한다. 이전 Phase 8.2의 viewer-only 방향은 보안상 안전했지만 사용
요구사항과 맞지 않았으므로 superseded 상태로 본다.

> 로컬 근거: `devlog/_plan/260524_vscode_obsdian_baseline/08.2_phase_08_hwp_security_lifecycle_recovery.md`
> 로컬 근거: `devlog/_plan/260524_vscode_obsdian_baseline/08.2f_phase_08_hwp_full_editing_recovery_audit.md`
> 로컬 근거: `devlog/_plan/260524_vscode_obsdian_baseline/08.2g_phase_08_hwp_lifecycle_hardening_completion.md`
> 출처: [VS Code Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)
> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

## 취소선과 인라인 서식 방향

이번 스크린샷 기준 핵심 문제는 Excel이 아니라 Markdown/Vditor의 CJK 인라인 서식 렌더링입니다. 한국어 문장, 표 셀, `~~취소선~~`, `**굵게**`가 섞일 때 marker가 원문으로 노출되거나 취소선 범위가 어색하게 보이는 문제가 먼저입니다.

> 로컬 근거: `/Users/jun/.cli-jaw-3462/uploads/1779601501317_e12c495e_Screenshot2026-05-24at24440PM.png`
> 로컬 근거: `resource/vditor/index.js`, `resource/vditor/util.js`, `resource/vditor/vditor.css`, `src/service/markdown/markdown-pdf.js`

따라서 Phase 5의 1차 목표는 Markdown QA fixture를 만들고, Vditor mode별로 아래 조합이 깨지는지 재현하는 것입니다.

```text
Korean/CJK + ~~strike~~
Korean/CJK + **bold**
Korean/CJK + ~~strike~~ + **bold**
Markdown table cell + inline formatting
```

Excel 취소선은 그 다음 개선 대상입니다. 현재 reader가 SheetJS worksheet를 text 중심으로 바꾸면서 cell style을 버릴 가능성이 있고, x-spreadsheet renderer는 `style.strike`를 그릴 수 있으므로, Excel phase에서는 reader/style bridge를 확인합니다.

> 로컬 근거: `src/react/view/excel/excel_reader.ts`, `src/react/view/excel/x-spreadsheet/core/data_proxy.js`, `src/react/view/excel/x-spreadsheet/canvas/draw.js`

## 하지 않을 것

아래는 현재 방향에서 non-goal입니다.

- Obsidian 전체 기능을 복제하지 않음
- PPTX 편집기를 만들지 않음
- `.ppt` legacy binary support를 `.pptx`와 같은 phase에 묶지 않음
- 원본 license/copyright notice를 제거하지 않음
- GitHub fork UI를 일부러 표시하지 않음
- 확인 없이 dependency를 추가하지 않음
- rebrand 전에 큰 feature를 먼저 붙이지 않음

## 이름과 브랜딩

현재 구현의 공개 package name은 `package.json` 기준 `code-office`으로 고정합니다. Display name도 `code-office`을 유지하고, Marketplace publisher는 기존 publisher 계정에 맞춰 `jun6161`입니다. GitHub repository와 Pages URL은 `lidge-jun/code-office` 기준으로 정리합니다. 이전 `vscode_obsdian`/`vscode-obsdian` 표기는 historical devlog와 legacy HWP setting fallback에서만 남깁니다.

> 로컬 근거: `package.json`

## 판단 기준

앞으로 기능 선택은 아래 기준으로 판단합니다.

1. 기존 `vscode-office` 구조를 최대한 살리는가
2. VS Code WebView 보안 모델을 벗어나지 않는가
3. 새 repo branding과 MIT attribution을 동시에 만족하는가
4. `[[wikilink]]`와 PowerPoint-like PPTX review라는 차별점을 강화하는가
5. 처음부터 편집/동기화/완전 호환을 욕심내지 않는가

이 기준에 맞지 않는 작업은 phase 밖으로 빼거나 별도 승인 후 진행합니다.
