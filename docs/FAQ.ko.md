# FAQ (자주 묻는 질문)

## 일반

### code-office가 뭔가요?

VS Code 안에서 DOCX, 마크다운, 한글(HWP/HWPX)을 편집하고, PPTX deck은 PowerPoint-like 읽기 전용 viewer로 검토하며, spreadsheet/PDF/HTML/압축/이미지/폰트 같은 다른 workspace 형식을 미리보기할 수 있는 VS Code 확장입니다. 별도 프로그램 설치 없이 VS Code 탭 하나에서 다 됩니다.

### 무료인가요?

네. MIT 라이선스 오픈소스입니다.

### 파일이 외부 서버로 올라가나요?

아닙니다. 모든 처리가 로컬에서 이루어집니다. 한글 에디터는 번들된 WASM 런타임으로 VS Code 내부에서 동작하며, 문서 처리를 위한 네트워크 요청은 일절 없습니다. 대외비 문서도 안심하고 열 수 있습니다.

### 어떤 파일 형식을 지원하나요?

**편집**: 마크다운 (.md, .markdown), DOCX (.docx, .dotx), HWP, HWPX

**읽기 전용 viewer / 미리보기**: PPTX, PPTM, PPSX, XLSX, XLSM, XLS, CSV, ODS, PDF, HTML, HTM, ZIP, JAR, APK, VSIX, RAR, TTF, WOFF, WOFF2, OTF, SVG, JPG, PNG, GIF 등 30종 이상

**내보내기**: 마크다운 → PDF, DOCX, HTML

### 어디서 온 프로젝트인가요?

VS Code에서 가장 인기있던 오피스 뷰어 확장인 [vscode-office](https://github.com/cweijan/vscode-office) (cweijan 제작)를 기반으로 합니다. 원작자가 3년간 개발을 중단한 뒤, [rjwang1982의 유지보수 포크](https://github.com/rjwang1982/vscode-office)를 거쳐 한글 편집, 최신 머메이드 지원, AI 시대 문서 검토 워크플로우에 맞춘 구조로 새로 정리한 독립 확장입니다.

---

## HWP/HWPX 한글

### HWP 편집은 어떻게 동작하나요?

확장에 번들된 로컬 WASM 런타임 `rhwp-studio` ([edwardkim/rhwp](https://github.com/edwardkim/rhwp) 기반)가 WebView 안에서 동작합니다. HWP/HWPX 파일은 기존 `cweijan.hwpEditor` custom editor ID로 열리지만, 탭 내부에는 Viewer와 Editor 모드가 있습니다. 첫 열기는 Viewer가 기본이고, 사용자가 Edit 또는 View를 선택하면 마지막 선택 모드를 이후 HWP/HWPX 탭에도 재사용합니다. 편집은 WASM 런타임에서 이루어집니다. 저장은 쓰기 전에 매직넘버를 검증합니다. 동일 파일 `Cmd+S`는 VS Code custom editor lifecycle의 rename churn을 피하기 위해 in-place로 쓰고, Save As/backup/toolbar fallback 저장은 임시파일 후 원자적 교체 경로를 사용합니다.

### Editor에서 Viewer로 전환하면 저장은 어떻게 되나요?

문서가 clean이면 바로 Viewer 페이지를 렌더링합니다. Editor가 dirty이면 먼저 VS Code custom editor 저장 lifecycle을 실행합니다. 저장 성공 후에만 Viewer로 전환되고, 저장 실패/취소/timeout이면 Editor에 그대로 남으며 마지막 모드도 바꾸지 않습니다.

### PDF/SVG export, debug overlay, paragraph dump는 어디에 있나요?

Viewer toolbar의 **Save PDF** 버튼 또는 Command Palette의 `HWP/HWPX: Save as PDF` 명령으로 렌더링된 Viewer 페이지를 PDF로 저장합니다. 확장은 저장 경로를 한 번만 물어보고, editor가 dirty이면 먼저 VS Code 기본 저장 lifecycle로 저장한 뒤, `resource/rhwp-native/<platform>-<arch>/`에 포함된 native rhwp PDF helper를 시도합니다. 이 helper는 VSIX를 만든 플랫폼 기준으로 포함됩니다. helper가 없거나, 현재 플랫폼과 맞지 않거나, 실행에 실패하면 기존 webview image-PDF 조립 경로로 fallback합니다. `HWP/HWPX: Export SVG Pages`, `HWP/HWPX: Show Debug Overlay`, `HWP/HWPX: Dump Paragraph`는 개발자용 표면입니다. SVG/PDF export와 debug overlay는 Viewer developer menu에서도 사용할 수 있습니다. Paragraph dump는 extension host에서 paragraph metadata를 읽기 위해 `resource/rhwp-vscode`에 vendoring한 rhwp-vscode glue/WASM 조합을 사용합니다. 이 명령은 디스크에 저장된 파일을 읽으므로, 열린 editor가 dirty 상태이면 먼저 저장해야 합니다.

### 한컴오피스 없이도 되나요?

네. 번들된 WASM 런타임이 한컴오피스를 대신합니다. 별도 설치 없이 VS Code만 있으면 됩니다.

### 저장 중 파일이 날아갈 수 있나요?

세 겹의 안전장치가 있습니다:
1. **매직넘버 검증**: 내보낸 바이트가 실제 HWP/HWPX 포맷인지 확인
2. **원자적 쓰기**: 임시파일에 먼저 쓴 뒤 원본을 덮어씌움. 중간에 뻗어도 원본은 안전
3. **120초 타임아웃**: WASM이 응답 안 하면 에러로 처리 (무한 대기 방지)

### HWP를 HWPX로 변환할 수 있나요?

네. 툴바 저장 버튼을 사용하면 다른 형식으로 변환 저장할 수 있습니다.

---

## 마크다운

### 어떤 마크다운 에디터를 쓰나요?

[Vditor](https://github.com/Vanessa219/vditor)를 사용합니다. 기본 `ir` 설정은 Obsidian의 Live Preview에 가까운 편집 화면입니다.

### VS Code 기본 텍스트 에디터를 열지 않고 raw Markdown을 편집할 수 있나요?

가능합니다. `vscode-office.editorMode`를 `raw`로 설정하거나 preview 버튼 옆의 Raw Source 툴바 버튼을 누르면 code-office WebView 안에서 raw Markdown 편집면이 열립니다. VS Code 저장 lifecycle은 그대로 사용하며, 별도의 Edit In VSCode 동작을 대체하지 않습니다.

### `Cmd+E` / `Ctrl+E`는 무엇을 하나요?

Markdown WebView에 포커스가 있을 때 macOS는 `Cmd+E`, 그 외 플랫폼은 `Ctrl+E`로 Vditor reading preview를 토글합니다. Obsidian의 Live Preview ↔ Reading Preview 흐름과 맞춘 동작입니다. 기존 `Ctrl+Alt+E` / macOS `Ctrl+Cmd+E`는 계속 VS Code 기본 텍스트 에디터 열기입니다.

### PDF 내보내기는 어떻게 하나요?

Vditor 툴바의 내보내기 기능을 사용합니다. 자동으로 설치된 Chromium(Edge → Chrome → Brave 순)을 감지하여 렌더링합니다. 직접 경로를 지정하려면 `vscode-office.chromiumPath` 설정을 사용하세요.

### 위키링크가 되나요?

됩니다. `[[위키링크]]` 문법을 지원합니다:
- 렌더링된 Live Preview label을 클릭하면 워크스페이스에서 가장 가까운 파일로 이동
- `[[노트]]`, `[[노트.md]]`, 상대 `.md` 경로, 절대 `.md` 경로 같은 기본 path 형태
- `[[이미지.png]]`, `[[문서.pdf]]`처럼 Markdown 파일이 아닌 대상은 note link로 바꾸지 않고 raw text로 유지
- 헤딩 (`[[노트#섹션]]`), 별칭 (`[[노트|표시텍스트]]`), 블록ID (`[[노트^blockid]]`) parser/resolver surface 지원
- Live Preview에서 비활성 preview 조각은 지원되는 위키링크를 예쁜 링크로 렌더링하고, 위키링크 경계에 커서를 두면 해당 `[[...]]` source만 다시 펼쳐 편집할 수 있습니다.

WebView dropdown/autocomplete 실험은 `dev/wikilink-authoring-autocomplete`
브랜치에 격리되어 있으며 현재 release 대상이 아닙니다.

---

## 문제 해결

### HWP 에디터가 빈 화면으로 나와요

1. 확장 디렉토리에 `resource/rhwp-studio/index.html`이 있는지 확인
2. `code-office.hwp.studioUrl`을 빈 값으로 설정 (번들 버전 사용)
3. 출력 패널 → "Office" 채널에서 에러 메시지 확인

### PDF 내보내기가 안 돼요

Chrome, Edge, Brave 중 하나가 설치되어 있어야 합니다. 또는:
```json
{
  "vscode-office.chromiumPath": "/크롬/경로"
}
```

### 마크다운 이미지가 안 보여요

기본적으로 문서 폴더 기준 상대경로만 허용됩니다. 절대경로를 쓰려면:
```json
{
  "vscode-office.viewAbsoluteLocal": true
}
```
주의: 이 설정은 WebView에 전체 파일시스템 접근을 허용합니다.
