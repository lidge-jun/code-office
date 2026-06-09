# 03 dev_pptx — PPTX 고 fidelity 보기 + 편집 통합 기록

> 작업일: 2026-06-05
> 브랜치: dev_pptx
> 워크트리: /Users/jun/Developer/new/700_projects/code-office--dev_pptx
> 상태: Phase A+B 구현 완료 (빌드 검증 중)

---

## 변경 파일

| 파일 | 변경 | 설명 |
|------|------|------|
| `src/react/view/pptx/Pptx.tsx` | MOD | 듀얼 모드: View(pptx-renderer) + Edit(pptx-svg) |
| `src/react/view/pptx/Pptx.less` | MOD | 렌더러 + 에디터 스타일 |
| `src/provider/handlers/pptxHandler.ts` | MOD | URI 전송 + PptxSaveBridge |
| `package.json` | MOD | `@aiden0z/pptx-renderer` + `pptx-svg` 추가 |

## 아키텍처

### 듀얼 렌더링 모드

```
View 모드 (기본):
  @aiden0z/pptx-renderer
  ├── PptxViewer.open(buffer, container, options)
  ├── HTML/SVG DOM 렌더링
  ├── 452+ visual regression test 검증된 fidelity
  └── 읽기 전용

Edit 모드:
  pptx-svg (MoonBit → WASM, ~280KB)
  ├── PptxRenderer.init() → WASM 로드
  ├── PptxRenderer.loadPptx(buffer)
  ├── PptxRenderer.renderSlideSvg(idx) → SVG 문자열
  ├── PptxRenderer.updateShapeText/Transform/Fill(...)
  └── PptxRenderer.exportPptx() → ArrayBuffer (round-trip)
```

### 이벤트 프로토콜

```
Extension → WebView:
  "pptxOpen"        → { path, name }
  "pptxSaveRequest" → { requestId }

WebView → Extension:
  "init"
  "pptxDirtyChanged"  → { isDirty }
  "pptxSaveResponse"  → { requestId, success, bytes?, error? }
```

### pptx-svg 편집 API (사용 가능한 것들)

```typescript
// Shape 편집
renderer.updateShapeTransform(slideIdx, shapeIdx, x, y, cx, cy, rot)
renderer.updateShapeText(slideIdx, shapeIdx, paraIdx, runIdx, text)
renderer.updateShapeFill(slideIdx, shapeIdx, r, g, b)
renderer.deleteShape(slideIdx, shapeIdx)
renderer.addShape(slideIdx, geomType, x, y, cx, cy, fillR, fillG, fillB)
renderer.duplicateShape(slideIdx, shapeIdx, dxEmu, dyEmu)

// 텍스트 편집
renderer.addParagraph(slideIdx, shapeIdx, text, align)
renderer.deleteParagraph(slideIdx, shapeIdx, paraIdx)
renderer.updateTextRunStyle(slideIdx, shapeIdx, paraIdx, runIdx, bold, italic)
renderer.updateTextRunFontSize(slideIdx, shapeIdx, paraIdx, runIdx, fontSize)
renderer.updateTextRunColor(slideIdx, shapeIdx, paraIdx, runIdx, r, g, b)

// 이미지
renderer.addImage(slideIdx, imageData, mimeType, x, y, cx, cy)
renderer.replaceImage(slideIdx, shapeIdx, imageData, mimeType)

// 슬라이드 관리
renderer.addSlide(afterIdx, sourceSlideIdx)
renderer.deleteSlide(slideIdx)
renderer.reorderSlides(newOrder)

// 내보내기
renderer.exportPptx() → Promise<ArrayBuffer>
```

## Phase A: 고 fidelity 보기 (완료)

### 커밋
```
2c9d959 feat(pptx): replace cheerio text extraction with pptx-renderer for high-fidelity rendering
  4 files changed, 186 insertions(+), 122 deletions(-)
```

### 빌드 검증
```
✅ npm run build — 성공
   Pptx chunk: 609.06 KB gzip: 176.77 KB (pptx-renderer 포함)
   빌드 시간: 32.94s
   경고 0건 (static import로 수정 후)
```

### 이전 vs 현재

```
이전 (cheerio 텍스트 추출):
  Extension host: AdmZip → cheerio → a:t 텍스트 + base64 이미지
  WebView: 텍스트 목록 + 이미지 카드

현재 (pptx-renderer):
  Extension host: 파일 URI만 전송
  WebView: fetch → PptxViewer.open() → HTML/SVG DOM
  187+ shapes, 134+ SmartArt, 차트, 테이블, 그라데이션
```

## Phase B: 편집 (pptx-svg WASM) — 구현 완료, 빌드 검증 중

### 구현 내용

1. `pptx-svg` 설치 (zero dependencies, ~280KB WASM)
2. Pptx.tsx에 듀얼 모드 토글 (`View` ↔ `Edit`)
3. Edit 모드에서 pptx-svg의 `renderSlideSvg()` 으로 SVG 렌더링
4. `exportPptx()` 으로 round-trip 저장
5. PptxSaveBridge 구현 (requestId 매칭, 120초 타임아웃)
6. auto-save 핸들러 (WebView → extension host → fs.writeFile)

## 남은 작업

- [ ] 빌드 통과 확인
- [ ] VS Code Extension Dev Host에서 PPTX 파일 열기 테스트
- [ ] View ↔ Edit 모드 전환 동작 확인
- [ ] shape 클릭 선택 + 편집 UI 구현 (인터랙티브 에디터)
- [ ] exportPptx() end-to-end 저장 검증
- [ ] VSIX 패키징 사이즈 확인
- [ ] WASM CSP 호환성 테스트 (wasm-unsafe-eval)
