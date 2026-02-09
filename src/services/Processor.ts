import { SonicForgeSDK } from '@sonic-core/sdk.js';
import { AudioAnalysis } from '@sonic-core/types.js';

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
    tool: 'declip' | 'lufs' | 'phase' | 'denoise' | 'monoBass' | 'plosiveGuard' | 'voiceIsolate' | 'psychodynamic' | 'smartLevel' | 'debleed' | 'tapeStabilizer' | 'spectralMatch' | 'echovanish',
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

    if (tool === 'debleed') {
        if (numChannels < 2) {
            // Passthrough for mono
            newBuffer.copyToChannel(audioBuffer.getChannelData(0), 0);
            return newBuffer;
        }

        const target = audioBuffer.getChannelData(0);
        const source = audioBuffer.getChannelData(1);

        const sensitivity = params?.sensitivity ?? 0.5;
        const threshold = params?.threshold ?? -40;

        const processed = sdk.processDebleed(target, source, sensitivity, threshold);

        newBuffer.copyToChannel(processed as any, 0);
        newBuffer.copyToChannel(source as any, 1); // Keep source as is
        return newBuffer;
    }

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

    // Spectral Match needs a reference
    let analysisPtr = 0;
    if (tool === 'spectralMatch' && params?.referenceBuffer) {
        analysisPtr = sdk.spectralMatchAnalyze(params.referenceBuffer.getChannelData(0));
    }

    try {
        for (let i = 0; i < numChannels; i++) {
            let channelData = audioBuffer.getChannelData(i);
            let processed: Float32Array;

            switch (tool) {
                case 'declip':
                    processed = sdk.processDeclip(channelData, params?.threshold || 0.99);
                    break;
                case 'lufs':
                    processed = sdk.processLufsNormalize(channelData, params?.targetLufs || -14);
                    break;
                case 'phase':
                    processed = sdk.processPhaseRotation(channelData);
                    break;
                case 'denoise':
                    processed = sdk.processSpectralDenoise(channelData, params?.noiseBuffer?.getChannelData(0));
                    break;
                case 'monoBass':
                    // For mono tracks, it just applies filters
                    processed = sdk.processMonoBass(channelData, sampleRate, params?.cutoff || 120);
                    break;
                case 'plosiveGuard':
                    processed = sdk.processPlosiveGuard(
                        channelData,
                        sampleRate,
                        params?.sensitivity ?? 0.5,
                        params?.strength ?? 0.5,
                        params?.cutoff ?? 150
                    );
                    break;
                case 'voiceIsolate':
                    processed = sdk.processVoiceIsolate(channelData, params?.amount ?? 1.0);
                    break;
                case 'psychodynamic':
                    processed = sdk.processPsychodynamic(channelData, sampleRate, params?.intensity ?? 1.0, params?.refDb ?? -18.0);
                    break;
                case 'smartLevel':
                    processed = sdk.processSmartLevel(
                        channelData,
                        params?.targetLufs || -16,
                        params?.maxGainDb || 6,
                        params?.gateThresholdDb || -50
                    );
                    break;
                case 'tapeStabilizer':
                    processed = sdk.processTapeStabilizer(
                        channelData,
                        sampleRate,
                        params?.nominalFreq ?? 60.0,
                        params?.scanMin ?? 55.0,
                        params?.scanMax ?? 65.0,
                        params?.amount ?? 1.0
                    );
                    break;
                case 'spectralMatch':
                    if (analysisPtr) {
                        processed = sdk.processSpectralMatch(channelData, analysisPtr, params?.amount ?? 1.0);
                    } else {
                        processed = new Float32Array(channelData);
                    }
                    break;
                case 'echovanish':
                    processed = sdk.processEchoVanish(channelData, sampleRate, params?.amount ?? 1.0, params?.tailMs ?? 100);
                    break;
                default:
                    processed = new Float32Array(channelData);
            }
            
            newBuffer.copyToChannel(processed as any, i);
        }
    } finally {
        if (analysisPtr) {
            sdk.spectralMatchFree(analysisPtr);
        }
    }

    return newBuffer;
}

export async function analyzeBuffer(audioBuffer: AudioBuffer): Promise<AudioAnalysis> {
    const sdk = getProcessorSDK();
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    
    // Interleave
    const len = audioBuffer.length * numChannels;
    const interleaved = new Float32Array(len);
    
    if (numChannels === 1) {
        interleaved.set(audioBuffer.getChannelData(0));
    } else {
        const l = audioBuffer.getChannelData(0);
        const r = audioBuffer.getChannelData(1);
        for (let i = 0; i < audioBuffer.length; i++) {
            interleaved[i * 2] = l[i];
            interleaved[i * 2 + 1] = r[i];
        }
    }

    const res = sdk.analyzeAudio(interleaved, numChannels, sampleRate);
    
    return {
        loudness: {
            integrated: res[0],
            range: res[1],
            momentaryMax: res[12],
            shortTermMax: res[13],
        },
        dynamics: {
            truePeak: res[2],
            rms: res[3],
            crestFactor: res[4],
        },
        stereo: {
            correlation: res[5],
            width: res[6],
            balance: res[7],
        },
        spectral: {
            dcOffset: res[8],
            low: res[9],
            mid: res[10],
            high: res[11],
        }
    };
}