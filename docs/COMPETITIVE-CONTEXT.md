# Competitive Context

Last reviewed: 2026-06-11.

`code-office` should not be positioned as an Obsidian replacement or as a
generic "everything viewer" fork. The useful wedge is narrower and stronger:
local HWP/HWPX editing plus cross-format document review inside VS Code.

## Product Thesis

Many teams already keep source code, Markdown notes, generated reports, public
forms, spreadsheets, PDFs, and presentation drafts in the same repository or
workspace. The missing surface is a VS Code-native document workspace where
Korean HWP/HWPX files, DOCX drafts, Markdown notes, and review artifacts can be
opened and edited without leaving the editor.

## Comparison

| Surface | What it is good at | Why code-office is different | Do not overclaim |
| --- | --- | --- | --- |
| `cweijan/vscode-office` | Mature VS Code office preview adoption and inherited viewer coverage. | Upstream has been inactive for years; code-office keeps the useful viewer base but adds AGPL project ownership, HWP/HWPX editing, DOCX editing, release gates, and current docs. | Do not claim matching its install base or community maturity. |
| Obsidian | Dedicated Markdown knowledge base, graph, mobile/sync ecosystem, themes, and plugins. | code-office keeps Markdown beside Office/HWP/PDF/PPTX assets inside VS Code instead of becoming a separate PKM app. | Do not position code-office as an Obsidian competitor. |
| Hancom Office / Microsoft Word | Highest-fidelity native editing for their own formats. | code-office is local and workspace-native for review/edit loops where leaving VS Code is the friction. | Do not promise perfect layout parity or full enterprise office-suite replacement. |
| LibreOffice / server office engines | Broad conversion and mature document layout engines. | code-office's default HWP/HWPX path is bundled and local; PPT legacy conversion remains opt-in rather than a hard runtime dependency. | Do not add LibreOffice as a required default dependency for core document viewing. |
| SuperDoc | Browser DOCX rendering/editing and OOXML-oriented automation. | code-office uses it as the DOCX engine inside the VS Code save lifecycle while keeping HWP/HWPX as the unique wedge. | Contain license, bundle size, fallback, and save-fidelity risk. |

## Strategic Priorities

1. Make release provenance obvious: GitHub Release artifacts, checksums,
   artifact attestations, Marketplace/Open VSX version mapping, and clear local
   build instructions.
2. Publish a compatibility matrix for HWP/HWPX and keep private user documents
   out of the repository.
3. Keep edit surfaces conservative: safe save, failed-save stays in edit mode,
   clean Viewer mode without dirty dots, and explicit unsupported feature notes.
4. Narrow public messaging to "local HWP/HWPX editing and cross-format VS Code
   document review" rather than a generic office-suite replacement.
5. Treat DOCX/SuperDoc as an important editing surface with containment, not the
   main moat.

## Current Trust Gaps

- GitHub Release artifacts and checksums need to exist for each public tag.
- More public synthetic/redacted HWP/HWPX fixtures are needed.
- Ratings, issues, and external users are still early.
- Cross-platform native PDF helper behavior must stay documented because one
  VSIX only contains the helper built for its packaging platform.

## Evidence Links

- HWP/HWPX compatibility matrix: `docs/HWP-HWPX-COMPATIBILITY.md`
- Architecture boundary: `docs/ARCHITECTURE.md`
- Release process: `structure/05-build-release.md`
- Release automation: `.github/workflows/release.yml`
- Local gate: `npm run release:local`
