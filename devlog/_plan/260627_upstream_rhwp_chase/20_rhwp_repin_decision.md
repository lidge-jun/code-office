---
created: 2026-06-27
tags: [code-office, rhwp, re-pin, decision, hwp, changelog]
---
# rhwp Re-pin Decision — v0.7.13 → v0.7.17

Decision record for backlog item **R1** ([[00_overview]] §1). Applies the
[[10_rhwp_catchup_playbook]] §2 criteria to the authoritative `edwardkim/rhwp`
GitHub Release notes for the gap range.

- **Current pin:** `v0.7.13` / `b3e16ef…` + local patch `f887dca…` (find-dialog Enter, PR #1281) — `vendor/rhwp-studio-dist/VERSION.md`
- **Latest:** `v0.7.17` (2026-06-22). Gap = 4 releases / 1387 commits (assessed 2026-06-27).
- **Source:** `gh api repos/edwardkim/rhwp/releases` (release notes, not raw commits).

## Verdict: **RE-PIN** — target **v0.7.16** (conservative) or **v0.7.17** (optional)

The gap range is dominated by exactly the changes §2 names as re-pin triggers —
save/export correctness, security, and visible rendering fixes — not by churn or
unsurfaced features. For an engine that writes irreplaceable government
documents, the save-contract + security content clears the bar decisively.

Independently audited: Backend employee read the release notes, categorized each,
and returned audit **PASS / RE-PIN** (this pass's A-phase).

## Per-release summary

| Release | Date | Decisive content |
| --- | --- | --- |
| v0.7.14 | 2026-06-04 | **ClickHere field file-corruption fix** (data loss); HWPX save-contract expansion (bookmark/field, OLE chart, rotated picture, masterpage idRef, id global-uniqueness, external image bytes); render: rotation bbox, z-order, RawSvg blank, endnote/equation; **find/go-to dialog Enter handling** (overlaps our #1281) |
| v0.7.15 | 2026-06-06 | **Security:** service-worker fetch SSRF-class hardening (#1307); save: picture flip/rotation + `isEmbeded` (#1309), diagonal cell borders (#1311), zero-length field ordering (#1299) |
| v0.7.16 | 2026-06-19 | **~16-PR HWPX serializer fidelity** (lossless round-trip: cell/textbox, lineseg, caption, secPr, colPr, picture size, MEMO, shapeComment, table pageBreak); Hancom ClickHere direction format (#1434); **drag&drop local-file security gate** (#1439) |
| v0.7.17 | 2026-06-22 | Render: OOXML chart 7/27 types → 2D, stacked/percent bars (#1453); save: legacy `hp:shapeComment` round-trip (#1451); table row/col insert-delete height regression (#1481); additive `*Ex(options_json)` API (#1413, backward-compatible); bundled ext 0.2.6 |

## §2 criteria scoring

| §2 RE-PIN trigger | Hit | Evidence |
| --- | --- | --- |
| save/export correctness | **YES (dominant)** | v0.7.14 ClickHere corruption; v0.7.15 isEmbeded/flip; v0.7.16 ~16-PR fidelity; v0.7.17 shapeComment |
| security / memory-safety | **YES** | v0.7.15 SSRF fetch hardening; v0.7.16 drag&drop gate |
| visible rendering-correctness | **YES** | rotation bbox, z-order, chart 2D, RawSvg blank-fix |
| fix for an open HWP-viewer bug | **partial** | v0.7.14 find/go-to Enter overlaps our #1281 patch |

§2 HOLD triggers: only **v0.7.17 freshness** applies (5 days old, no follow-up
patch). v0.7.14–v0.7.16 are settled (8+ days). → A **v0.7.16 pin loses none of
the decisive security + save-contract content**; v0.7.17 adds chart-render and a
table-edit regression fix but is the marginal call.

## Risks (carry into R2 — they argue for caution, not against re-pinning)

1. **Find-dialog patch #1281 re-resolution — HIGH attention.** v0.7.14 changed the
   same find/go-to Enter surface. The local patch may now conflict or be partly
   redundant upstream. Playbook §3 requires re-resolving it; §4 gate = "Enter in
   find dialog does not leak into the document." Decide whether it is still needed.
2. **HWPX save-contract byte churn → re-verify.** Four releases of serializer
   changes alter HWP/HWPX bytes. `src/provider/hwp/hwpSaveService.ts` signatures
   are unaffected (serialization is in-bundle), but byte round-trip is not —
   `npm run verify:hwp-compatibility` + Computer Use save→reopen→confirm-persisted
   is **mandatory** before R2 is called done.
3. **Large rebuild surface.** 1387-commit gap = a big WASM/studio rebuild; mirror
   `vendor/rhwp-studio-dist/VERSION.md` build env exactly (Rust/wasm-pack/node-lock).
4. **Bundled extension 0.2.6 (v0.7.17 only).** CSP/Chrome-download changes target
   the standalone browser extension; code-office loads the local bundle, so these
   are largely inert in the VS Code webview. Low risk.
5. **`*Ex` options API (#1413).** Additive only, positional API retained — low risk.

## Outcome → next pass

- **Decision: RE-PIN to v0.7.16** (recommended) — captures all security + save
  fidelity with no freshness risk; revisit v0.7.17 once it has a follow-up patch.
- This is an R1 (decision) deliverable only — **no rebuild performed here.** The
  actual re-pin is backlog item **R2**, a separate heavier PABCD pass that must
  execute playbook §3–§4 including the #1281 re-resolution and the mandatory
  `verify:hwp-compatibility` + Computer Use save/reopen gate.
