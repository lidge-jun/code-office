# 03 Verification - Markdown Wikilink Autocomplete QA Hardening

## Scope

This verification covers the 2026-06-08 Markdown wikilink autocomplete hardening work:

- Keep the Markdown open/click/completion hot path on the cached `WikilinkIndex`.
- Preserve Obsidian-like `[[...]]` authoring behavior.
- Prevent stale source-selection state after typing/deleting inside closed wikilinks.
- Bound popup filtering work so large vaults do not cause avoidable UI churn.
- Confirm newly created Markdown files are handled by the existing workspace watcher/index path.

## Automated Verification

All commands were run from:

`/Users/jun/Developer/new/700_projects/code-office`

| Command | Result | Evidence |
|---|---:|---|
| `npm run test:wikilink-authoring` | PASS | Added closed-link context, Korean body-end Backspace recovery, middle-body Backspace/Delete recovery, exact completion, and bounded filter tests. Node emitted the existing `MODULE_TYPELESS_PACKAGE_JSON` warning only. |
| `npm run test:wikilink-resolver` | PASS | Resolver cache behavior still passes. |
| `npm run test:markdown` | PASS | Markdown suite passes; only existing module-type and highlight.js deprecation warnings observed. |
| `npm run test:ci` | PASS | Full project CI test script passes. |
| `npm run build` | PASS | Vite extension/webview build passes. |
| `npm run typecheck` | PASS | TypeScript typecheck passes. |
| `npm run release:local` | PASS | Full local release gate passes: typecheck, test:ci, build, rhwp native pdf build, HWP verification, package verification, VSIX verification. |

Generated package:

`/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.46.vsix`

The final `npm run release:local` run was repeated after the middle-body
Backspace/Delete fix. It passed and regenerated the VSIX.

## `[[` Pairing Regression Follow-up

After the first hardening pass, the installed Markdown WebView still showed a
runtime regression when `[[` was inserted from a blank Markdown line: Vditor can
collapse the blank line while applying the text edit, so the source diff looked
like `# Smoke\n\n` -> `# Smoke\n[[` instead of a strict pure insertion. The old
pairing detector rejected that shape.

Additional automated coverage:

- `source.pairMarkdownInsertedBracket('# Smoke\n\n', '# Smoke\n[[')` now returns
  `# Smoke\n[[]]` with the caret inside the empty body.
- `authoring.pairMarkdownInsertedBracket('# Smoke\n\n', '# Smoke\n[[')` covers
  the same blank-line-collapse case for the authoring wrapper.

Additional runtime evidence in VS Code Insiders:

- Reinstalled `/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.46.vsix`
  with `code-insiders --install-extension ... --force`.
- Ran `Developer: Reload Window` so the installed extension host and WebView
  reloaded the new package.
- Opened `/Users/jun/Developer/new/.tmp/code-office-wikilink-regression/Source.md`
  with sibling candidate
  `/Users/jun/Developer/new/.tmp/code-office-wikilink-regression/AlphaCandidate.md`
  inside the active workspace.
- Pressed the real `[` key twice in the code-office Markdown WebView. Result:
  text changed to `[[]]` and the wikilink candidate list opened.

Fresh command verification after the regression patch:

| Command | Result |
|---|---:|
| `npm run test:wikilink-authoring` | PASS |
| `npm run test:markdown` | PASS |
| `npm run build` | PASS |
| `npm run test:ci` | PASS |

## Employee Verification

Two read-only employee reviews were run after implementation:

- Backend review: PASS. Confirmed no `workspace.findFiles()` call in the
  Markdown open/click/completion hot path, confirmed watcher/create handling,
  confirmed bounded in-memory filtering, and ran `npm run
  test:wikilink-authoring`, `npm run test:wikilink-resolver`, and `npm run
  test:markdown`.
- Frontend first review: NEEDS_FIX. Found a stale-but-still-valid cursor issue
  for middle-body Backspace inside a closed `[[...]]` token.
- Frontend re-review after fix: PASS. Confirmed
  `recoverWikilinkCompletionSelectionAfterChange()` is wired into the real
  Vditor input path, middle Backspace/Delete regressions are directly tested,
  popup-facing filtering stays bounded, and `npm run test:wikilink-authoring`
  plus `npm run test:markdown` pass.

## Runtime VS Code Insiders Verification

Installed the generated VSIX into VS Code Insiders:

```text
code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.46.vsix --force
Extension 'code-office-3.7.46.vsix' was successfully installed.
```

Runtime workspace:

`/tmp/code-office-wikilink-qa`

Files:

- `/tmp/code-office-wikilink-qa/Source.md`
- `/tmp/code-office-wikilink-qa/TargetAlpha.md`
- `/tmp/code-office-wikilink-qa/Projects/TargetBeta.md`
- `/tmp/code-office-wikilink-qa/ㅁㅇㄴㄹㅁㅇ.md`
- `/tmp/code-office-wikilink-qa/NewWatcherNote.md` created after the workspace was already open.

Observed in VS Code Insiders:

- `Source.md` opened in the installed code-office Markdown WebView (`extensionId=jun6161.code-office` visible in the WebView URL).
- The `[[` input path works in the actual WebView editor.
- Korean closed-link text `[[ㅁㅇㄴㄹㅁㅇㄹ]]` can be typed without a hang.
- Backspace after closed-link input responds immediately and removes closing brackets one by one; the editor remains focused and editable.
- `NewWatcherNote.md` created while VS Code was open appeared in Explorer immediately, confirming the active VS Code file watcher path receives new Markdown files.
- Typing `[[New` after creating `NewWatcherNote.md` still leaves the editor responsive. The suggestion popup itself is not exposed as a separate accessibility list in the captured tree, so popup candidate correctness is covered by automated authoring tests and code path inspection.

## Runtime Re-Check: Pair Popup and Next Printable Input

User-reported failure on 2026-06-08:

- Real VS Code Insiders screen showed a stale WebView state where typing `[[`
  did not visibly produce `[[]]` or a candidate list.
- Direct Computer Use verification after reload showed the installed WebView
  does produce `[[]]` and opens the candidate list on the second real `[` key.
- A follow-up key press while the popup was open exposed a second issue:
  printable input could be routed once through `keydown` and then again through
  `beforeinput` in modern WebViews/IME paths.

Patch applied:

- `resource/vditor/wikilink-authoring.js` now lets `beforeinput` own printable
  text routing when the environment supports it.
- `keydown` printable routing remains only as a fallback for environments
  without `beforeinput`.

Fresh installed-VSIX evidence:

- Packaged `/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.46.vsix`.
- Installed with `code-insiders --install-extension ... --force`.
- Ran `Developer: Reload Window`.
- Reopened `/Users/jun/Developer/new/.tmp/code-office-wikilink-regression/Source.md`.
- Pressed real `[` twice in the code-office Markdown WebView:
  - accessibility tree value became `[[]]`;
  - visible candidate list opened.
- Pressed the next printable key while the popup was open and saved:
  - visible editor rendered the wikilink body as `a`;
  - saved source file contained `[[a]]`.

## Hot-Path Scan Verification

The implementation keeps workspace-wide scans out of the Markdown open/edit hot path:

- `WikilinkIndex` remains the owner of file discovery.
- `workspace.findFiles()` remains confined to index build/rebuild paths and no-index fallback behavior.
- Markdown open payloads continue to use cached data instead of triggering a workspace scan.
- The popup-facing filter in `wikilink-authoring.js` now delegates to the same bounded scorer used by source transaction logic.
- Change-aware source selection recovery computes the real post-edit caret for middle-body Backspace/Delete in closed `[[...]]` tokens, preventing a stale but still-valid offset from filtering suggestions against the wrong query.

## Result

PASS.

The automated tests cover the exact `[[...]]` edit-state, body-end and middle-body delete/backspace recovery, and bounded-filter regression cases. The installed VSIX runtime smoke confirms the real WebView editor no longer hangs on Korean wikilink typing/backspace and that VS Code sees newly created Markdown files while the workspace is open.
