# Dependency Audit Snapshot

Created: 2026-05-29
Last refreshed: 2026-05-29 01:55 KST
Scope: `npm audit --omit=dev` release gate for `vscode_obsdian`

## Current Known Audit Categories

This snapshot records the 2026-05-29 B-phase audit summary from
`npm audit --omit=dev`.

| Package / chain | Severity | Fix available | Decision | Owner phase |
|-----------------|----------|---------------|----------|-------------|
| `minimist` via `x-data-spreadsheet` / `opencollective` | critical | no fix available | triage required | dependency-risk phase |
| `node-fetch` via `opencollective` | high | `npm audit fix` | triage required | dependency-risk phase |
| `tmp` via `external-editor` / `inquirer` | high | `npm audit fix` | triage required | dependency-risk phase |
| `xlsx` | high | no fix reported in audit summary | replace or accept with rationale | dependency-risk phase |
| `file-type` | moderate | `npm audit fix --force` to `file-type@22.0.1` breaking change | triage required | dependency-risk phase |

Current total:

```text
9 vulnerabilities (2 low, 1 moderate, 3 high, 3 critical)
```

Fresh B-phase command result:

```text
command: npm audit --omit=dev
exit: 1
date: 2026-05-29 01:55 KST
```

HWP Phase 8.2 implementation does not add these audit chains; they pre-exist in
general office-viewer dependencies. Marketplace release remains blocked until
the high/critical chains are fixed or explicitly accepted with rationale.

## Required Fresh Snapshot Template

```text
date:
command: npm audit --omit=dev --json
package:
severity:
via:
fix available:
decision: fix / accept temporarily / replace dependency
owner phase:
notes:
```

## Release Rule

Do not publish with untriaged high or critical findings. If a high or critical
finding is accepted temporarily, the acceptance must name the affected feature,
user impact, mitigation, and follow-up owner phase.
