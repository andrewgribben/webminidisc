import React, { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { makeStyles } from 'tss-react/mui';
import { useDispatch, useShallowEqualSelector } from '../frontend-utils';
import { actions as convertDialogActions } from '../redux/convert-dialog-feature';
import { actions as localLibraryActions } from '../redux/local-library-feature';
import { DowntifyLibraryService } from '../services/library/downtify-library';
import serviceRegistry from '../services/registry';
import { AdaptiveFile } from '../utils';
import { DowntifyDialog } from './downtify-dialog';

const useStyles = makeStyles()((theme) => ({
    bar: {
        display: 'flex',
        gap: theme.spacing(1),
        alignItems: 'center',
        marginTop: theme.spacing(1),
        marginBottom: theme.spacing(1),
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

export function DowntifyBar({ onUseFiles }: { onUseFiles?: (files: AdaptiveFile[]) => void }) {
    const { classes } = useStyles();
    const dispatch = useDispatch();
    const libraryVisible = useShallowEqualSelector((state) => state.localLibrary.visible);
    const [open, setOpen] = useState(false);
    const [section, setSection] = useState<'library' | 'queue'>('library');
    const [activeCount, setActiveCount] = useState(0);

    useEffect(() => {
        if (libraryVisible && serviceRegistry.libraryService instanceof DowntifyLibraryService) {
            setSection('library');
            setOpen(true);
        }
    }, [libraryVisible]);

    useEffect(() => {
        let cancelled = false;
        const load = () => {
            libraryService()
                .getQueue()
                .then((jobs) => {
                    if (!cancelled) {
                        setActiveCount(jobs.filter((job) => job.status === 'queued' || job.status === 'downloading').length);
                    }
                })
                .catch(() => undefined);
        };
        load();
        const timer = window.setInterval(load, 3000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, []);

    const handleClose = useCallback(() => {
        setOpen(false);
        dispatch(localLibraryActions.setVisible(false));
    }, [dispatch]);

    const handleUseFiles = useCallback(
        (files: AdaptiveFile[]) => {
            if (!onUseFiles) {
                return;
            }
            onUseFiles(files);
            if (files.length > 0) {
                dispatch(convertDialogActions.setVisible(true));
            }
        },
        [dispatch, onUseFiles]
    );

    return (
        <div className={classes.bar}>
            <Button
                variant="outlined"
                onClick={() => {
                    libraryService();
                    setSection(activeCount > 0 ? 'queue' : 'library');
                    setOpen(true);
                }}
            >
                Downtify
            </Button>
            {activeCount > 0 ? (
                <Typography variant="body2" color="textSecondary">
                    {activeCount} downloading
                </Typography>
            ) : null}
            <DowntifyDialog open={open} initialSection={section} onClose={handleClose} onUseFiles={onUseFiles ? handleUseFiles : undefined} />
        </div>
    );
}
