import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');

const checks = [];

function check(name, condition, detail = '') {
    checks.push({ name, ok: Boolean(condition), detail });
}

async function readText(relativePath) {
    return await readFile(join(root, relativePath), 'utf8');
}

async function readBytes(relativePath) {
    return await readFile(join(root, relativePath));
}

function hasMagic(bytes, magic) {
    return magic.every((value, index) => bytes[index] === value);
}

const packageJson = JSON.parse(await readText('package.json'));
const customEditors = packageJson.contributes.customEditors;
const officeViewer = customEditors.find((editor) => editor.viewType === 'cweijan.officeViewer');
const hwpEditor = customEditors.find((editor) => editor.viewType === 'cweijan.hwpEditor');
const officePatterns = new Set(officeViewer.selector.map((item) => item.filenamePattern));
const hwpPatterns = new Set(hwpEditor?.selector.map((item) => item.filenamePattern) ?? []);
const hwpSaveCommand = packageJson.contributes.commands.find((command) => command.command === 'code-office.hwp.save');
const hwpSaveKeybinding = packageJson.contributes.keybindings.find((keybinding) => keybinding.command === 'code-office.hwp.save');
const hwpCommandIds = new Set(packageJson.contributes.commands.map((command) => command.command));

check('HWP editor activation exists', packageJson.activationEvents.includes('onCustomEditor:cweijan.hwpEditor'));
check('HWP has dedicated CustomEditorProvider contribution', Boolean(hwpEditor));
check('HWP editor is the default HWP/HWPX opener', hwpEditor?.priority === 'default');
check('HWP save command is contributed', Boolean(hwpSaveCommand));
for (const command of [
    'code-office.hwp.switchToViewer',
    'code-office.hwp.switchToEditor',
    'code-office.hwp.exportSvg',
    'code-office.hwp.debugOverlay',
    'code-office.hwp.dumpParagraph',
]) {
    check(`HWP viewer command is contributed: ${command}`, hwpCommandIds.has(command));
}
check(
    'HWP Cmd+S keybinding is scoped to the HWP custom editor',
    hwpSaveKeybinding?.mac === 'cmd+s'
        && hwpSaveKeybinding?.key === 'ctrl+s'
        && hwpSaveKeybinding?.when === 'activeCustomEditorId == cweijan.hwpEditor',
);
check('Office viewer no longer owns HWP files', !officePatterns.has('*.hwp') && !officePatterns.has('*.hwpx'));
check('Dedicated HWP editor owns HWP/HWPX files', hwpPatterns.has('*.hwp') && hwpPatterns.has('*.hwpx'));
check(
    'Bundled local rhwp-studio is the default',
    packageJson.contributes.configuration.properties['code-office.hwp.studioUrl'].default === '',
);

const providerSource = await readText('src/provider/hwp/HwpEditorProvider.ts');
const hwpStudioConfigSource = await readText('src/provider/hwp/hwpStudioConfig.ts');
const hwpSettingsSource = await readText('src/provider/hwp/hwpSettings.ts');
const extensionSource = await readText('src/extension.ts');
const officeProviderSource = await readText('src/provider/officeViewerProvider.ts');
for (const method of [
    'saveCustomDocument',
    'saveCustomDocumentAs',
    'revertCustomDocument',
    'backupCustomDocument',
    'onDidChangeCustomDocument',
]) {
    check(`HWP provider implements ${method}`, providerSource.includes(method));
}
check('Save As exports by destination extension', providerSource.includes('getExplicitHwpFormat(destination)'));
check('Save write rejects extension/format mismatch', providerSource.includes('Refusing to write'));
check('Extension migrates stale HWP editor associations', extensionSource.includes('ensureHwpEditorAssociation'));
check('Migration repairs legacy officeViewer association', extensionSource.includes("current === 'cweijan.officeViewer'"));
check('Migration covers both HWP and HWPX patterns', extensionSource.includes("'*.hwp'") && extensionSource.includes("'*.hwpx'"));
check('HWP save command is registered to provider bridge', extensionSource.includes("registerCommand('code-office.hwp.save'") && extensionSource.includes('saveActiveHwpDocument'));
check('Legacy officeViewer HWP tabs redirect to hwpEditor', officeProviderSource.includes('redirectLegacyHwpPanel'));
check('Legacy HWP redirect targets cweijan.hwpEditor', officeProviderSource.includes("'cweijan.hwpEditor'"));

const schemaSource = await readText('src/common/hwpMessageSchema.ts');
for (const event of ['dirtyChanged', 'nativeSave', 'vscodeSave', 'vscodeSavePayload', 'reloadFile']) {
    check(`HWP message schema includes ${event}`, schemaSource.includes(event));
}
for (const event of ['modeChangeRequest', 'modeChanged', 'viewerCommandRequest', 'viewerCommand', 'viewerCommandResult']) {
    check(`HWP viewer message schema includes ${event}`, schemaSource.includes(event));
}
const handlerSource = await readText('src/common/handler.ts');
check('HWP nativeSave is allowed as inbound webview message', handlerSource.includes('HWP_EVENTS.nativeSave'));
check('HWP modeChanged is allowed as inbound webview message', handlerSource.includes('HWP_EVENTS.modeChanged'));
check('HWP viewerCommandRequest is allowed as inbound webview message', handlerSource.includes('HWP_EVENTS.viewerCommandRequest'));
check('HWP viewerCommandResult is allowed as inbound webview message', handlerSource.includes('HWP_EVENTS.viewerCommandResult'));

const reactAppSource = await readText('src/common/reactApp.ts');
check('React CSP supports dynamic frame sources', reactAppSource.includes('webviewFrameSources'));
check('React CSP supports dynamic connect sources', reactAppSource.includes('webviewConnectSources'));
check('React app passes initial HWP mode to webview', reactAppSource.includes('hwpInitialMode'));
check('React CSP allows VS Code webview scheme scripts', reactAppSource.includes("script-src 'self'") && reactAppSource.includes('vscode-webview:'));
check('React app rewrites Vite asset URLs to webview URIs', reactAppSource.includes('replace(/(src|href)="\\.\\/assets\\//g'));
check('React production CSP disables base URI', reactAppSource.includes("base-uri 'none'"));
check('React CSP skips local webview URLs in dynamic sources', reactAppSource.includes("url.protocol === 'vscode-webview:'"));
check('React CSP escapes meta attribute content', reactAppSource.includes('escapeHtmlAttribute(csp)'));
const hwpViewSource = await readText('src/react/view/hwp/Hwp.tsx');
check('VS Code save request controls export format', hwpViewSource.includes('exportCurrentDocument(payload.format)'));
check('HWP view defaults to Viewer mode unless host persisted Editor', hwpViewSource.includes("configs?.hwpInitialMode === 'editor' ? 'editor' : 'viewer'"));
check('HWP view keeps editor DOM for Viewer command RPC', hwpViewSource.includes('hwp-editor-surface-hidden'));
check('HWP view uses save-success gated Viewer transition', hwpViewSource.includes('pendingViewerSwitchRef') && hwpViewSource.includes('await enterViewerMode()'));
check('HWP Viewer toolbar routes commands to host', hwpViewSource.includes('HWP_EVENTS.viewerCommandRequest'));
check('Toolbar save routes through VS Code native save lifecycle', hwpViewSource.includes('HWP_EVENTS.nativeSave'));
check('HWP webview intercepts browser Save Page As shortcut', hwpViewSource.includes('handleNativeSaveShortcut') && !hwpViewSource.includes('containerRef.current?.contains(target)'));
check('VS Code native save remains available when toolbar save is hidden', !hwpViewSource.includes('!hwpSaveEnabled) return'));
check(
    'HWP view does not mark dirty on focus or pointer capture',
    !hwpViewSource.includes('onPointerDownCapture')
        && !hwpViewSource.includes('onFocusCapture')
        && !hwpViewSource.includes('onKeyDownCapture'),
);
check('HWP view listens to rhwp dirty event bridge', hwpViewSource.includes('rhwp-dirty-changed'));
check('HWP save success asks rhwp to reset its dirty baseline', hwpViewSource.includes('markRhwpCleanAfterSave') && hwpViewSource.includes('markClean()'));
check(
    'HWP view has an input-only dirty fallback after save',
    hwpViewSource.includes("['beforeinput', 'input', 'paste', 'cut', 'compositionend']")
        && hwpViewSource.includes('isEditingKey(event)')
        && hwpViewSource.includes('isEventInsideHwpEditor(event, containerRef.current)'),
);
const hwpSaveServiceSource = await readText('src/provider/hwp/hwpSaveService.ts');
check('Toolbar fallback skips same-format save dialog', hwpSaveServiceSource.includes('if (currentFormat === format) return fileUri;'));
check('HWP same-file save can write in place without rename churn', hwpSaveServiceSource.includes('writeFileInPlace') && hwpSaveServiceSource.includes('options.atomic === false'));
check(
    'Provider exposes active document native save bridge',
    providerSource.includes('saveActiveHwpDocument') && providerSource.includes('workbench.action.files.save'),
);
check('Provider same-file HWP save avoids temp rename overwrite', providerSource.includes('this.writePayload(document.uri, payload, undefined, { atomic: false })'));
check('Provider fails native save when VS Code lifecycle did not run', providerSource.includes('VS Code did not run the HWP save lifecycle'));
check('Provider reads bundled rhwp-studio index HTML by default', hwpStudioConfigSource.includes("readFileSync(indexUri.fsPath, 'utf8')"));
check('Provider passes bundled rhwp-studio resource base URL', hwpStudioConfigSource.includes('rhwpStudioBaseUrl'));
check('Provider keeps remote rhwp studio opt-in via URL', hwpStudioConfigSource.includes('rhwpStudioUrl = new URL(configured).toString()'));
check('Provider falls back to legacy vscode-obsdian settings', hwpSettingsSource.includes("getUserSetting<T>('vscode-obsdian'"));
check('Provider persists last HWP viewer/editor mode', providerSource.includes('HWP_LAST_MODE_STORAGE_KEY') && providerSource.includes('globalState.update'));
check('Provider defaults first HWP open to Viewer', providerSource.includes("return mode === 'editor' || mode === 'viewer' ? mode : 'viewer'"));
check('Provider skips clean Viewer native save/export', providerSource.includes("document.mode === 'viewer' && !document.isDirty"));
check('Provider supports HWP SVG export command', providerSource.includes('exportActiveHwpSvg') && providerSource.includes('Exported ${svgs.length} HWP SVG page'));
check('Provider supports HWP debug overlay command', providerSource.includes('showActiveHwpDebugOverlay'));
check('Provider supports HWP paragraph dump command', providerSource.includes('dumpActiveHwpParagraph'));
const hwpHandlerSource = await readText('src/provider/handlers/hwpHandler.ts');
check('HWP toolbar save reads renamed setting with legacy fallback', hwpHandlerSource.includes("getUserSetting<T>('vscode-obsdian'"));
check('HWP handler connects mode and viewer command callbacks', hwpHandlerSource.includes('onModeChange') && hwpHandlerSource.includes('onViewerCommandRequest') && hwpHandlerSource.includes('onViewerCommandResult'));
const rhwpBridgeSource = await readText('src/react/view/hwp/rhwpBridge/createSecureRhwpEditor.ts');
check('Local rhwp studio mounts inside the host webview document', rhwpBridgeSource.includes('createLocalRhwpEditor') && rhwpBridgeSource.includes('mountLocalStudio'));
check('Local rhwp studio loads assets through rewritten webview URIs', rhwpBridgeSource.includes('resolveStudioResourceUrl') && rhwpBridgeSource.includes('appendScript'));
check('Local rhwp studio talks through direct __rhwpBridge calls', rhwpBridgeSource.includes('window.__rhwpBridge') && rhwpBridgeSource.includes('callLocalBridge'));
check('Local rhwp bridge exposes markClean to host saves', rhwpBridgeSource.includes('markClean(): Promise<unknown>') && rhwpBridgeSource.includes("request('markClean')"));
check('Local rhwp bridge exposes SVG/debug viewer methods', rhwpBridgeSource.includes("request('pageCount')") && rhwpBridgeSource.includes("request('getPageSvg'") && rhwpBridgeSource.includes("request('setDebugOverlay'"));
check('Local rhwp studio rewrites absolute WASM asset fetches', rhwpBridgeSource.includes('installLocalStudioFetchRewrite') && rhwpBridgeSource.includes('/\\/assets\\/([^/]+\\.wasm)$/'));
check('Remote rhwp studio still uses checked iframe postMessage', rhwpBridgeSource.includes('event.source !== iframe.contentWindow'));
check('Remote rhwp studio rejects mismatched echoed tokens', rhwpBridgeSource.includes('message.token !== undefined && message.token !== bridgeToken'));

const rhwpIndexPath = 'resource/rhwp-studio/index.html';
check('Local rhwp-studio index exists', existsSync(join(root, rhwpIndexPath)));
const rhwpIndex = await readText(rhwpIndexPath);
const assetMatch = rhwpIndex.match(/src="\.\/assets\/([^"]+\.js)"/);
check('Local rhwp-studio main asset is referenced', Boolean(assetMatch));
if (assetMatch) {
    const assetSource = await readText(`resource/rhwp-studio/assets/${assetMatch[1]}`);
    check('Local rhwp bridge is injected', assetSource.includes('window.__rhwpBridge='));
    check('Local rhwp bridge exports HWP', assetSource.includes('exportHwp'));
    check('Local rhwp bridge exports HWPX', assetSource.includes('exportHwpx'));
    check('Local rhwp bridge can reset dirty baseline after host save', assetSource.includes('markClean') && assetSource.includes('host-save'));
    check('Local rhwp bridge can export page SVGs', assetSource.includes('getPageSvg') && assetSource.includes('renderPageSvg'));
    check('Local rhwp bridge can toggle debug overlay', assetSource.includes('setDebugOverlay') && assetSource.includes('set_debug_overlay'));
    check('Local rhwp bridge echoes request token', assetSource.includes('token:t.token'));
    check('Local rhwp bridge skips upstream unsaved guard for host loads', assetSource.includes('skipUnsavedGuard'));
    check('Local rhwp dirty state is bridged to React host', assetSource.includes('rhwp-dirty-changed'));
    check('Local rhwp HWPX status text matches VS Code save behavior', assetSource.includes('VS Code 저장은 HWPX(.hwpx)를 유지합니다'));
}

const hwpSample = await readBytes('resource/rhwp-studio/samples/biz_plan.hwp');
const hwpxSample = await readBytes('resource/rhwp-studio/samples/form-002.hwpx');
check('Bundled HWP fixture has OLE magic', hasMagic(hwpSample, [0xd0, 0xcf, 0x11, 0xe0]));
check('Bundled HWPX fixture has ZIP magic', hasMagic(hwpxSample, [0x50, 0x4b, 0x03, 0x04]));
check('Vendored rhwp-vscode glue exists for paragraph dump', existsSync(join(root, 'resource/rhwp-vscode/rhwp.js')));
check('Vendored rhwp-vscode WASM exists for paragraph dump', existsSync(join(root, 'resource/rhwp-vscode/rhwp_bg.wasm')));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
    const suffix = item.detail ? ` - ${item.detail}` : '';
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}${suffix}`);
}

if (failed.length > 0) {
    process.exitCode = 1;
}
