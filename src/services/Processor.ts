
import { SonicForgeSDK } from '@sonic-core/sdk.js';

let sdk: SonicForgeSDK | null = null;

export async function initProcessor() {
    if (sdk) return sdk;

    // 1. Load WASM via Fetch (Browser specific)
    const response = await fetch('/wasm/dsp.wasm');
    const bytes = await response.arrayBuffer();
    
    sdk = new SonicForgeSDK(bytes);
    await sdk.init();
    return sdk;
}

export function getProcessorSDK() {
    if (!sdk) throw new Error('Processor SDK not initialized');
    return sdk;
}

/**
 * High-level browser utility to process an AudioBuffer channel-by-channel.
 */
export async function processAudioBuffer(
    audioBuffer: AudioBuffer, 
    tool: 'declip' | 'lufs' | 'phase' | 'denoise' | 'monoBass' | 'echoVanish',
    params?: any
): Promise<AudioBuffer> {
    const sdk = getProcessorSDK();
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    
    const newBuffer = new AudioBuffer({
        length: audioBuffer.length,
        numberOfChannels: numChannels,
        sampleRate: sampleRate
    });

    // Special handling for stereo tools
    if (tool === 'monoBass' && numChannels === 2) {
        // Interleave
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        const interleaved = new Float32Array(left.length * 2);
        for (let i = 0; i < left.length; i++) {
            interleaved[i * 2] = left[i];
            interleaved[i * 2 + 1] = right[i];
        }

        const processed = sdk.processMonoBass(interleaved, sampleRate, params?.cutoff || 120);

        // De-interleave
        const newLeft = new Float32Array(left.length);
        const newRight = new Float32Array(left.length);
        for (let i = 0; i < left.length; i++) {
            newLeft[i] = processed[i * 2];
            newRight[i] = processed[i * 2 + 1];
        }
        newBuffer.copyToChannel(newLeft, 0);
        newBuffer.copyToChannel(newRight, 1);
        return newBuffer;
    }

    for (let i = 0; i < numChannels; i++) {
        let channelData = audioBuffer.getChannelData(i);
        let processed: Float32Array;

        switch (tool) {
            case 'declip':
                processed = sdk.processDeclip(channelData);
                break;
            case 'lufs':
                processed = sdk.processLufsNormalize(channelData, params?.targetLufs || -14);
                break;
            case 'phase':
                processed = sdk.processPhaseRotation(channelData);
                break;
            case 'denoise':
                processed = sdk.processSpectralDenoise(channelData);
                break;
            case 'monoBass':
                // For mono tracks, it just applies filters
                processed = sdk.processMonoBass(channelData, sampleRate, params?.cutoff || 120);
                break;
            case 'echoVanish':
                processed = sdk.processEchoVanish(channelData, sampleRate, params?.reduction ?? 0.5, params?.tailLength ?? 100);
                break;
            default:
                processed = new Float32Array(channelData);
        }
        
        newBuffer.copyToChannel(processed as any, i);
    }

    return newBuffer;
}
