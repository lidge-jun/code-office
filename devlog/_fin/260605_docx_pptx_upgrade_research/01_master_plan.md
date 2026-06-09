# 260605 DOCX/PPTX 편집 구현 마스터 플랜

> 작성일: 2026-06-05
> 목표: code-office에서 DOCX/PPTX 편집을 rhwp 수준으로 구현
> 상태: 진행 중

---

## 0. 작업 구조

```
code-office (main)              ← 안정 브랜치
├── worktree: dev_docx          ← DOCX 편집 통합
└── worktree: dev_pptx          ← PPTX 고fidelity 보기 + 편집 통합

upstream repos (참조/연구용):
├── /Users/jun/Developer/new/700_projects/_upstream/docx-editor
├── /Users/jun/Developer/new/700_projects/_upstream/pptx-renderer
└── /Users/jun/Developer/new/700_projects/_upstream/pptx-svg
```

---

## 1. dev_docx — DOCX 편집 트랙

### 대상 라이브러리
- **eigenpal/docx-editor** (Apache-2.0, ⭐1.5k, v1.0.3)
- ProseMirror + OOXML round-trip
- React 어댑터: `@eigenpal/docx-editor-react`

### 구현 단계

| # | 단계 | 설명 | 상태 |
|---|------|------|------|
| 1 | upstream clone | eigenpal/docx-editor 클론, 구조 분석 | ✅ |
| 2 | 설치 + 빌드 검증 | code-office에 @eigenpal/docx-editor-react 설치, 빌드 통과 확인 | ✅ |
| 3 | Word.tsx 교체 | docx-preview → DocxEditor 컴포넌트로 전환 | ✅ |
| 4 | 읽기 모드 검증 | 기존 DOCX fixture로 렌더링 비교 | ⬜ |
| 5 | save 브릿지 | DocxEditorRef.save() → postMessage → extension host → fs.write | ✅ |
| 6 | dirty lifecycle | onChange → dirty flag, CustomEditorProvider 통합 | ✅ |
| 7 | CSP 검증 | VS Code Extension Dev Host에서 실제 동작 확인 | ⬜ |
| 8 | fallback | docx-editor 실패 시 docx-preview fallback 경로 | ⬜ |
| 9 | bundle size 확인 | VSIX 패키징 + 사이즈 비교 | ⬜ |
| 10 | devlog 문서화 | jawdev식 plan + 결과 정리 | ✅ |

### 파일 변경 예상

```
MOD  src/react/view/word/Word.tsx
MOD  src/react/view/word/Word.less
NEW  src/provider/handlers/docxHandler.ts
MOD  src/provider/officeViewerProvider.ts
MOD  src/common/reactApp.ts (CSP)
MOD  package.json
MOD  build.ts
```

---

## 2. dev_pptx — PPTX 보기/편집 트랙

### 대상 라이브러리
- **Phase A (보기)**: aiden0z/pptx-renderer (Apache-2.0, ⭐34, v1.0.3) — HTML/SVG DOM
- **Phase B (편집)**: t-ujiie-g/pptx-svg (MIT, ⭐4) — MoonBit→WASM, 양방향 PPTX↔SVG

### 구현 단계

#### Phase A: 고 fidelity 보기

| # | 단계 | 설명 | 상태 |
|---|------|------|------|
| 1 | upstream clone | pptx-renderer + pptx-svg 클론, 구조 분석 | ✅ |
| 2 | 설치 + 빌드 검증 | @aiden0z/pptx-renderer 설치, 빌드 통과 확인 | ✅ |
| 3 | Pptx.tsx 재작성 | cheerio 텍스트 추출 → PptxViewer.open() 기반 | ✅ |
| 4 | 렌더링 비교 | 기존 PPTX fixture로 fidelity 비교 (스크린샷) | ⬜ |
| 5 | cheerio 파서 제거 | pptxReader.ts + pptxHandler.ts 제거 | ✅ |
| 6 | CSP 검증 | SVG inline 렌더링 WebView 동작 확인 | ⬜ |
| 7 | 의존성 정리 | adm-zip/cheerio PPTX 관련 제거 | ⬜ |

#### Phase B: 편집 (pptx-svg WASM)

| # | 단계 | 설명 | 상태 |
|---|------|------|------|
| 8 | pptx-svg 구조 분석 | WASM 바이너리, renderSlideSvg(), round-trip API | ✅ |
| 9 | WASM 번들 통합 | main.wasm을 extension에 번들, CSP wasm-unsafe-eval | ✅ |
| 10 | 보기 → 편집 전환 | SVG 위에 편집 UI 구현 (rhwp viewer→edit 패턴) | ✅ |
| 11 | 저장 round-trip | SVG → PPTX 변환 + 파일 저장 | ✅ |
| 12 | devlog 문서화 | jawdev식 plan + 결과 정리 | ✅ |

### 파일 변경 예상

```
DEL  src/provider/handlers/pptxReader.ts
DEL  src/provider/handlers/pptxHandler.ts
MOD  src/react/view/pptx/Pptx.tsx
MOD  src/react/view/pptx/Pptx.less
MOD  src/common/reactApp.ts (CSP)
MOD  package.json
MOD  build.ts
```

---

## 3. 검증 전략

```
각 단계마다:
1. 빌드 통과 확인 (npm run build)
2. 기존 테스트 통과 (npm run test:ci)
3. fixture 파일로 수동 검증 (VS Code Extension Dev Host)
4. 스크린샷 비교 (before/after)
5. VSIX 패키징 사이즈 확인
```

---

## 4. 리스크 대응

| 리스크 | 대응 |
|--------|------|
| docx-editor WebView CSP 불호환 | fallback으로 docx-preview 유지 |
| pptx-renderer 번들 과대 | tree-shaking + lazy import 시도 |
| pptx-svg WASM 불안정 | Phase B를 실험적 취급, Phase A만으로도 가치 있음 |
| 빌드 브레이크 | 워크트리 분리로 main 보호 |
