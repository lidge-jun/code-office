# rhwp-studio Vendored Runtime

Upstream: https://github.com/edwardkim/rhwp
Pinned base tag: v0.7.13
Pinned base commit: b3e16ef212af81ef37d973ddb86d6816d3804642
Local patch commit: f887dca46fee37383012625a9227b3c599545a36
Upstream PR: https://github.com/edwardkim/rhwp/pull/1281
Wrapper package reference: @rhwp/editor@0.7.13

Build environment:
- Date: 2026-06-03
- Rust: cargo 1.93.1
- WASM target: wasm32-unknown-unknown
- wasm-pack: 0.15.0
- Node package manager: npm ci using rhwp-studio/package-lock.json

Build commands:

```bash
git clone https://github.com/edwardkim/rhwp /tmp/rhwp-upstream-enter-find
cd /tmp/rhwp-upstream-enter-find
git checkout -b fix/find-dialog-enter-routing v0.7.13
# Apply local find-dialog Enter capture patch.
wasm-pack build --target web
cd rhwp-studio
npm ci
npm run build
rsync -a --delete dist/ /Users/jun/Developer/new/700_projects/code-office/vendor/rhwp-studio-dist/
```

Notes:
- The local patch keeps Enter/Shift+Enter captured by the rhwp find dialog even
  after a search result moves focus into the document editing surface.
- The patch prevents repeated Enter from being interpreted by the document
  editor as text insertion/deletion while the find dialog is open.
- The extension must load this local bundle through `webview.asWebviewUri`.
- The live default `https://edwardkim.github.io/rhwp/` runtime is not used by
  default in code-office.
