import React, { useEffect, useRef, useState } from 'react';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useDispatch, useShallowEqualSelector } from '../frontend-utils';
import { actions as discLibraryActions } from '../redux/disc-library-feature';
import { savedAudioUrl } from '../services/md-library';
import { formatTimeFromSeconds, getTracks } from '../utils';

function neighbor(indexes: number[], current: number | null, direction: -1 | 1): number | null {
    if (indexes.length === 0) {
        return null;
    }
    const ordered = [...indexes].sort((a, b) => a - b);
    if (current == null) {
        return direction > 0 ? ordered[0] : ordered[ordered.length - 1];
    }
    const place = ordered.indexOf(current);
    const next = ordered[place + direction];
    return next === undefined ? null : next;
}

export function FilePlayer() {
    const dispatch = useDispatch();
    const { discId, title, coverUrl, audioIndexes, playingIndex, playing } = useShallowEqualSelector((state) => state.discLibrary);
    const disc = useShallowEqualSelector((state) => state.main.disc);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || discId == null || playingIndex == null) {
            return;
        }
        const url = savedAudioUrl(discId, playingIndex);
        if (audio.dataset.src !== url) {
            audio.dataset.src = url;
            audio.src = url;
            setCurrent(0);
        }
        if (!playing) {
            audio.pause();
            return;
        }
        const start = () => {
            void audio.play().catch((error: unknown) => {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }
                dispatch(discLibraryActions.setPlaying(false));
            });
        };
        if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            start();
            return;
        }
        audio.addEventListener('canplay', start, { once: true });
        return () => audio.removeEventListener('canplay', start);
    }, [discId, playingIndex, playing, dispatch]);

    if (discId == null || audioIndexes.length === 0) {
        return null;
    }

    const track = disc && playingIndex != null ? getTracks(disc).find((item) => item.index === playingIndex) : undefined;
    const label = track?.fullWidthTitle || track?.title || title || 'Saved audio';
    const previous = neighbor(audioIndexes, playingIndex, -1);
    const next = neighbor(audioIndexes, playingIndex, 1);

    const playOrPause = () => {
        if (playing) {
            dispatch(discLibraryActions.setPlaying(false));
            return;
        }
        if (playingIndex == null) {
            const first = neighbor(audioIndexes, null, 1);
            if (first != null) {
                dispatch(discLibraryActions.playTrack(first));
            }
            return;
        }
        dispatch(discLibraryActions.setPlaying(true));
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 1, pr: 8 }}>
            <audio
                ref={audioRef}
                preload="none"
                onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
                onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
                onEnded={() => {
                    if (next != null) {
                        dispatch(discLibraryActions.playTrack(next));
                    } else {
                        dispatch(discLibraryActions.setPlaying(false));
                    }
                }}
            />
            {coverUrl ? (
                <Box component="img" src={coverUrl} alt="" sx={{ width: 48, height: 48, objectFit: 'cover' }} />
            ) : null}
            <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                    {label}
                </Typography>
                <Typography variant="caption" color="textSecondary" component="div">
                    Saved copy, playing in this browser. The controls below still run the MiniDisc.
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton
                        size="small"
                        aria-label="previous saved track"
                        disabled={previous == null || playingIndex == null}
                        onClick={() => {
                            if (previous != null) {
                                dispatch(discLibraryActions.playTrack(previous));
                            }
                        }}
                    >
                        <SkipPreviousIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" aria-label={playing ? 'pause saved audio' : 'play saved audio'} onClick={playOrPause}>
                        {playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                    </IconButton>
                    <IconButton
                        size="small"
                        aria-label="next saved track"
                        disabled={next == null || playingIndex == null}
                        onClick={() => {
                            if (next != null) {
                                dispatch(discLibraryActions.playTrack(next));
                            }
                        }}
                    >
                        <SkipNextIcon fontSize="small" />
                    </IconButton>
                    <Box
                        component="input"
                        type="range"
                        aria-label="seek saved audio"
                        min={0}
                        max={Number.isFinite(duration) && duration > 0 ? duration : 0}
                        step={0.1}
                        value={Math.min(current, Number.isFinite(duration) ? duration : current)}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            const audio = audioRef.current;
                            const time = Number(event.target.value);
                            if (audio) {
                                audio.currentTime = time;
                            }
                            setCurrent(time);
                        }}
                        sx={{ flex: '1 1 auto' }}
                    />
                    <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                        {formatTimeFromSeconds(current)} / {formatTimeFromSeconds(Number.isFinite(duration) ? duration : 0)}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
