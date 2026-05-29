# Architecture Baseline

## Easy Summary

`code-office`의 현재 코드는 VS Code 확장입니다. 파일을 열면 `package.json`의 `customEditors` 설정이 특정 확장자를 잡고, `src/extension.ts`가 등록한 provider가 WebView 또는 React 기반 화면을 띄웁니다. Markdown은 Vditor 기반 커스텀 텍스트 에디터로 열리고, Office/이미지/압축/폰트/PDF 계열은 readonly custom editor로 열립니다.

VS Code custom editor는 사용자에게 보이는 WebView와 파일을 이해하는 document model이 분리되어 있습니다. 텍스트 파일은 `CustomTextEditorProvider`, 바이너리/readonly 파일은 `CustomReadonlyEditorProvider` 또는 `CustomEditorProvider` 계열로 다루는 구조가 맞습니다.

> 출처: [VS Code Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)

## Repository Snapshot

```text
code-office/
├── package.json
├── src/
│   ├── extension.ts
│   ├── provider/
│   │   ├── markdownEditorProvider.ts
│   │   ├── officeViewerProvider.ts
│   │   ├── hwp/
│   │   ├── compress/
│   │   └── handlers/
│   ├── service/
│   │   ├── markdownService.ts
│   │   ├── markdown/
│   │   └── zip/
│   ├── common/
│   └── react/
│       ├── main.tsx
│       ├── view/
│       │   ├── compress/
│       │   ├── excel/
│       │   ├── fontViewer/
│       │   ├── hwp/
│       │   ├── image/
│       │   └── word/
│       └── util/
├── resource/
│   ├── pdf/
│   ├── rhwp-studio/
│   ├── vditor/
│   └── lib/
├── styles/
├── syntaxes/
├── snippets/
├── theme/
├── template/
├── structure/
└── devlog/
```

## Entry Points

`src/extension.ts` is the extension activation entry. It initializes common services, registers commands, registers Markdown custom editors, and registers Office/image/HTML custom editors through `OfficeViewerProvider`.

Observed activation and registration responsibilities:

- `FileUtil.init(context)` stores extension context for file path helpers.
- `ReactApp.init(context)` sets the compiled React WebView path and development mode flag.
- `MarkdownService` handles Markdown export and image paste helpers.
- `MarkdownEditorProvider` handles `.md`/`.markdown` as editable custom text editor.
- `HwpEditorProvider` handles `.hwp`/`.hwpx` as editable custom editor.
- `OfficeViewerProvider` routes binary/read-only preview formats.
- HTTP request support is loaded from `src/bundle/extension` through `require`.

## Package Manifest Routing

`package.json` currently declares:

- package name: `code-office`
- display name: `code-office`
- publisher: `jun6161`
- configuration mix: HWP settings use `code-office.hwp.*`; inherited Markdown/HTTP/preview settings still use `vscode-office.*`
- command mix: new owned commands use `code-office.*`; inherited commands still use `office.*` and `vscode-office.*`
- custom view types: `cweijan.officeViewer`, `cweijan.imageViewer`, `cweijan.markdownViewer`, `cweijan.htmlViewer`
- HWP custom view type: `cweijan.hwpEditor`

The public identity metadata, visible editor labels, HWP settings, and new owned commands are now branded as `code-office`. Inherited runtime command IDs, most inherited configuration keys, and `viewType` IDs intentionally remain legacy identifiers until a compatibility migration plan exists. VS Code recommends unique `viewType` values because `customEditors` connect manifest entries to registered providers, so that migration should be tested as a dedicated phase.

> 출처: [VS Code Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)

## Custom Editor Flow

### Markdown

Markdown uses `MarkdownEditorProvider`:

```text
package.json customEditors
  -> cweijan.markdownViewer
  -> src/extension.ts registerCustomEditorProvider
  -> MarkdownEditorProvider.resolveCustomTextEditor
  -> resource/vditor/index.html + index.js + util.js
  -> WebView postMessage bridge
  -> updateTextDocument / externalUpdate / fileChange / save
```

Markdown file content is synchronized through:

- `handler.on("init")` to open the document content in Vditor
- `handler.on("save")` to apply a `WorkspaceEdit`
- `handler.on("doSave")` to save via VS Code command
- `handler.on("externalUpdate")` and `handler.on("fileChange")` to refresh WebView state

This is the right surface for Obsidian-style wiki link behavior because the rendered/editor DOM and link-click handling already live in `resource/vditor/util.js`.

### Office / Binary Preview

Office-like formats use `OfficeViewerProvider`:

```text
package.json customEditors
  -> cweijan.officeViewer
  -> OfficeViewerProvider.resolveCustomEditor
  -> extname(uri.fsPath)
  -> route
  -> ReactApp.view(webview, { route })
  -> src/react/main.tsx route switch
```

Current file routing:

| Extension | Current Route | Main UI |
| --- | --- | --- |
| `.xlsx`, `.xlsm`, `.xls`, `.csv`, `.ods` | `excel` | `src/react/view/excel/Excel.tsx` |
| `.docx`, `.dotx` | `word` | `src/react/view/word/Word.tsx` |
| `.pdf` | bundled PDF viewer | `resource/pdf/viewer.html` |
| `.zip`, `.jar`, `.apk`, `.vsix` | `zip` | `src/react/view/compress/Zip.tsx` |
| `.rar` | `zip` | RAR handler + zip UI |
| font extensions | `font` | `src/react/view/fontViewer/FontViewer.tsx` |
| image extensions | `image` | `src/react/view/image/Image.tsx` |
| `.html`, `.htm` | raw HTML preview | `Util.buildPath` |

Future PPTX support belongs here because `.pptx` is not a text document and should not be handled by the Markdown provider.

### HWP / HWPX

HWP/HWPX no longer uses the readonly Office viewer path. It has a dedicated
editable provider:

```text
package.json customEditors
  -> cweijan.hwpEditor
  -> src/extension.ts registerCustomEditorProvider
  -> src/provider/hwp/HwpEditorProvider.ts
  -> ReactApp.view(route: hwp)
  -> src/react/view/hwp/Hwp.tsx
  -> bundled resource/rhwp-studio direct local mount
```

The default rhwp runtime is bundled under `resource/rhwp-studio`. The React HWP
view mounts that bundle inside the host WebView document to preserve the full
rhwp editor UI and avoid nested `srcdoc` resource resolution failures. The
bridge keeps remote `code-office.hwp.studioUrl` as explicit opt-in and uses
source/origin-checked iframe messaging only for that remote path.

Implemented VS Code lifecycle:

- `CustomEditorProvider<HwpCustomDocument>`
- dirty event via `onDidChangeCustomDocument`
- native `save`, `saveAs`, `revert`, and `backup`
- format-aware HWP/HWPX export and write guards

## WebView Resource Boundary

VS Code WebViews cannot directly access arbitrary local resources. Local files must be converted through `Webview.asWebviewUri`, and additional filesystem access must be explicitly allowed through `localResourceRoots`.

> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

Current code already uses:

- `webview.asWebviewUri(...)`
- `localResourceRoots`
- `enableScripts: true`
- `postMessage` bridge via `Handler`

Security note: WebView docs recommend using the minimum needed capabilities, restrictive `localResourceRoots`, and a Content Security Policy. Current code enables scripts and permits workspace/document resources, so any future wiki-link or PPTX media work must validate paths carefully.

> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

## Build System

Observed build stack:

- TypeScript extension entry bundled by `esbuild` through `build.ts`
- React WebView bundled by Vite into `out/webview`
- rhwp-studio runtime copied from `vendor/rhwp-studio-dist` into
  `resource/rhwp-studio`, then patched for VS Code WebView asset paths and WASM
  fetches
- package scripts:
  - `npm run dev`
  - `npm run typecheck`
  - `npm run build`
  - `npm run verify:hwp`
  - `npm run verify:release`
  - `npm run package`
  - `npm run package:verify`
  - `npm run release:local`
  - `npm run publish`
- root `tsconfig.json` uses CommonJS output for extension code
- `src/react/tsconfig.json` uses ESM-oriented Vite/React settings

Release build flow:

```text
vendor/rhwp-studio-dist
  -> build.ts copy plugin
  -> resource/rhwp-studio
  -> bridge/path rewrite
  -> scripts/verify-hwp-hardening.mjs
  -> vsce package
  -> scripts/verify-vsix.mjs
```

`resource/rhwp-studio` is generated and gitignored. Release checks must run
`npm run build` before smoke or package verification.

Important constraint: the current repo mixes CommonJS build output and ESM React code. Any future migration toward stricter ESM needs a dedicated phase; it should not be hidden inside feature work.

## Known Architecture Debts

- `package.json` public identity is rebranded, but inherited runtime IDs still use legacy prefixes.
- `viewType` IDs are still `cweijan.*`.
- most inherited config remains under `vscode-office.*`; HWP settings are `code-office.hwp.*` with legacy fallback reads.
- Markdown WebView currently lacks explicit Obsidian wiki-link parsing.
- PPTX is registered in `customEditors`, but the preview remains stabilization
  work rather than a full-fidelity PowerPoint renderer.
- `vditor/` submodule is empty after clone until submodules are initialized.
- Several bundled upstream files exceed the local 500-line preference; treat these as vendor/bundled legacy unless touched.
- README/README-CN/README-KO now use product wording and preserve attribution
  through NOTICE.
