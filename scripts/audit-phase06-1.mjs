import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const reviewedFindings = {
    esbuild: {
        severity: 'moderate',
        phase: '06.2',
        reason: 'Build-tool devDependency. npm reports the safe fix as a semver-major upgrade.',
        urls: new Set(['https://github.com/advisories/GHSA-67mh-4wv8-2f99']),
    },
    'file-type': {
        severity: 'moderate',
        phase: '06.2',
        reason: 'Runtime pasted-image sniffing dependency. The fixed version is a semver-major ESM/API migration.',
        urls: new Set(['https://github.com/advisories/GHSA-5v7r-6r5c-r473']),
    },
};

const closedInPhase = new Set([
    'external-editor',
    'inquirer',
    'minimist',
    'node-fetch',
    'opencollective',
    'tmp',
    'x-data-spreadsheet',
    'xlsx',
]);

function runAudit() {
    return spawnSync('npm', ['audit', '--json', '--package-lock=false'], {
        cwd: repoRoot,
        encoding: 'utf8',
        shell: false,
    });
}

function parseAudit(stdout) {
    try {
        return JSON.parse(stdout || '{}');
    } catch (error) {
        throw new Error(`Unable to parse npm audit JSON: ${error.message}`);
    }
}

function advisoryUrls(vulnerability) {
    return (vulnerability.via || [])
        .filter(item => typeof item === 'object' && item?.url)
        .map(item => item.url);
}

function formatFix(fixAvailable) {
    if (!fixAvailable) return 'none';
    if (fixAvailable === true) return 'available';
    const major = fixAvailable.isSemVerMajor ? ' semver-major' : '';
    return `${fixAvailable.name}@${fixAvailable.version}${major}`;
}

function classify(report) {
    const vulnerabilities = report.vulnerabilities || {};
    const rows = [];
    const failures = [];

    for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
        const reviewed = reviewedFindings[name];
        const urls = advisoryUrls(vulnerability);

        if (!reviewed) {
            const phaseStatus = closedInPhase.has(name) ? 'expected closed in 06.1' : 'unclassified';
            failures.push(`${name}: ${phaseStatus}`);
            rows.push({
                name,
                severity: vulnerability.severity,
                status: 'FAIL',
                fix: formatFix(vulnerability.fixAvailable),
                reason: phaseStatus,
            });
            continue;
        }

        const unexpectedUrls = urls.filter(url => !reviewed.urls.has(url));
        if (unexpectedUrls.length > 0) {
            failures.push(`${name}: unexpected advisories ${unexpectedUrls.join(', ')}`);
            rows.push({
                name,
                severity: vulnerability.severity,
                status: 'FAIL',
                fix: formatFix(vulnerability.fixAvailable),
                reason: `unexpected advisory ${unexpectedUrls.join(', ')}`,
            });
            continue;
        }

        rows.push({
            name,
            severity: vulnerability.severity,
            status: `reviewed -> Phase ${reviewed.phase}`,
            fix: formatFix(vulnerability.fixAvailable),
            reason: reviewed.reason,
        });
    }

    return { rows, failures, metadata: report.metadata };
}

function printRows(rows, metadata) {
    const counts = metadata?.vulnerabilities || {};
    console.log('Phase 06.1 dependency audit classifier');
    console.log(`total=${counts.total || 0} low=${counts.low || 0} moderate=${counts.moderate || 0} high=${counts.high || 0} critical=${counts.critical || 0}`);
    console.log('');

    if (rows.length === 0) {
        console.log('No vulnerabilities reported by npm audit.');
        return;
    }

    for (const row of rows) {
        console.log(`- ${row.name} [${row.severity}] ${row.status}`);
        console.log(`  fix: ${row.fix}`);
        console.log(`  reason: ${row.reason}`);
    }
}

const audit = runAudit();

if (audit.error) {
    console.error(`Failed to run npm audit: ${audit.error.message}`);
    process.exit(1);
}

const report = parseAudit(audit.stdout);
const { rows, failures, metadata } = classify(report);

printRows(rows, metadata);

if (audit.status !== 0 && audit.status !== 1) {
    console.error(audit.stderr || `npm audit exited with status ${audit.status}`);
    process.exit(audit.status || 1);
}

if (failures.length > 0) {
    console.error('');
    console.error('Unexpected dependency audit findings:');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('');
console.log('PASS: only reviewed Phase 06.1 dependency audit findings remain.');
