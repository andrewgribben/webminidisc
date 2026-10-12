import { TrackFlag } from 'netmd-js';
import { Disc } from '../interfaces/netmd';
import { LabelDiscInfo } from './types';

const unprotected = TrackFlag.unprotected;

/** Sample mix disc for Label Studio design mode (no NetMD required). */
export const DEMO_MIX_DISC: Disc = {
    title: 'COMMUTE MIX 09',
    fullWidthTitle: '',
    writable: true,
    writeProtected: false,
    used: 0,
    left: 80 * 60,
    total: 80 * 60,
    trackCount: 12,
    groups: [
        {
            index: 0,
            title: null,
            fullWidthTitle: null,
            tracks: [
                { index: 0, title: 'Morning Drift', fullWidthTitle: null, duration: 214, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Various Artists' },
                { index: 1, title: 'Platform Light', fullWidthTitle: null, duration: 198, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Various Artists' },
                { index: 2, title: 'Ticket Gate', fullWidthTitle: null, duration: 241, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Various Artists' },
                { index: 3, title: 'Signal Delay', fullWidthTitle: null, duration: 186, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Various Artists' },
                { index: 4, title: 'Carriage Hum', fullWidthTitle: null, duration: 273, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Various Artists' },
                { index: 5, title: 'River Crossing', fullWidthTitle: null, duration: 229, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Various Artists' },
                { index: 6, title: 'Second Wind', fullWidthTitle: null, duration: 205, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Various Artists' },
                { index: 7, title: 'Office Stairs', fullWidthTitle: null, duration: 192, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Various Artists' },
                { index: 8, title: 'Desk Lamp', fullWidthTitle: null, duration: 258, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Various Artists' },
                { index: 9, title: 'Late Reply', fullWidthTitle: null, duration: 221, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Various Artists' },
                { index: 10, title: 'Homebound', fullWidthTitle: null, duration: 247, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Various Artists' },
                { index: 11, title: 'Key in Door', fullWidthTitle: null, duration: 183, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Various Artists' },
            ],
        },
    ],
};

/** Sample album-shaped disc (Hamilton-like) for album-art layout testing. */
export const DEMO_ALBUM_DISC: Disc = {
    title: 'Hamilton: An American Musical',
    fullWidthTitle: '',
    writable: true,
    writeProtected: false,
    used: 0,
    left: 80 * 60,
    total: 80 * 60,
    trackCount: 10,
    groups: [
        {
            index: 0,
            title: null,
            fullWidthTitle: null,
            tracks: [
                { index: 0, title: 'Alexander Hamilton', fullWidthTitle: null, duration: 236, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Original Broadway Cast' },
                { index: 1, title: 'Aaron Burr, Sir', fullWidthTitle: null, duration: 157, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Original Broadway Cast' },
                { index: 2, title: 'My Shot', fullWidthTitle: null, duration: 333, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Original Broadway Cast' },
                { index: 3, title: 'The Story of Tonight', fullWidthTitle: null, duration: 92, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Original Broadway Cast' },
                { index: 4, title: 'The Schuyler Sisters', fullWidthTitle: null, duration: 186, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Original Broadway Cast' },
                { index: 5, title: 'Farmer Refuted', fullWidthTitle: null, duration: 96, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Original Broadway Cast' },
                { index: 6, title: "You'll Be Back", fullWidthTitle: null, duration: 163, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Original Broadway Cast' },
                { index: 7, title: 'Right Hand Man', fullWidthTitle: null, duration: 321, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Original Broadway Cast' },
                { index: 8, title: 'A Winter\'s Ball', fullWidthTitle: null, duration: 69, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Original Broadway Cast' },
                { index: 9, title: 'Helpless', fullWidthTitle: null, duration: 248, channel: 2, encoding: { codec: 'SPS', bitrate: 292 }, protected: unprotected, artist: 'Original Broadway Cast' },
            ],
        },
    ],
};

/** Stand-in cover for design mode (no network) — poster-style art, not a flat theme fill. */
export function demoCoverPngBytes(): Uint8Array {
    const fallbackB64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const fallbackBinary = atob(fallbackB64);
    const fallback = new Uint8Array(fallbackBinary.length);
    for (let i = 0; i < fallbackBinary.length; i++) {
        fallback[i] = fallbackBinary.charCodeAt(i);
    }
    if (typeof document === 'undefined') {
        return fallback;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return fallback;
    }
    // Warm photo-like base
    const base = ctx.createRadialGradient(220, 180, 40, 300, 320, 420);
    base.addColorStop(0, '#3D2A1F');
    base.addColorStop(0.45, '#8B4518');
    base.addColorStop(1, '#1A0F0A');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 600, 600);
    // Soft colour fields (album-poster composition)
    ctx.fillStyle = 'rgba(212, 90, 40, 0.55)';
    ctx.beginPath();
    ctx.ellipse(420, 160, 180, 120, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(240, 200, 80, 0.35)';
    ctx.beginPath();
    ctx.ellipse(140, 480, 200, 140, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(20, 20, 20, 0.35)';
    ctx.fillRect(0, 0, 600, 90);
    ctx.fillRect(0, 510, 600, 90);
    // Fine grain so it doesn't read as a flat CSS colour
    const grain = ctx.getImageData(0, 0, 600, 600);
    for (let i = 0; i < grain.data.length; i += 16) {
        const n = (Math.random() - 0.5) * 28;
        grain.data[i] = Math.max(0, Math.min(255, grain.data[i] + n));
        grain.data[i + 1] = Math.max(0, Math.min(255, grain.data[i + 1] + n));
        grain.data[i + 2] = Math.max(0, Math.min(255, grain.data[i + 2] + n));
    }
    ctx.putImageData(grain, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    const raw = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
        out[i] = raw.charCodeAt(i);
    }
    return out;
}

export function demoLabelInfo(disc: Disc): LabelDiscInfo {
    const tracks = disc.groups[0].tracks.map((t) => ({
        index: t.index,
        title: t.title || 'Untitled',
        durationSec: t.duration,
    }));
    return {
        title: disc.title,
        artist: disc.groups[0].tracks[0]?.artist ?? null,
        tracks,
        totalDurationSec: tracks.reduce((s, t) => s + t.durationSec, 0),
    };
}

export function isLabelDesignMode(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('labels') === 'design';
}
