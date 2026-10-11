/** Shared A4 layout in millimetres. Origin is top-left; +y downward (SVG style). */

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const BLEED_MM = 2;
export const DOG_EAR_MM = 2.5;
export const BOX_SPINE_MM = 5;

/** Cut sizes (Sony / MiniDisc Wiki). */
export const FACE_CUT = { width: 35.75, height: 52.75 } as const;
export const EDGE_CUT = { width: 59, height: 3.75 } as const;
export const BOX_CUT = { width: 68.5, height: 63.5 } as const;

export type LabelPartId = 'face' | 'edge' | 'box';

export interface RectMm {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface LabelPartLayout {
    id: LabelPartId;
    cut: RectMm;
    /** Artwork rectangle = cut expanded by bleed on all sides. */
    bleed: RectMm;
    /** Optional dog-ear cut from the top-right of the cut rect. */
    dogEar?: boolean;
    /** Optional vertical spine fold score (mm from cut.x). */
    spineFoldX?: number;
}

export interface RegistrationMark {
    cx: number;
    cy: number;
    arm: number;
}

export interface A4LabelLayout {
    page: { width: number; height: number };
    parts: Record<LabelPartId, LabelPartLayout>;
    marks: RegistrationMark[];
}

function withBleed(cut: RectMm, bleed: number): RectMm {
    return {
        x: cut.x - bleed,
        y: cut.y - bleed,
        width: cut.width + bleed * 2,
        height: cut.height + bleed * 2,
    };
}

/**
 * Fixed A4 placement: face top-left, edge under face, box to the right.
 * Positions stay constant for full-pack and per-part exports.
 */
export function createA4LabelLayout(): A4LabelLayout {
    const faceCut: RectMm = { x: 22, y: 28, width: FACE_CUT.width, height: FACE_CUT.height };
    const edgeCut: RectMm = { x: 22, y: 28 + FACE_CUT.height + 12, width: EDGE_CUT.width, height: EDGE_CUT.height };
    const boxCut: RectMm = { x: 22 + FACE_CUT.width + 18, y: 28, width: BOX_CUT.width, height: BOX_CUT.height };

    const parts: Record<LabelPartId, LabelPartLayout> = {
        face: {
            id: 'face',
            cut: faceCut,
            bleed: withBleed(faceCut, BLEED_MM),
            dogEar: true,
        },
        edge: {
            id: 'edge',
            cut: edgeCut,
            bleed: withBleed(edgeCut, BLEED_MM),
        },
        box: {
            id: 'box',
            cut: boxCut,
            bleed: withBleed(boxCut, BLEED_MM),
            dogEar: true,
            spineFoldX: BOX_SPINE_MM,
        },
    };

    const marks: RegistrationMark[] = [
        { cx: 10, cy: 10, arm: 4 },
        { cx: A4_WIDTH_MM - 10, cy: 10, arm: 4 },
        { cx: 10, cy: A4_HEIGHT_MM - 10, arm: 4 },
        { cx: A4_WIDTH_MM - 10, cy: A4_HEIGHT_MM - 10, arm: 4 },
        { cx: A4_WIDTH_MM / 2, cy: 10, arm: 3 },
        { cx: A4_WIDTH_MM / 2, cy: A4_HEIGHT_MM - 10, arm: 3 },
    ];

    return {
        page: { width: A4_WIDTH_MM, height: A4_HEIGHT_MM },
        parts,
        marks,
    };
}

/** SVG path for a rectangle with optional top-right dog-ear (cut coordinates). */
export function dogEarRectPath(cut: RectMm, dogEar: boolean, ear = DOG_EAR_MM): string {
    const { x, y, width, height } = cut;
    if (!dogEar) {
        return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
    }
    return [
        `M ${x} ${y}`,
        `H ${x + width - ear}`,
        `L ${x + width} ${y + ear}`,
        `V ${y + height}`,
        `H ${x}`,
        `Z`,
    ].join(' ');
}

/** Convert top-left mm Y to PDF bottom-left points Y for a point. */
export function mmToPdfPoints(layout: A4LabelLayout, xMm: number, yMm: number): { x: number; y: number } {
    const ptPerMm = 72 / 25.4;
    return {
        x: xMm * ptPerMm,
        y: (layout.page.height - yMm) * ptPerMm,
    };
}

export function mmSizeToPdfPoints(widthMm: number, heightMm: number): { width: number; height: number } {
    const ptPerMm = 72 / 25.4;
    return { width: widthMm * ptPerMm, height: heightMm * ptPerMm };
}

export const ALL_PARTS: LabelPartId[] = ['face', 'edge', 'box'];
