import { Disc } from '../interfaces/netmd';
import { discSignature, libraryAssetUrl } from '../md-library';
import { getTracks } from '../../utils';
import { ALL_PARTS, LabelPartId, createA4LabelLayout } from './a4-layout';
import { buildArtPdf } from './build-art-pdf';
import { buildCutSvg } from './build-cut-svg';
import { getCachedLabelPack, putCachedLabelPack } from './label-cache';
import { DEFAULT_LABEL_THEME } from './themes';
import { LabelArtMode, LabelDiscInfo, LabelPackArtifacts, LabelPackInput, LabelTheme } from './types';

export function discToLabelInfo(disc: Disc, libraryTitle?: string | null): LabelDiscInfo {
    const tracks = getTracks(disc).map((track) => ({
        index: track.index,
        title: track.fullWidthTitle || track.title || 'Untitled',
        durationSec: track.duration,
    }));
    const artists = getTracks(disc)
        .map((t) => t.artist)
        .filter((a): a is string => Boolean(a && a.trim()));
    const uniqueArtists = [...new Set(artists)];
    const artist =
        uniqueArtists.length === 1 ? uniqueArtists[0] : uniqueArtists.length > 1 ? 'Various Artists' : null;
    const title = (libraryTitle || disc.fullWidthTitle || disc.title || 'Untitled Disc').trim() || 'Untitled Disc';
    const totalDurationSec = tracks.reduce((sum, t) => sum + t.durationSec, 0);
    return { title, artist, tracks, totalDurationSec };
}

export async function fingerprintLabelPack(
    disc: LabelDiscInfo,
    artMode: LabelArtMode,
    theme: LabelTheme,
    coverUrl: string | null,
    parts: LabelPartId[]
): Promise<string> {
    const raw = [
        artMode,
        theme.id,
        theme.background,
        theme.text,
        theme.accent,
        coverUrl ?? '',
        parts.slice().sort().join(','),
        disc.title,
        disc.artist ?? '',
        ...disc.tracks.map((t) => `${t.index}:${t.title}:${Math.round(t.durationSec * 1000)}`),
    ].join('\n');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function fetchCoverBytes(coverUrl: string | null): Promise<{ bytes: Uint8Array; mime: string } | null> {
    const url = libraryAssetUrl(coverUrl) ?? coverUrl;
    if (!url) {
        return null;
    }
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return null;
        }
        const mime = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();
        return { bytes: new Uint8Array(buffer), mime };
    } catch {
        return null;
    }
}

export interface EnsureLabelPackOptions {
    disc: Disc;
    libraryTitle?: string | null;
    coverUrl: string | null;
    /** Optional preloaded cover (design mode / tests) — skips network fetch. */
    coverBytes?: Uint8Array | null;
    coverMime?: string | null;
    /** Force typographic style even if cover exists. */
    forceTypographic?: boolean;
    theme?: LabelTheme;
    parts?: LabelPartId[];
    /** When true, ignore cache and regenerate. */
    forceRegenerate?: boolean;
    /** Bypass IndexedDB (design mode). */
    skipCache?: boolean;
}

export async function ensureLabelPack(options: EnsureLabelPackOptions): Promise<LabelPackArtifacts & { fromCache: boolean }> {
    const parts = options.parts?.length ? options.parts : ALL_PARTS;
    const labelDisc = discToLabelInfo(options.disc, options.libraryTitle);
    const signature = await discSignature(options.disc);
    const theme = options.theme ?? DEFAULT_LABEL_THEME;

    const hasCoverSource = Boolean(options.coverBytes?.length || options.coverUrl);
    const wantsAlbumArt = hasCoverSource && !options.forceTypographic;
    let cover: { bytes: Uint8Array; mime: string } | null = null;
    if (wantsAlbumArt) {
        if (options.coverBytes?.length) {
            cover = { bytes: options.coverBytes, mime: options.coverMime || 'image/png' };
        } else {
            cover = await fetchCoverBytes(options.coverUrl);
        }
    }
    if (wantsAlbumArt && !cover) {
        throw new Error(
            'Could not load album art for labels. The cover may be blocked or missing from the library — try Match album again, or use typographic style.'
        );
    }

    const artMode: LabelArtMode = cover ? 'album' : 'typographic';
    const fingerprint = await fingerprintLabelPack(labelDisc, artMode, theme, options.coverUrl, parts);

    if (!options.forceRegenerate && !options.skipCache) {
        const cached = await getCachedLabelPack(signature);
        if (cached && cached.fingerprint === fingerprint) {
            return {
                artPdf: new Uint8Array(cached.artPdf),
                cutSvg: cached.cutSvg,
                fingerprint: cached.fingerprint,
                artMode: cached.artMode,
                theme: cached.theme,
                fromCache: true,
            };
        }
    }

    const input: LabelPackInput = {
        disc: labelDisc,
        artMode,
        theme,
        coverBytes: cover?.bytes ?? null,
        coverMime: cover?.mime ?? null,
        parts,
    };

    const layout = createA4LabelLayout();
    const artPdf = await buildArtPdf(input, layout);
    const cutSvg = buildCutSvg(parts, layout);
    const finalFingerprint = await fingerprintLabelPack(labelDisc, artMode, theme, options.coverUrl, parts);

    if (!options.skipCache) {
        const artPdfCopy = artPdf.slice().buffer as ArrayBuffer;
        await putCachedLabelPack(signature, {
            fingerprint: finalFingerprint,
            artMode,
            theme,
            createdAt: Date.now(),
            artPdf: artPdfCopy,
            cutSvg,
        });
    }

    return {
        artPdf,
        cutSvg,
        fingerprint: finalFingerprint,
        artMode,
        theme,
        fromCache: false,
    };
}

export { ALL_PARTS };
export type { LabelPartId };
