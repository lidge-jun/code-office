# code-office Structure Index

이 디렉터리는 현재 `code-office`의 제품 방향, 구조, release gate, 라이선스
고지 전략을 고정하는 기준 문서입니다. 프로젝트는 `rjwang1982/vscode-office`를
MIT 라이선스 기반의 새 로컬 프로젝트로 가져온 뒤, HWP/HWPX 편집과 Markdown
workflow를 얹는 방향으로 진행되었습니다. 단, `rjwang1982/vscode-office`는
`cweijan/vscode-office`의 fork이므로 attribution에는 두 upstream 계열을 모두
남깁니다.

> 출처: [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office)
> 출처: [cweijan/vscode-office](https://github.com/cweijan/vscode-office)

현 시점에는 package metadata, README, NOTICE, HWP/HWPX runtime, release scripts가
이미 변경되었습니다. 이 문서 세트는 다음 구현 단계에서 “현재 무엇이 shipped
surface인지”와 “어떤 release gate를 통과해야 하는지”를 판단하기 위한 기준선입니다.

## Documents

- [direction.md](direction.md) — 제품 정체성, attribution 원칙, 기능 우선순위, non-goal을 한 번에 보는 방향성 문서
- [roadmap.md](roadmap.md) — rebrand, wikilink, PPTX, 취소선, fallback 구현 순서와 완료 기준
- [architecture.md](architecture.md) — 현재 확장 구조, 주요 파일, 데이터 흐름, 파일 타입 라우팅
- [conventions.md](conventions.md) — 현재 관찰된 네이밍/빌드/문서 컨벤션과 새 프로젝트 쪽 컨벤션 제안
- [research.md](research.md) — agbrowse Grok Expert와 공식 문서 기반 조사 요약
- [research-comparable-repos.md](research-comparable-repos.md) — 유사 repo와 적용 가능한 구현 방식 비교
- [research_notes/00_index.md](research_notes/00_index.md) — 위키링크, PPTX, 취소선, rebrand를 주제별로 쪼갠 상세 조사 노트
- [risks.md](risks.md) — 위키링크, PPTX, 취소선, WebView 보안, 라이선스 리스크
- [license-attribution.md](license-attribution.md) — MIT 파생 코드의 라이선스/고지 전략
- [release.md](release.md) — VSIX packaging, GitHub Releases, GitHub Pages, Marketplace publish runbook

## Current Scope

현재 public/release surface:

- `README.md`, `README-CN.md`, `README-KO.md`, `NOTICE.md`가 public docs 역할을 함
- `docs/`는 GitHub Pages용 독립 landing page
- `images/logo-new.svg`와 `images/logo-new.png`는 OpenAI 이미지 생성 concept를
  수동 SVG화한 독립 project logo이며, 기존 upstream 초록 folder/E 로고를 대체함
- HWP/HWPX는 bundled local `rhwp-studio` 기반 editable custom editor
- `scripts/verify-hwp-hardening.mjs`와 `scripts/verify-vsix.mjs`가 release smoke gate
- 원본 MIT 라이선스와 upstream attribution은 보존

## Next Source Of Truth

구현 계획은 [devlog/_plan/260524_vscode_obsdian_baseline/00_overview.md](../devlog/_plan/260524_vscode_obsdian_baseline/00_overview.md)에 있습니다.
