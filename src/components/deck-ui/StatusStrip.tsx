import React from 'react';
import { makeStyles } from 'tss-react/mui';
import { deckTokens } from './tokens';

const useStyles = makeStyles()(() => ({
    root: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        padding: '8px 12px',
        backgroundColor: deckTokens.surfaceMuted,
        borderTop: `1.5px solid ${deckTokens.border}`,
        fontFamily: deckTokens.fontMono,
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: deckTokens.muted,
        minWidth: 0,
    },
    left: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px 14px',
        minWidth: 0,
    },
    right: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px 14px',
        color: deckTokens.ink,
        fontWeight: 500,
    },
    strong: {
        color: deckTokens.ink,
    },
}));

export type StatusStripProps = {
    left?: React.ReactNode;
    right?: React.ReactNode;
    className?: string;
};

export function StatusStrip({ left, right, className }: StatusStripProps) {
    const { classes, cx } = useStyles();
    return (
        <footer className={cx(classes.root, className)} aria-label="Disc status">
            <div className={classes.left}>{left}</div>
            <div className={classes.right}>{right}</div>
        </footer>
    );
}

export const statusStripStrongClass = 'deck-status-strong';
