# code-office Roadmap

## 목적

이 문서는 `code-office`을 어떤 순서로 실제 구현할지 고정합니다. 방향성은 [direction.md](direction.md)에 있고, 이 문서는 phase별 진입 조건, 수정 파일, 완료 기준을 정리합니다.

## Phase 0. Documentation Baseline

현재 완료된 단계입니다.

완료 상태:

- `structure/` 기준 문서 생성
- `devlog/_plan/260524_vscode_obsdian_baseline/` 생성
- 위키링크, PPTX, 취소선, rebrand 조사 분리
- `cweijan/vscode-office`와 `rjwang1982/vscode-office` attribution 계보 반영
- 코드 수정 없음

완료 기준:

```text
structure/direction.md exists
structure/roadmap.md exists
structure/license-attribution.md includes both upstream lineage entries
devlog overview links direction/roadmap
```

## Phase 1. Rebrand And Attribution

가장 먼저 해야 하는 실제 코드/문서 변경입니다. 기능보다 identity를 먼저 고정합니다.

수정 후보:

```text
package.json
README.md
README-CN.md
LICENSE
NOTICE or ATTRIBUTION.md
images/logo-new.png
```

현재 진행 원칙:

- public package metadata, README, NOTICE부터 바꿈
- inherited command ID, inherited config key, custom editor viewType은 호환성 계획 전까지 유지
- HWP settings와 새 owned command ID는 `code-office.*`로 전환
- 새 repo URL 확정 후 `repository`, `homepage`, `bugs` metadata는 `https://github.com/lidge-jun/code-office`로 연결

현재 release 결정:

- 최종 이름: display name은 `code-office`, package name은 `code-office`
- Marketplace publisher: `jun6161`
- `README-CN.md`는 유지
- old `vscode-office.*` inherited config와 `cweijan.*` viewType은 별도 migration plan 전까지 legacy compatibility surface로 유지
- old `vscode-obsdian.hwp.*` HWP settings는 fallback으로만 읽음

완료 기준:

- README가 새 제품 이름과 방향을 설명
- GitHub fork branding은 제거
- `cweijan/vscode-office`와 `rjwang1982/vscode-office` 계보는 명시
- package metadata가 더 이상 upstream repo를 homepage/bugs/repository로 가리키지 않고 새 repo를 가리킴
- NOTICE가 추가됨
- `package.json` parse 검증 통과
- runtime source 변경 phase에서 dependency 설치 후 build 검증

> 출처: [MIT License text reference](https://web.mit.edu/ivlib/www/copyright.html)
> 출처: [cweijan/vscode-office](https://github.com/cweijan/vscode-office)
> 출처: [rjwang1982/vscode-office](https://github.com/rjwang1982/vscode-office)

## Phase 2. Wikilink MVP

제품 차별점의 핵심입니다. Markdown editor에서 Obsidian식 링크를 최소 기능으로 작동시킵니다.

지원 범위:

```text
[[Note]]
[[Note|Alias]]
[[Note#Heading]]
```

해석 정책:

```text
1. 현재 문서 폴더 기준 상대 경로를 먼저 확인
2. 같은 폴더 또는 가까운 하위/상위 경로의 Markdown note를 우선 후보로 표시
3. workspace 전체에서는 basename이 유일하거나 shortest unique path일 때만 자동 resolve
4. 같은 이름 후보가 여러 개면 quick pick/suggestion으로 사용자가 고르게 함
5. workspace 밖 경로는 열지 않음
```

이 방향은 Obsidian의 Wikilink/heading/alias 지원과, shortest unique path 또는 relative path 전략에 가장 가깝게 맞춘 MVP입니다.

> 출처: [Obsidian Internal Links](https://help.obsidian.md/Linking%20notes%20and%20files/Internal%20links)
> 출처: [Obsidian Settings - Files and links](https://help.obsidian.md/settings)

수정/추가 후보:

```text
src/extension.ts
src/service/wikilink/wikilinkParser.ts
src/service/wikilink/wikilinkIndex.ts
src/service/wikilink/wikilinkResolver.ts
src/provider/wikilink/wikilinkCompletionProvider.ts
src/provider/wikilink/wikilinkDocumentLinkProvider.ts
```

완료 기준:

- `[[` 입력 시 markdown file completion 표시
- `[[Note]]` alt-click/Ctrl-click 시 가장 가까운 target file open 또는 ambiguity suggestion 표시
- `[[Note#Heading]]` heading 이동
- parser unit test 통과
- large workspace에서 무한 scan하지 않음

> 출처: [Foam link completion provider](https://github.com/foambubble/foam/blob/main/packages/foam-vscode/src/vscode/features/navigation/link-completion.ts)
> 출처: [Markdown Preview Enhanced wikilink document link provider](https://github.com/shd101wyy/vscode-markdown-preview-enhanced/blob/develop/src/wikilink-document-link-provider.ts)

## Phase 3. Wikilink WebView And Export

Phase 2가 extension host/editor 기능이라면, Phase 3는 Vditor WebView와 export 경로를 연결합니다.

수정 후보:

```text
src/provider/markdownEditorProvider.ts
resource/vditor/index.js
src/service/markdown/markdown-pdf.js
src/service/wikilink/wikilinkHtml.ts
```

완료 기준:

- Vditor preview에서 `[[Note]]`가 링크처럼 보임
- preview click이 extension host resolver를 통해 파일을 엶
- HTML/PDF export에서 wikilink가 깨진 raw text로만 남지 않음
- WebView가 workspace 밖 파일을 직접 열지 않음

> 출처: [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)

## Phase 4. PPTX PowerPoint-like Read-only Viewer

`.pptx`, `.pptm`, `.ppsx`를 전용 읽기 전용 custom editor로 열고, `@aiden0z/pptx-renderer`와 custom viewer chrome으로 PowerPoint-like 검토 UX를 제공합니다. 현재 범위는 보기 전용이며, PPTX 편집기는 non-goal입니다.

수정/추가 후보:

```text
package.json
src/provider/pptx/PptxEditorProvider.ts
src/provider/handlers/pptxHandler.ts
src/react/main.tsx
src/react/view/pptx/Pptx.tsx
src/react/view/pptx/Pptx.less
```

완료 기준:

- `*.pptx`, `*.pptm`, `*.ppsx` custom editor selector 등록
- `route = "pptx"`로 React view 진입
- visual slide thumbnails render
- resizable/collapsible sidebar 제공
- speaker notes, grid navigation, fullscreen, presenter view, keyboard navigation, zoom 제공
- 30장 이상 deck에서 UI가 멈추지 않음
- exact chart/SmartArt/animation parity와 편집 기능은 후속 phase로 분리

권장 후보:

```text
1순위: @aiden0z/pptx-renderer
2순위: javier-mora/pptx-to-html
```

> 출처: [aiden0z/pptx-renderer](https://github.com/aiden0z/pptx-renderer)
> 출처: [javier-mora/pptx-to-html](https://github.com/javier-mora/pptx-to-html)
> 출처: [VS Code Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)

## Phase 5. Markdown CJK Strikethrough And Inline Formatting

현재 스크린샷 기준으로 더 급한 문제는 Excel이 아니라 Markdown editor에서 CJK 텍스트와 Markdown marker가 섞일 때 취소선/굵게 렌더링이 깨지는 문제입니다. Excel 취소선은 Phase 6으로 분리하고, Phase 5에서는 Markdown fixture와 Vditor/export 경로만 다룹니다.

수정 후보:

```text
resource/vditor/index.js
resource/vditor/util.js
resource/vditor/vditor.css
src/provider/markdownEditorProvider.ts
src/service/markdown/markdown-pdf.js
```

완료 기준:

- Korean/CJK 문장 안의 `~~strike~~`가 marker 노출 없이 렌더링
- table cell 안의 `~~strike~~`와 `**bold**` 조합이 정상 렌더링
- Vditor mode별 WYSIWYG/IR/SV 차이를 문서화
- HTML/PDF export에서 같은 fixture가 깨지는지 확인
- Excel strike fixture는 Phase 6에서 별도로 준비

핵심 판단:

```text
스크린샷의 실제 증상은 Markdown CJK inline formatting 문제다.
Excel renderer는 strike를 그릴 수 있으므로 Excel은 reader/style bridge 확인으로 분리한다.
```

> 로컬 근거: `/Users/jun/.cli-jaw-3462/uploads/1779601501317_e12c495e_Screenshot2026-05-24at24440PM.png`
> 로컬 근거: `resource/vditor/index.js`, `resource/vditor/util.js`, `resource/vditor/vditor.css`
> 로컬 근거: `src/react/view/excel/excel_reader.ts`
> 로컬 근거: `src/react/view/excel/x-spreadsheet/canvas/draw.js`

## Phase 6. Excel Strikethrough Preservation

Markdown CJK inline formatting이 안정된 뒤, Excel preview에서 취소선 cell style이 보이게 하는 단계입니다.

수정 후보:

```text
src/react/view/excel/excel_reader.ts
src/react/view/excel/excel_writer.ts
src/react/view/excel/x-spreadsheet/core/data_proxy.js
src/react/view/excel/x-spreadsheet/canvas/draw.js
```

완료 기준:

- strike가 들어간 `.xlsx` fixture 준비
- cell 전체 strike가 preview에 표시
- bold/italic/underline과 같이 있을 때도 깨지지 않음
- rich text 일부 strike는 지원 여부를 별도 문서화

핵심 판단:

```text
현재 x-spreadsheet renderer는 strike를 그릴 수 있다.
먼저 reader가 SheetJS style을 버리는지 확인한다.
```

> 로컬 근거: `src/react/view/excel/excel_reader.ts`
> 로컬 근거: `src/react/view/excel/x-spreadsheet/core/data_proxy.js`
> 로컬 근거: `src/react/view/excel/x-spreadsheet/canvas/draw.js`

## Phase 7. LibreOffice Fallback (optional, deferred)

원본 `vscode-office`(cweijan/rjwang)는 LibreOffice 의존성이 없었습니다. 현재 코드베이스의 `src/service/pptx/libreOfficeConverter.ts`와 `extension.ts`의 `previewLegacyPresentation` 커맨드는 우리가 추가한 것입니다. 코드를 제거하지 않고 비활성 상태로 유지하며, 향후 사용자 설정으로 opt-in 활성화할 수 있는 optional fallback으로 남겨둡니다.

PPTX pure JS renderer로 보기 어려운 복잡한 파일이나 legacy `.ppt`를 위한 optional fallback입니다. 기본 기능으로 넣지 않습니다.

수정/추가 후보:

```text
src/service/pptx/libreOfficeConverter.ts
src/provider/officeViewerProvider.ts
package.json configuration
```

완료 기준:

- 사용자가 설정으로 fallback을 켤 수 있음
- LibreOffice 미설치 시 명확한 안내
- timeout, stderr, temp file cleanup 처리
- `.ppt` 지원 여부 별도 표시

> 출처: [mutyai/pptviewer LibreOffice converter](https://github.com/mutyai/pptviewer/blob/main/src/libreoffice-converter.ts)

## Phase 8. HWP/HWPX Native Support

`.hwp`/`.hwpx` 네이티브 지원을 rhwp 기반 WebView editor로 추가합니다.
한컴오피스나 LibreOffice 없이 순수 Web/WASM runtime으로 원본 레이아웃 수준
렌더링과 편집 UI를 제공합니다.

2026-05-29 correction: viewer-only HWP/HWPX support is not acceptable for this
project. Phase 8.2 security-first work temporarily moved toward local bundle and
viewer-only defaults, but that direction was rejected because it disabled the
actual rhwp editing value. Current default is full upstream rhwp studio editing
with save enabled. See
`devlog/_plan/260524_vscode_obsdian_baseline/08.2f_phase_08_hwp_full_editing_recovery_audit.md`.
Lifecycle and security hardening was then completed without reverting to
viewer-only behavior. See
`devlog/_plan/260524_vscode_obsdian_baseline/08.2g_phase_08_hwp_lifecycle_hardening_completion.md`.
The older security/lifecycle recovery plan remains useful as a hardening
reference:
`devlog/_plan/260524_vscode_obsdian_baseline/08.2_phase_08_hwp_security_lifecycle_recovery.md`.
Exact diff-level implementation addendum:
`devlog/_plan/260524_vscode_obsdian_baseline/08.2a_phase_08_hwp_security_exact_diffs.md`.
Backend revalidation fix addendum:
`devlog/_plan/260524_vscode_obsdian_baseline/08.2b_phase_08_hwp_security_revalidation_fixes.md`.
Frontend revalidation fix addendum:
`devlog/_plan/260524_vscode_obsdian_baseline/08.2c_phase_08_hwp_frontend_revalidation_fixes.md`.

수정/추가 후보:

```text
NEW  src/provider/handlers/hwpHandler.ts
NEW  src/react/view/hwp/Hwp.tsx
NEW  src/react/view/hwp/rhwpBridge/*
MOD  src/provider/officeViewerProvider.ts
MOD  src/react/main.tsx (route 추가)
MOD  package.json (filenamePattern; @rhwp/editor runtime dependency removed)
MOD  build.ts (local rhwp-studio asset copy)
MOD  src/common/reactApp.ts (CSP + local asset config)
```

완료 기준:

- `.hwp`, `.hwpx` 파일을 VS Code에서 열면 rhwp 에디터가 WebView에 표시됨
- default path loads bundled local rhwp-studio with full editor features
- HWP/HWPX save is enabled by default and can be disabled by setting
- HWP saves as HWP, HWPX saves as HWPX
- 테이블, 이미지, 한글 텍스트가 정상 렌더링됨
- 기존 파일 타입 (PPTX, DOCX, Excel, PDF) regression 없음
- VSIX 패키징 성공
- CustomEditorProvider dirty/save/save-as/revert/backup lifecycle is implemented
- `npm run release:local` passes before GitHub Release or Marketplace publish

> 출처: [edwardkim/rhwp](https://github.com/edwardkim/rhwp)
> 출처: [golbin/hop](https://github.com/golbin/hop)
> 참고: [@rhwp/editor npm](https://www.npmjs.com/package/@rhwp/editor) — discarded wrapper path after security/lifecycle audit

## Phase 8.2. HWP/HWPX Security And Lifecycle Recovery

Phase 8.2 started as a corrective phase after the Insiders runtime audit showed
that a small HWPX file rendered while the wrapper still reported
`Failed to load: Request timeout: loadFile`. The first safe direction attempted
local bundle plus viewer-only defaults. That was superseded by Phase 8.2f after
the user clarified that full rhwp editing is the product requirement.

수정 후보:

```text
MOD  src/react/view/hwp/Hwp.tsx
MOD  src/provider/handlers/hwpHandler.ts
MOD  src/provider/officeViewerProvider.ts or split provider for editable mode
MOD  src/common/reactApp.ts
NEW  src/react/view/hwp/rhwpBridge/*
MOD  package/build assets for local rhwp-studio bundle
MOD  package.json activation/configuration if needed
```

현재 완료/미완료 기준:

- default path loads bundled local `resource/rhwp-studio` to preserve full editor features without remote default trust
- local rhwp-studio is direct-mounted in the host WebView; nested `srcdoc` iframe was rejected after resource resolution failures
- local WASM fetches are rewritten from `/assets/*.wasm` to bundled WebView resource URIs
- optional remote `hwp.studioUrl` is allowed only through dynamic CSP sources
- HWP bridge validates source/origin/type/payload
- viewer-only mode is opt-out only, not the default
- full editing and toolbar save are default
- real VS Code dirty/save/save-as/backup/revert lifecycle is implemented
- `.hwpx -> .hwp` conversion never silently overwrites an existing sibling
- stale `workbench.editorAssociations` entries for `cweijan.officeViewer` are migrated to `cweijan.hwpEditor`
- the known HWPX fixture opens without a stale timeout banner
- Backend and Frontend employee audits both PASS
- `08.2a_phase_08_hwp_security_exact_diffs.md` is synchronized with this roadmap
- `08.2b_phase_08_hwp_security_revalidation_fixes.md` closes revalidation findings
- `08.2c_phase_08_hwp_frontend_revalidation_fixes.md` closes frontend revalidation findings
- `08.2f_phase_08_hwp_full_editing_recovery_audit.md` records the final full-editing correction
- `08.2g_phase_08_hwp_lifecycle_hardening_completion.md` records the lifecycle hardening completion
- `98_dependency_audit_snapshot.md` is refreshed before release

Remaining known limitation:

```text
Precise dirty tracking and native undo/redo integration require rhwp to expose
granular edit events. Current implementation uses conservative content-change
dirty signals.
```

2026-05-29 release polish update:

```text
README/NOTICE/GitHub Pages now describe HWP/HWPX as a shipped editable feature.
structure/release.md is the canonical release runbook.
scripts/verify-vsix.mjs checks packaged rhwp runtime inclusion and source exclusions.
```

## 전역 검증 묶음

코드 수정 phase부터는 아래 검증을 기본으로 둡니다.

```text
npm install
npm run typecheck
npm run build
npm run verify:hwp
npm run package:verify
npm run release:local
VS Code Extension Development Host manual QA:
  README/metadata 확인
  .md wikilink completion
  .md wikilink navigation
  Vditor preview wikilink click
  .pptx/.pptm/.ppsx PowerPoint-like viewer open
  .hwp/.hwpx preview open (Phase 8+)
  Markdown CJK strike/bold/table fixture
  styled .xlsx strike render
```

문서만 수정하는 단계에서는 build를 생략할 수 있습니다. 코드, package metadata,
release script, VSIX packaging surface를 수정한 phase부터는 `npm run
release:local`을 검증합니다.
