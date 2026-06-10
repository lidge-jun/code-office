import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const matrixPath = 'docs/HWP-HWPX-COMPATIBILITY.md';
const fixturePolicyPath = 'test-fixtures/hwp/README.md';
const fixtureManifestPath = 'test-fixtures/hwp/manifest.json';
const checks = [];

function check(name, condition, detail = '') {
    checks.push({ name, ok: Boolean(condition), detail });
}

function read(relativePath) {
    return readFileSync(join(root, relativePath), 'utf8');
}

function isPrivatePath(value) {
    return /(^|["'\s])(?:\/Users\/|\/home\/|[A-Za-z]:\\)/.test(value);
}

check('HWP/HWPX compatibility matrix exists', existsSync(join(root, matrixPath)));
check('HWP/HWPX fixture policy exists', existsSync(join(root, fixturePolicyPath)));
check('HWP/HWPX fixture manifest exists', existsSync(join(root, fixtureManifestPath)));

const matrix = existsSync(join(root, matrixPath)) ? read(matrixPath) : '';
const fixturePolicy = existsSync(join(root, fixturePolicyPath)) ? read(fixturePolicyPath) : '';
const fixtureManifestText = existsSync(join(root, fixtureManifestPath)) ? read(fixtureManifestPath) : '{}';
const packageJson = JSON.parse(read('package.json'));
const currentPackageVersion = `code-office@${packageJson.version}`;
let fixtureManifest = {};

try {
    fixtureManifest = JSON.parse(fixtureManifestText);
    check('HWP/HWPX fixture manifest is valid JSON', true);
} catch (error) {
    check('HWP/HWPX fixture manifest is valid JSON', false, error instanceof Error ? error.message : String(error));
}

for (const heading of [
    '# HWP/HWPX Compatibility Matrix',
    '## Status Vocabulary',
    '## Public Matrix',
    '## Manual Release Smoke',
    '## Private Fixture Policy',
]) {
    check(`Matrix includes heading: ${heading}`, matrix.includes(heading));
}

for (const column of [
    '| Scenario |',
    '| Format |',
    '| Verified in version |',
    '| Open |',
    '| View |',
    '| Edit |',
    '| Save |',
    '| Reopen |',
    '| PDF Export |',
    '| Evidence |',
]) {
    check(`Matrix includes table column ${column}`, matrix.includes(column));
}

for (const status of ['verified', 'limited', 'planned', 'unsupported']) {
    check(`Matrix defines status: ${status}`, matrix.includes(`**${status}**`));
}

for (const scenario of [
    'Basic HWP open/edit/save/reopen',
    'Basic HWPX open/edit/save/reopen',
    'Dirty Editor to Viewer switch',
    'Failed save stays in Editor',
    'Complex layout parity',
]) {
    check(`Matrix tracks scenario: ${scenario}`, matrix.includes(scenario));
}

check('Matrix links release gate script', matrix.includes('scripts/verify-hwp-hardening.mjs'));
check('Matrix links VSIX verifier', matrix.includes('scripts/verify-vsix.mjs'));
check('Matrix links fixture manifest', matrix.includes('test-fixtures/hwp/manifest.json'));
check('Matrix links screenshot evidence', matrix.includes('docs/assets/screenshots/code-office-hwp-editor.png'));
check(
    'Matrix scopes verified claims to package version',
    matrix.includes(`Current public package baseline: \`${currentPackageVersion}\``) &&
        matrix.includes(`| \`${currentPackageVersion}\` |`),
    currentPackageVersion,
);
check('Matrix rejects private document paths', !isPrivatePath(matrix));
check('Matrix keeps private fixtures out of the repository', matrix.includes('Do not commit private HWP/HWPX documents'));

for (const requiredText of [
    'Do not commit private HWP/HWPX documents',
    'Synthetic fixtures',
    'Redacted fixtures',
    'Local-only fixtures',
]) {
    check(`Fixture policy includes ${requiredText}`, fixturePolicy.includes(requiredText));
}
check('Fixture policy links manifest', fixturePolicy.includes('manifest.json'));
check('Fixture policy rejects private document paths', !isPrivatePath(fixturePolicy));

check('Fixture manifest rejects private document paths', !isPrivatePath(fixtureManifestText));
check('Fixture manifest schemaVersion is 1', fixtureManifest.schemaVersion === 1);
check('Fixture manifest uses public-only policy', fixtureManifest.policy === 'public-fixtures-only');
check('Fixture manifest publicFixtures is an array', Array.isArray(fixtureManifest.publicFixtures));
check('Fixture manifest local evidence schema exists', Boolean(fixtureManifest.localEvidenceSchema));

const localEvidenceSchema = fixtureManifest.localEvidenceSchema ?? {};
for (const field of ['scenario', 'format', 'sha256', 'tool', 'result', 'notes']) {
    check(`Fixture manifest local evidence requires ${field}`, localEvidenceSchema.requiredFields?.includes(field));
}
for (const format of ['hwp', 'hwpx']) {
    check(`Fixture manifest allows local evidence format ${format}`, localEvidenceSchema.allowedFormats?.includes(format));
}
for (const result of ['pass', 'limited', 'fail']) {
    check(`Fixture manifest allows local evidence result ${result}`, localEvidenceSchema.allowedResults?.includes(result));
}
check('Fixture manifest path policy forbids private local paths', localEvidenceSchema.pathPolicy?.includes('Do not commit private local paths'));

if (Array.isArray(fixtureManifest.publicFixtures)) {
    for (const [index, fixture] of fixtureManifest.publicFixtures.entries()) {
        const detail = `publicFixtures[${index}]`;
        check(`${detail} is an object`, Boolean(fixture) && typeof fixture === 'object' && !Array.isArray(fixture));
        if (!fixture || typeof fixture !== 'object') continue;
        check(`${detail} has id`, typeof fixture.id === 'string' && fixture.id.length > 0);
        check(`${detail} has relative path`, typeof fixture.path === 'string' && fixture.path.length > 0 && !fixture.path.startsWith('/') && !fixture.path.includes('..'));
        check(`${detail} path uses HWP/HWPX extension`, /\.(hwp|hwpx)$/i.test(fixture.path ?? ''));
        check(`${detail} file exists`, typeof fixture.path === 'string' && existsSync(join(root, 'test-fixtures/hwp', fixture.path)));
        check(`${detail} has license or provenance note`, typeof fixture.provenance === 'string' && fixture.provenance.length > 0);
    }
}

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
    const suffix = item.detail ? ` - ${item.detail}` : '';
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${suffix}`);
}

if (failed.length > 0) {
    process.exitCode = 1;
}
