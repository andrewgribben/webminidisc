import React from 'react';
import { makeStyles } from 'tss-react/mui';
import { useDispatch, useShallowEqualSelector } from '../../frontend-utils';
import { actions as appActions, ShellSection } from '../../redux/app-feature';
import { TopMenu } from '../topmenu';
import { deckTokens } from './tokens';

const NAV_ITEMS: { id: ShellSection; label: string }[] = [
    { id: 'nowPlaying', label: 'Now Playing' },
    { id: 'library', label: 'Library' },
    { id: 'queue', label: 'Queue' },
];

const useStyles = makeStyles()(() => ({
    root: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        padding: '10px 4px 14px',
        borderBottom: `1.5px solid ${deckTokens.border}`,
        marginBottom: 12,
        minWidth: 0,
    },
    brandBlock: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 10,
        minWidth: 0,
    },
    brand: {
        margin: 0,
        fontFamily: deckTokens.fontSans,
        fontSize: 22,
        fontWeight: 600,
        letterSpacing: '-0.02em',
        color: deckTokens.ink,
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        '& span': {
            color: deckTokens.accent,
        },
    },
    nav: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flex: '1 1 auto',
        justifyContent: 'center',
        minWidth: 0,
        flexWrap: 'wrap',
    },
    link: {
        appearance: 'none',
        background: 'none',
        border: 'none',
        margin: 0,
        padding: '8px 12px',
        fontFamily: deckTokens.fontSans,
        fontSize: 14,
        fontWeight: 500,
        color: deckTokens.muted,
        cursor: 'pointer',
        position: 'relative',
        borderRadius: deckTokens.radius,
        transition: 'color 120ms ease',
        '&:hover': {
            color: deckTokens.ink,
        },
        '&:focus': {
            outline: 'none',
        },
        '&:focus-visible': {
            outline: `2px solid ${deckTokens.focusRing}`,
            outlineOffset: 2,
        },
    },
    linkActive: {
        color: deckTokens.ink,
        '&::after': {
            content: '""',
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 4,
            height: 2,
            backgroundColor: deckTokens.accent,
        },
    },
    meta: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginLeft: 'auto',
    },
    device: {
        fontFamily: deckTokens.fontMono,
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: deckTokens.muted,
        maxWidth: 160,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
}));

export type DeckNavBarProps = {
    deviceName?: string;
    tracksSelected?: number[];
};

export function DeckNavBar({ deviceName, tracksSelected }: DeckNavBarProps) {
    const { classes, cx } = useStyles();
    const dispatch = useDispatch();
    const shellSection = useShallowEqualSelector((state) => state.appState.shellSection);

    return (
        <header className={classes.root} aria-label="App navigation">
            <div className={classes.brandBlock}>
                <h1 className={classes.brand}>
                    Web <span>MiniDisc</span> Pro
                </h1>
            </div>
            <nav className={classes.nav} aria-label="Primary">
                {NAV_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={cx(classes.link, shellSection === item.id && classes.linkActive)}
                        aria-current={shellSection === item.id ? 'page' : undefined}
                        onClick={() => dispatch(appActions.setShellSection(item.id))}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>
            <div className={classes.meta}>
                {deviceName ? (
                    <span className={classes.device} title={deviceName}>
                        {deviceName}
                    </span>
                ) : null}
                <TopMenu tracksSelected={tracksSelected} />
            </div>
        </header>
    );
}
