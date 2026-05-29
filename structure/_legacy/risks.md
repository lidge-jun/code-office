# Risk Register

## R1. License Notice Loss

Risk: 새 repository로 옮기면서 README에서 fork 문구를 지우는 과정에 원 저작권/라이선스 고지까지 사라질 수 있습니다.

Impact: MIT 라이선스 조건 위반 가능성.

Mitigation:

- `LICENSE` 원문 보존
- `NOTICE.md` 추가
- README에 `cweijan/vscode-office` 원본과 `rjwang1982/vscode-office` 유지 fork 계열 문구 유지
- third-party bundled assets/dependencies 별도 확인

MIT 계열 고지는 copyright notice와 permission notice가 복사본 또는 substantial portions에 포함되어야 한다는 조건을 둡니다.

> 출처: [MIT Copyright Notice](https://web.mit.edu/ivlib/www/copyright.html)

## R2. GitHub Fork 표시와 새 Repository 혼동

Risk: GitHub의 fork 버튼으로 만든 repo는 GitHub UI에 fork 관계가 표시됩니다. 사용자는 실제 fork 표시를 원하지 않으므로 local copy -> new repo 방식이 맞습니다.

Mitigation:

- GitHub fork 대신 새 repo 생성
- 현재 clone의 `origin`은 추후 새 remote로 교체
- `cweijan/vscode-office`와 `rjwang1982/vscode-office` URL은 `NOTICE`에 attribution으로 남김

## R3. WebView Path Escape

Risk: `[[Page]]` 링크를 임의 파일 경로로 해석하면 workspace 밖 파일을 열거나 WebView resource boundary를 우회할 수 있습니다.

Mitigation:

- extension host에서만 경로 resolve
- workspace 내부인지 검증
- multi-root workspace는 현재 document가 속한 root 우선
- unmatched link는 create/open 정책을 명시적으로 분리
- `localResourceRoots`는 최소 권한으로 유지

VS Code WebView는 로컬 리소스 접근을 제한하고, 추가 접근은 `localResourceRoots`로 제한해야 합니다.

> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

## R4. Wiki Link Scope Creep

Risk: `[[Page]]` 클릭 지원만 하려다가 Obsidian 전체 기능(backlinks, graph, aliases, hover preview, rename tracking)을 재구현하는 범위로 커질 수 있습니다.

Mitigation:

- Phase 2: completion + document link + closest-note resolver
- Phase 3: WebView/export integration
- Later: backlinks/graph 여부 재판단
- `![[embed]]`와 block reference는 별도 phase로 분리

Obsidian wikilink는 alias, heading link, block reference 등 다양한 문법을 포함합니다.

> 출처: [Obsidian Internal Links](https://help.obsidian.md/Linking%20notes%20and%20files/Internal%20links)

## R5. PPTX Full Fidelity Trap

Risk: `.pptx` 파일은 ZIP 안의 XML과 media를 읽는 것은 쉽지만, PowerPoint와 같은 시각적 렌더링은 매우 어렵습니다.

Impact:

- 복잡한 슬라이드가 깨져 보임
- 사용자가 “PPTX 지원”을 PowerPoint 수준 렌더링으로 기대함
- chart/table/theme/animation 처리 범위가 폭증

Mitigation:

- 1차 명칭을 “PPTX read-only preview” 또는 “PPTX text/media preview”로 제한
- full fidelity는 LibreOffice/PowerPoint external conversion 또는 dedicated renderer 조사 후 별도 결정
- supported/unsupported matrix를 README에 명시

PresentationML slide part와 relationship 구조는 복잡한 package graph를 전제로 합니다.

> 출처: [Microsoft Learn - Structure of a PresentationML document](https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document)

## R6. Vditor Maintenance Debt

Risk: 현재 README도 Vditor가 활발히 유지되지 않는다고 언급합니다. Wiki link나 취소선 동작을 Vditor 내부 parser에 깊이 넣으면 유지보수 비용이 커질 수 있습니다.

Mitigation:

- 가능한 한 `resource/vditor/index.js`와 `util.js`의 외부 hook/post-process 계층에서 처리
- `vditor.js` 번들 직접 수정은 마지막 수단
- Vditor submodule build 절차를 건드리는 변경은 별도 phase로 분리

## R7. Strikethrough Ambiguity

Risk: “취소선 처리 개선”이 Markdown CJK inline formatting인지 Excel cell strike인지 섞여서 잘못된 파일을 먼저 고칠 수 있습니다.

Mitigation:

- Markdown: Korean/CJK sentence, table cell, `~~text~~`, `**bold**`, WYSIWYG/IR/preview consistency를 먼저 테스트
- Spreadsheet: x-spreadsheet `strike` style import/export/render를 secondary로 테스트
- 스크린샷 기준 현재 1순위는 Markdown/Vditor 경로로 고정

## R8. Rebrand Collision

Risk: package name, command prefix, config prefix, viewType을 일부만 바꾸면 기존 `vscode-office-enhanced` 설치와 충돌하거나 설정 migration이 꼬일 수 있습니다.

Mitigation:

- Phase 1은 public metadata/README/NOTICE만 변경
- command/config/viewType prefix migration은 별도 phase로 분리
- backwards compatibility 필요 여부를 명확히 결정한 뒤 migration 또는 alias 전략 선택

## R9. Release Artifact Drift

Risk: `vendor/rhwp-studio-dist`는 tracked source이고 `resource/rhwp-studio`는
build-generated ignored output입니다. 빌드를 돌리지 않거나 VSIX 내용을 검사하지
않으면 Marketplace/GitHub Release artifact가 README와 다른 runtime을 포함할 수
있습니다.

Mitigation:

- `npm run build`로 `resource/rhwp-studio`를 매번 재생성
- `npm run verify:hwp`로 source/build hardening checks 실행
- `npm run package:verify`로 VSIX에 rhwp WASM이 포함되고 samples/vendor/docs/scripts가
  제외되었는지 확인
- `npm run release:local`을 GitHub Release와 Marketplace publish의 기본 gate로 사용
- `structure/release.md`를 release runbook으로 유지

## R10. Legacy Dependency Audit Debt

Risk: inherited viewer dependencies still trigger `npm audit --omit=dev`
findings, including `x-data-spreadsheet` transitive dependencies and `xlsx`.
Some advisories report no direct fix through `npm audit fix`.

Impact:

- Marketplace publish should not be described as security-clean until the
  residual risk is explicitly accepted or the dependency path is replaced.
- Naive `npm audit fix --force` may introduce breaking changes in document
  parsing/rendering paths.

Mitigation:

- Keep `npm audit --omit=dev` in the Marketplace pre-publish checklist.
- Treat current findings as accepted residual risk only for GitHub README/Pages
  and VSIX smoke push, not as a final security hardening pass.
- Plan a separate dependency replacement phase for `xlsx` and legacy
  spreadsheet transitive packages.
