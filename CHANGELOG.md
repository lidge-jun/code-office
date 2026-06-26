# Change log

# 3.7.50 2026-6-27 (Maintained by jun6161)
- Ship SuperDoc DOCX viewer dark-mode parity by mapping the Word viewer chrome to
  VS Code theme variables (`Word.css`), so DOCX review matches editor light/dark
  chrome without leaving the workspace.
- Scope the public HWP/HWPX compatibility matrix to `code-office@3.7.50` so
  release gates and registry users see the same verified baseline.

# 3.7.49 2026-6-11 (Maintained by jun6161)
- Publish the release-trust package: tag-based GitHub Release artifacts with
  SHA-256 checksums and provenance attestations, registry publish from attested
  VSIX files, and public `docs/HWP-HWPX-COMPATIBILITY.md` /
  `docs/COMPETITIVE-CONTEXT.md` guardrails.
- Stabilize post-release workflow/docs after the SuperDoc AGPL migration and
  structure audit closure.

# 3.7.48 2026-6-10 (Maintained by jun6161)
- Publish the current AGPL/SuperDoc-era code-office package after the final
  devlog baseline archive cleanup, so Marketplace and Open VSX users receive
  the latest DOCX, HWP/HWPX, PPTX, Markdown, and release-readiness state from
  `main`.

# 3.7.47 2026-6-8 (Maintained by jun6161)
- Publish the latest Markdown wikilink input recovery fixes so current users can
  keep working from the repaired `[[...]]` completion behavior.
- Make DOCX open in a high-fidelity Viewer mode by default, with an explicit
  View/Edit switch. The existing DOCX WYSIWYG editor remains available as an
  experimental Edit mode while its complex Korean layout fidelity is evaluated.

# 3.7.46 2026-6-4 (Maintained by jun6161)
- Catch paste-like or automation batched `[[query` mutations in the WYSIWYG DOM
  observer, not only bare `[[`. The current VS Code Insiders smoke proved that
  the Vditor contenteditable path can display `[[1` without the source input
  transaction winning the race; the observer now treats a single-line unclosed
  `[[query` text node as an inserted wikilink-open mutation and reruns the
  canonical source repair.

# 3.7.45 2026-6-4 (Maintained by jun6161)
- Close raw unclosed `[[query` source values inside the WebView input pipeline.
  The current Insiders smoke showed Vditor can preserve `[[1` even after the
  batched diff helper exists, so the canonical source transaction now treats
  any single-line unclosed `[[query` as an active wikilink body and rewrites it
  to `[[query]]`.

# 3.7.44 2026-6-4 (Maintained by jun6161)
- Fix batched Live Preview input such as `[[1` from automation, paste-like
  input, or IME-like composition. The source transaction diff helper now treats
  a single inserted `[[query` span as one wikilink transaction and rewrites it
  to `[[query]]`, keeping the active cursor before the closing brackets.

# 3.7.43 2026-6-4 (Maintained by jun6161)
- Rebuild WebView wikilink authoring around a source-transaction controller
  instead of treating DOM/caret repair as the primary model. `[[` pairing,
  open `[[query` context detection, suggestion application, and printable input
  after `[[]]` now flow through canonical Markdown source helpers shared by
  Live Preview and Raw Source.
- Keep the active source selection after `[[]]` is created so the next
  printable key is prevented at the WebView event layer and committed into the
  wikilink body before Vditor can leak it into the restored heading DOM. This
  targets the current `NEW` workspace smoke failure where `[[` then `1`
  produced `# 1Wikilink Smoke` plus `[[]]`.

# 3.7.42 2026-6-4 (Maintained by jun6161)
- Capture the empty-wikilink DOM snapshot synchronously as soon as `[[]]` is
  created. The current `NEW` workspace smoke still failed after `3.7.41`
  because the pending baseline could be delayed until after Vditor restored
  selection to the heading. Direct pair creation now records the clean `[[]]`
  state immediately and invokes the empty-body caret keeper before the next
  printable key can leak.

# 3.7.41 2026-6-4 (Maintained by jun6161)
- Replace the pending empty-wikilink caret guard and DOM leak repair loops with
  bounded retry timers. `3.7.40` added the right behavior conceptually, but the
  continuous WebView selection polling could make the already-open VS Code
  Insiders window stop responding to Accessibility/Computer Use. The guard now
  tries only a short finite sequence while `[[]]` is pending, preserving the
  same `[[1]]` repair target without locking the UI.

# 3.7.40 2026-6-4 (Maintained by jun6161)
- Keep the caret guarded inside a newly-created empty `[[]]` body in the
  already-open VS Code Insiders `NEW` workspace. `3.7.39` still reproduced the
  real WebView failure where `[[]]` was created on the blank line but the next
  `1` landed in the heading as `# 1Wikilink Smoke`. While the empty pair is
  pending, code-office now repeatedly restores selection to the empty wikilink
  body and still runs the one-character leak repair path if Vditor mutates the
  wrong text node first.

# 3.7.39 2026-6-4 (Maintained by jun6161)
- Add a short pending-empty-wikilink DOM repair polling window after `[[]]`
  creation. The current `NEW` VS Code Insiders WebView still leaked the next
  printable key into the heading after `3.7.38`, which means the leak can escape
  the normal keydown, beforeinput, input, and observer timing paths. While a
  just-created `[[]]` remains active, code-office now polls the editable DOM
  snapshot briefly and repairs the same one-character leak into the empty
  wikilink body.

# 3.7.38 2026-6-4 (Maintained by jun6161)
- Fix the remaining current-window wikilink leak after `3.7.37` failed in the
  already-open VS Code Insiders `NEW` workspace. The DOM mutation observer now
  tries pending empty-wikilink leak repair on every observed edit mutation,
  not only mutations that look like a raw `[[` insertion. This covers the real
  WebView sequence where `[[]]` is already present and the following printable
  key mutates the restored heading text node into `# 1Wikilink Smoke`.

# 3.7.37 2026-6-4 (Maintained by jun6161)
- Add a DOM-mutation repair path for the current `NEW` VS Code Insiders
  wikilink smoke. When `[[]]` has just been created, the WebView snapshots the
  editable text. If the next Vditor DOM mutation inserts one printable
  character elsewhere while `[[]]` remains, code-office removes that leaked
  character from the wrong text node and inserts it into the empty wikilink
  body. This targets the observed unsaved WebView-only failure where disk
  content stayed unchanged but the editor DOM showed `# 1Wikilink Smoke`.

# 3.7.36 2026-6-4 (Maintained by jun6161)
- Strengthen the real-workspace empty wikilink leak repair after `3.7.35`
  still reproduced in the currently open `NEW` VS Code Insiders window. The
  WebView now records the Markdown source at the moment `[[]]` is created and
  uses that pending source, instead of the mutable latest save value, to repair
  the next leaked printable character from `# 1Wikilink Smoke\n[[]]` into
  `# Wikilink Smoke\n[[1]]`.

# 3.7.35 2026-6-4 (Maintained by jun6161)
- Repair the remaining real-workspace Live Preview leak observed in the
  currently open `/Users/jun/Developer/new` VS Code Insiders window. If Vditor
  reports a single printable character inserted somewhere else while the
  previous Markdown source still had an empty `[[]]`, the input pipeline now
  moves that character into the empty wikilink body before saving. This covers
  the concrete `# 1Wikilink Smoke\n[[]]` failure after typing `[[` then `1` on
  the blank line below the heading.

# 3.7.34 2026-6-4 (Maintained by jun6161)
- Route Live Preview printable text through the same direct empty-wikilink body
  insertion at the `beforeinput` boundary. The real VS Code Insiders WebView
  can still let Vditor apply digit input to its restored heading target before
  the keydown-only guard wins, so the authoring layer now prevents the
  browser's pending text insertion and writes the character into `[[]]` before
  Vditor mutates the heading.

# 3.7.33 2026-6-4 (Maintained by jun6161)
- Fix the current VS Code Insiders workspace smoke path where `[[` completed
  to `[[]]`, but the next printable key still leaked into Vditor's restored
  heading target. Empty wikilink printable-key handling now mutates the first
  empty `[[]]` text node directly, restores the caret after the inserted
  character, dispatches an input event, and then refreshes post-processing and
  suggestions without relying on `execCommand` target selection.

# 3.7.32 2026-6-4 (Maintained by jun6161)
- Tighten the Live Preview empty wikilink printable-key route. Even when the
  DOM selection appears to be inside the empty `[[]]` body, the real VS Code
  Insiders WebView can still apply the key to Vditor's restored heading target.
  While an empty `[[]]` exists, printable keys are now always handled by the
  wikilink authoring layer instead of relying on the browser default insert.

# 3.7.31 2026-6-4 (Maintained by jun6161)
- Fix the remaining real VS Code Insiders Live Preview caret leak after
  creating `[[]]`. The WebView now prevents the next printable key from being
  handled by Vditor's restored heading selection and inserts that character
  directly into the empty wikilink body, then refreshes the authoring popup and
  save pipeline.

# 3.7.30 2026-6-4 (Maintained by jun6161)
- Keep the next printable character inside the newly-created empty `[[]]`
  body in the real VS Code Insiders Live Preview WebView. While an empty
  wikilink body exists, printable keydown events now first restore the caret to
  that body, covering Vditor selection restoration that can otherwise leave the
  browser selection in the heading after pair insertion.

# 3.7.29 2026-6-4 (Maintained by jun6161)
- Preserve the caret after real VS Code Insiders Live Preview `[[` key input.
  When contenteditable authoring has already completed the inserted text to
  `[[]]`, the Vditor `input()` callback now saves that value without calling
  `editor.setValue()` again, avoiding a duplicate rerender that moved the next
  typed character back into the heading.

# 3.7.28 2026-6-4 (Maintained by jun6161)
- Add a host-side Markdown provider safety net for Vditor Live Preview
  wikilink authoring. If the WebView still emits raw `[[` after typing in the
  real VS Code Insiders workspace, the provider normalizes the save payload to
  `[[]]`, sends the corrected value back to the WebView, and the editor restores
  caret focus inside the empty wikilink body.

# 3.7.27 2026-6-4 (Maintained by jun6161)
- Add a final Vditor source repair fallback for the real VS Code Insiders
  workspace path: if Live Preview has already accepted raw `[[` into the editor
  source, code-office now rewrites that source to `[[]]`, saves the corrected
  value, and restores the caret inside the empty wikilink body.

# 3.7.26 2026-6-4 (Maintained by jun6161)
- Generalize Vditor Live Preview `[[` source repair to diff by common
  prefix/suffix instead of strict length checks, covering hidden editor
  normalization around the inserted brackets.

# 3.7.25 2026-6-4 (Maintained by jun6161)
- Fix the real VS Code Insiders Live Preview path where Vditor can report a
  batched `[[` Markdown source insertion instead of two one-character input
  diffs. The source repair now completes that batched edit to `[[]]` and keeps
  the caret inside the wikilink body.

# 3.7.24 2026-6-4 (Maintained by jun6161)
- Keep the caret inside the new empty `[[]]` body across Vditor's post-insert
  rerenders so the next typed character goes into the wikilink body instead of
  jumping back to the heading/editor surface.

# 3.7.23 2026-6-4 (Maintained by jun6161)
- Add a MutationObserver fallback for Vditor Live Preview wikilink authoring so
  raw `[[` text is completed to `[[]]` even when VS Code WebView/Vditor do not
  deliver the expected keyboard or input events to the authoring hook.

# 3.7.22 2026-6-4 (Maintained by jun6161)
- Add a Vditor Live Preview source-diff pairing path for `[[` so the internal
  Markdown value is corrected to `[[]]` even when DOM mutation alone is not
  synchronized back into Vditor.
- Add a capture-keydown pending-bracket fallback so the second `[` can complete
  the pair in the real VS Code Insiders WebView when caret text inspection is
  unreliable.

# 3.7.21 2026-6-4 (Maintained by jun6161)
- Complete Vditor Live Preview `[[` authoring from the actual text-node
  candidate when DOM selection heuristics are unreliable, while still skipping
  protected code/preformatted nodes.
- Keep workspace-root and delayed-input fallbacks from 3.7.20, but avoid relying
  on `shouldCompleteInsertedWikilinkOpen()` before checking the concrete typed
  text node.

# 3.7.20 2026-6-4 (Maintained by jun6161)
- Fix the real VS Code Insiders `new` workspace wikilink authoring path where
  Vditor Live Preview could show raw `[[` without completing to `[[]]`.
- Add a focused/selection fallback to the active `.vditor-reset` editor root
  and retry wikilink completion across the first rendered frames after Vditor's
  `input` callback, covering WebView focus states where DOM selection is not
  available immediately.

# 3.7.19 2026-6-4 (Maintained by jun6161)
- Route Vditor Live Preview wikilink authoring through the editor `input`
  callback as well as DOM keyboard events, so real VS Code WebView typing can
  complete `[[` into `[[]]` even when Vditor consumes the key event path.
- Keep the caret inside the completed wikilink pair and reopen nearby-note
  suggestions from the project workspace completion target list.

# 3.7.18 2026-6-4 (Maintained by jun6161)
- Initialize Markdown WebView wikilink authoring with the completed workspace
  note index and completion target list before the first `open` payload.
- Fix the race where typing `[[` immediately after opening a note could show
  no nearby-note suggestions until the later async index update arrived.
- Update wikilink authoring documentation to reflect the shipped Vditor and
  Raw Source pairing/suggestion implementation.

# 3.7.17 2026-6-1 (Maintained by jun6161)
- Harden wikilink path handling across Windows and POSIX path surfaces:
  drive-letter absolute paths, backslash relative paths, parent-relative paths,
  Linux/macOS absolute paths, `.md` / `.markdown`, and extensionless notes.
- Keep URI schemes and explicit non-Markdown extensions raw while preserving
  nearest-note ranking for both Windows-style and POSIX-style workspaces.

# 3.7.16 2026-6-1 (Maintained by jun6161)
- Support explicit relative and workspace-contained absolute Markdown wikilink
  targets, including both `.md` / `.markdown` and extensionless note paths.
- Keep explicit non-Markdown extensions raw for path-qualified and absolute
  wikilinks, preserving the 3.7.15 render-loop fix.

# 3.7.15 2026-6-1 (Maintained by jun6161)
- Fix the Markdown post-processing loop triggered by unsupported raw wikilinks
  such as `[[Attachment.pdf]]`, keeping them as stable raw text without
  repeatedly mutating the WebView DOM.
- Preserve the 3.7.14 policy: extensionless, `.md`, and `.markdown` wikilinks
  render as note links, while explicit non-Markdown extensions stay raw.

# 3.7.14 2026-6-1 (Maintained by jun6161)
- Treat extensionless wikilinks as Markdown note links across host parsing,
  WebView rendering, and export paths.
- Keep explicit non-Markdown targets such as `[[Attachment.pdf]]` as raw text
  instead of converting them into code-office wikilinks.
- Resolve duplicate Markdown note basenames to the nearest path automatically,
  matching the Obsidian-style closest-note policy without prompting.

# 3.7.13 2026-6-1 (Maintained by jun6161)
- Fix a regression from 3.7.12 where newly typed `[[Note]]` text could fail to
  become a rendered wikilink after clicking elsewhere.
- Scope the forced raw-source collapse path to wikilinks that were re-entered
  from an existing rendered link, preserving the normal new-link render path.

# 3.7.12 2026-6-1 (Maintained by jun6161)
- Fix raw wikilink re-entry editing so a revealed `[[Note]]` collapses back to
  the rendered wikilink after the user edits the body and clicks elsewhere.
- Keep the normal protection for active raw `[[Note]]` editing, but force one
  post-processing pass when the user explicitly exits the raw token with an
  outside click.

# 3.7.11 2026-6-1 (Maintained by jun6161)
- Fix rendered wikilink right-edge editing when the user clicks just outside
  the rendered link text at `[[Note]]|`.
- Force Markdown post-processing after clicking outside an active raw
  `[[Note]]` source token so edits collapse back to rendered wikilinks without
  requiring Cmd+S or another save cycle.

# 3.7.10 2026-6-1 (Maintained by jun6161)
- Fix Obsidian-style rendered wikilink authoring in the Markdown webview when
  VS Code Webview caret hit-testing reports imprecise offsets for short CJK
  link text.
- Use rendered span geometry to reveal `|[[Note]]` and `[[Note]]|` at visual
  left/right edges while keeping center clicks on the rendered link as normal
  wikilink navigation.
- Keep a revealed raw `[[Note]]` editable while the caret remains inside the
  source token, then reliably re-render it after the caret moves elsewhere.

# 3.7.9 2026-6-1 (Maintained by jun6161)
- Fix rendered wikilink boundary editing in the Markdown webview so clicking
  the left edge of a rendered link reveals `|[[Note]]` and clicking the right
  edge reveals `[[Note]]|` immediately.
- Preserve normal single-click link activation for clicks inside the rendered
  link text while preventing delayed reveal on the next unrelated cursor move.

# 3.7.8 2026-6-1 (Maintained by jun6161)
- Add Obsidian-style Markdown wikilink authoring in the Code Office webview:
  `[[` pairing, cursor placement, selection wrapping, note suggestions, and
  Raw Source parity.
- Fix Live Preview wikilink editing so rendered links keep single-click open
  behavior while caret boundary entry reveals the local `[[Note]]` token for
  editing and collapses it again without requiring Cmd+S.
- Add regression coverage for wikilink authoring alongside Mermaid, code
  highlighting, CJK strikethrough, and live/raw Markdown mode checks.

# 3.7.7 2026-5-31 (Maintained by jun6161)
- Improve Markdown wikilinks with cached workspace indexing, IR-mode click
  handling, and immediate click feedback for Obsidian-style links.
- Add Phase 5/6 regression coverage for Markdown CJK inline formatting and
  Excel strikethrough preservation.
- Close dependency audit findings by removing unused Excel dependencies and
  upgrading `esbuild` and `file-type` to audited fixed versions.
- Finalize Phase 6 dependency audit documentation and cleanup devlog records.

# 3.7.6 2026-5-30 (Maintained by jun6161)
- Add Obsidian Dark and Obsidian Light themes for the Markdown editor.
- Fix HWP/HWPX `Cmd+S` on macOS so the WebView no longer opens the browser
  Save As/Finder sheet; native save now stays inside the HWP editor flow.
- Add a scoped HWP/HWPX save command/keybinding and hardening checks for the
  WebView save shortcut path.

# 3.7.5 2026-5-29 (Maintained by jun6161)
- Add dedicated HWP/HWPX custom editor support powered by a bundled local
  `rhwp-studio` runtime and rhwp WASM engine.
- Support opening, editing, and saving common `.hwp` and `.hwpx` documents
  without Hancom Office, LibreOffice, or a remote default runtime.
- Add format-aware HWP/HWPX saves: HWP writes HWP bytes and HWPX writes HWPX
  bytes, with mismatch guards before file writes.
- Integrate HWP/HWPX with VS Code editable custom editor lifecycle:
  dirty state, native save, Save As, revert, backup, and hot-exit support.
- Harden WebView and bridge handling for local rhwp-studio packaging, CSP,
  WASM resource rewriting, and HWP message schema validation.
- Add HWP release smoke checks and VSIX packaging verification for the bundled
  rhwp runtime.

# 3.7.4 2026-5-9 (Maintained by RJ.Wang <wangrenjun@gmail.com>)
- Upgrade docx-preview from 0.3.0 to 0.3.7, improving Word table rendering (borders, merged cells, background colors).

# 3.7.3 2026-4-24 (Maintained by RJ.Wang <wangrenjun@gmail.com>)
- Reduce package size: consolidate image assets, exclude dev/test files from vsix (8.6MB → 5.25MB).

# 3.7.2 2026-4-24 (Maintained by RJ.Wang <wangrenjun@gmail.com>)
- Fix preview mode outline not showing all headings for large documents with many Mermaid charts.

# 3.7.1 2026-4-23 (Maintained by RJ.Wang <wangrenjun@gmail.com>)
- Fix Mermaid rendering: rebuild Vditor from source with `mermaid.run()` API, fixing chart cross-contamination in both editing and preview modes.
- Fix Unicode 12.0+ geometric emoji (🟡🟢🟥⬜ etc.) not rendering in Vditor editor by injecting missing emoji mappings into Lute's dictionary.
- Add configurable Markdown editor mode (`vscode-office.editorMode`): wysiwyg, ir, sv.
- Add reload button in Markdown toolbar to refresh file content from disk.
- Restore "Toggle Edit Mode" button in toolbar for runtime mode switching.
- Add acknowledgements for upstream authors (cweijan & Vanessa219) in README and README-CN.
- Refactor event handlers in markdownEditorProvider: extract shared helpers, reduce code duplication.
- Clean up unused imports and duplicate toolbar separators.

# 3.7.0 2026-4-23 (Maintained by RJ.Wang <wangrenjun@gmail.com>)
- Refactor Markdown webview security: restrict localResourceRoots to extension, document and workspace directories by default; only open full filesystem when `viewAbsoluteLocal` is enabled.
- Refactor build script: migrate to esbuild context API for watch mode, extract shared plugins, add error handling for missing dependencies.
- Replace `axios` with Node.js built-in `http` module in dev mode, removing a runtime dependency.
- Remove unused `readCSV` / `readXLSX` helpers from `excel_reader.ts`, consolidating on the unified `loadSheets` function.
- Fix Zip viewer React state bug: move event handler registration into `useEffect` and use `useRef` to avoid stale closure over `info`.
- Fix Excel viewer keydown listener leak: properly remove previous listener on re-render and clean up on unmount.
- Improve Puppeteer error handling in HTML/PDF export: use try/catch with proper browser cleanup instead of swallowed `.catch()`.
- Inline local `mermaid.min.js` in PDF export for offline support, with CDN fallback.
- Add error handling to `keepOriginDiff()` to prevent silent activation failures.
- Clean up dead code: remove commented-out `zoomElement` function and `getConfig` helper.

# 3.6.3 2026-4-17 (Maintained by RJ.Wang <wangrenjun@gmail.com>)
- Fix markdown preview not filling available width (content wrapping too early).

# 3.6.2 2026-4-17 (Maintained by RJ.Wang <wangrenjun@gmail.com>)
- New green-themed logo (folder + "E" + document icon), replacing the original blue logo.
- Update extension description for clarity.
- Remove Traditional Chinese README (README-TW.md) and clean up references.
- Switch prepublish script from yarn to npm.

# 3.6.1 2026-4-17 (Maintained by RJ.Wang <wangrenjun@gmail.com>)
- Fix HTML export: enable line breaks so single newlines render as `<br>`.
- Fix HTML export: adjust heading sizes and font to match Vditor editor style.
- Align exported HTML content to left instead of center.

# 3.6.0 2026-4-17 (Maintained by RJ.Wang <wangrenjun@gmail.com>)
- Remove bundled Icon Theme and Java Decompiler to reduce package size (~4.4 MB saved).
- Keep the extension focused on office file viewing and markdown editing.

# 3.5.9 2026-4-17 (Maintained by RJ.Wang <wangrenjun@gmail.com>)
- Fix Changelog not showing on VS Code Marketplace.
- Update Marketplace description to highlight Kiro support and HTML embedded images feature.

# 3.5.7 2026-4-17 (Maintained by RJ.Wang <wangrenjun@gmail.com>)
- **New: HTML export with embedded images** — Local images are automatically converted to Base64 and embedded in the exported HTML. The file is fully self-contained and can be shared without losing any images.

# 3.5.5 2026-4-16 (Maintained by RJ.Wang <wangrenjun@gmail.com>)
- Upgrade Mermaid from v8.8.0 to v11.14.0, fixing syntax errors with newer Mermaid diagrams.
- Replace deprecated `markdown-it-mermaid` package with a lightweight built-in plugin.
- Load Mermaid locally instead of from CDN for better offline support and reliability.

# 3.5.4 2025-4-28
- Support edit excel and csv file.

# 3.5.3 2025-4-17
- Support view rar file.

# 3.5.2 2025-4-10
- Compatible with rest client.

# 3.5.1 2025-4-7

- Better support for zip viewer.
- Update extension name and icon.
- Support export markdown with Mermaid.

# 3.5.0 2025-1-14

- Remove markdown editor border.

# 3.4.8 2024-12-14

- Modify the font of the markdown editor.

# 3.4.6 2024-12-13

- Add more markdown editor theme.
- Support refresh for zip viewer.

# 3.4.2 2024-9-28

- Fixed "Edit In VS Code" shortcut not working.
- Fixed copying content failure in preview mode.

# 3.3.4 2024-6-4

- Better csv and zip support.

# 3.3.3 2024-5-6

- Support edit svg in VS Code.
- Fix shortcut key conflict with Copilot.
- Support display font item name and search font item.

# 3.3.2 2024-4-6

- Support sort zip items.

# 3.3.1 2024-3-30

- Update font and pdf viewer.

# 3.3.0 2024-3-29

- Rewrite the UI front end using React.

# 3.2.5 2024-3-8

- Add shortcut document.
- Update editor switch icon.
- Fix load chinese zip entry failed.

# 3.2.4 2024-3-5

New:

- Support view woff2 font.
- Support modifying editor theme individually.

Markdown

- Follow vscode editor font size.
- Add button to quick switch markdown editor.

Other:

- Support edit in vscode for csv.
- Support edit in vscode for svg.
- Only use image viewer for svg.

# 3.2.0 2024-3-4

- Use vscode default editor when diffing.
- Fix cannot save outline state for macOS.
- Fix cannot find chromium path on macOS.

# 3.1.7 2023-9-32

- Fix export markdown to docx fail.

# 3.1.5 2023-5-18

- Support view apk file.

# 3.1.4 2023-5-4

- Support view zip file.

# 3.1.2 2023-4-25

- Change inactive tab foreground color.

# 3.1.1 2023-4-24

- Update peek view colors.
- Remove semantic highlighting.

# 3.1.0 2023-4-13

- Better theme colors.
- Markdown:
  - Katex compatible wrong formula.
  - Load the chart with a white background.
  - Support for rendering latex formulas in an offline environment.

# 3.0.4 2023-4-11

- Modify the background color of the theme.

# 3.0.2 2023-4-5

- Update extension icon.

# 3.0.1 2023-4-3

- Fix git view cannot view pictures.
- Support for reloading workspace docx after file changes.
- PDF:
  - Fixed sometimes opening PDF failed.
  - Do not display the sidebar on small screens.
  - Support export markdown to pdf without outline.

# 3.0.0 2023-3-29

- Better docx rendering.

# 2.9.6 2023-3-7

- Reduce the size of the excel save notice.
- Support resizing the view through ctrl/meta with mouse scrolling.
- Word:

  - Fix cannot display images.
  - Fix pager jumping incorrectly.
  - Reduce pagination navigator size.
- Markdown:

  - Support hide toolbar.
  - Fix extension activation failure when rest client exists.
  - Support open hyperlinks via meta or middle mouse button.

# 2.9.5 2023-1-12

- 更新主题的editorInlayHint颜色.
- Markdown:
  - 代码块预览增加行号显示.
  - 支持配置代码块颜色样式.
  - 粘贴图片路径增加workspaceDir变量.
  - 修复无法导出PDF.
  - 修复无法显示绝对路径的图片.

# 2.9.4 2022-12-20

- 调整代码块颜色.
- 支持设置导出pdf的chromium路径.

# 2.9.3 2022-12-10

- 修复Pdf部分字体无法加载.
- QuickItem和菜单的border颜色优化.

# 2.9.2 2022-12-6

- 修复表格工具栏消失.
- 保存xlsx时增加确认框.
- 导出Html和docx时不生成目录.
- 修复图片过多时无法显示图片文件名.

# 2.9.1 2022-11-23

- 调整markdown编辑器小屏下的大纲宽度
- Markdown转换的Pdf调整页面边距.

# 2.9.0 2022-11-9

- Speed up extension activation.

# 2.8.1 2022-10-29

- Fix preview html unable to load images.
- Markdown:
  - Support export to docx.
  - Fix hr can not display on dark theme.
  - Edit math formulas using different background colors.
  - Fix export pdf not rendering math formulas that start or end with spaces.

# 2.8.0 2022-10-24

- Change markdown editor default language to english.
- Supporting change of language for editor [en_US, ja_JP, ko_KR, ru_RU, zh_CN, zh_TW]

# 2.7.9 2022-10-23

- 修复小屏下工具栏丢失.

# 2.7.8 2022-10-19

- Markdown:
  - 修复导出的pdf数学公式显示异常.
  - 优化自带主题的markdown显示效果.
- Pdf:
  - 优先显示大纲视图.
  - 美化部分视觉效果.
  - 修复只能显示二级大纲.

# 2.7.7 2022-10-18

- markdown:
  - 升级katex版本.
  - 固定工具栏位置.
  - 记住文件最后的编辑位置.
  - 修复切换不同的markdown总数没有更新.
  - 修复小屏下工具栏样式异常, 以及无法显示大纲.

# 2.7.5 2022-10-12

- 优化大纲切换的焦点.

# 2.7.4 2022-10-11

- markdown
  - 修复字数没有实时更新.
  - 修复diff视图无法显示图片.
  - 修复部分情况下在外部编辑后没有实时更新.
- 修复excel无法保存更新.
- 图片浏览器支持通过ctrl+滑动放大图片.

# 2.7.3 2022-10-5

- 完善焦点聚焦逻辑.
- 支持ctrl+shift+v粘贴为纯文本.
- 增加自动清理webview缓存.
- Markdown:

  - 自动识别粘贴的图片类型.
  - 修复粘贴文本后选中的文本还在.
- 预览Html支持解析本地js文件.

# 2.7.2 2022-9-15

- 移除图片中的空格.
- 修复latex公式显示不全.

# 2.7.1 2022-9-5

- 优化编辑器焦点恢复功能.

# 2.7.0 2022-9-2

- 升级vditor版本.
- 增加设置编辑器焦点的延迟.
- 美化右键菜单样式, 点击其他地方后隐藏菜单.

# 2.6.9 2022-8-29

- 修复代码块背景颜色异常.

# 2.6.8 2022-8-28

- Markdown: 修复显示绝对路径图片的设置无效.
- Xlsx:
  - 支持查看xlsm文件.
  - 加快excel文件打开速度.
  - 修复xlsx超过26的列无法显示.

# 2.6.7 2022-8-28

- Markdown:
  - 修复分割线无法显示.
  - 移除单引号和美元符号的补全.
  - 导出的pdf目录序号修改样式为圆圈.
  - 支持关闭代码预览, 修改代码块背景颜色.
- 修复查看docx文件时, 如果页面数量页面错乱.

# 2.6.1 2022-6-19

- 修复在Vditor无法打开相对路径的markdown.

# 2.6.0 2022-6-13

- 对主题的自适应功能进行优化.
- 修复编辑markdown时输出了无关日志.

# 2.5.8 2022-6-7

- 支持打开dotx文件
- markdown编辑器支持打开图片超链接
- 更新超链接颜色

# 2.5.7 2022-6-7

- 优化粘贴图片的逻辑
- 优化自动主题颜色的边框颜色
- 保存后更新字数总数
- 修改默认代码主题

# 2.5.5 2022-5-28

- 支持配置markdown粘贴图片的路径
- 更新vditor版本

# 2.5.1 2021-12-29

- 增加稳定性, 修复图片有时保存失败
- Support save outline open state.

# 2.5.0 2021-12-27

- Update markdown editor:
  - To open a hyperlink, need to hold down ctrl.
  - Support chose image from toolbar.
  - Update editor when external update.
  - Open source code editor as beside.
- Fix puml editor not trigger save.
- Fix html preview not support untitle document.

# 2.4.2 2021-12-4

- Fix markdown editor cannot cut, loss focus.

# 2.4.1 2021-9-9

- Rollback docx support.
- Fix http auto-complection fail.
- Reduce markdown editor cache usage.

# 2.4.0 2021-8-3

- Better http client support.
- Fix markdown editor cannot save.

# 2.2.2 2021-6-19

- Speed up picture pasting

# 2.2.0 2021-6-2

- Not trigger vscode hotkey when match markdown hotkey.
- Support immediately preservation.

# 2.1.1 2021-5-27

- Change vditor mode from ir to wysiwyg.
- Fix markdown cannot type tab.
- Reduce markdown editor padding.

# 2.0.0+

- Support ods file.
- Remove top button of word document.
- Remove markdown style.
- Support inline markdown.
- Support export to html.
- Markdown support auto quote.
- Change viewer name as editor.
- Change default markdown editor as vditor.

# 1.9.1 2021-1-18

- Fix cannot view big xmind.
- Support follow theme with docx viewer.
- Image viewer support show pixel.

# 1.9.0 2020-12-30

- Support view csv file with utf8 encoding.

## 1.8.9 2020-12-21

- Update java decompiler version, change priority as option.
- Markdown editor support paster as plain text.

## 1.8.1 2020-11-24

- Change export markdown pdf chinese font to 'Song  style'
- Export markdown auto add bookmarks.
- Update markdown list style.

## 1.8.0 2020-11-24

- Support play flash swf animation.

## 1.7.10 2020-11-23

- Support open link from markdown.

## 1.7.9 2020-11-19

- support paste image file in markdown editor.

## 1.7.7 2020-11-17

- Update status bar when open markdown editor.

## 1.7.5 2020-11-11

- Add java class decompiler.

## 1.7.1 2020-11-3

- Support generate outline for pdf.

## 1.7.0 2020-11-2

- Support export markdwon to pdf.
- Support edit xlsx、xls、csv.

## 1.6.0 2020-10-19

- Add font viewer.
- Adjust markdown style and fix save fail bug.

## 1.5.0 2020-10-16

- Enhance Image viewer.

## 1.4.3 2020-10-12

- Fix paste fail in terminal.
- Using hyperMD as default markdown editor.

## 1.4.0 2020-10-9

- Integrate stackedit to edit markdown.
- Add csv support.

## 1.3.0 2020-10-8

- Add plantuml support.
- Adjust svg css.

## 1.2.0 2020-10-8

- Add pdf support.
- Add xmind support.

## 1.1.0 2020-10-8

- Add epub support.
- Add svg support.
- Add photoshow support.
- Add windows reg support.
- Add paginition to docx view..
