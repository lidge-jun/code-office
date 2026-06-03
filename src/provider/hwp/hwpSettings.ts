import * as vscode from 'vscode';

export function getCodeOfficeSetting<T>(key: string, defaultValue: T): T {
    const current = getUserSetting<T>('code-office', key);
    if (current !== undefined) return current;
    const legacy = getUserSetting<T>('vscode-obsdian', key);
    if (legacy !== undefined) return legacy;
    return vscode.workspace.getConfiguration('code-office').get<T>(key, defaultValue);
}

function getUserSetting<T>(section: string, key: string): T | undefined {
    const inspected = vscode.workspace.getConfiguration(section).inspect<T>(key);
    return inspected?.workspaceFolderLanguageValue
        ?? inspected?.workspaceFolderValue
        ?? inspected?.workspaceLanguageValue
        ?? inspected?.workspaceValue
        ?? inspected?.globalLanguageValue
        ?? inspected?.globalValue;
}
