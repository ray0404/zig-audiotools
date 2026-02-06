# SonicPress

**SonicPress** is a high-performance, local-first audio processing utility and library designed for professional-grade mastering and restoration. It leverages **Zig** and **WebAssembly (WASM)** to deliver near-native DSP performance directly in modern web browsers or via a headless terminal interface.

## 🚀 Overview

SonicPress represents a strategic pivot from creative multi-track environments to precision-focused audio utilities. Born from the refactoring of the SonicForge project, it focuses on "Smart Tools"—specialized, algorithmic processors that handle complex restoration and mastering tasks with mathematical accuracy.

### Key Features
*   **High-Fidelity Smart Tools:** A growing suite of sophisticated DSP algorithms including De-clipping, Spectral Denoising, and AI-driven Voice Isolation.
*   **Near-Native Performance:** CPU-intensive operations (FFT, Matrix Solving, Spline Interpolation) are handled by highly optimized Zig code compiled to WASM.
*   **Sample-Accurate A/B Auditing:** The engine maintains isolated source and processed buffers, allowing for instantaneous, click-free toggling between states to audit changes.
*   **Privacy-First / Local-First:** All processing is executed on the user's local machine using client-side WASM. No audio data ever leaves the system.
*   **Hybrid Headless Engine:** Powered by a unified core library (`@sonic-core`) that runs in React PWAs, Ink-based TUIs, and Puppeteer-driven headless environments.

## 🛠 Smart Tools Library

SonicPress currently features a professional-grade processing rack:

*   **Plosive Guard:** An adaptive low-band attenuation tool that detects and suppresses "pops" and plosives using flux-based energy rise detection and 4th-order Linkwitz-Riley crossovers.
*   **Voice Isolate:** A spectral gating denoiser designed to separate voice from background noise using Bark-scale energy analysis and mask inference.
*   **PsychoDynamic EQ:** A dynamic equalizer that applies frequency-dependent gain based on the Fletcher-Munson (ISO 226) curves, maintaining perceived tonal balance across varying volume levels.
*   **Smart Level:** An intelligent gain management utility featuring sliding-window RMS detection, look-ahead smoothing (inertia), and silence-aware gain freezing.
*   **DeBleed Lite:** A specialized dual-channel tool that uses spectral subtraction to remove "spill" or bleed from a source channel (e.g., click track bleed in a vocal mic).
*   **Tape Stabilizer:** A restoration tool that corrects pitch fluctuations (wow and flutter) using YIN-based pitch detection and high-precision Cubic Hermite Spline resampling.
*   **Spectral Match:** A high-precision EQ matching tool that analyzes a reference audio profile and applies its spectral fingerprint to a target using linear-phase convolution.
*   **Echo Vanish:** A sophisticated dereverberation tool leveraging the Weighted Prediction Error (WPE) algorithm and Gaussian elimination to suppress late reflections.
*   **Loudness Normalization:** Automated gain adjustment to meet streaming standards (e.g., -14 LUFS) using K-weighted RMS approximations.
*   **De-Clipper:** Restoration of clipped or squared-off peaks using Catmull-Rom spline interpolation.
*   **Phase Rotation:** Headroom recovery via a chain of all-pass filters, reducing peak amplitude without changing perceived volume.
*   **Mono Bass:** Low-frequency sum-to-mono utility to ensure low-end compatibility for vinyl and large-scale sound systems.

## 📦 Getting Started

### Prerequisites
*   **Node.js 18+**: For the frontend and CLI orchestrator.
*   **Zig 0.13.0**: Required for compiling the DSP source code in `packages/sonic-core/src/dsp/zig`.

### Installation
```bash
# Clone the repository
git clone https://github.com/ray0404/zig-audiotools.git
cd zig-audiotools

# Install dependencies
npm install
```

### Building the Engine
To rebuild the WASM processing core after making changes to Zig source:
```bash
npm run build:wasm
```

### Running the Application
Start the interactive web workspace:
```bash
npm run dev
```

### CLI & Headless Usage
SonicPress can be run entirely in the terminal for batch processing or remote automation:
```bash
# Start the TUI with the headless browser bridge
npm run dev:cli -- --headless
```

## 🏗 Architecture

The project follows a **Three-Layer Architecture** to bridge high-level UI state with low-level memory management:

1.  **Intent Layer (React/TypeScript)**: Captures user parameters and visualizes the audio state.
2.  **Orchestration Layer (@sonic-core)**: Manages the life-cycle of WASM memory, including buffer allocation, `memcpy` operations, and cross-thread coordination.
3.  **Processing Layer (Zig/WASM)**: Executes the actual DSP math in a high-performance, freestanding environment.

## 📜 License

This project is private and for internal use.