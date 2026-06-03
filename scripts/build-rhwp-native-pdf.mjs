import { chmodSync, copyFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = join(root, 'native/rhwp-pdf-export/Cargo.toml');
const platformKey = `${process.platform}-${process.arch}`;
const extension = process.platform === 'win32' ? '.exe' : '';
const binaryName = `rhwp-pdf-export${extension}`;
const builtBinary = join(root, 'native/rhwp-pdf-export/target/release', binaryName);
const targetBinary = join(root, 'resource/rhwp-native', platformKey, binaryName);

const build = spawnSync('cargo', ['build', '--release', '--manifest-path', manifest], {
    cwd: root,
    stdio: 'inherit',
});
if (build.status !== 0) {
    throw new Error(`cargo build failed with status ${build.status}`);
}

mkdirSync(dirname(targetBinary), { recursive: true });
copyFileSync(builtBinary, targetBinary);
chmodSync(targetBinary, 0o755);
console.log(`Copied ${builtBinary} -> ${targetBinary}`);
