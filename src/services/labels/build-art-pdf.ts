import {
    PDFDocument,
    PDFFont,
    PDFImage,
    PDFPage,
    clip,
    endPath,
    popGraphicsState,
    pushGraphicsState,
    rectangle,
    rgb,
    RGB,
    StandardFonts,
} from 'pdf-lib';
import {
    A4LabelLayout,
    ALL_PARTS,
    LabelPartId,
    RectMm,
    createA4LabelLayout,
    mmSizeToPdfPoints,
} from './a4-layout';
import { hexToRgb } from './themes';
import { LabelDiscInfo, LabelPackInput, LabelTheme } from './types';
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

function colorFromHex(hex: string): RGB {
    const { r, g, b } = hexToRgb(hex);
    return rgb(r, g, b);
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

/** Cover/crop the image into `box`, clipped so overflow cannot paint neighbouring labels. */
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
    page.pushOperators(
        pushGraphicsState(),
        rectangle(box.x, box.y, box.width, box.height),
        clip(),
        endPath()
    );
    page.drawImage(image, { x, y, width: drawW, height: drawH });
    page.pushOperators(popGraphicsState());
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

/** Draw text with slight tracking (Nothing / TE product-label feel). */
function drawTrackedText(
    page: PDFPage,
    font: PDFFont,
    text: string,
    x: number,
    y: number,
    size: number,
    color: RGB,
    tracking = 0.35
) {
    let cursor = x;
    for (const ch of text) {
        page.drawText(ch, { x: cursor, y, size, font, color });
        cursor += font.widthOfTextAtSize(ch, size) + tracking;
    }
}

function drawTypographicFaceOrBox(
    page: PDFPage,
    font: PDFFont,
    fontBold: PDFFont,
    disc: LabelDiscInfo,
    theme: LabelTheme,
    box: { x: number; y: number; width: number; height: number },
    opts: { showTracks: boolean; showSpineBar?: boolean; spineW?: number }
) {
    const ink = colorFromHex(theme.text);
    const accent = colorFromHex(theme.accent);
    const bg = colorFromHex(theme.background);
    const pad = 2.2 * PT_PER_MM;
    const contentX = box.x + (opts.showSpineBar ? opts.spineW ?? 0 : 0);
    const contentW = box.width - (opts.showSpineBar ? opts.spineW ?? 0 : 0);

    page.drawRectangle({ ...box, color: bg });

    if (opts.showSpineBar && opts.spineW) {
        page.drawRectangle({
            x: box.x,
            y: box.y,
            width: opts.spineW,
            height: box.height,
            color: accent,
        });
    }

    // Small glyph square (Nothing-inspired) + accent rule
    const glyph = 1.6 * PT_PER_MM;
    page.drawRectangle({
        x: contentX + pad,
        y: box.y + box.height - pad - glyph,
        width: glyph,
        height: glyph,
        color: accent,
    });

    let cursorY = box.y + box.height - pad - 9;

    const titleSize = Math.min(10, contentW / 7.5);
    const title = truncateToWidth(fontBold, (disc.title || 'Untitled Disc').toUpperCase(), titleSize, contentW - pad * 2 - glyph - 2);
    drawTrackedText(page, fontBold, title, contentX + pad + glyph + 2, cursorY, titleSize, ink, 0.45);
    cursorY -= titleSize + 3;

    page.drawLine({
        start: { x: contentX + pad, y: cursorY + 2 },
        end: { x: contentX + contentW - pad, y: cursorY + 2 },
        thickness: 0.35,
        color: accent,
    });
    cursorY -= 4;

    if (disc.artist) {
        const artistSize = Math.min(7, titleSize * 0.7);
        const artist = truncateToWidth(font, disc.artist.toUpperCase(), artistSize, contentW - pad * 2);
        drawTrackedText(page, font, artist, contentX + pad, cursorY, artistSize, ink, 0.55);
        cursorY -= artistSize + 3;
    }

    const total = formatTimeFromSeconds(disc.totalDurationSec, false);
    const meta = `${String(disc.tracks.length).padStart(2, '0')} TR · ${total}`;
    const metaSize = 6;
    drawTrackedText(page, font, meta, contentX + pad, cursorY, metaSize, ink, 0.4);
    cursorY -= metaSize + 5;

    if (!opts.showTracks) {
        return;
    }

    const trackSize = 5.8;
    const lineH = trackSize + 1.8;
    const minY = box.y + pad;
    for (const track of disc.tracks) {
        if (cursorY < minY + lineH) {
            page.drawText('···', { x: contentX + pad, y: cursorY, size: trackSize, font, color: ink });
            break;
        }
        const idx = String(track.index + 1).padStart(2, '0');
        const dur = formatTimeFromSeconds(track.durationSec, false);
        const durW = font.widthOfTextAtSize(dur, trackSize);
        const nameMax = contentW - pad * 2 - durW - 3;
        const name = truncateToWidth(font, `${idx}  ${track.title || 'Untitled'}`, trackSize, nameMax);
        page.drawText(name, { x: contentX + pad, y: cursorY, size: trackSize, font, color: ink });
        page.drawText(dur, {
            x: contentX + contentW - pad - durW,
            y: cursorY,
            size: trackSize,
            font,
            color: ink,
        });
        cursorY -= lineH;
    }
}

function drawTypographicEdge(
    page: PDFPage,
    fontBold: PDFFont,
    disc: LabelDiscInfo,
    theme: LabelTheme,
    box: { x: number; y: number; width: number; height: number }
) {
    const ink = colorFromHex(theme.text);
    const bg = colorFromHex(theme.background);
    const accent = colorFromHex(theme.accent);
    page.drawRectangle({ ...box, color: bg });
    page.drawRectangle({
        x: box.x,
        y: box.y,
        width: 1.2 * PT_PER_MM,
        height: box.height,
        color: accent,
    });
    const text = [disc.title || 'Untitled Disc', disc.artist].filter(Boolean).join('  ·  ').toUpperCase();
    const size = Math.min(7, box.height * 0.5);
    const truncated = truncateToWidth(fontBold, text, size, box.width - 5 * PT_PER_MM);
    drawTrackedText(
        page,
        fontBold,
        truncated,
        box.x + 2.5 * PT_PER_MM,
        box.y + (box.height - size) / 2,
        size,
        ink,
        0.5
    );
}

/** Bottom-weighted scrim so cover art stays the visible background. */
function drawAlbumFaceTracklist(
    page: PDFPage,
    font: PDFFont,
    fontBold: PDFFont,
    disc: LabelDiscInfo,
    box: { x: number; y: number; width: number; height: number }
) {
    const ink = rgb(1, 1, 1);
    const pad = 2.2 * PT_PER_MM;
    // Light full-panel wash (cover stays visible) + stronger top band for the title.
    page.drawRectangle({ ...box, color: rgb(0, 0, 0), opacity: 0.22 });
    const topBand = Math.min(box.height * 0.28, 14 * PT_PER_MM);
    page.drawRectangle({
        x: box.x,
        y: box.y + box.height - topBand,
        width: box.width,
        height: topBand,
        color: rgb(0, 0, 0),
        opacity: 0.28,
    });

    let cursorY = box.y + box.height - pad - 7;
    const titleSize = Math.min(9, box.width / 8);
    const title = truncateToWidth(fontBold, disc.title || 'Untitled Disc', titleSize, box.width - pad * 2);
    page.drawText(title, { x: box.x + pad, y: cursorY, size: titleSize, font: fontBold, color: ink });
    cursorY -= titleSize + 3;

    const trackSize = 6.2;
    const lineH = trackSize + 1.6;
    const minY = box.y + pad;
    for (const track of disc.tracks) {
        if (cursorY < minY + lineH) {
            page.drawText('…', { x: box.x + pad, y: cursorY, size: trackSize, font, color: ink });
            break;
        }
        const idx = String(track.index + 1).padStart(2, '0');
        const dur = formatTimeFromSeconds(track.durationSec, false);
        const durW = font.widthOfTextAtSize(dur, trackSize);
        const name = truncateToWidth(font, `${idx}  ${track.title || 'Untitled'}`, trackSize, box.width - pad * 2 - durW - 3);
        page.drawText(name, { x: box.x + pad, y: cursorY, size: trackSize, font, color: ink });
        page.drawText(dur, { x: box.x + box.width - pad - durW, y: cursorY, size: trackSize, font, color: ink });
        cursorY -= lineH;
    }
}

function drawAlbumEdgeTitle(
    page: PDFPage,
    fontBold: PDFFont,
    disc: LabelDiscInfo,
    box: { x: number; y: number; width: number; height: number }
) {
    // Narrow bar behind title only — keep most of the cover strip visible.
    const barH = Math.min(box.height, 3.2 * PT_PER_MM);
    page.drawRectangle({
        x: box.x,
        y: box.y + (box.height - barH) / 2,
        width: box.width,
        height: barH,
        color: rgb(0, 0, 0),
        opacity: 0.45,
    });
    const text = disc.title || 'Untitled Disc';
    const size = Math.min(7.5, box.height * 0.55);
    const truncated = truncateToWidth(fontBold, text, size, box.width - 4 * PT_PER_MM);
    page.drawText(truncated, {
        x: box.x + 2 * PT_PER_MM,
        y: box.y + (box.height - size) / 2,
        size,
        font: fontBold,
        color: rgb(1, 1, 1),
    });
}

/** Re-encode arbitrary image bytes to PNG via canvas when pdf-lib cannot embed the original. */
async function reencodeToPng(bytes: Uint8Array): Promise<Uint8Array | null> {
    if (typeof document === 'undefined') {
        return null;
    }
    try {
        const blob = new Blob([bytes.slice()]);
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            bitmap.close();
            return null;
        }
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        const dataUrl = canvas.toDataURL('image/png');
        const raw = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
        const out = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
            out[i] = raw.charCodeAt(i);
        }
        return out;
    } catch {
        return null;
    }
}

async function embedCoverOrNull(pdf: PDFDocument, bytes: Uint8Array | null, mime: string | null): Promise<PDFImage | null> {
    if (!bytes || !mime) {
        return null;
    }
    const tryEmbed = async (data: Uint8Array, kind: string): Promise<PDFImage | null> => {
        try {
            if (kind.includes('png')) {
                return await pdf.embedPng(data);
            }
            if (kind.includes('jpg') || kind.includes('jpeg')) {
                return await pdf.embedJpg(data);
            }
            return null;
        } catch {
            return null;
        }
    };

    const direct = (await tryEmbed(bytes, mime)) ?? (await tryEmbed(bytes, 'png')) ?? (await tryEmbed(bytes, 'jpeg'));
    if (direct) {
        return direct;
    }
    const png = await reencodeToPng(bytes);
    if (!png) {
        return null;
    }
    return tryEmbed(png, 'png');
}

export async function buildArtPdf(input: LabelPackInput, layout: A4LabelLayout = createA4LabelLayout()): Promise<Uint8Array> {
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
    if (input.artMode === 'album' && !coverImage) {
        throw new Error('Album art could not be embedded into the PDF (unsupported image format).');
    }

    for (const id of ALL_PARTS as LabelPartId[]) {
        if (!include.has(id)) {
            continue;
        }
        const part = layout.parts[id];
        const bleedBox = topLeftRectToPdf(layout, part.bleed);
        const cutBox = topLeftRectToPdf(layout, part.cut);

        if (input.artMode === 'album' && coverImage) {
            // Cover fills the bleed box (cover/crop). No theme colours in album mode.
            fitCoverDraw(page, coverImage, bleedBox);
            if (id === 'face') {
                drawAlbumFaceTracklist(page, font, fontBold, input.disc, cutBox);
            } else if (id === 'edge') {
                drawAlbumEdgeTitle(page, fontBold, input.disc, cutBox);
            }
            // box: album art only — no text
            continue;
        }

        // Typographic mix-disc mode
        page.drawRectangle({ ...bleedBox, color: colorFromHex(input.theme.background) });
        if (id === 'edge') {
            drawTypographicEdge(page, fontBold, input.disc, input.theme, cutBox);
        } else if (id === 'face') {
            drawTypographicFaceOrBox(page, font, fontBold, input.disc, input.theme, cutBox, { showTracks: true });
        } else {
            drawTypographicFaceOrBox(page, font, fontBold, input.disc, input.theme, cutBox, {
                showTracks: true,
                showSpineBar: true,
                spineW: (part.spineFoldX ?? 0) * PT_PER_MM,
            });
        }
    }

    return pdf.save();
}
