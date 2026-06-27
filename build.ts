/**
 * esbuild 构建脚本
 * - 打包 extension 主入口 (Node 端)
 * - 打包外部依赖到 out/node_modules
 *
 * @author RJ.Wang
 * @updated 2026-04-23
 */
const esbuild = require("esbuild")
const { resolve } = require("path")
const { existsSync, readFileSync, readdirSync, writeFileSync } = require("fs")
const { copy } = require("esbuild-plugin-copy")
const isProd = process.argv.indexOf('--mode=production') >= 0;

const dependencies = ['vscode-html-to-docx', 'highlight.js', 'pdf-lib', 'cheerio', 'katex', 'mustache', 'puppeteer-core']

const sharedPlugins = [
    copy({
        resolveFrom: 'cwd',
        assets: {
            from: ['./vendor/rhwp-studio-dist/**/*'],
            to: ['./resource/rhwp-studio/'],
            keepStructure: true
        },
    }),
    {
        name: 'rhwp-studio-webview-rewrite',
        setup(build) {
            build.onEnd(() => {
                rewriteRhwpStudioForWebview();
            })
        }
    },
    copy({
        resolveFrom: 'out',
        assets: {
            from: ['./template/**/*'],
            to: ['./'],
            keepStructure: true
        },
    }),
    copy({
        resolveFrom: 'out',
        assets: {
            from: ['./node_modules/node-unrar-js/dist/js/unrar.wasm'],
            to: ['./'],
            keepStructure: true
        },
    }),
    {
        name: 'build-notice',
        setup(build) {
            build.onStart(() => { console.log('build start') })
            build.onEnd(() => { console.log('build success') })
        }
    },
]

function rewriteRhwpStudioForWebview() {
    const root = resolve('./resource/rhwp-studio');
    const assetsPath = resolve(root, 'assets');
    const indexPath = resolve(root, 'index.html');

    if (!existsSync(indexPath)) {
        throw new Error(`Missing rhwp-studio index.html at ${indexPath}`);
    }
    if (!existsSync(assetsPath)) {
        throw new Error(`Missing rhwp-studio assets at ${assetsPath}`);
    }

    const indexHtml = readFileSync(indexPath, 'utf8')
        .replaceAll('href="/favicon.ico"', 'href="./favicon.ico"')
        .replaceAll('href="/icons/', 'href="./icons/')
        .replaceAll('src="/assets/', 'src="./assets/')
        .replaceAll('href="/assets/', 'href="./assets/')
        .replace(/<link rel="manifest" href="\/manifest\.webmanifest"><script id="vite-plugin-pwa:register-sw" src="\/registerSW\.js"><\/script>/, '');
    writeFileSync(indexPath, indexHtml);

    for (const fileName of readdirSync(assetsPath)) {
        if (!fileName.endsWith('.css')) continue;
        const cssPath = resolve(assetsPath, fileName);
        const css = readFileSync(cssPath, 'utf8')
            .replaceAll('url(/images/', 'url(../images/');
        writeFileSync(cssPath, css);
    }

    let bridgeInjected = false;

    for (const fileName of readdirSync(assetsPath)) {
        if (!fileName.endsWith('.js')) continue;
        const jsPath = resolve(assetsPath, fileName);
        const source = readFileSync(jsPath, 'utf8');
        const bridgeMatch = source.match(/var (\w+)=(\w+)\(\);window\.addEventListener\(`message`/);
        if (!bridgeMatch) continue;

        const readyVar = bridgeMatch[1];
        const guardFn = source.match(/case`loadFile`:if\(await \w+,!await (\w+)\(/)?.[1] ?? 'Nf';
        const loadFn = source.match(/case`loadFile`:if\(await \w+,!await \w+\([^)]+\)\)[^}]+break\}await (\w+)\(new Uint8Array\(i\.data\)/)?.[1] ?? 'Tf';
        const errorFn = source.match(/function (\w+)\(e\)\{let t=`파일 로드 실패/)?.[1] ?? 'Lf';
        const dirtyMgr = source.match(/(\w+)\.markClean\(`document-initialized`\)/)?.[1] ?? 'af';
        const bridgeNeedle = bridgeMatch[0];
        const bridgeReplacement = `var ${readyVar}=${bridgeMatch[2]}();${buildRhwpDirectBridgeScript(readyVar, guardFn, loadFn, errorFn, dirtyMgr)};window.addEventListener`;

        const js = source
            .replace(/function\((\w)\)\{return`\/`\+\1\}/g, 'function($1){return $1}')
            .replace(/\{targetOrigin:`\*`\}/g, '`*`')
            .replaceAll('e.source?.postMessage(', 'window.parent.postMessage(')
            .replace(
                'let{id:n,method:r,params:i}=t,a=(t,r)=>{window.parent.postMessage({type:`rhwp-response`,id:n,result:t,error:r},`*`)};',
                'let{id:n,method:r,params:i}=t,a=(e,i)=>{window.parent.postMessage({type:`rhwp-response`,id:n,token:t.token,result:e,error:i},`*`)};'
            )
            .replace(
                `case\`loadFile\`:if(await ${readyVar},!await ${guardFn}(!!i?.skipUnsavedGuard)){a(void 0,\`문서 열기가 취소되었습니다.\`);break}await ${loadFn}(new Uint8Array(i.data),i.fileName||\`document.hwp\`,null),a({pageCount:X.pageCount});break;`,
                `case\`loadFile\`:if(await ${readyVar},!await ${guardFn}(!!i?.skipUnsavedGuard)){a(void 0,\`문서 열기가 취소되었습니다.\`);break}let o=${loadFn}(new Uint8Array(i.data),i.fileName||\`document.hwp\`,null);o.catch(${errorFn}),await Promise.race([o.then(()=>!0),new Promise(e=>setTimeout(()=>e(!1),1500))]),a({pageCount:X.pageCount});break;`
            )
            .replace(
                `case\`exportHwpVerify\`:await ${readyVar},a(JSON.parse(X.exportHwpVerify()));break;default:a(void 0,\`Unknown method: \${r}\`)}}catch`,
                `case\`exportHwpVerify\`:await ${readyVar},a(JSON.parse(X.exportHwpVerify()));break;case\`pageCount\`:await ${readyVar},a(X.pageCount);break;case\`getPageSvg\`:await ${readyVar},a(X.renderPageSvg(i?.page??0));break;case\`searchAllText\`:await ${readyVar},typeof X.searchAllText!=\`function\`?a([]):(t=>{try{a(JSON.parse(t))}catch{a(t)}})(X.searchAllText(i?.query||\`\`,!!i?.caseSensitive,!0));break;case\`setDebugOverlay\`:await ${readyVar},typeof X.set_debug_overlay==\`function\`?(X.set_debug_overlay(!!i?.enabled),Q?.loadDocument?.(),a(!0)):a(!1);break;case\`markClean\`:await ${readyVar},${dirtyMgr}.markClean(\`host-save\`),a(${dirtyMgr}.isDirty());break;default:a(void 0,\`Unknown method: \${r}\`)}}catch`
            )
            .replace(
                'Z.on(`document-dirty-changed`,()=>{Z.emit(`command-state-changed`)})',
                `Z.on(\`document-dirty-changed\`,()=>{Z.emit(\`command-state-changed\`),window.dispatchEvent(new CustomEvent(\`rhwp-dirty-changed\`,{detail:{isDirty:${dirtyMgr}.isDirty()}}))})`
            )
            .replace(
                'HWPX 문서는 저장 시 HWP 형식으로 변환 저장됩니다.\\n원본 HWPX를 덮어쓰지 않도록 .hwp 파일명으로 저장합니다.',
                'VS Code 저장은 HWPX(.hwpx)를 유지합니다.\\ncode-office가 저장 요청 시 원본 확장자에 맞는 HWPX export를 사용합니다.'
            )
            .replace(
                'HWPX 변환 저장 모드 — 저장 시 HWP(.hwp)로 내보냅니다',
                'VS Code 저장은 HWPX(.hwpx)를 유지합니다'
            )
            .replace(bridgeNeedle, bridgeReplacement);

        if (js.includes('window.__rhwpBridge=')) bridgeInjected = true;
        if (!js.includes(`let o=${loadFn}(new Uint8Array(i.data)`)) {
            throw new Error('Failed to patch rhwp postMessage loadFile response path');
        }
        if (!js.includes('token:t.token')) {
            throw new Error('Failed to patch rhwp postMessage response token');
        }
        if (!js.includes(`case\`markClean\`:await ${readyVar},${dirtyMgr}.markClean(\`host-save\`)`)) {
            throw new Error('Failed to patch rhwp markClean response path');
        }
        if (!js.includes(`case\`setDebugOverlay\`:await ${readyVar},typeof X.set_debug_overlay`)) {
            throw new Error('Failed to patch rhwp debug overlay response path');
        }
        if (!js.includes(`case\`searchAllText\`:await ${readyVar}`)) {
            throw new Error('Failed to patch rhwp searchAllText response path');
        }
        if (!js.includes('rhwp-dirty-changed')) {
            throw new Error('Failed to patch rhwp dirty event bridge');
        }
        if (!js.includes('VS Code 저장은 HWPX(.hwpx)를 유지합니다')) {
            throw new Error('Failed to patch rhwp HWPX save status text');
        }
        writeFileSync(jsPath, js);
    }
    if (!bridgeInjected) {
        throw new Error('Failed to inject rhwp direct bridge into rhwp-studio main asset');
    }
}

function buildRhwpDirectBridgeScript(readyVar = 'Rf', guardFn = 'Nf', loadFn = 'Tf', errorFn = 'Lf', dirtyMgr = 'af') {
    const methods = [
        `ready:async()=>{await ${readyVar};return!0}`,
        `loadFile:async e=>{if(await ${readyVar},!await ${guardFn}(!!e?.skipUnsavedGuard))throw Error(\`문서 열기가 취소되었습니다.\`);let t=e.fileName||\`document.hwp\`,n=${loadFn}(new Uint8Array(e.data),t,null);return n.catch(${errorFn}),await Promise.race([n.then(()=>!0),new Promise(e=>setTimeout(()=>e(!1),1500))]),{pageCount:X.pageCount}}`,
        `pageCount:async()=>{await ${readyVar};return X.pageCount}`,
        `getPageSvg:async e=>{await ${readyVar};return X.renderPageSvg(e?.page??0)}`,
        `searchAllText:async e=>{await ${readyVar};if(typeof X.searchAllText!=\`function\`)return[];let t=X.searchAllText(e?.query||\`\`,!!e?.caseSensitive,!0);try{return JSON.parse(t)}catch{return t}}`,
        `setDebugOverlay:async e=>{await ${readyVar};if(typeof X.set_debug_overlay==\`function\`){X.set_debug_overlay(!!e?.enabled);Q?.loadDocument?.();return!0}return!1}`,
        `exportHwp:async()=>{await ${readyVar};return Array.from(X.exportHwp())}`,
        `exportHwpx:async()=>{await ${readyVar};return Array.from(X.exportHwpx())}`,
        `exportHwpVerify:async()=>{await ${readyVar};return JSON.parse(X.exportHwpVerify())}`,
        `markClean:async()=>{await ${readyVar};${dirtyMgr}.markClean(\`host-save\`);return ${dirtyMgr}.isDirty()}`,
    ];
    return `window.__rhwpBridge={${methods.join(',')}}`;
}

const mainOptions = {
    entryPoints: ['./src/extension.ts'],
    bundle: true,
    outfile: "out/extension.js",
    external: ['vscode', ...dependencies],
    format: 'cjs',
    platform: 'node',
    metafile: true,
    minify: isProd,
    sourcemap: !isProd,
    logOverride: {
        'duplicate-object-key': "silent",
        'suspicious-boolean-not': "silent",
    },
    plugins: sharedPlugins,
}

async function main() {
    if (isProd) {
        await esbuild.build(mainOptions)
    } else {
        // 使用 context API（esbuild 0.17+ 兼容），回退到旧版 watch
        if (esbuild.context) {
            const ctx = await esbuild.context(mainOptions)
            await ctx.watch()
        } else {
            await esbuild.build({ ...mainOptions, watch: true })
        }
    }
}

function createLib() {
    const points = dependencies.reduce((point, dependency) => {
        try {
            const pkg = require(`./node_modules/${dependency}/package.json`);
            const main = pkg.main ?? "index.js";
            const mainAbsPath = resolve(`./node_modules/${dependency}`, main);
            if (existsSync(mainAbsPath)) {
                point[dependency] = mainAbsPath;
            }
        } catch (err) {
            console.warn(`Skipping dependency ${dependency}: ${err.message}`)
        }
        return point;
    }, {})
    esbuild.build({
        entryPoints: points,
        bundle: true,
        outdir: "out/node_modules",
        format: 'cjs',
        platform: 'node',
        minify: true,
        treeShaking: true,
        metafile: true
    })
}

createLib();
main();
