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

The extension bundles a local WASM runtime called `rhwp-studio` (based on [edwardkim/rhwp](https://github.com/nicedoc/rhwp)). When you open an HWP file, it loads inside a WebView iframe. Edits happen in the WASM runtime, and saves go through a validated pipeline: magic number check → atomic temp file write → rename.

### Can I use a remote rhwp-studio server instead?

Yes. Set `code-office.hwp.studioUrl` to the URL of your rhwp-studio server. The extension will use postMessage RPC with token-based authentication to communicate with the remote editor. The default is empty, which uses the bundled local runtime.

### Is saving safe? Can I lose my file?

The save pipeline has multiple safety layers:
1. **Magic number validation**: Verifies the exported bytes match the expected format (OLE for .hwp, ZIP for .hwpx)
2. **Size check**: Rejects empty exports and files over 50 MB
3. **Atomic write**: Writes to a temp file first, then renames to the target. If anything fails, the original file is untouched.
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
- File auto-completion in the WebView and default VS Code text editor (triggered by `[[`)
- Click navigation from rendered Live Preview labels (resolves to the closest matching file in your workspace)
- Support for headings (`[[note#section]]`), aliases (`[[note|display text]]`), and block IDs (`[[note^blockid]]`)
- Inactive Live Preview chunks render wikilinks as clickable labels; placing the caret at a wikilink boundary reveals the local `[[...]]` source for editing without switching the whole editor to raw mode.
- Raw Source mode keeps the same `[[` pairing and file suggestion behavior while showing the whole Markdown document as source.

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
