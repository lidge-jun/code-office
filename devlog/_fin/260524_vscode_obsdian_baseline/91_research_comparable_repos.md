# 91 Research — Comparable Repos And Methods

## Query Metadata

```text
Tool: agbrowse
Command shape: agbrowse web-ai query --vendor grok --model expert --inline-only --new-tab
Vendor: grok
Model: expert
Session ID: 01KSBYBHPDB39R1PF8019H190V
Conversation URL: https://grok.com/c/7ae0f4d9-a265-4efe-9cb2-d1b853291a54?rid=6cae98fd-ed30-4aa7-9241-5287cf509932
Date: 2026-05-24
```

## Purpose

Find adjacent repositories and implementation approaches that can inform `vscode_obsdian` without changing code yet.

## Repo Search Results

GitHub API searches surfaced these direct candidates:

```text
Wiki links / Markdown:
- foambubble/foam
- thomaskoppelaar/vscode-markdown-preview-wikilinks
- thomaskoppelaar/markdown-it-wikilinks
- appsoftwareltd/as-notes
- mii-key/obsidian-links

PPTX:
- g21589/PPTX2HTML
- javier-mora/pptx-to-html
- mutyai/pptviewer
```

## Implementation Lessons

### Wiki Links

Foam is the best behavior reference. It supports aliases, section links, backlinks, placeholder notes, generated references, graph, and rename sync. But phase 1 should only take the small link-resolution model, not the PKM suite.

> 출처: [foambubble/foam](https://github.com/foambubble/foam)

`vscode-markdown-preview-wikilinks` shows the smallest VS Code path through `markdown.markdownItPlugins`, but it is preview-only and does not fit our Vditor custom editor directly.

> 출처: [vscode-markdown-preview-wikilinks](https://github.com/thomaskoppelaar/vscode-markdown-preview-wikilinks)

`markdown-it-wikilinks` is useful because its option surface maps cleanly to our future parser: page-name generation, suffix handling, label post-processing, and custom attributes.

> 출처: [markdown-it-wikilinks](https://github.com/thomaskoppelaar/markdown-it-wikilinks)

### PPTX

`PPTX2HTML` proves browser-side PPTX parsing is feasible. It is MIT and uses pure JS with JSZip/tXml, but the style is older global browser JS, so it should be studied, not copied directly.

> 출처: [g21589/PPTX2HTML](https://github.com/g21589/PPTX2HTML)

`@jvmr/pptx-to-html` is more modern TypeScript/ESM and explicitly documents practical, not pixel-perfect, fidelity. It returns slide HTML strings from an ArrayBuffer and depends on JSZip.

> 출처: [javier-mora/pptx-to-html](https://github.com/javier-mora/pptx-to-html)

`mutyai/pptviewer` is the best reference for VS Code PPT custom editor wiring, but not for our first renderer path because it requires LibreOffice.

> 출처: [mutyai/pptviewer](https://github.com/mutyai/pptviewer)

## 20-80 Grades

| Track | Grade | Reason |
| --- | ---: | --- |
| Minimal Vditor wiki-link render/click/open | 60 | high value, local, no heavy dependency |
| VS Code provider layer for completion/definition/backlinks | 45 | good later, too broad for phase 1 |
| pure JS PPTX outline/text/media preview | 55 | local and feasible, honest fidelity |
| `@jvmr/pptx-to-html` visual renderer evaluation | 50 | promising but immature |
| `PPTX2HTML` direct adoption | 40 | feasible but old style and beta |
| LibreOffice-to-PDF fallback | 35 now / 55 later | fidelity good, portability weak |
| full Foam-like PKM clone | 25 | scope explosion |

## Recommended Next Steps

1. Keep current docs-only baseline.
2. Add fixture research before PPTX coding.
3. For wiki links, implement parser/resolver tests before WebView behavior.
4. Treat `README` wording carefully: “PPTX preview” must not imply PowerPoint fidelity.
5. Do not add any of these dependencies until a small fixture comparison is done.

## Failed Lookups

These exact path lookups failed during research and should not be treated as evidence:

```text
mii-key/obsidian-links/src/RegExPatterns.ts -> 404
thomaskoppelaar/vscode-markdown-preview-wikilinks/src/extension.ts -> 404
foambubble/foam/packages/foam-core/src/model/links.ts -> 404
```

They can be rechecked later by listing repository trees first.
