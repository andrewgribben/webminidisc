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

/** Real CAA front cover for Hamilton (MBID 2eece058-39a8-4dd7-af54-b94ae39ec7fa), vendored for design mode. */
export const DEMO_ALBUM_COVER_URL = '/label-fixtures/hamilton-front.jpg';
export const DEMO_ALBUM_COVER_MIME = 'image/jpeg';

let demoCoverCache: { bytes: Uint8Array; mime: string } | null = null;

/** Load the MusicBrainz/CAA fixture cover (same-origin static file; no live CAA fetch). */
export async function loadDemoAlbumCover(): Promise<{ bytes: Uint8Array; mime: string }> {
    if (demoCoverCache) {
        return demoCoverCache;
    }
    const response = await fetch(DEMO_ALBUM_COVER_URL);
    if (!response.ok) {
        throw new Error(`Could not load demo album cover (${response.status}).`);
    }
    const mime = response.headers.get('content-type') || DEMO_ALBUM_COVER_MIME;
    const bytes = new Uint8Array(await response.arrayBuffer());
    demoCoverCache = { bytes, mime };
    return demoCoverCache;
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
