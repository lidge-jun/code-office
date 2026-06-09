# code-office Agent Rules

This repository is the `code-office` VS Code extension project.

Before changing code or architecture documents:

- Read `README.md` for product scope.
- Read `structure/00-structure-hub.md` and the relevant `structure/0*.md` file for the subsystem being changed.
- Read `devlog/AGENTS.md` before editing `devlog/`.
- Read `structure/AGENTS.md` before editing `structure/`.

Development conventions:

- Keep new source files modular and below 500 lines.
- Prefer existing provider, WebView, and service boundaries over new ad hoc globals.
- Keep completed plan evidence intact when moving folders from `devlog/_plan/` to `devlog/_fin/`.
- Do not push unless the user explicitly asks in the same turn.

