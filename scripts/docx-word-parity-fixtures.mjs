import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';

const configPath = new URL('../.docx-word-parity-fixtures.local.json', import.meta.url);
const outputPath = new URL('../devlog/_plan/260609_docx_word_parity/fixtures.local.generated.md', import.meta.url);

async function hashFile(filePath) {
    const data = await readFile(filePath);
    return createHash('sha256').update(data).digest('hex');
}

function isFixture(value) {
    return value
        && typeof value === 'object'
        && typeof value.id === 'string'
        && typeof value.path === 'string';
}

function formatMarkdown(rows) {
    const lines = [
        '# DOCX Word-Parity Local Fixture Manifest',
        '',
        'Generated from `.docx-word-parity-fixtures.local.json`.',
        '',
        'This file intentionally records fixture IDs and hashes only. It does not record absolute DOCX paths or DOCX bytes.',
        '',
        '| Fixture | Exists | Size | SHA-256 | Error |',
        '|---|---:|---:|---|---|',
    ];

    for (const row of rows) {
        lines.push(`| ${row.id} | ${row.exists ? 'yes' : 'no'} | ${row.size ?? ''} | ${row.sha256 ?? ''} | ${row.error ?? ''} |`);
    }

    lines.push('');
    return lines.join('\n');
}

async function readFixtureConfig() {
    const raw = await readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isFixture)) {
        throw new Error('Fixture config must be an array of { id, path } objects.');
    }
    return parsed;
}

async function inspectFixture(fixture) {
    try {
        const info = await stat(fixture.path);
        return {
            id: fixture.id,
            exists: true,
            size: info.size,
            sha256: await hashFile(fixture.path),
        };
    } catch (error) {
        return {
            id: fixture.id,
            exists: false,
            error: error instanceof Error ? error.code || error.name : 'unknown',
        };
    }
}

async function main() {
    const fixtures = await readFixtureConfig();
    const rows = [];
    for (const fixture of fixtures) {
        rows.push(await inspectFixture(fixture));
    }
    await writeFile(outputPath, formatMarkdown(rows), 'utf8');
    const missing = rows.filter((row) => !row.exists);
    if (missing.length > 0) {
        console.error(`Missing DOCX fixtures: ${missing.map((row) => row.id).join(', ')}`);
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
