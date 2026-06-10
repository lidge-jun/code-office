import { Button, Segmented } from 'antd';
import type { DocxMode } from './docxTypes';

type DocxModeToolbarProps = {
    mode: DocxMode;
    onModeChange: (mode: DocxMode) => void;
    onSave: () => void;
};

export function DocxModeToolbar({ mode, onModeChange, onSave }: DocxModeToolbarProps) {
    return (
        <header className="docx-shell__toolbar">
            <div>
                <div className="docx-shell__title">DOCX</div>
                <div className="docx-shell__meta">
                    {mode === 'viewer' ? 'SuperDoc viewer mode' : 'SuperDoc edit mode'}
                </div>
            </div>
            <div className="docx-shell__actions">
                <Segmented
                    size="small"
                    value={mode}
                    options={[
                        { label: 'View', value: 'viewer' },
                        { label: 'Edit', value: 'editor' },
                    ]}
                    onChange={(value) => onModeChange(value as DocxMode)}
                />
                {mode === 'editor' ? (
                    <Button size="small" type="primary" onClick={onSave}>
                        Save
                    </Button>
                ) : null}
            </div>
        </header>
    );
}
