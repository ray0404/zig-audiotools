# Sonic Forge - Project Context

## 1. Project Overview

**Sonic Forge** is a high-performance, local-first Progressive Web App (PWA) designed for professional audio mastering and processing. It bridges the gap between browser-based tools and desktop Digital Audio Workstations (DAWs) by leveraging cutting-edge web technologies like **AudioWorklets** for zero-latency real-time processing and **WebAssembly (via Zig)** for heavy-duty offline computation.

### Core Philosophy
*   **Zero-Latency:** The UI is decoupled from the audio engine. Real-time audio processing happens in the Audio Thread to prevent glitches.
*   **Local-First:** All audio data lives on the user's device. No audio is ever uploaded to a server for processing, ensuring privacy and speed.
*   **High Fidelity:** Supports high sample rates (up to 96kHz) and 32-bit floating-point processing.
*   **Resilient:** Autosaves state to IndexedDB, allowing users to close the tab and resume later without data loss.

## 2. Architecture

Sonic Forge follows a strict **Three-Layer Architecture** to respect Web Audio API thread boundaries and ensure UI responsiveness.

### Layer 1: Intent Layer (UI & State)
*   **Context:** Main Thread.
*   **Technology:** React 18, Zustand, Tailwind CSS.
*   **Role:** Manages the visual state and user intent. It does *not* touch audio buffers directly.
*   **Key Files:**
    *   `src/store/useAudioStore.ts`: The single source of truth for the project state (tracks, rack modules, parameters).
    *   `src/components/`: React components that visualize the state and dispatch actions.

### Layer 2: Orchestration Layer (Audio Engine)
*   **Context:** Main Thread.
*   **Technology:** TypeScript, `standardized-audio-context`.
*   **Role:** Subscribes to the Store and translates state changes into imperative Web Audio API calls. It manages the lifecycle of `AudioContext`, `AudioNodes`, and connections.
*   **Key Files:**
    *   `src/audio/mixer.ts`: The central engine singleton.
    *   `src/audio/core/track-strip.ts`: Manages the signal chain for a single track.
    *   `src/audio/core/context-manager.ts`: Handles AudioContext resume/suspend states.

### Layer 3: Processing Layer (DSP)
*   **Context:** Audio Thread (Real-time) & Worker Thread (Offline).
*   **Technology:** AudioWorklet (JS/TS), Zig (WASM).
*   **Role:** Performs the actual mathematical manipulation of audio samples.
*   **Key Files:**
    *   `src/audio/worklets/`: AudioWorkletProcessors for real-time effects (EQ, Compression).
    *   `src/audio/dsp/zig/`: Zig source code for offline processing algorithms.
    *   `src/audio/workers/`: Web Workers that host the WASM runtime for offline batch processing.

## 3. Technology Stack

*   **Frontend:** React 18, Vite 5
*   **Language:** TypeScript 5.x
*   **Styling:** Tailwind CSS, Lucide React (Icons)
*   **State Management:** Zustand
*   **Persistence:** `idb-keyval` (IndexedDB wrapper)
*   **Audio API:** Web Audio API, `standardized-audio-context`
*   **Offline DSP:** Zig 0.13.0 compiled to WebAssembly
*   **CLI:** Ink, Puppeteer (for headless operation)
*   **Testing:** Vitest

## 4. Smart Processing (Zig/WASM)

A distinct feature of Sonic Forge is its "Smart Tools" panel, which utilizes a compiled WebAssembly module for CPU-intensive offline processing tasks.

*   **Source Code:** `src/audio/dsp/zig/main.zig`
*   **Compiled Binary:** `public/wasm/dsp.wasm`
*   **Bridge:** `src/audio/workers/offline-processor.worker.ts` handles the communication between the Main Thread and the WASM memory linear memory.

### Supported Processors
1.  **Loudness Normalization:** Analysis and gain adjustment to meet specific LUFS targets (e.g., -14 LUFS for streaming).
2.  **Phase Rotation:** Uses a chain of all-pass filters to smear transients and reduce peak amplitude without affecting perceived loudness (headroom recovery).
3.  **De-Clipper:** Restores clipped peaks using cubic Hermite spline interpolation.
4.  **Adaptive Spectral Denoise:** Performs FFT analysis to identify and subtract steady-state noise profiles.
5.  **Mono Bass:** Uses a Linkwitz-Riley crossover to sum frequencies below a specific cutoff (e.g., 120Hz) to mono, ensuring phase compatibility for vinyl and club systems.

### Workflow Modes
The `BatchProcessMenu` component (`src/components/layout/panels/BatchProcessMenu.tsx`) supports two workflows:
*   **Project Track Mode:** Modifies the source audio of a track currently loaded in the DAW. Features a history stack for Undo/Redo.
*   **External File Mode:** Operates as a standalone tool. Users upload a file, process it, preview the result on a scrubbable timeline, and download it as a WAV file without importing it into the main project.

## 5. Directory Structure

```
/
├── cli/                    # Headless CLI implementation (Ink/Puppeteer)
├── public/
│   └── wasm/               # Compiled DSP binaries (dsp.wasm)
├── src/
│   ├── audio/              # Core Audio Logic
│   │   ├── core/           # TrackStrip, BusStrip, NodeFactory
│   │   ├── dsp/zig/        # Zig Source Code
│   │   ├── workers/        # OfflineProcessorWorker & Client
│   │   ├── worklets/       # Real-time AudioWorklet Processors
│   │   └── mixer.ts        # Main Engine Entry Point
│   ├── components/
│   │   ├── layout/         # App Shell, Panels (Smart Tools, Export)
│   │   ├── mixer/          # Mixer View (Faders)
│   │   └── rack/           # Effect Rack & Module UIs
│   ├── hooks/              # Custom Hooks (useProjectPersistence)
│   ├── store/              # Zustand Stores (useAudioStore)
│   └── main.tsx            # Application Entry
├── package.json
└── vite.config.ts
```

## 6. Development Conventions

### The "Trinity Pattern"
To add a new real-time audio effect, you must implement three distinct parts:
1.  **DSP Processor:** `src/audio/worklets/[name]-processor.js`. This runs in the Audio Thread and extends `AudioWorkletProcessor`.
2.  **Audio Node:** `src/audio/worklets/[Name]Node.ts`. This runs in the Main Thread, extends `AudioWorkletNode`, and provides a typed interface for parameters.
3.  **UI Component:** `src/components/rack/[Name]Unit.tsx`. A React component that renders the knobs/meters and updates the store.

### Zig/WASM Workflow
To add a new offline processor:
1.  **Implement in Zig:** Add the function to `src/audio/dsp/zig/main.zig` and export it (`export fn`).
2.  **Update Worker:** Add a handler in `src/audio/workers/offline-processor.worker.ts` to call the WASM function.
3.  **Update Client:** Add a typed method to `src/audio/workers/OfflineProcessorClient.ts`.
4.  **Update UI:** Add a button/control in `src/components/layout/panels/BatchProcessMenu.tsx`.

## 7. Building and Running

### Prerequisites
*   Node.js 18+
*   Zig 0.13.0+ (Required for `npm run build:wasm`)

### Commands
*   **`npm run dev`**: Start the Vite development server.
*   **`npm run build`**: Build the web application for production.
*   **`npm run build:wasm`**: Compile the Zig source code into `public/wasm/dsp.wasm`. **Must be run after any changes to `.zig` files.**
*   **`npm run build:cli`**: Build the headless CLI tool.
*   **`npm test`**: Run the Vitest test suite.

## 8. State Management & Persistence

*   **Store:** `useAudioStore` manages the application state. It does not store heavy binary data (audio buffers).
*   **Binary Data:** AudioBuffers are stored in the `AudioContext` and managed by the `MixerEngine`.
*   **Persistence:** `useProjectPersistence` hook subscribes to store changes.
    *   Metadata (tracks, settings) is saved to `current_project_meta` in IndexedDB.
    *   Binary Audio (blobs) are saved to `track_[id]_source` keys in IndexedDB.
    *   On load, the store is hydrated first, followed by asynchronous loading of audio blobs.

## 9. CLI Tool

The CLI (`cli/index.ts`) allows running Sonic Forge in a headless environment (e.g., CI/CD pipelines).
*   It launches a headless Chrome instance via Puppeteer.
*   It loads the engine context (`dist/headless.html`).
*   It bridges commands from the terminal (Node.js) to the browser context to perform rendering or analysis.
