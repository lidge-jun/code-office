# 02 dev_docx — DOCX 편집 통합 기록

> 작업일: 2026-06-05
> 브랜치: dev_docx
> 워크트리: /Users/jun/Developer/new/700_projects/code-office--dev_docx
> 상태: Phase 1 완료 (빌드 통과)

---

## 변경 파일

| 파일 | 변경 | 설명 |
|------|------|------|
| `src/react/view/word/Word.tsx` | MOD | docx-preview → DocxEditor 교체 |
| `src/react/view/word/Word.css` | MOD | 에디터 스타일 조정 |
| `src/provider/handlers/docxHandler.ts` | NEW | save 브릿지 + dirty lifecycle |
| `src/provider/officeViewerProvider.ts` | MOD | DOCX route에 handleDocx 연결 |
| `package.json` | MOD | `@eigenpal/docx-editor-react` ^1.2.1 추가 |

## 구현 내용

### Word.tsx 재작성

기존 (`docx-preview` read-only):
```tsx
docx.renderAsync(res, content.current, null, {})
```

변경 (`@eigenpal/docx-editor-react` WYSIWYG):
```tsx
<DocxEditor
    ref={editorRef}
    documentBuffer={documentBuffer}
    mode="editing"
    showToolbar={true}
    showZoomControl={true}
    showRuler={true}
    onChange={handleChange}
    onSave={handleSave}
    onError={handleError}
/>
```

### docxHandler.ts 구조

```
DocxSaveBridge
├── requestSave() → Promise<SaveResponse>
│   ├── requestId 생성
│   ├── WebView에 saveRequest 전송
│   ├── 60초 타임아웃
│   └── WebView의 saveResponse로 resolve
├── resolvePendingSave(payload)
└── destroy()

handleDocx(uri, handler, options)
├── init → 파일 읽기 → openBuffer 이벤트
├── fallback → asWebviewUri → open 이벤트
└── dirtyChanged → 콜백
```

### 이벤트 프로토콜

```
Extension → WebView:
  "open"           → { path }          (URL fetch 방식)
  "openBuffer"     → { buffer, fileName } (postMessage 바이너리)
  "docxSaveRequest" → { requestId }

WebView → Extension:
  "init"
  "docxDirtyChanged"  → { isDirty }
  "docxSaveResponse"  → { requestId, success, bytes?, error? }
```

## 빌드 검증

```
✅ npm run build — 성공
   HyperlinkDialog chunk: 1,408.24 kB (docx-editor 코드 포함)
   빌드 시간: 36.04s
   경고 0건, 에러 0건
```

## 커밋

```
f6e3bf4 feat(docx): replace docx-preview with eigenpal/docx-editor for WYSIWYG editing
  5 files changed, 328 insertions(+), 62 deletions(-)
```

## 남은 작업

- [ ] VS Code Extension Dev Host에서 실제 DOCX 파일 열어서 렌더링 확인
- [ ] Cmd+S 저장 흐름 end-to-end 검증
- [ ] 기존 DOCX fixture와 렌더링 비교
- [ ] VSIX 패키징 사이즈 확인
- [ ] docx-preview fallback 경로 구현 (에러 시)
