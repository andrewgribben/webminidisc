import React from 'react';
import { makeStyles } from 'tss-react/mui';
import { deckTokens } from './tokens';

const useStyles = makeStyles()(() => ({
    root: {
        appearance: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
        margin: 0,
        padding: '14px 14px 12px',
        minHeight: 88,
        textAlign: 'left',
        backgroundColor: deckTokens.surface,
        color: deckTokens.ink,
        border: `1.5px solid ${deckTokens.border}`,
        borderRadius: deckTokens.radius,
        cursor: 'pointer',
        fontFamily: deckTokens.fontSans,
        transition: 'background-color 80ms ease, border-color 80ms ease, transform 80ms ease',
        '&:hover:not(:disabled)': {
            backgroundColor: deckTokens.surfaceMuted,
        },
        '&:active:not(:disabled)': {
            transform: 'translateY(1px)',
        },
        '&:focus': {
            outline: 'none',
        },
        '&:focus-visible': {
            outline: `2px solid ${deckTokens.focusRing}`,
            outlineOffset: 2,
        },
        '&:disabled': {
            opacity: 0.38,
            cursor: 'not-allowed',
        },
    },
    icon: {
        color: deckTokens.accent,
        display: 'inline-flex',
        alignItems: 'center',
        '& .MuiSvgIcon-root': {
            fontSize: 22,
        },
    },
    title: {
        fontFamily: deckTokens.fontMono,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: deckTokens.ink,
    },
    description: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 1.35,
        color: deckTokens.muted,
        fontFamily: deckTokens.fontSans,
        fontWeight: 400,
        letterSpacing: 'normal',
        textTransform: 'none',
    },
}));

export type DeckActionTileProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon?: React.ReactNode;
    title: string;
    description?: string;
};

export function DeckActionTile({ icon, title, description, className, type = 'button', ...rest }: DeckActionTileProps) {
    const { classes, cx } = useStyles();
    return (
        <button type={type} className={cx(classes.root, className)} {...rest}>
            {icon ? <span className={classes.icon}>{icon}</span> : null}
            <span>
                <span className={classes.title}>{title}</span>
                {description ? <span className={classes.description}>{description}</span> : null}
            </span>
        </button>
    );
}
