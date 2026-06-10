# 260611 Competitive Release Trust Plan

## Goal

Reframe `code-office` as a serious VS Code document workspace project and plan
the next release-trust work around the points that matter most:

- there is no established, high-quality WYSIWYG editor inside VS Code that covers
  this full document workflow;
- there is no comparable local HWP/HWPX editor extension with VS Code native save
  lifecycle coverage;
- the upstream `cweijan/vscode-office` line is large but has not moved at the
  same pace as this project, and the original repository has been effectively
  stale for years;
- this project is now entering real public distribution, so adoption metrics are
  an early baseline, not a mature-market verdict;
- GitHub Releases, release artifacts, compatibility matrices, and CI/CD publish
  automation need to become first-class trust evidence.

This is not an Obsidian-replacement plan. Markdown support matters because it
keeps notes, citations, and drafts in the same VS Code workspace as DOCX, HWP,
HWPX, PPTX, PDF, and other source files. The strategic meaning is "do more
inside the same developer/document review workspace," not "replace Obsidian's
PKM ecosystem."

## Corrected Competitive Framing

The previous external evaluation over-weighted generic viewer adoption and
Obsidian comparison. The corrected evaluation should start from these premises:

1. **WYSIWYG gap**: VS Code still lacks a strong, maintained, local-first
   cross-format WYSIWYG document workspace. Existing viewers are mostly preview
   surfaces, Markdown editors, or stale office-preview forks.
2. **HWP/HWPX gap**: HWP/HWPX editing is the real moat. A local bundled runtime
   with native VS Code dirty/save lifecycle is rare and strategically meaningful
   for Korean document workflows.
3. **Upstream staleness**: `cweijan/vscode-office` still has historical adoption,
   but adoption is not the same as active product momentum. The evaluation must
   distinguish incumbent distribution from current development velocity.
4. **Distribution just started**: Marketplace/Open VSX install counts should be
   treated as a starting baseline after first serious public release, not as a
   settled signal that the product is weak.
5. **Workspace value**: The product's value is not one file type alone. It is
   local review/editing of Office, Korean office files, Markdown, and evidence
   formats without leaving VS Code.

## Integrated Improvement Plan

### Phase 1: Trust Release Automation

Implement GitHub Release automation so every public version has durable
provenance, not only Marketplace/Open VSX entries.

Planned changes:

- Add a GitHub Actions release workflow triggered by version tags such as
  `v3.7.49`.
- Run the existing release gate before publishing artifacts:
  - `npm run release:local`
  - `node scripts/verify-vsix.mjs`
- Upload:
  - normal Marketplace VSIX, e.g. `code-office-{version}.vsix`;
  - Open VSX remapped VSIX, e.g. `code-office-{version}-openvsx.vsix`;
  - checksum files, at minimum SHA-256 for each VSIX;
  - generated release notes from `CHANGELOG.md`.
- Preserve manual publish as the first step if registry token safety requires it,
  then move to fully automated Marketplace/Open VSX publish after a successful
  dry run.

Success criteria:

- GitHub Releases page is no longer empty.
- A user can verify each GitHub Release artifact against its release checksum.
- Registry artifact checksum parity is claimed only after Marketplace/Open VSX
  publish consumes the exact same CI-built VSIX artifact.
- `structure/05-build-release.md`, README, and docs site all describe the same
  release path.

### Phase 2: Compatibility Evidence Matrix

Create public compatibility evidence for the formats that carry trust risk.

Priority matrix:

| Format | Required evidence |
|---|---|
| HWP | open, view, edit, dirty dot, Cmd+S, Save As HWP, PDF export, Viewer/Edit switch |
| HWPX | open, view, edit, dirty dot, Cmd+S, Save As HWPX, PDF export, Viewer/Edit switch |
| DOCX | SuperDoc load, page centering, zoom/pinch behavior, View/Edit switch, Cmd+S, read-only fallback |
| PPTX | thumbnails, collapsible/resizable sidebar, notes, grid, fullscreen, presenter mode |
| Markdown | WYSIWYG/raw marker behavior, wikilink click, completion, no hot-path workspace scan |

Implementation notes:

- Use redacted or synthetic fixtures only. Do not commit personal documents.
- Record fixture hashes and screenshot paths in devlog when local private
  fixtures are used.
- Use Computer Use for VS Code Insiders visual checks when a rendering claim is
  user-visible.
- Keep automated checks in `scripts/` when possible so release gates can reuse
  them.

Success criteria:

- A public `docs/` or `structure/` matrix exists for supported/limited/unsupported
  scenarios.
- The matrix separates verified behavior from known limitations.
- Release notes link to the compatibility matrix for document-editing claims.

### Phase 3: Product Message Tightening

Refocus public copy from "everything viewer" to the actual wedge:

> Local HWP/HWPX editing and cross-format document review inside VS Code.

Planned changes:

- README first viewport:
  - lead with HWP/HWPX and cross-format review;
  - keep Markdown as workspace glue, not an Obsidian competitor;
  - make DOCX/PPTX/Markdown secondary supporting pillars.
- Marketplace/Open VSX description:
  - explicitly say this is a local document workspace;
  - clarify what is editable vs read-only/review-focused.
- Docs site:
  - add "Why this exists" page;
  - add "Trust and limitations" page;
  - add "Compatibility matrix" page.

Success criteria:

- Users understand the primary product in 10 seconds.
- The public page does not invite a losing comparison against Obsidian PKM or
  mature office suites.
- File-type ownership is clear enough that users know what the extension will
  open by default.

### Phase 4: WYSIWYG Editor Quality Gate

Treat WYSIWYG editing as the quality center, not a marketing bullet.

Planned checks:

- HWP/HWPX:
  - save lifecycle cannot silently write wrong format bytes;
  - edit mode always has a recoverable path back to viewer mode;
  - unsupported layout cases are visible, not hidden.
- DOCX:
  - SuperDoc errors must surface as recoverable UI states;
  - View/Edit switching must not lose dirty state;
  - view mode must not show dirty dot;
  - export/save failures must not claim success.
- Markdown:
  - Obsidian-like raw marker behavior must stay stable in WYSIWYG mode;
  - wikilink index must remain cached and not reintroduce `workspace.findFiles`
    on open/click/completion hot paths.

Success criteria:

- The release gate has explicit tests or documented manual QA for these flows.
- Any known fidelity limitation is documented before release.

### Phase 5: CI/CD Publishing Path

Move from manual release muscle memory to controlled automation.

Recommended sequence:

1. Keep local `npm run release:local` as the canonical preflight.
2. Add tag-triggered GitHub Release artifact upload first.
3. Add Marketplace publish only after verifying secret availability and safe
   dry-run behavior.
4. Add Open VSX publish through the existing publisher-remap script.
5. Add post-publish verification:
   - Marketplace public API reports the new version;
   - Open VSX API reports the new version and `downloadable: true`;
   - GitHub Release artifact checksums match the CI-built artifacts;
   - registry artifact checksums are compared only when registries publish from
     the same CI-built VSIX.

Non-goals:

- Do not add random new document features before release trust is solved.
- Do not chase Obsidian plugin ecosystem parity.
- Do not weaken HWP/HWPX trust boundaries to improve demo appearance.
- Do not publish personal/private fixtures.

## Priority Order

1. GitHub Release artifact/checksum automation.
2. HWP/HWPX compatibility matrix.
3. Public product message tightening.
4. DOCX/SuperDoc failure-state and save/view quality gate.
5. CI/CD registry publish automation after the release artifact path is proven.

## Follow-Up Patch Documents

The detailed patch plan is split lexicographically so each workstream can be
executed and audited independently:

| Document | Purpose |
|---|---|
| `02_followup_patch_index.md` | Execution order and shared acceptance rules. |
| `03_release_artifact_trust_patch.md` | GitHub Release, checksum, and provenance plan. |
| `04_hwp_hwpx_compatibility_matrix_patch.md` | Public HWP/HWPX fixture and compatibility proof plan. |
| `05_safe_edit_ux_patch.md` | HWP/HWPX and DOCX safe editing UX plan. |
| `06_public_positioning_patch.md` | README, Marketplace, Open VSX, and Pages positioning plan. |
| `07_competitor_evidence_patch.md` | Honest competitive context and comparison plan. |
| `08_superdoc_containment_patch.md` | DOCX/SuperDoc license, fallback, and regression containment plan. |
| `09_ci_cd_release_publish_patch.md` | Tag-triggered release and publish automation plan. |

## Evidence Already Available

- `structure/05-build-release.md` already documents the intended release steps,
  including GitHub Release with VSIX attachment.
- Existing scripts already provide a strong local release gate:
  - `npm run release:local`
  - `scripts/verify-vsix.mjs`
  - `scripts/verify-hwp-hardening.mjs`
- Marketplace and Open VSX were successfully published at `3.7.48`.

## Remaining Validation Needed

- External evaluation should be rerun with the corrected market frame.
- A release workflow design should be audited before secrets-backed publishing
  automation is enabled.
- Compatibility matrix fixtures must be selected and redacted/synthetic before
  public docs are produced.
