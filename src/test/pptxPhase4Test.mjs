import { strict as assert } from 'assert';
import AdmZip from 'adm-zip';
import * as esbuild from 'esbuild';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const sampleSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#2563eb"/><circle cx="80" cy="45" r="28" fill="#facc15"/></svg>',
);

const e2eTarget = process.argv[process.argv.indexOf('--write-e2e') + 1];
if (process.argv.includes('--write-e2e')) {
    assert(e2eTarget && !e2eTarget.startsWith('--'), 'missing --write-e2e output path');
    const slidesArg = Number(process.argv[process.argv.indexOf('--slides') + 1] || 2);
    createPresentation(e2eTarget, {
        slides: buildSlides(slidesArg),
        order: Array.from({ length: slidesArg }, (_, index) => index + 1),
        imageSlide: Math.min(2, slidesArg),
    });
    console.log(`wrote ${e2eTarget}`);
    process.exit(0);
}

const tempDir = await mkdtemp(path.join(tmpdir(), 'code-office-pptx-phase4-'));
try {
    const { readPresentation } = await loadReader(tempDir);

    const twoSlide = path.join(tempDir, 'phase4-two-slide.pptx');
    createPresentation(twoSlide, {
        slides: [
            { title: 'First Slide', lines: ['Alpha body'] },
            { title: 'Second Slide', lines: ['Beta body'] },
        ],
        order: [2, 1],
        imageSlide: 2,
    });
    const twoSlidePayload = await readPresentation(twoSlide);
    assert.equal(twoSlidePayload.error, undefined);
    assert.equal(twoSlidePayload.fileName, 'phase4-two-slide.pptx');
    assert.equal(twoSlidePayload.slides.length, 2);
    assert.equal(twoSlidePayload.slides[0].title, 'Second Slide');
    assert.deepEqual(twoSlidePayload.slides[0].text, ['Second Slide', 'Beta body']);
    assert.match(twoSlidePayload.slides[0].images[0], /^data:image\/svg\+xml;base64,/);
    assert.equal(twoSlidePayload.slides[1].title, 'First Slide');

    const largeDeck = path.join(tempDir, 'phase4-32-slide.pptx');
    createPresentation(largeDeck, {
        slides: buildSlides(32),
        order: Array.from({ length: 32 }, (_, index) => index + 1),
        imageSlide: 32,
    });
    const largePayload = await readPresentation(largeDeck);
    assert.equal(largePayload.error, undefined);
    assert.equal(largePayload.slides.length, 32);
    assert.equal(largePayload.slides[31].title, 'Slide 32');
    assert.match(largePayload.slides[31].images[0], /^data:image\/svg\+xml;base64,/);

    const malformed = path.join(tempDir, 'malformed.pptx');
    await writeFile(malformed, Buffer.from('not a pptx'));
    const malformedPayload = await readPresentation(malformed);
    assert.equal(malformedPayload.fileName, 'malformed.pptx');
    assert.equal(malformedPayload.slides.length, 0);
    assert.ok(malformedPayload.error);

    console.log('pptx phase4 checks passed');
} finally {
    await rm(tempDir, { recursive: true, force: true });
}

async function loadReader(tempDir) {
    const outfile = path.join(tempDir, 'pptxReader.bundle.cjs');
    await esbuild.build({
        entryPoints: [path.join(repoRoot, 'src/provider/handlers/pptxReader.ts')],
        outfile,
        platform: 'node',
        bundle: true,
        format: 'cjs',
        logLevel: 'silent',
    });
    const require = createRequire(import.meta.url);
    return require(outfile);
}

function buildSlides(count) {
    return Array.from({ length: count }, (_, index) => ({
        title: `Slide ${index + 1}`,
        lines: [`Body ${index + 1}`],
    }));
}

function createPresentation(filePath, { slides, order, imageSlide }) {
    const zip = new AdmZip();
    zip.addFile('[Content_Types].xml', Buffer.from(contentTypesXml()));
    zip.addFile('ppt/presentation.xml', Buffer.from(presentationXml(order)));
    zip.addFile('ppt/_rels/presentation.xml.rels', Buffer.from(presentationRelsXml(order)));
    slides.forEach((slide, index) => {
        const slideNumber = index + 1;
        zip.addFile(`ppt/slides/slide${slideNumber}.xml`, Buffer.from(slideXml(slide)));
        if (slideNumber === imageSlide) {
            zip.addFile(`ppt/slides/_rels/slide${slideNumber}.xml.rels`, Buffer.from(slideImageRelsXml()));
        }
    });
    if (imageSlide) zip.addFile('ppt/media/image1.svg', sampleSvg);
    zip.writeZip(filePath);
}

function contentTypesXml() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="svg" ContentType="image/svg+xml"/>
</Types>`;
}

function presentationXml(order) {
    const slideIds = order.map((slideNumber, index) => {
        return `<p:sldId id="${256 + index}" r:id="rId${slideNumber}"/>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>${slideIds}</p:sldIdLst>
</p:presentation>`;
}

function presentationRelsXml(order) {
    const rels = order.map(slideNumber => {
        return `<Relationship Id="rId${slideNumber}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${slideNumber}.xml"/>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
}

function slideXml({ title, lines }) {
    const textRuns = [title, ...lines].map(line => {
        return `<a:p><a:r><a:t>${escapeXml(line)}</a:t></a:r></a:p>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody>${textRuns}</p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`;
}

function slideImageRelsXml() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.svg"/>
</Relationships>`;
}

function escapeXml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
