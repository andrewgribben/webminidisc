import React, { useEffect, useCallback, useState } from 'react';
import { useDeviceCapabilities, useDispatch } from '../frontend-utils';
import { FileRejection, useDropzone } from 'react-dropzone';
import {
    DragDropContext,
    Draggable,
    DraggableProvided,
    DropResult,
    ResponderProvided,
    Droppable,
    DroppableProvided,
    DroppableStateSnapshot,
} from 'react-beautiful-dnd';
import {
    listContent,
    deleteTracks,
    moveTrack,
    groupTracks,
    deleteGroups,
    dragDropTrack,
    ejectDisc,
    flushDevice,
    control,
    openLocalLibrary,
    openRecognizeTrackDialog,
} from '../redux/actions';
import { actions as renameDialogActions, RenameType } from '../redux/rename-dialog-feature';
import { actions as convertDialogActions } from '../redux/convert-dialog-feature';
import { actions as dumpDialogActions } from '../redux/dump-dialog-feature';
import { actions as appStateActions } from '../redux/app-feature';
import { actions as contextMenuActions } from '../redux/context-menu-feature';

import { DeviceStatus } from 'netmd-js';

import {
    formatTimeFromSeconds,
    getGroupedTracks,
    getSortedTracks,
    getTracks,
    isSequential,
    acceptedTypes,
    AdaptiveFile,
    bytesToHumanReadable,
} from '../utils';
import { belowDesktop, forAnyDesktop, useShallowEqualSelector, batchActions } from '../frontend-utils';

import { makeStyles } from 'tss-react/mui';
import { alpha, lighten } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Backdrop from '@mui/material/Backdrop';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import EjectIcon from '@mui/icons-material/Eject';
import DoneIcon from '@mui/icons-material/Done';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DownloadIcon from '@mui/icons-material/Download';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import AlbumIcon from '@mui/icons-material/Album';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Controls from './controls';
import {
    DeckActionTile,
    DeckPanel,
    HardwareButton,
    MeterBar,
    StatusStrip,
    deckTokens,
} from './deck-ui';

import { GroupRow, LeftInNondefaultCodecs, MockTrackRow, TrackRow } from './main-rows';
import { RenameDialog } from './rename-dialog';
import { UploadDialog } from './upload-dialog';
import { RecordDialog } from './record-dialog';
import { ErrorDialog } from './error-dialog';
import { PanicDialog } from './panic-dialog';
import { ConvertDialog } from './convert-dialog';
import { AboutDialog } from './about-dialog';
import { DumpDialog } from './dump-dialog';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import { W95Main } from './win95/main';
import { useMemo } from 'react';
import { ChangelogDialog } from './changelog-dialog';
import { getDefaultCodecName, Track } from '../services/interfaces/netmd';
import { FactoryModeNoticeDialog } from './factory/factory-notice-dialog';
import { FactoryModeProgressDialog } from './factory/factory-progress-dialog';
import { SongRecognitionDialog } from './song-recognition-dialog';
import { SongRecognitionProgressDialog } from './song-recognition-progress-dialog';
import { SettingsDialog } from './settings-dialog';
import { FactoryModeBadSectorDialog } from './factory/factory-bad-sector-dialog';
import { DiscProtectedDialog } from './disc-protected-dialog';
import { ContextMenu } from './context-menu';
import { LocalLibraryDialog } from './local-library';
import { MatchAlbumDialog } from './match-album-dialog';
import { LabelStudioDialog } from './label-studio-dialog';
import { DowntifyLibraryService } from '../services/library/downtify-library';
import { actions as discLibraryActions } from '../redux/disc-library-feature';
import { loadKnownDisc, saveDiscAudio } from '../redux/disc-library-actions';
import { Menu, MenuItem } from '@mui/material';
import serviceRegistry from '../services/registry';
import { ManageEncodersDialog } from './manage-encoders-dialog';

// TODO jss-to-tss-react codemod: Unable to handle style definition reliably. Unsupported arrow function syntax.
//Unexpected value type of ConditionalExpression.
const useStyles = makeStyles()((theme) => ({
    deckRoot: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(1.25),
        flex: '1 1 auto',
        minHeight: 0,
        height: '100%',
        outline: 'none',
        color: deckTokens.ink,
        fontFamily: deckTokens.fontSans,
    },
    brandBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing(1.5),
        flexWrap: 'wrap',
        padding: theme.spacing(0.5, 0.25),
        borderBottom: `1.5px solid ${deckTokens.border}`,
        paddingBottom: theme.spacing(1),
    },
    brandMark: {
        display: 'flex',
        alignItems: 'baseline',
        gap: theme.spacing(1),
        minWidth: 0,
    },
    brandName: {
        margin: 0,
        fontFamily: deckTokens.fontSans,
        fontWeight: 700,
        fontSize: 'clamp(18px, 2.4vw, 26px)',
        letterSpacing: '-0.03em',
        lineHeight: 1,
        color: deckTokens.ink,
        '& span': {
            color: deckTokens.accent,
        },
    },
    brandMode: {
        fontFamily: deckTokens.fontMono,
        fontSize: 11,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: deckTokens.accent,
        fontWeight: 500,
    },
    brandMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(0.75),
        flexWrap: 'wrap',
    },
    deviceLabel: {
        fontFamily: deckTokens.fontMono,
        fontSize: 11,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: deckTokens.muted,
    },
    deckGrid: {
        display: 'grid',
        gap: theme.spacing(1.25),
        flex: '1 1 auto',
        minHeight: 0,
        gridTemplateColumns: '1fr',
        gridTemplateAreas: `
            "lcd"
            "art"
            "disc"
        `,
        [forAnyDesktop(theme)]: {
            gridTemplateColumns: 'minmax(200px, 0.9fr) minmax(260px, 1.1fr) minmax(280px, 1.2fr)',
            gridTemplateAreas: `
                "art lcd disc"
            `,
            alignItems: 'stretch',
        },
    },
    artCol: {
        gridArea: 'art',
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(1.25),
        minWidth: 0,
    },
    lcdCol: {
        gridArea: 'lcd',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
    },
    discCol: {
        gridArea: 'disc',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
    },
    cover: {
        width: '100%',
        aspectRatio: '1 / 1',
        objectFit: 'cover',
        display: 'block',
        backgroundColor: deckTokens.surfaceMuted,
        borderBottom: `1.5px solid ${deckTokens.border}`,
    },
    coverPlaceholder: {
        width: '100%',
        aspectRatio: '1 / 1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
            `linear-gradient(145deg, ${deckTokens.surfaceMuted}, #d9d3c8)`,
        borderBottom: `1.5px solid ${deckTokens.border}`,
        color: deckTokens.muted,
    },
    artActions: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: theme.spacing(1),
        [belowDesktop(theme)]: {
            gridTemplateColumns: '1fr 1fr',
        },
    },
    discHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: theme.spacing(1),
        marginBottom: theme.spacing(1),
    },
    discTitle: {
        margin: 0,
        fontWeight: 700,
        fontSize: 18,
        letterSpacing: '-0.02em',
        lineHeight: 1.15,
        cursor: 'default',
    },
    discTitleEditable: {
        cursor: 'pointer',
    },
    discSub: {
        marginTop: 4,
        fontFamily: deckTokens.fontMono,
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: deckTokens.muted,
    },
    discHeaderActions: {
        display: 'flex',
        gap: 6,
        flex: '0 0 auto',
    },
    tracklistWrap: {
        overflowY: 'auto',
        flex: '1 1 auto',
        minHeight: 160,
        marginTop: theme.spacing(1),
        borderTop: `1.5px solid ${deckTokens.borderHairline}`,
        outline: 'none',
        [forAnyDesktop(theme)]: {
            minHeight: 280,
        },
    },
    add: {
        position: 'absolute',
        bottom: theme.spacing(3),
        right: theme.spacing(3),
        [belowDesktop(theme)]: {
            bottom: theme.spacing(2),
        },
    },
    toolbar: {
        marginTop: theme.spacing(0.5),
        marginLeft: theme.spacing(-0.5),
        marginRight: theme.spacing(-0.5),
        minHeight: 40,
        paddingLeft: theme.spacing(0.5),
        paddingRight: theme.spacing(0.5),
    },
    toolbarLabel: {
        flex: '1 1 100%',
    },
    toolbarHighlight:
        theme.palette.mode === 'light'
            ? {
                  color: deckTokens.ink,
                  backgroundColor: lighten(deckTokens.accent, 0.85),
              }
            : {
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.secondary.dark,
              },
    headBox: {
        display: 'flex',
        justifyContent: 'space-between',
    },
    spacing: {
        marginTop: theme.spacing(1),
    },
    indexCell: {
        whiteSpace: 'nowrap',
        paddingRight: 0,
        width: theme.spacing(4),
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },
    remainingTimeTooltip: {
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
    },
    hoveringOverGroup: {
        backgroundColor: `${alpha(deckTokens.accent, 0.18)}`,
    },
    dragHandleEmpty: {
        width: 20,
        padding: `${theme.spacing(0.5)} 0 0 0`,
    },
    fixedTable: {
        tableLayout: 'fixed',
    },
    topbarButton: {
        marginRight: theme.spacing(0.5),
    },
    topbarLargeButton: {
        marginRight: theme.spacing(0.5),
        minWidth: 'min-content',
    },
    clickableRemainingTime: {
        cursor: 'pointer',
    },
    secondaryBar: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(1),
    },
}));

function getTrackStatus(track: Track, deviceStatus: DeviceStatus | null): 'playing' | 'paused' | 'none' {
    if (!deviceStatus || track.index !== deviceStatus.track) {
        return 'none';
    }

    if (deviceStatus.state === 'playing') {
        return 'playing';
    } else if (deviceStatus.state === 'paused') {
        return 'paused';
    } else {
        return 'none';
    }
}

export type MainProps = {
    /** When false, the disc deck stays mounted so its dialogs can open, but the deck itself is hidden. */
    deckVisible?: boolean;
    /** Registers a setter so Library can hand tracks to the upload dialog without remounting this view. */
    bindEncodeFiles?: (encode: (files: (File | AdaptiveFile)[]) => void) => void;
    /** The deck shell renders Settings itself so the modal can cover Library and Queue. */
    shellDialogs?: boolean;
};

export const Main = ({ deckVisible = true, bindEncodeFiles, shellDialogs = true }: MainProps) => {
    const dispatch = useDispatch();
    const disc = useShallowEqualSelector((state) => state.main.disc);
    const flushable = useShallowEqualSelector((state) => state.main.flushable);
    const deviceName = useShallowEqualSelector((state) => state.main.deviceName);
    const deviceStatus = useShallowEqualSelector((state) => state.main.deviceStatus);
    const savedAudioIndexes = useShallowEqualSelector((state) => state.discLibrary.audioIndexes);
    const filePlaying = useShallowEqualSelector((state) => state.discLibrary.playing);
    const filePlayingIndex = useShallowEqualSelector((state) => state.discLibrary.playingIndex);
    const libraryStatus = useShallowEqualSelector((state) => state.discLibrary.status);
    const albumCoverUrl = useShallowEqualSelector((state) => state.discLibrary.coverUrl);
    const albumTitle = useShallowEqualSelector((state) => state.discLibrary.title);
    const factoryModeRippingInMainUi = useShallowEqualSelector((state) => state.appState.factoryModeRippingInMainUi);
    const { vintageMode } = useShallowEqualSelector((state) => state.appState);

    const [selected, setSelected] = React.useState<number[]>([]);
    const [selectedGroups, setSelectedGroups] = React.useState<number[]>([]);
    const [uploadedFiles, setUploadedFiles] = React.useState<(File | AdaptiveFile)[]>([]);
    useEffect(() => {
        if (!bindEncodeFiles) {
            return;
        }
        bindEncodeFiles(setUploadedFiles);
        return () => bindEncodeFiles(() => {});
    }, [bindEncodeFiles]);
    const [lastClicked, setLastClicked] = useState(-1);
    const [moveMenuAnchorEl, setMoveMenuAnchorEl] = React.useState<null | HTMLElement>(null);
    const [showRemainingSpace, setShowRemainingSpace] = useState(true);
    const [matchOpen, setMatchOpen] = useState(false);
    const [labelsOpen, setLabelsOpen] = useState(false);
    const [coverFailed, setCoverFailed] = useState(false);

    const deviceCapabilities = useDeviceCapabilities();
    const minidiscSpec = serviceRegistry.netmdSpec;

    const handleShowMoveMenu = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            setMoveMenuAnchorEl(event.currentTarget);
        },
        [setMoveMenuAnchorEl]
    );
    const handleCloseMoveMenu = useCallback(() => {
        setMoveMenuAnchorEl(null);
    }, [setMoveMenuAnchorEl]);

    const handleMoveSelectedTrack = useCallback(
        (destIndex: number) => {
            dispatch(moveTrack(selected[0], destIndex));
            handleCloseMoveMenu();
        },
        [dispatch, selected, handleCloseMoveMenu]
    );

    const handleDrop = useCallback(
        (result: DropResult, provided: ResponderProvided) => {
            if (!result.destination) return;
            const sourceList = parseInt(result.source.droppableId),
                sourceIndex = result.source.index,
                targetList = parseInt(result.destination.droppableId),
                targetIndex = result.destination.index;
            dispatch(dragDropTrack(sourceList, sourceIndex, targetList, targetIndex));
        },
        [dispatch]
    );

    const handleShowDumpDialog = useCallback(() => {
        dispatch(dumpDialogActions.setVisible(true));
    }, [dispatch]);

    useEffect(() => {
        dispatch(listContent());
    }, [dispatch]);

    useEffect(() => {
        setSelected([]); // Reset selection if disc changes
        setSelectedGroups([]);
    }, [disc]);

    const [wasLastDiscNull, setWasLastDiscNull] = useState<boolean>(false);
    const discProtectedDialogDisabled = useShallowEqualSelector((state) => state.appState.discProtectedDialogDisabled);
    useEffect(() => {
        if (disc === null && !wasLastDiscNull) {
            setWasLastDiscNull(true);
            dispatch(appStateActions.showDiscProtectedDialog(false));
        } else if (disc !== null && wasLastDiscNull && disc.writeProtected && disc.writable) {
            setWasLastDiscNull(false);
            if (!discProtectedDialogDisabled) {
                dispatch(appStateActions.showDiscProtectedDialog(true));
            }
        }
    }, [dispatch, disc, wasLastDiscNull, discProtectedDialogDisabled, setWasLastDiscNull]);

    const onDrop = useCallback(
        (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
            const bannedTypes = ['audio/mpegurl', 'audio/x-mpegurl'];
            const accepted = acceptedFiles.filter((n) => !bannedTypes.includes(n.type));
            if (accepted.length > 0) {
                setUploadedFiles(accepted);
                dispatch(convertDialogActions.setVisible(true));
            }
        },
        [dispatch]
    );

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: acceptedTypes,
        noClick: true,
    });

    const { classes, cx } = useStyles();
    const tracks = useMemo(() => getSortedTracks(disc), [disc]);
    const discKey = useMemo(() => {
        if (!disc) {
            return '';
        }
        return getTracks(disc)
            .map((track) => `${track.index}:${Math.round(track.duration * 1000)}`)
            .join('|');
    }, [disc]);
    const groupedTracks = useMemo(() => getGroupedTracks(disc), [disc]);
    const defaultCodecName = minidiscSpec ? getDefaultCodecName(minidiscSpec) : '';

    // Action Handlers
    const handleSelectTrackClick = useCallback(
        (event: React.MouseEvent, item: number) => {
            setSelectedGroups([]);
            if (event.shiftKey && selected.length && lastClicked !== -1) {
                const rangeBegin = Math.min(lastClicked + 1, item),
                    rangeEnd = Math.max(lastClicked - 1, item);
                const copy = [...selected];
                for (let i = rangeBegin; i <= rangeEnd; i++) {
                    const index = copy.indexOf(i);
                    if (index === -1) copy.push(i);
                    else copy.splice(index, 1);
                }
                if (!copy.includes(item)) copy.push(item);
                setSelected(copy);
            } else if (selected.includes(item)) {
                setSelected(selected.filter((i) => i !== item));
            } else {
                setSelected([...selected, item]);
            }
            setLastClicked(item);
        },
        [selected, setSelected, lastClicked, setLastClicked]
    );

    const handleOpenContextMenu = useCallback(
        (event: React.MouseEvent, track: Track) => {
            if (!track) return;
            event.preventDefault();
            dispatch(contextMenuActions.openContextMenu({ position: { x: event.clientX, y: event.clientY }, track: track }));
        },
        [dispatch]
    );

    const handleSelectGroupClick = useCallback(
        (event: React.MouseEvent, item: number) => {
            setSelected([]);
            if (selectedGroups.includes(item)) {
                setSelectedGroups(selectedGroups.filter((i) => i !== item));
            } else {
                setSelectedGroups([...selectedGroups, item]);
            }
        },
        [selectedGroups, setSelected, setSelectedGroups]
    );

    const handleSelectAllClick = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setSelectedGroups([]);
            if (selected.length < tracks.length) {
                setSelected(tracks.map((t) => t.index));
            } else {
                setSelected([]);
            }
        },
        [selected, tracks, setSelected, setSelectedGroups]
    );

    const handleRenameTrack = useCallback(
        (event: React.MouseEvent, index: number) => {
            const track = tracks.find((t) => t.index === index);
            if (!track) {
                return;
            }

            dispatch(
                batchActions([
                    renameDialogActions.setVisible(true),
                    renameDialogActions.setHimdTitle(track.title),
                    renameDialogActions.setHimdAlbum(track.album ?? ''),
                    renameDialogActions.setHimdArtist(track.artist ?? ''),
                    renameDialogActions.setCurrentName(track.title),
                    renameDialogActions.setCurrentFullWidthName(track.fullWidthTitle),
                    renameDialogActions.setIndex(track.index),
                    renameDialogActions.setRenameType(
                        track.album !== undefined || track.album !== undefined ? RenameType.HIMD : RenameType.TRACK
                    ),
                ])
            );
        },
        [dispatch, tracks]
    );

    const handleRenameGroup = useCallback(
        (event: React.MouseEvent, index: number) => {
            const group = groupedTracks.find((g) => g.index === index);
            if (!group) {
                return;
            }

            dispatch(
                batchActions([
                    renameDialogActions.setVisible(true),
                    renameDialogActions.setIndex(index),
                    renameDialogActions.setCurrentName(group.title ?? ''),
                    renameDialogActions.setCurrentFullWidthName(group.fullWidthTitle ?? ''),
                    renameDialogActions.setRenameType(RenameType.GROUP),
                ])
            );
        },
        [dispatch, groupedTracks]
    );

    const handleRenameActionClick = useCallback(
        (event: React.MouseEvent) => {
            if (event.detail !== 1) return; //Event retriggering when hitting enter in the dialog
            handleRenameTrack(event, selected[0]);
        },
        [handleRenameTrack, selected]
    );

    const handleDeleteSelected = useCallback(
        (event: React.MouseEvent) => {
            dispatch(deleteTracks(selected));
        },
        [dispatch, selected]
    );

    const handleDeleteTrack = useCallback(
        (event: React.MouseEvent, index: number) => {
            dispatch(deleteTracks([index]));
        },
        [dispatch]
    );

    const handleGroupTracks = useCallback(
        (event: React.MouseEvent) => {
            dispatch(groupTracks(selected));
        },
        [dispatch, selected]
    );

    const handleDeleteGroup = useCallback(
        (event: React.MouseEvent, index: number) => {
            event.stopPropagation();
            dispatch(deleteGroups([index]));
        },
        [dispatch]
    );

    const handleDeleteSelectedGroups = useCallback(
        (event: React.MouseEvent) => {
            dispatch(deleteGroups(selectedGroups));
            setSelectedGroups([]);
        },
        [dispatch, selectedGroups, setSelectedGroups]
    );

    const handleEject = useCallback(
        (event: React.MouseEvent) => {
            dispatch(ejectDisc());
        },
        [dispatch]
    );

    const handleFlush = useCallback(
        (event: React.MouseEvent) => {
            dispatch(flushDevice());
        },
        [dispatch]
    );

    const handleRenameDisc = useCallback(
        (event: React.MouseEvent) => {
            if (!deviceCapabilities.metadataEdit) return;
            dispatch(
                batchActions([
                    renameDialogActions.setVisible(true),
                    renameDialogActions.setCurrentName(disc!.title),
                    renameDialogActions.setCurrentFullWidthName(disc!.fullWidthTitle),
                    renameDialogActions.setIndex(-1),
                    renameDialogActions.setRenameType(RenameType.DISC),
                ])
            );
        },
        [deviceCapabilities.metadataEdit, dispatch, disc]
    );

    const handleTogglePlayPauseTrack = useCallback(
        (event: React.MouseEvent, track: number) => {
            if (savedAudioIndexes.includes(track)) {
                if (filePlaying && filePlayingIndex === track) {
                    dispatch(discLibraryActions.setPlaying(false));
                } else {
                    dispatch(discLibraryActions.playTrack(track));
                }
                return;
            }
            if (!deviceStatus) {
                return;
            }
            if (deviceStatus.track !== track) {
                dispatch(control('goto', track));
                dispatch(control('play'));
            } else if (deviceStatus.state === 'playing') {
                dispatch(control('pause'));
            } else {
                dispatch(control('play'));
            }
        },
        [dispatch, deviceStatus, savedAudioIndexes, filePlaying, filePlayingIndex]
    );

    const canGroup = useMemo(() => {
        return (
            tracks.filter((n) => n.group === null && selected.includes(n.index)).length === selected.length &&
            isSequential(selected.sort((a, b) => a - b))
        );
    }, [tracks, selected]);

    const selectedCount = selected.length;
    const selectedGroupsCount = selectedGroups.length;

    const [uploadMenuAnchorEl, setUploadMenuAnchorEl] = React.useState<null | HTMLElement>(null);

    const openUploadMenu = useCallback(
        (ev: any) => {
            if (serviceRegistry.libraryService) {
                setUploadMenuAnchorEl(ev.currentTarget);
            } else {
                open();
            }
        },
        [open, setUploadMenuAnchorEl]
    );

    const handleOpenLocalLibrary = useCallback(() => {
        setUploadedFiles([]);
        setUploadMenuAnchorEl(null);
        dispatch(openLocalLibrary());
    }, [dispatch]);

    useEffect(() => {
        dispatch(loadKnownDisc());
    }, [discKey, dispatch]);

    useEffect(() => {
        setCoverFailed(false);
    }, [albumCoverUrl]);

    const savedTrackStatus = useCallback(
        (track: Track): 'playing' | 'paused' | 'none' => {
            if (!savedAudioIndexes.includes(track.index)) {
                return getTrackStatus(track, deviceStatus);
            }
            if (filePlayingIndex !== track.index) {
                return 'none';
            }
            return filePlaying ? 'playing' : 'paused';
        },
        [savedAudioIndexes, filePlaying, filePlayingIndex, deviceStatus]
    );

    if (vintageMode) {
        const p = {
            disc,
            deviceName,

            factoryModeRippingInMainUi,

            selected,
            setSelected,
            selectedCount,
            isUsingBytes: minidiscSpec?.measurementUnits == 'bytes',

            tracks,
            uploadedFiles,
            setUploadedFiles,

            onDrop,
            getRootProps,
            getInputProps,
            isDragActive,
            open,

            moveMenuAnchorEl,
            setMoveMenuAnchorEl,

            handleShowMoveMenu,
            handleCloseMoveMenu,
            handleMoveSelectedTrack,
            handleShowDumpDialog,
            handleDeleteSelected,
            handleRenameActionClick,
            handleRenameTrack,
            handleSelectAllClick,
            handleSelectTrackClick,
        };
        return <W95Main {...p} />;
    }

    const capacityPct = disc && disc.total > 0 ? ((disc.total - disc.left) * 100) / disc.total : 0;
    const capacityLeftLabel =
        disc === null
            ? 'No disc loaded'
            : showRemainingSpace
              ? minidiscSpec?.measurementUnits === 'frames'
                  ? `${formatTimeFromSeconds(disc.left)} left of ${formatTimeFromSeconds(disc.total)}`
                  : `${bytesToHumanReadable(disc.left)} left of ${bytesToHumanReadable(disc.total)}`
              : minidiscSpec?.measurementUnits === 'frames'
                ? `${formatTimeFromSeconds(disc.used)} of ${formatTimeFromSeconds(disc.total)}`
                : `${bytesToHumanReadable(disc.used)} of ${bytesToHumanReadable(disc.total)}`;
    const discTitleText = disc ? disc.title || 'Untitled Disc' : 'No disc';
    const canDownload = deviceCapabilities.trackDownload || factoryModeRippingInMainUi;

    const handleRecognize = useCallback(() => {
        dispatch(openRecognizeTrackDialog(selected));
    }, [dispatch, selected]);

    const handleDownloadAction = useCallback(() => {
        if (canDownload) {
            handleShowDumpDialog();
            return;
        }
        if (tracks.length > 0) {
            dispatch(saveDiscAudio(selected));
        }
    }, [canDownload, handleShowDumpDialog, tracks.length, dispatch, selected]);

    return (
        <React.Fragment>
            <Box
                className={classes.deckRoot}
                style={deckVisible ? undefined : { display: 'none' }}
                aria-hidden={deckVisible ? undefined : true}
                {...getRootProps()}
                id="main"
            >
                <input {...getInputProps()} />
                {flushable ? (
                    <div className={classes.brandMeta}>
                        <Tooltip title="Commit changes">
                            <span>
                                <HardwareButton compact aria-label="Commit changes" onClick={handleFlush}>
                                    <DoneIcon fontSize="small" />
                                </HardwareButton>
                            </span>
                        </Tooltip>
                    </div>
                ) : null}

                <div className={classes.deckGrid}>
                    <div className={classes.artCol}>
                        <DeckPanel header={<><GraphicEqIcon fontSize="inherit" aria-hidden /> Now Playing</>} flush aria-label="Album art">
                            {albumCoverUrl && !coverFailed ? (
                                <Box
                                    component="img"
                                    src={albumCoverUrl}
                                    alt={albumTitle ? `Cover art for ${albumTitle}` : 'Album cover art'}
                                    onError={() => setCoverFailed(true)}
                                    className={classes.cover}
                                />
                            ) : (
                                <div className={classes.coverPlaceholder} aria-hidden>
                                    <AlbumIcon sx={{ fontSize: 64, opacity: 0.35 }} />
                                </div>
                            )}
                        </DeckPanel>
                        <div className={classes.artActions}>
                            <DeckActionTile
                                icon={<AutoAwesomeIcon />}
                                title="Recognize"
                                description="Identify disc & tracks"
                                onClick={handleRecognize}
                                disabled={!disc || tracks.length === 0}
                            />
                            <DeckActionTile
                                icon={<DownloadIcon />}
                                title="Download"
                                description={canDownload ? 'Dump / save audio' : 'Save audio locally'}
                                onClick={handleDownloadAction}
                                disabled={!disc || tracks.length === 0}
                            />
                            <DeckActionTile
                                icon={<LabelOutlinedIcon />}
                                title="Export Label"
                                description="Print or save disc label"
                                onClick={() => setLabelsOpen(true)}
                                disabled={!disc}
                            />
                            <DeckActionTile
                                icon={<AlbumIcon />}
                                title="Match Album"
                                description="Link cover & metadata"
                                onClick={() => setMatchOpen(true)}
                                disabled={!disc}
                            />
                        </div>
                        {libraryStatus ? (
                            <Typography variant="caption" color="textSecondary">
                                {libraryStatus}
                            </Typography>
                        ) : null}
                    </div>

                    <div className={classes.lcdCol}>
                        <DeckPanel header="Transport" aria-label="LCD and transport">
                            <Controls />
                        </DeckPanel>
                    </div>

                    <div className={classes.discCol}>
                        <DeckPanel
                            header="Disc"
                            aria-label="Disc information and tracklist"
                            bodyClassName={undefined}
                        >
                            <div className={classes.discHeader}>
                                <div>
                                    <h2
                                        className={cx(classes.discTitle, deviceCapabilities.metadataEdit && classes.discTitleEditable)}
                                        onDoubleClick={handleRenameDisc}
                                    >
                                        {disc?.fullWidthTitle ? `${disc.fullWidthTitle} / ` : null}
                                        {discTitleText}
                                    </h2>
                                    <div className={classes.discSub}>
                                        {albumTitle || defaultCodecName || 'MiniDisc'}
                                        {tracks.length ? ` · ${tracks.length} tracks` : ''}
                                    </div>
                                </div>
                                <div className={classes.discHeaderActions}>
                                    {deviceCapabilities.discEject ? (
                                        <HardwareButton compact aria-label="Eject disc" onClick={handleEject} disabled={!disc}>
                                            <EjectIcon fontSize="small" />
                                            <span>Eject</span>
                                        </HardwareButton>
                                    ) : null}
                                </div>
                            </div>

                            {disc ? (
                                <MeterBar
                                    value={capacityPct}
                                    labelLeft={
                                        <>
                                            {capacityLeftLabel}{' '}
                                            {minidiscSpec?.measurementUnits === 'frames' ? (
                                                <Tooltip title={LeftInNondefaultCodecs(disc.left)} arrow>
                                                    <span className={classes.remainingTimeTooltip}>{defaultCodecName}</span>
                                                </Tooltip>
                                            ) : null}
                                        </>
                                    }
                                    labelRight={`${Math.round(capacityPct)}% used`}
                                    onClick={() => setShowRemainingSpace((x) => !x)}
                                    aria-label="Disc capacity. Activate to toggle remaining and used space."
                                />
                            ) : (
                                <Typography variant="body2" color="textSecondary">
                                    No disc loaded
                                </Typography>
                            )}

                            <Toolbar
                                className={cx(classes.toolbar, {
                                    [classes.toolbarHighlight]: selectedCount > 0 || selectedGroupsCount > 0,
                                })}
                            >
                                {selectedCount > 0 || selectedGroupsCount > 0 ? (
                                    <Checkbox
                                        indeterminate={selectedCount > 0 && selectedCount < tracks.length}
                                        checked={selectedCount > 0}
                                        disabled={selectedGroupsCount > 0}
                                        color="secondary"
                                        onChange={handleSelectAllClick}
                                        inputProps={{ 'aria-label': 'select all tracks' }}
                                    />
                                ) : null}
                                {selectedCount > 0 || selectedGroupsCount > 0 ? (
                                    <Typography className={classes.toolbarLabel} color="inherit" variant="subtitle1">
                                        {selectedCount || selectedGroupsCount} selected
                                    </Typography>
                                ) : (
                                    <Typography component="h3" variant="subtitle2" className={classes.toolbarLabel}>
                                        Tracklist
                                    </Typography>
                                )}
                                {selectedCount > 0 ? (
                                    <Tooltip title={`${canDownload ? 'Download' : 'Record'} from MD`}>
                                        <Button
                                            className={classes.topbarLargeButton}
                                            color="inherit"
                                            aria-label={canDownload ? 'Download' : 'Record'}
                                            onClick={handleShowDumpDialog}
                                        >
                                            {canDownload ? 'Download' : 'Record'}
                                        </Button>
                                    </Tooltip>
                                ) : null}
                                {selectedCount > 0 ? (
                                    <Tooltip title="Delete">
                                        <span>
                                            <IconButton
                                                className={classes.topbarButton}
                                                aria-label="delete"
                                                disabled={!deviceCapabilities.metadataEdit}
                                                onClick={handleDeleteSelected}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                ) : null}
                                {selectedCount > 0 ? (
                                    <Tooltip title={canGroup ? 'Group' : ''}>
                                        <span>
                                            <IconButton
                                                className={classes.topbarButton}
                                                aria-label="group"
                                                disabled={!canGroup || !deviceCapabilities.metadataEdit}
                                                onClick={handleGroupTracks}
                                            >
                                                <CreateNewFolderIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                ) : null}
                                {selectedCount > 0 ? (
                                    <Tooltip title="Rename">
                                        <span>
                                            <IconButton
                                                className={classes.topbarButton}
                                                aria-label="rename"
                                                disabled={selectedCount !== 1 || !deviceCapabilities.metadataEdit}
                                                onClick={handleRenameActionClick}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                ) : null}
                                {selectedGroupsCount > 0 ? (
                                    <Tooltip title="Ungroup">
                                        <span>
                                            <IconButton
                                                className={classes.topbarButton}
                                                aria-label="ungroup"
                                                disabled={!deviceCapabilities.metadataEdit}
                                                onClick={handleDeleteSelectedGroups}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                ) : null}
                                {selectedGroupsCount > 0 ? (
                                    <Tooltip title="Rename Group">
                                        <span>
                                            <IconButton
                                                className={classes.topbarButton}
                                                aria-label="rename group"
                                                disabled={!deviceCapabilities.metadataEdit || selectedGroupsCount !== 1}
                                                onClick={(e) => handleRenameGroup(e, selectedGroups[0])}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                ) : null}
                            </Toolbar>

                            {deviceCapabilities.contentList ? (
                                <Box className={classes.tracklistWrap}>
                                    <Table size="small" className={classes.fixedTable}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell className={classes.dragHandleEmpty}></TableCell>
                                                <TableCell className={classes.indexCell}>#</TableCell>
                                                <TableCell>Title</TableCell>
                                                {deviceCapabilities.himdTitles && (
                                                    <>
                                                        <TableCell>Album</TableCell>
                                                        <TableCell>Artist</TableCell>
                                                    </>
                                                )}
                                                <TableCell align="right">Duration</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <DragDropContext onDragEnd={handleDrop}>
                                            <TableBody>
                                                {groupedTracks.map((group, index) => (
                                                    <TableRow key={`${index}`}>
                                                        <TableCell
                                                            colSpan={4 + (deviceCapabilities.himdTitles ? 2 : 0)}
                                                            style={{ padding: '0' }}
                                                        >
                                                            <Table size="small" className={classes.fixedTable}>
                                                                <Droppable droppableId={`${index}`} key={`${index}`}>
                                                                    {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                                                                        <TableBody
                                                                            {...provided.droppableProps}
                                                                            ref={provided.innerRef}
                                                                            className={cx({
                                                                                [classes.hoveringOverGroup]: snapshot.isDraggingOver,
                                                                            })}
                                                                        >
                                                                            <MockTrackRow isHimdTrack={deviceCapabilities.himdTitles} />
                                                                            {group.title !== null && (
                                                                                <GroupRow
                                                                                    usesHimdTracks={deviceCapabilities.himdTitles}
                                                                                    group={group}
                                                                                    onRename={handleRenameGroup}
                                                                                    onDelete={handleDeleteGroup}
                                                                                    isSelected={selectedGroups.includes(group.index)}
                                                                                    onSelect={handleSelectGroupClick}
                                                                                />
                                                                            )}
                                                                            {group.title === null && group.tracks.length === 0 && (
                                                                                <TableRow style={{ height: '1px' }} />
                                                                            )}
                                                                            {group.tracks.map((t, tidx) => (
                                                                                <Draggable
                                                                                    draggableId={`${group.index}-${t.index}`}
                                                                                    key={`t-${t.index}`}
                                                                                    index={tidx}
                                                                                    isDragDisabled={!deviceCapabilities.metadataEdit}
                                                                                >
                                                                                    {(provided: DraggableProvided) => (
                                                                                        <TrackRow
                                                                                            track={t}
                                                                                            isHimdTrack={deviceCapabilities.himdTitles}
                                                                                            draggableProvided={provided}
                                                                                            inGroup={group.title !== null}
                                                                                            isSelected={selected.includes(t.index)}
                                                                                            trackStatus={savedTrackStatus(t)}
                                                                                            savedCopy={savedAudioIndexes.includes(t.index)}
                                                                                            onSelect={handleSelectTrackClick}
                                                                                            onRename={handleRenameTrack}
                                                                                            onTogglePlayPause={handleTogglePlayPauseTrack}
                                                                                            onOpenContextMenu={(e) =>
                                                                                                handleOpenContextMenu(e, t)
                                                                                            }
                                                                                        />
                                                                                    )}
                                                                                </Draggable>
                                                                            ))}
                                                                            {provided.placeholder}
                                                                        </TableBody>
                                                                    )}
                                                                </Droppable>
                                                            </Table>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </DragDropContext>
                                    </Table>
                                    {isDragActive && deviceCapabilities.trackUpload ? (
                                        <Backdrop className={classes.backdrop} open={isDragActive}>
                                            Drop your Music to Upload
                                        </Backdrop>
                                    ) : null}
                                </Box>
                            ) : null}
                        </DeckPanel>
                    </div>
                </div>

                <StatusStrip
                    left={
                        <>
                            <span>
                                Disc <strong style={{ color: deckTokens.ink }}>{discTitleText}</strong>
                            </span>
                            <span>Format {defaultCodecName || '—'}</span>
                            <span>Protect {disc?.writeProtected ? 'On' : 'Off'}</span>
                        </>
                    }
                    right={
                        <>
                            <span>{tracks.length} tracks</span>
                            {disc && minidiscSpec?.measurementUnits === 'frames' ? (
                                <span>{formatTimeFromSeconds(disc.used)}</span>
                            ) : disc ? (
                                <span>{bytesToHumanReadable(disc.used)}</span>
                            ) : null}
                        </>
                    }
                />
            </Box>

            {deckVisible && deviceCapabilities.trackUpload ? (
                <Fab color="primary" aria-label="add" className={classes.add} onClick={openUploadMenu}>
                    <AddIcon />
                </Fab>
            ) : null}
            <Menu anchorEl={uploadMenuAnchorEl} open={Boolean(uploadMenuAnchorEl)} onClose={() => setUploadMenuAnchorEl(null)}>
                <MenuItem
                    onClick={() => {
                        setUploadMenuAnchorEl(null);
                        open();
                    }}
                >
                    Upload from this machine
                </MenuItem>
                <MenuItem onClick={handleOpenLocalLibrary}>
                    {serviceRegistry.libraryService instanceof DowntifyLibraryService ? 'Open Library' : 'Upload from library'}
                </MenuItem>
            </Menu>

            <DiscProtectedDialog />
            <UploadDialog />
            <RenameDialog />
            <ErrorDialog />
            <ConvertDialog files={uploadedFiles} />
            <RecordDialog />
            <FactoryModeProgressDialog />
            <FactoryModeBadSectorDialog />
            <DumpDialog
                trackIndexes={selected}
                isCapableOfDownload={deviceCapabilities.trackDownload || factoryModeRippingInMainUi}
                isExploitDownload={factoryModeRippingInMainUi}
            />
            <SongRecognitionDialog />
            <SongRecognitionProgressDialog />
            <FactoryModeNoticeDialog />
            <AboutDialog />
            <ChangelogDialog />
            {shellDialogs ? <SettingsDialog /> : null}
            <ManageEncodersDialog />
            <LocalLibraryDialog setUploadedFiles={setUploadedFiles} />
            <PanicDialog />
            <ContextMenu onTogglePlayPause={handleTogglePlayPauseTrack} onRename={handleRenameTrack} onDelete={handleDeleteTrack} />
            <MatchAlbumDialog open={matchOpen} onClose={() => setMatchOpen(false)} />
            <LabelStudioDialog open={labelsOpen} onClose={() => setLabelsOpen(false)} />
        </React.Fragment>
    );
};
export default Main;
