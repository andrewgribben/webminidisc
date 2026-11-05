import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
    ALL_PARTS,
    DOG_EAR_MM,
    LabelPartId,
    createA4LabelLayout,
} from './a4-layout';
import { buildCutSizedPartPdf } from './build-art-pdf';
import { LabelPackInput } from './types';

GlobalWorkerOptions.workerSrc = pdfWorker;

const MM_PER_INCH = 25.4;
/** Print-style raster for bordered cut-size exports. */
const EXPORT_DPI = 300;
const BORDER_PX = 2;

export interface BorderedLabelPng {
    id: LabelPartId;
    bytes: Uint8Array;
    widthPx: number;
    heightPx: number;
    widthMm: number;
    heightMm: number;
}

function mmToPx(mm: number): number {
    return Math.max(1, Math.round((mm / MM_PER_INCH) * EXPORT_DPI));
}

/** Local cut outline in pixel space (origin top-left). */
function cutOutlinePath(
    ctx: CanvasRenderingContext2D,
    widthPx: number,
    heightPx: number,
    dogEar: boolean,
    earMm: number
) {
    const ear = mmToPx(earMm);
    ctx.beginPath();
    if (!dogEar) {
        ctx.rect(0, 0, widthPx, heightPx);
        return;
    }
    ctx.moveTo(0, 0);
    ctx.lineTo(widthPx - ear, 0);
    ctx.lineTo(widthPx, ear);
    ctx.lineTo(widthPx, heightPx);
    ctx.lineTo(0, heightPx);
    ctx.closePath();
}

async function rasterizePdfPage(pdfBytes: Uint8Array, widthPx: number, heightPx: number): Promise<HTMLCanvasElement> {
    const loadingTask = getDocument({ data: pdfBytes.slice() });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(widthPx / base.width, heightPx / base.height);
    const scaled = page.getViewport({ scale });
    const rendered = document.createElement('canvas');
    rendered.width = Math.max(1, Math.ceil(scaled.width));
    rendered.height = Math.max(1, Math.ceil(scaled.height));
    const renderedCtx = rendered.getContext('2d');
    if (!renderedCtx) {
        throw new Error('Could not create a canvas for bordered label export.');
    }
    await page.render({ canvasContext: renderedCtx, viewport: scaled }).promise;
    await pdf.destroy();

    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not create a canvas for bordered label export.');
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);
    const offsetX = (widthPx - rendered.width) / 2;
    const offsetY = (heightPx - rendered.height) / 2;
    ctx.drawImage(rendered, offsetX, offsetY);
    return canvas;
}

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Could not encode bordered label PNG.'));
                return;
            }
            void blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
        }, 'image/png');
    });
}

/**
 * Cut-size PNG per label part (no bleed), clipped to the cut SVG outline,
 * with a 2px solid border around that shape.
 */
export async function buildBorderedLabelPngs(
    input: LabelPackInput,
    parts: LabelPartId[] = ALL_PARTS
): Promise<BorderedLabelPng[]> {
    const layout = createA4LabelLayout();
    const include = parts.length ? parts : ALL_PARTS;
    const results: BorderedLabelPng[] = [];

    for (const id of ALL_PARTS) {
        if (!include.includes(id)) {
            continue;
        }
        const part = layout.parts[id];
        const widthPx = mmToPx(part.cut.width);
        const heightPx = mmToPx(part.cut.height);
        const pdfBytes = await buildCutSizedPartPdf(input, id, layout);
        const rendered = await rasterizePdfPage(pdfBytes, widthPx, heightPx);

        const out = document.createElement('canvas');
        out.width = widthPx;
        out.height = heightPx;
        const ctx = out.getContext('2d');
        if (!ctx) {
            throw new Error('Could not create a canvas for bordered label export.');
        }

        cutOutlinePath(ctx, widthPx, heightPx, Boolean(part.dogEar), DOG_EAR_MM);
        ctx.save();
        ctx.clip();
        ctx.drawImage(rendered, 0, 0);
        ctx.restore();

        cutOutlinePath(ctx, widthPx, heightPx, Boolean(part.dogEar), DOG_EAR_MM);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = BORDER_PX;
        ctx.lineJoin = 'miter';
        ctx.stroke();

        results.push({
            id,
            bytes: await canvasToPngBytes(out),
            widthPx,
            heightPx,
            widthMm: part.cut.width,
            heightMm: part.cut.height,
        });
    }

    return results;
}
