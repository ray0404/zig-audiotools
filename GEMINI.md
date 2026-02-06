# SonicPress - Project Context & Architecture

## 1. Project Overview

**SonicPress** is a professional-grade **Audio DSP Utility** and library, born from a strategic refactoring of the original SonicForge DAW. It transitions from a creative multi-track environment to a specialized workbench for high-performance mastering and restoration.

### Core Philosophy
*   **Performance:** All heavy mathematical lifting (FFT, Matrix Inversion, Resampling) is offloaded to **Zig**, compiled to **WebAssembly (WASM)**.
*   **A/B Precision:** The system is built around instant auditing, maintaining distinct memory buffers for the original source and the processed result.
*   **Hybrid Orchestration:** A single core logic package (`@sonic-core`) powers a React PWA, a headless terminal interface (TUI), and batch-processing automation.

## 2. Three-Layer Architecture

SonicPress follows a strict separation of concerns to respect thread boundaries and bridge high-level state with low-level memory.

### Layer 1: Intent Layer (UI & State)
*   **Context:** Browser Main Thread.
*   **Technology:** React 18, Tailwind CSS, Lucide Icons, Zustand.
*   **Role:** Captures user parameters (thresholds, sensitivities, frequency cutoffs) and visualizes waveform state.
*   **Key File:** `src/components/layout/SmartToolsWorkspace.tsx`.

### Layer 2: Orchestration Layer (Engine & SDK)
*   **Context:** Main Thread / Web Workers.
*   **Technology:** TypeScript, `@sonic-core/sdk.ts`.
*   **Role:** Manages the life-cycle of WASM memory. It handles the `alloc` -> `memcpy` -> `execute` -> `read` -> `free` workflow.
*   **Cross-Channel Handling:** coordinates tools that require stereo awareness (e.g., Mono Bass, DeBleed) by interleaving channels or passing dual pointers to WASM.
*   **Key File:** `src/services/Processor.ts`.

### Layer 3: Processing Layer (DSP Core)
*   **Context:** WASM Linear Memory / AudioWorklet Thread.
*   **Technology:** Zig 0.13.0.
*   **Role:** Freestanding mathematical manipulation of audio samples.
*   **Key File:** `packages/sonic-core/src/dsp/zig/main.zig` (The primary compilation entry point).

## 3. Technology Stack

*   **Frontend:** React 18 with Vite 5.
*   **DSP Core:** Zig 0.13.0 targeting `wasm32-freestanding`.
*   **Audio Pipeline:** Web Audio API via `standardized-audio-context`.
*   **CLI Infrastructure:** Ink (React-based terminal UI) and Puppeteer (Headless bridge).
*   **Storage:** `idb-keyval` for persistent local project and audio state.

## 4. Smart Processing Library (Zig/WASM)

The following professional-grade modules are currently integrated:

1.  **Plosive Guard:** Adaptive suppression of vocal pops. Uses 4th-order crossovers and flux-based rise detection to clamp down on explosive low-frequency energy.
2.  **Voice Isolate:** Spectral gating denoiser. Extracts Bark-scale energy features to infer a speech mask, effectively separating voice from noise.
3.  **PsychoDynamic EQ:** Dynamic tonal balance correction based on ISO 226 (Fletcher-Munson) equal-loudness contours. Automatically adjusts low and high shelves based on perceived volume.
4.  **Smart Level:** Intelligent gain management. Features a 300ms sliding window RMS detector with inertia-based smoothing to prevent pumping while maintaining target LUFS.
5.  **DeBleed Lite:** specialized dual-channel spill removal. Uses spectral subtraction between a target and a source (bleed reference) channel.
6.  **Tape Stabilizer:** Correction of mechanical pitch fluctuations (wow/flutter). Leverages the YIN algorithm for sub-sample pitch detection and high-precision Cubic Hermite Spline resampling.
7.  **Spectral Match:** High-precision frequency matching. Analyzes a reference profile and applies its fingerprint to a target using linear-phase convolution (overlap-add with 8192 FFT).
8.  **Echo Vanish:** Advanced dereverberation. Implements the Weighted Prediction Error (WPE) algorithm, using Gaussian elimination to solve for optimal reflection cancellation filters.
9.  **Loudness Normalization:** Standard-compliant gain adjustment (-14 to -23 LUFS) using K-weighted approximations.
10. **De-Clipper:** Restoration of digital clipping using Catmull-Rom spline interpolation between surviving samples.
11. **Phase Rotation:** Chain of all-pass filters designed to smooth transients and recover digital headroom.
12. **Mono Bass:** Linkwitz-Riley crossover utility that sums frequencies below a user-defined cutoff to mono.

## 5. Shared Math Utilities (`math_utils.zig`)

To ensure consistency and performance across all tools, the following primitives are centralized:
*   **FFT:** Iterative Cooley-Tukey implementation for spectral analysis and synthesis.
*   **Biquad:** Standard Transposed Direct Form II implementation for LPF, HPF, and Shelving filters.
*   **Complex Math:** Full suite of complex addition, subtraction, multiplication, and conjugate operations required for WPE and FFT.
*   **Interpolation:** High-fidelity Cubic Hermite and Catmull-Rom interpolators for resampling and restoration.
*   **Matrix Solver:** Partial pivoting Gaussian elimination solver for linear systems (used in Echo Vanish).

## 6. Development & Verification

The project includes Python-based Playwright scripts (`verification/`) to automate the UI auditing of new DSP modules, ensuring that controls are correctly mapped and visualizers are responding to processed signals.