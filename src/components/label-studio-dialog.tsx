import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import JSZip from 'jszip';
import { useShallowEqualSelector } from '../frontend-utils';
import { downloadBlob, formatTimeFromSeconds, getTracks } from '../utils';
import {
    ALL_PARTS,
    LabelPartId,
    discToLabelInfo,
    ensureLabelPack,
    randomSeed,
} from '../services/labels/label-pack';
import { FACE_CUT, EDGE_CUT, BOX_CUT } from '../services/labels/a4-layout';
import { LabelArtMode, LabelPalette } from '../services/labels/types';

function asBlobPart(bytes: Uint8Array): BlobPart {
    return bytes.slice().buffer as ArrayBuffer;
}

function partSizeLabel(id: LabelPartId): string {
    if (id === 'face') {
        return `${FACE_CUT.width} × ${FACE_CUT.height} mm`;
    }
    if (id === 'edge') {
        return `${EDGE_CUT.width} × ${EDGE_CUT.height} mm`;
    }
    return `${BOX_CUT.width} × ${BOX_CUT.height} mm`;
}

function partTitle(id: LabelPartId): string {
    if (id === 'face') {
        return 'Main cartridge';
    }
    if (id === 'edge') {
        return 'Edge spine';
    }
    return 'Box / case';
}

export function LabelStudioDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const disc = useShallowEqualSelector((state) => state.main.disc);
    const coverUrl = useShallowEqualSelector((state) => state.discLibrary.coverUrl);
    const libraryTitle = useShallowEqualSelector((state) => state.discLibrary.title);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [seed, setSeed] = useState(0);
    const [artMode, setArtMode] = useState<LabelArtMode>('generative');
    const [palette, setPalette] = useState<LabelPalette | null>(null);
    const [artPdf, setArtPdf] = useState<Uint8Array | null>(null);
    const [cutSvg, setCutSvg] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [forceGenerative, setForceGenerative] = useState(false);

    const labelDisc = useMemo(() => (disc ? discToLabelInfo(disc, libraryTitle) : null), [disc, libraryTitle]);
    const trackCount = disc ? getTracks(disc).length : 0;

    useEffect(() => {
        if (!pdfUrl) {
            return;
        }
        return () => URL.revokeObjectURL(pdfUrl);
    }, [pdfUrl]);

    const generate = useCallback(
        async (opts: { seed?: number; forceRegenerate?: boolean; forceGenerative?: boolean }) => {
            if (!disc) {
                setError('Connect a disc before generating labels.');
                return;
            }
            setLoading(true);
            setError('');
            try {
                const result = await ensureLabelPack({
                    disc,
                    libraryTitle,
                    coverUrl,
                    seed: opts.seed,
                    forceRegenerate: opts.forceRegenerate,
                    forceGenerative: opts.forceGenerative ?? forceGenerative,
                    parts: ALL_PARTS,
                });
                setArtPdf(result.artPdf);
                setCutSvg(result.cutSvg);
                setSeed(result.seed);
                setArtMode(result.artMode);
                setPalette(result.palette);
                setStatus(result.fromCache ? 'Loaded from cache' : 'Generated');
                const url = URL.createObjectURL(new Blob([asBlobPart(result.artPdf)], { type: 'application/pdf' }));
                setPdfUrl((prev) => {
                    if (prev) {
                        URL.revokeObjectURL(prev);
                    }
                    return url;
                });
            } catch (reason: unknown) {
                setError(reason instanceof Error ? reason.message : 'Label generation failed.');
            } finally {
                setLoading(false);
            }
        },
        [coverUrl, disc, forceGenerative, libraryTitle]
    );

    useEffect(() => {
        if (!open) {
            return;
        }
        setForceGenerative(false);
        void generate({});
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- regenerate only on open

    const downloadArtPdf = () => {
        if (!artPdf) {
            return;
        }
        const base = (labelDisc?.title || 'minidisc').replace(/[^\w\-]+/g, '_').slice(0, 48);
        downloadBlob(new Blob([asBlobPart(artPdf)], { type: 'application/pdf' }), `${base}-labels-art.pdf`);
    };

    const downloadCutSvg = () => {
        if (!cutSvg) {
            return;
        }
        const base = (labelDisc?.title || 'minidisc').replace(/[^\w\-]+/g, '_').slice(0, 48);
        downloadBlob(new Blob([cutSvg], { type: 'image/svg+xml' }), `${base}-labels-cut.svg`);
    };

    const downloadPackZip = async () => {
        if (!artPdf || !cutSvg) {
            return;
        }
        const base = (labelDisc?.title || 'minidisc').replace(/[^\w\-]+/g, '_').slice(0, 48);
        const zip = new JSZip();
        zip.file(`${base}-labels-art.pdf`, artPdf.slice());
        zip.file(`${base}-labels-cut.svg`, cutSvg);
        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, `${base}-label-pack.zip`);
    };

    const exportPart = async (part: LabelPartId) => {
        if (!disc) {
            return;
        }
        setLoading(true);
        setError('');
        try {
            const result = await ensureLabelPack({
                disc,
                libraryTitle,
                coverUrl,
                seed,
                forceRegenerate: true,
                forceGenerative: forceGenerative || artMode === 'generative',
                parts: [part],
            });
            const base = (labelDisc?.title || 'minidisc').replace(/[^\w\-]+/g, '_').slice(0, 48);
            downloadBlob(new Blob([asBlobPart(result.artPdf)], { type: 'application/pdf' }), `${base}-${part}-art.pdf`);
            downloadBlob(new Blob([result.cutSvg], { type: 'image/svg+xml' }), `${base}-${part}-cut.svg`);
        } catch (reason: unknown) {
            setError(reason instanceof Error ? reason.message : 'Export failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>Label Studio</DialogTitle>
            <DialogContent dividers>
                {!disc ? (
                    <Typography color="error">No disc loaded.</Typography>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: '220px 1fr 220px' },
                            gap: 2,
                            minHeight: 420,
                        }}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Typography variant="overline" color="text.secondary">
                                Generative rules
                            </Typography>
                            <Typography variant="body2">
                                <strong>Source:</strong>{' '}
                                {coverUrl && !forceGenerative && artMode === 'album'
                                    ? 'Album art + tracklist'
                                    : coverUrl && forceGenerative
                                      ? 'Generative (album art available)'
                                      : 'Track metadata (no album art)'}
                            </Typography>
                            <Typography variant="subtitle1">{labelDisc?.title}</Typography>
                            {labelDisc?.artist ? (
                                <Typography variant="body2" color="text.secondary">
                                    {labelDisc.artist}
                                </Typography>
                            ) : null}
                            <Typography variant="body2" color="text.secondary">
                                {trackCount} tracks · {formatTimeFromSeconds(labelDisc?.totalDurationSec ?? 0, false)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Mode: {artMode}
                                {status ? ` · ${status}` : ''}
                            </Typography>
                            {palette ? (
                                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                                    {palette.colors.map((color) => (
                                        <Box
                                            key={color}
                                            title={color}
                                            sx={{
                                                width: 28,
                                                height: 28,
                                                bgcolor: color,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                            }}
                                        />
                                    ))}
                                </Box>
                            ) : null}
                            {(artMode === 'generative' || forceGenerative || !coverUrl) && (
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <TextField
                                        label="Seed"
                                        size="small"
                                        value={seed || ''}
                                        onChange={(e) => setSeed(Number(e.target.value) || 0)}
                                        inputProps={{ inputMode: 'numeric' }}
                                        fullWidth
                                    />
                                    <IconButton
                                        aria-label="New seed"
                                        onClick={() => {
                                            const next = randomSeed();
                                            setSeed(next);
                                            setForceGenerative(true);
                                            void generate({ seed: next, forceRegenerate: true, forceGenerative: true });
                                        }}
                                    >
                                        <RefreshIcon />
                                    </IconButton>
                                </Box>
                            )}
                            {coverUrl ? (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        const next = forceGenerative ? false : true;
                                        setForceGenerative(next);
                                        void generate({
                                            seed: next ? seed || randomSeed() : undefined,
                                            forceRegenerate: true,
                                            forceGenerative: next,
                                        });
                                    }}
                                >
                                    {forceGenerative ? 'Use album art' : 'Use generative art'}
                                </Button>
                            ) : null}
                            <Button
                                variant="contained"
                                disabled={loading}
                                onClick={() =>
                                    void generate({
                                        seed: artMode === 'generative' || forceGenerative ? seed || randomSeed() : seed,
                                        forceRegenerate: true,
                                        forceGenerative,
                                    })
                                }
                            >
                                Regenerate
                            </Button>
                            {loading ? <CircularProgress size={28} /> : null}
                            {error ? (
                                <Typography color="error" variant="body2">
                                    {error}
                                </Typography>
                            ) : null}
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="overline" color="text.secondary">
                                A4 preview (art PDF)
                            </Typography>
                            <Box
                                sx={{
                                    flex: 1,
                                    minHeight: 360,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'grey.100',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                }}
                            >
                                {pdfUrl ? (
                                    <Box
                                        component="iframe"
                                        title="Label art PDF preview"
                                        src={pdfUrl}
                                        sx={{ width: '100%', height: 420, border: 0 }}
                                    />
                                ) : (
                                    <Typography color="text.secondary">No preview yet</Typography>
                                )}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                {ALL_PARTS.map((id) => (
                                    <Typography key={id} variant="caption" color="text.secondary">
                                        {partTitle(id)}: {partSizeLabel(id)}
                                    </Typography>
                                ))}
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Typography variant="overline" color="text.secondary">
                                Export
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Art PDF (A4, with bleed) + cut SVG (aligned marks). Print at 100% scale.
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<DownloadIcon />}
                                disabled={!artPdf || loading}
                                onClick={() => void downloadPackZip()}
                            >
                                Download pack (ZIP)
                            </Button>
                            <Button variant="outlined" disabled={!artPdf || loading} onClick={downloadArtPdf}>
                                Art PDF
                            </Button>
                            <Button variant="outlined" disabled={!cutSvg || loading} onClick={downloadCutSvg}>
                                Cut SVG
                            </Button>
                            {ALL_PARTS.map((id) => (
                                <Button
                                    key={id}
                                    size="small"
                                    variant="outlined"
                                    disabled={loading || !disc}
                                    onClick={() => void exportPart(id)}
                                >
                                    Export {partTitle(id)}
                                </Button>
                            ))}
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
