# Current-State Reaudit Plan

Date: 2026-06-10
Project root: /Users/jun/Developer/new/700_projects/code-office

## Part 1 — Easy Explanation

The original 2026-05-30 cleanup plan is mostly already done. The current repository no longer has the old `.kiro`, `devlog/str_func`, `structure/_legacy`, old root structure docs, `DEVELOPMENT_LOG.md`, `shortcut.md`, or old VSIX files. The remaining cleanup is smaller: remove leftover `.DS_Store` files, remove stale references to deleted structure docs, and make the VSIX verifier accept that the deleted upstream development log is absent rather than requiring a stale `.vscodeignore` entry.

## Part 2 — Diff-Level Plan

### DELETE

```text
/Users/jun/Developer/new/700_projects/code-office/.DS_Store
/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/.DS_Store
/Users/jun/Developer/new/700_projects/code-office/resource/rhwp-studio/.DS_Store
```

Reason:

- They are macOS filesystem artifacts.
- They are untracked.
- `.gitignore` already contains both `.DS_Store` and `**/.DS_Store`, so recurrence is already blocked.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/.vscodeignore`

Before:

```text
DEVELOPMENT_LOG.md
```

After:

```text
```

Reason:

- `/Users/jun/Developer/new/700_projects/code-office/DEVELOPMENT_LOG.md` no longer exists.
- Keeping the ignore line makes the ignore list describe a deleted upstream artifact as if it still existed.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/scripts/verify-vsix.mjs`

Before:

```js
check('VSIX excludes upstream development log', vscodeignore.includes('DEVELOPMENT_LOG.md'));
```

After:

```js
check(
    'VSIX excludes or has removed upstream development log',
    vscodeignore.includes('DEVELOPMENT_LOG.md') || !existsSync(join(root, 'DEVELOPMENT_LOG.md')),
);
```

Reason:

- Release verification should pass when the upstream development log is still explicitly excluded.
- It should also pass when the upstream development log has been removed from the repository.
- This keeps the release gate meaningful while allowing the legacy cleanup to complete.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/structure/roadmap.md`

These are two separate single-line edits. They are not adjacent in the file.

Before:

```text
structure/license-attribution.md includes both upstream lineage entries
structure/release.md is the canonical release runbook.
```

After:

```text
NOTICE.md includes both upstream lineage entries
structure/05-build-release.md is the canonical release runbook.
```

Reason:

- `structure/license-attribution.md` and `structure/release.md` no longer exist.
- Current structure docs and README identify `NOTICE.md` and `structure/05-build-release.md` as the active sources.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/devlog/_plan/260530_legacy_cleanup/00_overview.md`

Append a current-state completion section after implementation with:

- which original targets were already gone,
- which targets were actually deleted,
- which stale references were repaired,
- command evidence.

### MODIFY `/Users/jun/Developer/new/700_projects/code-office/structure/06-devlog-map.md`

After verification, move this plan from `_plan` to `_fin` and update the map:

Before:

```text
| `260530_legacy_cleanup` | Cleanup plan that should be revalidated before archive. |
```

After:

```text
| `260530_legacy_cleanup` | Legacy cleanup re-audit and stale-reference closure. |
```

## Verification Plan

Commands:

```text
git status --short --ignore-submodules=none
find /Users/jun/Developer/new/700_projects/code-office -name .DS_Store -print
rg -n "structure/(license-attribution|release)\\.md|DEVELOPMENT_LOG.md|shortcut\\.md|str_func|\\.kiro|_legacy" structure scripts .vscodeignore .gitignore
npm run package:verify
git diff --check
```

Expected:

- no `.DS_Store` files under the repo,
- no active structure/script references to deleted structure docs,
- `npm run package:verify` passes,
- cleanup plan folder can move to `_fin`,
- git commit records the closure.

Expected residual grep matches that are not stale references:

- `.gitignore` should keep `.kiro/` and `**/.DS_Store`.
- `structure/06-devlog-map.md` may match `_legacy` as part of `260530_legacy_cleanup`.
- `scripts/verify-vsix.mjs` may still mention `DEVELOPMENT_LOG.md` as the compatibility branch for old checkouts where the file still exists.
