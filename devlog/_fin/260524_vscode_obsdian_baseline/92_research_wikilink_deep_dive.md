# 92 Research Wikilink Deep Dive

## 요약

위키링크는 parser-only 기능이 아니라 editor provider, workspace index, preview bridge, export renderer로 나눠야 합니다. 가장 재사용할 만한 구조는 Foam의 parser/completion 분리와 Markdown Preview Enhanced의 DocumentLinkProvider 패턴입니다.

> 출처: [Foam markdown-link parser](https://github.com/foambubble/foam/blob/main/packages/foam-core/src/services/markdown-link.ts)
> 출처: [Foam link completion provider](https://github.com/foambubble/foam/blob/main/packages/foam-vscode/src/vscode/features/navigation/link-completion.ts)
> 출처: [Markdown Preview Enhanced wikilink document link provider](https://github.com/shd101wyy/vscode-markdown-preview-enhanced/blob/develop/src/wikilink-document-link-provider.ts)

## 구현 영향

```text
src/extension.ts
src/provider/markdownEditorProvider.ts
resource/vditor/index.js
src/service/markdown/markdown-pdf.js
```

1차 구현은 `[[Note]]` completion과 alt-click부터 시작하고, preview click과 missing note creation은 후속으로 분리합니다.

> 세부 문서: [structure/research_notes/01_wikilink_architecture.md](../../../structure/research_notes/01_wikilink_architecture.md)
