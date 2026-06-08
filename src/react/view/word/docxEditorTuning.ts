import type { DocxEditorProps } from '@eigenpal/docx-editor-react';
import type { CSSProperties } from 'react';

type FontFamilies = NonNullable<DocxEditorProps['fontFamilies']>;

export const DOCX_EDITOR_INITIAL_ZOOM = 1.0;

export const DOCX_EDITOR_CLASS_NAME = 'docx-editor docx-editor--word-parity';

export const DOCX_EDITOR_STYLE: CSSProperties = {
    width: '100%',
    height: '100%',
    minHeight: 0,
};

export const DOCX_EDITOR_FONT_FAMILIES: FontFamilies = [
    {
        name: 'Malgun Gothic',
        fontFamily: '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans CJK KR", "Noto Sans KR", sans-serif',
        category: 'sans-serif',
    },
    {
        name: 'Apple SD Gothic Neo',
        fontFamily: '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans CJK KR", "Noto Sans KR", sans-serif',
        category: 'sans-serif',
    },
    {
        name: 'Noto Sans CJK KR',
        fontFamily: '"Noto Sans CJK KR", "Noto Sans KR", "Malgun Gothic", sans-serif',
        category: 'sans-serif',
    },
    {
        name: 'Noto Sans KR',
        fontFamily: '"Noto Sans KR", "Noto Sans CJK KR", "Malgun Gothic", sans-serif',
        category: 'sans-serif',
    },
    {
        name: 'Calibri',
        fontFamily: 'Calibri, Aptos, Arial, sans-serif',
        category: 'sans-serif',
    },
    {
        name: 'Aptos',
        fontFamily: 'Aptos, Calibri, Arial, sans-serif',
        category: 'sans-serif',
    },
    {
        name: 'Arial',
        fontFamily: 'Arial, Helvetica, sans-serif',
        category: 'sans-serif',
    },
    {
        name: 'Cambria',
        fontFamily: 'Cambria, Georgia, serif',
        category: 'serif',
    },
    {
        name: 'Times New Roman',
        fontFamily: '"Times New Roman", Times, serif',
        category: 'serif',
    },
];
