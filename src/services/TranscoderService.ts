import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { logger } from '../utils/logger';

export type ExportFormat = 'wav' | 'mp3' | 'aac' | 'flac';

export interface ExportSettings {
    format: ExportFormat;
    bitDepth: 16 | 24 | 32; // For WAV/FLAC
    kbps: 128 | 192 | 256 | 320; // For MP3/AAC
    sampleRate: 44100 | 48000 | 88200 | 96000;
}

export class TranscoderService {
    private static ffmpeg: FFmpeg | null = null;
    private static isLoading = false;

    static async init() {
        if (this.ffmpeg) return;
        if (this.isLoading) {
            // Wait for existing load to finish
            while (this.isLoading) {
                await new Promise(r => setTimeout(r, 100));
            }
            return;
        }

        this.isLoading = true;
        try {
            logger.info("Loading FFmpeg.wasm...");
            this.ffmpeg = new FFmpeg();
            
            // Redirect logs to our logger
            this.ffmpeg.on('log', ({ message }) => {
                if (message.includes('Error')) logger.error("FFmpeg:", message);
                else logger.info("FFmpeg:", message);
            });

            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
            
            await this.ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            
            logger.info("FFmpeg loaded successfully");
        } catch (e) {
            logger.error("Failed to load FFmpeg", e);
            this.ffmpeg = null;
            throw e;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Transcodes a WAV buffer to the target format using FFmpeg.wasm
     */
    static async transcode(wavBuffer: ArrayBuffer, settings: ExportSettings): Promise<Blob> {
        if (settings.format === 'wav') {
            return new Blob([wavBuffer], { type: 'audio/wav' });
        }

        try {
            await this.init();
            if (!this.ffmpeg) throw new Error("FFmpeg failed to initialize");
            
            const ffmpeg = this.ffmpeg;
            const inputName = `input_${Date.now()}.wav`;
            const outputName = `output_${Date.now()}.${settings.format}`;

            logger.info(`Transcoding to ${settings.format}...`);
            await ffmpeg.writeFile(inputName, new Uint8Array(wavBuffer));

            let args: string[] = ['-i', inputName];

            if (settings.format === 'mp3') {
                args.push('-b:a', `${settings.kbps}k`, '-ar', `${settings.sampleRate}`, outputName);
            } else if (settings.format === 'aac') {
                args.push('-c:a', 'aac', '-b:a', `${settings.kbps}k`, '-ar', `${settings.sampleRate}`, outputName);
            } else if (settings.format === 'flac') {
                args.push('-c:a', 'flac', outputName);
            }

            const result = await ffmpeg.exec(args);
            if (result !== 0) {
                throw new Error(`FFmpeg execution failed with code ${result}`);
            }

            const data = await ffmpeg.readFile(outputName);
            const typeMap: Record<string, string> = {
                mp3: 'audio/mpeg',
                aac: 'audio/aac',
                flac: 'audio/flac'
            };

            // Cleanup
            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);

            logger.info(`Transcoding complete: ${settings.format}`);
            return new Blob([(data as Uint8Array).buffer as ArrayBuffer], { type: typeMap[settings.format] });
        } catch (e) {
            logger.error("Transcoding error", e);
            throw e;
        }
    }
}
