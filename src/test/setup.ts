import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Canvas getContext
HTMLCanvasElement.prototype.getContext = vi.fn();

// Global Web Audio API Mocks

// AudioWorkletNode
class AudioWorkletNodeMock {
  context: any;
  constructor(context: any) {
    this.context = context;
  }
  connect() {}
  disconnect() {}
  parameters = { 
    get: vi.fn(() => ({ 
      value: 0, 
      setTargetAtTime: vi.fn(),
      setValueAtTime: vi.fn()
    })) 
  };
  port = { postMessage: () => {}, onmessage: null };
}
vi.stubGlobal('AudioWorkletNode', AudioWorkletNodeMock);

// Mock Worker
class WorkerMock {
    onmessage = null;
    postMessage = vi.fn();
    terminate = vi.fn();
}
vi.stubGlobal('Worker', WorkerMock);

// AudioNode (often needed if extending)
class AudioNodeMock {
  connect() {}
  disconnect() {}
}
vi.stubGlobal('AudioNode', AudioNodeMock);

// AudioContext (Basic Mock)
// Individual tests can override this if they need specific return values
class AudioContextMock {
  state = 'suspended';
  resume = vi.fn();
  createGain = vi.fn(() => ({
    gain: { value: 0, setTargetAtTime: vi.fn(), setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  createAnalyser = vi.fn(() => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteFrequencyData: vi.fn(),
    getByteTimeDomainData: vi.fn(),
    getFloatTimeDomainData: vi.fn(),
  }));
  createStereoPanner = vi.fn(() => ({
    pan: { value: 0, setTargetAtTime: vi.fn(), setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  createConvolver = vi.fn(() => ({ 
      connect: vi.fn(), 
      disconnect: vi.fn() 
  }));
  createChannelSplitter = vi.fn((_channels) => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  createBufferSource = vi.fn(() => ({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      buffer: null,
      onended: null,
  }));
  decodeAudioData = vi.fn();
  audioWorklet = {
    addModule: vi.fn().mockResolvedValue(undefined),
  };
  destination = {};
  currentTime = 0;
}
vi.stubGlobal('AudioContext', AudioContextMock);
// Ensure we handle window.AudioContext for tests that run in "jsdom"
if (typeof window !== 'undefined') {
    vi.stubGlobal('window.AudioContext', AudioContextMock);
}

// Mock standardized-audio-context
vi.mock('standardized-audio-context', async () => {
    return {
        AudioContext: AudioContextMock,
        OfflineAudioContext: AudioContextMock, // reuse same mock for now
        AudioWorkletNode: AudioWorkletNodeMock,
        // Add other exports if needed
    };
});
