import React, { useCallback, lazy, Suspense, useEffect, useRef } from 'react';
import { belowDesktop, forAnyDesktop, forWideDesktop, useDispatch, useShallowEqualSelector } from '../frontend-utils';

import CssBaseline from '@mui/material/CssBaseline';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';

import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { W95App } from './win95/app';
import { FilePlayer } from './file-player';
import { validateAndLoadEncoders } from '../redux/actions';
import { EncoderDownloadDialog } from './encoder-download-dialog';
import { SettingsDialog } from './settings-dialog';
import { LabelStudioDialog } from './label-studio-dialog';
import { isLabelDesignMode } from '../services/labels/demo-disc';
import { AdaptiveFile } from '../utils';
import { actions as appActions } from '../redux/app-feature';
import { actions as convertDialogActions } from '../redux/convert-dialog-feature';
import { LibraryScreen } from './library-screen';
import { QueueScreen } from './queue-screen';
import { DeckNavBar, deckTokens } from './deck-ui';

const Toc = lazy(() => import('./factory/factory'));
const Welcome = lazy(() => import('./welcome'));
const Main = lazy(() => import('./main'));
const useStyles = makeStyles()((theme) => ({
    layout: {
        width: 'auto',
        height: '100%',
        [forAnyDesktop(theme)]: {
            width: 600,
            marginLeft: 'auto',
            marginRight: 'auto',
        },
        [forWideDesktop(theme)]: {
            width: 700,
        },
    },
    layoutDeck: {
        [forAnyDesktop(theme)]: {
            width: 'min(1100px, 96%)',
            marginLeft: 'auto',
            marginRight: 'auto',
        },
        [forWideDesktop(theme)]: {
            width: 'min(1180px, 96%)',
        },
    },

    paper: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        padding: theme.spacing(2),
        height: 'calc(100% - 20px)',
        [forAnyDesktop(theme)]: {
            marginTop: theme.spacing(2),
            marginBottom: theme.spacing(1),
            padding: theme.spacing(3),
            height: 200,
        },
        [forWideDesktop(theme)]: {
            height: 250,
        },
    },
    paperDeck: {
        backgroundColor: deckTokens.surface,
        border: `1.5px solid ${deckTokens.border}`,
        borderRadius: deckTokens.radius,
        boxShadow: '0 18px 40px rgba(17, 17, 17, 0.08)',
        padding: theme.spacing(1.5),
        overflow: 'hidden',
        [forAnyDesktop(theme)]: {
            marginTop: theme.spacing(2),
            marginBottom: theme.spacing(1),
            padding: theme.spacing(1.5),
            height: 'auto',
            minHeight: 640,
            maxHeight: 'calc(100% - 48px)',
        },
        [forWideDesktop(theme)]: {
            minHeight: 700,
        },
        [belowDesktop(theme)]: {
            padding: theme.spacing(1),
            height: 'calc(100% - 28px)',
        },
    },
    paperShowsList: {
        [forAnyDesktop(theme)]: {
            height: 600,
        },
        [forWideDesktop(theme)]: {
            height: 700,
        },
    },
    paperFullHeight: {
        height: 'calc(100% - 50px)',
    },
    layoutFullWidth: {
        [forAnyDesktop(theme)]: {
            width: '90%',
        },
    },
    bottomBar: {
        display: 'flex',
        alignItems: 'center',
        [belowDesktop(theme)]: {
            flexWrap: 'wrap',
        },
        marginLeft: -theme.spacing(2),
    },
    copyrightTypography: {
        textAlign: 'center',
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1000,
        color: '#fff',
    },
    minidiscLogo: {
        width: 48,
    },
}));

const deckTypography = {
    fontFamily: deckTokens.fontSans,
    h1: { fontFamily: deckTokens.fontSans, fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontFamily: deckTokens.fontSans, fontWeight: 600, letterSpacing: '-0.02em' },
    h3: { fontFamily: deckTokens.fontSans, fontWeight: 600 },
    h4: { fontFamily: deckTokens.fontSans, fontWeight: 600 },
    h5: { fontFamily: deckTokens.fontSans, fontWeight: 600 },
    h6: { fontFamily: deckTokens.fontSans, fontWeight: 600 },
    button: { fontFamily: deckTokens.fontSans, fontWeight: 500, textTransform: 'none' as const },
    overline: { fontFamily: deckTokens.fontMono, letterSpacing: '0.12em' },
    caption: { fontFamily: deckTokens.fontMono },
};

const themeCommons = {
    typography: deckTypography,
    shape: { borderRadius: deckTokens.radius },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                ':root': {
                    '--deck-surface': deckTokens.surface,
                    '--deck-surface-muted': deckTokens.surfaceMuted,
                    '--deck-ink': deckTokens.ink,
                    '--deck-muted': deckTokens.muted,
                    '--deck-accent': deckTokens.accent,
                    '--deck-accent-hover': deckTokens.accentHover,
                    '--deck-border': deckTokens.border,
                    '--deck-lcd-bg': deckTokens.lcdBg,
                    '--deck-lcd-ink': deckTokens.lcdInk,
                    '--deck-meter-track': deckTokens.meterTrack,
                    '--deck-font-sans': deckTokens.fontSans,
                    '--deck-font-mono': deckTokens.fontMono,
                },
            },
        },
        MuiSelect: {
            defaultProps: { variant: 'standard' },
        },
        MuiPaper: {
            defaultProps: { elevation: 1 },
            styleOverrides: {
                elevation24: {
                    backgroundImage: 'none !important',
                },
            },
        },
        MuiDialog: {
            defaultProps: {
                PaperProps: {
                    elevation: 0,
                },
            },
        },
        MuiMenu: {
            defaultProps: {
                PaperProps: {
                    elevation: 24,
                },
            },
        },
        MuiTextField: {
            defaultProps: { variant: 'standard' },
        },
        MuiButtonBase: {
            defaultProps: {
                disableRipple: false,
            },
            styleOverrides: {
                root: {
                    '&.Mui-focusVisible': {
                        outline: `2px solid ${deckTokens.focusRing}`,
                        outlineOffset: 2,
                    },
                },
            },
        },
    },
} as const;

const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            light: '#FF7A40',
            main: deckTokens.accent,
            dark: deckTokens.accentHover,
            contrastText: '#fff',
        },
        secondary: {
            light: '#FF7A40',
            main: deckTokens.accent,
            dark: deckTokens.accentHover,
            contrastText: '#fff',
        },
        error: {
            light: '#e57373',
            main: '#f44336',
            dark: '#d32f2f',
            contrastText: '#fff',
        },
        warning: {
            light: '#ffb74d',
            main: '#ff9800',
            dark: '#f57c00',
            contrastText: 'rgba(0, 0, 0, 0.87)',
        },
        info: {
            light: '#64b5f6',
            main: '#2196f3',
            dark: '#1976d2',
            contrastText: '#fff',
        },
        success: {
            light: '#81c784',
            main: '#4caf50',
            dark: '#388e3c',
            contrastText: 'rgba(0, 0, 0, 0.87)',
        },
        text: {
            primary: deckTokens.ink,
            secondary: deckTokens.muted,
            disabled: 'rgba(17, 17, 17, 0.38)',
        },
        background: {
            paper: deckTokens.surface,
            default: deckTokens.surfaceMuted,
        },
        divider: deckTokens.borderHairline,
        action: {
            active: deckTokens.ink,
            hover: 'rgba(17, 17, 17, 0.04)',
            hoverOpacity: 0.04,
            selected: 'rgba(255, 77, 0, 0.12)',
            selectedOpacity: 0.12,
            disabled: 'rgba(17, 17, 17, 0.26)',
            disabledBackground: 'rgba(17, 17, 17, 0.12)',
            disabledOpacity: 0.38,
            focus: 'rgba(255, 77, 0, 0.18)',
            focusOpacity: 0.18,
            activatedOpacity: 0.12,
        },
    },
    ...themeCommons,
});

const InternalApp = () => {
    const { mainView, shellSection, loading, pageFullHeight, pageFullWidth } = useShallowEqualSelector((state) => state.appState);
    const { deviceCapabilities, deviceName } = useShallowEqualSelector((state) => state.main);
    const { classes, cx } = useStyles();
    const dispatch = useDispatch();
    const [labelDesignOpen, setLabelDesignOpen] = React.useState(() => isLabelDesignMode());
    const encodeFilesRef = useRef<(files: (File | AdaptiveFile)[]) => void>(() => {});
    const showShellNav = mainView === 'WELCOME' || mainView === 'MAIN';
    const isDeckShell = showShellNav;
    const showNowPlaying = shellSection === 'nowPlaying';
    const showLibrary = shellSection === 'library';
    const showQueue = shellSection === 'queue';
    const openDeckDialog = useShallowEqualSelector(
        (state) =>
            state.appState.mainView === 'MAIN' &&
            (state.uploadDialog.visible ||
                state.recordDialog.visible ||
                state.renameDialog.visible ||
                state.errorDialog.visible ||
                state.panicDialog.visible ||
                state.dumpDialog.visible ||
                state.songRecognitionDialog.visible ||
                state.songRecognitionProgressDialog.visible ||
                state.factoryNoticeDialog.visible ||
                state.factoryProgressDialog.visible ||
                state.factoryBadSectorDialog.visible ||
                state.localLibrary.visible ||
                state.convertDialog.visible)
    );

    // At init, connect to server and check for encoders.
    useEffect(() => {
        dispatch(validateAndLoadEncoders(true));
    }, [dispatch]);

    useEffect(() => {
        if (isLabelDesignMode()) {
            setLabelDesignOpen(true);
        }
    }, []);

    useEffect(() => {
        document.body.classList.add('deck-theme');
        return () => document.body.classList.remove('deck-theme');
    }, []);

    const bindEncodeFiles = useCallback((encode: (files: (File | AdaptiveFile)[]) => void) => {
        encodeFilesRef.current = encode;
    }, []);

    const handleLibraryEncode = useCallback(
        (files: AdaptiveFile[]) => {
            if (files.length === 0) {
                return;
            }
            encodeFilesRef.current(files);
            dispatch(convertDialogActions.setVisible(true));
        },
        [dispatch]
    );

    useEffect(() => {
        if (openDeckDialog && shellSection !== 'nowPlaying') {
            dispatch(appActions.setShellSection('nowPlaying'));
        }
    }, [dispatch, openDeckDialog, shellSection]);

    return (
        <React.Fragment>
            <CssBaseline />

            <Suspense
                fallback={
                    <Backdrop open={true}>
                        <CircularProgress color="info" />
                    </Backdrop>
                }
            >
                <main
                    className={cx(classes.layout, {
                        [classes.layoutFullWidth]: pageFullWidth && !isDeckShell,
                        [classes.layoutDeck]: isDeckShell,
                    })}
                >
                    <Paper
                        elevation={isDeckShell ? 0 : 1}
                        className={cx(classes.paper, {
                            [classes.paperShowsList]: !isDeckShell && deviceCapabilities.includes(0 /*Capability.listContent*/),
                            [classes.paperFullHeight]: pageFullHeight,
                            [classes.paperDeck]: isDeckShell,
                        })}
                    >
                        {showShellNav ? <DeckNavBar deviceName={mainView === 'MAIN' ? deviceName : undefined} /> : null}
                        {mainView === 'FACTORY' ? <Toc /> : null}
                        {mainView !== 'FACTORY' && showNowPlaying && mainView === 'WELCOME' ? <Welcome shellDialogs={false} /> : null}
                        {mainView === 'MAIN' ? (
                            <Suspense fallback={null}>
                                <Main deckVisible={showNowPlaying} bindEncodeFiles={bindEncodeFiles} shellDialogs={false} />
                            </Suspense>
                        ) : null}
                        {mainView !== 'FACTORY' && showLibrary ? (
                            <LibraryScreen onUseFiles={handleLibraryEncode} canEncode={mainView === 'MAIN'} />
                        ) : null}
                        {mainView !== 'FACTORY' && showQueue ? <QueueScreen /> : null}
                        {mainView === 'MAIN' ? <FilePlayer /> : null}
                    </Paper>
                    <Typography variant="body2" color="textSecondary" className={classes.copyrightTypography}>
                        {'© '}
                        <Link rel="noopener noreferrer" color="inherit" target="_blank" href="https://stefano.brilli.me/">
                            Stefano Brilli
                        </Link>
                        {', '}
                        <Link rel="noopener noreferrer" color="inherit" target="_blank" href="https://github.com/asivery/">
                            Asivery
                        </Link>{' '}
                        {new Date().getFullYear()}
                        {'.'}
                    </Typography>
                </main>
            </Suspense>

            {loading ? (
                <Backdrop className={classes.backdrop} open={loading}>
                    <CircularProgress color="info" />
                </Backdrop>
            ) : null}

            <SettingsDialog />
            <EncoderDownloadDialog />
            {labelDesignOpen ? (
                <LabelStudioDialog
                    open={labelDesignOpen}
                    designMode
                    onClose={() => {
                        setLabelDesignOpen(false);
                        const url = new URL(window.location.href);
                        if (url.searchParams.get('labels') === 'design') {
                            url.searchParams.delete('labels');
                            window.history.replaceState({}, '', url.toString());
                        }
                    }}
                />
            ) : null}
        </React.Fragment>
    );
};

const App = () => {
    const { vintageMode } = useShallowEqualSelector((state) => state.appState);

    if (vintageMode) {
        return <W95App />;
    }

    // Industrial deck is a light cream chassis; dark/system MUI palettes paint light
    // text and blue accents on that surface and wash out the track list.
    return (
        <ThemeProvider theme={lightTheme}>
            <InternalApp />
        </ThemeProvider>
    );
};

export default App;
