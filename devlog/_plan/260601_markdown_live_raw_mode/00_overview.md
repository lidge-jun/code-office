# Markdown Live Preview and Raw Source Mode

Date: 2026-06-01
Project root: /Users/jun/Developer/new/700_projects/code-office

## Goal

Implement an Obsidian-style Markdown authoring flow in the code-office Markdown
custom editor:

1. Add `vscode-office.editorMode = raw`.
2. Keep the existing `Edit In VSCode` path, but make raw/source editing possible
   inside the code-office WebView.
3. Add a dedicated raw/source toolbar button next to the existing preview button.
4. Support `Cmd+E` on macOS and `Ctrl+E` elsewhere as an Obsidian-like
   Live Preview to Reading Preview toggle.
5. Render inactive code blocks with syntax highlighting while preserving raw
   fenced Markdown for the active code block.
6. Render inactive `[[wikilink]]` text as styled links while preserving raw
   wikilink syntax at the active cursor target.
7. Use VS Code theme variables for code, inline code, wikilink, and raw editor
   colors.
8. Prove the change with regression tests, VS Code Insiders E2E screenshots,
   release packaging, VSIX install, and documentation.

## Scope

Included:

- Vditor WebView resources under `/Users/jun/Developer/new/700_projects/code-office/resource/vditor`
- Markdown provider/config wiring under `/Users/jun/Developer/new/700_projects/code-office/src/provider`
- Package contributions and keybindings in `/Users/jun/Developer/new/700_projects/code-office/package.json`
- Markdown regression tests under `/Users/jun/Developer/new/700_projects/code-office/src/test`
- User documentation in `/Users/jun/Developer/new/700_projects/code-office/docs`

Excluded:

- Replacing Vditor with a new editor engine.
- Removing the existing default VS Code text editor path.
- Changing HWP/HWPX, PPTX, Excel, or LibreOffice fallback behavior.

## Current Signals

- `vscode-office.editorMode` currently supports `wysiwyg`, `ir`, and `sv`.
- `ir` is already documented as the Obsidian Live Preview-like mode.
- `resource/vditor/index.js` initializes Vditor with `mode:
  config.editorMode || 'wysiwyg'`.
- The toolbar already includes Vditor's built-in `edit-mode`, `code-theme`, and
  `preview` controls plus the custom `Edit In VSCode` button.
- Code highlighting settings already exist for rendered code preview:
  `vscode-office.previewCode`, `vscode-office.previewCodeHighlight.style`, and
  `vscode-office.previewCodeHighlight.showLineNumber`.
- Wikilinks and CJK inline repairs already use a post-processing pipeline in
  `resource/vditor/util.js`.

## Implementation Phases

1. Plan and architecture update.
2. Raw mode state model and toolbar/keybinding wiring.
3. Active-raw/inactive-rendered code block and wikilink behavior.
4. VS Code theme-aligned code and raw editor styling.
5. Regression tests and fixtures.
6. Documentation, package verification, VSIX install, and Computer Use E2E.

## Verification Gates

Required commands:

```text
npm run test:wikilink-phase3
npm run test:markdown-phase5
npm run typecheck
npm run package:verify
```

New or expanded Markdown live/raw test must cover:

- fenced code block raw preservation
- rendered syntax-highlighted inactive code block markup
- inline code protection
- Mermaid non-regression
- wikilink active/raw and inactive/rendered behavior
- CJK bold/strikethrough non-regression

VS Code Insiders E2E must capture:

- Live Preview mode with rendered inactive code block and rendered wikilink.
- Active raw code block state showing fenced Markdown.
- Active raw wikilink state showing `[[Target]]`.
- Reading Preview after `Cmd+E` / `Ctrl+E`.
- Raw Source mode after clicking the new raw toolbar button.

## Open Implementation Notes

- Obsidian's `Ctrl+E` / `Cmd+E` maps to Reading view toggle. Source/Live Preview
  mode switching is a separate command in Obsidian, so code-office should expose
  a separate raw/source command rather than overloading the reading toggle.
- If Vditor cannot support a true raw mode directly, the fallback design is a
  focused raw textarea layer that reads from and writes back to the same content
  pipeline.
