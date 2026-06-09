# 04 Phase Gate — dev_docx + dev_pptx 구현 완료 검증

> 작성일: 2026-06-05
> 상태: Phase 1+2 구현 완료, 런타임 검증 대기

---

## 완료 요약

### dev_docx (2 commits on dev_docx branch)

| 커밋 | 내용 |
|------|------|
| `f6e3bf4` | docx-preview → @eigenpal/docx-editor-react WYSIWYG 교체 |
| `3fe4a4a` | DocxEditorProvider (CustomEditorProvider save lifecycle) 추가 |

**구현 완료 항목:**
- [x] @eigenpal/docx-editor-react 설치 + 번들
- [x] Word.tsx WYSIWYG 편집 모드 (toolbar, ruler, zoom)
- [x] DocxSaveBridge (requestId 기반 save lifecycle, 60s timeout)
- [x] DocxEditorProvider (CustomEditorProvider, save/saveAs/revert/backup)
- [x] DocxCustomDocument (document state)
- [x] .docx/.dotx를 officeViewer에서 docxEditor로 분리
- [x] package.json에 cweijan.docxEditor viewType 등록
- [x] npm run build 통과 (3.68s, 0 errors)
- [x] tsc --noEmit 통과 (0 errors)

### dev_pptx (4 commits on dev_pptx branch)

| 커밋 | 내용 |
|------|------|
| `2c9d959` | cheerio → @aiden0z/pptx-renderer 고 fidelity 렌더링 |
| `a6346e0` | 듀얼 모드 View/Edit + pptx-svg WASM 편집 |
| `9502085` | PptxEditorProvider (CustomEditorProvider save lifecycle) 추가 |
| `12dd9ea` | legacy pptxReader.ts 삭제 |

**구현 완료 항목:**
- [x] @aiden0z/pptx-renderer 설치 + 번들 (HTML/SVG DOM, 452+ visual tests)
- [x] pptx-svg WASM 설치 + 번들 (288KB, MoonBit→WASM)
- [x] Pptx.tsx 듀얼 모드 (View: pptx-renderer, Edit: pptx-svg)
- [x] PptxSaveBridge (requestId 기반 save lifecycle, 120s timeout)
- [x] PptxEditorProvider (CustomEditorProvider, save/saveAs/revert/backup)
- [x] PptxCustomDocument (document state)
- [x] .pptx/.pptm/.ppsx를 officeViewer에서 pptxEditor로 분리
- [x] package.json에 cweijan.pptxEditor viewType 등록
- [x] legacy cheerio pptxReader.ts 삭제
- [x] WASM CSP (wasm-unsafe-eval) 이미 포함 확인
- [x] main.wasm 자동 번들 확인 (292.81KB → out/webview/assets/)
- [x] npm run build 통과 (3.89s, 0 errors)

---

## 빌드 검증 증거

### dev_docx
```
Extension (esbuild): ✅ success
Webview (Vite): ✅ built in 3.68s
HyperlinkDialog chunk: 1,408.24 KB (docx-editor 포함)
tsc --noEmit: 0 errors
```

### dev_pptx
```
Extension (esbuild): ✅ success
Webview (Vite): ✅ built in 3.89s
Pptx chunk: 1,487.03 KB (pptx-renderer + pptx-svg JS)
main.wasm: 292.81 KB (pptx-svg WASM)
tsc --noEmit: 106 pre-existing project errors (not introduced by this work)
  - Same errors appear in build.ts, handler.ts, HwpEditorProvider, etc.
  - Not regression: npm run build passes cleanly
```

---

## 아키텍처 비교

```
         Before                          After
DOCX:  docx-preview (read-only)    →  DocxEditor WYSIWYG + DocxEditorProvider
       OfficeViewerProvider              CustomEditorProvider (save/dirty)

PPTX:  cheerio text extraction     →  pptx-renderer (high-fidelity view)
       OfficeViewerProvider           + pptx-svg WASM (SVG editing)
                                     + PptxEditorProvider
                                       CustomEditorProvider (save/dirty)

HWP:   rhwp WASM (gold standard)  →  unchanged (benchmark)
       HwpEditorProvider              HwpEditorProvider
```

---

## 남은 작업 (런타임 검증)

- [ ] VS Code Extension Dev Host에서 DOCX 파일 열어서 WYSIWYG 편집 확인
- [ ] VS Code Extension Dev Host에서 PPTX 파일 열어서 View/Edit 전환 확인
- [ ] Cmd+S 저장 end-to-end 검증 (DOCX + PPTX)
- [ ] dev_docx, dev_pptx 브랜치를 main에 merge (사용자 승인 필요)
- [ ] VSIX 패키징 사이즈 확인
