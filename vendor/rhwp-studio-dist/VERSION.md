# rhwp-studio Vendored Runtime

Upstream: https://github.com/edwardkim/rhwp
Pinned base tag: v0.7.16
Pinned base commit: de02159ab4d2c5d165d6e25568bad3f8af5ef6cb
Local patch commit: (none — find-dialog Enter capture merged upstream at v0.7.14+)
Supersedes: v0.7.13 local patch f887dca (PR #1281, closed unmerged; equivalent `keyCaptureHandler` present in v0.7.16 `find-dialog.ts`)
Wrapper package reference: @rhwp/editor@0.7.16

Build environment:
- Date: 2026-06-28
- Rust: rustc 1.95.0 (cargo 1.95.0)
- WASM target: wasm32-unknown-unknown
- wasm-pack: 0.15.0
- Node package manager: npm ci using rhwp-studio/package-lock.json

Build commands:

```bash
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --branch v0.7.16 https://github.com/edwardkim/rhwp /tmp/rhwp-upstream-v0.7.16
cd /tmp/rhwp-upstream-v0.7.16
wasm-pack build --target web
cd rhwp-studio
npm ci
npm run build
rsync -a --delete dist/ /Users/jun/Developer/new/700_projects/code-office/vendor/rhwp-studio-dist/
```

Notes:
- v0.7.16 includes upstream find/go-to Enter handling; no separate local patch required.
- The extension must load this local bundle through `webview.asWebviewUri`.
- The live default `https://edwardkim.github.io/rhwp/` runtime is not used by
  default in code-office.
