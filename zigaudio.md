--- USER (ME) PROMPT ---

> I want to build a new PWA that essentially focuses on utilizing the zig "smart tools" processing within my SonicForge app, and focuses on processing audio, without necessarily the ful DAW environment. Can you analyze what all id need to keep (or would benefit from keeping) of/from my SonicForge project that would help accomplish building this new PWA faster, better, and more efficiently?

--- ASSISTANT ---

Here is the analysis of what you should keep, adapt, and discard to build this new tool efficiently.

### 1. The Core: Zig DSP (Keep 100%)

The file `packages/sonic-core/src/dsp/zig/main.zig` is the heart of your new app. You have five specific "Smart Tools" already implemented that define the product's value:

- **LUFS Normalizer:** `process_lufs_normalize`.
- **Phase Rotator:** `process_phase_rotation`.
- **De-Clipper:** `process_declip`.
- **Spectral De-noise:** `process_spectral_denoise`.
- **Mono Bass (Mono-Maker):** `process_mono_bass`.

**Action:**

- **Copy:** The entire `dsp/zig` folder including `math_utils.zig`.
- **Keep:** Your WASM compilation pipeline (likely a Makefile or npm script not fully visible, but implied by `public/wasm/dsp.wasm`).

### 2. Audio Engine Infrastructure (Keep & Adapt)

Since you don't need real-time mixing of multiple tracks, your engine changes from a "Playback Engine" to a "Rendering Engine."

- **`ContextManager.ts`:**

  - **Keep:** You still need to initialize `AudioContext` and load AudioWorklets.
  - **Why:** Even for a simple tool, you need the context to decode uploaded files (`decodeAudioData`) and play the "After" result.
- **`OfflineRenderer.ts`:**

  - **Keep & Refactor:** This is crucial. In a smart tool PWA, the user workflow is usually *Process Button -> Wait -> Result*. You should utilize the `OfflineAudioContext` logic here to apply your Zig effects faster than real-time.
- **`vite-worklet-provider.ts`:**

  - **Keep:** Essential for loading your processor modules into the browser's audio thread.

### 3. File Handling & Export (Keep)

A processor tool is useless if you can't get files in and out.

- **`wav-export.ts` & `TranscoderService.ts`:**

  - **Keep:** These handle the logic of taking an AudioBuffer and turning it back into a `.wav` or transcoded file. This is your "Download" button logic.
- **`ProjectLoader.ts` (Partial):**

  - **Adapt:** You don't need to load a full project JSON, but you do need the `decodeAudioData` logic to handle user file drops.

### 4. UI Components (Pick & Choose)

You can discard the complex `MixerView` and `TrackStrip` components. Focus on "Visualization" and "Parameters."

- **`ResponsiveCanvas.tsx`:**

  - **Keep:** Essential. A smart tool needs to show the "Before" and "After" waveforms. This component seems to handle the drawing context.
- **`Knob.tsx`:**

  - **Keep:** Reuse this for the specific controls of your smart tools (e.g., "Target LUFS" knob, "Crossover Freq" knob).
- **`TransportDisplay.tsx`:**

  - **Simplify:** You just need Play/Pause/Stop and a time counter for previewing the result.

### 5. Build Configuration (Critical to Keep)

Because you are using WASM and likely `SharedArrayBuffer` for high-performance audio processing, you **must** keep the specific server headers in your Vite config.

- **`vite.config.ts`:**

  - **MUST KEEP:**

    ```TypeScript

    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    ```
  - **Keep:** The `VitePWA` plugin configuration. This already handles the caching, manifest generation, and service worker registration required for an installable app.

### 6. The "Glue" Logic (The Missing Link)

One thing to note: The `main.zig` file exports functions like `process_declip(ptr: [*]f32, len: usize)`. This implies a "destructive" offline process on a memory buffer.

- **You need to build a new Service/Hook:**
  The existing `MixerEngine` is designed for real-time graph processing. For this new PWA, you should create a `ProcessorService`.

  - **Workflow:**

    1. User uploads file -> Decode to `AudioBuffer`.
    2. Send `AudioBuffer` channel data to WASM memory (using `alloc` from and `free` from).
    3. Call `process_declip` (or others) directly on that memory.
    4. Retrieve the processed float array and create a *new* `AudioBuffer`.
    5. Play the new buffer.

### Architecture Comparison

| Feature | Old SonicForge (DAW) | New PWA (Smart Tools) |
| --- | --- | --- |
| **State Management** | Complex `useAudioStore` with Tracks/Racks | Simple Store: `SourceBuffer`, `ProcessedBuffer`, `ToolSettings`. |
| **Processing Engine** | Real-time Web Audio Graph Nodes | **Direct WASM Memory Manipulation** (faster/simpler). |
| **Playback** | Scheduled nodes (`start(time)`) | Simple `BufferSourceNode` loop. |
| **UI** | Mixer, Timeline, Rack | **Waveform Compare View** (Top/Bottom) + Tool Sidebar. |

--- USER (ME) PROMPT ---

> What if I want this project to have a CLI/TUI component, as well as being usable programmatically via code?

--- ASSISTANT ---

This is a fantastic pivot. By targeting a CLI/TUI and a programmatic SDK alongside the PWA, you are effectively building an **"Audio Processing Engine"** rather than just an app.

Because your "Smart Tools" (Zig) are algorithmic and mathematical (operating on data buffers) rather than dependent on browser DOM APIs, you can achieve this **without** the heavy Puppeteer "Headless Bridge" you were using before.

Here is the architectural blueprint to make your project a **Library (SDK)**, a **CLI Tool**, and a **PWA** simultaneously, sharing 90% of the code.

---

### 1. The Architecture: "Core First"

Instead of the CLI talking to a Headless Browser, both the CLI and the PWA will talk to a shared **Isomorphic Core Library**.

```
graph TD
    A[Zig DSP (.wasm)] --> B[Core SDK (@sonic/core)]
    B --> C{Platform Adapter}
    C -->|Node.js| D[CLI / TUI]
    C -->|Browser| E[PWA / React]
    
    D --> F[User Terminal]
    E --> G[Web Interface]
    D --> H[Programmatic API (Node Scripts)]
```

### 2. What to Keep, Refactor, & Discard

#### **A. The Core SDK (`packages/sonic-core`) - HEAVILY REFACTOR**

You need to convert your core from "Web Audio Graph Manager" to "Direct Data Processor."

- **Keep:** All `main.zig` code.
- **Create:** `WasmHost.ts`. This class loads the `.wasm` file.

  - *Challenge:* In the browser, you `fetch('dsp.wasm')`. In Node, you `fs.readFileSync('dsp.wasm')`.
  - *Solution:* Use an "Environment Injector" pattern where the consumer passes the WASM binary or loader function to the SDK.
- **Create:** `AudioProcessor.ts`.

  - This replaces your `MixerEngine`.
  - It contains methods like `normalize(audioBuffer: Float32Array, targetLufs: number)`.
  - It handles the `alloc` -> `copy` -> `process` -> `retrieve` -> `free` memory dance with Zig.

#### **B. The CLI (`cli/`) - ADAPT**

You can keep your Ink UI, but change the engine underneath.

- **Keep:** `cli/ui/*`. The React-based Ink TUI is excellent. Keep `TerminalApp.tsx`, `RackView.tsx`, etc.
- **Discard:** `audio-bridge.ts` (The Puppeteer implementation). You don't need Chrome to run Zig math!
- **New Dependency:** You need a way to decode audio in Node.js (browsers do this natively).

  - Install `audio-decode` (for reading mp3/wav to buffer).
  - Install `wav-encoder` (for saving the result).
- **Refactor:** Change `TerminalApp.tsx` props. Instead of taking `bridge: AudioBridge`, it should take `processor: SonicSDK`.

#### **C. The PWA (`src/`) - KEEP**

- **Keep:** Your `ResponsiveCanvas` and visualization logic.
- **Refactor:** Instead of `OfflineAudioContext`, the PWA will use the same `SonicSDK` methods as the CLI, passing `AudioBuffer.getChannelData(0)` directly to it.

---

### 3. Implementation Blueprint

#### Step 1: define the Programmatic Interface (The SDK)

This is how users (and your CLI) will use your code programmatically.

```TypeScript

// packages/sonic-core/src/sdk.ts

export class SonicForgeSDK {
  private wasmInstance: WebAssembly.Instance | null = null;
  private memory: WebAssembly.Memory | null = null;

  constructor(private wasmBinary: ArrayBuffer) {}

  async init() {
    const module = await WebAssembly.compile(this.wasmBinary);
    this.wasmInstance = await WebAssembly.instantiate(module, {
      env: { 
        // Zig sometimes needs these, or you can stub them
        print: (ptr: number, len: number) => console.log(/*...read string...*/), 
      }
    });
    this.memory = this.wasmInstance.exports.memory as WebAssembly.Memory;
  }

  // The Programmatic API
  processDeclip(channelData: Float32Array): Float32Array {
    const { alloc, free, process_declip } = this.wasmInstance!.exports as any;
    
    // 1. Allocate memory in WASM
    const byteSize = channelData.length * 4;
    const ptr = alloc(channelData.length);
    
    // 2. Copy data to WASM
    const wasmSlice = new Float32Array(this.memory!.buffer, ptr, channelData.length);
    wasmSlice.set(channelData);

    // 3. Process
    process_declip(ptr, channelData.length);

    // 4. Copy back
    const result = new Float32Array(wasmSlice); // Copy to new array
    
    // 5. Cleanup
    free(ptr, channelData.length);
    
    return result;
  }
}
```

#### Step 2: The CLI Entry Point (Node.js)

`cli/index.ts` becomes a true Node.js application, not a browser puppet.

```TypeScript

// cli/index.ts
import fs from 'fs';
import path from 'path';
import decode from 'audio-decode';
import encode from 'wav-encoder';
import { SonicForgeSDK } from '@sonic-core/sdk';
import { runTUI } from './ui';

// 1. Load WASM from disk (Node specific)
const wasmPath = path.join(__dirname, '../wasm/dsp.wasm');
const wasmBuffer = fs.readFileSync(wasmPath);

// 2. Init SDK
const sdk = new SonicForgeSDK(wasmBuffer);
await sdk.init();

// 3. Programmatic Usage Example (or launch TUI)
if (process.argv.includes('--tui')) {
    runTUI(sdk); // Pass SDK to your Ink App
} else {
    // CLI Mode
    const inputFile = process.argv[2];
    const buffer = fs.readFileSync(inputFile);
    const audio = await decode(buffer); // Get AudioBuffer
    
    const processedChannel = sdk.processDeclip(audio.getChannelData(0));
    
    // Save to WAV
    const wavBuffer = await encode({
        sampleRate: audio.sampleRate,
        channelData: [processedChannel]
    });
    fs.writeFileSync('output.wav', Buffer.from(wavBuffer));
}
```

#### Step 3: The PWA Entry Point (Browser)

`src/services/Processor.ts` adapts the browser environment to the SDK.

```TypeScript

// src/services/Processor.ts
import { SonicForgeSDK } from '@sonic-core/sdk';

let sdk: SonicForgeSDK;

export async function initProcessor() {
    // 1. Load WASM via Fetch (Browser specific)
    const response = await fetch('/wasm/dsp.wasm');
    const bytes = await response.arrayBuffer();
    
    sdk = new SonicForgeSDK(bytes);
    await sdk.init();
}

export function processBrowserAudio(audioBuffer: AudioBuffer) {
    const channelData = audioBuffer.getChannelData(0);
    const processed = sdk.processDeclip(channelData);
    
    // Reconstruct AudioBuffer to play it
    const newBuffer = new AudioBuffer({
        length: processed.length, 
        sampleRate: audioBuffer.sampleRate
    });
    newBuffer.copyToChannel(processed, 0);
    return newBuffer;
}
```

### Summary of Benefits

1. **True "Programmatic" Usage:** Developers can `npm install @sonicforge/sdk` and use your Zig algorithms in their own Node.js backends without running a browser.
2. **Performance:** The CLI runs natively on V8/Node. No overhead of spinning up a headless Chromium instance just to run math.
3. **Code Reuse:** `packages/sonic-core` becomes the single source of truth. The CLI and PWA are just thin wrappers (Views) around that core.
