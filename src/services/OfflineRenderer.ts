import { OfflineAudioContext, IOfflineAudioContext } from "standardized-audio-context";
import { useAudioStore } from "../store/useAudioStore";
import { ContextManager } from "@sonic-core/core/context-manager";
import { TrackStrip } from "@sonic-core/core/track-strip";
import { BusStrip } from "@sonic-core/core/bus-strip";
import { audioBufferToWav } from "../utils/wav-export";
import { saveAs } from "file-saver";
import { logger } from "../utils/logger";
import { ExportSettings, TranscoderService } from "./TranscoderService";
import { ViteWorkletProvider } from "@/providers/vite-worklet-provider";

export interface RenderProgress {
    percentage: number;
    status: string;
}

export class OfflineRenderer {
    
    static async render(settings: ExportSettings, onProgress?: (progress: RenderProgress) => void): Promise<void> {
        const state = useAudioStore.getState();
        const { tracks, trackOrder, master, assets } = state;

        // 1. Calculate max duration
        let maxDuration = 0;
        trackOrder.forEach(id => {
            const track = tracks[id];
            if (track && track.sourceDuration > maxDuration) {
                maxDuration = track.sourceDuration;
            }
        });

        maxDuration += 2.0;
        
        if (maxDuration <= 2.0) {
            throw new Error("No audio source found to render.");
        }

        const sampleRate = settings.sampleRate || ContextManager.context.sampleRate;
        const length = Math.ceil(maxDuration * sampleRate);

        logger.info(`Starting offline render: ${maxDuration.toFixed(2)}s at ${sampleRate}Hz`);
        
        // 2. Create Offline Context
        const offlineCtx = new OfflineAudioContext(2, length, sampleRate) as unknown as IOfflineAudioContext;

        // 3. Load worklets into offline context
        await ContextManager.loadWorklets(offlineCtx, new ViteWorkletProvider());

        // 4. Build Offline Graph
        const masterBus = new BusStrip("MASTER_OFFLINE", offlineCtx);
        masterBus.updateRack(master.rack, assets);
        masterBus.setVolume(master.volume);
        masterBus.setPan(master.pan);
        masterBus.connectTo(offlineCtx.destination as any);

        const trackStrips: TrackStrip[] = [];
        
        for (const id of trackOrder) {
            const trackState = tracks[id];
            const strip = new TrackStrip(id, offlineCtx);
            
            const sourceBuffer = assets[id] || await this.findBufferForTrack(id);
            
            if (sourceBuffer) {
                strip.setSource(sourceBuffer);
                strip.updateRack(trackState.rack, assets);
                strip.setVolume(trackState.volume);
                strip.setPan(trackState.pan);
                strip.connectTo(masterBus.inputGain as any);
                
                strip.play(0);
                trackStrips.push(strip);
            }
        }

        // 5. Render
        onProgress?.({ percentage: 0, status: "Rendering High-Fidelity Master..." });
        
        const renderedBuffer = await offlineCtx.startRendering();
        
        // 6. Encode to WAV (Temporary Source)
        onProgress?.({ percentage: 80, status: "Encoding Source..." });
        const wavData = audioBufferToWav(renderedBuffer as unknown as AudioBuffer, {
            bitDepth: settings.bitDepth,
            float: settings.bitDepth === 32
        });
        
        // 7. Transcode if needed
        onProgress?.({ percentage: 90, status: `Transcoding to ${settings.format.toUpperCase()}...` });
        const finalBlob = await TranscoderService.transcode(wavData, settings);
        
        saveAs(finalBlob, `SonicForge_Export_${Date.now()}.${settings.format}`);
        
        onProgress?.({ percentage: 100, status: "Complete!" });
        logger.info("Export complete.");
    }

    private static async findBufferForTrack(trackId: string): Promise<AudioBuffer | null> {
        const { mixerEngine } = await import("../store/useAudioStore");
        return mixerEngine.getTrack(trackId)?.sourceBuffer || null;
    }
}

