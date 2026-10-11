import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { CachedLabelPack } from './types';

interface LabelPackDB extends DBSchema {
    packs: {
        key: string;
        value: CachedLabelPack;
    };
}

const DB_NAME = 'webminidisc-labels';
const STORE = 'packs';
const MAX_PACKS = 40;

let dbPromise: Promise<IDBPDatabase<LabelPackDB>> | null = null;

function getDb(): Promise<IDBPDatabase<LabelPackDB>> {
    if (!dbPromise) {
        dbPromise = openDB<LabelPackDB>(DB_NAME, 1, {
            upgrade(db) {
                db.createObjectStore(STORE);
            },
        });
    }
    return dbPromise;
}

export async function getCachedLabelPack(signature: string): Promise<CachedLabelPack | undefined> {
    const db = await getDb();
    return db.get(STORE, signature);
}

export async function putCachedLabelPack(signature: string, pack: CachedLabelPack): Promise<void> {
    const db = await getDb();
    await db.put(STORE, pack, signature);
    await pruneOldest(db);
}

async function pruneOldest(db: IDBPDatabase<LabelPackDB>): Promise<void> {
    const keys = await db.getAllKeys(STORE);
    if (keys.length <= MAX_PACKS) {
        return;
    }
    const entries = await Promise.all(
        keys.map(async (key) => {
            const value = await db.get(STORE, key);
            return { key, createdAt: value?.createdAt ?? 0 };
        })
    );
    entries.sort((a, b) => a.createdAt - b.createdAt);
    const removeCount = entries.length - MAX_PACKS;
    for (let i = 0; i < removeCount; i++) {
        await db.delete(STORE, entries[i].key);
    }
}
