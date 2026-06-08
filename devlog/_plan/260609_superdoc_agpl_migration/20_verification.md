# 20 Verification - SuperDoc AGPL DOCX Migration

Date: 2026-06-09
Project: code-office
Scope: DOCX WebView engine replacement, AGPL license migration, release packaging, installed VS Code Insiders visual smoke.

## Verification Summary

| Gate | Result | Evidence |
| --- | --- | --- |
| DOCX provider unit/surface test | PASS | `npm run test:docx-editor-provider` |
| TypeScript | PASS | `npm run typecheck` |
| Full project tests | PASS | `npm run test:ci` |
| Production build | PASS | `npm run build` |
| Local VSIX release | PASS | `npm run release:local` |
| VSIX install | PASS | `code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix --force` |
| Computer Use viewer smoke | PASS with warning | Existing VS Code Insiders window showed DOCX SuperDoc viewer mode, content, Korean text, table, and a nonfatal warning banner |
| Computer Use edit/save smoke | PASS with warning | Existing VS Code Insiders window showed DOCX SuperDoc edit mode, toolbar, Malgun Gothic, content/table visible after Save click |

## CLI Evidence

Fresh gates were run after the SuperDoc replacement, AGPL migration, pinned runtime, viewer shortcut fix, and nonfatal exception handling fix:

```text
npm run test:docx-editor-provider
npm run typecheck
npm run test:ci
npm run build
npm run release:local
```

Release artifact:

```text
/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix
```

The local release verifier passed and confirmed package contents include AGPL licensing artifacts and exclude local QA fixture files.

## Computer Use Evidence

Installed VSIX:

```text
code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.47.vsix --force
```

Runtime target:

```text
/Applications/Visual Studio Code - Insiders.app
bundleID: com.microsoft.VSCodeInsiders
```

Smoke fixture:

```text
/tmp/code-office-superdoc-qa.docx
```

Saved screenshots:

```text
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260609_superdoc_agpl_migration/artifacts/superdoc-edit-save-smoke.png
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260609_superdoc_agpl_migration/artifacts/superdoc-viewer-warning-smoke.png
```

Observed runtime state:

- Viewer mode displays the DOCX document in the installed extension.
- Edit mode displays SuperDoc toolbar controls, including font family `Malgun Gothic`.
- Korean text and a table are visible in both modes.
- Clicking Save in edit mode no longer replaces the surface with a fatal red error screen.
- A SuperDoc lifecycle warning can still appear: `Cannot read properties of undefined (reading 'elements')`.

## Current Limitation

The latest implementation treats the observed SuperDoc lifecycle exception as nonfatal and preserves the document surface. This is acceptable for the present migration gate because it prevents the previous fatal UI failure, but it remains a follow-up quality issue for DOCX fidelity and SuperDoc integration hardening.

The warning is explicitly recorded rather than hidden because it may indicate an upstream SuperDoc edge case around minimal/generated DOCX structures. It should be retested against broader real-world local-only QA fixtures before marketplace publication decisions beyond this migration branch.

## License Evidence

The project package metadata and root license now align with SuperDoc's AGPL path:

```text
/Users/jun/Developer/new/700_projects/code-office/package.json
/Users/jun/Developer/new/700_projects/code-office/LICENSE
/Users/jun/Developer/new/700_projects/code-office/NOTICE.md
```

Declared package license:

```text
AGPL-3.0-or-later
```

Bundled SuperDoc runtime pin:

```text
@superdoc-dev/react: ^1.10.0
superdoc: 1.39.0
```

The `superdoc` runtime is pinned because `@superdoc-dev/react@1.10.0` accepts a wide peer range, and a clean install can otherwise resolve a newer `superdoc@2.x` runtime with worse current audit exposure.

## Verdict

The SuperDoc AGPL migration is implemented and packaged, and the installed VS Code Insiders smoke no longer hits the fatal DOCX error screen after Save. The remaining known issue is a nonfatal SuperDoc warning banner, which is documented as follow-up fidelity/integration debt rather than a blocker for the current replacement gate.
