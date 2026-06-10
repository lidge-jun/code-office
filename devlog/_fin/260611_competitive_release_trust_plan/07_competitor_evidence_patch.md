# 07 Competitor Evidence Patch

## Problem

The correct competitive claim is not "there are no competitors." The correct
claim is that `code-office` can own a stronger workflow if it proves local save
lifecycle, format-aware writes, and cross-format workspace integration.

## Patch Scope

### NEW `docs/COMPETITIVE-CONTEXT.md`

Comparison targets:

- `cweijan/vscode-office`
- `edwardkim.rhwp-vscode`
- `mjyoo2.hwpx-editor`
- Quarto Visual Editor
- RTF Markdown Editor
- Obsidian

Comparison table:

| Project | Primary role | HWP view | HWP edit | HWPX edit | Native VS Code save lifecycle | Cross-format workspace | Notes |
|---|---|---|---|---|---|---|---|
| code-office | local document workspace | verified/limited/planned per release | verified/limited/planned per release | verified/limited/planned per release | verified/limited/planned per release | verified/limited/planned per release | every claim needs version + evidence path |
| rhwp-vscode | HWP/HWPX viewer | yes | no | no | not same scope | no | viewer baseline |
| hwpx-editor | HWPX editor | partial | conversion-oriented | yes | verify | limited | direct competitor |
| cweijan/vscode-office | office preview bundle | no core HWP wedge | no | no | preview/editor mixed | broad | incumbent adoption |
| Obsidian | PKM app | no | no | no | not VS Code | Markdown ecosystem | not main competitor |

Rules:

- Use current public URLs for each comparison.
- Avoid insulting competitors.
- Mark unknowns as unknown.
- Separate adoption from capability.
- Separate viewer, editor, converter, and save-lifecycle claims.
- Use `verified`, `limited`, `planned`, and `unknown` consistently. Do not
  publish "target yes" as if it were a verified capability.
- Include `Verified in version` and `Evidence URL/path` columns before publishing
  the public comparison.

## Acceptance Criteria

- The public competitive context is honest and defensible.
- `code-office` does not claim "no competitors."
- The project explains why its workflow is different despite low initial install
  count.
