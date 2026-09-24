import { CustomParameterInfo, CustomParameters } from '../custom-parameters';
import { DowntifyLibraryService } from './library/downtify-library';
import { LibraryService } from './library/library';
import { RemoteLibraryService } from './library/remote-library';

function isLibraryAddress(content: string): boolean {
    if (content.startsWith('/')) {
        return content.length > 1;
    }
    try {
        const url = new URL(content);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

interface LibraryServicePrototype<T extends LibraryService> {
    create: new (parameters: CustomParameters) => T;
    customParameters?: CustomParameterInfo[];
    name: string;
    description?: string;
}

export const LibraryServices: LibraryServicePrototype<LibraryService>[] = [
    {
        name: 'Remote Library',
        create: RemoteLibraryService,
        customParameters: [
            {
                userFriendlyName: 'Server Address',
                varName: 'address',
                type: 'string',
                defaultValue: 'http://localhost:8000/',
                validator: (content) => {
                    try {
                        new URL(content);
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
            },
        ],
        description:
            'A remote library with an inbuilt encoder. Lets you cut down on bandwidth usage, by having the files sent to the local Web Minidisc instance preencoded.',
    },
    {
        name: 'Downtify',
        create: DowntifyLibraryService,
        customParameters: [
            {
                userFriendlyName: 'Server Address',
                varName: 'address',
                type: 'string',
                defaultValue: '/downtify/',
                validator: isLibraryAddress,
            },
        ],
        description:
            'Browse and download from the Downtify running inside Web MiniDisc, then encode in this browser. Use /downtify/ so this page talks to that private copy. Its format is set in Settings and does not change the separate Downtify app.',
    },
];
