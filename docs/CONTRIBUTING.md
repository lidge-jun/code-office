# Contributing to code-office

Thank you for considering a contribution to code-office. This guide covers the development setup, coding conventions, and submission process.

## Prerequisites

- Node.js 18+
- VS Code 1.64+
- npm (comes with Node.js)

## Development Setup

```bash
# Clone the repository
git clone https://github.com/lidge-jun/code-office.git
cd code-office

# Install dependencies
npm install

# Build the extension
npm run build

# Or start in watch mode for development
npm run dev
```

### Running the Extension

1. Open the project in VS Code
2. Press `F5` to launch the Extension Development Host
3. The extension will activate automatically when you open a supported file

### React WebView Development

The React components run inside VS Code's WebView. In development mode, they connect to a Vite dev server with hot module replacement:

```bash
# Start the Vite dev server (port 5739)
npm run dev:webview
```

Then launch the Extension Development Host with `F5`. The WebView will load from the Vite dev server instead of the bundled build.

## Project Structure

```
src/
├── extension.ts              Extension activation entry
├── provider/                 VS Code editor providers
│   ├── hwp/                  HWP/HWPX editing (CustomEditorProvider)
│   ├── handlers/             File-type-specific event handlers
│   ├── compress/             Archive handling (ZIP, RAR)
│   └── wikilink/             Wikilink completion + links
├── service/                  Business logic layer
│   ├── markdown/             Markdown export + rendering
│   ├── wikilink/             Wikilink parser + resolver
│   ├── pptx/                 LibreOffice conversion
│   └── zip/                  Archive utilities
├── common/                   Shared utilities
└── react/                    WebView React components
    ├── view/                 Per-format viewer components
    │   ├── hwp/              HWP editor + rhwp bridge
    │   ├── excel/            Spreadsheet viewer
    │   ├── word/             DOCX preview
    │   ├── pptx/             Slide carousel
    │   ├── image/            Image gallery
    │   ├── compress/         Archive tree view
    │   └── fontViewer/       Font inspector
    └── util/                 WebView communication helpers
```

For detailed file responsibilities and line counts, see [structure/01-file-function-map.md](../structure/01-file-function-map.md).

## Coding Conventions

### TypeScript

- All new code must be TypeScript (`.ts` / `.tsx`)
- Strict mode is enabled
- No `any` types unless absolutely necessary
- Prefer `const` over `let`

### File Size

- Maximum 500 lines per file. If a file exceeds this, split it
- ES Module (`import`/`export`) only in React code
- Extension host uses CommonJS (required by VS Code)

### Security

- Never trust data from WebView — always validate at the Host boundary
- HWP byte arrays must pass magic number validation before disk write
- WebView resource roots must be minimal (extension dir + document folder)
- CSP must not include `'unsafe-eval'` in production (only `'wasm-unsafe-eval'`)

### Naming

| Surface | Convention | Example |
|---|---|---|
| Provider files | camelCase | `markdownEditorProvider.ts` |
| React components | PascalCase | `Hwp.tsx`, `Excel.tsx` |
| Event constants | SCREAMING_SNAKE | `HWP_EVENTS.vscodeSave` |
| Config keys | dot-separated | `code-office.hwp.studioUrl` |

### Testing

Before submitting:

```bash
# TypeScript type checking
npm run typecheck

# Cross-platform CI regression suite
npm run test:ci

# Full release and VSIX package verification
npm run release:local
```

For the full GitHub Actions coverage matrix and when to add new tests, see
[docs/TESTING.md](TESTING.md).

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with atomic commits
4. Run verification scripts
5. Push and create a Pull Request

### Commit Message Convention

```
type(scope): description

Types: feat, fix, refactor, docs, build, test, chore
Scope: hwp, markdown, viewer, build, structure, devlog
```

Examples:
- `feat(hwp): add HWPX to HWP conversion dialog`
- `fix(viewer): prevent PDF viewer crash on empty file`
- `docs(structure): update file map after split`

## Areas Open for Contribution

See [structure/roadmap.md](../structure/roadmap.md) for the implementation roadmap. Key areas:

- **Phase 3**: Wikilink WebView rendering and export
- **Phase 4**: PPTX slide preview improvements
- **Phase 5**: Markdown CJK inline formatting
- **Phase 6**: Excel strikethrough preservation
- **Phase 7**: LibreOffice fallback for legacy formats

## Questions?

Open an issue on [GitHub](https://github.com/lidge-jun/code-office/issues).
