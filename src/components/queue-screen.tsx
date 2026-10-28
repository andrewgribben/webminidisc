import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { makeStyles } from 'tss-react/mui';
import { DowntifyLibraryService, DowntifyQueueJob, queueSongId } from '../services/library/downtify-library';
import { getDowntifyLibrary } from '../services/library/downtify-client';
import { DeckPanel, HardwareButton, MeterBar, StatusStrip, deckTokens } from './deck-ui';

const useStyles = makeStyles()(() => ({
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 0,
        flex: 1,
        height: '100%',
    },
    form: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'flex-end',
    },
    urlField: {
        flex: '1 1 280px',
        '& .MuiInputBase-root': {
            fontFamily: deckTokens.fontSans,
            color: deckTokens.ink,
        },
        '& .MuiInputLabel-root': {
            color: deckTokens.muted,
            '&.Mui-focused': {
                color: deckTokens.accent,
            },
        },
        '& .MuiInput-underline:before': {
            borderBottomColor: deckTokens.borderHairline,
        },
        '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
            borderBottomColor: deckTokens.ink,
        },
        '& .MuiInput-underline:after': {
            borderBottomColor: deckTokens.accent,
        },
    },
    toggleRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        '& .MuiFormControlLabel-label': {
            fontFamily: deckTokens.fontSans,
            fontSize: 13,
            color: deckTokens.ink,
        },
        '& .MuiSwitch-switchBase.Mui-checked': {
            color: deckTokens.accent,
        },
        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: deckTokens.accent,
        },
    },
    emptyMessage: {
        padding: '16px 12px',
        fontFamily: deckTokens.fontSans,
        fontSize: 14,
        color: deckTokens.ink,
        gridColumn: '1 / -1',
    },
    emptyMessageMeta: {
        display: 'block',
        marginTop: 4,
        fontFamily: deckTokens.fontMono,
        fontSize: 12,
        color: deckTokens.muted,
    },
    bodyText: {
        fontFamily: deckTokens.fontSans,
        fontSize: 13,
        color: deckTokens.ink,
    },
    captionText: {
        fontFamily: deckTokens.fontMono,
        fontSize: 11,
        color: deckTokens.muted,
    },
    table: {
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        border: `1.5px solid ${deckTokens.border}`,
        borderRadius: deckTokens.radius,
        overflow: 'hidden',
        minHeight: 0,
        flex: 1,
        overflowY: 'auto',
    },
    head: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(100px, 1fr) minmax(80px, 0.8fr) minmax(120px, 1.2fr)',
        gap: 8,
        padding: '8px 12px',
        backgroundColor: deckTokens.surfaceMuted,
        borderBottom: `1.5px solid ${deckTokens.border}`,
        fontFamily: deckTokens.fontMono,
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: deckTokens.muted,
        '@media (max-width: 700px)': {
            display: 'none',
        },
    },
    row: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(100px, 1fr) minmax(80px, 0.8fr) minmax(120px, 1.2fr)',
        gap: 8,
        padding: '12px',
        borderBottom: `1px solid ${deckTokens.borderHairline}`,
        alignItems: 'center',
        '@media (max-width: 700px)': {
            gridTemplateColumns: '1fr',
            gap: 6,
        },
    },
    jobTitle: {
        fontFamily: deckTokens.fontSans,
        fontSize: 14,
        fontWeight: 500,
        color: deckTokens.ink,
        minWidth: 0,
    },
    jobSub: {
        fontFamily: deckTokens.fontMono,
        fontSize: 11,
        color: deckTokens.muted,
        marginTop: 2,
    },
    status: {
        fontFamily: deckTokens.fontMono,
        fontSize: 12,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: deckTokens.ink,
    },
    statusError: {
        color: deckTokens.meterWarn,
    },
    statusDone: {
        color: deckTokens.ink,
    },
    children: {
        gridColumn: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        paddingTop: 4,
    },
    childRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        padding: '6px 0',
        borderTop: `1px solid ${deckTokens.borderHairline}`,
    },
    notice: {
        fontFamily: deckTokens.fontSans,
        fontSize: 13,
        color: deckTokens.muted,
    },
}));

type AggregatedJob = {
    id: string;
    title: string;
    kind: 'playlist' | 'album' | 'track';
    jobs: DowntifyQueueJob[];
    done: number;
    total: number;
    progress: number;
    status: string;
};

function songTitle(job: DowntifyQueueJob): string {
    if (typeof job.song.name === 'string' && job.song.name.length > 0) {
        return job.song.name;
    }
    return 'Untitled';
}

function songArtist(job: DowntifyQueueJob): string {
    const artists = job.song.artists;
    if (!Array.isArray(artists)) {
        return '';
    }
    return artists.filter((artist): artist is string => typeof artist === 'string' && artist.length > 0).join(', ');
}

function statusLabel(status: string): string {
    switch (status) {
        case 'queued':
            return 'Queued';
        case 'downloading':
            return 'Downloading';
        case 'done':
            return 'Done';
        case 'error':
            return 'Failed';
        default:
            return status.length > 0 ? status : 'Unknown';
    }
}

function groupKeyForJob(job: DowntifyQueueJob): { key: string; title: string; kind: AggregatedJob['kind'] } {
    const playlistUrl = typeof job.song.downtify_playlist_url === 'string' ? job.song.downtify_playlist_url : '';
    if (playlistUrl.length > 0) {
        return { key: `playlist:${playlistUrl}`, title: playlistUrl, kind: 'playlist' };
    }
    const album =
        (typeof job.song.album_name === 'string' && job.song.album_name) ||
        (typeof job.song.album === 'string' && job.song.album) ||
        '';
    if (album.length > 0) {
        return { key: `album:${album}`, title: album, kind: 'album' };
    }
    const id = queueSongId(job.song) || songTitle(job);
    return { key: `track:${id}`, title: songTitle(job), kind: 'track' };
}

function deriveGroupStatus(jobs: DowntifyQueueJob[]): string {
    if (jobs.some((job) => job.status === 'error')) {
        return 'error';
    }
    if (jobs.some((job) => job.status === 'downloading')) {
        return 'downloading';
    }
    if (jobs.every((job) => job.status === 'done')) {
        return 'done';
    }
    if (jobs.every((job) => job.status === 'queued' || job.status === 'done')) {
        return jobs.some((job) => job.status === 'queued') ? 'queued' : 'done';
    }
    if (jobs.some((job) => job.status === 'queued')) {
        return 'queued';
    }
    return jobs[0]?.status || 'unknown';
}

function aggregateJobs(jobs: DowntifyQueueJob[]): AggregatedJob[] {
    const groups = new Map<string, AggregatedJob>();
    for (const job of jobs) {
        const { key, title, kind } = groupKeyForJob(job);
        const existing = groups.get(key);
        if (existing) {
            existing.jobs.push(job);
        } else {
            groups.set(key, {
                id: key,
                title: kind === 'playlist' ? title.replace(/^https?:\/\//, '').slice(0, 64) : title,
                kind,
                jobs: [job],
                done: 0,
                total: 0,
                progress: 0,
                status: '',
            });
        }
    }
    return [...groups.values()].map((group) => {
        const done = group.jobs.filter((job) => job.status === 'done').length;
        const total = group.jobs.length;
        const progress =
            total === 0 ? 0 : group.jobs.reduce((sum, job) => sum + (job.status === 'done' ? 100 : Math.max(0, Math.min(100, job.progress))), 0) / total;
        let title = group.title;
        if (group.kind === 'playlist') {
            const named = group.jobs.find((job) => typeof job.song.name === 'string' && job.song.name.length > 0);
            // Prefer a human playlist label when resolve stored one on album_name of children
            const albumHint = group.jobs.find((job) => typeof job.song.album_name === 'string' && (job.song.album_name as string).length > 0);
            if (albumHint && typeof albumHint.song.album_name === 'string') {
                title = albumHint.song.album_name;
            } else if (total === 1 && named) {
                title = songTitle(named);
            }
        }
        return {
            ...group,
            title,
            done,
            total,
            progress,
            status: deriveGroupStatus(group.jobs),
        };
    });
}

export function QueueScreen() {
    const { classes, cx } = useStyles();
    const library = useMemo(() => getDowntifyLibrary(), []);
    const [jobs, setJobs] = useState<DowntifyQueueJob[]>([]);
    const [downloadUrl, setDownloadUrl] = useState('');
    const [saveAsPlaylist, setSaveAsPlaylist] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [youtubeUrls, setYoutubeUrls] = useState<Record<string, string>>({});
    const [busyId, setBusyId] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setJobs(await library.getQueue());
    }, [library]);

    useEffect(() => {
        let cancelled = false;
        const load = (isInitial: boolean) => {
            refresh()
                .then(() => {
                    if (!cancelled) {
                        setLoading(false);
                    }
                })
                .catch((err: unknown) => {
                    if (!cancelled) {
                        const raw = err instanceof Error ? err.message : 'Could not read the Downtify queue';
                        setNotice(
                            /<!DOCTYPE|Unexpected token/i.test(raw)
                                ? 'Downtify is not reachable from this page. Start the embedded Downtify service, then refresh.'
                                : raw
                        );
                        if (isInitial) {
                            setLoading(false);
                        }
                    }
                });
        };
        load(true);
        const timer = window.setInterval(() => load(false), 3000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [refresh]);

    const aggregated = useMemo(() => aggregateJobs(jobs), [jobs]);

    const run = useCallback(
        async (id: string, action: () => Promise<void>) => {
            setBusyId(id);
            setNotice(null);
            try {
                await action();
                await refresh();
            } catch (err) {
                setNotice(err instanceof Error ? err.message : 'Request failed');
            } finally {
                setBusyId(null);
            }
        },
        [refresh]
    );

    const handleQueueDownload = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault();
            const url = downloadUrl.trim();
            if (!url) {
                return;
            }
            setDownloading(true);
            setNotice('Resolving URL in Downtify…');
            try {
                const result = await library.downloadFromUrl(url, { saveAsPlaylist });
                setDownloadUrl('');
                setNotice(DowntifyLibraryService.statusMessage(result));
                await refresh();
            } catch (err) {
                setNotice(err instanceof Error ? err.message : 'Download failed');
            } finally {
                setDownloading(false);
            }
        },
        [downloadUrl, saveAsPlaylist, library, refresh]
    );

    const finished = jobs.some((job) => job.status === 'done');
    const activeCount = jobs.filter((job) => job.status === 'queued' || job.status === 'downloading').length;

    return (
        <div className={classes.root}>
            <DeckPanel header="Queue" aria-label="Download queue">
                <form className={classes.form} onSubmit={handleQueueDownload}>
                    <TextField
                        className={classes.urlField}
                        fullWidth
                        size="small"
                        label="Spotify or YouTube track, album, or playlist URL"
                        value={downloadUrl}
                        disabled={downloading}
                        onChange={(event) => setDownloadUrl(event.target.value)}
                    />
                    <div className={classes.toggleRow}>
                        <FormControlLabel
                            control={
                                <Switch checked={saveAsPlaylist} onChange={(_e, checked) => setSaveAsPlaylist(checked)} size="small" />
                            }
                            label="Save as a Playlist"
                        />
                        <HardwareButton type="submit" accent padded disabled={downloading || downloadUrl.trim().length === 0}>
                            Queue download
                        </HardwareButton>
                        {finished ? (
                            <HardwareButton compact padded disabled={busyId === 'clear'} onClick={() => run('clear', () => library.clearCompletedQueue())}>
                                Clear finished
                            </HardwareButton>
                        ) : null}
                    </div>
                </form>
                {notice ? <p className={classes.notice}>{notice}</p> : null}

                <div className={classes.table} role="table" aria-label="Queued downloads">
                    <div className={classes.head} role="row">
                        <span>Job</span>
                        <span>Status</span>
                        <span>Tracks</span>
                        <span>Progress</span>
                    </div>
                    {aggregated.map((group) => {
                        const failed = group.jobs.filter((job) => job.status === 'error');
                        const showChildren = expanded[group.id] || failed.length > 0 || group.kind === 'track';
                        return (
                            <div className={classes.row} role="row" key={group.id}>
                                <div>
                                    <div className={classes.jobTitle}>{group.title}</div>
                                    <div className={classes.jobSub}>
                                        {group.kind === 'playlist' ? 'Playlist' : group.kind === 'album' ? 'Album' : 'Track'}
                                        {group.kind !== 'track' && group.total > 1 ? (
                                            <>
                                                {' · '}
                                                <button
                                                    type="button"
                                                    style={{
                                                        appearance: 'none',
                                                        border: 'none',
                                                        background: 'none',
                                                        padding: 0,
                                                        color: deckTokens.accent,
                                                        cursor: 'pointer',
                                                        fontFamily: deckTokens.fontMono,
                                                        fontSize: 11,
                                                    }}
                                                    onClick={() => setExpanded((current) => ({ ...current, [group.id]: !current[group.id] }))}
                                                >
                                                    {showChildren ? 'Hide tracks' : 'Show tracks'}
                                                </button>
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                                <div className={cx(classes.status, group.status === 'error' && classes.statusError, group.status === 'done' && classes.statusDone)}>
                                    {statusLabel(group.status)}
                                </div>
                                <div className={classes.status}>
                                    {group.done}/{group.total}
                                </div>
                                <MeterBar value={group.progress} aria-label={`${group.title} progress`} />
                                {showChildren && group.kind !== 'track' ? (
                                    <div className={classes.children}>
                                        {group.jobs.map((job, index) => {
                                            const id = queueSongId(job.song) || `${songTitle(job)}-${index}`;
                                            const artist = songArtist(job);
                                            return (
                                                <div className={classes.childRow} key={id}>
                                                    <span className={classes.bodyText}>
                                                        {songTitle(job)}
                                                        {artist ? ` — ${artist}` : ''} · {statusLabel(job.status)}
                                                        {job.status === 'downloading' || job.status === 'queued' ? ` ${Math.round(job.progress)}%` : ''}
                                                    </span>
                                                    {job.message ? <span className={classes.captionText}>{job.message}</span> : null}
                                                    {job.status === 'error' ? (
                                                        <>
                                                            <HardwareButton compact padded disabled={busyId === id} onClick={() => run(id, () => library.retryDownload(job.song))}>
                                                                Retry
                                                            </HardwareButton>
                                                            <TextField
                                                                size="small"
                                                                label="YouTube video URL"
                                                                value={youtubeUrls[id] ?? ''}
                                                                onChange={(event) => setYoutubeUrls((current) => ({ ...current, [id]: event.target.value }))}
                                                            />
                                                            <HardwareButton
                                                                compact
                                                                padded
                                                                disabled={busyId === id || (youtubeUrls[id] ?? '').trim().length === 0}
                                                                onClick={() => run(id, () => library.retryDownload(job.song, youtubeUrls[id]))}
                                                            >
                                                                Use this video
                                                            </HardwareButton>
                                                            <HardwareButton
                                                                compact
                                                                padded
                                                                disabled={busyId === id || queueSongId(job.song).length === 0}
                                                                onClick={() => run(id, () => library.removeQueueItem(queueSongId(job.song)))}
                                                            >
                                                                Dismiss
                                                            </HardwareButton>
                                                        </>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : null}
                                {group.kind === 'track' && group.jobs[0]?.status === 'error' ? (
                                    <div className={classes.children}>
                                        {group.jobs.map((job, index) => {
                                            const id = queueSongId(job.song) || `${songTitle(job)}-${index}`;
                                            return (
                                                <div className={classes.childRow} key={id}>
                                                    {job.message ? <span className={classes.captionText}>{job.message}</span> : null}
                                                    <HardwareButton compact padded disabled={busyId === id} onClick={() => run(id, () => library.retryDownload(job.song))}>
                                                        Retry
                                                    </HardwareButton>
                                                    <TextField
                                                        size="small"
                                                        label="YouTube video URL"
                                                        value={youtubeUrls[id] ?? ''}
                                                        onChange={(event) => setYoutubeUrls((current) => ({ ...current, [id]: event.target.value }))}
                                                    />
                                                    <HardwareButton
                                                        compact
                                                        padded
                                                        disabled={busyId === id || (youtubeUrls[id] ?? '').trim().length === 0}
                                                        onClick={() => run(id, () => library.retryDownload(job.song, youtubeUrls[id]))}
                                                    >
                                                        Use this video
                                                    </HardwareButton>
                                                    <HardwareButton
                                                        compact
                                                        padded
                                                        disabled={busyId === id || queueSongId(job.song).length === 0}
                                                        onClick={() => run(id, () => library.removeQueueItem(queueSongId(job.song)))}
                                                    >
                                                        Dismiss
                                                    </HardwareButton>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                    {loading ? (
                        <div className={classes.row}>
                            <div className={classes.emptyMessage} role="status" aria-live="polite">
                                Loading queue…
                                <span className={classes.emptyMessageMeta}>Checking Downtify for active downloads.</span>
                            </div>
                        </div>
                    ) : null}
                    {!loading && aggregated.length === 0 && !notice ? (
                        <div className={classes.row}>
                            <div className={classes.emptyMessage}>
                                The queue is empty.
                                <span className={classes.emptyMessageMeta}>Paste a URL above to start a download.</span>
                            </div>
                        </div>
                    ) : null}
                </div>
            </DeckPanel>
            <StatusStrip
                left={<span>{aggregated.length} job{aggregated.length === 1 ? '' : 's'}</span>}
                right={
                    <>
                        <span>{activeCount} active</span>
                        <span>{jobs.length} tracks</span>
                    </>
                }
            />
        </div>
    );
}
