# SonicPress - Project Context & Architecture

## 1. Project Overview

**SonicPress** is a high-performance, specialized **Audio DSP Utility** and library, born from a refactoring of the original SonicForge DAW. It transitions from a multi-track creative environment to a precision-focused mastering and restoration suite centered around "Smart Tools."

These tools leverage **Zig** for high-performance DSP, compiled to **WebAssembly (WASM)**, providing near-native processing speeds directly in the browser or terminal.

### Core Philosophy
*   **Performance:** CPU-intensive tasks (FFT, Spline Interpolation, SIMD) are handled by Zig/WASM.
*   **Specialization:** Focuses on high-value mastering and restoration (De-clipping, LUFS Normalization, Spectral Denoising).
*   **A/B Precision:** Isolated buffer management for instant auditing of processed results vs. original source.
*   **Hybrid Native/Web:** A single core logic package (`@sonic-core`) that powers a React PWA and a high-performance, browser-less CLI.

## 2. Architecture

SonicPress follows a **Three-Layer Architecture** designed to respect thread boundaries and bridge high-level state with low-level WASM memory.

### Layer 1: Intent Layer (UI & State)
*   **Context:** Main Thread (Web) / Terminal (CLI).
*   **Technology:** React 18, Tailwind CSS, Lucide Icons, Ink (TUI).
*   **Role:** Captures user intent and visualizes audio state.

### Layer 2: Orchestration Layer (Engine & SDK)
*   **Context:** Main Thread / Web Workers / Node.js Process.
*   **Technology:** TypeScript, `@sonic-core`.
*   **Role:** Manages audio buffer lifecycles, WASM memory allocation, and the execution pipeline.
*   **Key Files:**
    *   `packages/sonic-core/src/sdk.ts`: The TypeScript bridge handling `alloc` -> `memcpy` -> `process` -> `free` workflows with WASM.
    *   `cli/engine/native-engine.ts`: A pure Node.js engine implementation that executes DSP without a browser dependency.
    *   `packages/sonic-core/src/core/offline-processors.ts`: Pure JS/TS implementations of standard audio effects for offline/TUI use.

### Layer 3: Processing Layer (DSP)
*   **Context:** WASM Linear Memory / AudioWorklet Thread.
*   **Technology:** Zig 0.13.0, AudioWorklet (JS).
*   **Role:** Performs mathematical manipulation of audio samples.
*   **Key Files:**
    *   `packages/sonic-core/src/dsp/zig/main.zig`: The source of all Smart Tools.

## 3. Technology Stack

*   **Frontend:** React 18, Vite 5.
*   **Language:** TypeScript 5.x, Zig 0.13.0.
*   **State Management:** Zustand (TUI and Engine sync).
*   **Audio API:** Web Audio API (Web) / `audio-decode` & `wav-export` (CLI).
*   **CLI Infrastructure:** Ink (React-based TUI), Node.js ESM.
*   **Persistence:** `idb-keyval` (IndexedDB) for local audio and project persistence.

## 4. Smart Processing Library (Zig/WASM)

Current professional-grade processors implemented in Zig:

1.  **Loudness Normalization:** RMS-based normalization with K-weighting approximation.
2.  **Phase Rotation:** Chain of all-pass filters designed to reduce peak amplitude.
3.  **De-Clipper:** Restoration of clipped peaks using Cubic Hermite Spline interpolation.
4.  **Adaptive Spectral Denoise:** STFT-based noise reduction using spectral subtraction.
5.  **Mono Bass:** Low-end summation to mono below a specified cutoff.
6.  **Plosive Guard:** Energy-based pop suppression.
7.  **Voice Isolate:** Spectral gating for noise removal.
8.  **Tape Stabilizer:** Wow/Flutter correction via YIN pitch detection.
9.  **Echo Vanish:** Dereverberation via WPE.

## 5. Development Conventions

### The "A/B Buffer Pattern"
In both the Web UI and CLI, we maintain distinct source and processed buffers to ensure instant auditing. In the CLI, the `NativeEngine` applies the rack destructively to a cloned buffer to maintain performance.

### Node.js ESM and Extensions
The project uses `NodeNext` module resolution for the CLI. All relative imports in shared packages (like `sonic-core`) **MUST** include the `.js` extension to ensure compatibility with Node's ESM loader.

## 6. CLI & Headless Bridge

SonicPress includes a powerful CLI (`cli/index.ts`) with two execution modes:
*   **Native Mode (Default):** Runs purely in Node.js using `NativeEngine`. It uses `audio-decode` for loading files and an internal `wav-export` utility for rendering.
*   **Headless Mode:** Launches Chromium via Puppeteer to access browser-only APIs. This is preserved as a legacy/fallback mode.
*   **Export:** The CLI supports high-quality WAV export of processed audio.

## 7. Future Roadmap

1.  **Pure Native CLI:** Complete removal of browser-only logic from the core processing path.
2.  **Visual Node Graph:** A node-based UI for complex audio routing.
3.  **Expanded Restoration Suite:** De-Esser and Transient Shaper porting to Zig.
4.  **Programmatic SDK:** Publishing `@sonic-core` as a standalone package.
