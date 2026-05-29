# Obsidian-Style Wikilink Architecture

`code-office`의 위키링크 지원은 단순히 `[[...]]`를 `<a>`로 바꾸는 문제가 아닙니다. 사용자가 기대하는 경험은 입력 중 자동완성, preview 클릭 이동, 없는 노트 생성, `#heading`/`^block` 이동, alias 표시, embed 표시까지 포함됩니다. 그래서 구현을 parser, index, editor provider, webview bridge, export renderer로 나눠야 합니다.

> 출처: [Foam markdown-link parser](https://github.com/foambubble/foam/blob/main/packages/foam-core/src/services/markdown-link.ts)
> 출처: [Foam link completion provider](https://github.com/foambubble/foam/blob/main/packages/foam-vscode/src/vscode/features/navigation/link-completion.ts)
> 출처: [Markdown Preview Enhanced wikilink document link provider](https://github.com/shd101wyy/vscode-markdown-preview-enhanced/blob/develop/src/wikilink-document-link-provider.ts)

## 지원 문법 범위

1차 구현 문법은 Obsidian/Foam 계열과 맞추는 것이 좋습니다.

```text
[[Note]]
[[Note|Alias]]
[[Note#Heading]]
[[Note#Heading|Alias]]
```

`[[Note^block-id]]`, `![[Note]]`, `![[Note#Heading]]`는 parser 모델에는 남기되 Phase 2 자동 resolve의 1차 완료 범위에서는 제외합니다. Foam의 parser는 wikilink를 `target`, `section`, `blockId`, `alias`로 나눕니다. 특히 `#^block`처럼 보이는 조각을 일반 heading이 아니라 block anchor로 분리합니다. 이 모델을 그대로 빌리면 나중에 preview, completion, rename sync가 같은 파서 결과를 공유할 수 있습니다.

> 출처: [Foam markdown-link parser](https://github.com/foambubble/foam/blob/main/packages/foam-core/src/services/markdown-link.ts)

`obsidian-links`는 더 간단한 정규식을 쓰며 embed marker, target, alias를 분리합니다. 이 repo는 VS Code 통합보다 링크 변환/정리 UX 참고용으로 보는 게 맞습니다.

> 출처: [obsidian-links RegExPatterns.ts](https://github.com/mii-key/obsidian-links/blob/master/RegExPatterns.ts)
> 출처: [obsidian-links ConvertWikilinksToMdlinksCommand.ts](https://github.com/mii-key/obsidian-links/blob/master/commands/ConvertWikilinksToMdlinksCommand.ts)

## 권장 모듈 분리

구현 시 새 모듈은 아래처럼 분리하는 것이 안전합니다. 지금은 문서 단계라 파일을 만들지 않았습니다.

```text
src/service/wikilink/
  wikilinkParser.ts
  wikilinkIndex.ts
  wikilinkResolver.ts
  wikilinkHtml.ts
src/provider/wikilink/
  wikilinkCompletionProvider.ts
  wikilinkDocumentLinkProvider.ts
  wikilinkDefinitionProvider.ts
  wikilinkHoverProvider.ts
```

`wikilinkParser.ts`는 문자열 문법만 책임지고, workspace 파일 탐색은 하지 않아야 합니다. `wikilinkIndex.ts`는 workspace의 markdown 파일, heading, block id를 캐시하고 watcher로 갱신합니다. `wikilinkResolver.ts`는 현재 문서 URI와 target 문자열을 받아 실제 `vscode.Uri`로 바꿉니다.

> 출처: [Foam link completion provider](https://github.com/foambubble/foam/blob/main/packages/foam-vscode/src/vscode/features/navigation/link-completion.ts)
> 출처: [Markdown Preview Enhanced wikilink document link provider](https://github.com/shd101wyy/vscode-markdown-preview-enhanced/blob/develop/src/wikilink-document-link-provider.ts)

## 가장 가까운 노트 해석 정책

Phase 2의 resolver는 “가장 가까운 노트” 체감을 우선합니다. Obsidian은 Wikilink, heading link, alias display text를 지원하고, file/link 설정에서 shortest unique path, current file relative path, vault absolute path 전략을 제공합니다. 이 프로젝트는 VS Code workspace를 vault처럼 보고, current file relative context와 shortest unique path를 합친 MVP로 갑니다.

> 출처: [Obsidian Internal Links](https://help.obsidian.md/Linking%20notes%20and%20files/Internal%20links)
> 출처: [Obsidian Settings - Files and links](https://help.obsidian.md/settings)

권장 resolver 순서는 아래입니다.

```text
1. target에 폴더가 있으면 현재 문서 폴더 기준 상대 경로로 먼저 확인
2. target이 basename-only이면 현재 문서와 같은 폴더를 먼저 확인
3. 같은 이름 후보가 여러 개면 현재 문서와 directory distance가 가까운 후보를 위에 표시
4. workspace 전체에서는 basename이 유일하거나 shortest unique path일 때만 자동 확정
5. 여전히 애매하면 Quick Pick 또는 completion detail로 후보를 보여줌
6. workspace 밖 경로, absolute path, file:// raw link는 기본 거부
```

이 정책은 사용자가 `[[Note]]`라고 썼을 때 임의의 첫 검색 결과를 여는 위험을 줄입니다. 특히 같은 이름의 daily note, index note, project note가 공존하는 workspace에서는 “가장 가까운 후보를 보여주되 자동 확정은 유일할 때만”이 안전합니다.

## VS Code Editor 쪽

편집기에서 `[[`를 입력했을 때는 `vscode.languages.registerCompletionItemProvider`가 맞습니다. Foam은 `[` trigger로 wikilink completion을 등록하고, `#`와 `^` trigger로 section/block completion을 분리합니다. 이 패턴을 따르면 `[[Note#` 입력 후 heading 목록, `[[Note^` 입력 후 block id 목록을 제공할 수 있습니다.

> 출처: [Foam link completion provider](https://github.com/foambubble/foam/blob/main/packages/foam-vscode/src/vscode/features/navigation/link-completion.ts)

alt-click/Ctrl-click 이동은 `DocumentLinkProvider`가 맞습니다. Markdown Preview Enhanced는 `[[...]]` 범위를 찾아 `command:` URI로 넘긴 뒤, extension host에서 target 파일을 resolve하고 필요하면 missing note stub을 생성하는 구조를 씁니다. 이 방식은 WebView 안에서 직접 file system에 접근하지 않아도 되기 때문에 VS Code 보안 모델과 맞습니다.

> 출처: [Markdown Preview Enhanced wikilink document link provider](https://github.com/shd101wyy/vscode-markdown-preview-enhanced/blob/develop/src/wikilink-document-link-provider.ts)
> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

## Vditor Custom Editor 쪽

현재 repo는 `.md`를 `cweijan.markdownViewer`와 `cweijan.markdownViewer.optional` custom editor로 등록하고, Vditor 기반 webview를 띄웁니다. 그래서 preview 내부에서 링크를 클릭하는 UX는 WebView script가 `postMessage`로 extension host에 `openWikilink` 같은 command를 보내는 구조가 맞습니다.

> 로컬 근거: `package.json` customEditors, `src/extension.ts`, `src/provider/markdownEditorProvider.ts`, `resource/vditor/index.js`

Vditor 내부 파서를 직접 깊게 수정하는 것은 1차 구현에서는 피하는 편이 좋습니다. 이유는 편집기 provider, export pipeline, custom editor preview가 서로 다른 경로를 탈 수 있기 때문입니다. 공통 parser를 extension host에 두고, WebView는 “표시와 클릭 이벤트”만 담당하게 두는 편이 테스트가 쉽습니다.

> 로컬 근거: `resource/vditor/index.js`, `src/service/markdown/markdown-pdf.js`

## Export HTML/PDF 쪽

Markdown export는 `src/service/markdown/markdown-pdf.js`에서 `markdown-it` 인스턴스를 만들고 checkbox, anchor, toc, katex, plantuml, mermaid plugin을 붙입니다. 위키링크가 export 결과에도 살아야 한다면 여기에도 `wikilinkHtml` plugin을 연결해야 합니다.

> 로컬 근거: `src/service/markdown/markdown-pdf.js`

단, export용 wikilink는 editor 이동용 wikilink와 output이 다릅니다. editor에서는 `command:` URI를 써도 되지만 export HTML에는 상대 링크나 plain placeholder를 써야 합니다. 따라서 renderer option을 `mode: 'webview' | 'export'`로 나누는 것이 안전합니다.

> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

## 구현 순서

1. parser unit test를 먼저 작성합니다.
2. workspace index는 `.md`, `.markdown`만 대상으로 시작합니다.
3. editor completion은 파일명 target만 먼저 처리합니다.
4. `#heading` completion을 추가합니다.
5. preview 클릭 이동을 postMessage로 붙입니다.
6. missing note 생성은 마지막에 설정값 뒤에 둡니다.

이 순서가 안전한 이유는 target resolve가 흔들리면 자동완성, preview click, export가 전부 같이 흔들리기 때문입니다. parser와 resolver가 먼저 안정되어야 UI 기능을 붙여도 재작업이 줄어듭니다.

> 출처: [Foam link completion provider](https://github.com/foambubble/foam/blob/main/packages/foam-vscode/src/vscode/features/navigation/link-completion.ts)
> 출처: [Markdown Preview Enhanced releases](https://github.com/shd101wyy/vscode-markdown-preview-enhanced/releases)
