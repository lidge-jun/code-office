export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    let timer: number | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => {
        if (timer !== undefined) window.clearTimeout(timer);
    });
}

export function normalizeDocumentName(name: string): string {
    return /\.docx$/i.test(name) ? name : `${name}.docx`;
}

export function stripDocxExtension(name: string): string {
    return normalizeDocumentName(name).replace(/\.docx$/i, '');
}
