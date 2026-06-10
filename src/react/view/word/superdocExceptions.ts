export function formatUnknownError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return JSON.stringify(error);
}

export function isFatalSuperDocException(event: unknown): boolean {
    if (!event || typeof event !== 'object') return true;
    const payload = event as { stage?: unknown; code?: unknown };
    if (payload.stage === 'document-init') return true;
    if (payload.code === 'password-required') return true;
    return false;
}

export function isIgnorableSuperDocException(event: unknown): boolean {
    const message = extractErrorMessage(event);
    return /Cannot read properties of undefined \(reading ['"](elements|comments)['"]\)/.test(message);
}

export function extractErrorMessage(event: unknown): string {
    if (event instanceof Error) return event.message;
    if (typeof event === 'string') return event;
    if (event && typeof event === 'object' && 'error' in event) {
        return formatUnknownError((event as { error: unknown }).error);
    }
    return formatUnknownError(event);
}

export function isSuperDocElementsError(error: unknown): boolean {
    return /Cannot read properties of undefined \(reading ['"](elements|comments)['"]\)/.test(formatUnknownError(error));
}
