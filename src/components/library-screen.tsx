import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Checkbox from '@mui/material/Checkbox';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { makeStyles } from 'tss-react/mui';
import { AdaptiveFile, formatTimeFromSeconds } from '../utils';
import serviceRegistry from '../services/registry';
import { DowntifyLibraryTrack, DowntifyPlaylist, libraryFileFormat } from '../services/library/downtify-library';
import { getDowntifyLibrary } from '../services/library/downtify-client';
import { useDispatch } from '../frontend-utils';
import { actions as appActions } from '../redux/app-feature';
import { actions as convertDialogActions } from '../redux/convert-dialog-feature';
import { DeckPanel, HardwareButton, StatusStrip, deckTokens } from './deck-ui';

type LibrarySource = 'albums' | 'artists' | 'playlists' | 'tracks';

const LIBRARY_LIST_LIMIT = 200;

const useStyles = makeStyles()(() => ({
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 0,
        flex: 1,
        height: '100%',
    },
    workspace: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 320px)',
        gap: 12,
        minHeight: 0,
        flex: 1,
        '@media (max-width: 800px)': {
            gridTemplateColumns: '1fr',
            gridTemplateRows: 'minmax(280px, 1fr) auto',
        },
    },
    sourceTabs: {
        minHeight: 36,
        '& .MuiTab-root': {
            minHeight: 36,
            textTransform: 'none',
            fontFamily: deckTokens.fontSans,
            fontWeight: 500,
        },
    },
    list: {
        flex: 1,
        overflow: 'auto',
        minHeight: 0,
        border: `1.5px solid ${deckTokens.border}`,
        borderRadius: deckTokens.radius,
        backgroundColor: deckTokens.surface,
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '8px 10px',
        border: 'none',
        borderBottom: `1px solid ${deckTokens.borderHairline}`,
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: deckTokens.fontSans,
        color: deckTokens.ink,
        '&:hover': {
            backgroundColor: deckTokens.surfaceMuted,
        },
        '&:focus-visible': {
            outline: `2px solid ${deckTokens.focusRing}`,
            outlineOffset: -2,
        },
    },
    rowActive: {
        backgroundColor: 'rgba(255, 77, 0, 0.08)',
        boxShadow: `inset 3px 0 0 ${deckTokens.accent}`,
    },
    rowBody: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
    },
    rowTitle: {
        fontSize: 14,
        fontWeight: 500,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    rowMeta: {
        fontSize: 12,
        color: deckTokens.muted,
        fontFamily: deckTokens.fontMono,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    thumb: {
        width: 40,
        height: 40,
        objectFit: 'cover',
        border: `1px solid ${deckTokens.border}`,
        borderRadius: 2,
        backgroundColor: deckTokens.surfaceMuted,
        flexShrink: 0,
    },
    thumbPlaceholder: {
        width: 40,
        height: 40,
        border: `1px solid ${deckTokens.borderHairline}`,
        borderRadius: 2,
        backgroundColor: deckTokens.surfaceMuted,
        flexShrink: 0,
    },
    detail: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 0,
    },
    detailArt: {
        width: '100%',
        aspectRatio: '1',
        objectFit: 'cover',
        border: `1.5px solid ${deckTokens.border}`,
        borderRadius: deckTokens.radius,
        backgroundColor: deckTokens.surfaceMuted,
    },
    detailArtEmpty: {
        width: '100%',
        aspectRatio: '1',
        border: `1.5px dashed ${deckTokens.borderHairline}`,
        borderRadius: deckTokens.radius,
        backgroundColor: deckTokens.surfaceMuted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: deckTokens.muted,
        fontFamily: deckTokens.fontMono,
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
    },
    chips: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
    },
    chip: {
        fontFamily: deckTokens.fontMono,
        fontSize: 11,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        border: `1px solid ${deckTokens.border}`,
        borderRadius: 2,
        color: deckTokens.ink,
        backgroundColor: deckTokens.surfaceMuted,
    },
    actions: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 'auto',
    },
    note: {
        fontFamily: deckTokens.fontMono,
        fontSize: 11,
        color: deckTokens.muted,
        letterSpacing: '0.04em',
    },
    search: {
        '& .MuiInputBase-root': {
            fontFamily: deckTokens.fontSans,
        },
    },
}));

function groupKey(track: DowntifyLibraryTrack, source: LibrarySource): string {
    switch (source) {
        case 'albums':
            return track.album.length > 0 ? track.album : 'Unknown album';
        case 'artists':
            return track.artist.length > 0 ? track.artist : 'Unknown artist';
        case 'playlists':
            return '';
        case 'tracks':
            return '';
        default: {
            const _exhaustive: never = source;
            return _exhaustive;
        }
    }
}

function matchesQuery(track: DowntifyLibraryTrack, queryText: string): boolean {
    if (queryText.length === 0) {
        return true;
    }
    return [track.title, track.artist, track.album, track.albumArtist, track.file, track.format, track.codec, track.year].some((value) =>
        value.toLowerCase().includes(queryText)
    );
}

type LibraryGroup = { name: string; count: number; formats: string[]; coverUrl?: string };

function formatsIn(files: string[]): string[] {
    return [...new Set(files.map((file) => libraryFileFormat(file)))].sort();
}

function emptyTrackFields(): Pick<
    DowntifyLibraryTrack,
    'year' | 'codec' | 'bitrate' | 'sampleRate' | 'channels' | 'hasCover' | 'size'
> {
    return {
        year: '',
        codec: '',
        bitrate: null,
        sampleRate: null,
        channels: null,
        hasCover: false,
        size: null,
    };
}

function unnamedTrack(file: string, playlist: string): DowntifyLibraryTrack {
    const title = file.split('/').pop() || file;
    return {
        file,
        title,
        artist: '',
        album: '',
        albumArtist: '',
        trackNumber: 0,
        duration: 0,
        format: libraryFileFormat(file),
        playlists: [playlist],
        ...emptyTrackFields(),
    };
}

function filterGroups(items: LibraryGroup[], queryText: string): LibraryGroup[] {
    if (queryText.length === 0) {
        return items;
    }
    return items.filter((item) => item.name.toLowerCase().includes(queryText) || item.formats.some((format) => format.toLowerCase().includes(queryText)));
}

function compareTracks(a: DowntifyLibraryTrack, b: DowntifyLibraryTrack): number {
    if (a.trackNumber > 0 && b.trackNumber > 0 && a.trackNumber !== b.trackNumber) {
        return a.trackNumber - b.trackNumber;
    }
    return a.title.localeCompare(b.title);
}

function toAdaptiveFile(track: DowntifyLibraryTrack): AdaptiveFile {
    const name = track.file.split('/').pop() || track.title;
    return {
        name,
        title: track.title,
        album: track.album,
        artist: track.artist,
        duration: track.duration,
        getForEncoding: (params) => serviceRegistry.libraryService!.processLocalLibraryFile(track.file, params),
    };
}

function formatBitrate(bitrate: number | null): string | null {
    if (bitrate === null || bitrate <= 0) {
        return null;
    }
    if (bitrate >= 1000) {
        return `${Math.round(bitrate / 1000)} kbps`;
    }
    return `${bitrate} bps`;
}

function formatSampleRate(sampleRate: number | null): string | null {
    if (sampleRate === null || sampleRate <= 0) {
        return null;
    }
    if (sampleRate >= 1000) {
        const khz = sampleRate / 1000;
        return `${Number.isInteger(khz) ? khz : khz.toFixed(1)} kHz`;
    }
    return `${sampleRate} Hz`;
}

function formatSize(size: number | null): string | null {
    if (size === null || size <= 0) {
        return null;
    }
    if (size >= 1024 * 1024) {
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (size >= 1024) {
        return `${Math.round(size / 1024)} KB`;
    }
    return `${size} B`;
}

function totalDuration(tracks: DowntifyLibraryTrack[]): number {
    return tracks.reduce((sum, track) => sum + (track.duration > 0 ? track.duration : 0), 0);
}

export function LibraryScreen({
    onUseFiles,
    canEncode,
}: {
    onUseFiles?: (files: AdaptiveFile[]) => void;
    canEncode: boolean;
}) {
    const { classes, cx } = useStyles();
    const dispatch = useDispatch();
    const library = useMemo(() => getDowntifyLibrary(), []);
    const [source, setSource] = useState<LibrarySource>('albums');
    const [group, setGroup] = useState<string | null>(null);
    const [tracks, setTracks] = useState<DowntifyLibraryTrack[]>([]);
    const [playlists, setPlaylists] = useState<DowntifyPlaylist[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [focusFile, setFocusFile] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [coverFailed, setCoverFailed] = useState<Record<string, boolean>>({});

    const loadTracks = useCallback(async () => {
        const [nextTracks, nextPlaylists] = await Promise.all([library.listLibraryTracks(), library.listPlaylists()]);
        setTracks(nextTracks);
        setPlaylists(nextPlaylists);
        setLoadError(null);
    }, [library]);

    useEffect(() => {
        loadTracks().catch((err: unknown) => {
            const raw = err instanceof Error ? err.message : 'Could not load the Downtify library';
            setLoadError(
                /<!DOCTYPE|Unexpected token/i.test(raw)
                    ? 'Downtify is not reachable from this page. Start the embedded Downtify service, then refresh.'
                    : raw
            );
        });
    }, [loadTracks]);

    const queryText = query.trim().toLowerCase();

    const groups = useMemo(() => {
        if (source === 'tracks') {
            return [];
        }
        if (source === 'playlists') {
            if (playlists.length > 0) {
                return filterGroups(
                    playlists
                        .map((playlist) => ({
                            name: playlist.name,
                            count: playlist.count || playlist.files.length,
                            formats: formatsIn(playlist.files),
                            coverUrl: playlist.cover ? library.playlistCoverUrl(playlist.name) : undefined,
                        }))
                        .sort((a, b) => a.name.localeCompare(b.name)),
                    queryText
                );
            }
            const names = new Map<string, { count: number; formats: Set<string> }>();
            for (const track of tracks) {
                for (const playlist of track.playlists) {
                    const current = names.get(playlist) ?? { count: 0, formats: new Set<string>() };
                    current.count += 1;
                    current.formats.add(track.format);
                    names.set(playlist, current);
                }
            }
            return filterGroups(
                [...names.entries()]
                    .map(([name, item]) => ({ name, count: item.count, formats: [...item.formats].sort() }))
                    .sort((a, b) => a.name.localeCompare(b.name)),
                queryText
            );
        }
        const names = new Map<string, { count: number; formats: Set<string>; coverFile?: string }>();
        for (const track of tracks) {
            const name = groupKey(track, source);
            const current = names.get(name) ?? { count: 0, formats: new Set<string>() };
            current.count += 1;
            current.formats.add(track.format);
            if (!current.coverFile && track.hasCover) {
                current.coverFile = track.file;
            }
            names.set(name, current);
        }
        return filterGroups(
            [...names.entries()]
                .map(([name, item]) => ({
                    name,
                    count: item.count,
                    formats: [...item.formats].sort(),
                    coverUrl: item.coverFile ? library.trackCoverUrl(item.coverFile) : undefined,
                }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            queryText
        );
    }, [library, playlists, queryText, source, tracks]);

    const visibleTracks = useMemo(() => {
        if (source === 'tracks') {
            return [...tracks]
                .filter((track) => matchesQuery(track, queryText))
                .sort((a, b) => a.artist.localeCompare(b.artist) || compareTracks(a, b));
        }
        if (!group) {
            return [];
        }
        if (source === 'playlists') {
            const playlist = playlists.find((item) => item.name === group);
            if (playlist) {
                const byFile = new Map(tracks.map((track) => [track.file, track]));
                return playlist.files
                    .map((file) => byFile.get(file) ?? unnamedTrack(file, group))
                    .filter((track) => matchesQuery(track, queryText));
            }
            return tracks.filter((track) => track.playlists.includes(group) && matchesQuery(track, queryText)).sort(compareTracks);
        }
        return tracks.filter((track) => groupKey(track, source) === group && matchesQuery(track, queryText)).sort(compareTracks);
    }, [group, playlists, queryText, source, tracks]);

    const catalog = useMemo(() => {
        const byFile = new Map(tracks.map((track) => [track.file, track]));
        for (const playlist of playlists) {
            for (const file of playlist.files) {
                if (byFile.has(file)) {
                    continue;
                }
                byFile.set(file, unnamedTrack(file, playlist.name));
            }
        }
        return byFile;
    }, [playlists, tracks]);

    const focusedTrack = useMemo(() => {
        if (focusFile) {
            return catalog.get(focusFile) ?? null;
        }
        if (visibleTracks.length > 0) {
            return visibleTracks[0];
        }
        return null;
    }, [catalog, focusFile, visibleTracks]);

    const focusedGroup = useMemo(() => {
        if (!group || source === 'tracks') {
            return null;
        }
        return groups.find((item) => item.name === group) ?? null;
    }, [group, groups, source]);

    const detailCoverUrl = useMemo(() => {
        if (focusedTrack?.hasCover) {
            return library.trackCoverUrl(focusedTrack.file);
        }
        if (focusedGroup?.coverUrl) {
            return focusedGroup.coverUrl;
        }
        if (source === 'playlists' && group) {
            const playlist = playlists.find((item) => item.name === group);
            if (playlist?.cover) {
                return library.playlistCoverUrl(playlist.name);
            }
        }
        return null;
    }, [focusedGroup, focusedTrack, group, library, playlists, source]);

    useEffect(() => {
        setCoverFailed({});
    }, [detailCoverUrl]);

    const toggle = useCallback((file: string) => {
        setSelected((current) => (current.includes(file) ? current.filter((item) => item !== file) : [...current, file]));
        setFocusFile(file);
    }, []);

    const selectVisible = useCallback(() => {
        setSelected((current) => {
            const files = visibleTracks.slice(0, LIBRARY_LIST_LIMIT).map((track) => track.file);
            const allSelected = files.every((file) => current.includes(file));
            if (allSelected) {
                return current.filter((file) => !files.includes(file));
            }
            return [...new Set([...current, ...files])];
        });
    }, [visibleTracks]);

    const handleUse = useCallback(() => {
        if (!onUseFiles || !canEncode) {
            return;
        }
        const chosen = selected.flatMap((file) => {
            const track = catalog.get(file);
            return track ? [track] : [];
        });
        if (chosen.length === 0) {
            return;
        }
        onUseFiles(chosen.map(toAdaptiveFile));
        dispatch(convertDialogActions.setVisible(true));
        setSelected([]);
    }, [canEncode, catalog, dispatch, onUseFiles, selected]);

    const showingTracks = source === 'tracks' || group !== null;
    const durationSum = totalDuration(showingTracks ? visibleTracks : []);

    const metaChips = useMemo(() => {
        const chips: string[] = [];
        if (focusedTrack) {
            if (focusedTrack.format) {
                chips.push(focusedTrack.format);
            }
            if (focusedTrack.codec && focusedTrack.codec.toUpperCase() !== focusedTrack.format) {
                chips.push(focusedTrack.codec);
            }
            if (focusedTrack.year) {
                chips.push(focusedTrack.year);
            }
            const bitrate = formatBitrate(focusedTrack.bitrate);
            if (bitrate) {
                chips.push(bitrate);
            }
            const sampleRate = formatSampleRate(focusedTrack.sampleRate);
            if (sampleRate) {
                chips.push(sampleRate);
            }
            if (focusedTrack.channels !== null && focusedTrack.channels > 0) {
                chips.push(focusedTrack.channels === 1 ? 'Mono' : focusedTrack.channels === 2 ? 'Stereo' : `${focusedTrack.channels} ch`);
            }
            const size = formatSize(focusedTrack.size);
            if (size) {
                chips.push(size);
            }
        } else if (focusedGroup) {
            for (const format of focusedGroup.formats) {
                chips.push(format);
            }
        }
        return chips;
    }, [focusedGroup, focusedTrack]);

    return (
        <div className={classes.root}>
            <DeckPanel header="Library" aria-label="Downtify library">
                <Tabs
                    className={classes.sourceTabs}
                    value={source}
                    onChange={(_event, value: LibrarySource) => {
                        setSource(value);
                        setGroup(null);
                        setFocusFile(null);
                    }}
                >
                    <Tab value="albums" label="Albums" />
                    <Tab value="artists" label="Artists" />
                    <Tab value="playlists" label="Playlists" />
                    <Tab value="tracks" label="Tracks" />
                </Tabs>
                {loadError ? (
                    <Typography variant="body2" color="error">
                        {loadError}
                    </Typography>
                ) : null}
                <TextField
                    className={classes.search}
                    size="small"
                    label="Search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    fullWidth
                />
                <div className={classes.workspace}>
                    <div className={classes.list} role="list">
                        {showingTracks && source !== 'tracks' ? (
                            <button
                                type="button"
                                className={classes.row}
                                onClick={() => {
                                    setGroup(null);
                                    setFocusFile(null);
                                }}
                            >
                                <div className={classes.rowBody}>
                                    <span className={classes.rowTitle}>Back</span>
                                    <span className={classes.rowMeta}>{group}</span>
                                </div>
                            </button>
                        ) : null}
                        {showingTracks
                            ? visibleTracks.slice(0, LIBRARY_LIST_LIMIT).map((track) => {
                                  const cover = track.hasCover && !coverFailed[track.file] ? library.trackCoverUrl(track.file) : null;
                                  return (
                                      <div
                                          key={track.file}
                                          role="listitem"
                                          className={cx(classes.row, focusFile === track.file && classes.rowActive)}
                                          onClick={() => setFocusFile(track.file)}
                                          onKeyDown={(event) => {
                                              if (event.key === 'Enter' || event.key === ' ') {
                                                  event.preventDefault();
                                                  setFocusFile(track.file);
                                              }
                                          }}
                                          tabIndex={0}
                                      >
                                          <Checkbox
                                              edge="start"
                                              checked={selected.includes(track.file)}
                                              tabIndex={-1}
                                              disableRipple
                                              onClick={(event) => {
                                                  event.stopPropagation();
                                                  toggle(track.file);
                                              }}
                                          />
                                          {cover ? (
                                              <img
                                                  className={classes.thumb}
                                                  src={cover}
                                                  alt=""
                                                  onError={() => setCoverFailed((current) => ({ ...current, [track.file]: true }))}
                                              />
                                          ) : (
                                              <div className={classes.thumbPlaceholder} aria-hidden />
                                          )}
                                          <div className={classes.rowBody}>
                                              <span className={classes.rowTitle}>
                                                  {track.trackNumber > 0 ? `${track.trackNumber}. ${track.title}` : track.title}
                                              </span>
                                              <span className={classes.rowMeta}>
                                                  {[track.format, track.artist || 'Unknown artist', track.album || 'Unknown album', formatTimeFromSeconds(track.duration, false)]
                                                      .filter(Boolean)
                                                      .join(' · ')}
                                                  {track.year ? ` · ${track.year}` : ''}
                                              </span>
                                          </div>
                                      </div>
                                  );
                              })
                            : groups.slice(0, LIBRARY_LIST_LIMIT).map((item) => (
                                  <button
                                      key={item.name}
                                      type="button"
                                      className={cx(classes.row, group === item.name && classes.rowActive)}
                                      onClick={() => {
                                          setGroup(item.name);
                                          setFocusFile(null);
                                      }}
                                  >
                                      {item.coverUrl && !coverFailed[`g:${item.name}`] ? (
                                          <img
                                              className={classes.thumb}
                                              src={item.coverUrl}
                                              alt=""
                                              onError={() => setCoverFailed((current) => ({ ...current, [`g:${item.name}`]: true }))}
                                          />
                                      ) : (
                                          <div className={classes.thumbPlaceholder} aria-hidden />
                                      )}
                                      <div className={classes.rowBody}>
                                          <span className={classes.rowTitle}>{item.name}</span>
                                          <span className={classes.rowMeta}>
                                              {item.count} track{item.count === 1 ? '' : 's'} · {item.formats.join(', ') || 'Unknown'}
                                          </span>
                                      </div>
                                  </button>
                              ))}
                        {!loadError && tracks.length === 0 ? (
                            <div className={classes.row}>
                                <div className={classes.rowBody}>
                                    <span className={classes.rowTitle}>Nothing in the Downtify library yet.</span>
                                    <span className={classes.rowMeta}>Queue a download, then refresh here when it finishes.</span>
                                </div>
                            </div>
                        ) : null}
                        {(showingTracks ? visibleTracks.length : groups.length) > LIBRARY_LIST_LIMIT ? (
                            <div className={classes.row}>
                                <div className={classes.rowBody}>
                                    <span className={classes.rowMeta}>
                                        Showing {LIBRARY_LIST_LIMIT} of {showingTracks ? visibleTracks.length : groups.length}. Search to
                                        narrow the list.
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <aside className={classes.detail} aria-label="Selection detail">
                        {detailCoverUrl && !coverFailed.detail ? (
                            <img
                                className={classes.detailArt}
                                src={detailCoverUrl}
                                alt=""
                                onError={() => setCoverFailed((current) => ({ ...current, detail: true }))}
                            />
                        ) : (
                            <div className={classes.detailArtEmpty}>No artwork</div>
                        )}
                        <div>
                            <Typography variant="h6" component="h2" style={{ fontFamily: deckTokens.fontSans, marginBottom: 4 }}>
                                {focusedTrack?.title || focusedGroup?.name || 'Select a title'}
                            </Typography>
                            {focusedTrack ? (
                                <Typography variant="body2" color="textSecondary">
                                    {[focusedTrack.artist || null, focusedTrack.albumArtist && focusedTrack.albumArtist !== focusedTrack.artist ? `Album artist: ${focusedTrack.albumArtist}` : null, focusedTrack.album || null]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </Typography>
                            ) : focusedGroup ? (
                                <Typography variant="body2" color="textSecondary">
                                    {focusedGroup.count} track{focusedGroup.count === 1 ? '' : 's'}
                                    {showingTracks && durationSum > 0 ? ` · ${formatTimeFromSeconds(durationSum, false)}` : ''}
                                </Typography>
                            ) : null}
                            {focusedTrack && focusedTrack.duration > 0 ? (
                                <Typography variant="body2" color="textSecondary">
                                    {formatTimeFromSeconds(focusedTrack.duration, false)}
                                    {showingTracks && visibleTracks.length > 1 && durationSum > 0
                                        ? ` · ${visibleTracks.length} tracks · ${formatTimeFromSeconds(durationSum, false)} total`
                                        : ''}
                                </Typography>
                            ) : null}
                        </div>
                        {metaChips.length > 0 ? (
                            <div className={classes.chips}>
                                {metaChips.map((chip) => (
                                    <span key={chip} className={classes.chip}>
                                        {chip}
                                    </span>
                                ))}
                            </div>
                        ) : null}
                        <div className={classes.actions}>
                            {showingTracks && visibleTracks.length > 0 ? (
                                <HardwareButton compact padded onClick={selectVisible}>
                                    {visibleTracks.slice(0, LIBRARY_LIST_LIMIT).every((track) => selected.includes(track.file))
                                        ? 'Unselect these'
                                        : 'Select these'}
                                </HardwareButton>
                            ) : null}
                            <HardwareButton
                                accent
                                compact
                                padded
                                disabled={!canEncode || selected.length === 0 || !onUseFiles}
                                onClick={handleUse}
                            >
                                {selected.length > 0 ? `Use selected → encode (${selected.length})` : 'Use selected → encode'}
                            </HardwareButton>
                            <HardwareButton compact padded onClick={() => dispatch(appActions.setShellSection('queue'))}>
                                Open queue
                            </HardwareButton>
                        </div>
                        {!canEncode ? (
                            <p className={classes.note}>Connect a MiniDisc to encode selected tracks.</p>
                        ) : null}
                        <p className={classes.note}>
                            Tracks already on this Downtify instance appear here after download. Encode pulls from the local library, not a
                            second download.
                        </p>
                    </aside>
                </div>
            </DeckPanel>
            <StatusStrip
                left={<span>{tracks.length} library tracks</span>}
                right={
                    <>
                        <span>{selected.length} selected</span>
                        <span>{playlists.length} playlists</span>
                    </>
                }
            />
        </div>
    );
}
