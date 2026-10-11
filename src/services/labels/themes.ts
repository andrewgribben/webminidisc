import { LabelTheme } from './types';

/** Presets inspired by Nothing Phone glyph clarity and Teenage Engineering workshop colour. */
export const LABEL_THEMES: LabelTheme[] = [
    { id: 'nothing-light', name: 'Nothing', background: '#F5F5F5', text: '#1A1A1A', accent: '#D71921' },
    { id: 'nothing-dark', name: 'Nothing Dark', background: '#0A0A0A', text: '#F2F2F2', accent: '#FFFFFF' },
    { id: 'te-workshop', name: 'TE Workshop', background: '#F7F5F0', text: '#111111', accent: '#FF4D00' },
    { id: 'te-signal', name: 'TE Signal', background: '#FF4D00', text: '#111111', accent: '#FFFFFF' },
    { id: 'te-yellow', name: 'TE Yellow', background: '#FFC700', text: '#0D0D0D', accent: '#0D0D0D' },
];

export const DEFAULT_LABEL_THEME = LABEL_THEMES[2]; // TE Workshop

export function themeById(id: string | null | undefined): LabelTheme {
    return LABEL_THEMES.find((theme) => theme.id === id) ?? DEFAULT_LABEL_THEME;
}

export function customTheme(background: string, text: string, accent?: string): LabelTheme {
    return {
        id: 'custom',
        name: 'Custom',
        background,
        text,
        accent: accent || text,
    };
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const cleaned = hex.replace('#', '').trim();
    const full =
        cleaned.length === 3
            ? cleaned
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : cleaned;
    const n = Number.parseInt(full, 16);
    if (!Number.isFinite(n) || full.length !== 6) {
        return { r: 0.1, g: 0.1, b: 0.1 };
    }
    return {
        r: ((n >> 16) & 255) / 255,
        g: ((n >> 8) & 255) / 255,
        b: (n & 255) / 255,
    };
}
