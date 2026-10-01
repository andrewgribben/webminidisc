import React, { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';
import { useDispatch, useShallowEqualSelector } from '../frontend-utils';
import { applyMatchedRelease } from '../redux/disc-library-actions';
import { AlbumMatch, libraryAssetUrl, matchAlbum, ReleaseDetails, releaseDetails } from '../services/md-library';

export function MatchAlbumDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const dispatch = useDispatch();
    const disc = useShallowEqualSelector((state) => state.main.disc);
    const discRef = useRef(disc);
    discRef.current = disc;
    const [loading, setLoading] = useState(false);
    const [writing, setWriting] = useState(false);
    const [error, setError] = useState('');
    const [matches, setMatches] = useState<AlbumMatch[]>([]);
    const [details, setDetails] = useState<ReleaseDetails | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }
        let cancelled = false;
        setMatches([]);
        setDetails(null);
        setError('');
        const currentDisc = discRef.current;
        if (!currentDisc) {
            setError('Connect a disc before matching an album.');
            return;
        }
        setLoading(true);
        matchAlbum(currentDisc)
            .then((found) => {
                if (!cancelled) {
                    setMatches(found);
                    if (found.length === 0) {
                        setError('No MusicBrainz release matched this track list.');
                    }
                }
            })
            .catch((reason: unknown) => {
                if (!cancelled) {
                    setError(reason instanceof Error ? reason.message : 'Album search failed.');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [open]);

    const choose = (match: AlbumMatch) => {
        const currentDisc = discRef.current;
        if (!currentDisc) {
            setError('Connect a disc before matching an album.');
            return;
        }
        setError('');
        setLoading(true);
        releaseDetails(match.release_mbid, currentDisc)
            .then((release) => {
                setDetails(release);
            })
            .catch((reason: unknown) => {
                setError(reason instanceof Error ? reason.message : 'Could not load that release.');
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const writeTitles = () => {
        if (!details) {
            return;
        }
        setWriting(true);
        void Promise.resolve(dispatch(applyMatchedRelease(details))).finally(() => {
            setWriting(false);
            onClose();
        });
    };

    return (
        <Dialog open={open} onClose={writing ? undefined : onClose} fullWidth maxWidth="sm">
            <DialogTitle>Match album</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="textSecondary" paragraph>
                    Titles are written onto the MiniDisc. The disc is also saved so the next insert can be recognized without searching
                    MusicBrainz again.
                </Typography>
                {loading ? <CircularProgress size={24} /> : null}
                {error ? (
                    <Typography variant="body2" color="error">
                        {error}
                    </Typography>
                ) : null}
                {details ? (
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        {libraryAssetUrl(details.cover_url) ? (
                            <Box
                                component="img"
                                src={libraryAssetUrl(details.cover_url) ?? ''}
                                alt=""
                                sx={{ width: 96, height: 96, objectFit: 'cover', flex: '0 0 auto' }}
                            />
                        ) : null}
                        <Box>
                        <Typography variant="subtitle1">{details.title}</Typography>
                        <Typography variant="body2" color="textSecondary">
                            {details.artist_credit}
                            {details.date ? ` · ${details.date}` : ''}
                            {details.medium_title ? ` · ${details.medium_title}` : ''}
                        </Typography>
                        <List dense>
                            {details.tracks.map((track, index) => (
                                <Typography key={`${track.number ?? track.position}-${index}`} variant="body2">
                                    {track.number ?? index + 1}. {track.title}
                                </Typography>
                            ))}
                        </List>
                        </Box>
                    </Box>
                ) : (
                    <List>
                        {matches.map((match) => {
                            const cover = libraryAssetUrl(match.cover_url);
                            return (
                                <ListItemButton key={match.release_mbid} onClick={() => choose(match)}>
                                    {cover ? (
                                        <Box
                                            component="img"
                                            src={cover}
                                            alt=""
                                            sx={{ width: 48, height: 48, objectFit: 'cover', mr: 1.5 }}
                                        />
                                    ) : null}
                                    <Box>
                                        <Typography variant="body1">{match.title}</Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            {[match.artist_credit, match.date, match.track_count ? `${match.track_count} tracks` : null]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </Typography>
                                    </Box>
                                </ListItemButton>
                            );
                        })}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                {details ? (
                    <Button onClick={() => setDetails(null)} disabled={writing}>
                        Back
                    </Button>
                ) : null}
                <Button onClick={onClose} disabled={writing}>
                    Cancel
                </Button>
                <Button onClick={writeTitles} disabled={!details || writing} variant="contained">
                    Write these titles
                </Button>
            </DialogActions>
        </Dialog>
    );
}
