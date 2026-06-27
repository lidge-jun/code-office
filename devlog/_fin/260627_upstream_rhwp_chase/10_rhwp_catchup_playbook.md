---
created: 2026-06-27
tags: [code-office, rhwp, upstream, playbook, re-pin, hwp]
---
# rhwp Catch-up Playbook

How to keep the vendored `edwardkim/rhwp` HWP/HWPX engine current: detect the
gap, decide whether to re-pin, execute the re-pin safely, verify it, and track
upstream on an ongoing cadence. This is the **procedure**; the live gap snapshot
lives in [[00_overview]] §1 and the follow-point lives in
`structure/03-hwp-subsystem.md` → "rhwp Upstream Tracking".

> Scope: rhwp engine only. The DOCX (SuperDoc) and base-fork (vscode-office)
> upstreams are tracked separately in [[00_overview]].

## 0. Source of truth

| What | Where |
| --- | --- |
| Authoritative pin (tag, commit, patch, build env, build commands) | `vendor/rhwp-studio-dist/VERSION.md` |
| Packaged runtime loaded by the webview | `resource/rhwp-studio/` |
| Follow-point summary table | `structure/03-hwp-subsystem.md` → "rhwp Upstream Tracking" |
| Gap snapshot + backlog (R1/R2) | this folder, `00_overview.md` |

Never hand-edit the gap into prose only — every re-pin updates `VERSION.md`
**and** the `structure/03` table together.

## 1. Detect the gap

Run against `edwardkim/rhwp` (requires `gh auth`). Read the pinned base from
`vendor/rhwp-studio-dist/VERSION.md` first, then:

```bash
PIN_TAG=v0.7.13                 # from VERSION.md "Pinned base tag"
PIN_SHA=b3e16ef212af81ef37d973ddb86d6816d3804642   # "Pinned base commit"

# Latest releases (top = newest)
gh api repos/edwardkim/rhwp/tags --jq '.[0:8][].name'

# Release-to-release gap to a candidate tag
gh api repos/edwardkim/rhwp/compare/$PIN_TAG...v0.7.17 --jq '{ahead_by,total_commits}'

# Default-branch gap from the exact pinned commit
gh api repos/edwardkim/rhwp/compare/$PIN_SHA...HEAD --jq '{ahead_by,behind_by}'

# Release dates for the candidate range
for t in v0.7.14 v0.7.15 v0.7.16 v0.7.17; do
  printf '%-9s ' "$t"; gh api repos/edwardkim/rhwp/commits/$t --jq '.commit.committer.date'
done
```

Snapshot (assessed **2026-06-27**): pinned `v0.7.13` / `b3e16ef`; latest
`v0.7.17` (2026-06-22); release-tag gap `v0.7.13...v0.7.17` = **1387 commits**;
default-branch gap = **1455 commits ahead, 0 behind**; **4 releases behind**.
These numbers are live and drift on the next upstream tag — re-run before acting.

## 2. Decide: re-pin or hold

Re-pinning rebuilds a WASM engine that writes irreplaceable government documents,
so it is **opt-in per release**, not automatic. Read the candidate changelog
(`gh api repos/edwardkim/rhwp/compare/$PIN_TAG...<tag> --jq '.commits[].commit.message'`)
and score:

**Re-pin when** the range contains:
- save/export correctness fixes (HWP/HWPX byte output, OWPML structure),
- security or memory-safety fixes in the WASM/runtime,
- rendering-correctness fixes we can see (glyph/font/table/image), or
- a fix for a bug we have open against the HWP viewer.

**Hold when** the range is dominated by:
- features we do not surface (unrelated UI, non-HWP formats),
- churn with no save/export/render/security impact, or
- the candidate is brand-new (<1 week) with no follow-up patch — let it settle.

Record the decision (re-pin vs hold + reason) in this folder before doing either.

## 3. Execute the re-pin

Mirror `vendor/rhwp-studio-dist/VERSION.md`'s build block exactly. Branch from the
**new** tag so the local find-dialog patch is committable.

```bash
NEW_TAG=v0.7.17
git clone https://github.com/edwardkim/rhwp /tmp/rhwp-upstream-$NEW_TAG
cd /tmp/rhwp-upstream-$NEW_TAG
git checkout -b fix/find-dialog-enter-routing "$NEW_TAG"   # branch FROM the new tag
# Re-apply the local find-dialog Enter capture patch (upstream PR #1281).
# It keeps Enter/Shift+Enter captured by the find dialog after a result moves
# focus into the editing surface. Re-resolve against new code; commit it.

wasm-pack build --target web
cd rhwp-studio
npm ci
npm run build
# Preserve flags + dist/ source — --delete removes stale files from the old build:
rsync -a --delete dist/ /Users/jun/Developer/new/700_projects/code-office/vendor/rhwp-studio-dist/
```

Then the closing steps (these are R2 in `00_overview.md`, owed beyond the raw build):

1. Sync the packaged bundle the webview actually loads: ensure
   `resource/rhwp-studio/` reflects the new `vendor/rhwp-studio-dist/` (per the
   build pipeline — do not leave them divergent).
2. Update `vendor/rhwp-studio-dist/VERSION.md`: new base tag, base commit, local
   patch commit, build date, and tool versions.
3. Update `structure/03-hwp-subsystem.md` → "rhwp Upstream Tracking" table
   (pin row + the gap-assessment line).
4. Note the re-pin in this devlog folder (decision + new pin + evidence).

## 4. Verify (gate)

A re-pin touches the highest-risk surface; verify THOROUGH before commit:

```bash
npm run typecheck
npm run verify:hwp-compatibility      # scripts/verify-hwp-compatibility-matrix.mjs
npm run release:local                 # verify:release (typecheck+test:ci+build+native PDF+hwp+vsix) + package:verify
```

Then **Computer Use** visual verification in VS Code Insiders (no fake clean):
open a real `.hwp` and `.hwpx`, confirm View renders, switch to Edit, type, save
with Cmd+S, reopen, and confirm the edit persisted in the file. Capture
screenshots. The find-dialog Enter patch must still hold (Enter in the find
dialog does not leak into the document). Do not call the re-pin done until this
passes — the goal-level rule is "no completion before Computer Use verification."

## 5. Track on a cadence

- **Trigger:** each new `edwardkim/rhwp` release tag, or monthly, whichever first.
- **Action:** run §1, refresh the gap line in `structure/03` (assessment date +
  numbers) even when holding, so the follow-point is never stale.
- **Escalate to a re-pin PABCD pass** when §2 scores "re-pin".

## 6. Rollback

The runtime is vendored, so rollback is a content revert:

```bash
git checkout -- vendor/rhwp-studio-dist/ resource/rhwp-studio/
git checkout -- vendor/rhwp-studio-dist/VERSION.md structure/03-hwp-subsystem.md
```

If already committed, revert the re-pin commit(s) and re-run §4 to confirm the
prior pin is restored. The live `https://edwardkim.github.io/rhwp/` runtime is
**not** a fallback — code-office always loads the local bundle.
