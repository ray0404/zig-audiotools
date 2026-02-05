# Sonic Forge - Agent Operational Guide

This document provides a comprehensive overview of the Sonic Forge codebase, architecture, and operational procedures for AI agents and developers.

## 1. Project Identity & Purpose

*   **Name:** Sonic Forge
*   **Description:** A professional-grade, local-first Progressive Web App (PWA) for audio mastering and processing. It bridges the gap between browser-based tools and desktop DAWs.
*   **Core Philosophy:**
    *   **Zero-Latency:** Real-time processing via AudioWorklets.
    *   **High Performance:** Heavy offline processing via Zig/WebAssembly.
    *   **Local-First:** All data remains on the user's device (IndexedDB); no server-side audio processing.
    *   **Privacy-Centric:** No cloud dependencies for core functionality.

## 2. Technical Stack

### Frontend & State
*   **Framework:** React 18 (Vite)
*   **Language:** TypeScript 5.x
*   **State Management:** Zustand (Store), `idb-keyval` (Persistence)
*   **Styling:** Tailwind CSS, `lucide-react` (Icons)
*   **Routing:** Custom hash-based routing (`usePanelRouting`).

### Audio Engine
*   **API:** Web Audio API (standardized-audio-context)
*   **Real-time DSP:** AudioWorklets (Pure JavaScript/TypeScript processors)
*   **Offline DSP:** Zig 0.13.0 compiled to WebAssembly (WASM)
*   **Threading:**
    *   **Main Thread:** UI, State, Audio Graph Orchestration.
    *   **Audio Thread:** Real-time processing (AudioWorklets).
    *   **Worker Thread:** Offline processing (WASM/Zig bridge).

### CLI Tool
*   **Framework:** Ink (React for CLI)
*   **Engine:** Puppeteer (Headless Chrome for audio context)
*   **Purpose:** Batch processing automation via terminal.

## 3. Architecture Overview

Sonic Forge follows a strict **Three-Layer Architecture**:

1.  **Intent Layer (UI & Store):**
    *   **Role:** Captures user actions and manages application state.
    *   **Key Files:** `src/store/useAudioStore.ts`, `src/components/**/*.tsx`
    *   **Behavior:** Updates the Zustand store, which triggers subscriptions to update the engine.

2.  **Orchestration Layer (Audio Engine):**
    *   **Role:** Translates state changes into Web Audio API calls.
    *   **Key Files:** `packages/sonic-core/src/mixer.ts`, `packages/sonic-core/src/core/track-strip.ts`, `packages/sonic-core/src/core/bus-strip.ts`
    *   **Behavior:** Manages `AudioContext`, `AudioNode` connections, and parameter automation (`setTargetAtTime`).

3.  **Processing Layer (DSP):**
    *   **Role:** The actual math modifying audio samples.
    *   **Key Files:** `packages/sonic-core/src/worklets/*.js` (Real-time), `packages/sonic-core/src/dsp/zig/*.zig` (Offline)
    *   **Behavior:** Runs in isolated threads (Audio or Worker) to prevent UI blocking.

## 4. Key Workflows & Features

### A. Real-time Effects Rack ("The Trinity Pattern")
Adding a new real-time effect requires three components:
1.  **Processor (DSP):** `packages/sonic-core/src/worklets/[name]-processor.js` (Extends `AudioWorkletProcessor`).
2.  **Node (Bridge):** `packages/sonic-core/src/worklets/[Name]Node.ts` (Extends `AudioWorkletNode`, handles parameter mapping).
3.  **UI (Component):** `src/components/rack/[Name]Unit.tsx` (React controls).

### B. Smart Processing (Zig/WASM)
High-performance offline processing for file repair and normalization.
*   **Source:** `packages/sonic-core/src/dsp/zig/main.zig`
*   **Build:** `npm run build:wasm` (Outputs to `public/wasm/dsp.wasm`)
*   **Bridge:** `packages/sonic-core/src/workers/offline-processor.worker.ts` loads WASM and manages memory (`alloc`/`free`).
*   **UI:** `src/components/layout/panels/BatchProcessMenu.tsx`
*   **Features:**
    *   **Loudness Normalization:** Target specific LUFS (e.g., -14).
    *   **Phase Rotation:** Recovers headroom by smearing transients.
    *   **De-Clipper:** Repairs digital clipping via cubic interpolation.
    *   **Spectral Denoise:** FFT-based noise reduction.
    *   **Mono Bass:** Sums low frequencies to mono below a cutoff (e.g., 120Hz).

### C. Multi-Track Mixer
*   Supports multiple audio tracks with individual Volume, Pan, Mute, and Solo.
*   Master Bus for global processing.
*   **Drag & Drop:** Reorder effects in the rack.

### D. Offline/Batch Workflow
The "Smart Processing" panel offers two modes:
1.  **Project Track Mode:** Destructively processes a track within the current project. Supports Undo/Redo.
2.  **External File Mode:** Upload -> Process -> Preview (Scrubbable) -> Download. Does not affect the project.

## 5. Development & Operations

### Prerequisites
*   Node.js 18+
*   Zig 0.13.0+ (Required for `build:wasm`)

### Commands
*   `npm run dev`: Start Vite development server.
*   `npm run build`: Build web application.
*   `npm run build:wasm`: Compile Zig DSP to WebAssembly.
*   `npm run build:cli`: Build CLI tool.
*   `npm test`: Run Vitest suite.

### File Structure Map
```
src/
├── audio/              # Core Audio Engine
│   ├── core/           # Track/Bus logic, Context management
│   ├── dsp/zig/        # Zig source code for offline processing
│   ├── workers/        # Web Workers & Client bridges
│   ├── worklets/       # AudioWorklet processors & Node wrappers
│   └── mixer.ts        # Main MixerEngine entry point
├── components/         # React UI
│   ├── layout/         # Workspace, Panels (Tools, Export)
│   ├── rack/           # Effect units, Rack container
│   └── mixer/          # Faders, Meters
├── store/              # Zustand state stores
├── utils/              # Helpers (WAV export, Logger)
└── main.tsx            # App Entry
```

## 6. Known Constraints & Notes
*   **AudioContext State:** Browsers require a user gesture to resume the AudioContext. The app handles this via the "Start" overlay.
*   **WASM Memory:** The Zig allocator is a `GeneralPurposeAllocator`. The worker bridge manually handles `alloc` and `free` to prevent leaks.
*   **Persistence:** Large audio files are stored in IndexedDB. Use `src/hooks/useProjectPersistence.ts` for managing saves.
*   **CLI:** The CLI relies on `puppeteer-core`. Ensure a compatible Chrome/Chromium binary is available if running outside standard environments.
