/** Deck industrial UI colour tokens (Web MiniDisc — not TE trademarks). */
export const deckTokens = {
    surface: '#F7F5F0',
    surfaceMuted: '#EBE8E2',
    ink: '#111111',
    muted: '#6B6760',
    accent: '#FF4D00',
    accentHover: '#E64500',
    border: '#111111',
    borderHairline: 'rgba(17, 17, 17, 0.18)',
    lcdBg: '#9BA86F',
    lcdInk: '#1A2210',
    lcdMuted: 'rgba(26, 34, 16, 0.55)',
    meterTrack: '#D9D4CA',
    meterFill: '#FF4D00',
    meterWarn: '#C62828',
    focusRing: '#FF4D00',
    radius: 4,
    fontSans: `'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif`,
    fontMono: `'IBM Plex Mono', 'Courier New', monospace`,
    fontLcd: `'LCDDot', monospace`,
} as const;

export type DeckTokenKey = keyof typeof deckTokens;
