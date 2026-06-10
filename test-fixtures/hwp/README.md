# HWP/HWPX Fixture Policy

This directory is reserved for public HWP/HWPX test fixtures.

Do not commit private HWP/HWPX documents, school documents, business documents,
or documents copied from a user workspace.

Allowed fixture classes:

- Synthetic fixtures: generated from scratch for public regression tests.
- Redacted fixtures: real-world documents only after private text, metadata,
  names, paths, and embedded personal data have been removed.
- Local-only fixtures: private documents used for manual QA. Keep them outside
  the repository and record only scenario name, file hash, screenshot result,
  and pass/fail notes in local devlog evidence.

If a document cannot be safely published, keep it out of git and reproduce the
bug with a synthetic fixture before adding an automated test.

`manifest.json` is the machine-readable fixture registry. It may contain zero
public fixtures while the project is still building synthetic samples, but any
future committed fixture must be registered there and must resolve inside this
directory.
