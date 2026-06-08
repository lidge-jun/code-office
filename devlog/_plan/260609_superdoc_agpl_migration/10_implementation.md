# 10 Implementation — SuperDoc AGPL DOCX Migration

Date: 2026-06-09
Branch: main
Goal: Replace the code-office DOCX product surface with SuperDoc, update the
top-level license to AGPL-3.0-or-later, and keep the VS Code save lifecycle
under the existing CustomEditorProvider bridge.

## Official Source Check

SuperDoc documentation states that SuperDoc renders and edits DOCX files in the
browser and is dual licensed: AGPLv3 for open-source/community use, commercial
license for proprietary deployments.

Sources checked:

- https://docs.superdoc.dev/
- https://docs.superdoc.dev/resources/license
- installed package metadata:
  - `@superdoc-dev/react@1.10.0` license: `AGPL-3.0`
  - `superdoc@1.39.0` license: `AGPL-3.0`

## Implementation Changes

### DOCX WebView

Changed:

- `/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.tsx`
- `/Users/jun/Developer/new/700_projects/code-office/src/react/view/word/Word.css`
- `/Users/jun/Developer/new/700_projects/code-office/src/provider/docx/DocxEditorProvider.ts`

Behavior:

- Removed `docx-preview` view mode.
- Removed `@eigenpal/docx-editor-react` edit mode.
- Removed `docxEditorTuning.ts`, which was eigenpal-only tuning.
- Added `SuperDocEditor` as the single DOCX surface.
- `viewer` mode maps to SuperDoc `documentMode="viewing"` and `role="viewer"`.
- `editor` mode maps to SuperDoc `documentMode="editing"` and `role="editor"`.
- The WebView converts host-provided bytes to a browser `File` and passes it to
  SuperDoc.
- Save still follows the VS Code host lifecycle:
  - WebView requests host save with `docxHostSaveRequest`.
  - `DocxEditorProvider` asks the WebView for bytes with `docxSaveRequest`.
  - WebView calls `superdocRef.current.getInstance().export(...)`.
  - Exported Blob is converted to ArrayBuffer and sent as `number[]`.
  - Host writes bytes with `workspace.fs.writeFile`.

### Dependency Changes

Changed:

- `/Users/jun/Developer/new/700_projects/code-office/package.json`

Dependency state:

- Added `@superdoc-dev/react`.
- Added exact `superdoc@1.39.0` pin.
- Removed `@eigenpal/docx-editor-react`.
- Removed `docx-preview`.
- Reason for direct pin: `@superdoc-dev/react` allows `superdoc >=1.0.0`.
  Without a committed lockfile, clean installs can resolve to `superdoc@2.2.1`,
  which currently pulls a worse vulnerability set. The exact 1.39.0 pin keeps
  the implementation aligned with the verified API surface.

### License and Public Docs

Changed:

- `/Users/jun/Developer/new/700_projects/code-office/LICENSE`
- `/Users/jun/Developer/new/700_projects/code-office/NOTICE.md`
- `/Users/jun/Developer/new/700_projects/code-office/README.md`
- `/Users/jun/Developer/new/700_projects/code-office/README-KO.md`
- `/Users/jun/Developer/new/700_projects/code-office/README-CN.md`
- `/Users/jun/Developer/new/700_projects/code-office/docs/index.html`
- `/Users/jun/Developer/new/700_projects/code-office/docs/FAQ.md`
- `/Users/jun/Developer/new/700_projects/code-office/docs/ARCHITECTURE.md`
- `/Users/jun/Developer/new/700_projects/code-office/structure/00-structure-hub.md`
- `/Users/jun/Developer/new/700_projects/code-office/structure/01-file-function-map.md`
- `/Users/jun/Developer/new/700_projects/code-office/structure/04-viewer-architecture.md`
- `/Users/jun/Developer/new/700_projects/code-office/structure/direction.md`
- `/Users/jun/Developer/new/700_projects/code-office/scripts/audit-phase06-1.mjs`

License behavior:

- Top-level `package.json` license changed from `MIT` to
  `AGPL-3.0-or-later`.
- Top-level `LICENSE` changed to GNU Affero General Public License v3 text,
  copied from the installed `@superdoc-dev/react` package license file.
- Upstream MIT lineage text is preserved in `NOTICE.md` instead of the top-level
  `LICENSE`.

## Test Changes

Changed:

- `/Users/jun/Developer/new/700_projects/code-office/src/test/docxEditorProviderTest.mjs`

The test now asserts:

- SuperDoc React import and stylesheet import are present.
- DOCX bytes are passed as a browser `File`.
- View/Edit maps to SuperDoc viewing/editing mode.
- Viewer/editor roles are set.
- Paginated layout is requested.
- Save exports DOCX bytes via `SuperDoc.export({ triggerDownload: false })`.
- Removed engines are absent from product source:
  - no `docx-preview`
  - no `@eigenpal/docx-editor-react`
  - no LibreOffice/PDF iframe fallback for DOCX
- Existing host save bridge is still present.

## Verification So Far

Commands run:

```text
npm run test:docx-editor-provider
```

Result:

```text
docx editor provider checks passed
```

```text
npm run build
```

Result:

```text
✓ built in 9.08s
```

Build notes:

- `out/webview/assets/Word-CrEgPod2.js`: 19.63 kB minified, 7.08 kB gzip.
- `out/webview/assets/Word-D69_wD1M.css`: 108.20 kB minified, 18.89 kB gzip.
- Vite warned about the existing large `remark-gfm` chunk, not the Word chunk.

Security audit note:

- `npm audit --omit=dev --json` reports 2 moderate vulnerabilities via
  `superdoc@1.39.0 -> uuid@9.0.1`.
- Trialing `superdoc@2.2.1` raised the audit count to 11 vulnerabilities
  (5 moderate, 4 high, 2 critical), so the automatic fix path was rejected.
- The remaining moderate finding is recorded as upstream SuperDoc dependency
  debt and must be rechecked when SuperDoc publishes a stable version that uses
  `uuid >=11.1.1` without regressing its dependency set.
- `scripts/audit-phase06-1.mjs` classifies the reviewed SuperDoc/uuid findings
  so `npm run test:security` continues to fail on any unreviewed dependency
  finding.

## Remaining Gates

- Run full test suite.
- Run VSIX package gate.
- Install VSIX into the already-open VS Code Insiders.
- Use Computer Use to visually verify DOCX view and edit behavior before
  claiming completion.
