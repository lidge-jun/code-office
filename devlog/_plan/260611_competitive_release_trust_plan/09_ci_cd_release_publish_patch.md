# 09 CI/CD Release Publish Patch

## Problem

Manual publish worked for `3.7.48`, but broader public distribution needs a
repeatable CI/CD path. The safest sequence is artifact automation first,
registry publish second.

## Patch Scope

### Phase A: Artifact-only CI/CD

Files:

- NEW `.github/workflows/release.yml`
- MODIFY `structure/05-build-release.md`
- MODIFY `README.md`
- MODIFY `docs/index.html`

Behavior:

- Trigger on tag.
- Install the stable Rust toolchain, matching `.github/workflows/main.yml`,
  before `npm run release:local` because the release gate builds the native rhwp
  PDF helper.
- Build normal VSIX.
- Build Open VSX remapped VSIX.
- Generate checksums.
- Attach artifacts to GitHub Release.
- Add provenance/attestation if available.
- Treat Phase A artifacts as CI-built release evidence. Do not claim they are
  byte-identical to a registry package that was previously built manually on a
  different platform.

### Phase B: Registry publish automation

Files:

- MODIFY `.github/workflows/release.yml`
- MODIFY `package.json` scripts only if current scripts are insufficient.

Required secrets:

- `VSCE_PAT`
- `OVSX_PAT` or `OVSX_TOKEN`

Behavior:

- Publish VS Marketplace only after artifact gate passes.
- Publish Open VSX only after Open VSX remapped VSIX is generated.
- Poll public APIs until the version is visible:
  - VS Marketplace extension query API;
  - Open VSX version API with `downloadable: true`.

### Phase C: Post-publish evidence

Output:

- release URL;
- Marketplace URL/version;
- Open VSX URL/version;
- checksum file;
- CI run URL.
- checksum parity only when registry publish consumes the same CI-built VSIX.

Add this to release notes or a generated artifact summary.

## Failure Handling

- If Marketplace publish succeeds but public API lags, poll with a bounded
  timeout and report propagation delay.
- If Open VSX says already published but inactive, stop retrying the same
  version and record the API state.
- If checksum mismatch occurs, fail the release.
- If GitHub Release artifact upload fails, do not publish registries.
- If registry artifacts were published manually from another platform, document
  that GitHub Release checksums verify the CI artifacts, not the older manual
  registry bytes.

## Acceptance Criteria

- A tag can produce a public GitHub Release without local machine artifacts.
- Registry publish can be enabled after artifact-only workflow proves stable.
- Public version checks are part of the release workflow, not a manual memory
  step.
