# FAQ

## General

### What is code-office?

code-office is a VS Code extension that lets you preview Office documents (DOCX, XLSX, PPTX, PDF, HTML), edit Markdown with a WYSIWYG editor, and edit Korean HWP/HWPX files — all inside VS Code tabs. No external applications needed.

### Is it free?

Yes. code-office is open source under the MIT license.

### Does it upload my files to a server?

No. Everything runs locally. The HWP editor uses a bundled WASM runtime that runs inside VS Code's WebView. No network requests are made to process your documents.

### What file formats does it support?

**Preview**: DOCX, XLSX, XLSM, XLS, CSV, ODS, PPTX, PDF, HTML, HTM, ZIP, JAR, APK, VSIX, RAR, TTF, WOFF, WOFF2, OTF, SVG, JPG, PNG, GIF, APNG, BMP, ICO, WEBP, TIF, TIFF, JFIF, AVIF, PSD

**Edit**: Markdown (.md, .markdown), HWP, HWPX

**Export**: Markdown → PDF, DOCX, HTML

### Where did this come from?

code-office is built on the foundation of [vscode-office](https://github.com/cweijan/vscode-office) (by cweijan), which was the most popular VS Code office document viewer. After 3 years of inactivity, we forked it via [rjwang1982's maintained fork](https://github.com/rjwang1982/vscode-office) and added HWP editing, modern Mermaid support, and a restructured architecture for AI-era document workflows.

---

## HWP/HWPX

### How does HWP editing work?

The extension bundles a local WASM runtime called `rhwp-studio` (based on [edwardkim/rhwp](https://github.com/edwardkim/rhwp)). HWP/HWPX files open through the existing `cweijan.hwpEditor` custom editor ID, but the tab now has internal Viewer and Editor modes. First open defaults to Viewer; after the user chooses Edit or View, the last selected mode is reused for future HWP/HWPX tabs. Edits happen in the WASM runtime. Saves validate magic numbers before writing. Same-file `Cmd+S` writes in place to avoid rename churn in VS Code's custom editor lifecycle; Save As, backup, and toolbar fallback writes use the temp-file atomic path.

### What happens when I switch from Editor to Viewer?

If the document is clean, the switch renders Viewer pages immediately. If the Editor is dirty, code-office first runs the normal VS Code custom editor save lifecycle. The mode changes to Viewer only after save succeeds. If save fails, times out, or is cancelled, the tab stays in Editor and the persisted last mode is not changed.

### Where are PDF/SVG export, debug overlay, and paragraph dump?

Use the Viewer toolbar **Save PDF** button or the Command Palette command `HWP/HWPX: Save as PDF` to save the rendered Viewer pages as a PDF. The extension asks for the destination once, saves a dirty editor first through the normal VS Code lifecycle, then tries the bundled native rhwp PDF helper in `resource/rhwp-native/<platform>-<arch>/`. That helper is packaged for the platform that built the VSIX; if the helper is unavailable, mismatched, or fails, code-office falls back to the older webview image-PDF assembly path. Use `HWP/HWPX: Export SVG Pages`, `HWP/HWPX: Show Debug Overlay`, and `HWP/HWPX: Dump Paragraph` for the developer surfaces. SVG/PDF export and debug overlay are also available from the Viewer developer menu. Paragraph dump uses the vendored rhwp-vscode glue/WASM pair in `resource/rhwp-vscode` so it can inspect paragraph metadata from the extension host. It reads the saved file from disk; if the document is dirty in an open editor, save it before dumping.

### Can I use a remote rhwp-studio server instead?

Yes. Set `code-office.hwp.studioUrl` to the URL of your rhwp-studio server. The extension will use postMessage RPC with token-based authentication to communicate with the remote editor. The default is empty, which uses the bundled local runtime.

### Is saving safe? Can I lose my file?

The save pipeline has multiple safety layers:
1. **Magic number validation**: Verifies the exported bytes match the expected format (OLE for .hwp, ZIP for .hwpx)
2. **Size check**: Rejects empty exports and files over 50 MB
3. **Write policy**: Same-file VS Code saves write in place after validation. Save As, backup, and toolbar fallback saves use temp-file atomic writes.
4. **120-second timeout**: If the WASM editor doesn't respond, the save fails with an error instead of hanging.

### Can I convert between HWP and HWPX?

Yes. When using the toolbar Save button, if the export format differs from the file extension, the extension offers to save as a new file with the correct extension.

---

## Markdown

### Which Markdown editor does it use?

[Vditor](https://github.com/Vanessa219/vditor) — a feature-rich WYSIWYG/IR/SplitView editor. The default `ir` setting gives an Obsidian-like Live Preview surface.

### Can I edit raw Markdown without opening VS Code's default text editor?

Yes. Set `vscode-office.editorMode` to `raw`, or click the Raw Source toolbar button next to the preview controls. Raw Source stays inside the code-office WebView, keeps the normal VS Code save lifecycle, and does not replace the separate Edit In VSCode action.

### What does `Cmd+E` / `Ctrl+E` do?

When focus is inside the Markdown WebView, `Cmd+E` on macOS or `Ctrl+E` elsewhere toggles the Vditor reading preview, matching Obsidian's Live Preview ↔ Reading Preview flow. The older `Ctrl+Alt+E` / `Ctrl+Cmd+E` shortcut still opens the file in the default VS Code text editor.

### How do I export Markdown to PDF?

Use the export function in the Vditor toolbar. The extension uses Chromium (detected automatically: Edge → Chrome → Brave) to render and export. You can set a custom Chromium path with `vscode-office.chromiumPath`.

### Do wikilinks work?

Yes. `[[wikilink]]` syntax is supported with:
- Click navigation from rendered Live Preview labels (resolves to the closest matching file in your workspace)
- Basic path forms including `[[note]]`, `[[note.md]]`, relative `.md` paths, and absolute `.md` paths
- Non-Markdown file bodies such as `[[image.png]]` and `[[document.pdf]]` stay as raw text instead of becoming note links
- Support for headings (`[[note#section]]`), aliases (`[[note|display text]]`), and block IDs (`[[note^blockid]]`) in the parser/resolver surface
- Inactive Live Preview chunks render supported wikilinks as clickable labels; placing the caret at a wikilink boundary reveals the local `[[...]]` source for editing without switching the whole editor to raw mode.

The abandoned WebView dropdown/autocomplete experiment is isolated on the
`dev/wikilink-authoring-autocomplete` branch and is not part of the current
release.

---

## Troubleshooting

### The HWP editor shows a blank screen

1. Check if `resource/rhwp-studio/index.html` exists in the extension directory
2. Try setting `code-office.hwp.studioUrl` to empty (use bundled version)
3. Open the Output panel → "Office" channel for error messages

### PDF export fails

Ensure you have Chrome, Edge, or Brave installed. Or set the path manually:
```json
{
  "vscode-office.chromiumPath": "/path/to/chrome"
}
```

### Markdown images don't show

By default, the editor only loads images relative to the document folder. To allow absolute paths:
```json
{
  "vscode-office.viewAbsoluteLocal": true
}
```
Note: This opens the full filesystem to the WebView. Use with caution.

### Legacy .ppt files don't open

Legacy .ppt format requires LibreOffice for conversion. Install LibreOffice and set:
```json
{
  "vscode-office.pptx.libreOfficePath": "/path/to/soffice"
}
```
