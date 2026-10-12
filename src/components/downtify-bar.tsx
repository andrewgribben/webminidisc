import React, { useEffect } from 'react';
import { useDispatch, useShallowEqualSelector } from '../frontend-utils';
import { actions as appActions } from '../redux/app-feature';
import { actions as localLibraryActions } from '../redux/local-library-feature';
import { DowntifyLibraryService } from '../services/library/downtify-library';
import serviceRegistry from '../services/registry';
import { AdaptiveFile } from '../utils';
import { getDowntifyLibrary } from '../services/library/downtify-client';

/**
 * Legacy entry point. Library / Queue live in the shell navbar now.
 * Kept so older call sites still route into the Library section.
 */
export function DowntifyBar({ onUseFiles: _onUseFiles }: { onUseFiles?: (files: AdaptiveFile[]) => void }) {
    const dispatch = useDispatch();
    const libraryVisible = useShallowEqualSelector((state) => state.localLibrary.visible);

    useEffect(() => {
        if (libraryVisible && serviceRegistry.libraryService instanceof DowntifyLibraryService) {
            getDowntifyLibrary();
            dispatch(appActions.setShellSection('library'));
            dispatch(localLibraryActions.setVisible(false));
        }
    }, [dispatch, libraryVisible]);

    return null;
}
