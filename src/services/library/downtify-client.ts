import { DowntifyLibraryService } from './downtify-library';
import serviceRegistry from '../registry';

/** Resolve or create the embedded Downtify library client. */
export function getDowntifyLibrary(): DowntifyLibraryService {
    if (serviceRegistry.libraryService instanceof DowntifyLibraryService) {
        return serviceRegistry.libraryService;
    }
    const created = new DowntifyLibraryService({ address: '/downtify/' });
    serviceRegistry.libraryService = created;
    return created;
}
