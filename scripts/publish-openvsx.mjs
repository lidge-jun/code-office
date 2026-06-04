import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const vsixName = `code-office-${packageJson.version}-openvsx.vsix`;
const vsixPath = join(root, vsixName);
const token = process.env.OVSX_PAT || process.env.OVSX_TOKEN;

function run(command, args, env = process.env) {
    execFileSync(command, args, {
        cwd: root,
        stdio: 'inherit',
        env,
    });
}

if (!token) {
    console.error('Missing Open VSX token. Set OVSX_PAT or OVSX_TOKEN before running npm run publish:openvsx.');
    process.exit(1);
}

run(npmCommand, ['run', 'release:local']);
run(npmCommand, ['run', 'package:openvsx']);

if (!existsSync(vsixPath)) {
    console.error(`Missing Open VSX VSIX: ${vsixPath}`);
    process.exit(1);
}

run(npmCommand, ['exec', '--', 'ovsx', 'publish', vsixName], {
    ...process.env,
    OVSX_PAT: token,
});
