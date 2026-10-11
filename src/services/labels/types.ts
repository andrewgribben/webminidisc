import { LabelPartId } from './a4-layout';

export type LabelArtMode = 'album' | 'generative';

export interface LabelTrackInfo {
    index: number;
    title: string;
    durationSec: number;
}

export interface LabelDiscInfo {
    title: string;
    artist: string | null;
    tracks: LabelTrackInfo[];
    totalDurationSec: number;
}

export interface LabelPalette {
    colors: [string, string, string, string];
}

export interface LabelPackInput {
    disc: LabelDiscInfo;
    artMode: LabelArtMode;
    seed: number;
    /** Cover image bytes when artMode is album (JPEG/PNG). */
    coverBytes: Uint8Array | null;
    coverMime: string | null;
    /** Which parts to draw on the sheet (positions always fixed). */
    parts: LabelPartId[];
}

export interface LabelPackArtifacts {
    artPdf: Uint8Array;
    cutSvg: string;
    fingerprint: string;
    seed: number;
    artMode: LabelArtMode;
    palette: LabelPalette;
}

export interface CachedLabelPack {
    fingerprint: string;
    seed: number;
    artMode: LabelArtMode;
    createdAt: number;
    artPdf: ArrayBuffer;
    cutSvg: string;
    palette: LabelPalette;
}
