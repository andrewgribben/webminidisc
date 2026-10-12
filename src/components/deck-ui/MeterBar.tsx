import React from 'react';
import { makeStyles } from 'tss-react/mui';
import { deckTokens } from './tokens';

const useStyles = makeStyles()(() => ({
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0,
    },
    labels: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
        fontFamily: deckTokens.fontMono,
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: deckTokens.muted,
    },
    labelAccent: {
        color: deckTokens.accent,
        fontWeight: 500,
    },
    track: {
        height: 10,
        backgroundColor: deckTokens.meterTrack,
        border: `1.5px solid ${deckTokens.border}`,
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
    },
    fill: {
        height: '100%',
        backgroundColor: deckTokens.meterFill,
        transition: 'width 200ms ease',
    },
    fillWarn: {
        backgroundColor: deckTokens.meterWarn,
    },
}));

export type MeterBarProps = {
    value: number;
    labelLeft?: React.ReactNode;
    labelRight?: React.ReactNode;
    warnAt?: number;
    className?: string;
    onClick?: () => void;
    'aria-label'?: string;
};

export function MeterBar({
    value,
    labelLeft,
    labelRight,
    warnAt = 90,
    className,
    onClick,
    'aria-label': ariaLabel,
}: MeterBarProps) {
    const { classes, cx } = useStyles();
    const clamped = Math.min(100, Math.max(0, value));
    const warn = clamped >= warnAt;

    return (
        <div
            className={cx(classes.root, className)}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={
                onClick
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onClick();
                          }
                      }
                    : undefined
            }
            aria-label={ariaLabel}
        >
            {(labelLeft || labelRight) && (
                <div className={classes.labels}>
                    <span className={warn ? classes.labelAccent : undefined}>{labelLeft}</span>
                    <span>{labelRight}</span>
                </div>
            )}
            <div
                className={classes.track}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(clamped)}
                aria-label={ariaLabel || 'Capacity'}
            >
                <div className={cx(classes.fill, warn && classes.fillWarn)} style={{ width: `${clamped}%` }} />
            </div>
        </div>
    );
}
