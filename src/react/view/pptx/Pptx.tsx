import { Alert, Button, Empty, Segmented, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { handler } from '../../util/vscode.ts';
import './Pptx.less';

interface PptxSlide {
    index: number;
    title: string;
    text: string[];
    images: string[];
}

interface PptxPayload {
    fileName: string;
    slides: PptxSlide[];
    fallbackPdfPath?: string;
    warning?: string;
    error?: string;
}

export default function Pptx() {
    const [loading, setLoading] = useState(true);
    const [payload, setPayload] = useState<PptxPayload | null>(null);
    const [zoom, setZoom] = useState(100);

    useEffect(() => {
        handler.on('pptxData', (data: PptxPayload) => {
            setPayload(data);
            setLoading(false);
        }).emit('init');
    }, []);

    if (loading) return <Spin spinning fullscreen />;
    if (!payload) return <Empty description="No presentation data" />;

    return (
        <main className="pptx-viewer">
            <header className="pptx-viewer__header">
                <div>
                    <h1>{payload.fileName}</h1>
                    <p>{payload.slides.length} slides</p>
                </div>
                <div className="pptx-viewer__controls">
                    <Button size="small" onClick={() => setZoom(value => Math.max(70, value - 10))}>-</Button>
                    <span className="pptx-viewer__zoom-value">{zoom}%</span>
                    <Segmented
                        size="small"
                        value={zoom}
                        options={[
                            { label: 'Fit', value: 90 },
                            { label: '100%', value: 100 },
                            { label: '125%', value: 125 },
                        ]}
                        onChange={value => setZoom(Number(value))}
                    />
                    <Button size="small" onClick={() => setZoom(value => Math.min(150, value + 10))}>+</Button>
                </div>
            </header>
            {payload.error ? <Alert type="error" message="Unable to preview presentation" description={payload.error} /> : null}
            {payload.warning ? <Alert type="warning" message={payload.warning} /> : null}
            {payload.fallbackPdfPath ? <iframe className="pptx-viewer__pdf" src={payload.fallbackPdfPath} title="Converted presentation PDF" /> : null}
            <section
                className="pptx-viewer__slides"
                style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top left',
                    width: `${10000 / zoom}%`,
                }}
            >
                {payload.slides.map(slide => (
                    <article className="pptx-slide" key={slide.index}>
                        <div className="pptx-slide__number">{slide.index}</div>
                        <div className="pptx-slide__body">
                            <h2>{slide.title}</h2>
                            {slide.text.length > 0 ? (
                                <ul>
                                    {slide.text.slice(0, 18).map((line, index) => <li key={`${slide.index}-${index}`}>{line}</li>)}
                                </ul>
                            ) : <p className="pptx-slide__empty">No text content detected.</p>}
                            {slide.images.length > 0 ? (
                                <div className="pptx-slide__images">
                                    {slide.images.slice(0, 6).map((src, index) => <img key={`${slide.index}-img-${index}`} src={src} alt="" />)}
                                </div>
                            ) : null}
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
}
