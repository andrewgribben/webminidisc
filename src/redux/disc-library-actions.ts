import { batchActions } from '../frontend-utils';
import { Capability, ExploitCapability } from '../services/interfaces/netmd';
import {
    bytesToBase64,
    detailedDisc,
    discCreateBody,
    listSavedAudio,
    libraryAssetUrl,
    matchKnownDisc,
    ReleaseDetails,
    saveDisc,
    uploadDiscCover,
    uploadSavedAudio,
    withAlbumTitles,
} from '../services/md-library';
import { getTracks } from '../utils';
import { downloadTracks, renameDisc, renameTrack } from './actions';
import { actions as discLibraryActions } from './disc-library-feature';
import { actions as errorDialogActions } from './error-dialog-feature';
import { checkFactoryCapability, exploitDownloadTracks } from './factory/factory-actions';
import { AppDispatch, RootState } from './store';

export type SaveGeneratedAlbumArtResult =
    | { status: 'saved'; coverUrl: string }
    | { status: 'needsConfirm' }
    | { status: 'skipped' }
    | { status: 'error'; message: string };

const titleLimit = 120;

function renameFields(title: string, fullWidth: boolean): { newName: string; newFullWidthName?: string } {
    const cleaned = title.replace(/\/\//g, ' / ').slice(0, titleLimit);
    if (fullWidth) {
        return { newName: cleaned, newFullWidthName: cleaned };
    }
    return { newName: cleaned };
}

function indexFromDownloadName(name: string): number | null {
    const match = /^(\d+)\./.exec(name);
    if (!match) {
        return null;
    }
    return Number(match[1]) - 1;
}

function reportError(dispatch: AppDispatch, message: string) {
    dispatch(
        batchActions([
            discLibraryActions.setStatus(message),
            errorDialogActions.setVisible(true),
            errorDialogActions.setErrorMessage(message),
        ])
    );
}

function cacheBustCoverUrl(url: string | null): string | null {
    if (!url) {
        return null;
    }
    const base = url.split('?')[0];
    return `${base}?v=${Date.now()}`;
}

async function rememberDisc(dispatch: AppDispatch, discId: number, status?: string, bustCoverCache = false) {
    const detailed = await detailedDisc(discId);
    const audio = await listSavedAudio(discId);
    const cover = detailed.tracks.map((track) => track.album?.cover_url).find((url) => url) ?? null;
    const resolved = libraryAssetUrl(cover);
    dispatch(
        discLibraryActions.setLibrary({
            discId,
            title: detailed.disc_title,
            coverUrl: bustCoverCache ? cacheBustCoverUrl(resolved) : resolved,
            audioIndexes: audio.indexes,
        })
    );
    if (status) {
        dispatch(discLibraryActions.setStatus(status));
    }
}

export function loadKnownDisc() {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        const disc = getState().main.disc;
        if (!disc || getTracks(disc).length === 0) {
            dispatch(discLibraryActions.clear());
            return;
        }
        try {
            const match = await matchKnownDisc(disc);
            if (!match.matched || match.disc_id == null) {
                dispatch(discLibraryActions.clear());
                return;
            }
            const audio = await listSavedAudio(match.disc_id);
            await rememberDisc(dispatch, match.disc_id);
            if (audio.indexes.length > 0 && getState().discLibrary.status === '') {
                const count = audio.indexes.length;
                dispatch(
                    discLibraryActions.setStatus(
                        `${count} saved ${count === 1 ? 'track is' : 'tracks are'} ready to play in the browser.`
                    )
                );
            }
        } catch (error) {
            console.error(error);
            dispatch(discLibraryActions.setStatus('Metadata library is unavailable.'));
        }
    };
}

export function applyMatchedRelease(release: ReleaseDetails) {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        const disc = getState().main.disc;
        if (!disc) {
            return;
        }
        const fullWidth =
            getState().appState.fullWidthSupport && getState().main.deviceCapabilities.includes(Capability.fullWidthSupport);
        const canRename = getState().main.deviceCapabilities.includes(Capability.metadataEdit);
        try {
            if (canRename) {
                dispatch(discLibraryActions.setStatus('Writing titles to the MiniDisc…'));
                const tracks = getTracks(disc);
                const entries: { index: number; newName: string; newFullWidthName?: string }[] = [];
                const count = Math.min(tracks.length, release.tracks.length);
                for (let i = 0; i < count; i++) {
                    const title = release.tracks[i]?.title?.trim();
                    if (!title) {
                        continue;
                    }
                    entries.push({ index: tracks[i].index, ...renameFields(title, fullWidth) });
                }
                if (entries.length > 0) {
                    await dispatch(renameTrack(...entries));
                }
                const albumTitle = release.title?.trim();
                const grouped =
                    disc.title.includes('//') ||
                    (disc.fullWidthTitle || '').includes('//') ||
                    (disc.fullWidthTitle || '').includes('／／');
                if (albumTitle && !grouped) {
                    await dispatch(renameDisc(renameFields(albumTitle, fullWidth)));
                }
            }
            dispatch(discLibraryActions.setStatus('Remembering this disc…'));
            const saved = await saveDisc(await discCreateBody(disc, release));
            await rememberDisc(
                dispatch,
                saved.disc_id,
                canRename
                    ? 'Titles written. This disc will be recognized the next time it is inserted.'
                    : 'Album saved in the library. This recorder cannot rename tracks on the disc.'
            );
        } catch (error) {
            console.error(error);
            reportError(dispatch, error instanceof Error ? error.message : 'Could not save this album.');
        }
    };
}

/** Persist canvas-generated title art as the disc album cover (same path as MusicBrainz covers). */
export function saveGeneratedAlbumArt(options: {
    bytes: Uint8Array;
    mime: string;
    overwriteConfirmed?: boolean;
    albumTitle?: string | null;
}) {
    return async function (dispatch: AppDispatch, getState: () => RootState): Promise<SaveGeneratedAlbumArtResult> {
        const disc = getState().main.disc;
        if (!disc) {
            return { status: 'skipped' };
        }
        const existingCover = getState().discLibrary.coverUrl;
        if (existingCover && !options.overwriteConfirmed) {
            return { status: 'needsConfirm' };
        }
        try {
            let discId = getState().discLibrary.discId;
            if (discId == null) {
                dispatch(discLibraryActions.setStatus('Saving the disc record…'));
                const body = withAlbumTitles(await discCreateBody(disc), options.albumTitle);
                const saved = await saveDisc(body);
                discId = saved.disc_id;
                await rememberDisc(dispatch, discId);
            }
            dispatch(discLibraryActions.setStatus('Saving title album art…'));
            await uploadDiscCover(discId, bytesToBase64(options.bytes), options.mime);
            await rememberDisc(dispatch, discId, 'Title album art saved for this disc.', true);
            const coverUrl = getState().discLibrary.coverUrl;
            if (!coverUrl) {
                return {
                    status: 'error',
                    message: 'Album art was uploaded but the library did not return a cover URL.',
                };
            }
            return { status: 'saved', coverUrl };
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Could not save title album art.';
            dispatch(discLibraryActions.setStatus(message));
            return { status: 'error', message };
        }
    };
}

export function saveDiscAudio(selected: number[]) {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        const disc = getState().main.disc;
        if (!disc) {
            return;
        }
        const allIndexes = getTracks(disc).map((track) => track.index);
        const indexes = selected.length > 0 ? [...selected] : allIndexes;
        if (indexes.length === 0) {
            return;
        }
        if (selected.length === 0) {
            const confirmed = window.confirm(
                `Save all ${indexes.length} tracks as playable WAV files? This reads them from the MiniDisc.`
            );
            if (!confirmed) {
                return;
            }
        }
        try {
            let discId = getState().discLibrary.discId;
            if (discId == null) {
                dispatch(discLibraryActions.setStatus('Saving the disc record…'));
                const saved = await saveDisc(await discCreateBody(disc));
                discId = saved.disc_id;
                await rememberDisc(dispatch, discId);
            }
            const native = getState().main.deviceCapabilities.includes(Capability.trackDownload);
            let chain = Promise.resolve();
            let savedCount = 0;
            const onTrack = (blob: Blob, name: string) => {
                const index = indexFromDownloadName(name);
                if (index == null) {
                    return;
                }
                const savedId = discId as number;
                chain = chain.then(async () => {
                    dispatch(discLibraryActions.setStatus(`Saving track ${index + 1}…`));
                    try {
                        await uploadSavedAudio(savedId, index, blob);
                        savedCount += 1;
                    } catch (error) {
                        console.error(error);
                        dispatch(
                            discLibraryActions.setStatus(
                                error instanceof Error ? error.message : `Track ${index + 1} could not be saved.`
                            )
                        );
                    }
                });
            };
            if (native) {
                dispatch(discLibraryActions.setStatus('Copying tracks from the MiniDisc…'));
                await downloadTracks(indexes, true, onTrack)(dispatch, getState);
            } else {
                dispatch(discLibraryActions.setStatus('Checking whether this recorder can be copied…'));
                const canRip = await checkFactoryCapability(dispatch, ExploitCapability.downloadAtrac);
                if (!canRip) {
                    dispatch(
                        discLibraryActions.setStatus(
                            'This recorder cannot copy audio off the disc. Matching titles still works. Native download is mainly the MZ-RH1; other NetMD units need the homebrew path, and some cannot be ripped.'
                        )
                    );
                    return;
                }
                dispatch(discLibraryActions.setStatus('Copying tracks with the homebrew downloader…'));
                await exploitDownloadTracks(indexes, true, onTrack)(dispatch, getState);
            }
            await chain;
            if (savedCount === 0) {
                dispatch(
                    discLibraryActions.setStatus(
                        'No audio was copied. Native download is mainly the MZ-RH1. Other NetMD units need the homebrew path, and some cannot be ripped. Matching titles does not need a download.'
                    )
                );
                return;
            }
            await rememberDisc(
                dispatch,
                discId,
                'Saved audio is ready to play in the browser. The MiniDisc controls below are unchanged.'
            );
        } catch (error) {
            console.error(error);
            reportError(dispatch, error instanceof Error ? error.message : 'Saving audio failed.');
        }
    };
}
