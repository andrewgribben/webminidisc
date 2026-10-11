import { Disc } from '../interfaces/netmd';
import { discSignature, libraryAssetUrl } from '../md-library';
import { getTracks } from '../../utils';
import { ALL_PARTS, LabelPartId, createA4LabelLayout } from './a4-layout';
import { buildArtPdf } from './build-art-pdf';
import { buildCutSvg } from './build-cut-svg';
import { hashStringToSeed, paletteFromSeed, randomSeed } from './generative-art';
import { getCachedLabelPack, putCachedLabelPack } from './label-cache';
import { LabelArtMode, LabelDiscInfo, LabelPackArtifacts, LabelPackInput } from './types';

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
    seed: number,
    coverUrl: string | null,
    parts: LabelPartId[]
): Promise<string> {
    const raw = [
        artMode,
        String(seed),
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
    /** Force generative even if cover exists. */
    forceGenerative?: boolean;
    seed?: number;
    parts?: LabelPartId[];
    /** When true, ignore cache and regenerate. */
    forceRegenerate?: boolean;
}

export async function ensureLabelPack(options: EnsureLabelPackOptions): Promise<LabelPackArtifacts & { fromCache: boolean }> {
    const parts = options.parts?.length ? options.parts : ALL_PARTS;
    const labelDisc = discToLabelInfo(options.disc, options.libraryTitle);
    const signature = await discSignature(options.disc);

    let cover = options.forceGenerative ? null : await fetchCoverBytes(options.coverUrl);
    const artMode: LabelArtMode = cover ? 'album' : 'generative';
    const seed =
        options.seed ??
        (artMode === 'generative' ? hashStringToSeed(`${signature}:${labelDisc.title}`) : 0);

    const fingerprint = await fingerprintLabelPack(labelDisc, artMode, seed, options.coverUrl, parts);

    if (!options.forceRegenerate) {
        const cached = await getCachedLabelPack(signature);
        if (cached && cached.fingerprint === fingerprint) {
            return {
                artPdf: new Uint8Array(cached.artPdf),
                cutSvg: cached.cutSvg,
                fingerprint: cached.fingerprint,
                seed: cached.seed,
                artMode: cached.artMode,
                palette: cached.palette,
                fromCache: true,
            };
        }
    }

    // If album mode requested cover but fetch failed mid-flight, fall back to generative.
    if (artMode === 'album' && !cover) {
        cover = null;
    }
    const effectiveMode: LabelArtMode = cover ? 'album' : 'generative';
    const effectiveSeed = effectiveMode === 'generative' ? seed || randomSeed() : seed;
    const palette = paletteFromSeed(effectiveSeed || hashStringToSeed(labelDisc.title));

    const input: LabelPackInput = {
        disc: labelDisc,
        artMode: effectiveMode,
        seed: effectiveSeed,
        coverBytes: cover?.bytes ?? null,
        coverMime: cover?.mime ?? null,
        parts,
    };

    const layout = createA4LabelLayout();
    const artPdf = await buildArtPdf(input, palette, layout);
    const cutSvg = buildCutSvg(parts, layout);
    const finalFingerprint = await fingerprintLabelPack(
        labelDisc,
        effectiveMode,
        effectiveSeed,
        options.coverUrl,
        parts
    );

    const artPdfCopy = artPdf.slice().buffer as ArrayBuffer;
    await putCachedLabelPack(signature, {
        fingerprint: finalFingerprint,
        seed: effectiveSeed,
        artMode: effectiveMode,
        createdAt: Date.now(),
        artPdf: artPdfCopy,
        cutSvg,
        palette,
    });

    return {
        artPdf,
        cutSvg,
        fingerprint: finalFingerprint,
        seed: effectiveSeed,
        artMode: effectiveMode,
        palette,
        fromCache: false,
    };
}

export function defaultSeedForDisc(disc: Disc, title?: string | null): Promise<number> {
    return discSignature(disc).then((sig) => hashStringToSeed(`${sig}:${title || disc.title || ''}`));
}

export { randomSeed, ALL_PARTS };
export type { LabelPartId };
