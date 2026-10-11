import { Disc, Track } from './interfaces/netmd';
import { getTracks } from '../utils';

const libraryRoot = '/md-library';

export interface LibraryTrackInput {
    index_no: number;
    raw_title: string | null;
    duration_ms: number;
    title?: string | null;
    artist?: string | null;
    album?: string | null;
    artist_mbid?: string | null;
    album_mbid?: string | null;
    cover_url?: string | null;
    year?: number | null;
}

export interface DiscCreateBody {
    device_signature: string;
    disc_title: string | null;
    source: 'minidisc';
    tracks: LibraryTrackInput[];
}

export interface AlbumMatch {
    release_mbid: string;
    title: string;
    artist_credit: string | null;
    date: string | null;
    score: number;
    cover_url: string | null;
    track_count: number | null;
}

export interface ReleaseTrack {
    position: number;
    number?: number | null;
    title: string;
    duration_ms: number | null;
}

export interface ReleaseDetails {
    release_mbid: string;
    title: string;
    artist_credit: string | null;
    date: string | null;
    cover_url: string | null;
    medium_position?: number | null;
    medium_title?: string | null;
    tracks: ReleaseTrack[];
}

export interface SavedDisc {
    disc_id: number;
}

export interface DiscMatch {
    matched: boolean;
    disc_id: number | null;
    disc_title: string | null;
}

export interface DetailedTrack {
    index_no: number;
    title: string | null;
    album: { title?: string; cover_url?: string | null } | null;
}

export interface DetailedDisc {
    id: number;
    disc_title: string | null;
    tracks: DetailedTrack[];
}

function coverArtArchiveProxyUrl(absoluteUrl: string): string | null {
    // CAA and Internet Archive do not send CORS headers; fetch()/PDF embedding must use our proxy.
    try {
        const parsed = new URL(absoluteUrl);
        const host = parsed.hostname.replace(/^www\./, '');
        if (host === 'coverartarchive.org') {
            const match = parsed.pathname.match(/^\/release\/([0-9a-f-]{36})/i);
            if (match) {
                return `${libraryRoot}/api/covers/release/${match[1]}`;
            }
        }
        if (host === 'archive.org') {
            const match = parsed.pathname.match(/\/download\/mbid-([0-9a-f-]{36})\//i);
            if (match) {
                return `${libraryRoot}/api/covers/release/${match[1]}`;
            }
        }
    } catch {
        return null;
    }
    return null;
}

export function libraryAssetUrl(path: string | null | undefined): string | null {
    if (!path) {
        return null;
    }
    if (path.startsWith('http://')) {
        // MusicBrainz cover art is served over HTTP. The page is HTTPS, so the image has to use HTTPS.
        const httpsUrl = `https://${path.slice('http://'.length)}`;
        return coverArtArchiveProxyUrl(httpsUrl) ?? httpsUrl;
    }
    if (path.startsWith('https://')) {
        return coverArtArchiveProxyUrl(path) ?? path;
    }
    return `${libraryRoot}${path.startsWith('/') ? path : `/${path}`}`;
}

export function savedAudioUrl(discId: number, index: number): string {
    return `${libraryRoot}/api/discs/${discId}/audio/${index}`;
}

export async function discSignature(disc: Disc): Promise<string> {
    const raw = getTracks(disc)
        .map((track) => `${track.index}:${Math.round(track.duration * 1000)}`)
        .join('|');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function albumHint(disc: Disc): string | undefined {
    const title = (disc.fullWidthTitle || disc.title || '').split('//')[0].trim();
    if (!title || title.toLowerCase() === 'untitled disc') {
        return undefined;
    }
    return title;
}

export function yearFromDate(date: string | null | undefined): number | null {
    if (!date) {
        return null;
    }
    const year = Number(date.slice(0, 4));
    return Number.isFinite(year) ? year : null;
}

function trackTitle(track: Track): string | null {
    return track.fullWidthTitle || track.title || null;
}

export async function discCreateBody(disc: Disc, release?: ReleaseDetails): Promise<DiscCreateBody> {
    const tracks = getTracks(disc);
    return {
        device_signature: await discSignature(disc),
        disc_title: release?.title || disc.fullWidthTitle || disc.title || null,
        source: 'minidisc',
        tracks: tracks.map((track, index) => {
            const matched = release?.tracks[index];
            return {
                index_no: track.index,
                raw_title: trackTitle(track),
                duration_ms: Math.round(track.duration * 1000),
                title: matched?.title || trackTitle(track),
                artist: release?.artist_credit || track.artist || null,
                album: release?.title || track.album || null,
                album_mbid: release?.release_mbid || null,
                cover_url: release?.cover_url || null,
                year: yearFromDate(release?.date),
            };
        }),
    };
}

async function readError(response: Response): Promise<string> {
    try {
        const body = (await response.json()) as { detail?: unknown };
        if (typeof body.detail === 'string') {
            return body.detail;
        }
    } catch {
        // The body was not JSON.
    }
    return `Library request failed (${response.status})`;
}

async function sendJson<T>(path: string, method: string, body?: unknown): Promise<T> {
    const response = await fetch(`${libraryRoot}${path}`, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error(await readError(response));
    }
    return (await response.json()) as T;
}

export async function matchAlbum(disc: Disc): Promise<AlbumMatch[]> {
    const tracks = getTracks(disc);
    const artist = tracks.find((track) => track.artist)?.artist;
    const result = await sendJson<{ matches: AlbumMatch[] }>('/api/enrich/match', 'POST', {
        disc_title: albumHint(disc) ?? null,
        artist_hint: artist ?? null,
        tracks: tracks.map((track) => ({
            index_no: track.index,
            raw_title: trackTitle(track),
            duration_ms: Math.round(track.duration * 1000),
        })),
    });
    return result.matches;
}

export function releaseDetails(mbid: string, disc: Disc): Promise<ReleaseDetails> {
    const tracks = getTracks(disc);
    return sendJson<ReleaseDetails>(`/api/enrich/release/${encodeURIComponent(mbid)}`, 'POST', {
        tracks: tracks.map((track) => ({
            index_no: track.index,
            raw_title: trackTitle(track),
            duration_ms: Math.round(track.duration * 1000),
        })),
    });
}

export async function saveDisc(body: DiscCreateBody): Promise<SavedDisc> {
    return sendJson<SavedDisc>('/api/discs', 'POST', body);
}

export async function matchKnownDisc(disc: Disc): Promise<DiscMatch> {
    const tracks = getTracks(disc);
    return sendJson<DiscMatch>('/api/match/disc', 'POST', {
        device_signature: await discSignature(disc),
        disc_title: disc.fullWidthTitle || disc.title || 'Untitled',
        tracks: tracks.map((track) => ({
            index_no: track.index,
            title: trackTitle(track) || 'Untitled',
            duration_ms: Math.round(track.duration * 1000),
        })),
    });
}

export function detailedDisc(discId: number): Promise<DetailedDisc> {
    return sendJson<DetailedDisc>(`/api/discs/${discId}/detailed`, 'GET');
}

export function listSavedAudio(discId: number): Promise<{ indexes: number[] }> {
    return sendJson<{ indexes: number[] }>(`/api/discs/${discId}/audio`, 'GET');
}

export async function uploadSavedAudio(discId: number, index: number, wav: Blob): Promise<void> {
    const response = await fetch(savedAudioUrl(discId, index), {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: wav,
    });
    if (!response.ok) {
        throw new Error(await readError(response));
    }
}
