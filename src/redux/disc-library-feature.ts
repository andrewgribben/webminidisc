import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';

export interface DiscLibraryState {
    discId: number | null;
    title: string | null;
    coverUrl: string | null;
    audioIndexes: number[];
    playingIndex: number | null;
    playing: boolean;
    status: string;
}

const initialState: DiscLibraryState = {
    discId: null,
    title: null,
    coverUrl: null,
    audioIndexes: [],
    playingIndex: null,
    playing: false,
    status: '',
};

const slice = createSlice({
    name: 'discLibrary',
    initialState,
    reducers: {
        setStatus: (state, action: PayloadAction<string>) => {
            state.status = action.payload;
        },
        setLibrary: (
            state,
            action: PayloadAction<{ discId: number; title: string | null; coverUrl: string | null; audioIndexes: number[] }>
        ) => {
            state.discId = action.payload.discId;
            state.title = action.payload.title;
            state.coverUrl = action.payload.coverUrl;
            state.audioIndexes = action.payload.audioIndexes;
            if (state.playingIndex !== null && !action.payload.audioIndexes.includes(state.playingIndex)) {
                state.playingIndex = null;
                state.playing = false;
            }
        },
        clear: (state) => {
            state.discId = null;
            state.title = null;
            state.coverUrl = null;
            state.audioIndexes = [];
            state.playingIndex = null;
            state.playing = false;
            state.status = '';
        },
        playTrack: (state, action: PayloadAction<number>) => {
            state.playingIndex = action.payload;
            state.playing = true;
        },
        setPlaying: (state, action: PayloadAction<boolean>) => {
            state.playing = action.payload;
        },
    },
});

export const { actions, reducer } = slice;
export default enableBatching(reducer);
