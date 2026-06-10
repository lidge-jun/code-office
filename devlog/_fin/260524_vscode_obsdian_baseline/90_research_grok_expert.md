# 90 Research — agbrowse Grok Expert

## Query Metadata

```text
Tool: agbrowse
Command shape: agbrowse web-ai query --vendor grok --model expert --inline-only --new-tab
Vendor: grok
Model: expert
Session ID: 01KSBXRY8G9BAEKW7REYNQ3FWM
Conversation URL: https://grok.com/c/8bcf7dc7-f002-4b78-b04e-325b43a16396?rid=6b50322b-c3c4-4779-9e90-fef035387d6b
Date: 2026-05-24
```

## Prompt Summary

The prompt asked Grok Expert to review the imported MIT VS Code extension codebase at a planning level only. It supplied the local inspection summary and requested recommendations for:

- architecture baseline
- Obsidian-style wiki links
- PPTX support
- strikethrough handling
- MIT attribution in a non-fork new repository
- structure/devlog scaffold

## Grok Conclusions To Preserve

Grok recommended documenting the full VS Code custom editor flow before implementation:

- `src/extension.ts` registers providers
- `officeViewerProvider.ts` routes by extension
- `markdownEditorProvider.ts` and `markdownService.ts` load Vditor
- WebView message passing is the key integration boundary
- package manifest controls file associations and activation

Grok recommended wiki links be handled in the Markdown/Vditor custom editor path:

- transform or render `[[Page|Alias]]`
- route clicks through the existing WebView message bridge
- resolve files in extension host
- validate workspace boundaries

Grok recommended PPTX first pass as extraction preview:

- use existing ZIP parsing
- parse `ppt/presentation.xml`
- parse `ppt/slides/slide*.xml`
- extract slide text and media
- avoid full fidelity claims

Grok recommended treating strikethrough as two separate investigations:

- Markdown/Vditor strike
- spreadsheet/x-spreadsheet strike

Grok recommended adding:

- architecture docs
- devlog docs
- roadmap docs
- attribution/notice docs

## Cross-Checked External Sources

VS Code custom editors separate WebView UI and document model, and custom editor contributions bind manifest view types to provider implementations.

> 출처: [VS Code Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)

VS Code WebViews require `asWebviewUri` for local resources and should restrict `localResourceRoots` plus CSP.

> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

Obsidian supports Wikilink internal links such as `[[Page]]`, link display text with `|`, and heading links with `#`.

> 출처: [Obsidian Internal Links](https://help.obsidian.md/Linking%20notes%20and%20files/Internal%20links)

PresentationML uses slide parts and package relationships; a `.pptx` can be explored as a ZIP package.

> 출처: [Microsoft Learn - Structure of a PresentationML document](https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document)

MIT license notices should remain included in copies/modifications.

> 출처: [MIT Copyright Notice](https://web.mit.edu/ivlib/www/copyright.html)

## Caveats

Grok output is an AI research artifact, not a primary source. The implementation plan should rely on local source inspection and official docs first.
