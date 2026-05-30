# 92a Research — Phase 3 Obsidian WebView & Export (Reverse-Engineering Survey)

## 요약

Phase 3(Vditor preview wikilink + HTML/PDF export)의 실제 코드는 이미 상당 부분
구현되어 있다. 이 문서는 "Obsidian이 실제로 어떻게 하는지"와 "Obsidian을
역공학/클론한 오픈소스가 어떻게 하는지"를 조사해, 우리 현재 구현과 비교하고 남은
gap을 고정하기 위한 research note다. 코드 수정은 하지 않는다.

조사일: 2026-05-31
조사 방법: web search (Obsidian 공식 docs/forum + 역공학·클론 repo)

## 1. Obsidian 본가가 reading view에서 internal link를 그리는 방식

Obsidian reading view(미리보기)는 `[[Note]]`를 다음과 같은 anchor로 렌더링한다:

```html
<a class="internal-link" data-href="Note" href="Note">Note</a>
```

- 존재하지 않는 노트는 `class="internal-link is-unresolved"`로 표시된다.
  (흐린 색/점선 등으로 "아직 파일 없음"을 시각적으로 구분)
- 실제 open은 anchor href가 아니라 Obsidian app이 `data-href`를 vault resolver로
  넘겨 처리한다. 즉 **표시(anchor)와 resolve(앱 내부)가 분리**되어 있다.

> 출처: [Obsidian forum — internal-link / is-unresolved 마크업 예시](https://forum.obsidian.md/t/markdown-and-html-both-do-not-work-with-internal-link-in-with-mermaid-js/89149)
> 출처: [Obsidian Help — Internal links (wikilink vs markdown link)](https://help.obsidian.md/links)

핵심 교훈: 우리 Vditor 구현이 이미 같은 철학(표시는 WebView, resolve는 extension
host)을 따르고 있다. 다만 **`is-unresolved` 대응(없는 노트 시각 구분)이 없다.**

## 2. Export(HTML/PDF)에서 wikilink를 변환한 역공학 사례

| Repo / Tool | 언어 | 변환 방식 | 우리에게 주는 교훈 |
|---|---|---|---|
| `zoni/obsidian-export` | Rust | vault 전체를 스캔해 `[[note]]`를 **실제 파일 경로 기준 상대 markdown link**로 변환 | export는 naive `target+.md`가 아니라 vault index 기반 resolve가 정석 |
| `Mathijssch/oxidian` | Rust | Obsidian-flavored markdown → HTML 실시간 변환 | preview/export를 같은 변환기로 통일하는 접근 |
| `flowershow/remark-wiki-link-plus` | TS | remark 플러그인, `[[Note]]` 파싱/렌더 옵션화(permalink, alias, heading) | markdown-it 인라인 룰 옵션 설계 참고 |
| `ozntel/obsidian-link-converter`, `agathauy/wikilinks-to-mdlinks-obsidian` | TS | wikilink ↔ markdown link 일괄 변환 플러그인 | alias/heading 보존 규칙 참고 |
| Obsidian `Webpage HTML Export` (community plugin) | TS | 단일 파일/캔버스/vault 전체를 HTML로 export, 내부 링크 보존 | 우리 export 범위(단일 파일)와 대비되는 상위 목표 |

> 출처: [zoni/obsidian-export](https://github.com/zoni/obsidian-export)
> 출처: [Mathijssch/oxidian](https://github.com/Mathijssch/oxidian)
> 출처: [flowershow/remark-wiki-link-plus](https://github.com/flowershow/remark-wiki-link-plus)
> 출처: [ozntel/obsidian-link-converter](https://github.com/ozntel/obsidian-link-converter)
> 출처: [Obsidian Webpage HTML Export plugin](https://community.obsidian.md/plugins/webpage-html-export)

공통 패턴: 거의 모든 역공학 도구가 **export 시점에도 vault/workspace index로
실제 파일을 resolve**해서 끊기지 않는 링크를 만든다. naive 문자열 치환은
"interoperability" 목적에서만 쓰인다.

## 3. 우리 현재 구현 실측 (역공학 비교 기준)

### 3.1 WebView preview click — 구현됨

```text
resource/vditor/util.js
  markRenderedWikilinks()   : [[...]] → <span class="vscode-obsdian-wikilink" data-wikilink="...">
  openLink() clickCallback  : data-wikilink 클릭 → handler.emit("openWikilink", { body })
src/provider/markdownEditorProvider.ts
  .on("openWikilink")       : parseWikilinkBody() → wikilinkResolver.open(uri, link)
```

→ Obsidian의 "표시는 view, resolve는 host" 구조와 동일. **closest-note resolver
(directory distance + path length scoring, QuickPick disambiguation)** 재사용.

### 3.2 HTML/PDF export — 구현됨 (단, resolve 방식이 다름)

```text
src/service/markdown/markdown-pdf.js
  markdownItWikilink()      : [[Note#H|Alias]] → <a href="Note.md#h" class="code-office-wikilink">
  parseWikilinkExportBody() : alias/heading 분해, label 결정
  isUnsafeWikilinkTarget()  : 절대경로 / URI scheme 차단 (보안 경계 OK)
```

→ 보안 경계(`isUnsafeWikilinkTarget`)는 역공학 best practice와 일치.

## 4. 역공학 비교로 드러난 gap (Phase 3 잔여 과제 후보)

1. **Export resolve 불일치**: 미리보기/에디터는 closest-note scoring resolver를
   쓰지만, export는 `cleanTarget + ".md"`(현재 문서 기준 단순 상대경로)만 만든다.
   같은 `[[Note]]`가 클릭 시엔 정확한 파일로 열리고 export HTML에선 깨질 수 있다.
   → 2026-05-09 Jawsidian에서 기록된 "preview vs WYSIWYG resolve 불일치" gap과
   동형 문제.

2. **Unresolved(없는 노트) 시각 구분 없음**: Obsidian은 `is-unresolved`로 없는
   노트를 흐리게 표시한다. 우리 preview는 존재 여부와 무관하게 동일하게 링크처럼
   보인다. 클릭하면 resolver가 처리하지만, 사용자는 클릭 전엔 깨진 링크인지 모름.

3. **Export label/heading edge case**: heading만 있는 `[[#Section]]`(같은 문서 내
   이동), block id `^id`, embed `![[...]]`의 export 동작이 문서화되어 있지 않음.

## 5. 추천 (코드 변경 아님 — 결정 대기)

- Phase 3는 "신규 구현"이 아니라 **"resolve parity + unresolved UX 마감"** 단계로
  재정의하는 게 현실에 맞다.
- export resolver는 obsidian-export처럼 workspace index 기반으로 통일하되, 범위는
  단일 문서 export로 한정(vault 전체 export는 out of scope 유지).

## Failed / 미검증

- obsidian-export의 정확한 ambiguity tie-break 규칙은 소스 레벨로 재확인 필요
  (snippet 수준만 확인). 구현 결정 전 repo tree 확인 권장.
