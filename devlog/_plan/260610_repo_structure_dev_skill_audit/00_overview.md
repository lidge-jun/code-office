# Repository Structure And Dev-Skill Audit

Date: 2026-06-10
Project root: `/Users/jun/Developer/new/700_projects/code-office`
Scope: devlog archive hygiene, structure source-of-truth refresh, and dev-skill structural gap audit.

## Goal

Review the current repository against the local dev, dev-architecture, and dev-scaffolding skills. Move clearly completed plan folders from `devlog/_plan/` to `devlog/_fin/`, update `structure/`, and record remaining module-boundary and maintainability issues as explicit follow-up documents.

## Source Rules Read

- `/Users/jun/.cli-jaw-3462/skills/dev/SKILL.md`
- `/Users/jun/.cli-jaw-3462/skills/dev-architecture/SKILL.md`
- `/Users/jun/.cli-jaw-3462/skills/dev-scaffolding/SKILL.md`
- `/Users/jun/Developer/new/700_projects/code-office/devlog/AGENTS.md`
- `/Users/jun/Developer/new/700_projects/code-office/structure/AGENTS.md`

## Evidence Commands

```text
git status --short --branch
git log --oneline -8
find devlog/_plan -mindepth 2 -maxdepth 2 -type f | sort
rg -n "PASS|DONE|complete|completed|Verification|BLOCKED|pending|remaining" devlog/_plan
find src -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) -print0 | xargs -0 wc -l | sort -nr | head -n 30
npx --yes madge --circular --extensions ts,tsx src --exclude 'src/bundle|src/react/view/excel/x-spreadsheet|resource'
```

## High-Level Findings

- The repo is ahead of `origin/main`; this audit is local and does not push.
- The package is `code-office@3.7.47` and declares `AGPL-3.0-or-later`.
- Current custom editor split is explicit: Markdown, HWP/HWPX, DOCX, and PPTX each have owned custom editor registrations; legacy Office Viewer now covers shared read-only formats.
- No circular dependency was found by `madge` over TypeScript/TSX source after excluding bundled/vendor surfaces.
- Major maintainability debt is size and boundary concentration, not circular imports: `src/react/view/word/Word.tsx` is 979 lines, and multiple HWP files sit at the 500-line threshold.

## Output Documents

| File | Purpose |
|---|---|
| `01_plan_completion_triage.md` | `_plan` to `_fin` movement decisions and retained active folders. |
| `02_structure_update_notes.md` | Structure docs refreshed and why. |
| `03_dev_skill_gap_audit.md` | Index for dev-skill findings: module boundaries, file size, legacy CommonJS, verification gaps. Detailed patch guides live in `03.1` through `03.5`. |
| `03.1_docx_word_surface_split.md` | Detailed DOCX `Word.tsx` extraction guide: modules, moved functions, patch order, tests, and stop conditions. |
| `03.2_hwp_limit_guard.md` | HWP 500-line boundary guard: where future provider, bridge, viewer, export, and diagnostics work must land. |
| `03.3_pptx_component_boundary.md` | PPTX viewer component boundary guide for future notes/sidebar/fullscreen/presenter work. |
| `03.4_markdown_commonjs_boundary.md` | Markdown export CommonJS containment and future ESM migration guide. |
| `03.5_verification_and_review_gate.md` | Verification matrix and employee PASS criteria for future modularization implementation. |
| `90_followup_modularization_backlog.md` | Summary backlog that points to the canonical `03.n` patch guides. |
