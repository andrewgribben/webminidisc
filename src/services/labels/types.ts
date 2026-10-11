import { LabelPartId } from './a4-layout';

export type LabelArtMode = 'album' | 'typographic';

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

/** Flat colour theme for typographic labels (Nothing / TE inspired). */
export interface LabelTheme {
    id: string;
    name: string;
    background: string;
    text: string;
    accent: string;
}

export interface LabelPackInput {
    disc: LabelDiscInfo;
    artMode: LabelArtMode;
    theme: LabelTheme;
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
    artMode: LabelArtMode;
    theme: LabelTheme;
}

export interface CachedLabelPack {
    fingerprint: string;
    artMode: LabelArtMode;
    theme: LabelTheme;
    createdAt: number;
    artPdf: ArrayBuffer;
    cutSvg: string;
}
