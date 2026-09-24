import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { makeStyles } from 'tss-react/mui';
import { AdaptiveFile, formatTimeFromSeconds } from '../utils';
import serviceRegistry from '../services/registry';
import {
    DowntifyLibraryService,
    DowntifyLibraryTrack,
    DowntifyPlaylist,
    libraryFileFormat,
} from '../services/library/downtify-library';
import { DowntifyQueue } from './downtify-queue';

type TopSection = 'library' | 'queue';
type LibrarySource = 'albums' | 'artists' | 'playlists' | 'tracks';

const LIBRARY_LIST_LIMIT = 200;

const useStyles = makeStyles()((theme) => ({
    content: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(1),
        minHeight: 420,
        paddingTop: theme.spacing(1),
    },
    downloadRow: {
        display: 'flex',
        gap: theme.spacing(1),
        alignItems: 'center',
    },
    list: {
        flex: 1,
        overflow: 'auto',
        maxHeight: 420,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius,
    },
}));

function libraryService(): DowntifyLibraryService {
    if (serviceRegistry.libraryService instanceof DowntifyLibraryService) {
        return serviceRegistry.libraryService;
    }
    const created = new DowntifyLibraryService({ address: '/downtify/' });
    serviceRegistry.libraryService = created;
    return created;
}

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
    return [track.title, track.artist, track.album, track.file, track.format].some((value) => value.toLowerCase().includes(queryText));
}

type LibraryGroup = { name: string; count: number; formats: string[] };

function formatsIn(files: string[]): string[] {
    return [...new Set(files.map((file) => libraryFileFormat(file)))].sort();
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
        getForEncoding: (params, onProgress) => serviceRegistry.libraryService!.processLocalLibraryFile(track.file, params, onProgress),
    };
}

export function DowntifyDialog({
    open,
    initialSection,
    onClose,
    onUseFiles,
}: {
    open: boolean;
    initialSection: TopSection;
    onClose: () => void;
    onUseFiles?: (files: AdaptiveFile[]) => void;
}) {
    const { classes } = useStyles();
    const [section, setSection] = useState<TopSection>(initialSection);
    const [source, setSource] = useState<LibrarySource>('albums');
    const [group, setGroup] = useState<string | null>(null);
    const [tracks, setTracks] = useState<DowntifyLibraryTrack[]>([]);
    const [playlists, setPlaylists] = useState<DowntifyPlaylist[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [downloadUrl, setDownloadUrl] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (open) {
            setSection(initialSection);
        }
    }, [open, initialSection]);

    const loadTracks = useCallback(async () => {
        const service = libraryService();
        const [nextTracks, nextPlaylists] = await Promise.all([service.listLibraryTracks(), service.listPlaylists()]);
        setTracks(nextTracks);
        setPlaylists(nextPlaylists);
        setLoadError(null);
    }, []);

    useEffect(() => {
        if (!open || section !== 'library') {
            return;
        }
        loadTracks().catch((err: unknown) => {
            setLoadError(err instanceof Error ? err.message : 'Could not load the Downtify library');
        });
    }, [open, section, loadTracks]);

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
        const names = new Map<string, { count: number; formats: Set<string> }>();
        for (const track of tracks) {
            const name = groupKey(track, source);
            const current = names.get(name) ?? { count: 0, formats: new Set<string>() };
            current.count += 1;
            current.formats.add(track.format);
            names.set(name, current);
        }
        return filterGroups(
            [...names.entries()]
                .map(([name, item]) => ({ name, count: item.count, formats: [...item.formats].sort() }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            queryText
        );
    }, [playlists, queryText, source, tracks]);

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

    const toggle = useCallback((file: string) => {
        setSelected((current) => (current.includes(file) ? current.filter((item) => item !== file) : [...current, file]));
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

    const handleDownload = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault();
            const url = downloadUrl.trim();
            if (!url) {
                return;
            }
            setDownloading(true);
            setStatus('Resolving URL in Downtify...');
            try {
                const result = await libraryService().downloadFromUrl(url);
                setDownloadUrl('');
                setStatus(DowntifyLibraryService.statusMessage(result));
                setSection('queue');
            } catch (err) {
                setStatus(err instanceof Error ? err.message : 'Download failed');
            } finally {
                setDownloading(false);
            }
        },
        [downloadUrl]
    );

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

    const handleUse = useCallback(() => {
        if (!onUseFiles) {
            return;
        }
        const chosen = selected.flatMap((file) => {
            const track = catalog.get(file);
            return track ? [track] : [];
        });
        onUseFiles(chosen.map(toAdaptiveFile));
        setSelected([]);
        onClose();
    }, [catalog, onClose, onUseFiles, selected]);

    const showingTracks = source === 'tracks' || group !== null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Downtify</DialogTitle>
            <DialogContent className={classes.content}>
                <form className={classes.downloadRow} onSubmit={handleDownload}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Spotify or YouTube track, album, or playlist URL"
                        value={downloadUrl}
                        disabled={downloading}
                        onChange={(event) => setDownloadUrl(event.target.value)}
                    />
                    <Button type="submit" variant="contained" disabled={downloading || downloadUrl.trim().length === 0}>
                        Download
                    </Button>
                </form>
                {status ? (
                    <Typography variant="body2" color="textSecondary">
                        {status}
                    </Typography>
                ) : null}
                <Tabs value={section} onChange={(_event, value: TopSection) => setSection(value)}>
                    <Tab value="library" label="Library" />
                    <Tab value="queue" label="Queue" />
                </Tabs>
                {section === 'queue' ? (
                    <DowntifyQueue library={libraryService()} />
                ) : (
                    <>
                        <Tabs
                            value={source}
                            onChange={(_event, value: LibrarySource) => {
                                setSource(value);
                                setGroup(null);
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
                            size="small"
                            label="Search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                        <List className={classes.list} dense>
                            {showingTracks && source !== 'tracks' ? (
                                <ListItemButton onClick={() => setGroup(null)}>
                                    <ListItemText primary="Back" secondary={group} />
                                </ListItemButton>
                            ) : null}
                            {showingTracks
                                ? visibleTracks.slice(0, LIBRARY_LIST_LIMIT).map((track) => (
                                      <ListItemButton key={track.file} onClick={() => toggle(track.file)}>
                                          <Checkbox edge="start" checked={selected.includes(track.file)} tabIndex={-1} disableRipple />
                                          <ListItemText
                                              primary={track.trackNumber > 0 ? `${track.trackNumber}. ${track.title}` : track.title}
                                              secondary={`${track.format} · ${track.artist || 'Unknown artist'} · ${track.album || 'Unknown album'} · ${formatTimeFromSeconds(track.duration, false)}`}
                                          />
                                      </ListItemButton>
                                  ))
                                : groups.slice(0, LIBRARY_LIST_LIMIT).map((item) => (
                                      <ListItemButton key={item.name} onClick={() => setGroup(item.name)}>
                                          <ListItemText
                                              primary={item.name}
                                              secondary={`${item.count} track${item.count === 1 ? '' : 's'} · ${item.formats.join(', ') || 'Unknown'}`}
                                          />
                                      </ListItemButton>
                                  ))}
                            {!loadError && tracks.length === 0 ? (
                                <ListItemText primary="Nothing in the Downtify library yet." />
                            ) : null}
                            {(showingTracks ? visibleTracks.length : groups.length) > LIBRARY_LIST_LIMIT ? (
                                <ListItemText
                                    primary={`Showing ${LIBRARY_LIST_LIMIT} of ${showingTracks ? visibleTracks.length : groups.length}. Search to narrow the list.`}
                                />
                            ) : null}
                        </List>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                {section === 'library' && showingTracks && visibleTracks.length > 0 ? (
                    <Button onClick={selectVisible}>
                        {visibleTracks.slice(0, LIBRARY_LIST_LIMIT).every((track) => selected.includes(track.file)) ? 'Unselect these' : 'Select these'}
                    </Button>
                ) : null}
                <Button onClick={onClose}>Close</Button>
                {onUseFiles ? (
                    <Button variant="contained" disabled={selected.length === 0} onClick={handleUse}>
                        {selected.length > 0 ? `Add ${selected.length} to disc` : 'Add to disc'}
                    </Button>
                ) : null}
            </DialogActions>
        </Dialog>
    );
}
