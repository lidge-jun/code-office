import { Handler } from '@/common/handler';
import { readPresentation } from './pptxReader';

export function handlePptx(uri: { fsPath: string }, handler: Handler): void {
    handler.on('init', async () => {
        handler.emit('pptxData', await readPresentation(uri.fsPath));
    });
}
