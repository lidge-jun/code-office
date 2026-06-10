# 03 Phase 03 — Wikilink WebView And Export

## Goal

Phase 2가 VS Code editor의 completion/document-link resolver라면, Phase 3는 Vditor WebView와 export pipeline에 같은 wikilink parser/resolver 정책을 연결한다.

## Why This Is Separate

WebView 내부에서 직접 `file://`을 열거나 workspace path를 신뢰하면 보안 경계가 깨질 수 있다. 따라서 Vditor는 링크 표시와 click event만 담당하고, 실제 resolve/open은 extension host가 처리해야 한다.

> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

## Likely Touch Points

```text
src/provider/markdownEditorProvider.ts
src/common/handler.ts
resource/vditor/index.js
resource/vditor/util.js
src/service/markdown/markdown-pdf.js
src/service/wikilink/wikilinkHtml.ts
```

## Expected Behavior

- Vditor preview에서 `[[Note]]`가 내부 링크처럼 보임
- click 시 WebView가 extension host로 target body만 전달
- extension host가 Phase 2 resolver를 재사용해 closest-note 또는 suggestion을 처리
- HTML/PDF export에서는 raw `[[Note]]`가 그대로 깨져 보이지 않도록 export-safe output으로 변환
- export output에는 VS Code `command:` URI를 넣지 않음

## Out Of Scope

- hover preview
- backlinks panel
- graph view
- missing note auto-create
- block reference embed

## Done Criteria

- Vditor preview click opens the same target as editor document link
- ambiguous same-name notes do not silently open a random file
- export path has documented behavior for wikilinks
- external Markdown links keep working
- build passes

## Current Implementation Status (2026-05-31 실측)

역공학 조사 결과 Phase 3 핵심 경로는 이미 코드에 존재한다. 자세한 비교는
`92a_research_phase03_obsidian_webview_export.md` 참고.

- DONE — WebView preview click: `resource/vditor/util.js`(`markRenderedWikilinks`,
  `openLink`) → `markdownEditorProvider.ts` `.on("openWikilink")` →
  `wikilinkResolver.open()` (closest-note scoring 재사용)
- DONE — export 변환: `src/service/markdown/markdown-pdf.js`
  `markdownItWikilink` / `parseWikilinkExportBody` / `isUnsafeWikilinkTarget`
  ( `[[Note#H|Alias]]` → `<a class="code-office-wikilink">`, 보안 경계 포함)

### 남은 gap (역공학 비교로 도출)

1. export resolve가 preview resolver와 불일치 — export는 `target+".md"` 단순
   상대경로만 생성(closest-note scoring 미적용). Obsidian 클론(obsidian-export)은
   export에서도 vault index로 resolve함.
2. unresolved(없는 노트) 시각 구분 없음 — Obsidian의 `internal-link is-unresolved`
   대응 부재.
3. `[[#Section]]` / `^blockId` / `![[embed]]`의 export 동작 미문서화.

> 출처: [zoni/obsidian-export](https://github.com/zoni/obsidian-export)
> 출처: [Obsidian Help — Internal links](https://help.obsidian.md/links)
