# SonicPress - Project Context & Architecture

## 1. Project Overview

**SonicPress** is a high-performance, specialized **Audio DSP Utility** and library, born from a refactoring of the original SonicForge DAW. It transitions from a multi-track creative environment to a precision-focused mastering and restoration suite centered around "Smart Tools."

These tools leverage **Zig** for high-performance DSP, compiled to **WebAssembly (WASM)**, providing near-native processing speeds directly in the browser or terminal.

### Core Philosophy
*   **Performance:** CPU-intensive tasks (FFT, Spline Interpolation, SIMD) are handled by Zig/WASM.
*   **Specialization:** Focuses on high-value mastering and restoration (De-clipping, LUFS Normalization, Spectral Denoising).
*   **A/B Precision:** Isolated buffer management for instant auditing of processed results vs. original source.
*   **Hybrid Native/Web:** A single core logic package (`@sonic-core`) that powers a React PWA, a headless browser-driven CLI, and a future native Node.js bridge.

## 2. Architecture

SonicPress follows a **Three-Layer Architecture** designed to respect thread boundaries and bridge high-level state with low-level WASM memory.

### Layer 1: Intent Layer (UI & State)
*   **Context:** Main Thread.
*   **Technology:** React 18, Tailwind CSS, Lucide Icons.
*   **Role:** Captures user intent and visualizes audio state.
*   **Key Files:**
    *   `src/components/layout/SmartToolsWorkspace.tsx`: The primary dashboard for audio processing and A/B comparison.
    *   `src/components/visualizers/ResponsiveCanvas.tsx`: High-performance waveform rendering with automatic resizing and DPI support.

### Layer 2: Orchestration Layer (Engine & SDK)
*   **Context:** Main Thread / Web Workers.
*   **Technology:** TypeScript, `@sonic-core`.
*   **Role:** Manages audio buffer lifecycles, WASM memory allocation, and the execution pipeline.
*   **Key Files:**
    *   `packages/sonic-core/src/sdk.ts`: The TypeScript bridge handling `alloc` -> `memcpy` -> `process` -> `free` workflows with WASM.
    *   `src/services/Processor.ts`: coordinates channel-by-channel processing and interleaving for stereo tools.
    *   `packages/sonic-core/src/mixer.ts`: Legacy engine preserved for future tool-chaining and complex routing.

### Layer 3: Processing Layer (DSP)
*   **Context:** WASM Linear Memory / AudioWorklet Thread.
*   **Technology:** Zig 0.13.0, AudioWorklet (JS).
*   **Role:** Performs mathematical manipulation of audio samples.
*   **Key Files:**
    *   `packages/sonic-core/src/dsp/zig/main.zig`: The source of all Smart Tools.
    *   `packages/sonic-core/src/worklets/`: Real-time processors for metering and basic effects.

## 3. Technology Stack

*   **Frontend:** React 18, Vite 5.
*   **Language:** TypeScript 5.x, Zig 0.13.0.
*   **State Management:** Zustand (TUI and Engine sync).
*   **Audio API:** Web Audio API via `standardized-audio-context`.
*   **CLI Infrastructure:** Ink (React-based TUI), Puppeteer (Headless Bridge).
*   **Persistence:** `idb-keyval` (IndexedDB) for local audio and project persistence.

## 4. Smart Processing Library (Zig/WASM)

Current professional-grade processors implemented in Zig:

1.  **Loudness Normalization:** RMS-based normalization with K-weighting approximation to target specific LUFS levels.
2.  **Phase Rotation:** Chain of all-pass filters designed to reduce peak amplitude and recover headroom.
3.  **De-Clipper:** Restoration of clipped peaks using **Cubic Hermite Spline (Catmull-Rom)** interpolation.
4.  **Adaptive Spectral Denoise:** STFT-based noise reduction using spectral subtraction.
5.  **Mono Bass:** Linkwitz-Riley 4th order crossover summing frequencies below a cutoff (e.g., 120Hz) to mono.

## 5. Development Conventions

### The "A/B Buffer Pattern"
In `SmartToolsWorkspace`, we maintain two distinct `AudioBuffer` objects:
*   `sourceBuffer`: The immutable original file.
*   `processedBuffer`: A cloned buffer destructively modified by tools.
This ensures that switching between "Source" and "Processed" is instantaneous and consistent.

### Stereo Handling
Zig DSP functions typically operate on a single memory pointer. Tools that are channel-agnostic are run per-channel. Tools that require channel interaction (like `monoBass`) require the JS/TS service to interleave the channels before processing and de-interleave them after.

## 6. CLI & Headless Bridge

SonicPress includes a CLI (`cli/index.ts`) that runs the engine in a headless environment.
*   **Headless Mode:** Launches Chromium via Puppeteer to access browser-only APIs like `decodeAudioData` and AudioWorklets.
*   **Native Mode (In-Progress):** A `NativeEngine` implementation intended to run purely in Node.js for algorithmic tasks.
*   **TUI:** A full-featured terminal UI built with Ink, allowing remote management of the DSP rack.

## 7. Future Roadmap

1.  **Tool Chaining:** Re-integrating the `MixerEngine` rack system into the Smart Tools UI to allow non-destructive tool chains.
2.  **Pure Native CLI:** Finishing the `NativeEngine` to remove the Chromium dependency for batch processing.
3.  **Visual Node Graph:** A node-based UI for complex audio routing and processing chains.
4.  **Expanded Restoration Suite:** Zig-based De-Esser, Transient Shaper, and Multiband Comp.
5.  **Programmatic SDK:** Publishing `@sonic-core` as a standalone npm package for third-party audio apps.
