# 95 Research Rebrand Distribution

## 요약

새 repo 방식은 가능하지만 MIT 원 저작권/라이선스 고지는 유지해야 합니다. 문서에서는 “fork”보다 “Based on cweijan/vscode-office and rjwang1982/vscode-office” 표현이 안전합니다. `rjwang1982/vscode-office`가 `cweijan/vscode-office`의 fork이므로 둘 다 명시해야 합니다.

> 출처: [MIT License text reference](https://web.mit.edu/ivlib/www/copyright.html)
> 출처: [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office)
> 출처: [cweijan/vscode-office](https://github.com/cweijan/vscode-office)

## 구현 영향

```text
package.json
README.md
README-CN.md
LICENSE
NOTICE.md optional
images/logo-new.png
```

`viewType`과 command ID는 package contribution/runtime 등록과 연결되어 있으므로 metadata rebrand와 내부 ID rebrand를 다른 phase로 나누는 것이 안전합니다.

> 로컬 근거: `package.json`
> 로컬 근거: `src/extension.ts`
> 로컬 근거: `src/provider/officeViewerProvider.ts`
> 세부 문서: [structure/research_notes/05_rebrand_distribution.md](../../../structure/research_notes/05_rebrand_distribution.md)
