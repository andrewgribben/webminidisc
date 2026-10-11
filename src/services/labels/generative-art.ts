import { LabelDiscInfo, LabelPalette } from './types';

/** Mulberry32 PRNG — deterministic from seed. */
export function createRng(seed: number): () => number {
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

export function hashStringToSeed(input: string): number {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

const BASE_PALETTES: [string, string, string, string][] = [
    ['#FF4D00', '#FFC700', '#0D0D0D', '#6B7D2F'],
    ['#E8E4DC', '#1A1A1A', '#C45C26', '#4A6FA5'],
    ['#0B3D2E', '#F2E8C9', '#D94F30', '#1C1C1C'],
    ['#2D2A32', '#F7F3E9', '#E4572E', '#76B041'],
    ['#111827', '#F9FAFB', '#F59E0B', '#2563EB'],
];

export function paletteFromSeed(seed: number): LabelPalette {
    const rng = createRng(seed);
    const base = BASE_PALETTES[Math.floor(rng() * BASE_PALETTES.length)];
    // Light shuffle of the four slots for variety while staying readable.
    const colors = [...base] as [string, string, string, string];
    for (let i = colors.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = colors[i];
        colors[i] = colors[j];
        colors[j] = tmp;
    }
    return { colors };
}

export type GenerativeSurface = 'face' | 'edge' | 'box';

/**
 * Rasterise a seeded geometric composition into a PNG for PDF embedding / preview.
 * Dimensions are in CSS pixels; callers should use a high enough density for print.
 */
export function renderGenerativePng(
    disc: LabelDiscInfo,
    seed: number,
    surface: GenerativeSurface,
    widthPx: number,
    heightPx: number,
    palette: LabelPalette
): Uint8Array {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(widthPx));
    canvas.height = Math.max(1, Math.round(heightPx));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Canvas 2D unavailable for label art.');
    }

    const rng = createRng(seed ^ (surface === 'face' ? 1 : surface === 'edge' ? 2 : 3));
    const [c0, c1, c2, c3] = palette.colors;
    const tracks = disc.tracks;
    const total = tracks.reduce((sum, t) => sum + Math.max(t.durationSec, 1), 0) || 1;

    ctx.fillStyle = c2;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Duration-weighted diagonal / bar blocks.
    let cursor = 0;
    for (let i = 0; i < tracks.length; i++) {
        const share = Math.max(tracks[i].durationSec, 1) / total;
        const color = [c0, c1, c3, c2][i % 4];
        ctx.fillStyle = color;
        if (surface === 'edge') {
            const w = canvas.width * share;
            ctx.fillRect(cursor, 0, w + 1, canvas.height);
            cursor += w;
        } else {
            const mode = Math.floor(rng() * 4);
            if (mode === 0) {
                const x = rng() * canvas.width;
                const w = canvas.width * (0.15 + share * 0.7);
                ctx.save();
                ctx.translate(x, rng() * canvas.height * 0.3);
                ctx.rotate((-25 + rng() * 50) * (Math.PI / 180));
                ctx.fillRect(0, 0, w, canvas.height * (0.35 + share));
                ctx.restore();
            } else if (mode === 1) {
                const r = Math.min(canvas.width, canvas.height) * (0.08 + share * 0.35);
                ctx.beginPath();
                ctx.arc(rng() * canvas.width, rng() * canvas.height, r, 0, Math.PI * 2);
                ctx.fill();
            } else if (mode === 2) {
                const x = rng() * canvas.width;
                const y = rng() * canvas.height;
                const s = Math.min(canvas.width, canvas.height) * (0.2 + share * 0.5);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + s, y + s * 0.2);
                ctx.lineTo(x + s * 0.2, y + s);
                ctx.closePath();
                ctx.fill();
            } else {
                const y = cursor;
                const h = canvas.height * share;
                ctx.globalAlpha = 0.85;
                ctx.fillRect(0, y, canvas.width * (0.4 + rng() * 0.6), h + 1);
                ctx.globalAlpha = 1;
                cursor += h;
            }
        }
    }

    // Dot grid accent
    ctx.fillStyle = c1;
    ctx.globalAlpha = 0.35;
    const step = Math.max(6, Math.floor(Math.min(canvas.width, canvas.height) / 18));
    for (let x = step / 2; x < canvas.width; x += step) {
        for (let y = step / 2; y < canvas.height; y += step) {
            if (rng() > 0.65) {
                ctx.beginPath();
                ctx.arc(x, y, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    ctx.globalAlpha = 1;

    // Accent bar for brand-like strip
    ctx.fillStyle = c0;
    if (surface === 'edge') {
        ctx.fillRect(0, 0, canvas.width * 0.08, canvas.height);
    } else {
        ctx.fillRect(0, 0, canvas.width, Math.max(8, canvas.height * 0.08));
    }

    const dataUrl = canvas.toDataURL('image/png');
    const comma = dataUrl.indexOf(',');
    const b64 = dataUrl.slice(comma + 1);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export function randomSeed(): number {
    return (Math.floor(Math.random() * 0xffffffff) || 1) >>> 0;
}
