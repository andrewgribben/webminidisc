import { CustomParameters } from '../../custom-parameters';
import { AudioEncoderV1ExportParams } from '../audio/apiv1/external-interface';
import serviceRegistry from '../registry';
import { LibraryService, LocalDatabase } from './library';

/** Formats Downtify's own settings API accepts. */
export const EMBEDDED_DOWNTIFY_FORMATS = ['flac', 'mp3', 'ogg', 'opus', 'm4a'] as const;
export type EmbeddedDowntifyFormat = (typeof EMBEDDED_DOWNTIFY_FORMATS)[number];

export function embeddedDowntifyFormatLabel(format: EmbeddedDowntifyFormat): string {
    switch (format) {
        case 'flac':
            return 'FLAC (best for MD SP)';
        case 'mp3':
            return 'MP3';
        case 'ogg':
            return 'OGG';
        case 'opus':
            return 'OPUS';
        case 'm4a':
            return 'M4A';
        default: {
            const _exhaustive: never = format;
            return _exhaustive;
        }
    }
}

function embeddedDowntifyApi(path: string): string {
    return new URL(path.replace(/^\//, ''), new URL('/downtify/', window.location.href)).toString();
}

function isEmbeddedDowntifyFormat(value: unknown): value is EmbeddedDowntifyFormat {
    return typeof value === 'string' && (EMBEDDED_DOWNTIFY_FORMATS as readonly string[]).includes(value);
}

export async function writeEmbeddedDowntifyFormat(format: EmbeddedDowntifyFormat): Promise<void> {
    const response = await fetch(embeddedDowntifyApi('api/settings/update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
    });
    if (!response.ok) {
        throw new Error(await readError(response));
    }
}

export type EmbeddedLibraryOptions = {
    format: EmbeddedDowntifyFormat;
    youtubeFallback: boolean;
    cookies: DowntifyCookieStatus;
};

export async function readEmbeddedLibraryOptions(): Promise<EmbeddedLibraryOptions> {
    const [settingsResponse, cookiesResponse] = await Promise.all([
        fetch(embeddedDowntifyApi('api/settings')),
        fetch(embeddedDowntifyApi('api/cookies')),
    ]);
    if (!settingsResponse.ok) {
        throw new Error(await readError(settingsResponse));
    }
    if (!cookiesResponse.ok) {
        throw new Error(await readError(cookiesResponse));
    }
    const settings = (await settingsResponse.json()) as { format?: unknown; audio_providers?: unknown };
    if (!isEmbeddedDowntifyFormat(settings.format)) {
        throw new Error('Downtify returned an unknown download format');
    }
    const providers = Array.isArray(settings.audio_providers)
        ? settings.audio_providers.filter((provider): provider is string => typeof provider === 'string')
        : [];
    return {
        format: settings.format,
        youtubeFallback: providers.includes('youtube'),
        cookies: normalizeCookieStatus(await cookiesResponse.json()),
    };
}

export async function writeEmbeddedYoutubeFallback(enabled: boolean): Promise<void> {
    const response = await fetch(embeddedDowntifyApi('api/settings'));
    if (!response.ok) {
        throw new Error(await readError(response));
    }
    const settings = (await response.json()) as { audio_providers?: unknown };
    const current = Array.isArray(settings.audio_providers)
        ? settings.audio_providers.filter((provider): provider is string => typeof provider === 'string' && provider !== 'youtube')
        : ['youtube-music'];
    if (!current.includes('youtube-music')) {
        current.unshift('youtube-music');
    }
    if (enabled) {
        const musicIndex = current.indexOf('youtube-music');
        current.splice(musicIndex + 1, 0, 'youtube');
    }
    const update = await fetch(embeddedDowntifyApi('api/settings/update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_providers: current }),
    });
    if (!update.ok) {
        throw new Error(await readError(update));
    }
}

export async function uploadEmbeddedDowntifyCookies(content: string): Promise<DowntifyCookieStatus> {
    const response = await fetch(embeddedDowntifyApi('api/cookies'), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: content,
    });
    if (!response.ok) {
        throw new Error(await readError(response));
    }
    return normalizeCookieStatus(await response.json());
}

export async function deleteEmbeddedDowntifyCookies(): Promise<void> {
    const response = await fetch(embeddedDowntifyApi('api/cookies'), { method: 'DELETE' });
    if (!response.ok) {
        throw new Error(await readError(response));
    }
}

type LibraryLeaf = {
    artist: string;
    album: string;
    title: string;
    duration: number;
    trackIndex?: number;
};

type LibraryNode = { [name: string]: LibraryNode | LibraryLeaf };

type DowntifyTrack = {
    file?: string;
    title?: string;
    artist?: string;
    album?: string;
    duration?: number;
    track_number?: number;
};

export type DowntifySong = {
    url?: string;
    name?: string;
    artists?: string[];
    song_id?: string;
    youtube_id?: string;
    youtube_id_override?: boolean;
    album_name?: string;
    duration?: number;
    track_number?: number;
    [key: string]: unknown;
};

export type DowntifyQueueJob = {
    song: DowntifySong;
    status: string;
    progress: number;
    message: string;
    provider: string;
    filename: string | null;
};

export type DowntifyLibraryTrack = {
    file: string;
    title: string;
    artist: string;
    album: string;
    albumArtist: string;
    trackNumber: number;
    duration: number;
    /** Uppercase container extension, such as FLAC or MP3. */
    format: string;
    playlists: string[];
};

export function libraryFileFormat(filePath: string): string {
    const base = filePath.split('/').pop() || filePath;
    const dot = base.lastIndexOf('.');
    if (dot <= 0 || dot === base.length - 1) {
        return 'Unknown';
    }
    return base.slice(dot + 1).toUpperCase();
}

export type DowntifyPlaylist = {
    name: string;
    files: string[];
    count: number;
    cover: string;
    liked: boolean;
};

export type DowntifyCookieStatus = {
    configured: boolean;
    locked: boolean;
    source: string | null;
    warnings?: string[];
};

type DowntifyResolvedUrl = {
    kind?: string;
    name?: string;
    tracks?: DowntifySong[];
};

export type DowntifyDownloadResult = {
    kind: 'track' | 'album' | 'playlist';
    name: string;
    count: number;
    /** Batch jobs are queued in Downtify; a single track finishes before return. */
    queued: boolean;
};

function isLeaf(value: LibraryNode | LibraryLeaf): value is LibraryLeaf {
    return 'artist' in value;
}

function endpoint(address: string, path: string): string {
    const base = address.endsWith('/') ? address : `${address}/`;
    const root = new URL(base, window.location.href);
    return new URL(path.replace(/^\//, ''), root).toString();
}

async function readResponseBlob(
    response: Response,
    onBytes?: (loaded: number, total: number) => void
): Promise<Blob> {
    const total = Number(response.headers.get('Content-Length') ?? '0');
    if (!response.body || !(total > 0) || !onBytes) {
        return response.blob();
    }
    const reader = response.body.getReader();
    const chunks: ArrayBuffer[] = [];
    let loaded = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        if (value) {
            const copy = new Uint8Array(value.byteLength);
            copy.set(value);
            chunks.push(copy.buffer);
            loaded += value.byteLength;
            onBytes(loaded, total);
        }
    }
    return new Blob(chunks);
}

function encodeLibraryPath(filePath: string): string {
    return filePath
        .split('/')
        .filter((part) => part.length > 0)
        .map((part) => encodeURIComponent(part))
        .join('/');
}

async function readError(response: Response): Promise<string> {
    const text = await response.text();
    try {
        const body = JSON.parse(text) as { detail?: unknown };
        if (typeof body.detail === 'string' && body.detail.length > 0) {
            return body.detail;
        }
    } catch {
        // Downtify sometimes returns plain text.
    }
    return text || `Request failed (${response.status})`;
}

function insertTrack(tree: LibraryNode, filePath: string, leaf: LibraryLeaf) {
    const parts = filePath.split('/').filter((part) => part.length > 0);
    if (parts.length === 0) {
        return;
    }
    let node = tree;
    for (let index = 0; index < parts.length - 1; index++) {
        const part = parts[index];
        const existing = node[part];
        if (existing === undefined || isLeaf(existing)) {
            node[part] = {};
        }
        node = node[part] as LibraryNode;
    }
    node[parts[parts.length - 1]] = leaf;
}

function isPlaylistUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, '');
        if (host === 'open.spotify.com' || host === 'spotify.com') {
            return parsed.pathname.includes('/playlist/');
        }
        if (host.includes('youtube.com') || host === 'youtu.be' || host.includes('music.youtube.com')) {
            // watch?v=...&list=... is the playing video, not the playlist.
            if (parsed.searchParams.get('v') || host === 'youtu.be') {
                return false;
            }
            const list = parsed.searchParams.get('list');
            return Boolean(list) || parsed.pathname.includes('/playlist');
        }
    } catch {
        return /playlist/i.test(url);
    }
    return false;
}

function formatDownloadStatus(result: DowntifyDownloadResult): string {
    if (result.kind === 'track') {
        return result.name
            ? `Saved “${result.name}” in Downtify. Connect the MiniDisc, then choose it from the library.`
            : 'Saved in Downtify. Connect the MiniDisc, then choose it from the library.';
    }
    const label = result.kind === 'playlist' ? 'playlist' : 'album';
    const name = result.name ? ` “${result.name}”` : '';
    return `Queued ${result.count} track${result.count === 1 ? '' : 's'} from ${label}${name} in Downtify. Open Downtify or refresh the library when downloads finish.`;
}

export function queueSongId(song: DowntifySong): string {
    if (typeof song.song_id === 'string' && song.song_id.length > 0) {
        return song.song_id;
    }
    if (typeof song.url === 'string' && song.url.length > 0) {
        return song.url;
    }
    return '';
}

function youtubeVideoId(url: string): string | null {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, '');
        if (host === 'youtu.be') {
            const id = parsed.pathname.split('/').filter((part) => part.length > 0)[0];
            return id && /^[\w-]{6,}$/.test(id) ? id : null;
        }
        if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'm.youtube.com') {
            const id = parsed.searchParams.get('v');
            return id && /^[\w-]{6,}$/.test(id) ? id : null;
        }
    } catch {
        return null;
    }
    return null;
}

function normalizeQueueJob(entry: unknown): DowntifyQueueJob {
    const job = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    const song = job.song && typeof job.song === 'object' ? (job.song as DowntifySong) : {};
    return {
        song,
        status: typeof job.status === 'string' ? job.status : '',
        progress: typeof job.progress === 'number' ? job.progress : 0,
        message: typeof job.message === 'string' ? job.message : '',
        provider: typeof job.provider === 'string' ? job.provider : '',
        filename: typeof job.filename === 'string' ? job.filename : null,
    };
}

function normalizeCookieStatus(entry: unknown): DowntifyCookieStatus {
    const body = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    const warnings = Array.isArray(body.warnings) ? body.warnings.filter((item): item is string => typeof item === 'string') : undefined;
    return {
        configured: body.configured === true,
        locked: body.locked === true,
        source: typeof body.source === 'string' ? body.source : null,
        warnings,
    };
}

export class DowntifyLibraryService implements LibraryService {
    public address: string;

    constructor(parameters: CustomParameters) {
        const address = parameters.address;
        this.address = typeof address === 'string' && address.length > 0 ? address : '/downtify/';
    }

    async getDatabase(): Promise<LocalDatabase> {
        const response = await fetch(endpoint(this.address, 'tracks'));
        if (!response.ok) {
            throw new Error(await readError(response));
        }
        const tracks = (await response.json()) as DowntifyTrack[];
        const tree: LibraryNode = {};
        for (const track of tracks) {
            if (typeof track.file !== 'string' || track.file.length === 0) {
                continue;
            }
            const title = track.title && track.title.length > 0 ? track.title : track.file.split('/').pop() || track.file;
            insertTrack(tree, track.file, {
                artist: track.artist ?? '',
                album: track.album ?? '',
                title,
                duration: typeof track.duration === 'number' ? track.duration : 0,
                trackIndex: typeof track.track_number === 'number' && track.track_number > 0 ? track.track_number : undefined,
            });
        }
        return tree as LocalDatabase;
    }

    async processLocalLibraryFile(filePath: string, params: AudioEncoderV1ExportParams): Promise<ArrayBuffer> {
        const exporter = serviceRegistry.audioExportService;
        if (!exporter) {
            throw new Error('No audio encoder is configured');
        }
        const response = await fetch(endpoint(this.address, `media/${encodeLibraryPath(filePath)}`));
        if (!response.ok) {
            throw new Error(await readError(response));
        }
        const blob = await readResponseBlob(response);
        const name = filePath.split('/').pop() || 'audio.bin';
        const bytes = new Uint8Array(await blob.arrayBuffer());
        // Upload flow already calls init(); calling again is safe for standalone use.
        await exporter.init();
        return (await exporter.transcode(bytes, name, params)).buffer;
    }

    async resolveUrl(url: string): Promise<DowntifyResolvedUrl> {
        const target = new URL(endpoint(this.address, 'api/url/resolve'));
        target.searchParams.set('url', url);
        const response = await fetch(target.toString());
        if (!response.ok) {
            throw new Error(await readError(response));
        }
        return (await response.json()) as DowntifyResolvedUrl;
    }

    async downloadTrackUrl(url: string, hints?: DowntifySong): Promise<void> {
        const target = new URL(endpoint(this.address, 'api/download/url'));
        target.searchParams.set('url', url);
        const response = await fetch(target.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(hints ?? {}),
        });
        if (!response.ok) {
            throw new Error(await readError(response));
        }
    }

    async downloadBatch(songs: DowntifySong[], playlistUrl: string, generateM3u = true): Promise<{ count: number }> {
        const response = await fetch(endpoint(this.address, 'api/download/batch'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                songs,
                playlist_url: playlistUrl,
                generate_m3u: generateM3u,
            }),
        });
        if (!response.ok) {
            throw new Error(await readError(response));
        }
        const body = (await response.json()) as { count?: number };
        return { count: typeof body.count === 'number' ? body.count : songs.length };
    }

    async listLibraryTracks(): Promise<DowntifyLibraryTrack[]> {
        const response = await fetch(endpoint(this.address, 'tracks'));
        if (!response.ok) {
            throw new Error(await readError(response));
        }
        const body = (await response.json()) as unknown;
        if (!Array.isArray(body)) {
            return [];
        }
        return body.flatMap((entry) => {
            if (!entry || typeof entry !== 'object') {
                return [];
            }
            const track = entry as Record<string, unknown>;
            if (typeof track.file !== 'string' || track.file.length === 0) {
                return [];
            }
            const playlists = Array.isArray(track.playlists)
                ? track.playlists.filter((name): name is string => typeof name === 'string' && name.length > 0)
                : [];
            return [
                {
                    file: track.file,
                    title: typeof track.title === 'string' && track.title.length > 0 ? track.title : track.file.split('/').pop() || track.file,
                    artist: typeof track.artist === 'string' ? track.artist : '',
                    album: typeof track.album === 'string' ? track.album : '',
                    albumArtist: typeof track.album_artist === 'string' ? track.album_artist : '',
                    trackNumber: typeof track.track_number === 'number' ? track.track_number : 0,
                    duration: typeof track.duration === 'number' ? track.duration : 0,
                    format: libraryFileFormat(track.file),
                    playlists,
                },
            ];
        });
    }

    async listPlaylists(): Promise<DowntifyPlaylist[]> {
        const response = await fetch(endpoint(this.address, 'playlists'));
        if (!response.ok) {
            throw new Error(await readError(response));
        }
        const body = (await response.json()) as unknown;
        if (!Array.isArray(body)) {
            return [];
        }
        return body.map((entry) => {
            const playlist = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
            const files = Array.isArray(playlist.files) ? playlist.files.filter((file): file is string => typeof file === 'string') : [];
            return {
                name: typeof playlist.name === 'string' && playlist.name.length > 0 ? playlist.name : 'Untitled playlist',
                files,
                count: typeof playlist.count === 'number' ? playlist.count : files.length,
                cover: typeof playlist.cover === 'string' ? playlist.cover : '',
                liked: playlist.liked === true,
            };
        });
    }

    async getQueue(): Promise<DowntifyQueueJob[]> {
        const response = await fetch(endpoint(this.address, 'api/queue'));
        if (!response.ok) {
            throw new Error(await readError(response));
        }
        const body = (await response.json()) as unknown;
        if (!Array.isArray(body)) {
            return [];
        }
        return body.map((entry) => normalizeQueueJob(entry));
    }

    async clearCompletedQueue(): Promise<void> {
        const response = await fetch(endpoint(this.address, 'api/queue/completed'), { method: 'DELETE' });
        if (!response.ok) {
            throw new Error(await readError(response));
        }
    }

    async removeQueueItem(songId: string): Promise<void> {
        const target = new URL(endpoint(this.address, 'api/queue/item'));
        target.searchParams.set('song_id', songId);
        const response = await fetch(target.toString(), { method: 'DELETE' });
        if (!response.ok) {
            throw new Error(await readError(response));
        }
    }

    async retryDownload(song: DowntifySong, youtubeUrl?: string): Promise<void> {
        const hints: DowntifySong = { ...song };
        let url = typeof song.url === 'string' ? song.url : '';
        if (youtubeUrl && youtubeUrl.trim().length > 0) {
            const videoId = youtubeVideoId(youtubeUrl.trim());
            if (!videoId) {
                throw new Error('Paste a single YouTube video URL. Playlists are not an alternate source for one track.');
            }
            hints.youtube_id = videoId;
            hints.youtube_id_override = true;
            if (!url) {
                url = `https://www.youtube.com/watch?v=${videoId}`;
            }
        }
        if (!url) {
            throw new Error('This queue item has no URL to retry.');
        }
        await this.downloadTrackUrl(url, hints);
    }

    async downloadAlbumUrl(url: string): Promise<void> {
        const target = new URL(endpoint(this.address, 'api/download/album'));
        target.searchParams.set('url', url);
        const response = await fetch(target.toString(), { method: 'POST' });
        if (!response.ok) {
            throw new Error(await readError(response));
        }
    }

    /**
     * Download a Spotify/YouTube track, album, or playlist the same way Downtify's UI does:
     * resolve the link, then either ``/api/download/url`` (single track) or
     * ``/api/download/batch`` (playlist / album track list).
     * The file format is Downtify's own server setting.
     */
    async downloadFromUrl(url: string): Promise<DowntifyDownloadResult> {
        const resolved = await this.resolveUrl(url);
        const kind = resolved.kind;
        const name = typeof resolved.name === 'string' ? resolved.name : '';
        const tracks = Array.isArray(resolved.tracks) ? resolved.tracks.filter((song) => song && typeof song === 'object') : [];

        if (kind === 'artist') {
            throw new Error('Artist links are not supported here. Paste a track, album, or playlist URL instead.');
        }

        if (kind === 'track' || (tracks.length === 1 && kind !== 'album' && kind !== 'playlist')) {
            const song = tracks[0];
            const trackUrl = (song && typeof song.url === 'string' && song.url) || url;
            await this.downloadTrackUrl(trackUrl, song);
            return {
                kind: 'track',
                name: name || (song && typeof song.name === 'string' ? song.name : ''),
                count: 1,
                queued: false,
            };
        }

        if (kind === 'album' || kind === 'playlist') {
            if (tracks.length === 0) {
                throw new Error(`No tracks found for this ${kind}`);
            }

            // YouTube Music album/browse URLs have a dedicated endpoint that keeps
            // shared album tags consistent across tracks.
            if (kind === 'album' && !isPlaylistUrl(url) && /youtube|youtu\.be/i.test(url) && /browse\/MPREb_|list=OLAK5uy_/i.test(url)) {
                await this.downloadAlbumUrl(url);
                return { kind: 'album', name, count: tracks.length, queued: false };
            }

            const playlistUrl = kind === 'playlist' || isPlaylistUrl(url) ? url : '';
            const songs = tracks.map((song, index) => ({
                ...song,
                downtify_playlist_url: playlistUrl || undefined,
                downtify_track_order: typeof song.downtify_track_order === 'number' ? song.downtify_track_order : index,
            }));
            const { count } = await this.downloadBatch(songs, playlistUrl, Boolean(playlistUrl));
            return {
                kind: kind === 'playlist' ? 'playlist' : 'album',
                name,
                count,
                queued: true,
            };
        }

        // Fallback: try the single-track endpoint (legacy behaviour).
        await this.downloadTrackUrl(url);
        return { kind: 'track', name, count: 1, queued: false };
    }

    static statusMessage(result: DowntifyDownloadResult): string {
        return formatDownloadStatus(result);
    }
}
