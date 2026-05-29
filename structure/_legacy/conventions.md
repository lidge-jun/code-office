# Conventions

## Current Observed Conventions

이 프로젝트는 기존 `vscode-office-enhanced` 코드베이스를 가져온 뒤 public identity를 `code-office`으로 바꿔 가는 상태입니다. 현재 컨벤션은 “VS Code extension host 쪽 TypeScript + React WebView + Vditor resource bundle” 조합입니다.

## Language And Module Shape

Observed:

- extension host files use `.ts`
- React views use `.tsx`
- some bundled/vendor files use `.js`
- root build output is CommonJS through `tsconfig.json` and `build.ts`
- React build uses Vite and ES module style

Decision for future new source files:

- New extension-host logic should use `.ts`.
- New React views should use `.tsx`.
- New plain WebView helpers under `resource/vditor/` may stay `.js` because that area is already direct browser JavaScript.
- Do not convert existing CommonJS build wiring during feature phases unless there is a dedicated build-system phase.

## Naming

Original upstream identity:

- `vscode-office-enhanced`
- `Office Viewer Enhanced`

Current public identity:

- package name: `code-office`
- display name: `code-office`
- publisher: `jun6161`

Runtime identity split:

- public package, repository, Pages URL, HWP settings, and new owned commands use `code-office`
- most inherited `vscode-office.*` settings remain for Markdown, HTTP, and preview compatibility
- old `vscode-obsdian.hwp.*` values are read only as a legacy fallback
- `vscode-office.*` HTTP commands
- inherited `office.*` commands
- `cweijan.*` view types

Remaining migration proposal:

- migrate remaining settings to `code-office.*`
- migrate remaining commands to `code-office.*`
- migrate custom editor view types to `code-office.*`

The public repository spelling is `code-office`. Runtime prefix migration should stay separate because settings, command IDs, and custom editor associations are observable integration points.

## Documentation

New source-of-truth docs:

```text
structure/
  README.md
  architecture.md
  conventions.md
  research.md
  risks.md
  license-attribution.md

devlog/
  _plan/
    260524_vscode_obsdian_baseline/
      00_overview.md
      01_phase_01_rebrand_and_attribution.md
      02_phase_02_obsidian_closest_wikilinks.md
      03_phase_03_wikilink_webview_export.md
      04_phase_04_pptx_support.md
      05_phase_05_markdown_cjk_inline_formatting.md
      06_phase_06_excel_strikethrough_preservation.md
      07_phase_07_libreoffice_fallback.md
      08_phase_08_hwp_hwpx_native_support.md
      08.1_phase_08_hwp_hardened_diffs.md
      08.2_phase_08_hwp_security_lifecycle_recovery.md
      08.2a_phase_08_hwp_security_exact_diffs.md
      08.2b_phase_08_hwp_security_revalidation_fixes.md
      08.2c_phase_08_hwp_frontend_revalidation_fixes.md
      08.2d_phase_08_hwp_security_implementation_plan.md
      08.2e_phase_08_hwp_security_frontend_verification_plan.md
      08.2f_phase_08_hwp_full_editing_recovery_audit.md
      08.2g_phase_08_hwp_lifecycle_hardening_completion.md
      90_research_grok_expert.md
      97_baseline_import_snapshot.md
      98_dependency_audit_snapshot.md
  _fin/
  str_func/
```

Plan documents use numeric prefixes. Do not create bare `PLAN.md`, `plan.md`, `DIFF_PLAN.md`, `PHASES.md`, or `RCA.md`.

## Git And Repository State

Current import state:

- local path: `/Users/jun/Developer/new/700_projects/code-office`
- cloned source: `https://github.com/rjwang1982/vscode-office`
- original upstream lineage: `https://github.com/cweijan/vscode-office`
- current `origin`: `https://github.com/lidge-jun/code-office.git`
- current `upstream`: `https://github.com/rjwang1982/vscode-office`
- package metadata points homepage/bugs/repository at the new repo, not upstream

Future new-repo step:

1. Preserve MIT license and original copyright notice.
2. Keep upstream lineage visible in README and NOTICE.
3. Treat runtime ID migration as a separate compatibility task.

## Verification Convention

Docs-only verification:

- `git status --short`
- `find structure devlog -type f`
- `node` JSON parse check when `package.json` changes
- build can be skipped for README/NOTICE-only edits, but package metadata changes should at least parse cleanly

Future code verification:

- `npm install` if dependencies are absent
- `npm run typecheck`
- `npm run build`
- `npm run verify:hwp`
- `node scripts/verify-vsix.mjs`
- `npm run package:verify` for VSIX content inspection
- `npm run release:local` before GitHub Release or Marketplace publish
- `npm audit --omit=dev` before release packaging
- targeted manual VS Code extension host smoke test
- WebView smoke for Markdown and binary previews

Release artifacts:

- Commit source/docs/scripts only.
- Do not commit `*.vsix`.
- Do not commit generated `resource/rhwp-studio/`.
- Do not commit dirty runtime sample files unless the sample change is the
  explicit task.
- GitHub Pages source lives under `docs/` and is excluded from VSIX packaging.
