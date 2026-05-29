# Comparable Repositories And Applicable Methods

## Summary

이번 추가 조사는 “비슷한 repo를 그대로 베끼기”가 아니라, `code-office`의 현재 구조에 맞게 어떤 구현 패턴만 가져올 수 있는지 보는 데 집중했습니다.

결론은 분명합니다.

- Wiki link는 Foam처럼 VS Code provider 생태계를 참고하되, 우리 쪽 구현은 Vditor WebView + extension host resolver로 작게 시작하는 것이 맞습니다.
- Markdown preview 전용 plugin 방식은 빠르지만, `code-office`은 custom editor라 preview-only 한계를 그대로 가져오면 안 됩니다.
- PPTX는 pure JS OOXML-to-HTML 방식과 LibreOffice-to-PDF 방식이 갈립니다. 첫 구현은 pure JS outline/text/media preview가 더 맞고, LibreOffice는 옵션형 fallback로만 검토해야 합니다.
- Graph/backlinks/hover preview/rename sync는 나중 phase입니다.

## Research Method

Used:

- GitHub API repository search
- GitHub README/package/source inspection
- Web search
- `agbrowse web-ai query --vendor grok --model expert`

Grok Expert session:

```text
Session ID: 01KSBYBHPDB39R1PF8019H190V
URL: https://grok.com/c/7ae0f4d9-a265-4efe-9cb2-d1b853291a54?rid=6cae98fd-ed30-4aa7-9241-5287cf509932
```

## Candidate Matrix

20-80 scouting scale:

- 20: avoid
- 30: limited utility
- 40: useful with care
- 50: average/reference-worthy
- 60: strong fit
- 70: powerful but risky/heavy
- 80: ideal

Here “grade” means implementation fit for `code-office`, not project quality.

| Candidate | Domain | License Signal | Fit Grade | Learn | Do Not Copy |
| --- | --- | --- | ---: | --- | --- |
| `foambubble/foam` | VS Code PKM/wiki links | MIT | 60 | mature wikilink, alias, section, backlinks, rename-sync patterns | full PKM scope, graph/backlinks in phase 1 |
| `thomaskoppelaar/vscode-markdown-preview-wikilinks` | VS Code Markdown preview wikilinks | MIT | 45 | `markdown.markdownItPlugins`, wiki-link slug/label transforms | preview-only navigation, forced `.md` assumptions |
| `thomaskoppelaar/markdown-it-wikilinks` | markdown-it plugin | MIT lineage | 45 | parser options: `generatePageNameFromLabel`, `postProcessPageName`, `postProcessLabel`, suffixes | direct adoption into Vditor without checking parser compatibility |
| `appsoftwareltd/as-notes` | VS Code PKM | Elastic-2.0 shown in README | 35 | product-scope ideas: nested wikilinks, backlinks, local indexing | license-incompatible copying, Pro/product scope |
| `mii-key/obsidian-links` | Obsidian plugin | MIT | 30 | link conversion feature map | Obsidian APIs, plugin assumptions |
| `g21589/PPTX2HTML` | PPTX to HTML in browser | MIT | 55 | pure JS worker pipeline, JSZip/tXml, HTML slide output | beta fidelity claims, jQuery/global-script style |
| `@jvmr/pptx-to-html` / `javier-mora/pptx-to-html` | TypeScript PPTX to HTML | MIT | 50 | ESM TS library, slide HTML strings, EMU scaling, basic shapes/tables/charts | immature 4-commit dependency without audit |
| `mutyai/pptviewer` | VS Code PPT custom editor | MIT | 35 | custom editor + PDF.js resource flow, LibreOffice path handling | mandatory LibreOffice dependency in phase 1 |

## Wiki Link Findings

### Foam

Foam is the strongest reference for behavior, not for direct architecture. It supports graph visualization, link autocompletion, rename syncing, unique identifiers across directories, section links with `[[resource#Section Title]]`, aliases with `[[wikilink|alias]]`, backlinks, placeholders, syntax highlighting, and generated references for wikilinks.

> 출처: [foambubble/foam README](https://github.com/foambubble/foam)

Foam also declares VS Code integration points such as `markdown.markdownItPlugins`, `markdown.previewStyles`, `markdown.previewScripts`, grammar injections, and sidebar views in `packages/foam-vscode/package.json`.

> 출처: [foambubble/foam package.json](https://github.com/foambubble/foam/blob/main/packages/foam-vscode/package.json)

Applicable to `code-office`:

- Use Foam as behavior reference.
- Keep phase 1 smaller than Foam.
- Avoid building graph/backlinks immediately.
- Consider later VS Code providers:
  - completion provider for `[[`
  - definition provider for go-to-note
  - reference provider for backlinks
  - rename provider for link sync

First implementation should remain inside:

```text
resource/vditor/util.js
resource/vditor/index.js
src/provider/markdownEditorProvider.ts
```

### Markdown Preview Wikilinks

`vscode-markdown-preview-wikilinks` contributes `markdown.markdownItPlugins` and wraps `@thomaskoppelaar/markdown-it-wikilinks`. It supports preview rendering and piped links, but its README states preview-only limitations: clicking a link updates the preview, not the editor, and extension differences like `.markdown` vs `.md` can cause trouble.

> 출처: [vscode-markdown-preview-wikilinks README](https://github.com/thomaskoppelaar/vscode-markdown-preview-wikilinks)

Its manifest is useful because it shows the simplest VS Code route:

```json
"contributes": {
  "markdown.markdownItPlugins": true
}
```

> 출처: [vscode-markdown-preview-wikilinks package.json](https://github.com/thomaskoppelaar/vscode-markdown-preview-wikilinks/blob/master/package.json)

Applicable to `code-office`:

- Borrow the parser option vocabulary.
- Do not settle for preview-only navigation.
- Do not force `.md` suffix without workspace resolution.
- Our custom Vditor editor needs an extension-host resolver.

### markdown-it-wikilinks

The plugin exposes the exact kinds of hooks worth reproducing:

- `baseURL`
- `relativeBaseURL`
- `uriSuffix`
- `htmlAttributes`
- `generatePageNameFromLabel`
- `postProcessPageName`
- `postProcessLabel`

> 출처: [markdown-it-wikilinks README](https://github.com/thomaskoppelaar/markdown-it-wikilinks)

Applicable method:

Implement our own small parser first rather than adopting the dependency immediately. Keep the same conceptual hooks in mind so future behavior is not boxed in.

Proposed first parser shape:

```text
parseWikiLink("[[Target|Alias]]")
  -> target: "Target"
  -> alias: "Alias"
  -> heading: null
  -> embed: false

parseWikiLink("[[Target#Heading]]")
  -> target: "Target"
  -> alias: null
  -> heading: "Heading"
  -> embed: false
```

### AS Notes

AS Notes is useful as a product-scope warning. Its README describes nested wikilinks, backlinks, task management, local indexing, journals, kanban, slash commands, and publishing. That is far beyond phase 1.

> 출처: [appsoftwareltd/as-notes README](https://github.com/appsoftwareltd/as-notes)

Applicable to `code-office`:

- Keep “plain Markdown, local workspace, Git-friendly” as UX principle.
- Do not import AS Notes code; README indicates Elastic-2.0 licensing, not MIT.
- Use nested wikilinks as future research only.

## PPTX Findings

### PPTX2HTML

`g21589/PPTX2HTML` converts MS-PPTX to HTML with pure JavaScript. Its README lists support for text, pictures, charts, tables, text blocks, drawings, groups, and theme/layout, and identifies the project as MIT.

> 출처: [g21589/PPTX2HTML README](https://github.com/g21589/PPTX2HTML)

Its implementation uses browser-era pieces such as `jszip.min.js`, `tXml`, `worker.js`, jQuery, and global scripts.

> 출처: [g21589/PPTX2HTML js directory](https://github.com/g21589/PPTX2HTML/tree/master/js)

Applicable to `code-office`:

- Strong proof that pure browser-side PPTX parsing is feasible.
- Worker pattern is useful for not blocking WebView.
- Do not copy global/jQuery style directly.
- Audit XML sanitization before rendering generated HTML.

### @jvmr/pptx-to-html

`@jvmr/pptx-to-html` is a modern TypeScript library that returns one HTML string per slide from a PPTX ArrayBuffer. It documents support for text boxes, images, shapes/connectors, tables, and common chart types, with explicit limitations around pixel-perfect fidelity, animations, transitions, SmartArt, embedded audio/video, 3D, advanced chart options, fonts, and memory use.

> 출처: [javier-mora/pptx-to-html README](https://github.com/javier-mora/pptx-to-html)

Its `package.json` is ESM-only and depends on `jszip`.

> 출처: [javier-mora/pptx-to-html package.json](https://github.com/javier-mora/pptx-to-html/blob/main/package.json)

Applicable to `code-office`:

- Good candidate for later dependency evaluation.
- ESM may fit React WebView better than extension host CommonJS.
- Low repo maturity means it must be audited before adoption.
- Its stated limitations are exactly the wording we should use in README if adopted.

### Muty PPT Viewer

`mutyai/pptviewer` is a direct VS Code custom editor reference for PPT. It registers a custom readonly editor for `.pptx` and `.ppt`, converts through LibreOffice, then loads the produced PDF into a PDF.js WebView.

> 출처: [mutyai/pptviewer README](https://github.com/mutyai/pptviewer)

Its manifest exposes:

- `customEditors`
- `filenamePattern` for `*.pptx` and `*.ppt`
- `libreOfficePath` setting
- command to open PowerPoint preview

> 출처: [mutyai/pptviewer package.json](https://github.com/mutyai/pptviewer/blob/main/package.json)

Applicable to `code-office`:

- Good reference for custom editor wiring.
- Good fallback design if pure JS fidelity is unacceptable.
- Bad phase-1 dependency because it requires external LibreOffice.

## Recommended Implementation Tracks

### Track A — Wiki Link Minimal

Grade: 60

Why:

- high user value
- low dependency need
- fits current Markdown custom editor

Method:

1. Parse `[[...]]` in WebView rendering pass.
2. Show unresolved/resolved styling.
3. On click, send `wikiLinkOpen` to extension host.
4. Resolve target inside workspace.
5. Open target `.md`.

Avoid:

- backlinks
- rename sync
- hover preview
- graph

### Track B — Wiki Link Provider Layer

Grade: 45

Why:

- more complete VS Code-native behavior
- more moving parts

Method:

- completion provider
- definition provider
- reference provider
- rename tracking

This should come after Track A.

### Track C — PPTX Pure JS Outline/Text Preview

Grade: 55

Why:

- offline/local
- no external binary
- can start with existing ZIP knowledge

Method:

1. Register `.pptx`.
2. Read package.
3. Extract slide order and text.
4. Render slide cards.
5. List media.

Avoid:

- claiming PowerPoint fidelity
- rendering unsanitized XML/HTML

### Track D — PPTX HTML Renderer Library

Grade: 50

Why:

- stronger visual result
- dependency/audit cost

Candidate:

- `@jvmr/pptx-to-html`
- possibly selected pieces from `PPTX2HTML`

Use only after fixture testing.

### Track E — LibreOffice PDF Fallback

Grade: 35 for phase 1, 55 as optional later fallback

Why:

- best fidelity among simple options
- external dependency and path support hurt portability

Use only as opt-in setting later.

## Failed / Unverified Lookups

The following exact source-path lookups failed and are not used as implementation evidence:

- `mii-key/obsidian-links/src/RegExPatterns.ts` returned 404.
- `thomaskoppelaar/vscode-markdown-preview-wikilinks/src/extension.ts` returned 404 because the repo uses `src/extension.js`.
- `foambubble/foam/packages/foam-core/src/model/links.ts` returned 404.

These projects remain useful at README/package level only until their exact internal paths are inspected.

## Next Research Queue

1. Inspect actual Foam link parser/provider paths.
2. Inspect `PPTX2HTML` worker parser entry and generated HTML escaping.
3. Build a tiny local fixture set:
   - simple PPTX with text only
   - PPTX with images
   - PPTX with chart/table
4. Compare pure extraction vs `@jvmr/pptx-to-html` output.
5. Decide whether `.ppt` binary support is out of scope or LibreOffice-only.
