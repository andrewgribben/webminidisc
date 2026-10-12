import { LabelDiscInfo, LabelTheme } from './types';

const COVER_SIZE = 1000;

function drawTrackedCanvasText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    tracking: number
): number {
    let cursor = x;
    for (const ch of text) {
        ctx.fillText(ch, cursor, y);
        cursor += ctx.measureText(ch).width + tracking;
    }
    return cursor - x;
}

function measuredTrackedWidth(ctx: CanvasRenderingContext2D, text: string, tracking: number): number {
    let width = 0;
    for (const ch of text) {
        width += ctx.measureText(ch).width + tracking;
    }
    return text.length > 0 ? width - tracking : 0;
}

function fitTitleSize(ctx: CanvasRenderingContext2D, title: string, maxWidth: number, maxSize: number): number {
    let size = maxSize;
    while (size > 28) {
        ctx.font = `700 ${size}px Helvetica, Arial, sans-serif`;
        const tracking = size * 0.08;
        if (measuredTrackedWidth(ctx, title, tracking) <= maxWidth) {
            return size;
        }
        size -= 4;
    }
    return size;
}

function wrapTitle(ctx: CanvasRenderingContext2D, title: string, maxWidth: number, tracking: number): string[] {
    const words = title.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
        return ['UNTITLED DISC'];
    }
    const lines: string[] = [];
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
        const candidate = `${current} ${words[i]}`;
        if (measuredTrackedWidth(ctx, candidate, tracking) <= maxWidth) {
            current = candidate;
        } else {
            lines.push(current);
            current = words[i];
        }
    }
    lines.push(current);
    // Cap at 4 lines; truncate the last line if needed.
    if (lines.length > 4) {
        const kept = lines.slice(0, 4);
        let last = kept[3];
        while (last.length > 1 && measuredTrackedWidth(ctx, `${last}…`, tracking) > maxWidth) {
            last = last.slice(0, -1);
        }
        kept[3] = `${last}…`;
        return kept;
    }
    return lines.map((line) => {
        if (measuredTrackedWidth(ctx, line, tracking) <= maxWidth) {
            return line;
        }
        let trimmed = line;
        while (trimmed.length > 1 && measuredTrackedWidth(ctx, `${trimmed}…`, tracking) > maxWidth) {
            trimmed = trimmed.slice(0, -1);
        }
        return `${trimmed}…`;
    });
}

/** Square theme-styled cover: big bold disc title, no tracklisting. */
export async function generateTitleCover(
    disc: LabelDiscInfo,
    theme: LabelTheme
): Promise<{ bytes: Uint8Array; mime: 'image/png' }> {
    const canvas = document.createElement('canvas');
    canvas.width = COVER_SIZE;
    canvas.height = COVER_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not create a canvas for title album art.');
    }

    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, COVER_SIZE, COVER_SIZE);

    const pad = Math.round(COVER_SIZE * 0.08);
    const glyph = Math.round(COVER_SIZE * 0.035);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(pad, pad, glyph, glyph);

    const title = (disc.title || 'Untitled Disc').toUpperCase();
    const contentWidth = COVER_SIZE - pad * 2;
    const titleSize = fitTitleSize(ctx, title, contentWidth, Math.round(COVER_SIZE * 0.11));
    const tracking = titleSize * 0.08;
    ctx.font = `700 ${titleSize}px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = theme.text;
    ctx.textBaseline = 'top';

    const lines = wrapTitle(ctx, title, contentWidth, tracking);
    const lineHeight = titleSize * 1.15;
    const titleBlockHeight = lines.length * lineHeight;
    const ruleGap = Math.round(COVER_SIZE * 0.03);
    const artistSize = Math.round(titleSize * 0.38);
    const hasArtist = Boolean(disc.artist?.trim());
    const artistBlock = hasArtist ? artistSize + Math.round(COVER_SIZE * 0.02) : 0;
    const totalBlock = titleBlockHeight + ruleGap + 4 + artistBlock;
    let cursorY = Math.max(pad + glyph + pad * 0.5, (COVER_SIZE - totalBlock) / 2);

    for (const line of lines) {
        const lineWidth = measuredTrackedWidth(ctx, line, tracking);
        const x = (COVER_SIZE - lineWidth) / 2;
        drawTrackedCanvasText(ctx, line, x, cursorY, tracking);
        cursorY += lineHeight;
    }

    cursorY += ruleGap;
    ctx.fillStyle = theme.accent;
    ctx.fillRect(pad, cursorY, COVER_SIZE - pad * 2, 4);
    cursorY += 4 + Math.round(COVER_SIZE * 0.025);

    if (hasArtist && disc.artist) {
        const artist = disc.artist.toUpperCase();
        ctx.font = `400 ${artistSize}px Helvetica, Arial, sans-serif`;
        ctx.fillStyle = theme.text;
        const artistTracking = artistSize * 0.1;
        let artistLine = artist;
        while (
            artistLine.length > 1 &&
            measuredTrackedWidth(ctx, artistLine, artistTracking) > contentWidth
        ) {
            artistLine = artistLine.slice(0, -1);
        }
        if (artistLine !== artist) {
            artistLine = `${artistLine}…`;
        }
        const artistWidth = measuredTrackedWidth(ctx, artistLine, artistTracking);
        drawTrackedCanvasText(ctx, artistLine, (COVER_SIZE - artistWidth) / 2, cursorY, artistTracking);
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
            if (result) {
                resolve(result);
            } else {
                reject(new Error('Could not encode title album art as PNG.'));
            }
        }, 'image/png');
    });
    const buffer = await blob.arrayBuffer();
    return { bytes: new Uint8Array(buffer), mime: 'image/png' };
}
