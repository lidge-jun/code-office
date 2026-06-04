# 260604 Wikilink Source Transaction Runtime Evidence

## Scope

This evidence note records the current production-readiness gap for Markdown
wikilink authoring in the code-office Vditor WebView.

The target behavior is source-transaction based:

- typing `[[` creates `[[]]` and places the cursor inside the pair
- typing or paste-like input such as `[[1` becomes `[[1]]`
- note suggestions should open from the active wikilink body context
- code fences and inline code stay protected

## Environment

- Project root: `/Users/jun/Developer/new/700_projects/code-office`
- Smoke workspace: `/Users/jun/Developer/new`
- Smoke file: `/Users/jun/Developer/new/.tmp/wikilink-smoke.md`
- Candidate notes:
  - `/Users/jun/Developer/new/.tmp/AlphaCandidate.md`
  - `/Users/jun/Developer/new/.tmp/BetaCandidate.md`
- VSIX built and installed during this pass:
  - `/Users/jun/Developer/new/700_projects/code-office/code-office-3.7.46.vsix`

## Fresh Verification

Static and package verification passed before the latest runtime smoke:

```text
npm run test:markdown
result: PASS

npx tsc --noEmit
result: PASS

npm run package:verify
result: PASS
```

`package:verify` generated `code-office-3.7.46.vsix`, verified HWP hardening,
verified release metadata, and confirmed the VSIX artifact name matches the
package version.

The VSIX install command also passed:

```text
code-insiders --install-extension /Users/jun/Developer/new/700_projects/code-office/code-office-3.7.46.vsix --force
result: Extension 'code-office-3.7.46.vsix' was successfully installed.
```

## Runtime Smoke Result

After installing `3.7.46`, the already-open VS Code Insiders window was reloaded
with `Developer: Reload Window`.

Observed through Computer Use in the current `/Users/jun/Developer/new`
workspace:

```text
file: /Users/jun/Developer/new/.tmp/wikilink-smoke.md
initial content on disk:
# Wikilink Smoke

action:
click blank line below heading
type_text("[[1")

expected:
# Wikilink Smoke
[[1]]

observed:
# Wikilink Smoke
[[1
```

This means helper-level tests and the packaged WebView source contain the latest
source-transaction helpers, but the Vditor contenteditable runtime path can
still preserve a raw unclosed `[[query` in the rendered surface.

## Employee Review Attempts

Frontend and Backend employee dispatches were attempted for independent review,
but both failed before producing assistant text:

```text
agent=Frontend
cli=grok
exitCode=1
diagnostic=Error: Couldn't create session: Session does not exist

agent=Backend
cli=grok
exitCode=1
diagnostic=Error: Couldn't create session: Session does not exist
```

Docs employee completed a read-only review and classified the issue as high
risk: static tests pass, but the runtime WebView integration path is not proven.
The review recommended recording this evidence and asking GPT Pro for an
architecture decision before adding more DOM fallback patches.

## Current Risk Classification

Risk: high.

The code has accumulated multiple fixes across `3.7.43` through `3.7.46`.
The intended architecture is source-first, but runtime patches still include
contenteditable observer and DOM repair paths. The next implementation step
should be chosen only after deciding whether the primary control point should
be Vditor input, source update before DOM mutation, or an explicit
contenteditable event interception path.

