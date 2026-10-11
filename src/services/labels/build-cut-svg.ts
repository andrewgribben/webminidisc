import {
    A4LabelLayout,
    ALL_PARTS,
    LabelPartId,
    createA4LabelLayout,
    dogEarRectPath,
} from './a4-layout';

function escapeXml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function registrationMarkSvg(cx: number, cy: number, arm: number): string {
    return [
        `<g class="reg-mark" stroke="#000" stroke-width="0.2" fill="none">`,
        `<line x1="${cx - arm}" y1="${cy}" x2="${cx + arm}" y2="${cy}" />`,
        `<line x1="${cx}" y1="${cy - arm}" x2="${cx}" y2="${cy + arm}" />`,
        `<circle cx="${cx}" cy="${cy}" r="1.2" />`,
        `</g>`,
    ].join('');
}

export function buildCutSvg(parts: LabelPartId[] = ALL_PARTS, layout: A4LabelLayout = createA4LabelLayout()): string {
    const include = new Set(parts);
    const body: string[] = [];

    for (const mark of layout.marks) {
        body.push(registrationMarkSvg(mark.cx, mark.cy, mark.arm));
    }

    for (const id of ALL_PARTS) {
        if (!include.has(id)) {
            continue;
        }
        const part = layout.parts[id];
        const d = dogEarRectPath(part.cut, Boolean(part.dogEar));
        body.push(
            `<path id="cut-${escapeXml(id)}" class="cut-path" d="${d}" fill="none" stroke="#000" stroke-width="0.15" />`
        );
        if (part.spineFoldX !== undefined) {
            const x = part.cut.x + part.spineFoldX;
            body.push(
                `<line id="score-${escapeXml(id)}" class="score-path" x1="${x}" y1="${part.cut.y}" x2="${x}" y2="${
                    part.cut.y + part.cut.height
                }" fill="none" stroke="#000" stroke-width="0.12" stroke-dasharray="1 0.8" />`
            );
        }
    }

    return [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.page.width}mm" height="${layout.page.height}mm" viewBox="0 0 ${layout.page.width} ${layout.page.height}">`,
        `<title>MiniDisc label cut paths (A4)</title>`,
        `<desc>Cut strokes aligned to matching art PDF. Units are millimetres.</desc>`,
        ...body,
        `</svg>`,
        ``,
    ].join('\n');
}
