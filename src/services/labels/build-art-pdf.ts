import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import {
    A4LabelLayout,
    ALL_PARTS,
    LabelPartId,
    RectMm,
    createA4LabelLayout,
    mmSizeToPdfPoints,
} from './a4-layout';
import { renderGenerativePng } from './generative-art';
import { LabelDiscInfo, LabelPackInput, LabelPalette } from './types';
import { formatTimeFromSeconds } from '../../utils';

const PT_PER_MM = 72 / 25.4;

function topLeftRectToPdf(layout: A4LabelLayout, rect: RectMm): { x: number; y: number; width: number; height: number } {
    const { width, height } = mmSizeToPdfPoints(rect.width, rect.height);
    return {
        x: rect.x * PT_PER_MM,
        y: (layout.page.height - rect.y - rect.height) * PT_PER_MM,
        width,
        height,
    };
}

function drawRegistrationMarks(page: PDFPage, layout: A4LabelLayout) {
    for (const mark of layout.marks) {
        const cx = mark.cx * PT_PER_MM;
        const cy = (layout.page.height - mark.cy) * PT_PER_MM;
        const arm = mark.arm * PT_PER_MM;
        page.drawLine({
            start: { x: cx - arm, y: cy },
            end: { x: cx + arm, y: cy },
            thickness: 0.4,
            color: rgb(0, 0, 0),
        });
        page.drawLine({
            start: { x: cx, y: cy - arm },
            end: { x: cx, y: cy + arm },
            thickness: 0.4,
            color: rgb(0, 0, 0),
        });
        page.drawCircle({
            x: cx,
            y: cy,
            size: 1.2 * PT_PER_MM,
            borderWidth: 0.4,
            borderColor: rgb(0, 0, 0),
        });
    }
}

function fitCoverDraw(
    page: PDFPage,
    image: PDFImage,
    box: { x: number; y: number; width: number; height: number }
) {
    const iw = image.width;
    const ih = image.height;
    const scale = Math.max(box.width / iw, box.height / ih);
    const drawW = iw * scale;
    const drawH = ih * scale;
    const x = box.x + (box.width - drawW) / 2;
    const y = box.y + (box.height - drawH) / 2;
    page.drawImage(image, { x, y, width: drawW, height: drawH });
}

function truncateToWidth(font: PDFFont, text: string, size: number, maxWidth: number): string {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) {
        return text;
    }
    let t = text;
    while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxWidth) {
        t = t.slice(0, -1);
    }
    return `${t}…`;
}

function drawTitleBlock(
    page: PDFPage,
    font: PDFFont,
    fontBold: PDFFont,
    disc: LabelDiscInfo,
    box: { x: number; y: number; width: number; height: number },
    opts: { showTracks: boolean; lightText: boolean }
) {
    const ink = opts.lightText ? rgb(1, 1, 1) : rgb(0.05, 0.05, 0.05);
    const pad = 2.5 * PT_PER_MM;
    let cursorY = box.y + box.height - pad - 8;

    const titleSize = Math.min(11, box.width / 8);
    const title = truncateToWidth(fontBold, disc.title || 'Untitled Disc', titleSize, box.width - pad * 2);
    page.drawText(title, { x: box.x + pad, y: cursorY, size: titleSize, font: fontBold, color: ink });
    cursorY -= titleSize + 2;

    if (disc.artist) {
        const artistSize = Math.min(8, titleSize * 0.75);
        const artist = truncateToWidth(font, disc.artist, artistSize, box.width - pad * 2);
        page.drawText(artist, { x: box.x + pad, y: cursorY, size: artistSize, font, color: ink });
        cursorY -= artistSize + 3;
    }

    const total = formatTimeFromSeconds(disc.totalDurationSec, false);
    const metaSize = 7;
    page.drawText(`${disc.tracks.length} tracks · ${total}`, {
        x: box.x + pad,
        y: cursorY,
        size: metaSize,
        font,
        color: ink,
    });
    cursorY -= metaSize + 4;

    if (!opts.showTracks) {
        return;
    }

    const trackSize = 6.5;
    const lineH = trackSize + 1.5;
    const minY = box.y + pad;
    for (const track of disc.tracks) {
        if (cursorY < minY + lineH) {
            page.drawText('…', { x: box.x + pad, y: cursorY, size: trackSize, font, color: ink });
            break;
        }
        const idx = String(track.index + 1).padStart(2, '0');
        const dur = formatTimeFromSeconds(track.durationSec, false);
        const durW = font.widthOfTextAtSize(dur, trackSize);
        const nameMax = box.width - pad * 2 - durW - 4;
        const name = truncateToWidth(font, `${idx}  ${track.title || 'Untitled'}`, trackSize, nameMax);
        page.drawText(name, { x: box.x + pad, y: cursorY, size: trackSize, font, color: ink });
        page.drawText(dur, {
            x: box.x + box.width - pad - durW,
            y: cursorY,
            size: trackSize,
            font,
            color: ink,
        });
        cursorY -= lineH;
    }
}

function drawEdgeText(
    page: PDFPage,
    font: PDFFont,
    fontBold: PDFFont,
    disc: LabelDiscInfo,
    box: { x: number; y: number; width: number; height: number }
) {
    const text = [disc.title || 'Untitled Disc', disc.artist].filter(Boolean).join(' — ');
    const size = Math.min(8, box.height * 0.55);
    const truncated = truncateToWidth(fontBold, text, size, box.width - 4 * PT_PER_MM);
    page.drawText(truncated, {
        x: box.x + 2 * PT_PER_MM,
        y: box.y + (box.height - size) / 2,
        size,
        font: fontBold,
        color: rgb(1, 1, 1),
    });
    void font;
}

async function embedCoverOrNull(pdf: PDFDocument, bytes: Uint8Array | null, mime: string | null): Promise<PDFImage | null> {
    if (!bytes || !mime) {
        return null;
    }
    try {
        if (mime.includes('png')) {
            return await pdf.embedPng(bytes);
        }
        return await pdf.embedJpg(bytes);
    } catch {
        try {
            return await pdf.embedPng(bytes);
        } catch {
            return null;
        }
    }
}

export async function buildArtPdf(
    input: LabelPackInput,
    palette: LabelPalette,
    layout: A4LabelLayout = createA4LabelLayout()
): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([layout.page.width * PT_PER_MM, layout.page.height * PT_PER_MM]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const include = new Set(input.parts.length ? input.parts : ALL_PARTS);

    page.drawRectangle({
        x: 0,
        y: 0,
        width: layout.page.width * PT_PER_MM,
        height: layout.page.height * PT_PER_MM,
        color: rgb(1, 1, 1),
    });

    drawRegistrationMarks(page, layout);

    const coverImage = input.artMode === 'album' ? await embedCoverOrNull(pdf, input.coverBytes, input.coverMime) : null;

    for (const id of ALL_PARTS) {
        if (!include.has(id)) {
            continue;
        }
        const part = layout.parts[id];
        const bleedBox = topLeftRectToPdf(layout, part.bleed);
        const cutBox = topLeftRectToPdf(layout, part.cut);

        let bgImage: PDFImage | null = coverImage;
        if (input.artMode === 'generative' || !bgImage) {
            const pxPerMm = 12; // ~300 dpi-ish for label-sized rasters
            const png = renderGenerativePng(
                input.disc,
                input.seed,
                id === 'edge' ? 'edge' : id === 'box' ? 'box' : 'face',
                part.bleed.width * pxPerMm,
                part.bleed.height * pxPerMm,
                palette
            );
            bgImage = await pdf.embedPng(png);
        }

        if (bgImage) {
            // Clip-like behaviour: draw into bleed rect (overprint). pdf-lib has no easy path clip;
            // rectangular bleed is intentional for overprint.
            if (input.artMode === 'album' && coverImage && id !== 'edge') {
                fitCoverDraw(page, coverImage, bleedBox);
                page.drawRectangle({
                    ...cutBox,
                    color: rgb(0, 0, 0),
                    opacity: 0.35,
                });
            } else if (input.artMode === 'album' && coverImage && id === 'edge') {
                page.drawRectangle({ ...bleedBox, color: rgb(0.08, 0.08, 0.08) });
                fitCoverDraw(page, coverImage, {
                    x: bleedBox.x,
                    y: bleedBox.y,
                    width: bleedBox.width * 0.2,
                    height: bleedBox.height,
                });
            } else {
                page.drawImage(bgImage, bleedBox);
            }
        } else {
            page.drawRectangle({ ...bleedBox, color: rgb(0.12, 0.12, 0.12) });
        }

        if (id === 'edge') {
            drawEdgeText(page, font, fontBold, input.disc, cutBox);
        } else if (id === 'face') {
            drawTitleBlock(page, font, fontBold, input.disc, cutBox, {
                showTracks: true,
                lightText: true,
            });
        } else {
            // Box: leave spine strip darker, content on panel
            const spineW = (part.spineFoldX ?? 0) * PT_PER_MM;
            const panel = {
                x: cutBox.x + spineW,
                y: cutBox.y,
                width: cutBox.width - spineW,
                height: cutBox.height,
            };
            drawTitleBlock(page, font, fontBold, input.disc, panel, {
                showTracks: true,
                lightText: true,
            });
        }
    }

    return pdf.save();
}
