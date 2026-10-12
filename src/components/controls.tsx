import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import PauseIcon from '@mui/icons-material/Pause';

import Box from '@mui/material/Box';

import { makeStyles } from 'tss-react/mui';
import { formatTimeFromSeconds, getSortedTracks } from '../utils';
import { useDeviceCapabilities, useShallowEqualSelector } from '../frontend-utils';
import { control } from '../redux/actions';
import { useDispatch } from '../frontend-utils';

import MDIcon0 from '../images/md0.svg?react';
import MDIcon1 from '../images/md1.svg?react';
import MDIcon2 from '../images/md2.svg?react';
import MDIcon3 from '../images/md3.svg?react';
import { W95Controls } from './win95/controls';
import { HardwareButton, LcdPanel } from './deck-ui';

const frames = [MDIcon0, MDIcon1, MDIcon2, MDIcon3];

const useStyles = makeStyles()(() => ({
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        flex: '1 1 auto',
        minWidth: 0,
        width: '100%',
    },
    transport: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
    },
    lcdDiscIcon: {
        width: 28,
        height: 40,
    },
    lcdBlink: {
        animationName: 'blink',
        animationTimingFunction: 'step-end',
        animationDuration: '1s',
        animationIterationCount: 'infinite',
    },
    // Legacy class names retained for W95Controls props compatibility
    lcdText: {
        overflow: 'hidden',
        position: 'relative',
        width: 'calc(100% - 40px)',
        left: 40,
        height: '100%',
        fontFamily: 'LCDDot',
    },
    scrollingStatusMessage: {
        position: 'absolute',
        width: '100%',
        whiteSpace: 'nowrap',
        animationName: 'scrollLeft',
        animationTimingFunction: 'linear',
        animationIterationCount: '1',
        top: 15,
        left: 1,
    },
    statusMessage: {
        position: 'absolute',
        width: '100%',
        whiteSpace: 'nowrap',
        top: 15,
        left: 1,
    },
}));

export const Controls = () => {
    const dispatch = useDispatch();
    const deviceStatus = useShallowEqualSelector((state) => state.main.deviceStatus);
    const disc = useShallowEqualSelector((state) => state.main.disc);
    const loading = useShallowEqualSelector((state) => state.appState.loading);

    const deviceCapabilities = useDeviceCapabilities();

    const { classes, cx } = useStyles();
    const [lcdScreen, _setLCDScreen] = useState<number>(-1);
    const [trackPercentage, _setTrackPercentage] = useState<number>(0);
    const setLCDScreen = (newScreen: number) => (lcdScreen === newScreen ? void 0 : _setLCDScreen(newScreen));
    const setTrackPercentage = (newTrackPercentage: typeof _setTrackPercentage extends (a: infer R) => any ? R : never) =>
        newTrackPercentage === trackPercentage ? void 0 : _setTrackPercentage(newTrackPercentage);

    const handlePrev = useCallback(() => {
        dispatch(control('prev'));
    }, [dispatch]);
    const handlePlay = useCallback(() => {
        dispatch(control('play'));
    }, [dispatch]);
    const handleStop = useCallback(() => {
        dispatch(control('stop'));
    }, [dispatch]);
    const handleNext = useCallback(() => {
        dispatch(control('next'));
    }, [dispatch]);
    const handlePause = useCallback(() => {
        dispatch(control('pause'));
    }, [dispatch]);

    const [isSeekingProgressLocked, setIsSeekingProgressLocked] = useState(false);
    let message = ``;
    let timeLabel = ``;
    let trackLabel = ``;
    const deviceState = deviceStatus?.state ?? null;
    const discPresent = deviceStatus?.discPresent ?? false;
    const paused = deviceStatus?.state === 'paused';
    const tracks = useMemo(() => getSortedTracks(disc), [disc]);
    if (!discPresent) {
        message = ``;
        setLCDScreen(-1);
        setTrackPercentage(0);
    } else if (deviceState === 'readingTOC') {
        message = 'READING TOC';
        setLCDScreen(-1);
        setTrackPercentage(0);
    } else if (tracks.length === 0) {
        message = `BLANKDISC`;
        setLCDScreen(-1);
        setTrackPercentage(0);
    } else if (deviceStatus && deviceStatus.track !== null && tracks[deviceStatus.track]) {
        const track = tracks[deviceStatus.track];
        const title = track.fullWidthTitle || track.title;
        let currentTimeSecs = (deviceStatus.time?.minute ?? 0) * 60 + (deviceStatus.time?.second ?? 0);
        trackLabel = (deviceStatus.track + 1).toString().padStart(2, '0');
        message = title || `TRACK ${trackLabel}`;
        const elapsed = formatTimeFromSeconds(currentTimeSecs, false);
        const total = formatTimeFromSeconds(track.duration, false);
        timeLabel = `${elapsed} / ${total}`;
        switch (lcdScreen) {
            case 1:
                message = `${elapsed} / ${total}`;
                break;
            case 2: {
                const timeDiff = track.duration - currentTimeSecs;
                message = `-${formatTimeFromSeconds(timeDiff, false)}`;
                break;
            }
        }
        if (isSeekingProgressLocked) {
            currentTimeSecs = Math.floor((trackPercentage * track.duration) / 100);
            timeLabel = `${formatTimeFromSeconds(currentTimeSecs, false)} / ${total}`;
        } else {
            setTrackPercentage(Math.floor((currentTimeSecs / Math.max(1, track.duration)) * 100));
        }
        if (lcdScreen === -1) {
            setLCDScreen(0);
        }
    }

    const [lcdIconFrame, setLcdIconFrame] = useState(0);

    const handleLCDClick = useCallback(() => {
        _setLCDScreen((old) => {
            if (old === -1) return old;
            let next = old + 1;
            if (next >= 3) next = 0;
            return next;
        });
    }, []);

    const handleSeekMove = useCallback(
        (ratio: number) => {
            setIsSeekingProgressLocked(true);
            setTrackPercentage(ratio * 100);
        },
        [setTrackPercentage]
    );

    const handleSeekEnd = useCallback(() => {
        if (deviceStatus?.track === null || deviceStatus?.track === undefined) {
            setIsSeekingProgressLocked(false);
            return;
        }
        const track = tracks[deviceStatus.track];
        if (!track) {
            setIsSeekingProgressLocked(false);
            return;
        }
        _setTrackPercentage((pct) => {
            const seekTo = Math.floor((pct * track.duration) / 100);
            dispatch(control('seek', { trackNumber: deviceStatus.track, time: seekTo }));
            return pct;
        });
        setTimeout(() => setIsSeekingProgressLocked(false), 1000);
    }, [deviceStatus, tracks, dispatch]);

    // Disc animation
    const lcdIconAnimationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        if (lcdIconAnimationTimer.current) clearInterval(lcdIconAnimationTimer.current);
        if (deviceState === 'playing' || deviceState === 'readingTOC') {
            lcdIconAnimationTimer.current = setInterval(() => {
                setLcdIconFrame(1 + (lcdIconFrame % (frames.length - 1)));
            }, 600);
        } else {
            setLcdIconFrame(0);
        }
        return () => {
            if (lcdIconAnimationTimer.current) clearInterval(lcdIconAnimationTimer.current);
        };
    }, [deviceState, lcdIconFrame]);

    const DiscFrame = frames[lcdIconFrame];
    const modeLabel = deviceState ? `MODE ${deviceState.toUpperCase()}` : discPresent ? 'MODE READY' : 'NO DISC';

    const vintageMode = useShallowEqualSelector((state) => state.appState.vintageMode);
    if (vintageMode) {
        const lcdRef = { current: null } as React.RefObject<HTMLParagraphElement>;
        const p = {
            handlePrev,
            handlePlay,
            handleStop,
            handlePause,
            handleNext,

            message: disc === null ? (loading ? 'LOADING...' : 'NO DISC') : message || timeLabel,
            loading,
            discPresent,
            lcdScroll: 0,
            lcdRef,
            lcdScrollDuration: 0,

            classes,
        };
        return <W95Controls {...p} />;
    }

    const displayMessage = disc === null ? (loading ? 'LOADING...' : 'NO DISC') : message || 'READY';

    return (
        <Box className={classes.container}>
            <LcdPanel
                message={displayMessage}
                trackLabel={discPresent && trackLabel ? trackLabel : undefined}
                timeLabel={discPresent ? timeLabel || undefined : undefined}
                modeLabel={modeLabel}
                progress={trackPercentage}
                disabled={!discPresent || tracks.length === 0}
                onCycleDisplay={handleLCDClick}
                onSeekMove={handleSeekMove}
                onSeekEnd={handleSeekEnd}
                discIcon={
                    discPresent ? (
                        <DiscFrame className={cx(classes.lcdDiscIcon, { [classes.lcdBlink]: paused })} aria-hidden />
                    ) : undefined
                }
            />
            {deviceCapabilities.playbackControl ? (
                <div className={classes.transport} role="group" aria-label="Transport controls">
                    <HardwareButton square aria-label="Previous track" disabled={!disc} onClick={handlePrev}>
                        <SkipPreviousIcon />
                    </HardwareButton>
                    <HardwareButton square accent aria-label="Play" disabled={!disc} onClick={handlePlay}>
                        <PlayArrowIcon />
                    </HardwareButton>
                    <HardwareButton square aria-label="Pause" disabled={!disc} onClick={handlePause}>
                        <PauseIcon />
                    </HardwareButton>
                    <HardwareButton square aria-label="Stop" disabled={!disc} onClick={handleStop}>
                        <StopIcon />
                    </HardwareButton>
                    <HardwareButton square aria-label="Next track" disabled={!disc} onClick={handleNext}>
                        <SkipNextIcon />
                    </HardwareButton>
                </div>
            ) : null}
        </Box>
    );
};

export default Controls;
