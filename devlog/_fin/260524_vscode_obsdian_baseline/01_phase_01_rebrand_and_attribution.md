# 01 Phase 01 — Rebrand And Attribution

## Goal

GitHub fork 표시 없는 새 repository 방향에 맞게 제품 이름과 공개 문서를 정리하되, MIT 원저작권/라이선스 고지는 보존한다.

추가 확정: 현재 가져온 `rjwang1982/vscode-office`는 `cweijan/vscode-office`의 fork이므로, rebrand 문서에는 `cweijan` 원본과 `RJ.Wang` 유지 fork를 모두 명시한다.

> 출처: [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office)
> 출처: [cweijan/vscode-office](https://github.com/cweijan/vscode-office)

## Why This Comes Before Feature Work

현재 코드의 identity surface가 넓다.

- `package.json` name/displayName/publisher
- command IDs
- config prefix
- viewType IDs
- README/README-CN text
- output channel name
- Marketplace/Open VSX URLs
- `.kiro/steering/project-guide.md`

기능 구현 후 rebrand를 하면 같은 파일을 다시 건드리게 된다. 따라서 rebrand는 첫 코드 변경 phase로 분리하는 것이 맞다.

## Proposed Changes For Future Phase

Phase 1 execution note: public metadata, README, README-CN, and NOTICE have now been updated. The deeper runtime IDs below remain future work unless a migration/compatibility plan is approved.

```text
MODIFY package.json
  - name
  - displayName
  - description
  - publisher
  - bugs/homepage/repository
  - contributes.configuration title
  - command/config/viewType prefix migration deferred

MODIFY src/common/global.ts
  - config prefix

MODIFY src/extension.ts
  - command IDs
  - custom editor viewType IDs

MODIFY src/provider/officeViewerProvider.ts
  - viewType IDs

MODIFY README.md
  - remove product-level fork branding
  - keep license/provenance attribution for both cweijan and RJ.Wang lineage

MODIFY README-CN.md
  - same policy or remove if not maintained

ADD NOTICE.md
  - original source and license notice
  - cweijan/vscode-office original project
  - rjwang1982/vscode-office maintained fork
```

## License Rule

MIT-derived code can be copied into a new repository, but the copyright notice, permission notice, and disclaimer must remain included in copies/substantial portions.

> 출처: [MIT Copyright Notice](https://web.mit.edu/ivlib/www/copyright.html)

## Current Release Decisions

1. Public package name: `vscode-obsdian`.
2. Extension display name: `vscode_obsdian`.
3. Publisher ID: `jun6161`.
4. `README-CN.md` is retained.
5. Old `vscode-office.*` settings and `cweijan.*` viewTypes are intentionally kept as legacy compatibility keys until a separate migration plan exists.

## Done Criteria

- README no longer visually labels the project as a fork
- NOTICE/attribution exists for both cweijan/vscode-office and rjwang1982/vscode-office
- package metadata no longer points to upstream as homepage/bugs/repository
- internal command/config/viewType IDs are explicitly documented as legacy compatibility surface
- original MIT license remains intact
- `package.json` parses successfully
- local static/build verification passes after runtime source phases install dependencies
