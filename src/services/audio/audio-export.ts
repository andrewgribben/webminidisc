import { createWorker, setLogging } from '@ffmpeg/ffmpeg';
import { CodecFamily } from '../interfaces/netmd';
import { getPublicPathFor } from '../../utils';

export interface LogPayload {
    message: string;
    action: string;
}

export type ExportParams = {
    format: { bitrate: number; codec: 'AT3' | 'A3+' | 'PCM' | 'MP3' };
    enableReplayGain?: boolean;
    writeGapless: boolean;
};

export interface AudioExportService {
    init(): Promise<void>;
    export(params: ExportParams, callback: (obj: { state: number; total: number }) => void): Promise<ArrayBuffer>;
    info(): Promise<{ format: string | null; input: string | null }>;
    prepare(file: File): Promise<void>;

    getSupport(codec: CodecFamily): { state: 'perfect' | 'mediocre' | 'unsupported'; gapless: boolean };
}

export abstract class DefaultFfmpegAudioExportService implements AudioExportService {
    public ffmpegProcess?: ReturnType<typeof createWorker>;
    public loglines: { action: string; message: string }[] = [];
    public inFileName: string = ``;
    public outFileNameNoExt: string = ``;
    private ffmpegDurationSec = 0;
    private ffmpegProgress?: (ratio: number) => void;

    async init() {
        setLogging(true);
    }

    async prepare(file: File) {
        this.loglines = [];
        await this.loadFfmpeg();

        const ext = file.name.split('.').slice(-1);
        if (ext.length === 0) {
            throw new Error(`Unrecognized file format: ${file.name}`);
        }

        this.inFileName = `inAudioFile.${ext[0]}`;
        this.outFileNameNoExt = `outAudioFile`;

        await this.ffmpegProcess.write(this.inFileName, file);
    }

    async loadFfmpeg() {
        this.ffmpegProcess = createWorker({
            logger: (payload: LogPayload) => {
                this.loglines.push(payload);
                this.noteFfmpegMessage(payload.message);
            },
            progress: () => undefined,
            corePath: getPublicPathFor('ffmpeg-core.js'),
            workerPath: getPublicPathFor('worker.min.js'),
        });
        await this.ffmpegProcess.load();
    }

    async volumeDetect() {
        await this.ffmpegProcess.transcode(this.inFileName, 'null', `-af volumedetect -f null`);

        const maxVolumeRegex = /max_volume: ((-)?[\d]*\.[\d]*) dB/;
        let maxVolume;

        for (const line of this.loglines) {
            const match = line.message.match(maxVolumeRegex);
            if (match !== null) {
                maxVolume = parseFloat(match[1]);
            }
        }
        this.loglines = [];
        return maxVolume ?? 0;
    }

    async info() {
        await this.ffmpegProcess.transcode(this.inFileName, `${this.outFileNameNoExt}.metadata`, `-f ffmetadata`);

        const audioFormatRegex = /Audio:\s(.*?),/; // Actual content
        const inputFormatRegex = /Input #0,\s(.*?),/; // Container
        let format: string | null = null;
        let input: string | null = null;

        for (const line of this.loglines) {
            let match = line.message.match(audioFormatRegex);
            if (match !== null) {
                format = match[1];
                continue;
            }
            match = line.message.match(inputFormatRegex);
            if (match !== null) {
                input = match[1];
                continue;
            }
            if (format !== null && input !== null) {
                break;
            }
        }

        return { format, input };
    }

    async createFfmpegParams(parameters: ExportParams, outputFormat: string, moreParams?: string) {
        const { enableReplayGain } = parameters;
        let additionalCommands = '';
        const commonFormatting = `-ac 2 -ar 44100`;
        if (enableReplayGain) {
            additionalCommands += `-af volume=replaygain=track`;
        }
        return `${additionalCommands} ${commonFormatting} ${moreParams ?? ''} -f ${outputFormat}`;
    }

    async export(parameters: ExportParams, callback?: (obj: { state: number; total: number }) => void) {
        const { format } = parameters;
        let result: ArrayBuffer;
        if (format.codec === `PCM`) {
            result = await this.encodePCM(parameters, callback);
        } else if (format.codec === 'AT3') {
            result = await this.encodeATRAC3(parameters, callback);
        } else if (format.codec === 'MP3') {
            result = await this.encodeMP3(parameters, callback);
        } else if (format.codec === 'A3+') {
            result = await this.encodeATRAC3Plus(parameters, callback);
        } else throw new Error('Invalid format');
        this.ffmpegProcess?.worker.terminate();
        return result;
    }

    async encodePCM(parameters: ExportParams, callback?: (obj: { state: number; total: number }) => void): Promise<ArrayBuffer> {
        return this.transcodeWithProgress(parameters, 's16be', `${this.outFileNameNoExt}.raw`, callback);
    }

    async encodeMP3(parameters: ExportParams, callback?: (obj: { state: number; total: number }) => void): Promise<ArrayBuffer> {
        const ffmpegCommand = await this.createFfmpegParams(
            parameters,
            'mp3',
            `-map 0:a:0 -c:a libmp3lame -b:a ${parameters.format.bitrate!}k`
        );
        return this.finishTranscode(`${this.outFileNameNoExt}.mp3`, ffmpegCommand, callback);
    }

    private noteFfmpegMessage(message: string | undefined) {
        if (!message || !this.ffmpegProgress) {
            return;
        }
        const duration = message.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
        if (duration) {
            this.ffmpegDurationSec = Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]);
        }
        const time = message.match(/time=\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
        if (time && this.ffmpegDurationSec > 0) {
            const seconds = Number(time[1]) * 3600 + Number(time[2]) * 60 + Number(time[3]);
            this.ffmpegProgress(Math.max(0, Math.min(1, seconds / this.ffmpegDurationSec)));
        }
    }

    private async transcodeWithProgress(
        parameters: ExportParams,
        outputFormat: string,
        outFileName: string,
        callback?: (obj: { state: number; total: number }) => void
    ): Promise<ArrayBuffer> {
        const ffmpegCommand = await this.createFfmpegParams(parameters, outputFormat);
        return this.finishTranscode(outFileName, ffmpegCommand, callback);
    }

    private async finishTranscode(
        outFileName: string,
        ffmpegCommand: string,
        callback?: (obj: { state: number; total: number }) => void
    ): Promise<ArrayBuffer> {
        this.ffmpegDurationSec = 0;
        this.ffmpegProgress = (ratio) => callback?.({ state: Math.round(ratio * 1000), total: 1000 });
        try {
            await this.ffmpegProcess.transcode(this.inFileName, outFileName, ffmpegCommand);
            callback?.({ state: 1000, total: 1000 });
        } finally {
            this.ffmpegProgress = undefined;
        }
        const { data } = await this.ffmpegProcess.read(outFileName);
        return data.buffer;
    }

    abstract encodeATRAC3(parameters: ExportParams, callback?: (obj: { state: number; total: number }) => void): Promise<ArrayBuffer>;
    abstract encodeATRAC3Plus(parameters: ExportParams, callback?: (obj: { state: number; total: number }) => void): Promise<ArrayBuffer>;
    abstract getSupport(codec: CodecFamily): { state: 'perfect' | 'mediocre' | 'unsupported'; gapless: boolean };
}
