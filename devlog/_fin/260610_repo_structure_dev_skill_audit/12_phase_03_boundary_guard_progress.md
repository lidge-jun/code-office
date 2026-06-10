# 12 Phase 03 Boundary Guard Progress

## Scope

Implemented the non-feature structural guard slice from:

- `03.2_hwp_limit_guard.md`
- `03.3_pptx_component_boundary.md`
- `03.4_markdown_commonjs_boundary.md`

This phase does not add product behavior. It adds tests that keep future work routed to the right modules.

## HWP Guard Evidence

`src/test/hwpViewerModeTest.mjs` now verifies:

- `src/provider/hwp/HwpEditorProvider.ts` stays at or below the project-local 500-line limit.
- `src/react/view/hwp/rhwpBridge/createSecureRhwpEditor.ts` stays at or below the project-local 500-line limit.
- provider-side HWP modules do not import React or webview-side code.

Verification:

```text
npm run test:hwp-viewer-mode
PASS
```

## PPTX Guard Evidence

`src/test/pptxPhase4Test.mjs` now verifies:

- `src/react/view/pptx/Pptx.tsx` stays at or below the project-local 500-line limit.
- `PptxStatusBar.tsx`, `PptxPresenterChrome.tsx`, and `SlideThumbnail.tsx` stay focused under 350 lines.
- `Pptx.tsx` composes child components instead of inlining status bar, presenter, or thumbnail implementations.

Verification:

```text
npm run test:pptx-phase4
PASS
```

## Markdown Guard Evidence

`src/test/markdownCommonjsBoundaryTest.mjs` was added and wired into `package.json` through `test:markdown-commonjs-boundary` and `test:markdown`.

It verifies:

- the known Markdown export CommonJS files remain explicitly acknowledged legacy modules.
- new CommonJS usage under `src/service/markdown` is rejected unless added to the intentional allowlist.
- `MarkdownService` keeps the current export entrypoint stable until a separate ESM migration is approved.

Verification:

```text
npm run test:markdown-commonjs-boundary
PASS
```

Repository tracking note:

- `.gitignore` now scopes the legacy root test-output ignore to `/test/` instead of `test/`.
- This prevents future `src/test/*.mjs` guard tests from being silently ignored by Git.
