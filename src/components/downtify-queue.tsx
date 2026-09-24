import React, { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { makeStyles } from 'tss-react/mui';
import { DowntifyLibraryService, DowntifyQueueJob, queueSongId } from '../services/library/downtify-library';

const useStyles = makeStyles()((theme) => ({
    queue: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(0.75),
        width: '100%',
    },
    row: {
        display: 'flex',
        gap: theme.spacing(1),
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    job: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(0.5),
    },
}));

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

export function DowntifyQueue({ library }: { library: DowntifyLibraryService }) {
    const { classes } = useStyles();
    const [jobs, setJobs] = useState<DowntifyQueueJob[]>([]);
    const [notice, setNotice] = useState<string | null>(null);
    const [youtubeUrls, setYoutubeUrls] = useState<Record<string, string>>({});
    const [busyId, setBusyId] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setJobs(await library.getQueue());
    }, [library]);

    useEffect(() => {
        let cancelled = false;
        const load = () => {
            refresh().catch((err: unknown) => {
                if (!cancelled) {
                    setNotice(err instanceof Error ? err.message : 'Could not read the Downtify queue');
                }
            });
        };
        load();
        const timer = window.setInterval(load, 3000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [refresh]);

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

    const finished = jobs.some((job) => job.status === 'done');

    return (
        <div className={classes.queue}>
            {finished ? (
                <div className={classes.row}>
                    <Button size="small" onClick={() => run('clear', () => library.clearCompletedQueue())}>
                        Clear finished
                    </Button>
                </div>
            ) : null}
            {jobs.map((job, index) => {
                const id = queueSongId(job.song) || `${songTitle(job)}-${index}`;
                const artist = songArtist(job);
                return (
                    <div className={classes.job} key={id}>
                        <Typography variant="body2">
                            {songTitle(job)}
                            {artist ? ` — ${artist}` : ''} · {statusLabel(job.status)}
                            {job.status === 'downloading' || job.status === 'queued' ? ` ${Math.round(job.progress)}%` : ''}
                            {job.provider ? ` · ${job.provider}` : ''}
                        </Typography>
                        {job.message ? (
                            <Typography variant="caption" color="textSecondary">
                                {job.message}
                            </Typography>
                        ) : null}
                        {job.status === 'error' ? (
                            <div className={classes.row}>
                                <Button size="small" disabled={busyId === id} onClick={() => run(id, () => library.retryDownload(job.song))}>
                                    Retry
                                </Button>
                                <TextField
                                    size="small"
                                    label="YouTube video URL"
                                    value={youtubeUrls[id] ?? ''}
                                    onChange={(event) => setYoutubeUrls((current) => ({ ...current, [id]: event.target.value }))}
                                />
                                <Button
                                    size="small"
                                    disabled={busyId === id || (youtubeUrls[id] ?? '').trim().length === 0}
                                    onClick={() => run(id, () => library.retryDownload(job.song, youtubeUrls[id]))}
                                >
                                    Use this video
                                </Button>
                                <Button
                                    size="small"
                                    disabled={busyId === id || queueSongId(job.song).length === 0}
                                    onClick={() => run(id, () => library.removeQueueItem(queueSongId(job.song)))}
                                >
                                    Dismiss
                                </Button>
                            </div>
                        ) : null}
                    </div>
                );
            })}
            {jobs.length === 0 && !notice ? (
                <Typography variant="body2" color="textSecondary">
                    The queue is empty.
                </Typography>
            ) : null}
            {notice ? (
                <Typography variant="caption" color="textSecondary">
                    {notice}
                </Typography>
            ) : null}
        </div>
    );
}
