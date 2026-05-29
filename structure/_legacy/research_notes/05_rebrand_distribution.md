# Rebrand And Distribution Notes

사용자 결정은 “GitHub fork 표시가 붙는 fork repo가 아니라, MIT 라이선스 기반으로 새 repo에 코드를 가져와 새 프로젝트로 정리”입니다. 이 방식은 MIT 라이선스상 가능하지만, 원 저작권/라이선스 고지는 반드시 유지해야 합니다. 특히 현재 가져온 `rjwang1982/vscode-office` 자체가 `cweijan/vscode-office`의 fork이므로, attribution은 `cweijan` 원본과 `RJ.Wang` 유지 fork를 모두 포함해야 합니다.

> 출처: [MIT License text reference](https://web.mit.edu/ivlib/www/copyright.html)
> 출처: [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office)
> 출처: [cweijan/vscode-office](https://github.com/cweijan/vscode-office)

## 반드시 남길 것

MIT 라이선스의 핵심 조건은 copyright notice와 permission notice를 software copies/substantial portions에 포함하는 것입니다. 따라서 원본 `LICENSE` 또는 equivalent notice는 남겨야 하고, README나 About 문서에 original project attribution을 넣는 편이 안전합니다.

> 출처: [MIT License text reference](https://web.mit.edu/ivlib/www/copyright.html)

권장 문구는 “Fork”가 아니라 “Based on”입니다. GitHub UI에서 fork badge를 달지 않더라도, 프로젝트 문서에는 원본 기반임을 명확히 표시하는 것이 라이선스/커뮤니티 리스크를 줄입니다. 이때 대상은 하나가 아니라 `cweijan/vscode-office`와 `rjwang1982/vscode-office` 두 계열입니다.

> 출처: [MIT License text reference](https://web.mit.edu/ivlib/www/copyright.html)
> 출처: [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office)
> 출처: [cweijan/vscode-office](https://github.com/cweijan/vscode-office)

## 바꿔야 할 메타데이터

코드 수정 phase에서 바꿔야 할 후보는 아래입니다. 지금은 문서화만 했고 수정하지 않았습니다.

```text
package.json
  name
  displayName
  description
  publisher
  keywords
  bugs.url
  homepage
  repository.url
  configuration prefix
  command IDs if user-facing rebrand가 필요하면 단계적으로

README.md
  product name
  feature list
  original attribution
  license notice

README-CN.md
  유지 여부 결정 필요

images/logo-new.png
  새 브랜드 asset 결정 후 교체
```

> 로컬 근거: `package.json`, `README.md`, `README-CN.md`, `images/logo-new.png`

## 바로 바꾸면 위험한 것

`viewType`의 `cweijan.officeViewer`, `cweijan.markdownViewer` 같은 값은 package contribution과 extension runtime 등록이 함께 맞아야 합니다. Marketplace 공개 전에는 rebrand 대상이지만, 처음부터 무리하게 바꾸면 기존 editor association과 saved user settings에 영향이 생길 수 있습니다.

> 로컬 근거: `package.json`, `src/extension.ts`, `src/provider/officeViewerProvider.ts`

configuration prefix `vscode-office`도 마찬가지입니다. 새 프로젝트라면 `code-office` 또는 최종 확정명을 쓰는 게 맞지만, 기존 코드 전체에 설정 읽기 경로가 박혀 있으므로 한 번에 바꾸려면 migration 또는 backward compatibility alias가 필요합니다.

> 로컬 근거: `package.json`, `src/common/reactApp.ts`, `src/service/markdownService.ts`

## 새 repo 방식 체크리스트

1. 원본 LICENSE 유지
2. 새 프로젝트 LICENSE에도 원 저작권 notice 포함
3. README에 “Based on cweijan/vscode-office and rjwang1982/vscode-office” 계열 표기
4. package metadata에서 원본 bugs/homepage/repository 제거 또는 새 URL로 교체
5. marketplace publisher 확정
6. icon/logo 권리 확인
7. dependency license 목록 생성
8. 변경점 devlog 유지

이 방식이면 GitHub fork UI는 쓰지 않으면서도 license notice obligation은 지킬 수 있습니다. “포크 표시를 안 한다”와 “원 저작권 고지를 지운다”는 다른 문제이므로, 후자는 하지 않아야 합니다.

> 출처: [MIT License text reference](https://web.mit.edu/ivlib/www/copyright.html)

## 권장 attribution 문구

```text
code-office is based on MIT-licensed vscode-office code.

Original lineage:
- cweijan/vscode-office, original project by Weijan Chen.
- rjwang1982/vscode-office, maintained fork by RJ.Wang.

Original copyright and license notices are preserved.
```

이 문구는 GitHub UI상의 fork badge를 쓰지는 않지만, 실제 코드 계보는 숨기지 않습니다.

> 출처: [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office)
> 출처: [cweijan/vscode-office](https://github.com/cweijan/vscode-office)

## 이름 관련 확인 필요

현재 사용자 입력은 `code-office`입니다. 일반적으로 marketplace/package name은 underscore보다 hyphen을 쓰는 경우가 많아서, 최종 공개 이름은 아래 중 하나로 확정해야 합니다.

```text
repo directory: code-office
package name candidate: code-office
display name candidate: VSCode Obsdian 또는 VSCode Obsidian Office
configuration prefix candidate: code-office
```

단어가 `obsdian`인지 `obsidian`인지도 다시 확인이 필요합니다. 사용자가 명시한 로컬 프로젝트명은 `code-office`이므로 현재 문서는 그 철자를 그대로 따릅니다.

> 로컬 근거: `/Users/jun/Developer/new/700_projects/code-office`
