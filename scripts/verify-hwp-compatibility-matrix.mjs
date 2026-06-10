import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const matrixPath = 'docs/HWP-HWPX-COMPATIBILITY.md';
const fixturePolicyPath = 'test-fixtures/hwp/README.md';
const checks = [];

function check(name, condition, detail = '') {
    checks.push({ name, ok: Boolean(condition), detail });
}

function read(relativePath) {
    return readFileSync(join(root, relativePath), 'utf8');
}

check('HWP/HWPX compatibility matrix exists', existsSync(join(root, matrixPath)));
check('HWP/HWPX fixture policy exists', existsSync(join(root, fixturePolicyPath)));

const matrix = existsSync(join(root, matrixPath)) ? read(matrixPath) : '';
const fixturePolicy = existsSync(join(root, fixturePolicyPath)) ? read(fixturePolicyPath) : '';
const packageJson = JSON.parse(read('package.json'));
const currentPackageVersion = `code-office@${packageJson.version}`;

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
check('Matrix links screenshot evidence', matrix.includes('docs/assets/screenshots/code-office-hwp-editor.png'));
check(
    'Matrix scopes verified claims to package version',
    matrix.includes(`Current public package baseline: \`${currentPackageVersion}\``) &&
        matrix.includes(`| \`${currentPackageVersion}\` |`),
    currentPackageVersion,
);
check('Matrix rejects private document paths', !matrix.includes('/Users/'));
check('Matrix keeps private fixtures out of the repository', matrix.includes('Do not commit private HWP/HWPX documents'));

for (const requiredText of [
    'Do not commit private HWP/HWPX documents',
    'Synthetic fixtures',
    'Redacted fixtures',
    'Local-only fixtures',
]) {
    check(`Fixture policy includes ${requiredText}`, fixturePolicy.includes(requiredText));
}

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
    const suffix = item.detail ? ` - ${item.detail}` : '';
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${suffix}`);
}

if (failed.length > 0) {
    process.exitCode = 1;
}
