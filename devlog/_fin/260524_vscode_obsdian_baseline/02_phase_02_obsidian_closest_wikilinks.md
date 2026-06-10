# 02 Phase 02 — Obsidian Closest-Note Wiki Links

## Goal

Markdown editor에서 Obsidian식 `[[Wiki Link]]`를 클릭 가능한 내부 링크로 처리한다.

## Supported Syntax For First Pass

Obsidian은 Wikilink 형식으로 `[[Page]]`, `[[Page.md]]`, `[[Page#Heading]]`, `[[Page|Alias]]` 같은 링크를 지원한다. Obsidian의 file/link 설정에는 shortest unique path, current file relative path, vault absolute path 전략도 있으므로, 이 프로젝트의 MVP는 “현재 문서 기준 가장 가까운 note + workspace shortest unique path”에 맞춘다.

> 출처: [Obsidian Internal Links](https://help.obsidian.md/Linking%20notes%20and%20files/Internal%20links)
> 출처: [Obsidian Settings - Files and links](https://help.obsidian.md/settings)

First pass:

- `[[Page]]`
- `[[Page.md]]`
- `[[folder/Page]]`
- `[[Page|Alias]]`
- `[[Page#Heading]]`

Out of scope:

- `![[embed]]`
- `[[^block]]`
- backlinks graph
- rename tracking
- hover preview
- alias database from frontmatter

## Likely Touch Points

Do not execute yet.

```text
MODIFY resource/vditor/util.js
  - detect rendered wiki links
  - attach click handlers or transform safe anchors
  - emit wiki-link-open events to extension host

MODIFY resource/vditor/index.js
  - initialize wiki link pass after editor render/update if needed

MODIFY src/provider/markdownEditorProvider.ts
  - handle wiki-link-open
  - resolve target inside workspace
  - open existing file through VS Code API
  - optionally create missing file only if user confirms policy
```

## Resolution Algorithm Draft

1. Parse link body.
2. Split alias by first `|`.
3. Split heading by first `#`.
4. Normalize `.md` extension.
5. If target includes a path, resolve it relative to the current document folder first.
6. If target is basename-only, check the current folder and nearby relative paths first.
7. Search workspace markdown files second.
8. Auto-resolve only when basename is unique or the shortest unique path is unambiguous.
9. If multiple candidates remain, show suggestions instead of guessing.
10. Reject paths outside workspace.
11. Open target with default editor or Markdown custom editor based on desired UX.

## Security Requirements

VS Code WebView local resource loading is intentionally restricted. Path resolution should happen in the extension host, not directly inside the WebView.

> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

Rules:

- Do not let WebView open arbitrary `file://` links.
- Do not trust link text as a path.
- Reject absolute paths unless a later explicit setting allows them.
- Do not silently pick one of several same-name notes.
- Escape/sanitize rendered label text.

## Tests To Add Later

- unit parser tests for wiki link bodies
- workspace resolution tests
- click smoke test in extension host
- existing Markdown link behavior regression
- external URL click regression

## Done Criteria

- `[[Page]]` renders/acts as internal link
- `[[Page|Alias]]` displays alias
- closest-note resolution is documented and covered by tests
- ambiguous same-name notes produce suggestions
- missing page behavior is documented
- external links still work
- build passes
