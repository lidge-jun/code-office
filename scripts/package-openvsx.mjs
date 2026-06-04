import AdmZip from 'adm-zip';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const packagePath = join(root, 'package.json');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const targetPublisher = 'lidge-jun';

function readPackageJson() {
    return JSON.parse(readFileSync(packagePath, 'utf8'));
}

function writePackageJson(packageJson) {
    writeFileSync(packagePath, `${JSON.stringify(packageJson, null, '\t')}\n`);
}

function run(command, args) {
    execFileSync(command, args, {
        cwd: root,
        stdio: 'inherit',
        env: process.env,
    });
}

function readVsixManifest(vsixPath) {
    const zip = new AdmZip(vsixPath);
    const entry = zip.getEntry('extension/package.json');
    if (!entry) {
        throw new Error(`Open VSX package is missing extension/package.json: ${vsixPath}`);
    }
    return JSON.parse(entry.getData().toString('utf8'));
}

const originalText = readFileSync(packagePath, 'utf8');
const originalPackage = JSON.parse(originalText);
const version = originalPackage.version;
const outputName = `code-office-${version}-openvsx.vsix`;
const outputPath = join(root, outputName);

try {
    const openVsxPackage = {
        ...originalPackage,
        publisher: targetPublisher,
    };
    writePackageJson(openVsxPackage);

    run(npmCommand, ['exec', '--', 'vsce', 'package', '--no-dependencies', '--out', outputName]);

    if (!existsSync(outputPath)) {
        throw new Error(`Expected Open VSX VSIX was not created: ${outputPath}`);
    }

    const manifest = readVsixManifest(outputPath);
    if (manifest.publisher !== targetPublisher) {
        throw new Error(`Expected Open VSX publisher ${targetPublisher}, got ${manifest.publisher}`);
    }
    if (manifest.version !== version) {
        throw new Error(`Expected Open VSX version ${version}, got ${manifest.version}`);
    }

    console.log(`Created ${outputName} for Open VSX publisher ${targetPublisher}`);
} finally {
    writeFileSync(packagePath, originalText);
    const restoredPackage = readPackageJson();
    if (restoredPackage.publisher !== originalPackage.publisher) {
        throw new Error(`Failed to restore package publisher ${originalPackage.publisher}`);
    }
}
