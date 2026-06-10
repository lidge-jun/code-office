import JSZip from 'jszip';
import { DOCX_MIME } from './docxConstants';
import { isSuperDocElementsError } from './superdocExceptions';

export async function exportEditorDocx(editor: unknown, sourceBuffer: ArrayBuffer | null): Promise<Blob | null> {
    if (!editor || typeof editor !== 'object' || !('exportDocx' in editor)) return null;
    const exportDocx = (editor as {
        exportDocx?: (params?: {
            commentsType?: string;
            comments?: unknown[];
            isFinalDoc?: boolean;
            fieldsHighlightColor?: string | null;
            exportXmlOnly?: boolean;
            getUpdatedDocs?: boolean;
        }) => Promise<Blob | ArrayBuffer | string | Record<string, string | null>>;
    }).exportDocx;
    if (typeof exportDocx !== 'function') return null;

    const exportOptions = {
        commentsType: 'external',
        comments: [],
        isFinalDoc: false,
        fieldsHighlightColor: null,
    };

    if (sourceBuffer) {
        try {
            const updatedDocs = await exportDocx.call(editor, {
                ...exportOptions,
                getUpdatedDocs: true,
            });
            if (isUpdatedDocMap(updatedDocs)) {
                return await patchDocxParts(sourceBuffer, updatedDocs);
            }
        } catch (e) {
            if (isSuperDocElementsError(e)) throw e;
            /* try the next SuperDoc export strategy */
        }

        try {
            const documentXml = await exportDocx.call(editor, {
                ...exportOptions,
                exportXmlOnly: true,
            });
            if (typeof documentXml === 'string' && documentXml.includes('<w:document')) {
                return await patchDocxParts(sourceBuffer, { 'word/document.xml': documentXml });
            }
        } catch (e) {
            if (isSuperDocElementsError(e)) throw e;
            /* try the package-level SuperDoc export fallback */
        }
    }

    try {
        const exported = await exportDocx.call(editor, exportOptions);
        if (exported instanceof Blob) return exported;
        if (exported instanceof ArrayBuffer) return new Blob([exported], { type: DOCX_MIME });
    } catch (e) {
        if (isSuperDocElementsError(e)) throw e;
        /* allow the caller to try another editor or instance.export */
    }
    return null;
}

export function isUpdatedDocMap(value: unknown): value is Record<string, string | null> {
    if (!value || typeof value !== 'object' || value instanceof Blob || value instanceof ArrayBuffer) return false;
    return Object.values(value as Record<string, unknown>).every((entry) => entry === null || typeof entry === 'string');
}

export async function patchDocxParts(sourceBuffer: ArrayBuffer, updatedDocs: Record<string, string | null>): Promise<Blob> {
    const zip = await JSZip.loadAsync(sourceBuffer.slice(0));
    for (const [path, content] of Object.entries(updatedDocs)) {
        if (!path) continue;
        if (content === null) {
            zip.remove(path);
        } else {
            zip.file(path, content);
        }
    }
    return await zip.generateAsync({
        type: 'blob',
        mimeType: DOCX_MIME,
        compression: 'DEFLATE',
    });
}
