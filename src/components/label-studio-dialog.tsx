import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DownloadIcon from '@mui/icons-material/Download';
import JSZip from 'jszip';
import { useShallowEqualSelector } from '../frontend-utils';
import { downloadBlob, formatTimeFromSeconds, getTracks } from '../utils';
import { Disc } from '../services/interfaces/netmd';
import { ALL_PARTS, LabelPartId, discToLabelInfo, ensureLabelPack } from '../services/labels/label-pack';
import { FACE_CUT, EDGE_CUT, BOX_CUT } from '../services/labels/a4-layout';
import { DEFAULT_LABEL_THEME, LABEL_THEMES, customTheme } from '../services/labels/themes';
import { DEMO_ALBUM_COVER_URL, DEMO_ALBUM_DISC, DEMO_MIX_DISC, loadDemoAlbumCover } from '../services/labels/demo-disc';
import { LabelArtMode, LabelTheme } from '../services/labels/types';

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

export type LabelStudioDemoKind = 'mix' | 'album';

export function LabelStudioDialog({
    open,
    onClose,
    designMode = false,
}: {
    open: boolean;
    onClose: () => void;
    /** When true, use dummy disc data (no NetMD). Open via ?labels=design */
    designMode?: boolean;
}) {
    const liveDisc = useShallowEqualSelector((state) => state.main.disc);
    const liveCoverUrl = useShallowEqualSelector((state) => state.discLibrary.coverUrl);
    const libraryTitle = useShallowEqualSelector((state) => state.discLibrary.title);

    const [demoKind, setDemoKind] = useState<LabelStudioDemoKind>('mix');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [artMode, setArtMode] = useState<LabelArtMode>('typographic');
    const [theme, setTheme] = useState<LabelTheme>(DEFAULT_LABEL_THEME);
    const [customBg, setCustomBg] = useState('#F7F5F0');
    const [customText, setCustomText] = useState('#111111');
    const [forceTypographic, setForceTypographic] = useState(false);
    const [artPdf, setArtPdf] = useState<Uint8Array | null>(null);
    const [cutSvg, setCutSvg] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [demoCover, setDemoCover] = useState<{ bytes: Uint8Array; mime: string } | null>(null);

    const disc: Disc | null = designMode ? (demoKind === 'album' ? DEMO_ALBUM_DISC : DEMO_MIX_DISC) : liveDisc;
    const coverUrl = designMode ? null : liveCoverUrl;

    const labelDisc = useMemo(
        () => (disc ? discToLabelInfo(disc, designMode ? disc.title : libraryTitle) : null),
        [designMode, disc, libraryTitle]
    );
    const trackCount = disc ? getTracks(disc).length : 0;

    const activeTheme = theme.id === 'custom' ? customTheme(customBg, customText) : theme;

    useEffect(() => {
        if (!pdfUrl) {
            return;
        }
        return () => URL.revokeObjectURL(pdfUrl);
    }, [pdfUrl]);

    useEffect(() => {
        if (!designMode || demoKind !== 'album') {
            setDemoCover(null);
            return;
        }
        let cancelled = false;
        void loadDemoAlbumCover()
            .then((cover) => {
                if (!cancelled) {
                    setDemoCover(cover);
                }
            })
            .catch((reason: unknown) => {
                if (!cancelled) {
                    setDemoCover(null);
                    setError(reason instanceof Error ? reason.message : 'Could not load demo album cover.');
                }
            });
        return () => {
            cancelled = true;
        };
    }, [designMode, demoKind]);

    const generate = useCallback(
        async (opts: { forceRegenerate?: boolean; forceTypographic?: boolean; theme?: LabelTheme } = {}) => {
            if (!disc) {
                setError('Connect a disc before generating labels.');
                return;
            }
            const useTypographic = opts.forceTypographic ?? forceTypographic;
            const wantsAlbumDemo = designMode && demoKind === 'album' && !useTypographic;
            if (wantsAlbumDemo && !demoCover) {
                return;
            }
            setLoading(true);
            setError('');
            try {
                const result = await ensureLabelPack({
                    disc,
                    libraryTitle: designMode ? disc.title : libraryTitle,
                    coverUrl: designMode ? (demoCover ? DEMO_ALBUM_COVER_URL : null) : coverUrl,
                    coverBytes: designMode ? demoCover?.bytes ?? null : null,
                    coverMime: designMode ? demoCover?.mime ?? null : null,
                    theme: opts.theme ?? activeTheme,
                    forceRegenerate: opts.forceRegenerate ?? true,
                    forceTypographic: useTypographic || (designMode && demoKind === 'mix'),
                    skipCache: designMode,
                    parts: ALL_PARTS,
                });
                setArtPdf(result.artPdf);
                setCutSvg(result.cutSvg);
                setArtMode(result.artMode);
                setTheme(result.theme.id === 'custom' ? theme : result.theme);
                setStatus(result.fromCache ? 'Loaded from cache' : designMode ? 'Design preview' : 'Generated');
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
        [activeTheme, coverUrl, demoCover, demoKind, designMode, disc, forceTypographic, libraryTitle, theme]
    );

    useEffect(() => {
        if (!open) {
            return;
        }
        if (designMode) {
            setForceTypographic(demoKind === 'mix');
            setTheme(DEFAULT_LABEL_THEME);
        } else {
            setForceTypographic(false);
        }
        void generate({ forceRegenerate: true, forceTypographic: designMode ? demoKind === 'mix' : false });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- open / designKind / demo cover drive regeneration
    }, [open, designMode, demoKind, demoCover]);

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
                libraryTitle: designMode ? disc.title : libraryTitle,
                coverUrl: designMode ? (demoCover ? DEMO_ALBUM_COVER_URL : null) : coverUrl,
                coverBytes: designMode ? demoCover?.bytes ?? null : null,
                coverMime: designMode ? demoCover?.mime ?? null : null,
                theme: activeTheme,
                forceRegenerate: true,
                forceTypographic: forceTypographic || artMode === 'typographic',
                skipCache: designMode,
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

    const applyTheme = (next: LabelTheme) => {
        setTheme(next);
        void generate({ forceRegenerate: true, theme: next.id === 'custom' ? customTheme(customBg, customText) : next });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>{designMode ? 'Label Studio · design mode' : 'Label Studio'}</DialogTitle>
            <DialogContent dividers>
                {!disc ? (
                    <Typography color="error">No disc loaded.</Typography>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: '240px 1fr 220px' },
                            gap: 2,
                            minHeight: 420,
                        }}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Typography variant="overline" color="text.secondary">
                                Style
                            </Typography>
                            {designMode ? (
                                <FormControl size="small" fullWidth>
                                    <InputLabel id="demo-kind-label">Demo disc</InputLabel>
                                    <Select
                                        labelId="demo-kind-label"
                                        label="Demo disc"
                                        value={demoKind}
                                        onChange={(e) => setDemoKind(e.target.value as LabelStudioDemoKind)}
                                    >
                                        <MenuItem value="mix">Mix disc (typographic)</MenuItem>
                                        <MenuItem value="album">Album disc (MusicBrainz cover)</MenuItem>
                                    </Select>
                                </FormControl>
                            ) : null}
                            <Typography variant="body2">
                                <strong>Source:</strong>{' '}
                                {artMode === 'album'
                                    ? 'Saved album art (MusicBrainz / library)'
                                    : 'Typographic (mix disc — no album art)'}
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
                            {artMode === 'album' ? (
                                <Typography variant="caption" color="text.secondary">
                                    Face: tracklist on cover · Edge: title on cover · Box: cover only
                                </Typography>
                            ) : null}

                            {(artMode === 'typographic' || forceTypographic) && (
                                <>
                                    <Typography variant="caption" color="text.secondary">
                                        Theme (Nothing / TE)
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                        {LABEL_THEMES.map((preset) => (
                                            <Button
                                                key={preset.id}
                                                size="small"
                                                variant={theme.id === preset.id ? 'contained' : 'outlined'}
                                                onClick={() => applyTheme(preset)}
                                                sx={{
                                                    justifyContent: 'flex-start',
                                                    textTransform: 'none',
                                                    gap: 1,
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <Box sx={{ width: 14, height: 14, bgcolor: preset.background, border: '1px solid #ccc' }} />
                                                    <Box sx={{ width: 14, height: 14, bgcolor: preset.text }} />
                                                    <Box sx={{ width: 14, height: 14, bgcolor: preset.accent }} />
                                                </Box>
                                                {preset.name}
                                            </Button>
                                        ))}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Custom colours
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <TextField
                                            label="Background"
                                            size="small"
                                            type="color"
                                            value={customBg}
                                            onChange={(e) => setCustomBg(e.target.value)}
                                            sx={{ flex: 1 }}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                        <TextField
                                            label="Text"
                                            size="small"
                                            type="color"
                                            value={customText}
                                            onChange={(e) => setCustomText(e.target.value)}
                                            sx={{ flex: 1 }}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Box>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => applyTheme(customTheme(customBg, customText))}
                                    >
                                        Apply custom colours
                                    </Button>
                                </>
                            )}

                            {!designMode && coverUrl ? (
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={forceTypographic}
                                            onChange={(_, checked) => {
                                                setForceTypographic(checked);
                                                void generate({ forceRegenerate: true, forceTypographic: checked });
                                            }}
                                        />
                                    }
                                    label="Typographic instead of album art"
                                />
                            ) : null}

                            <Button
                                variant="contained"
                                disabled={loading}
                                onClick={() => void generate({ forceRegenerate: true })}
                            >
                                Refresh preview
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
