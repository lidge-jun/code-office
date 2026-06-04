import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const checks = [];
const requireVsix = process.argv.includes('--vsix');

function check(name, condition, detail = '') {
    checks.push({ name, ok: Boolean(condition), detail });
}

function readText(relativePath) {
    return readFileSync(join(root, relativePath), 'utf8');
}

function listFiles(relativePath) {
    const absolute = join(root, relativePath);
    return existsSync(absolute) ? readdirSync(absolute) : [];
}

function findLatestVsix() {
    const files = readdirSync(root)
        .filter((file) => file.endsWith('.vsix'))
        .map((file) => {
            const absolute = join(root, file);
            return { file, mtimeMs: statSync(absolute).mtimeMs };
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs);
    return files[0]?.file;
}

function readVsixListing(vsixFile) {
    try {
        return execFileSync('unzip', ['-l', join(root, vsixFile)], {
            cwd: root,
            encoding: 'utf8',
            maxBuffer: 16 * 1024 * 1024,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `UNZIP_FAILED ${message}`;
    }
}

const packageJson = JSON.parse(readText('package.json'));
const readme = readText('README.md');
const notice = readText('NOTICE.md');
const docsIndex = readText('docs/index.html');
const testingGuide = readText('docs/TESTING.md');
const ciWorkflow = readText('.github/workflows/main.yml');
const vscodeignore = readText('.vscodeignore');

check('Package homepage points to GitHub Pages', packageJson.homepage === 'https://lidge-jun.github.io/code-office/');
check('Package description highlights HWP/HWPX', packageJson.description.includes('HWP/HWPX'));
check('Package icon points to generated project logo', packageJson.icon === 'images/logo-new.png');
check('Package declares local @vscode/vsce CLI', typeof packageJson.devDependencies?.['@vscode/vsce'] === 'string');
for (const keyword of ['hwp', 'hwpx', 'korean', 'rhwp', 'document']) {
    check(`Package keyword includes ${keyword}`, packageJson.keywords.includes(keyword));
}
for (const script of ['typecheck', 'test:ci', 'test:office', 'test:security', 'verify:hwp', 'build:rhwp-native-pdf', 'verify:vsix', 'verify:release', 'release:local']) {
    check(`Package script exists: ${script}`, typeof packageJson.scripts[script] === 'string');
}
check('CI test script includes Markdown suite', packageJson.scripts['test:ci']?.includes('test:markdown'));
check('CI test script includes Office suite', packageJson.scripts['test:ci']?.includes('test:office'));
check('CI test script includes dependency audit classifier', packageJson.scripts['test:ci']?.includes('test:security'));
check('Release gate runs CI test suite', packageJson.scripts['verify:release']?.includes('npm run test:ci'));
check('Release gate builds native rhwp PDF helper', packageJson.scripts['verify:release']?.includes('npm run build:rhwp-native-pdf'));
check('Package verify builds native rhwp PDF helper', packageJson.scripts['package:verify']?.includes('npm run build:rhwp-native-pdf'));
check('Smoke script runs full local release gate', packageJson.scripts.smoke === 'npm run release:local');
check('Publish script requires full local release gate', packageJson.scripts.publish?.startsWith('npm run release:local &&'));
check('GitHub CI runs Ubuntu and Windows tests', ciWorkflow.includes('ubuntu-latest') && ciWorkflow.includes('windows-latest'));
check('GitHub CI uploads packaged VSIX artifact', ciWorkflow.includes('actions/upload-artifact') && ciWorkflow.includes('code-office-*.vsix'));

check('README documents HWP/HWPX editing', readme.includes('HWP/HWPX Editing'));
check('README documents release checks', readme.includes('npm run release:local'));
check('README documents renamed HWP settings', readme.includes('code-office.hwp.studioUrl'));
check('README documents legacy HWP setting fallback', readme.includes('vscode-obsdian.hwp.*'));
check('README documents HWP Save PDF native-first fallback', readme.includes('Save Viewer pages as PDF') && readme.includes('back to image PDF export'));
check('README documents HWP find shortcuts', readme.includes('Cmd+F') && readme.includes('Viewer search highlights rendered SVG text'));
check('README documents platform-scoped native PDF helper', readme.includes('platform that built the VSIX') && readme.includes('process.platform'));
check('NOTICE includes rhwp attribution', notice.includes('edwardkim/rhwp'));
check('NOTICE includes bundled font notice', notice.includes('Bundled Fonts'));
check('NOTICE includes generated logo attribution', notice.includes('OpenAI image generation'));
check('GitHub Pages index exists', docsIndex.includes('code-office') && docsIndex.includes('HWP/HWPX'));
check('GitHub Pages documents HWP Viewer + Editor mode', docsIndex.includes('HWP/HWPX Viewer + Editor') && docsIndex.includes('Viewer / Editor mode'));
check('GitHub Pages documents HWP Save PDF native helper', docsIndex.includes('Save PDF') && docsIndex.includes('current-platform native PDF helper'));
check('GitHub Pages documents HWP find highlighting', docsIndex.includes('Cmd+F') && docsIndex.includes('highlights rendered SVG text'));
check('Testing guide documents GitHub CI gate', testingGuide.includes('npm run test:ci') && testingGuide.includes('GitHub Actions'));
check('Testing guide documents cross-platform path coverage', testingGuide.includes('Windows') && testingGuide.includes('Linux') && testingGuide.includes('wikilink'));
const screenshotAssets = [
    'code-office-hwp-editor.png',
    'code-office-docx-preview.png',
    'code-office-xlsx-dashboard.png',
    'code-office-pdf-brief.png',
    'code-office-pptx-preview.png',
    'code-office-html-preview.png',
];
for (const asset of screenshotAssets) {
    check(`Screenshot asset exists: ${asset}`, existsSync(join(root, 'docs/assets/screenshots', asset)));
    check(`README references screenshot: ${asset}`, readme.includes(asset));
    check(`GitHub Pages references screenshot: ${asset}`, docsIndex.includes(asset));
}
check('GitHub Pages documents legacy HWP setting fallback', docsIndex.includes('vscode-obsdian.hwp.*'));
check('GitHub Pages includes favicon metadata', docsIndex.includes('rel="icon"') && docsIndex.includes('og:image'));
check('VSIX excludes docs directory', vscodeignore.includes('docs/**'));
check('VSIX excludes development scripts', vscodeignore.includes('scripts/**'));
check('VSIX excludes native Rust source and target output', vscodeignore.includes('native/**'));
check('VSIX excludes upstream development log', vscodeignore.includes('DEVELOPMENT_LOG.md'));

const rhwpRootExists = existsSync(join(root, 'resource/rhwp-studio/index.html'));
const rhwpAssets = listFiles('resource/rhwp-studio/assets');
check('Built local rhwp-studio index exists', rhwpRootExists);
check('Built local rhwp-studio contains WASM assets', rhwpAssets.filter((file) => file.endsWith('.wasm')).length >= 2);
check('Built local rhwp-studio contains JS asset', rhwpAssets.some((file) => file.endsWith('.js')));
check('Built rhwp-vscode paragraph glue exists', existsSync(join(root, 'resource/rhwp-vscode/rhwp.js')));
check('Built rhwp-vscode paragraph WASM exists', existsSync(join(root, 'resource/rhwp-vscode/rhwp_bg.wasm')));
const nativePdfBinary = `resource/rhwp-native/${process.platform}-${process.arch}/rhwp-pdf-export${process.platform === 'win32' ? '.exe' : ''}`;
check('Built native rhwp PDF helper exists for current platform', existsSync(join(root, nativePdfBinary)));

const latestVsix = findLatestVsix();
if (requireVsix) {
    check('VSIX artifact exists', Boolean(latestVsix));
    if (latestVsix) {
        const listing = readVsixListing(latestVsix);
        const expectedName = `code-office-${packageJson.version}.vsix`;
        const sizeBytes = statSync(join(root, latestVsix)).size;
        check('VSIX name matches package version', basename(latestVsix) === expectedName, latestVsix);
        check('VSIX listing readable', !listing.startsWith('UNZIP_FAILED'));
        check('VSIX includes rhwp-studio index', listing.includes('extension/resource/rhwp-studio/index.html'));
        check('VSIX includes rhwp WASM assets', /extension\/resource\/rhwp-studio\/assets\/[^ ]+\.wasm/.test(listing));
        check('VSIX includes rhwp-vscode paragraph glue', listing.includes('extension/resource/rhwp-vscode/rhwp.js'));
        check('VSIX includes rhwp-vscode paragraph WASM', listing.includes('extension/resource/rhwp-vscode/rhwp_bg.wasm'));
        check('VSIX includes native rhwp PDF helper for current platform', listing.includes(`extension/${nativePdfBinary}`));
        check('VSIX includes NOTICE', listing.includes('extension/NOTICE.md'));
        check('VSIX includes LICENSE', listing.includes('extension/LICENSE.txt') || listing.includes('extension/LICENSE'));
        check('VSIX excludes rhwp sample files', !listing.includes('extension/resource/rhwp-studio/samples/'));
        check('VSIX excludes vendor sources', !listing.includes('extension/vendor/'));
        check('VSIX excludes native Rust source', !listing.includes('extension/native/rhwp-pdf-export/'));
        check('VSIX excludes docs site', !listing.includes('extension/docs/'));
        if (sizeBytes > 45 * 1024 * 1024) {
            console.warn(`WARN VSIX is large because it bundles rhwp-studio assets: ${(sizeBytes / 1024 / 1024).toFixed(1)} MB`);
        }
    }
}

if (!requireVsix) {
    console.log('INFO Skipping VSIX artifact inspection; run npm run package:verify for package checks.');
}

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
    const suffix = item.detail ? ` - ${item.detail}` : '';
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${suffix}`);
}

if (failed.length > 0) {
    process.exitCode = 1;
}
