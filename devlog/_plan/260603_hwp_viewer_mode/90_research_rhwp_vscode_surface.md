---
created: 2026-06-03
tags: [code-office, rhwp-vscode, research, mit]
---
# Research - rhwp-vscode Surface

## Upstream Version and License

Checked on 2026-06-03:

- GitHub latest release: `v0.7.13`, published `2026-05-26T13:57:15Z`.
- GitHub license: MIT.
- Open VSX `edwardkim.rhwp-vscode`: `0.7.13`, MIT, repository `https://github.com/edwardkim/rhwp.git`.

## VSIX Feature Surface

Downloaded/unpacked extension:

```path
/tmp/rhwp-vscode-0.7.13/unpacked/extension
```

Observed package contribution:

- custom editor: `rhwp.hwpViewer`
- default HWP/HWPX selector: `*.hwp`, `*.hwpx`
- commands:
  - `rhwp.exportSvg`
  - `rhwp.debugOverlay`
  - `rhwp.dumpParagraph`

## Integration Decision

code-office will not register `rhwp.hwpViewer`.

Instead, code-office will absorb the behavior into the existing `cweijan.hwpEditor` provider to keep compatibility with current editor associations, save lifecycle hardening, and user settings.

## Useful Upstream Implementation Patterns

- `exportSvg`: provider asks opened WebView for SVGs and writes `basename_p{n}.svg`.
- `debugOverlay`: provider asks opened WebView for SVGs and writes a temporary HTML debug page.
- `dumpParagraph`: provider initializes rhwp WASM in the extension host, then writes paragraph/line info to an output channel.

## Current code-office Runtime Surface

The patched local rhwp-studio asset already exposes:

- `window.__rhwpBridge.ready`
- `window.__rhwpBridge.loadFile`
- `window.__rhwpBridge.pageCount`
- `window.__rhwpBridge.getPageSvg`
- `window.__rhwpBridge.exportHwp`
- `window.__rhwpBridge.exportHwpx`
- `window.__rhwpBridge.markClean`

The TypeScript `SecureRhwpEditor` wrapper currently exposes only:

- `loadFile`
- `exportHwp`
- `exportHwpx`
- `markClean`
- `destroy`

Therefore the first implementation step is exposing `pageCount` and `getPageSvg` through the typed bridge without weakening the existing postMessage/token validation.
