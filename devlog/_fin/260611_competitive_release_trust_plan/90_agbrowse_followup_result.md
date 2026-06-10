# 90 Agbrowse Follow-Up Result

## Route

- Tool: `agbrowse web-ai query`
- Vendor/model: ChatGPT Pro, standard effort
- Conversation URL: `https://chatgpt.com/c/6a298069-42a0-83a6-a2e9-8a5e40bb7805`
- Prompt source:
  `devlog/_plan/260611_competitive_release_trust_plan/01_agbrowse_followup_prompt.md`

## Corrected Verdict

The corrected frame is stronger than the first evaluation.

`code-office` should not be evaluated as a generic Office Viewer clone or an
Obsidian competitor. The more accurate product frame is:

> a document-heavy VS Code workspace where HWP/HWPX, DOCX, Markdown, PPTX, PDF,
> XLSX, and evidence/source files can be reviewed together, with local editing
> and native save lifecycle for the formats where the project owns that surface.

The strongest wedge is still local HWP/HWPX editing inside VS Code. The
competitive advantage is not just HWP parsing; it is the combination of:

- local bundled runtime;
- VS Code `CustomEditorProvider` lifecycle;
- dirty state and native save integration;
- format-aware HWP vs HWPX write validation;
- cross-format review context inside the same workspace.

## Competitive Reassessment

The follow-up evaluation corrected the first review in three important ways:

1. Historical install count is not the same as current product momentum.
   `cweijan/vscode-office` remains a high-adoption incumbent, but its public
   surface is still mostly preview-oriented and legacy office-viewer lineage.
2. Obsidian is not the main competitive frame. Markdown support is workspace
   glue for notes/citations/drafts beside office files, not an attempt to beat
   Obsidian's PKM ecosystem.
3. The VS Code WYSIWYG gap is strongest around binary/office custom editors,
   not around Markdown alone. VS Code exposes the custom editor API, but making
   save/backup/hot-exit/round-trip behavior trustworthy is difficult. That
   difficulty is the opportunity.

The evaluator also found that the HWP/HWPX wedge is not entirely uncontested:

- `edwardkim.rhwp-vscode` exists as a HWP/HWPX viewer.
- `mjyoo2.hwpx-editor` exists as an HWP/HWPX editor surface with HWPX editing
  and HWP viewing/conversion claims.

Therefore the position should not be "no competitors exist." The position
should be:

> `code-office` can compete if it proves stronger local save lifecycle,
> format-aware writes, safe edit UX, and cross-format workspace integration.

## Updated Scores

| Dimension | Score | Meaning |
|---|---:|---|
| Repo maturity | 7.0 / 10 | Stronger than first review because architecture docs, FAQ, CI, release runbook, HWP hardening, and VSIX verification are visible. Still held back by empty GitHub Releases and missing public fixture/provenance evidence. |
| Product competitiveness | 7.4 / 10 | Strong under the corrected HWP/HWPX + cross-format workspace frame. Not strong as generic Office Viewer or Obsidian replacement. |
| Strategic moat | 7.1 / 10 | Local HWP/HWPX + VS Code save lifecycle + format-aware save + workspace integration is meaningful. Moat must be earned through release trust, fixtures, UX, and workflow integration, not parser exclusivity. |
| Open-source credibility | 6.3 / 10 | AGPL, NOTICE, upstream attribution, architecture docs, and FAQ are positive. Artifact provenance, checksums, GitHub Releases, compatibility evidence, and external user signals remain weak. |

## Required Release-Trust Work

The follow-up review emphasized that the next bottleneck is not more feature
surface. It is public trust evidence.

Required work:

1. Tag-based GitHub Releases with VSIX artifacts.
2. SHA-256 checksums for each VSIX.
3. Artifact provenance / GitHub Actions attestation where practical.
4. Public compatibility matrix for HWP, HWPX, DOCX, PPTX, Markdown.
5. CI/CD release workflow that builds the artifacts used for GitHub Release,
   Marketplace, and Open VSX.
6. Clear mapping of Marketplace artifact (`jun6161.code-office`) vs Open VSX
   artifact (`lidge-jun.code-office`).
7. Safe-edit UX evidence: backup, save-copy, restore, unsupported feature
   warning, font substitution warning, large-file warning, failed-save no-write
   guarantee.

## Top 7 Next Actions

1. Create the next GitHub Release with VSIX artifacts, checksums, release notes,
   known limitations, and compatibility matrix links.
2. Add a tag-triggered CI/CD release workflow for package, checksum, artifact
   upload, and eventually Marketplace/Open VSX publish.
3. Build a public HWP/HWPX compatibility matrix using redacted or synthetic
   fixtures.
4. Strengthen safe-edit UX for HWP/HWPX and DOCX: backup, Save Copy, restore,
   explicit unsupported-feature warnings, and failed-save behavior.
5. Tighten Marketplace/README positioning around local HWP/HWPX editing and
   cross-format document review inside VS Code.
6. Add a competitor comparison document covering `cweijan/vscode-office`,
   `edwardkim.rhwp-vscode`, `mjyoo2.hwpx-editor`, Quarto visual editor, and RTF
   Markdown editor.
7. Contain SuperDoc risk through pinning, upgrade policy, license explanation,
   DOCX fixture tests, fallback read-only mode, and destructive-save regression
   tests.

## Sources The External Review Used

- `https://github.com/lidge-jun/code-office`
- `https://lidge-jun.github.io/code-office/`
- `https://marketplace.visualstudio.com/items?itemName=jun6161.code-office`
- `https://open-vsx.org/extension/lidge-jun/code-office`
- `https://github.com/lidge-jun/code-office/releases`
- `https://raw.githubusercontent.com/lidge-jun/code-office/main/package.json`
- `https://raw.githubusercontent.com/lidge-jun/code-office/main/docs/ARCHITECTURE.md`
- `https://raw.githubusercontent.com/lidge-jun/code-office/main/docs/FAQ.md`
- `https://raw.githubusercontent.com/lidge-jun/code-office/main/structure/05-build-release.md`
- `https://raw.githubusercontent.com/lidge-jun/code-office/main/.github/workflows/main.yml`
- `https://github.com/cweijan/vscode-office`
- `https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-office`
- `https://marketplace.visualstudio.com/items?itemName=edwardkim.rhwp-vscode`
- `https://github.com/edwardkim/rhwp`
- `https://marketplace.visualstudio.com/items?itemName=mjyoo2.hwpx-editor`
- `https://github.com/mjyoo2/hwp-extension`
- `https://code.visualstudio.com/api/extension-guides/custom-editors`
- `https://code.visualstudio.com/api/working-with-extensions/continuous-integration`
- `https://docs.github.com/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds`
- `https://github.com/superdoc-dev/superdoc`
- `https://quarto.org/docs/tools/vscode/visual-editor.html`
- `https://marketplace.visualstudio.com/items?itemName=NGPowerToys.rtf-markdown-editor`

## Planning Implication

This plan should become the next release-readiness track before broad
promotion. It should not be mixed with unrelated feature work. The correct
sequence is:

1. prove artifact trust;
2. prove HWP/HWPX save compatibility;
3. tighten product message;
4. then expand adoption.
