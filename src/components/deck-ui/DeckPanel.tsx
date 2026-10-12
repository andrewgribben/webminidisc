import React from 'react';
import { makeStyles } from 'tss-react/mui';
import { deckTokens } from './tokens';

const useStyles = makeStyles()(() => ({
    root: {
        backgroundColor: deckTokens.surface,
        border: `1.5px solid ${deckTokens.border}`,
        borderRadius: deckTokens.radius,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderBottom: `1.5px solid ${deckTokens.border}`,
        fontFamily: deckTokens.fontMono,
        fontSize: 11,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: deckTokens.ink,
        fontWeight: 500,
    },
    body: {
        flex: '1 1 auto',
        minHeight: 0,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
    },
    bodyFlush: {
        padding: 0,
    },
}));

export type DeckPanelProps = {
    children: React.ReactNode;
    header?: React.ReactNode;
    className?: string;
    bodyClassName?: string;
    flush?: boolean;
    'aria-label'?: string;
};

export function DeckPanel({
    children,
    header,
    className,
    bodyClassName,
    flush = false,
    'aria-label': ariaLabel,
}: DeckPanelProps) {
    const { classes, cx } = useStyles();
    return (
        <section className={cx(classes.root, className)} aria-label={ariaLabel}>
            {header ? <div className={classes.header}>{header}</div> : null}
            <div className={cx(classes.body, flush && classes.bodyFlush, bodyClassName)}>{children}</div>
        </section>
    );
}
