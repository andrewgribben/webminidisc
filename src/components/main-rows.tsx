import React, { useCallback } from 'react';
import { makeStyles } from 'tss-react/mui';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';

import DragIndicator from '@mui/icons-material/DragIndicator';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import IconButton from '@mui/material/IconButton';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';

import { DraggableProvided } from 'react-beautiful-dnd';
import { Track, Group, getDefaultCodec } from '../services/interfaces/netmd';
import { formatTimeFromSeconds, secondsToHumanReadable } from '../utils';

import serviceRegistry from '../services/registry';
import { useDeviceCapabilities } from '../frontend-utils';
import { deckTokens } from './deck-ui';

const useStyles = makeStyles<
    void,
    'indexCell' | 'titleCell' | 'playButtonInTrackList' | 'trackIndex' | 'deleteGroupButton' | 'groupFolderIcon'
>()((theme, _params, classes) => ({
    currentTrackRow: {
        color: deckTokens.accent,
        fontWeight: 700,
        boxShadow: `inset 3px 0 0 0 ${deckTokens.accent}`,
        '& > td': {
            color: 'inherit',
            fontWeight: 'inherit',
            borderTop: `1px solid rgba(255, 77, 0, 0.35)`,
            borderBottom: `1px solid rgba(255, 77, 0, 0.35)`,
        },
    },
    inGroupTrackRow: {
        [`& > .${classes.indexCell}`]: {
            transform: `translateX(${theme.spacing(3)})`,
        },
        [`& > .${classes.titleCell}`]: {
            transform: `translateX(${theme.spacing(3)})`,
        },
    },
    playButtonInTrackList: {
        display: 'none',
    },
    trackRow: {
        userSelect: 'none',
        color: deckTokens.ink,
        '& > td': {
            color: 'inherit',
        },
        '&:hover': {
            [`& .${classes.playButtonInTrackList}`]: {
                display: 'inline-flex',
            },
            [`& .${classes.trackIndex}`]: {
                display: 'none',
            },
        },
    },
    controlButtonInTrackCommon: {
        width: theme.spacing(2),
        height: theme.spacing(2),
        verticalAlign: 'middle',
        marginLeft: theme.spacing(-0.5),
    },
    formatBadge: {
        color: '#fff',
        height: theme.spacing(2.5),
        zIndex: 1,
        flexWrap: 'wrap',
        fontSize: '0.75rem',
        minWidth: theme.spacing(2.5),
        boxSizing: 'border-box',
        alignItems: 'center',
        fontWeight: 500,
        alignContent: 'center',
        borderRadius: 2,
        flexDirection: 'row',
        justifyContent: 'center',
        backgroundColor: deckTokens.ink,
        position: 'static',
        display: 'inline-flex',
        border: `1.5px solid ${deckTokens.border}`,
        padding: '0 4px',
        verticalAlign: 'middle',
        width: theme.spacing(4.5),
        marginRight: theme.spacing(0.5),
        lineHeight: 'normal',
    },
    channelBadge: {
        position: 'static',
        display: 'inline-flex',
        padding: '0 4px',
        verticalAlign: 'middle',
        userSelect: 'none',
        marginRight: theme.spacing(0.5),
        color: deckTokens.muted,
    },
    durationCell: {
        whiteSpace: 'nowrap',
        color: deckTokens.ink,
    },
    durationCellSecondary: {
        whiteSpace: 'nowrap',
        color: deckTokens.muted,
    },
    durationCellTime: {
        verticalAlign: 'middle',
    },
    titleCell: {
        overflow: 'hidden',
        maxWidth: '40ch',
        textOverflow: 'ellipsis',
        color: 'inherit',
        // whiteSpace: 'nowrap',
    },
    deleteGroupButton: {
        display: 'none',
    },
    indexCell: {
        whiteSpace: 'nowrap',
        paddingRight: 0,
        width: theme.spacing(4),
        color: 'inherit',
    },
    trackIndex: {
        display: 'inline-block',
        height: '16px',
        width: '16px',
    },
    dragHandle: {
        width: 20,
        padding: `${theme.spacing(0.5)} 0 0 0`,
        color: deckTokens.muted,
    },
    dragHandleEmpty: {
        width: 20,
        padding: `${theme.spacing(0.5)} 0 0 0`,
    },
    groupFolderIcon: {},
    groupHead: {
        userSelect: 'none',
        color: deckTokens.ink,
        '& > td': {
            color: 'inherit',
        },
        '&:hover': {
            [`& .${classes.deleteGroupButton}`]: {
                display: 'inline-flex',
            },
            [`& .${classes.groupFolderIcon}`]: {
                display: 'none',
            },
        },
    },
    rowClass: {
        color: deckTokens.ink,
        '&.Mui-selected': {
            backgroundColor: 'rgba(255, 77, 0, 0.12)',
            '&:hover': {
                backgroundColor: 'rgba(255, 77, 0, 0.16)',
            },
        },
        '&:hover': {
            backgroundColor: deckTokens.surfaceMuted,
        },
    },
    mockRow: {
        '& *': {
            margin: '0px !important',
            lineHeight: '0px',
            padding: '0px !important',
        },
        borderSpacing: '0px',
        visibility: 'collapse',
    },
}));

interface TrackRowProps {
    track: Track;
    inGroup: boolean;
    isSelected: boolean;
    trackStatus: 'playing' | 'paused' | 'none';
    isHimdTrack: boolean;
    draggableProvided: DraggableProvided;
    onSelect: (event: React.MouseEvent, trackIdx: number) => void;
    onRename: (event: React.MouseEvent, trackIdx: number) => void;
    onTogglePlayPause: (event: React.MouseEvent, trackIdx: number) => void;
    onOpenContextMenu: (event: React.MouseEvent) => void;
    savedCopy?: boolean;
}

export function MockTrackRow({ isHimdTrack }: { isHimdTrack: boolean }) {
    const { classes, cx } = useStyles();
    return (
        <TableRow hover color="inherit" className={classes.mockRow} style={{ maxHeight: '0px !important', height: '0px !important' }}>
            <TableCell className={classes.dragHandle} onClick={(event) => event.stopPropagation()}></TableCell>
            <TableCell className={classes.indexCell}></TableCell>
            <TableCell className={classes.titleCell} title={''}></TableCell>
            {isHimdTrack && (
                <>
                    <TableCell className={classes.titleCell} title={''}></TableCell>
                    <TableCell className={classes.titleCell} title={''}></TableCell>
                </>
            )}
            <TableCell align="right" className={classes.durationCell}></TableCell>
        </TableRow>
    );
}

export function TrackRow({
    track,
    inGroup,
    isSelected,
    draggableProvided,
    trackStatus,
    isHimdTrack,
    onSelect,
    onRename,
    onTogglePlayPause,
    onOpenContextMenu,
    savedCopy,
}: TrackRowProps) {
    const minidiscSpec = serviceRegistry.netmdSpec;
    const formatInfo =
        minidiscSpec?.availableFormats.find(
            (e) => e.codec === track.encoding.codec && e.availableBitrates.includes(track.encoding.bitrate)
        ) ?? null;
    const { classes, cx } = useStyles();

    const deviceCapabilities = useDeviceCapabilities();

    const handleRename = useCallback(
        (event: React.MouseEvent) => deviceCapabilities.metadataEdit && onRename(event, track.index),
        [deviceCapabilities.metadataEdit, onRename, track.index]
    );
    const handleSelect = useCallback((event: React.MouseEvent) => onSelect(event, track.index), [track.index, onSelect]);

    const handlePlayPause: React.MouseEventHandler = useCallback(
        (event) => {
            event.stopPropagation();
            onTogglePlayPause(event, track.index);
        },
        [track.index, onTogglePlayPause]
    );
    const handleDoubleClickOnPlayButton: React.MouseEventHandler = useCallback((event) => event.stopPropagation(), []);
    const isPlayingOrPaused = trackStatus === 'playing' || trackStatus === 'paused';

    return (
        <TableRow
            {...draggableProvided.draggableProps}
            ref={draggableProvided.innerRef}
            hover
            selected={isSelected}
            onDoubleClick={handleRename}
            onClick={handleSelect}
            onContextMenu={onOpenContextMenu}
            color="inherit"
            className={cx({
                [classes.rowClass]: true,
                [classes.trackRow]: deviceCapabilities.playbackControl,
                [classes.inGroupTrackRow]: inGroup,
                [classes.currentTrackRow]: isPlayingOrPaused,
            })}
        >
            <TableCell className={classes.dragHandle} {...draggableProvided.dragHandleProps} onClick={(event) => event.stopPropagation()}>
                <DragIndicator fontSize="small" htmlColor={deckTokens.muted} />
            </TableCell>
            <TableCell className={classes.indexCell}>
                <span className={classes.trackIndex}>{track.index + 1}</span>
                <IconButton
                    aria-label="play/pause"
                    classes={{ root: cx(classes.controlButtonInTrackCommon, classes.playButtonInTrackList) }}
                    size="small"
                    onClick={handlePlayPause}
                    onDoubleClick={handleDoubleClickOnPlayButton}
                >
                    {trackStatus === 'paused' || trackStatus === 'none' ? (
                        <PlayArrowIcon fontSize="inherit" />
                    ) : (
                        <PauseIcon fontSize="inherit" />
                    )}
                </IconButton>
            </TableCell>
            <TableCell className={classes.titleCell} title={track.title ?? ''}>
                {track.fullWidthTitle ? `${track.fullWidthTitle} / ` : ``}
                {track.title || `No Title`}
                {savedCopy ? ' · saved' : ''}
            </TableCell>
            {isHimdTrack && (
                <>
                    <TableCell className={classes.titleCell} title={track.album ?? ''}>
                        {track.album || `No Album`}
                    </TableCell>
                    <TableCell className={classes.titleCell} title={track.artist ?? ''}>
                        {track.artist || `No Artist`}
                    </TableCell>
                </>
            )}
            <TableCell align="right" className={classes.durationCell}>
                {track.channel === 1 && <span className={classes.channelBadge}>MONO</span>}
                {((!formatInfo) || formatInfo.availableBitrates.length > 1) ? (
                    <Tooltip title={`${track.encoding.bitrate!} kbps`}>
                        <span className={classes.formatBadge}>{track.encoding.codec}</span>
                    </Tooltip>
                ) : (
                    <span className={classes.formatBadge}>
                        {formatInfo.displayBadgeFriendlyName ?? formatInfo.userFriendlyName ?? formatInfo.codec}
                    </span>
                )}
                <span className={classes.durationCellTime}>{formatTimeFromSeconds(track.duration)}</span>
            </TableCell>
        </TableRow>
    );
}

interface GroupRowProps {
    group: Group;
    usesHimdTracks?: boolean;
    onRename: (event: React.MouseEvent, groupIdx: number) => void;
    onDelete: (event: React.MouseEvent, groupIdx: number) => void;
    onSelect: (event: React.MouseEvent, groupIdx: number) => void;
    isSelected: boolean;
}

export function GroupRow({ group, usesHimdTracks, onRename, onDelete, onSelect, isSelected }: GroupRowProps) {
    const { classes, cx } = useStyles();

    const deviceCapabilities = useDeviceCapabilities();

    const handleDelete = useCallback(
        (event: React.MouseEvent) => deviceCapabilities.metadataEdit && onDelete(event, group.index),
        [deviceCapabilities.metadataEdit, onDelete, group.index]
    );
    const handleRename = useCallback(
        (event: React.MouseEvent) => deviceCapabilities.metadataEdit && onRename(event, group.index),
        [deviceCapabilities.metadataEdit, onRename, group.index]
    );
    const handleSelect = useCallback((event: React.MouseEvent) => onSelect(event, group.index), [onSelect, group]);
    return (
        <TableRow
            hover
            selected={isSelected}
            className={cx({ [classes.groupHead]: deviceCapabilities.metadataEdit, [classes.rowClass]: true })}
            onDoubleClick={handleRename}
            onClick={handleSelect}
        >
            <TableCell className={classes.dragHandleEmpty}></TableCell>
            <TableCell className={classes.indexCell}>
                <FolderIcon className={cx(classes.controlButtonInTrackCommon, classes.groupFolderIcon)} fontSize="inherit" />
                <IconButton
                    aria-label="delete"
                    className={cx(classes.controlButtonInTrackCommon, classes.deleteGroupButton)}
                    size="small"
                    onClick={handleDelete}
                >
                    <DeleteIcon fontSize="inherit" />
                </IconButton>
            </TableCell>
            <TableCell className={classes.titleCell} title={group.title!}>
                {group.fullWidthTitle ? `${group.fullWidthTitle} / ` : ``}
                {group.title || `No Name`}
            </TableCell>
            {usesHimdTracks && (
                <>
                    <TableCell />
                    <TableCell />
                </>
            )}
            <TableCell align="right" className={classes.durationCellSecondary}>
                <span className={classes.durationCellTime}>
                    {formatTimeFromSeconds(group.tracks.map((n) => n.duration).reduce((a, b) => a + b))}
                </span>
            </TableCell>
        </TableRow>
    );
}

export function LeftInNondefaultCodecs(timeLeft: number) {
    const minidiscSpec = serviceRegistry.netmdSpec;
    if (!minidiscSpec) {
        return <></>;
    }
    return (
        <React.Fragment>
            {minidiscSpec.availableFormats.map((e, i) =>
                e.codec === getDefaultCodec(minidiscSpec).codec ? null : (
                    <React.Fragment key={`total-${e.codec}-${i}`}>
                        <span>{`${secondsToHumanReadable(
                            minidiscSpec.translateDefaultMeasuringModeTo(
                                {
                                    codec: e.codec,
                                    bitrate: e.defaultBitrate,
                                },
                                timeLeft
                            )
                        )} in ${e.userFriendlyName ?? e.codec} Mode`}</span>
                        <br />
                    </React.Fragment>
                )
            )}
        </React.Fragment>
    );
}
