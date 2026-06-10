# 260524 vscode_obsdian Baseline Plan

## Part 1 — Easy Explanation

이번 작업은 새 프로젝트 `vscode_obsdian`을 안전하게 시작하기 위한 지도와 작업 로그를 만드는 단계입니다. 원본은 MIT 라이선스 기반으로 가져왔고, README rebrand, Obsidian식 위키링크, 이미 노출된 PPTX read-only preview stabilization, 취소선 개선을 진행하려면 먼저 현재 구조와 리스크를 분리해 둬야 합니다.

현 시점 원칙:

- 최초 baseline에서는 코드/README/package 수정을 보류했음
- 2026-05-24 Phase 1에서 public metadata, README, NOTICE는 rebrand 반영
- runtime command/config/viewType ID는 호환성 계획 전까지 유지
- 원본 MIT 라이선스 보존
- GitHub fork 표시 없는 새 repo 방향은 유지

## Part 2 — Work Map

### Direction Lock

최종 방향성은 아래 두 문서를 우선 source of truth로 둔다.

```text
structure/direction.md
structure/roadmap.md
```

요약:

- 새 repo 방식은 유지한다.
- GitHub fork UI는 쓰지 않는다.
- `cweijan/vscode-office` 원본과 `rjwang1982/vscode-office` 유지 fork attribution은 둘 다 남긴다.
- 구현 순서는 rebrand -> closest-note wikilink -> wikilink WebView/export integration -> PPTX preview stabilization -> Markdown CJK inline/strikethrough -> Excel style preservation -> LibreOffice fallback completion/verification이다.

### Current Baseline

```text
Project root: /Users/jun/Developer/new/700_projects/vscode_obsdian
Source imported from: https://github.com/rjwang1982/vscode-office
Original upstream lineage: https://github.com/cweijan/vscode-office
Original package name: vscode-office-enhanced
Original display name: Office Viewer Enhanced
Phase 1 package name: vscode-obsdian
Phase 1 display name: vscode_obsdian
Current license: MIT
Current git remote: origin -> https://github.com/rjwang1982/vscode-office
```

### Documents Created In This Phase

```text
structure/
  AGENTS.md
  README.md
  direction.md
  roadmap.md
  architecture.md
  conventions.md
  research.md
  risks.md
  license-attribution.md

devlog/
  AGENTS.md
  _plan/
    README.md
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
      91_research_comparable_repos.md
      92_research_wikilink_deep_dive.md
      93_research_pptx_deep_dive.md
      94_research_strikethrough_deep_dive.md
      95_research_rebrand_distribution.md
      96_appendix_direction_and_roadmap_lock.md
      97_baseline_import_snapshot.md
      98_dependency_audit_snapshot.md
  _fin/
    .gitkeep
  str_func/
    AGENTS.md
```

### Split Deep Research Notes

```text
structure/research_notes/
  AGENTS.md
  00_index.md
  01_wikilink_architecture.md
  02_pptx_js_renderers.md
  03_pptx_conversion_fallbacks.md
  04_strikethrough_paths.md
  05_rebrand_distribution.md
  06_implementation_matrix.md
```

### Implementation Phase Order

1. Phase 1: rebrand and attribution cleanup
2. Phase 2: Obsidian-style closest-note wikilinks
3. Phase 3: Wikilink WebView/export integration
4. Phase 4: PPTX read-only text/media preview stabilization
5. Phase 5: Markdown CJK inline formatting and strikethrough improvements
6. Phase 6: Excel strikethrough/style preservation
7. Phase 7: LibreOffice fallback completion and verification (optional, deferred)
8. Phase 8: HWP/HWPX native support via local rhwp-studio WASM bundle
9. Phase 8.2: HWP/HWPX security and lifecycle recovery before shipping editable support
10. Phase 8.2a: exact diff addendum for local rhwp bundle, CSP, lifecycle, and save safety
11. Phase 8.2b: Backend revalidation fixes for studio URL wiring, viewer safety, message bridge, and dependency audit target
12. Phase 8.2c: Frontend revalidation fixes for Hwp.tsx state, load status, viewer copy, and bridge serialization
13. Phase 8.2d: PABCD implementation plan for the full HWP/HWPX security recovery build
14. Phase 8.2e: Frontend and verification appendix for the HWP/HWPX security recovery build
15. Phase 8.2f: full rhwp editing recovery audit after viewer-only behavior was rejected
16. Phase 8.2g: HWP/HWPX lifecycle hardening completion with employee verification

## Research Inputs

- Local source inspection of `package.json`, `src/extension.ts`, providers, services, React views, Vditor resources
- GitHub source check that `rjwang1982/vscode-office` is forked from `cweijan/vscode-office`
- `agbrowse web-ai query --vendor grok --model expert`
- second `agbrowse` Grok Expert repo/method landscape query
- third `agbrowse` Grok Expert split deep-dive query
- VS Code Custom Editor official docs
- VS Code WebView official docs
- Obsidian internal link docs
- Microsoft Open XML PresentationML docs
- MIT license notice reference

## Non-Goals For This Phase

- No implementation
- No dependency installation
- No build system changes
- No rename in code
- No remote replacement
- No commit or push

## Current Release Decisions

Current implementation decisions:

1. Public package name is `vscode-obsdian`; display name remains `vscode_obsdian`.
2. Publisher identity is `jun6161`.
3. `README-CN.md` stays.
4. `.pptx` is handled by the custom editor; legacy `.ppt` is command-only LibreOffice fallback.
5. Nonexistent `[[Wiki Link]]` targets warn instead of creating files in this phase.
6. Markdown CJK inline/strikethrough is primary; Excel strikethrough/style preservation is handled in Phase 6.
