# 00 — IR Mode: Cached Wikilink Index + Click Fix

## Summary

마크다운 에디터 열 때마다 전체 워크스페이스를 스캔하던 것을 **확장 활성화 시 1회 빌드 + 메모리 캐시 + FileSystemWatcher**로 교체. 위키링크 클릭 시 기본 에디터로 열리는 버그도 함께 수정.

## Architecture

```
activate()
  └→ WikilinkIndex.init(context)
       ├→ 각 workspaceFolder별 findFiles (1회, 비동기)
       ├→ FileSystemWatcher('**/*.{md,markdown}') 등록
       └→ cache: Map<folderUri, Set<basename>>

.md 열기 → buildOpenPayload()
  └→ wikilinkIndex.get(sourceUri) → 캐시에서 즉시 반환 (0ms)

파일 생성/삭제/이름변경 → watcher event
  └→ 해당 folder 캐시만 incremental update
```

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/service/wikilink/wikilinkIndex.ts` | **NEW** | 상주 캐시 + watcher 클래스 |
| `src/service/wikilink/wikilinkResolver.ts` | MODIFY | listMarkdownFiles를 folder-scoped로 변경, noteBasenameIndex를 index에 위임 |
| `src/extension.ts` | MODIFY | activate()에서 WikilinkIndex 초기화 |
| `src/provider/markdownEditorProvider.ts` | MODIFY | buildOpenPayload에서 캐시 사용 + openLink .md 라우팅 |
| `resource/vditor/util.js` | MODIFY | IR 클릭 핸들러 wikilink 감지 |
| `resource/vditor/index.js` | MODIFY | updateWikilinkIndex 이벤트 핸들러 |

---

## Detailed Diffs

### NEW: `src/service/wikilink/wikilinkIndex.ts`

```typescript
import * as path from 'path';
import * as vscode from 'vscode';

const IGNORED_SEGMENTS = new Set(['node_modules', '.git', 'out']);

function isIgnored(fsPath: string): boolean {
    return fsPath.split(path.sep).some(s => IGNORED_SEGMENTS.has(s));
}

function basenameKey(fsPath: string): string {
    return path.basename(fsPath).replace(/\.(md|markdown)$/i, '').toLowerCase();
}

export class WikilinkIndex {
    private cache = new Map<string, Set<string>>(); // folderUri → Set<basename>
    private watcher: vscode.FileSystemWatcher | undefined;
    private folderSub: vscode.Disposable;
    private ready: Promise<void>;
    private readonly _onDidChange = new vscode.EventEmitter<vscode.WorkspaceFolder>();
    readonly onDidChange = this._onDidChange.event;

    constructor() {
        this.ready = this.build();
        this.watcher = vscode.workspace.createFileSystemWatcher('**/*.{md,markdown}');
        this.watcher.onDidCreate(uri => { this.add(uri); this.fire(uri); });
        this.watcher.onDidDelete(uri => { this.remove(uri); this.fire(uri); });
        this.folderSub = vscode.workspace.onDidChangeWorkspaceFolders(() => { this.ready = this.build(); });
    }

    /** Get basenames for the workspace folder containing sourceUri. */
    async get(sourceUri: vscode.Uri): Promise<string[]> {
        await this.ready;
        const folder = vscode.workspace.getWorkspaceFolder(sourceUri);
        if (!folder) return [];
        const set = this.cache.get(folder.uri.toString());
        return set ? [...set] : [];
    }

    /** Get basenames for a specific workspace folder. */
    async getForFolder(folder: vscode.WorkspaceFolder): Promise<string[]> {
        await this.ready;
        const set = this.cache.get(folder.uri.toString());
        return set ? [...set] : [];
    }

    /** List all .md URIs within a specific workspace folder. */
    async listFiles(folder: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
        const pattern = new vscode.RelativePattern(folder, '**/*.{md,markdown}');
        const files = await vscode.workspace.findFiles(pattern);
        return files.filter(uri => !isIgnored(uri.fsPath));
    }

    private async build(): Promise<void> {
        this.cache.clear();
        const folders = vscode.workspace.workspaceFolders ?? [];
        await Promise.all(folders.map(async folder => {
            const files = await this.listFiles(folder);
            const set = new Set(files.map(u => basenameKey(u.fsPath)));
            this.cache.set(folder.uri.toString(), set);
        }));
    }

    private add(uri: vscode.Uri): void {
        if (isIgnored(uri.fsPath)) return;
        const folder = vscode.workspace.getWorkspaceFolder(uri);
        if (!folder) return;
        const key = folder.uri.toString();
        if (!this.cache.has(key)) this.cache.set(key, new Set());
        this.cache.get(key)!.add(basenameKey(uri.fsPath));
    }

    private remove(uri: vscode.Uri): void {
        const folder = vscode.workspace.getWorkspaceFolder(uri);
        if (!folder) return;
        this.cache.get(folder.uri.toString())?.delete(basenameKey(uri.fsPath));
    }

    private fire(uri: vscode.Uri): void {
        const folder = vscode.workspace.getWorkspaceFolder(uri);
        if (folder) this._onDidChange.fire(folder);
    }

    dispose(): void {
        this.watcher?.dispose();
        this.folderSub.dispose();
        this._onDidChange.dispose();
    }
}
```

### MODIFY: `src/extension.ts`

```diff
+import { WikilinkIndex } from './service/wikilink/wikilinkIndex';

 export function activate(context: vscode.ExtensionContext) {
     ...
+    const wikilinkIndex = new WikilinkIndex();
     const wikilinkResolver = new WikilinkResolver();
+    wikilinkResolver.setIndex(wikilinkIndex);
     ...
-    const markdownEditorProvider = new MarkdownEditorProvider(context, wikilinkResolver)
+    const markdownEditorProvider = new MarkdownEditorProvider(context, wikilinkResolver, wikilinkIndex)
     ...
+    context.subscriptions.push({ dispose: () => wikilinkIndex.dispose() });
 }
```

### MODIFY: `src/provider/markdownEditorProvider.ts`

```diff
+import { WikilinkIndex } from '../service/wikilink/wikilinkIndex';
+import { extname } from 'path';  // add extname to existing path import

 export class MarkdownEditorProvider ... {
-    constructor(private context: vscode.ExtensionContext, private wikilinkResolver?: WikilinkResolver) {
+    constructor(private context: vscode.ExtensionContext, private wikilinkResolver?: WikilinkResolver, private wikilinkIndex?: WikilinkIndex) {
+        // Subscribe to index changes → push to all open webviews
+        if (wikilinkIndex) {
+            wikilinkIndex.onDidChange(async folder => {
+                const index = await wikilinkIndex.getForFolder(folder);
+                // Push to active panels in this folder (handled per-document below)
+            });
+        }

     // In handleMarkdown, after handler setup:
+    if (this.wikilinkIndex) {
+        this.wikilinkIndex.onDidChange(async () => {
+            const index = await this.wikilinkIndex!.get(uri);
+            handler.emit("updateWikilinkIndex", index);
+        });
+    }

     // In handleMarkdown, buildOpenPayload:
     const buildOpenPayload = async () => ({
         title: basename(uri.fsPath),
         config,
         scrollTop: this.state.get(`scrollTop_${document.uri.fsPath}`, 0),
         language: vscode.env.language,
         rootPath, content,
-        wikilinkIndex: await this.wikilinkResolver?.noteBasenameIndex() ?? []
+        wikilinkIndex: await this.wikilinkIndex?.get(uri) ?? []
     });

     // In openLink handler:
     }).on("openLink", (linkUri: string) => {
         const resReg = /https:\/\/file.*\.net/i;
         if (linkUri.match(resReg)) {
             const localPath = linkUri.replace(resReg, '')
-            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(localPath));
+            const ext = extname(localPath).toLowerCase();
+            if (ext === '.md' || ext === '.markdown') {
+                vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(localPath), 'cweijan.markdownViewer');
+            } else {
+                vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(localPath));
+            }
         } else {
             vscode.env.openExternal(vscode.Uri.parse(linkUri));
         }
     })
```

### MODIFY: `src/service/wikilink/wikilinkResolver.ts`

```diff
+import { WikilinkIndex } from './wikilinkIndex';

 export class WikilinkResolver {
+    private index?: WikilinkIndex;
+
+    setIndex(index: WikilinkIndex): void { this.index = index; }

     // noteBasenameIndex — delegate to index or fallback
-    async noteBasenameIndex(): Promise<string[]> {
-        const files = await this.listMarkdownFiles();
-        return [...new Set(files.map(u => stripMarkdownExtension(path.basename(u.fsPath)).toLowerCase()))];
-    }
+    async noteBasenameIndex(sourceUri?: vscode.Uri): Promise<string[]> {
+        if (this.index && sourceUri) return this.index.get(sourceUri);
+        const files = await this.listMarkdownFiles();
+        return [...new Set(files.map(u => stripMarkdownExtension(path.basename(u.fsPath)).toLowerCase()))];
+    }

     // listMarkdownFiles — scope to folder when possible
-    async listMarkdownFiles(): Promise<vscode.Uri[]> {
-        const allFiles = await Promise.all([
-            vscode.workspace.findFiles('**/*.md'),
-            vscode.workspace.findFiles('**/*.markdown'),
-        ]);
-        return allFiles.flat().filter(uri => !isIgnoredPath(uri.fsPath));
-    }
+    async listMarkdownFiles(folder?: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
+        if (folder && this.index) return this.index.listFiles(folder);
+        const allFiles = await Promise.all([
+            vscode.workspace.findFiles('**/*.md'),
+            vscode.workspace.findFiles('**/*.markdown'),
+        ]);
+        return allFiles.flat().filter(uri => !isIgnoredPath(uri.fsPath));
+    }

     // findCandidates — pass folder
     private async findCandidates(workspaceFolder: vscode.WorkspaceFolder, ...): Promise<Candidate[]> {
-        const files = await this.listMarkdownFiles();
+        const files = await this.listMarkdownFiles(workspaceFolder);
         ...
     }

     // completionTargets — pass folder
     async completionTargets(sourceUri: vscode.Uri): Promise<string[]> {
         const workspaceFolder = vscode.workspace.getWorkspaceFolder(sourceUri);
         if (!workspaceFolder) return [];
-        const files = await this.listMarkdownFiles();
+        const files = await this.listMarkdownFiles(workspaceFolder);
         ...
     }
```

### MODIFY: `resource/vditor/util.js`

```diff
 // IR-specific click handler (line ~196)
 document.querySelector(".vditor-ir").addEventListener('click', e => {
     let ele = e.target;
+    const wikilinkEl = ele.closest?.('[data-wikilink]');
+    if (wikilinkEl) return; // handled by clickCallback via data-wikilink
     if (ele.classList.contains('vditor-ir__link')) {
         ele = e.target.nextElementSibling?.nextElementSibling?.nextElementSibling
     }
     if (ele.classList.contains('vditor-ir__marker--link')) {
+        const href = ele.textContent;
+        if (href && !href.match(/^https?:\/\//)) {
+            handler.emit("openWikilink", { body: href });
+            return;
+        }
         handler.emit("openLink", ele.textContent)
     }
 });
```

### MODIFY: `resource/vditor/index.js`

```diff
+handler.on("updateWikilinkIndex", (list) => {
+    setWikilinkIndex(list);
+    installMarkdownPostProcessing();
+});
```

## Verification Criteria

1. `npx tsc --noEmit` passes
2. .md 파일 열기 즉시 (< 500ms) — 빈 화면 없음
3. `[[Target Note]]` 클릭 → code-office 에디터로 열림
4. 파일 생성/삭제 후 위키링크 unresolved 표시 자동 갱신
5. Multi-root workspace: 각 폴더 독립 vault로 동작
