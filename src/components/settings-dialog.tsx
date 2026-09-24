import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { batchActions, useDispatch } from '../frontend-utils';
import { forAnyDesktop, forWideDesktop, useShallowEqualSelector } from '../frontend-utils';

import { actions as appActions } from '../redux/app-feature';

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Slide, { SlideProps } from '@mui/material/Slide';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { makeStyles } from 'tss-react/mui';
import { AudioServices } from '../services/audio-export-service-manager';
import { renderCustomParameter } from './custom-parameters-renderer';
import { initializeParameters, isAllValid } from '../custom-parameters';
import { SettingInterface } from '../bridge-types';
import { LibraryServices } from '../services/library-services';
import {
    deleteEmbeddedDowntifyCookies,
    EMBEDDED_DOWNTIFY_FORMATS,
    EmbeddedDowntifyFormat,
    embeddedDowntifyFormatLabel,
    readEmbeddedLibraryOptions,
    uploadEmbeddedDowntifyCookies,
    writeEmbeddedDowntifyFormat,
    writeEmbeddedYoutubeFallback,
    DowntifyCookieStatus,
} from '../services/library/downtify-library';

const Transition = React.forwardRef(function Transition(props: SlideProps, ref: React.Ref<unknown>) {
    return <Slide direction="up" ref={ref} {...props} />;
});

function deepCompare<T>(a: T, b: T) {
    if (typeof a !== 'object') {
        return a === b;
    }
    if (Array.isArray(a)) {
        for (const e in a) {
            if (a[e] !== (b as any)[e]) return false;
        }
        return true;
    }
    for (const [k, v] of Object.entries(a as any)) {
        if (!deepCompare(v, (b as any)[k])) return false;
    }
    return true;
}

const useStyles = makeStyles()((theme) => ({
    main: {
        [forAnyDesktop(theme)]: {
            height: 600,
        },
        [forWideDesktop(theme)]: {
            height: 700,
        },
    },
    propertyBox: {
        display: 'flex',
        alignItems: 'center',
        marginRight: 0,
    },
    spread: {
        display: 'block',
        flexGrow: 1,
    },
    wider: {
        minWidth: 150,
    },
    header: {
        color: theme.palette.primary.main,
        '&:not(:first-of-type)': {
            marginTop: theme.spacing(3),
        },
    },
    fieldMargin: {
        marginLeft: theme.spacing(2),
    },
    encoderDescription: {
        marginLeft: theme.spacing(2),
        marginBottom: theme.spacing(2),
        marginTop: theme.spacing(2),
    },
    marginApply: {
        marginLeft: theme.spacing(2),
        paddingRight: theme.spacing(2),
    },
    row: {
        display: 'flex',
        gap: theme.spacing(1),
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
    },
    noLeftMargin: {
        marginLeft: 0,
    },
}));

const SimpleField = ({
    children,
    name,
    classes,
    formControl = false,
    tooltip,
}: {
    name: string;
    formControl?: boolean;
    children: ReactElement<any, any>;
    classes: ReturnType<typeof useStyles>['classes'];
    tooltip?: string;
}) => {
    const element = formControl ? (
        <FormControlLabel
            labelPlacement="start"
            label={name + ':'}
            name={name + ':'}
            control={children}
            classes={{ root: classes.propertyBox, label: classes.spread }}
        />
    ) : (
        <Box className={classes.propertyBox}>
            <Typography className={classes.fieldMargin}>{name}:</Typography>
            <span className={classes.spread} />
            {children}
        </Box>
    );

    if (tooltip) {
        return <Tooltip title={tooltip}>{element}</Tooltip>;
    } else {
        return element;
    }
};

const NativeFields = ({ section, classes }: { section: string; classes: any }) => {
    if (!window.native?.getSettings) return <></>;

    const [settings, setSettings] = useState<SettingInterface[]>([]);
    const [_state, _updateState] = useState({});
    useEffect(() => {
        (async () => {
            const settings = await window.native!.getSettings!();
            setSettings(settings);
        })();
    }, [_state]);

    const filtered = settings.filter((e) => e.family === section);
    const updateState = () => _updateState({});

    return filtered.map((entry) => {
        if (entry.type === 'action') {
            return (
                <SimpleField name={entry.name} classes={classes} formControl={true} key={entry.family + entry.name}>
                    <Button onClick={() => entry.update(true)}>Go</Button>
                </SimpleField>
            );
        } else if (entry.type === 'boolean') {
            return (
                <SimpleField name={entry.name} classes={classes} formControl={true} key={entry.family + entry.name}>
                    <Switch checked={entry.state as boolean} onChange={(e) => entry.update(!entry.state).then(updateState)} />
                </SimpleField>
            );
        } else {
            return renderCustomParameter(
                {
                    type: entry.type,
                    userFriendlyName: entry.name,
                    varName: entry.family + entry.name,
                },
                entry.state,
                (_, nv) => entry.update(nv).then(updateState),
                classes.marginApply
            );
        }
    });
};

export const SettingsDialog = (props: {}) => {
    const dispatch = useDispatch();
    const { classes } = useStyles();

    const visible = useShallowEqualSelector((state) => state.appState.settingsDialogVisible);

    // Appearance properties
    const { colorTheme, pageFullHeight, pageFullWidth } = useShallowEqualSelector((state) => state.appState);

    // Functionality properties
    const { fullWidthSupport } = useShallowEqualSelector((state) => state.appState);
    const {
        archiveDiscCreateZip,
        factoryModeUseSlowerExploit,
        factoryModeShortcuts,
        factoryModeNERAWDownload,
        discProtectedDialogDisabled,
    } = useShallowEqualSelector((state) => state.appState);

    // Encoder properties
    const {
        audioExportService: globalStateAudioExportService,
        audioExportServiceConfig: globalStateAudioExportServiceConfig,
        libraryService: globalStateLibraryService,
        libraryServiceConfig: globalStateLibraryServiceConfig,
    } = useShallowEqualSelector((state) => state.appState);
    const [currentExportService, setCurrentExportService] = useState(globalStateAudioExportService);
    const [currentExportServiceConfig, setExportServiceConfig] = useState(globalStateAudioExportServiceConfig);
    const [currentLibraryService, setCurrentLibraryService] = useState(globalStateLibraryService);
    const [currentLibraryServiceConfig, setLibraryServiceConfig] = useState(globalStateLibraryServiceConfig);
    const currentService = AudioServices[currentExportService ?? 0];
    const currentLibrary = LibraryServices[currentLibraryService ?? -1];
    const [downtifyFormat, setDowntifyFormat] = useState<EmbeddedDowntifyFormat>('flac');
    const [downtifyFormatReady, setDowntifyFormatReady] = useState(false);
    const [downtifyFormatError, setDowntifyFormatError] = useState<string | null>(null);
    const [youtubeFallback, setYoutubeFallback] = useState(false);
    const [cookies, setCookies] = useState<DowntifyCookieStatus | null>(null);
    const [cookiesBusy, setCookiesBusy] = useState(false);

    useEffect(() => {
        if (!visible) {
            return;
        }
        let cancelled = false;
        setDowntifyFormatReady(false);
        readEmbeddedLibraryOptions()
            .then((options) => {
                if (!cancelled) {
                    setDowntifyFormat(options.format);
                    setYoutubeFallback(options.youtubeFallback);
                    setCookies(options.cookies);
                    setDowntifyFormatError(null);
                    setDowntifyFormatReady(true);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setDowntifyFormatError(err instanceof Error ? err.message : 'Could not read Downtify settings');
                    setDowntifyFormatReady(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [visible]);

    // Functions required for the app to calculate weather or not it needs to restart to apply the changes,
    // create the initial state, etc...
    // Later more reboot-sensitive fileds can be added
    const getStateRebootRequired = useMemo(
        () => () => ({
            currentExportServiceConfig,
            currentExportService,
            currentLibraryService,
            currentLibraryServiceConfig,
        }),
        [currentExportServiceConfig, currentExportService, currentLibraryService, currentLibraryServiceConfig]
    );
    const saveBeforeReset = useCallback(() => {
        dispatch(
            batchActions([
                appActions.setAudioExportService(currentExportService),
                appActions.setAudioExportServiceConfig(currentExportServiceConfig),
                appActions.setLibraryService(currentLibraryService),
                appActions.setLibraryServiceConfig(currentLibraryServiceConfig),
            ])
        );
    }, [dispatch, currentExportService, currentExportServiceConfig, currentLibraryService, currentLibraryServiceConfig]);

    const [initialState, setInitialState] = useState<ReturnType<typeof getStateRebootRequired> | null>(null);

    // "Constructor" code
    useEffect(() => {
        if (visible && initialState === null) {
            // Save the initial state when the dialog opens
            setInitialState(getStateRebootRequired());
        }
    }, [visible, initialState, getStateRebootRequired]);

    const isRestartRequired = useCallback(() => {
        if (initialState === null) return false;
        return !deepCompare(getStateRebootRequired(), initialState);
    }, [initialState, getStateRebootRequired]);

    const verifyIfInputsValid = useCallback(() => {
        // Later more inputs can be added
        const canExit = isAllValid(currentService.customParameters, currentExportServiceConfig);
        return canExit;
    }, [currentExportServiceConfig, currentService.customParameters]);

    //Appearance configuration
    const handleThemeChange = useCallback(
        (event: any) => {
            dispatch(appActions.setDarkMode(event.target.value as any));
        },
        [dispatch]
    );
    const handlePageFullHeightChange = useCallback(() => {
        dispatch(appActions.setPageFullHeight(!pageFullHeight));
    }, [dispatch, pageFullHeight]);
    const handlePageFullWidthChange = useCallback(() => {
        dispatch(appActions.setPageFullWidth(!pageFullWidth));
    }, [dispatch, pageFullWidth]);

    // Functionality configuration
    const handleToggleFullWidth = useCallback(() => {
        dispatch(appActions.setFullWidthSupport(!fullWidthSupport));
    }, [dispatch, fullWidthSupport]);
    const handleToggleDiscProtectedDialogDisabled = useCallback(() => {
        dispatch(appActions.disableDiscProtectedDialog(!discProtectedDialogDisabled));
    }, [dispatch, discProtectedDialogDisabled]);
    const handleToggleArchiveDiscCreateZip = useCallback(() => {
        dispatch(appActions.setArchiveDiscCreateZip(!archiveDiscCreateZip));
    }, [dispatch, archiveDiscCreateZip]);
    const handleToggleFactoryModeUseSlowerExploits = useCallback(() => {
        dispatch(appActions.setFactoryModeUseSlowerExploit(!factoryModeUseSlowerExploit));
    }, [dispatch, factoryModeUseSlowerExploit]);
    const handleToggleFactoryModeShortcuts = useCallback(() => {
        dispatch(appActions.setFactoryModeShortcuts(!factoryModeShortcuts));
    }, [dispatch, factoryModeShortcuts]);
    const handleToggleFactoryModeNERAWDownload = useCallback(() => {
        dispatch(appActions.setFactoryModeNERAWDownload(!factoryModeNERAWDownload));
    }, [dispatch, factoryModeNERAWDownload]);
    //Encoder configuration
    const handleExportServiceChanges = useCallback((event: any) => {
        const serviceId = event.target.value as number;
        setCurrentExportService(serviceId);
        setExportServiceConfig(initializeParameters(AudioServices[serviceId].customParameters));
    }, []);

    const handleExportServiceParameterChange = useCallback((varName: string, value: string | number | boolean) => {
        setExportServiceConfig((oldData) => {
            const newData = { ...oldData };
            newData[varName] = value;
            return newData;
        });
    }, []);
    const handleLibraryServiceChanges = useCallback((event: any) => {
        const serviceId = event.target.value as number;
        setCurrentLibraryService(serviceId);
        if (serviceId === -1) return;
        setLibraryServiceConfig(initializeParameters(LibraryServices[serviceId].customParameters));
    }, []);

    const handleDowntifyFormatChange = useCallback((event: { target: { value: unknown } }) => {
        const format = event.target.value;
        if (typeof format !== 'string' || !(EMBEDDED_DOWNTIFY_FORMATS as readonly string[]).includes(format)) {
            return;
        }
        const next = format as EmbeddedDowntifyFormat;
        setDowntifyFormat(next);
        setDowntifyFormatError(null);
        writeEmbeddedDowntifyFormat(next).catch((err: unknown) => {
            setDowntifyFormatError(err instanceof Error ? err.message : 'Could not save Downtify format');
        });
    }, []);

    const handleYoutubeFallbackChange = useCallback(() => {
        const next = !youtubeFallback;
        setYoutubeFallback(next);
        setDowntifyFormatError(null);
        writeEmbeddedYoutubeFallback(next).catch((err: unknown) => {
            setYoutubeFallback(!next);
            setDowntifyFormatError(err instanceof Error ? err.message : 'Could not save YouTube fallback');
        });
    }, [youtubeFallback]);

    const handleCookieFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
            return;
        }
        setCookiesBusy(true);
        setDowntifyFormatError(null);
        file
            .text()
            .then((content) => uploadEmbeddedDowntifyCookies(content))
            .then((next) => {
                setCookies(next);
                const warning = next.warnings && next.warnings.length > 0 ? next.warnings.join(' ') : null;
                setDowntifyFormatError(warning);
            })
            .catch((err: unknown) => {
                setDowntifyFormatError(err instanceof Error ? err.message : 'Could not save cookies.txt');
            })
            .finally(() => setCookiesBusy(false));
    }, []);

    const handleDeleteCookies = useCallback(() => {
        setCookiesBusy(true);
        setDowntifyFormatError(null);
        deleteEmbeddedDowntifyCookies()
            .then(() => setCookies({ configured: false, locked: false, source: null }))
            .catch((err: unknown) => {
                setDowntifyFormatError(err instanceof Error ? err.message : 'Could not remove cookies.txt');
            })
            .finally(() => setCookiesBusy(false));
    }, []);

    const handleLibraryServiceParameterChange = useCallback((varName: string, value: string | number | boolean) => {
        setLibraryServiceConfig((oldData) => {
            const newData = { ...oldData };
            newData[varName] = value;
            return newData;
        });
    }, []);

    const handleClose = useCallback(() => {
        setInitialState(null);
        if (isRestartRequired()) {
            saveBeforeReset();
            // Trigger a reset.
            window.reload();
        } else {
            dispatch(appActions.showSettingsDialog(false));
        }
    }, [isRestartRequired, dispatch, saveBeforeReset]);

    return (
        <Dialog
            open={visible}
            maxWidth={'sm'}
            classes={{ paper: classes.main }}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="about-dialog-slide-title"
        >
            <DialogTitle id="about-dialog-slide-title">Settings</DialogTitle>
            <DialogContent>
                <DialogContentText className={classes.header}>Appearance</DialogContentText>
                <SimpleField name="Color theme" classes={classes}>
                    <Select className={classes.wider} value={colorTheme} onChange={handleThemeChange}>
                        <MenuItem value="light">Light</MenuItem>
                        <MenuItem value="dark">Dark</MenuItem>
                        <MenuItem value="system">Device Theme</MenuItem>
                    </Select>
                </SimpleField>
                <SimpleField name="Stretch Web Minidisc Pro to fill the screen vertically" classes={classes} formControl={true}>
                    <Switch checked={pageFullHeight} onChange={handlePageFullHeightChange} />
                </SimpleField>
                <SimpleField name="Stretch Web Minidisc Pro to fill the screen horizontally" classes={classes} formControl={true}>
                    <Switch checked={pageFullWidth} onChange={handlePageFullWidthChange} />
                </SimpleField>
                <NativeFields classes={classes} section="Appearance" />

                <DialogContentText className={classes.header}>Functionality</DialogContentText>
                <SimpleField
                    name="Enable full width title editing"
                    classes={classes}
                    formControl={true}
                    tooltip="This advanced feature enables the use of Hiragana and Kanji alphabets. More about this in Support and FAQ."
                >
                    <Switch checked={fullWidthSupport} onChange={handleToggleFullWidth} />
                </SimpleField>
                <SimpleField name="Enable disc-protected warning dialog" classes={classes} formControl={true}>
                    <Switch checked={!discProtectedDialogDisabled} onChange={handleToggleDiscProtectedDialogDisabled} />
                </SimpleField>
                <SimpleField
                    name="Create a ZIP file when using 'Archive Disc'"
                    classes={classes}
                    formControl={true}
                    tooltip="Enabling it might increase memory usage when using the Homebrew mode's 'Archive Disc' feature"
                >
                    <Switch checked={archiveDiscCreateZip} onChange={handleToggleArchiveDiscCreateZip} />
                </SimpleField>
                <SimpleField
                    name="Use the slower exploit for ATRAC ripping"
                    classes={classes}
                    formControl={true}
                    tooltip="This fixes a bug where the device would lock up on a small percentage of Apple ARM-based Macs"
                >
                    <Switch checked={factoryModeUseSlowerExploit} onChange={handleToggleFactoryModeUseSlowerExploits} />
                </SimpleField>
                <SimpleField
                    name="Enable homebrew mode shortcuts"
                    classes={classes}
                    formControl={true}
                    tooltip="This enables an additional section in the menu allowing you to easily access homebrew mode features from the main menu"
                >
                    <Switch checked={factoryModeShortcuts} onChange={handleToggleFactoryModeShortcuts} />
                </SimpleField>
                <SimpleField
                    name="Download raw streams from netmd-exploits (expert feature)"
                    classes={classes}
                    formControl={true}
                    tooltip="This will cause netmd-exploits to download .NERAW files instead of .AEA or .WAV. These files can be used to reconstruct the sector layout in the player's DRAM and rebuild the track in case of a corruption"
                >
                    <Switch checked={factoryModeNERAWDownload} onChange={handleToggleFactoryModeNERAWDownload} />
                </SimpleField>
                <NativeFields classes={classes} section="Functionality" />

                <DialogContentText className={classes.header}>Encoding</DialogContentText>
                <SimpleField name="LP / HiMD encoder to use" classes={classes}>
                    <Select className={classes.wider} value={currentExportService} onChange={handleExportServiceChanges}>
                        {AudioServices.map((n, i) => (
                            <MenuItem value={i} key={`${i}`}>
                                {n.name}
                            </MenuItem>
                        ))}
                    </Select>
                </SimpleField>
                <Typography className={classes.encoderDescription}>{currentService.description}</Typography>
                <Box className={classes.fieldMargin}>
                    {currentService.customParameters?.map((n) =>
                        renderCustomParameter(
                            n,
                            currentExportServiceConfig![n.varName],
                            handleExportServiceParameterChange,
                            classes.noLeftMargin
                        )
                    )}
                </Box>

                <DialogContentText className={classes.header}>Library</DialogContentText>
                <SimpleField name="Library to use" classes={classes}>
                    <Select className={classes.wider} value={currentLibraryService} onChange={handleLibraryServiceChanges}>
                        <MenuItem value={-1} key="library-none">
                            None
                        </MenuItem>
                        {LibraryServices.map((n, i) => (
                            <MenuItem value={i} key={`lib-${i}`}>
                                {n.name}
                            </MenuItem>
                        ))}
                    </Select>
                </SimpleField>
                {currentLibrary && (
                    <>
                        <Typography className={classes.encoderDescription}>{currentLibrary.description}</Typography>
                        <Box className={classes.fieldMargin}>
                            {currentLibrary.customParameters?.map((n) =>
                                renderCustomParameter(
                                    n,
                                    currentLibraryServiceConfig![n.varName],
                                    handleLibraryServiceParameterChange,
                                    classes.noLeftMargin
                                )
                            )}
                        </Box>
                    </>
                )}
                <SimpleField
                    name="Embedded Downtify download format"
                    classes={classes}
                    tooltip="Format used by the Downtify running inside Web MiniDisc. FLAC is the best source for MiniDisc SP. This does not change the separate Downtify app."
                >
                    <Select
                        className={classes.wider}
                        value={downtifyFormat}
                        onChange={handleDowntifyFormatChange}
                        disabled={!downtifyFormatReady}
                    >
                        {EMBEDDED_DOWNTIFY_FORMATS.map((format) => (
                            <MenuItem value={format} key={format}>
                                {embeddedDowntifyFormatLabel(format)}
                            </MenuItem>
                        ))}
                    </Select>
                </SimpleField>
                <SimpleField
                    name="Search YouTube if YouTube Music has no close match"
                    classes={classes}
                    formControl={true}
                    tooltip="YouTube Music is tried first. When it has no close match, regular YouTube is searched next. This does not change the separate Downtify app."
                >
                    <Switch checked={youtubeFallback} onChange={handleYoutubeFallbackChange} disabled={!downtifyFormatReady} />
                </SimpleField>
                <SimpleField
                    name="YouTube cookies.txt"
                    classes={classes}
                    tooltip="Netscape cookies.txt exported while logged into YouTube. Used when a track is age-restricted or YouTube asks for a sign-in. This copy already has the file from the other Downtify if one was uploaded there."
                >
                    <Box className={classes.row}>
                        <Typography variant="caption" color="textSecondary">
                            {cookies?.configured ? 'Cookies are set.' : 'No cookies file.'}
                        </Typography>
                        <Button size="small" component="label" disabled={!downtifyFormatReady || cookiesBusy || cookies?.locked === true}>
                            {cookies?.configured ? 'Replace' : 'Upload'}
                            <input hidden type="file" accept=".txt,text/plain" onChange={handleCookieFile} />
                        </Button>
                        {cookies?.configured && !cookies.locked ? (
                            <Button size="small" disabled={cookiesBusy} onClick={handleDeleteCookies}>
                                Remove
                            </Button>
                        ) : null}
                    </Box>
                </SimpleField>
                {downtifyFormatError ? (
                    <Typography className={classes.encoderDescription} color="error">
                        {downtifyFormatError}
                    </Typography>
                ) : null}
                <NativeFields classes={classes} section="Encoding" />
            </DialogContent>
            <DialogActions>
                <Button disabled={!verifyIfInputsValid()} onClick={handleClose}>
                    {isRestartRequired() ? 'Save and Reload' : 'Close'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
