# Phase 8: HWP/HWPX Native Support via @rhwp/editor

Created: 2026-05-28
Hardened: 2026-05-28 (API surface investigation completed)

## Part 1 — Easy Explanation

VS Code에서 `.hwp`/`.hwpx` 파일을 열면 바로 내용을 볼 수 있고, **편집 후 저장까지 가능**합니다.
한컴오피스 없이도 rhwp 오픈소스 엔진(Rust→WebAssembly)으로 원본 레이아웃 수준 렌더링+편집이 됩니다.

`@rhwp/editor` npm 패키지(19KB thin wrapper)가 iframe으로 rhwp-studio를 임베드합니다.
rhwp-studio 안에서 `@rhwp/core` WASM(4.8MB)이 돌면서 170+ editing API를 제공합니다.
기존 PPTX/DOCX 등이 custom editor로 열리는 것과 동일한 패턴입니다.

## Part 2 — Technical Plan (Hardened)

### API Surface Investigation Summary

#### @rhwp/editor (npm 0.7.13, 19.2KB)

**정체: rhwp-studio를 iframe으로 임베드하는 thin wrapper.** WASM을 포함하지 않음.

```typescript
// 전체 exported API — 이게 전부
export function createEditor(container: string | HTMLElement, options?: EditorOptions): Promise<RhwpEditor>;

interface EditorOptions {
  studioUrl?: string;   // default: 'https://edwardkim.github.io/rhwp/'
  width?: string;       // default: '100%'
  height?: string;      // default: '100%'
}

class RhwpEditor {
  loadFile(data: ArrayBuffer | Uint8Array, fileName?: string): Promise<LoadResult>;
  pageCount(): Promise<number>;
  getPageSvg(page?: number): Promise<string>;
  exportHwp(): Promise<Uint8Array>;    // ← 편집된 문서를 HWP 바이너리로 추출
  exportHwpx(): Promise<Uint8Array>;   // ← HWPX로 추출 (beta)
  exportHwpVerify(): Promise<HwpVerifyResult>;
  readonly element: HTMLIFrameElement;
  destroy(): void;
}
```

- 통신: `postMessage` request/response (10초 timeout)
- 데이터 직렬화: `Array.from(new Uint8Array(data))` → JSON 숫자 배열
- 이벤트 구독: **불가** (dirty state, document-changed 등 콜백 없음)

#### @rhwp/core (npm 0.7.13, 5.4MB)

**정체: 실제 WASM 엔진.** `HwpDocument` 클래스 170+ 메서드.

- Text: insert/delete/replace/search/splitParagraph/mergeParagraph
- Table: create/insertRow/deleteRow/mergeCells/splitCell/formula
- Image: insertPicture/deletePicture/getImageData
- Format: applyCharFormat/applyParaFormat/applyStyle
- Shape: createShapeControl/groupShapes/changeZOrder
- Equation: insertEquation/renderEquationPreview(SVG)
- Header/Footer: create/delete/template/insertField
- Footnote: create/delete/edit
- Bookmark: add/delete/rename
- Clipboard: copy/paste/pasteHtml
- Undo: saveSnapshot/restoreSnapshot/discardSnapshot (snapshot-based)
- Export: `exportHwp()→Uint8Array`, `exportHwpx()→Uint8Array`
- Render: `renderPageSvg()`, `renderPageToCanvas()`, `renderPageHtml()`
- Required: `globalThis.measureTextWidth(font, text)→number` before WASM init

#### rhwp-vscode (기존 VS Code extension)

- `CustomReadonlyEditorProvider` — 뷰어 전용, 에디터 아님
- `@rhwp/core` WASM을 WebView에서 직접 로드
- CSP: `script-src 'nonce-${nonce}' ${cspSource} 'unsafe-eval' 'wasm-unsafe-eval'`
- 폰트: CDN (`cdn.jsdelivr.net`) + 로컬 woff2
- 파일 전달: extension host → postMessage → WebView
- WASM 로딩: `webview.asWebviewUri()` 경로

#### HOP 데스크톱 앱 (rhwp-studio 기반)

- rhwp-studio를 git submodule로 포함, Vite alias override로 모듈 교체
- 저장 흐름: `HwpDocument.exportHwp()` → staged write → atomic rename
- HWPX save: UI에서 차단 (beta) → HWP로만 저장 가능
- External modification detection (fingerprint 비교)

### 선택된 경로: @rhwp/editor iframe 임베드 (2-stage)

| 항목 | 내용 |
|------|------|
| 라이브러리 | `@rhwp/editor` (19KB iframe wrapper) |
| WASM | rhwp-studio 내장 (studioUrl에서 로드, 우리 extension에 번들 안 함) |
| npm 버전 | `@rhwp/editor@^0.7.13` |
| VSIX 크기 증가 | **~0KB** (WASM은 studioUrl에서 로드) |
| 렌더링 | SVG/Canvas, 원본 레이아웃 수준 |
| 편집 | **가능** — rhwp-studio 전체 에디터 UI (툴바, 테이블 편집, 서식 등) |
| 저장 | `exportHwp()→Uint8Array` → `fs.writeFile` |
| 라이선스 | MIT |
| 네트워크 | Stage 1: GitHub Pages 의존 (online) / Stage 2: 로컬 번들 (offline) |

### 왜 이 경로인가 (재평가)

| 경로 | 구현 난이도 | 편집 가능 | VSIX 크기 | Dirty State | 오프라인 |
|------|------------|----------|-----------|-------------|---------|
| **A: @rhwp/editor iframe** | **낮음** | **O** | ~0MB | **X** | Stage2에서 |
| B: @rhwp/core 직접 (뷰어) | 중간 | X | +5MB | O | O |
| C: rhwp-studio fork (HOP패턴) | 높음 | O | +15MB | O | O |
| D: kordoc HTML | 낮음 | X | ~1MB | N/A | O |

→ **경로 A 확정** (사용자 결정). 최소 구현으로 최대 기능.

### 제약사항 (조사 결과 발견)

1. **Dirty State 감지 불가**: `@rhwp/editor`는 이벤트 콜백을 노출하지 않음. VS Code의 "unsaved changes" 표시 불가.
   - 대응: 편집이 일어났다고 가정하고, 닫을 때 항상 "저장할까요?" 물어봄
2. **네트워크 의존 (Stage 1)**: 기본 `studioUrl`이 `https://edwardkim.github.io/rhwp/`. 오프라인시 로드 실패.
   - 대응: Stage 2에서 rhwp-studio dist를 extension에 번들
3. **HWPX 저장 Beta**: `exportHwpx()`는 API 존재하지만 studio UI에서 차단. HWPX→HWP 변환 저장만 안정.
   - 대응: 저장은 HWP 포맷으로만 지원. HWPX 원본은 HWP로 변환 저장됨을 안내.
4. **대용량 파일 직렬화**: `loadFile()`이 내부적으로 `Array.from(new Uint8Array(data))` → JSON 숫자 배열로 전송. 대용량 파일에서 느릴 수 있음.
   - 대응: 50MB 이상 파일은 경고 표시
5. **iframe CSP**: VS Code WebView에서 외부 URL iframe 로드 시 `frame-src` CSP 설정 필요.
6. **폰트**: rhwp-studio가 CDN에서 한글 폰트를 로드. VS Code WebView에서 `font-src https://cdn.jsdelivr.net` CSP 필요.

### 아키텍처

```text
[Stage 1: Online Mode]

User opens .hwp/.hwpx
  → VS Code custom editor (cweijan.officeViewer)
    → officeViewerProvider.resolveCustomEditor()
      → ext = ".hwp" | ".hwpx"
        → route = 'hwp'
        → handleHwp(uri, handler)
          → handler.on('init', ...) // 파일 읽기
          → handler.emit('hwpData', { fileName, buffer(base64), fileSize })
    → ReactApp.view(webview, { route: 'hwp' })
      → main.tsx switch → <Hwp />
        → Hwp.tsx:
          1. createEditor(containerDiv, { studioUrl: 'https://edwardkim.github.io/rhwp/' })
          2. onMessage('hwpData') → editor.loadFile(buffer, fileName)
          3. 문서 렌더링 (iframe 내부 rhwp-studio가 처리)

[Save Flow]
User clicks "Save" button in our UI
  → Hwp.tsx: editor.exportHwp() → Uint8Array
    → postMessage to extension host: { type: 'saveHwp', buffer: base64 }
      → hwpHandler: fs.writeFile(uri.fsPath, Buffer.from(base64, 'base64'))
        → 파일 저장 완료
```

### 파일 변경 목록

#### NEW files

```text
src/react/view/hwp/Hwp.tsx                    [~120 lines]
src/react/view/hwp/Hwp.less                   [~40 lines]
src/provider/handlers/hwpHandler.ts            [~60 lines]
```

#### MODIFY files

```text
package.json
  dependencies에 추가:
    "@rhwp/editor": "^0.7.13"
  contributes.customEditors[0].selector에 추가:
    { "filenamePattern": "*.hwp" },
    { "filenamePattern": "*.hwpx" }

src/provider/officeViewerProvider.ts
  BEFORE (line 11):
    import { handlePptx } from './handlers/pptxHandler';
  AFTER:
    import { handlePptx } from './handlers/pptxHandler';
    import { handleHwp } from './handlers/hwpHandler';

  BEFORE (line 62-65):
            case ".pptx":
                route = 'pptx';
                handlePptx(uri, handler);
                break;
  AFTER:
            case ".hwp":
            case ".hwpx":
                route = 'hwp';
                handleHwp(uri, handler);
                break;
            case ".pptx":
                route = 'pptx';
                handlePptx(uri, handler);
                break;

src/react/main.tsx
  BEFORE (line 13):
    const Pptx = lazy(() => import('./view/pptx/Pptx.tsx'))
  AFTER:
    const Pptx = lazy(() => import('./view/pptx/Pptx.tsx'))
    const Hwp = lazy(() => import('./view/hwp/Hwp.tsx'))

  BEFORE (line 36-37):
          case 'pptx':
            return <Pptx />
  AFTER:
          case 'hwp':
            return <Hwp />
          case 'pptx':
            return <Pptx />
```

#### DELETE files

없음

### 신규 파일 상세

#### `src/provider/handlers/hwpHandler.ts`

```typescript
import { readFile, writeFile } from 'fs/promises';
import { basename } from 'path';
import { Handler } from '@/common/handler';

export function handleHwp(uri: { fsPath: string }, handler: Handler): void {
    handler.on('init', async () => {
        const buffer = await readFile(uri.fsPath);
        handler.emit('hwpData', {
            fileName: basename(uri.fsPath),
            buffer: buffer.toString('base64'),
            fileSize: buffer.byteLength,
        });
    });

    handler.on('saveHwp', async (content: { buffer: string }) => {
        const data = Buffer.from(content.buffer, 'base64');
        await writeFile(uri.fsPath, data);
        handler.emit('hwpSaved', { success: true });
    });
}
```

#### `src/react/view/hwp/Hwp.tsx`

```tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { createEditor, RhwpEditor } from '@rhwp/editor';
import { getVscode, onMessage, postMessage } from '../../util/vscode';
import './Hwp.less';

export default function Hwp() {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<RhwpEditor | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let destroyed = false;

        const init = async () => {
            if (!containerRef.current) return;

            try {
                const editor = await createEditor(containerRef.current, {
                    width: '100%',
                    height: '100%',
                });
                if (destroyed) { editor.destroy(); return; }
                editorRef.current = editor;

                onMessage('hwpData', async (data: { fileName: string; buffer: string; fileSize: number }) => {
                    try {
                        const binary = Uint8Array.from(atob(data.buffer), c => c.charCodeAt(0));
                        await editor.loadFile(binary, data.fileName);
                        setLoading(false);
                    } catch (e) {
                        setError(`Failed to load: ${e instanceof Error ? e.message : String(e)}`);
                        setLoading(false);
                    }
                });

                onMessage('hwpSaved', () => {
                    setSaving(false);
                });

                postMessage({ type: 'init' });
            } catch (e) {
                setError(`Failed to initialize editor: ${e instanceof Error ? e.message : String(e)}`);
                setLoading(false);
            }
        };

        init();

        return () => {
            destroyed = true;
            editorRef.current?.destroy();
        };
    }, []);

    const handleSave = useCallback(async () => {
        if (!editorRef.current || saving) return;
        setSaving(true);
        try {
            const hwpBytes = await editorRef.current.exportHwp();
            const base64 = btoa(String.fromCharCode(...hwpBytes));
            postMessage({ type: 'saveHwp', content: { buffer: base64 } });
        } catch (e) {
            setError(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
            setSaving(false);
        }
    }, [saving]);

    if (error) {
        return <div className="hwp-error">{error}</div>;
    }

    return (
        <div className="hwp-container">
            {loading && <div className="hwp-loading">Loading HWP document...</div>}
            <div className="hwp-toolbar">
                <button className="hwp-save-btn" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save (HWP)'}
                </button>
            </div>
            <div ref={containerRef} className="hwp-editor" />
        </div>
    );
}
```

#### `src/react/view/hwp/Hwp.less`

```less
.hwp-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    overflow: hidden;
}

.hwp-toolbar {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    background: var(--vscode-editor-background);
    border-bottom: 1px solid var(--vscode-panel-border);
    flex-shrink: 0;
}

.hwp-save-btn {
    padding: 4px 12px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 2px;
    cursor: pointer;
    font-size: 12px;
}
.hwp-save-btn:hover { background: var(--vscode-button-hoverBackground); }
.hwp-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.hwp-editor {
    flex: 1;
    overflow: hidden;
}
.hwp-editor iframe {
    border: none;
    width: 100%;
    height: 100%;
}

.hwp-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: var(--vscode-descriptionForeground);
}

.hwp-error {
    padding: 24px;
    color: var(--vscode-errorForeground);
    text-align: center;
}
```

### CSP 요구사항

현재 extension의 CSP를 확인해야 합니다. `@rhwp/editor`의 iframe이 외부 URL을 로드하므로:

```text
필수 추가:
  frame-src https://edwardkim.github.io;    ← rhwp-studio iframe
  font-src https://cdn.jsdelivr.net;         ← 한글 폰트 CDN
```

CSP는 `reactApp.ts`의 `buildPath()` 또는 `officeViewerProvider.ts`에서 설정됩니다.
현재 base tag만 설정하고 explicit CSP header는 없으므로, WebView의 기본 CSP가 적용됩니다.
iframe 외부 URL 로드가 기본 CSP에서 차단될 수 있으므로 테스트 필수.

### 저장 흐름 상세

```text
1. 사용자가 iframe 내 rhwp-studio에서 문서 편집
2. "Save (HWP)" 버튼 클릭
3. Hwp.tsx → editorRef.exportHwp() → Promise<Uint8Array>
   (postMessage로 iframe의 rhwp-studio에 요청 → WASM에서 HWP 바이너리 생성)
4. Uint8Array → base64 → postMessage to extension host
5. hwpHandler.ts → Buffer.from(base64) → fs.writeFile(uri.fsPath)
6. 저장 완료 알림

⚠️ HWPX 파일을 열어도 저장은 HWP 포맷으로 됨 (HWPX save는 beta).
   저장 시 확장자가 .hwpx → .hwp로 변경되어야 하는지 사용자에게 확인 필요.
```

### 대용량 파일 처리

`@rhwp/editor`의 `loadFile()`은 내부적으로 데이터를 JSON 숫자 배열로 직렬화합니다:
```javascript
// @rhwp/editor 내부
Array.from(new Uint8Array(data))  // 1MB file → 1M element JSON array
```

이는 대용량 파일에서 심각한 성능 문제를 일으킬 수 있습니다.

| 파일 크기 | JSON 직렬화 크기 | 예상 로드 시간 |
|-----------|-----------------|---------------|
| 1 MB | ~4 MB (JSON) | <1초 |
| 10 MB | ~40 MB (JSON) | 2-5초 |
| 50 MB+ | ~200 MB+ (JSON) | 메모리 부족 위험 |

→ 50MB 이상 파일은 경고 표시, 100MB 이상은 차단 권장.

### Stage 2 (후속): 오프라인 번들링

Stage 1 완료 후, rhwp-studio를 extension에 번들하여 오프라인 지원:

```text
1. rhwp-studio dist 빌드 (또는 GitHub Pages에서 다운로드)
2. resource/hwp/ 디렉토리에 저장 (~15MB)
3. studioUrl을 webview.asWebviewUri() 경로로 설정
4. CSP에서 외부 URL 제거, 로컬 리소스만 허용
5. VSIX 크기: ~2MB → ~17MB
```

이 단계는 Phase 8의 범위 밖이며, 별도 Phase로 진행.

### 테스트 계획

1. `.hwp` (HWP 5.0 바이너리) 파일 열기 → rhwp-studio 에디터 로드 확인
2. `.hwpx` (OWPML/XML) 파일 열기 → 동일하게 로드 확인
3. iframe 내 에디터에서 텍스트 편집 가능 확인
4. "Save (HWP)" 버튼 → 파일 저장 → 재오픈 → 편집 내용 유지 확인
5. 테이블, 이미지, 수식이 포함된 복잡한 문서 렌더링 확인
6. 한글 텍스트 렌더링 품질 확인 (폰트 로딩)
7. 대용량 문서 (20+ 페이지) 로드 성능 확인
8. WebView CSP — iframe 로드 성공 확인
9. 기존 파일 타입 (PPTX, DOCX, Excel, PDF, 이미지) regression 없음
10. 오프라인 환경에서 적절한 에러 메시지 표시 확인

### 리스크 (하드닝 후)

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| VS Code WebView CSP가 외부 iframe 차단 | **높음** | 로드 실패 | webview.options에 `enableScripts: true` 확인 + CSP 명시 설정. 최악의 경우 Stage 2로 즉시 전환 |
| studioUrl (GitHub Pages) 다운/느림 | 중간 | 로드 실패/느림 | 에러 메시지 표시 + Stage 2 오프라인 번들 후속 |
| postMessage 데이터 직렬화 (JSON 숫자 배열) 메모리 초과 | 중간 | 대용량 파일 크래시 | 파일 크기 체크 + 50MB 경고 / 100MB 차단 |
| Dirty State 미감지 | 확실 | UX 제한 | "Save" 버튼 상시 표시 + 닫을 때 항상 확인 |
| HWPX 저장 시 HWP로 변환 | 확실 | 포맷 변경 | 저장 전 사용자에게 안내 |
| DRM/암호화 문서 | 낮음 | 로드 실패 | 에러 메시지로 안내 |

### 구현 순서

```text
Step 1: npm install @rhwp/editor
Step 2: package.json — contributes.customEditors selector에 *.hwp, *.hwpx 추가
Step 3: hwpHandler.ts 작성 (파일 읽기 + buffer base64 전달 + 저장 핸들러)
Step 4: officeViewerProvider.ts — .hwp/.hwpx case 추가 + import
Step 5: Hwp.tsx + Hwp.less 작성 (createEditor + loadFile + save 버튼)
Step 6: main.tsx — route 'hwp' + lazy import 추가
Step 7: CSP 확인/설정 — frame-src, font-src 필요 시 추가
Step 8: 빌드 확인 (npm run build + tsc --noEmit)
Step 9: Extension Development Host에서 QA
  - .hwp 열기/편집/저장
  - .hwpx 열기/편집/저장
  - 기존 파일 타입 regression 확인
```

### 완료 기준

- [ ] `.hwp` 파일을 VS Code에서 열면 rhwp 에디터가 iframe으로 표시됨
- [ ] `.hwpx` 파일도 동일하게 동작
- [ ] iframe 내에서 텍스트 편집이 가능함
- [ ] "Save (HWP)" 버튼으로 편집된 내용을 디스크에 저장 가능
- [ ] 저장 후 재오픈하면 편집 내용이 유지됨
- [ ] 테이블, 이미지, 한글 텍스트가 정상 렌더링됨
- [ ] 기존 파일 타입 (PPTX, DOCX, Excel, PDF, 이미지) regression 없음
- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 성공
- [ ] VSIX 패키징 성공

### 사용자 결정 필요 항목

1. **HWPX→HWP 변환 저장**: `.hwpx` 파일을 편집 후 저장하면 `.hwp`로 저장됩니다. 원본 `.hwpx`는 그대로 두고 `.hwp` 파일을 새로 만들까요, 아니면 원본을 덮어쓸까요?
2. **Stage 2 (오프라인 번들)**: Phase 8에 포함할까요, 별도 Phase로 뺄까요?

## Research Sources

- [edwardkim/rhwp](https://github.com/edwardkim/rhwp) — Rust+WASM HWP/HWPX 에디터 (MIT, 1100+ tests)
- [golbin/hop](https://github.com/golbin/hop) / [runableapp/rhwp-desktop](https://github.com/runableapp/rhwp-desktop) — rhwp 기반 데스크톱 앱
- [@rhwp/core npm 0.7.13](https://www.npmjs.com/package/@rhwp/core) — WASM 엔진 (5.4MB, 170+ methods)
- [@rhwp/editor npm 0.7.13](https://www.npmjs.com/package/@rhwp/editor) — iframe wrapper (19.2KB, 6 methods)
- [rhwp-vscode Marketplace](https://marketplace.visualstudio.com/items?itemName=edwardkim.rhwp-vscode) — 기존 VS Code extension (뷰어 전용)
- rhwp-vscode CSP: `script-src 'nonce-${nonce}' ${cspSource} 'unsafe-eval' 'wasm-unsafe-eval'; font-src ${cspSource} https://cdn.jsdelivr.net`
- HOP save flow: `exportHwp()` → staged write → atomic rename (TauriBridge)
- HOP WASM bridge: `globalThis.measureTextWidth` + `import init from '@wasm/rhwp.js'`
