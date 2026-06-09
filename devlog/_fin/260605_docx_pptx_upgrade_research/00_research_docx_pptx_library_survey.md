# 00 Research: DOCX 편집 / PPTX 고 fidelity 렌더링 라이브러리 서베이

> 조사일: 2026-06-05
> 목적: code-office의 DOCX preview-only → 편집 전환, PPTX 텍스트 추출 → 고 fidelity 렌더링 전환 가능성 조사
> 상태: 연구 완료

---

## 1. 현재 code-office 구현 현황

### 1.1 DOCX — Preview only

현재 경로: `src/react/view/word/Word.tsx`

```tsx
// 현재 구현: docx-preview로 read-only HTML 렌더링
import * as docx from 'docx-preview';

useEffect(() => {
    handler.on("open", ({ path }) => {
        fetch(path).then(response => response.arrayBuffer()).then(res => {
            docx.renderAsync(res, content.current, null, {}).then(() => {
                updatePageInfo()
            });
        });
    }).emit('init')
}, [])
```

- 라이브러리: `docx-preview` v0.3.7
- 기능: ArrayBuffer → HTML 렌더링 (read-only)
- 편집 불가, 저장 불가
- 핸들러: `officeViewerProvider.ts` L62-64 → `route = 'word'`

### 1.2 PPTX — 텍스트/이미지 추출 only

현재 경로: `src/provider/handlers/pptxReader.ts` + `src/react/view/pptx/Pptx.tsx`

```typescript
// 현재 구현: AdmZip + cheerio로 XML에서 텍스트만 추출
import AdmZip from 'adm-zip';
import * as cheerio from 'cheerio';

export async function readPresentation(filePath: string): Promise<PptxPayload> {
    const zip = new AdmZip(filePath);
    const slideEntries = readSlideEntryNames(zip);
    const slides = slideEntries.map((entryName, index) =>
        parseSlide(zip, entryName, index + 1)
    );
    return { fileName: basename(filePath), slides };
}

function parseSlide(zip: AdmZip, entryName: string, index: number): PptxSlide {
    const xml = zip.readAsText(entryName);
    const $ = cheerio.load(xml, { xmlMode: true });
    // a:t 태그에서 텍스트만 추출 — 위치, 크기, 색상, 도형 전부 무시
    const text = $('a\\:t').map((_, el) => $(el).text().trim()).get().filter(Boolean);
    const images = readSlideImages(zip, entryName);
    return { index, title: text[0] || `Slide ${index}`, text, images };
}
```

- 도형(spTree), 슬라이드 마스터, 테마, SmartArt, 차트, 그라데이션 전부 무시
- 텍스트 + 이미지(base64) 추출 후 HTML 카드로 단순 렌더링
- PowerPoint 레이아웃 fidelity 없음

---

## 2. DOCX 편집 라이브러리 조사

### 2.1 eigenpal/docx-editor ⭐ ~1.5k (최우선 후보)

| 항목 | 내용 |
|------|------|
| GitHub | https://github.com/eigenpal/docx-editor |
| 공식 사이트 | https://docx-editor.dev |
| npm (React) | `@eigenpal/docx-editor-react` |
| npm (Vue) | `@eigenpal/docx-editor-vue` |
| npm (Core) | `@eigenpal/docx-editor-core` |
| npm (Headless) | `@eigenpal/docx-editor-core/headless` |
| npm (AI Agents) | `@eigenpal/docx-editor-agents` |
| 라이선스 | **Apache-2.0** |
| 버전 | v1.0.3 (2026-05-21 v1.0 릴리스, 6월 활발 패치) |
| 스타 | ~1,500 |
| 주의 | `@eigenpal/docx-js-editor`는 **deprecated** — 현재 패키지만 사용 |
| 백엔드 | 불요 (순수 클라이언트) |

#### 아키텍처

```
@eigenpal/docx-editor-core (Core Engine)
├── OOXML Parser — .docx ZIP → 내부 문서 모델
├── Layout Engine — 자체 레이아웃 (HTML 변환이 아님)
├── ProseMirror — 편집 상태 관리
└── OOXML Serializer — 내부 모델 → .docx ZIP (round-trip)

@eigenpal/docx-editor-core/headless (Headless/Node.js)
└── DOM 없이 서버 사이드 문서 조작 (DocumentAgent)

@eigenpal/docx-editor-react (React Adapter)
└── DocxEditor React 컴포넌트 + DocxEditorRef

@eigenpal/docx-editor-vue (Vue 3 Adapter)
└── DocxEditor Vue 컴포넌트

@eigenpal/docx-editor-agents (AI Agent Toolkit)
└── 프로그래매틱 문서 조작 API
```

핵심 차별점: HTML로 변환하지 않고 OOXML 구조를 직접 유지하므로 round-trip 시 데이터 손실 최소화.

#### 설치

```bash
npm install @eigenpal/docx-editor-react
```

#### React 컴포넌트 사용

```tsx
import { useRef } from 'react';
import { DocxEditor, type DocxEditorRef } from '@eigenpal/docx-editor-react';
import '@eigenpal/docx-editor-react/styles.css';

function WordEditor({ fileBuffer }: { fileBuffer: ArrayBuffer }) {
    const editorRef = useRef<DocxEditorRef>(null);

    // 방법 1: ref.save()로 직접 호출
    const handleSave = async () => {
        const savedBuffer = await editorRef.current?.save();
        if (savedBuffer) {
            // VS Code WebView → extension host로 저장 요청
            handler.emit('save', {
                data: Array.from(new Uint8Array(savedBuffer))
            });
        }
    };

    return (
        <DocxEditor
            ref={editorRef}
            documentBuffer={fileBuffer}  // ArrayBuffer | null
            mode="editing"               // "editing" | "suggesting" | "viewing"
            showToolbar={true}
            showRuler={true}
            showZoomControl={true}
            onChange={() => {
                // dirty 상태 설정
                handler.emit('dirty', { isDirty: true });
            }}
            // 방법 2: onSave prop으로 콜백
            onSave={(buffer) => {
                handler.emit('save', {
                    data: Array.from(new Uint8Array(buffer))
                });
            }}
        />
    );
}
```

#### Props 전체 목록

| Prop | Type | 설명 |
|------|------|------|
| `documentBuffer` | `ArrayBuffer \| null` | .docx 파일 데이터. `null`=빈 문서, `undefined`=로딩 지연 |
| `mode` | `"editing" \| "suggesting" \| "viewing"` | 에디터 모드 |
| `author` | `string` | tracked changes/댓글 작성자 이름 |
| `documentName` | `string` | 문서 이름 |
| `readOnly` | `boolean` | 읽기 전용 |
| `showToolbar` | `boolean` | 툴바 표시 |
| `showRuler` | `boolean` | 눈금자 표시 |
| `showZoomControl` | `boolean` | 줌 컨트롤 표시 |
| `showOutline` | `boolean` | 개요 패널 표시 |
| `onChange` | `() => void` | 변경 콜백 |
| `onSave` | `(buffer: ArrayBuffer) => void` | 저장 콜백 |

#### DocxEditorRef 메서드

| 메서드 | 반환값 | 설명 |
|--------|--------|------|
| `save()` | `Promise<ArrayBuffer>` | .docx 파일로 내보내기 |
| `addComment({ paraId, text })` | void | 단락에 댓글 추가 |
| `scrollToParaId(paraId)` | void | `w14:paraId`로 스크롤 |

#### DOCX 로딩 (code-office 현재 패턴과 호환)

```tsx
// 현재 Word.tsx의 파일 로딩 패턴을 그대로 활용 가능
handler.on("open", ({ path }) => {
    fetch(path)
        .then(response => response.arrayBuffer())
        .then(buffer => {
            // 기존: docx.renderAsync(buffer, container)  ← read-only
            // 변경: setFileBuffer(buffer) → <DocxEditor documentBuffer={buffer} />
            setFileBuffer(buffer);
            setLoading(false);
        });
}).emit('init');

// Uint8Array를 받은 경우 변환:
// const arrayBuffer = uint8array.buffer.slice(
//     uint8array.byteOffset,
//     uint8array.byteOffset + uint8array.byteLength
// );
```

#### 저장 (VS Code WebView 브릿지)

```tsx
// Word.tsx에서 저장 핸들러
const handleSave = (buffer: ArrayBuffer) => {
    // VS Code extension host로 postMessage
    handler.emit('save', {
        data: Array.from(new Uint8Array(buffer))
    });
};

// officeViewerProvider.ts 또는 전용 핸들러에서 수신
handler.on('save', async ({ data }) => {
    const buffer = Buffer.from(data);
    await vscode.workspace.fs.writeFile(uri, buffer);
    // dirty 상태 해제
});
```

#### 지원 OOXML 기능

| 기능 | 지원 |
|------|------|
| 텍스트 서식 (B/I/U/S, 색상, 폰트) | ✅ |
| 단락 스타일 | ✅ |
| 테이블 (셀 병합, 테두리, 음영) | ✅ |
| 이미지 (인라인 + 플로팅) | ✅ (v1.0.3에서 플로팅 개선) |
| 번호 매기기/글머리 기호 목록 | ✅ |
| Tracked Changes (수락/거부) | ✅ `w:ins`/`w:del`로 시리얼라이즈 |
| 댓글 (스레딩, 해결/재오픈) | ✅ |
| 머리글/바닥글 (텍스트박스+이미지 포함) | ✅ |
| 하이퍼링크 | ✅ |
| 플로팅 텍스트 박스 | ✅ (v1.0.3 개선) |
| 실시간 협업 (Y.js CRDT) | ✅ (code-office에서는 불요) |
| 페이지 구분/페이지네이션 | ⚠️ Word와 정확히 일치하지 않을 수 있음 |
| 구조적 tracked changes (새 테이블/목록) | ⚠️ 텍스트만 추적, 구조 추가는 미추적 |
| PDF 내보내기 | ❌ 미언급 |
| SmartArt | ❌ |
| 수식 (OMML) | ⚠️ 미확인 |
| 매크로 (VBA) | ❌ |

#### VS Code WebView 호환성 분석

```
CSP 호환:
- ProseMirror → DOM 조작 기반
- 외부 네트워크 호출 없음 → connect-src 제한 OK
- Web Worker 사용 가능성 → worker-src에 extension URI 허용 필요
- 폰트/CSS → 번들에 포함하여 webview.asWebviewUri()로 서빙
- 인라인 스타일 사용 가능 → style-src 'unsafe-inline' 필요할 수 있음

WebView 통신:
- 현재 code-office의 handler.on/emit 패턴으로 파일 데이터 교환 가능
- ArrayBuffer → postMessage → extension host 경로 이미 HWP에서 검증됨
- CustomEditorProvider 패턴으로 dirty/save/revert lifecycle 구현

번들 사이즈:
- Bundlephobia 데이터 없음 — 실제 설치 후 확인 필요
- React/Vue 패키지는 가벼운 래퍼, 무거운 부분은 @eigenpal/docx-editor-core
- @eigenpal/docx-editor-vanilla 패키지 개발 중 (최소 번들)
- 프로젝트 내부에 check:i18n-bundle-size 스크립트 존재

스타일:
- 반드시 '@eigenpal/docx-editor-react/styles.css' 임포트 필요
```

#### code-office 통합 시 변경 범위

```
MOD  src/react/view/word/Word.tsx          — docx-preview → docx-editor 교체
MOD  src/react/view/word/Word.css          — 에디터 스타일 조정
NEW  src/provider/handlers/docxHandler.ts  — save/dirty lifecycle 추가
MOD  src/provider/officeViewerProvider.ts   — DOCX route에 save 핸들러 연결
MOD  src/common/reactApp.ts                — CSP에 style-src 'unsafe-inline' 추가 (필요 시)
MOD  package.json                           — docx-preview → @eigenpal/docx-editor-react
MOD  build.ts                               — styles.css 번들 + 폰트 에셋 복사
```

#### 알려진 이슈 (GitHub Issues 기반)

| 이슈 | 설명 |
|------|------|
| **페이지네이션 불일치** | Word의 페이지 구분과 정확히 일치하지 않을 수 있음 |
| **텍스트 오버랩** | 일부 유효한 .docx에서 텍스트 겹침/목록 번호 어긋남 |
| **번호 매기기 깨짐** | 에디터 표시 시 번호가 잘못 표시 (내보낸 파일은 정상일 수 있음) |
| **스타일 리셋** | 저장 시 Arial → Calibri 폰트 리셋 보고됨 |
| **Word 복구 오류** | 생성 파일이 Word에서 "복구 오류" 트리거 (이미지 치수 float vs int) |
| **구조적 tracked changes** | 새 테이블/목록 추가가 변경 추적에 보존 안 됨 |
| **검색 (Cmd+F)** | 찾은 결과 하이라이트/스크롤 실패할 수 있음 |
| **머리글 이미지** | 저장 후 머리글 내 이미지 표시 안 될 수 있음 |
| **복잡한 섹션 지오메트리** | 고급 테이블 메트릭/섹션 레이아웃 정확도 한계 |

#### 리스크 요약

1. v1.0.3으로 활발하지만 아직 생태계 초기 — 엣지 케이스 가능
2. Word 100% fidelity는 어떤 오픈소스도 달성 불가
3. 번들 사이즈 영향 실측 필요
4. WebView CSP/Worker 호환성 실제 테스트 필수
5. 프레임워크 예시: Vite, Next.js, Remix, Astro, Nuxt 모두 존재 — VS Code WebView는 미제공

---

## 3. PPTX 고 fidelity 렌더링 라이브러리 조사

### 3.1 aiden0z/pptx-renderer (최우선 후보 — 최고 fidelity)

| 항목 | 내용 |
|------|------|
| GitHub | https://github.com/aiden0z/pptx-renderer |
| npm | `@aiden0z/pptx-renderer` |
| 라이선스 | **Apache-2.0** |
| 버전 | v1.0.3 (2026-05-29 릴리스) |
| 스타 | ~34 |
| 렌더링 | HTML/SVG DOM |
| 테스트 | 100+ python-pptx 테스트 + pixel-level visual regression |

#### 핵심 기능

```
지원 요소:
- 187+ preset shapes
- 134+ SmartArt layouts
- 차트 (Chart)
- 테이블 (Table)
- 그룹 (Group)
- 배경 (Background)
- 그라데이션/패턴 필 (Gradient/Pattern Fill)
- 전체 OOXML 색상 파이프라인

렌더링 방식:
- PPTX ZIP → OOXML 파싱 → HTML/SVG DOM 생성
- 서버 불요, 브라우저 전용
- TypeScript
```

#### 설치

```bash
npm install @aiden0z/pptx-renderer
```

#### 기본 사용 (공식 docs 기반)

```typescript
import { PptxViewer, RECOMMENDED_ZIP_LIMITS } from '@aiden0z/pptx-renderer';

// 방법 1: one-call open (가장 간단)
const container = document.getElementById('pptx-container')!;
const resp = await fetch('/slides/demo.pptx');

const viewer = await PptxViewer.open(resp, container, {
    zipLimits: RECOMMENDED_ZIP_LIMITS  // 보안: zip-bomb 방지
});

// 방법 2: ArrayBuffer에서 로드
const arrayBuffer = await fetch('/slides/demo.pptx').then(r => r.arrayBuffer());
const viewer2 = new PptxViewer(container, { fitMode: 'contain' });
await viewer2.open(arrayBuffer);
```

#### code-office 통합 예시

```tsx
// 새로운 Pptx.tsx (pptx-renderer 기반)
import { PptxViewer, RECOMMENDED_ZIP_LIMITS } from '@aiden0z/pptx-renderer';
import { useEffect, useRef, useState } from 'react';
import { handler } from '../../util/vscode';

export default function Pptx() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const viewerRef = useRef<PptxViewer | null>(null);

    useEffect(() => {
        handler.on('open', async ({ path }) => {
            setLoading(true);
            try {
                const resp = await fetch(path);
                if (containerRef.current) {
                    const viewer = await PptxViewer.open(resp, containerRef.current, {
                        zipLimits: RECOMMENDED_ZIP_LIMITS
                    });
                    viewerRef.current = viewer;
                }
            } finally {
                setLoading(false);
            }
        }).emit('init');
    }, []);

    return (
        <main className="pptx-viewer">
            {loading && <div>Loading...</div>}
            <div ref={containerRef} className="pptx-slide-container" />
            <nav className="pptx-nav">
                <button onClick={() => goToSlide(Math.max(1, currentSlide - 1))}>
                    Prev
                </button>
                <span>{currentSlide} / {slideCount}</span>
                <button onClick={() => goToSlide(Math.min(slideCount, currentSlide + 1))}>
                    Next
                </button>
            </nav>
        </main>
    );
}
```

#### 현재 vs pptx-renderer 비교

```
현재 (cheerio 텍스트 추출):
┌──────────────────────┐
│ Slide 1              │
│ ● Text line 1        │  ← 텍스트만 나열
│ ● Text line 2        │  ← 위치/크기/색상 없음
│ [img] [img]           │  ← 이미지 base64
└──────────────────────┘

pptx-renderer (HTML/SVG DOM):
┌──────────────────────┐
│  ┌────────┐          │
│  │ Title  │          │  ← 실제 위치/크기/색상
│  └────────┘          │
│     ┌───┐   ┌───┐   │  ← 도형, SmartArt
│     │ A │──▶│ B │   │
│     └───┘   └───┘   │
│  ┌─────────────────┐ │
│  │ Chart/Table     │ │  ← 차트, 테이블 렌더링
│  └─────────────────┘ │
└──────────────────────┘
```

#### VS Code WebView 호환성

```
CSP 호환:
- HTML/SVG DOM 생성 → 표준 DOM 조작, 특별한 CSP 해제 불요
- 인라인 SVG → img-src 제한 없이 작동
- 외부 네트워크 호출 없음

통합 방식:
- 현재 pptxHandler.ts의 extension host에서 파싱 → WebView로 데이터 전송 구조에서
  WebView 내에서 직접 렌더링으로 변경
- 또는 extension host에서 pptx-renderer 실행 → SVG/HTML 문자열 전송도 가능

번들 영향:
- TypeScript 기반, tree-shaking 가능
- SmartArt 134+ layouts → 번들 사이즈 증가 가능, 정확한 수치 확인 필요
```

#### 변경 범위

```
DEL  src/provider/handlers/pptxReader.ts   — cheerio 기반 파서 제거
DEL  src/provider/handlers/pptxHandler.ts  — extension host 파서 제거
MOD  src/react/view/pptx/Pptx.tsx          — pptx-renderer 기반 재작성
MOD  src/react/view/pptx/Pptx.less         — 렌더링 스타일 조정
MOD  package.json                           — adm-zip/cheerio 의존성 정리, pptx-renderer 추가
MOD  build.ts                               — 번들 설정 (필요 시)
```

---

### 3.2 gptsci/pptxviewjs (대안 — Canvas 기반)

| 항목 | 내용 |
|------|------|
| GitHub | https://github.com/gptsci/pptxviewjs |
| npm | `pptxviewjs` |
| 라이선스 | MIT |
| 버전 | v1.1.9 (2026-03) |
| 스타 | ~8 |
| 렌더링 | HTML5 Canvas |
| 의존성 | JSZip 필요 |

#### 설치 및 사용

```bash
npm install pptxviewjs
```

```typescript
import { PptxViewer } from 'pptxviewjs';

const viewer = new PptxViewer({
    container: document.getElementById('viewer'),
    // Canvas 기반 렌더링 옵션
});

const buffer = await fetch('/file.pptx').then(r => r.arrayBuffer());
await viewer.load(buffer);
```

#### pptx-renderer 대비 장단점

```
장점:
- MIT 라이선스 (명확)
- Canvas pixel-accurate 렌더링
- React/Angular/Vue/Svelte/Electron 모두 지원
- Office Online 스타일 UI (썸네일, 줌)

단점:
- Canvas는 VS Code WebView에서 CSP 이슈 가능
- Canvas 내용은 텍스트 선택/복사 불가 (DOM 기반은 가능)
- visual regression test 규모가 pptx-renderer보다 작음
```

---

### 3.3 pagus-kit/Pagus (대안 — SVG + React)

| 항목 | 내용 |
|------|------|
| GitHub | https://github.com/pagus-kit/Pagus |
| 렌더링 | SVG |
| 프레임워크 | React 컴포넌트 내장 |

```typescript
// React 컴포넌트 패턴 (추정)
import { PptxViewer } from 'pagus';

<PptxViewer file={buffer} slideIndex={0} />
```

- SVG 출력 → WebView 호환 좋음
- React 컴포넌트 → code-office React 스택에 바로 통합
- SmartArt/차트 지원 범위는 pptx-renderer보다 좁을 수 있음

---

### 3.4 t-ujiie-g/pptx-svg (미래 — 양방향 편집)

| 항목 | 내용 |
|------|------|
| GitHub | https://github.com/t-ujiie-g/pptx-svg |
| npm | `pptx-svg` |
| 라이선스 | MIT |
| 스타 | ~4 |
| WASM 바이너리 | ~280KB |
| 빌드 언어 | MoonBit → WebAssembly |
| 의존성 | zero npm dependencies |
| 렌더링 | SVG (WASM 기반) |
| 특이점 | PPTX ↔ SVG 양방향 변환 |

```bash
npm install pptx-svg
```

```typescript
import { readFileSync } from 'node:fs';
import { PptxRenderer } from 'pptx-svg';

async function convert() {
    const renderer = new PptxRenderer();

    // WASM 초기화
    const wasmBytes = readFileSync('node_modules/pptx-svg/dist/main.wasm');
    await renderer.init(wasmBytes);

    // PPTX 로드
    const pptxBytes = readFileSync('presentation.pptx');
    const pptxBuffer = pptxBytes.buffer.slice(
        pptxBytes.byteOffset,
        pptxBytes.byteOffset + pptxBytes.byteLength
    );
    await renderer.loadPptx(pptxBuffer);

    // 슬라이드 → SVG 렌더링 (0-indexed)
    const svgString = renderer.renderSlideSvg(0);
    // svgString에는 data-ooxml-* 속성이 포함되어 있어
    // round-trip 시 OOXML 메타데이터가 보존됨
}
```

#### 잠재적 편집 워크플로우

```
1. .pptx 파일 로드 → pptxToSvg() → SVG 슬라이드 렌더링
2. 사용자가 SVG 위에서 텍스트/도형 편집
3. 편집된 SVG → svgToPptx() → .pptx 파일 저장

이 패턴은 HWP의 rhwp 접근과 유사:
- rhwp: HWP binary → WASM 에디터 → HWP binary
- pptx-svg: PPTX → WASM/SVG → PPTX
```

#### VS Code WebView 호환

```
CSP:
- WASM 사용 → script-src에 'wasm-unsafe-eval' 필요
- code-office는 rhwp에서 이미 WASM CSP를 처리 중 → 동일 패턴 적용 가능
```

---

## 4. 비교 매트릭스

### 4.1 DOCX 라이브러리

| 라이브러리 | 편집 | 저장 | OOXML 보존 | 서버 불요 | React | WebView 호환 | 라이선스 |
|-----------|------|------|-----------|----------|-------|-------------|---------|
| docx-preview (현재) | ❌ | ❌ | N/A | ✅ | ✅ | ✅ | MIT |
| eigenpal/docx-editor | ✅ | ✅ | ✅ round-trip | ✅ | ✅ | ⚠️ 검증 필요 | 오픈소스 |
| Syncfusion | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 상용 |
| OnlyOffice | ✅ | ✅ | ✅ | ❌ 서버 필요 | N/A | N/A | AGPL |

### 4.2 PPTX 라이브러리

| 라이브러리 | 렌더링 | Fidelity | 편집 | 서버 불요 | WebView 호환 | 라이선스 |
|-----------|--------|----------|------|----------|-------------|---------|
| cheerio (현재) | 텍스트 추출 | 최저 | ❌ | ✅ | ✅ | N/A |
| pptx-renderer | HTML/SVG | 최고 (452+ 테스트) | ❌ | ✅ | ✅ | 오픈소스 |
| PptxViewJS | Canvas | 높음 | ❌ | ✅ | ⚠️ Canvas CSP | MIT |
| Pagus | SVG | 중간 | ❌ | ✅ | ✅ | 오픈소스 |
| pptx-svg | SVG (WASM) | 중~높음 | ✅ (양방향) | ✅ | ⚠️ WASM CSP | 오픈소스 |

---

## 5. 추천 통합 경로

### Phase 9: DOCX 편집 지원 (eigenpal/docx-editor)

```
우선순위: 높음
예상 난이도: 중
변경 범위: Word.tsx + 새 docxHandler + officeViewerProvider + package.json

구현 순서:
1. @eigenpal/docx-editor-react 설치 + 번들 빌드 확인
2. Word.tsx를 DocxEditor 컴포넌트로 교체
3. WebView ↔ extension host 저장 브릿지 구현 (HWP 패턴 참조)
4. CustomEditorProvider dirty/save lifecycle 연결
5. VSIX 패키징 + 사이즈 확인
6. visual smoke test (기존 DOCX fixture로)
```

### Phase 10: PPTX 고 fidelity 프리뷰 (pptx-renderer)

```
우선순위: 높음
예상 난이도: 중~저
변경 범위: Pptx.tsx + pptxReader.ts 제거 + package.json

구현 순서:
1. pptx-renderer 설치 + 번들 빌드 확인
2. Pptx.tsx를 pptx-renderer 기반으로 재작성
3. pptxReader.ts (cheerio 파서) 제거
4. 슬라이드 네비게이션 UI 구현
5. WebView CSP 확인 (SVG inline 관련)
6. visual smoke test (기존 PPTX fixture로)
7. adm-zip/cheerio PPTX 관련 의존성 정리
```

### Phase 11 (미래): PPTX 편집 (pptx-svg)

```
우선순위: 낮음 (실험적)
예상 난이도: 높음
변경 범위: 신규 pptx 편집기 + WASM 번들

HWP의 rhwp 패턴을 그대로 따름:
- WASM 런타임 번들
- Viewer → Edit 모드 전환
- 저장 시 PPTX round-trip
```

---

## 6. 리스크 및 검증 항목

### 반드시 확인해야 할 것 (구현 전)

| # | 항목 | 검증 방법 |
|---|------|----------|
| 1 | docx-editor 정확한 라이선스 확인 | GitHub LICENSE 파일 직접 확인 |
| 2 | docx-editor 번들 사이즈 | `npm install` → `du -sh node_modules/@eigenpal` |
| 3 | docx-editor WebView CSP 호환 | VS Code Extension Development Host에서 실제 로드 테스트 |
| 4 | pptx-renderer 번들 사이즈 | `npm install` → 빌드 후 VSIX 크기 비교 |
| 5 | pptx-renderer SVG inline CSP | WebView에서 SVG 렌더링 실제 테스트 |
| 6 | 기존 fixture 파일로 양쪽 라이브러리 fidelity 비교 | 스크린샷 캡처 비교 |
| 7 | React 17 vs 18 호환성 | code-office의 React 버전 확인 후 호환 테스트 |

### 파괴적 변경 리스크

```
DOCX:
- docx-preview 제거 시 기존 DOCX preview 동작이 바뀜
- docx-editor가 특정 DOCX에서 렌더링 실패할 경우 fallback 필요
- 해결: docx-preview를 fallback으로 유지하되 default를 docx-editor로 변경

PPTX:
- cheerio/AdmZip 기반 파서 제거 시 extension host → WebView 구조 변경
- pptx-renderer가 브라우저 전용이므로 파싱이 WebView 측으로 이동
- 해결: pptxHandler.ts에서 파일 바이너리를 WebView로 전달, WebView에서 렌더링
```

---

## 7. 출처

| 소스 | URL |
|------|-----|
| eigenpal/docx-editor | https://github.com/eigenpal/docx-editor |
| docx-editor 공식 문서 | https://docx-editor.dev |
| aiden0z/pptx-renderer | https://github.com/aiden0z/pptx-renderer |
| gptsci/pptxviewjs | https://github.com/gptsci/pptxviewjs |
| pagus-kit/Pagus | https://github.com/pagus-kit/Pagus |
| t-ujiie-g/pptx-svg | https://github.com/t-ujiie-g/pptx-svg |
| PptxGenJS (생성 전용, 참고) | https://github.com/gitbrent/PptxGenJS |
| Hacker News docx-editor 토론 | https://news.ycombinator.com (eigenpal/docx-editor 관련) |
