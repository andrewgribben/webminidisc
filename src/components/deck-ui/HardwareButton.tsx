import React from 'react';
import { makeStyles } from 'tss-react/mui';
import { deckTokens } from './tokens';

const useStyles = makeStyles()(() => ({
    root: {
        appearance: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        margin: 0,
        padding: 0,
        minWidth: 44,
        minHeight: 44,
        backgroundColor: deckTokens.surface,
        color: deckTokens.ink,
        border: `1.5px solid ${deckTokens.border}`,
        borderRadius: deckTokens.radius,
        fontFamily: deckTokens.fontSans,
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'background-color 80ms ease, color 80ms ease, border-color 80ms ease, transform 80ms ease',
        '&:hover:not(:disabled)': {
            backgroundColor: deckTokens.surfaceMuted,
        },
        '&:active:not(:disabled)': {
            transform: 'translateY(1px)',
            backgroundColor: deckTokens.surfaceMuted,
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
    accent: {
        backgroundColor: deckTokens.accent,
        color: '#fff',
        borderColor: deckTokens.accent,
        '&:hover:not(:disabled)': {
            backgroundColor: deckTokens.accentHover,
            borderColor: deckTokens.accentHover,
        },
    },
    compact: {
        minWidth: 36,
        minHeight: 36,
        padding: '0 8px',
        fontSize: 12,
    },
    padded: {
        padding: '0 14px',
    },
    square: {
        width: 48,
        height: 48,
        padding: 0,
    },
}));

export type HardwareButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    accent?: boolean;
    compact?: boolean;
    padded?: boolean;
    square?: boolean;
};

export function HardwareButton({
    accent = false,
    compact = false,
    padded = false,
    square = false,
    className,
    type = 'button',
    children,
    ...rest
}: HardwareButtonProps) {
    const { classes, cx } = useStyles();
    return (
        <button
            type={type}
            className={cx(
                classes.root,
                accent && classes.accent,
                compact && classes.compact,
                padded && classes.padded,
                square && classes.square,
                className
            )}
            {...rest}
        >
            {children}
        </button>
    );
}
