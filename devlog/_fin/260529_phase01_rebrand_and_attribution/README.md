# Phase 1: Rebrand and Attribution — DONE

**Completed**: 2026-05-29
**Plan**: `devlog/_fin/260524_vscode_obsdian_baseline/01_phase_01_rebrand_and_attribution.md`

## Summary

Rebranded `vscode-obsdian` to `code-office`. Updated all public metadata (package.json name/displayName/publisher, README set, NOTICE.md) while keeping legacy runtime identifiers (`cweijan.*` viewTypes, `vscode-office.*` config keys, `office.*` commands) for backward compatibility.

## What Changed

- package.json: name → `code-office`, displayName → `code-office`, publisher → `jun6161`
- README.md, README-CN.md, README-KO.md: rewritten with new branding and screenshots
- NOTICE.md: added attribution for cweijan/vscode-office, rjwang1982/vscode-office, edwardkim/rhwp
- docs/: GitHub Pages landing site with logo, showcase screenshots, and styles
- images/: new logo (logo-new.svg, logo-new.png)
- scripts/: release and verification scripts updated for new package name
- VSIX: `code-office-3.7.5.vsix` (33 MB)

## What Stayed

- All `cweijan.*` viewType identifiers (backward compat)
- All `vscode-office.*` configuration keys (backward compat)
- All `office.*` command IDs (backward compat)
- MIT license (unchanged from upstream)
