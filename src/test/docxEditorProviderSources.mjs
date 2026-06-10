import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function loadDocxEditorProviderSources() {
    const wordDir = path.join(root, 'src/react/view/word');
    const docxSourceEntries = await Promise.all(
        (await readdir(wordDir))
            .filter((file) => /\.(ts|tsx)$/.test(file))
            .sort((a, b) => {
                if (a === 'Word.tsx') return 1;
                if (b === 'Word.tsx') return -1;
                return a.localeCompare(b);
            })
            .map(async (file) => [file, await readFile(path.join(wordDir, file), 'utf8')]),
    );
    const docxSources = new Map(docxSourceEntries);

    return {
        wordSource: docxSources.get('Word.tsx') ?? '',
        docxSourceEntries,
        docxSources,
        docxSaveRepairSource: docxSources.get('docxSaveRepair.ts') ?? '',
        combinedWordSource: docxSourceEntries.map(([, source]) => source).join('\n'),
        wordCssSource: await readFile(path.join(root, 'src/react/view/word/Word.css'), 'utf8'),
        handlerSource: await readFile(path.join(root, 'src/provider/handlers/docxHandler.ts'), 'utf8'),
        providerSource: await readFile(path.join(root, 'src/provider/docx/DocxEditorProvider.ts'), 'utf8'),
    };
}

export function withDerivedDocxSources(context) {
    return {
        ...context,
        saveCustomDocumentSource: context.providerSource.match(/public\s+async\s+saveCustomDocument[\s\S]*?\n    public\s+async\s+saveActiveDocxDocument/)?.[0] ?? '',
    };
}
