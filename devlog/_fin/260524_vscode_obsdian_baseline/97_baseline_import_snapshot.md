# 97 Baseline Import Snapshot

## Goal

현재 가져온 원본 소스의 구조를 고정하고, 이후 변경이 어떤 레이어에 들어가야 하는지 명확히 한다.

## Current Facts

```text
Local path:
/Users/jun/Developer/new/700_projects/vscode_obsdian

Source:
https://github.com/rjwang1982/vscode-office

Original upstream lineage:
https://github.com/cweijan/vscode-office

License:
MIT

Primary stack:
VS Code Extension + TypeScript + React + Vite + Vditor
```

## Existing Key Files

| Path | Role |
| --- | --- |
| `package.json` | extension manifest, custom editors, commands, config, scripts |
| `src/extension.ts` | activation and provider registration |
| `src/provider/officeViewerProvider.ts` | binary/read-only preview routing |
| `src/provider/markdownEditorProvider.ts` | Markdown custom text editor provider |
| `src/service/markdownService.ts` | Markdown export, image paste, Chromium path |
| `src/common/handler.ts` | WebView message bridge |
| `src/common/reactApp.ts` | React WebView HTML loading |
| `src/react/main.tsx` | React route switch |
| `resource/vditor/index.js` | Vditor initialization |
| `resource/vditor/util.js` | Markdown toolbar/link/context menu helpers |

## Baseline Commands Already Observed

```text
npm run dev
npm run build
npm run package
npm run publish
```

## Implementation Readiness

This snapshot records the imported source before active implementation phases. Rebranding now begins at Phase 1, while the original import facts stay here for audit history.

## Done Criteria

- `structure/architecture.md` exists
- `structure/conventions.md` exists
- `structure/risks.md` exists
- no source files changed
- no package metadata changed
