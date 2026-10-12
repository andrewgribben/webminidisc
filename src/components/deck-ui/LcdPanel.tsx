import React from 'react';
import { makeStyles } from 'tss-react/mui';
import { deckTokens } from './tokens';

const useStyles = makeStyles()(() => ({
    root: {
        position: 'relative',
        backgroundColor: deckTokens.lcdBg,
        color: deckTokens.lcdInk,
        border: `1.5px solid ${deckTokens.border}`,
        borderRadius: deckTokens.radius,
        padding: '12px 14px',
        minHeight: 96,
        fontFamily: deckTokens.fontLcd,
        userSelect: 'none',
        overflow: 'hidden',
        cursor: 'pointer',
        '&:focus': {
            outline: 'none',
        },
        '&:focus-visible': {
            outline: `2px solid ${deckTokens.focusRing}`,
            outlineOffset: 2,
        },
    },
    row: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 10,
        minWidth: 0,
    },
    trackNo: {
        fontSize: 18,
        letterSpacing: '0.08em',
        flex: '0 0 auto',
    },
    title: {
        fontSize: 16,
        letterSpacing: '0.04em',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        flex: '1 1 auto',
        minWidth: 0,
    },
    meta: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 10,
        fontFamily: deckTokens.fontMono,
        fontSize: 11,
        letterSpacing: '0.06em',
        color: deckTokens.lcdMuted,
        textTransform: 'uppercase',
    },
    seek: {
        marginTop: 12,
        height: 8,
        backgroundColor: 'rgba(17, 17, 17, 0.35)',
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'none',
    },
    seekFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: deckTokens.accent,
        borderRadius: 2,
        pointerEvents: 'none',
    },
    discSlot: {
        position: 'absolute',
        top: 8,
        right: 10,
        width: 28,
        height: 40,
        opacity: 0.85,
        '& svg': {
            width: '100%',
            height: '100%',
        },
        '& g': {
            fill: deckTokens.lcdInk,
        },
    },
    live: {
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
    },
}));

export type LcdPanelProps = {
    message: string;
    trackLabel?: string;
    timeLabel?: string;
    modeLabel?: string;
    progress?: number;
    discIcon?: React.ReactNode;
    onCycleDisplay?: () => void;
    onSeekStart?: (event: React.PointerEvent | React.KeyboardEvent) => void;
    onSeekMove?: (ratio: number) => void;
    onSeekEnd?: () => void;
    className?: string;
    disabled?: boolean;
};

export function LcdPanel({
    message,
    trackLabel,
    timeLabel,
    modeLabel,
    progress = 0,
    discIcon,
    onCycleDisplay,
    onSeekStart,
    onSeekMove,
    onSeekEnd,
    className,
    disabled = false,
}: LcdPanelProps) {
    const { classes, cx } = useStyles();
    const seekRef = React.useRef<HTMLDivElement | null>(null);
    const seekingRef = React.useRef(false);

    const ratioFromClientX = React.useCallback((clientX: number) => {
        const el = seekRef.current;
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        return Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
    }, []);

    const handleSeekPointerDown = (event: React.PointerEvent) => {
        if (disabled || !onSeekMove) return;
        event.preventDefault();
        event.stopPropagation();
        seekingRef.current = true;
        (event.target as Element).setPointerCapture?.(event.pointerId);
        onSeekStart?.(event);
        onSeekMove(ratioFromClientX(event.clientX));
    };

    const handleSeekPointerMove = (event: React.PointerEvent) => {
        if (!seekingRef.current || !onSeekMove) return;
        onSeekMove(ratioFromClientX(event.clientX));
    };

    const handleSeekPointerUp = () => {
        if (!seekingRef.current) return;
        seekingRef.current = false;
        onSeekEnd?.();
    };

    const handleSeekKeyDown = (event: React.KeyboardEvent) => {
        if (disabled || !onSeekMove) return;
        const step = event.shiftKey ? 0.1 : 0.02;
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault();
            onSeekStart?.(event);
            onSeekMove(Math.min(1, progress / 100 + step));
            onSeekEnd?.();
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault();
            onSeekStart?.(event);
            onSeekMove(Math.max(0, progress / 100 - step));
            onSeekEnd?.();
        } else if (event.key === 'Home') {
            event.preventDefault();
            onSeekStart?.(event);
            onSeekMove(0);
            onSeekEnd?.();
        } else if (event.key === 'End') {
            event.preventDefault();
            onSeekStart?.(event);
            onSeekMove(1);
            onSeekEnd?.();
        }
    };

    const clamped = Math.min(100, Math.max(0, progress));

    return (
        <div
            className={cx(classes.root, className)}
            role="button"
            tabIndex={0}
            aria-label={`LCD display: ${message}. Activate to cycle time display.`}
            onClick={onCycleDisplay}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCycleDisplay?.();
                }
            }}
        >
            <div className={classes.row} style={{ paddingRight: discIcon ? 36 : 0 }}>
                {trackLabel ? <span className={classes.trackNo}>{trackLabel}</span> : null}
                <span className={classes.title}>{message}</span>
            </div>
            <div
                ref={seekRef}
                className={classes.seek}
                role="slider"
                tabIndex={0}
                aria-label="Seek within track"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(clamped)}
                aria-disabled={disabled}
                onPointerDown={handleSeekPointerDown}
                onPointerMove={handleSeekPointerMove}
                onPointerUp={handleSeekPointerUp}
                onPointerCancel={handleSeekPointerUp}
                onKeyDown={handleSeekKeyDown}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={classes.seekFill} style={{ width: `${clamped}%` }} />
            </div>
            <div className={classes.meta}>
                <span>{timeLabel || '\u00A0'}</span>
                <span>{modeLabel || '\u00A0'}</span>
            </div>
            {discIcon ? <div className={classes.discSlot}>{discIcon}</div> : null}
            <div className={classes.live} aria-live="polite" aria-atomic="true">
                {message}
                {timeLabel ? ` ${timeLabel}` : ''}
            </div>
        </div>
    );
}
