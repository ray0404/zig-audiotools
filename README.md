# SonicPress

**SonicPress** is a high-performance, local-first audio processing utility and library designed for professional-grade mastering and restoration. It leverages **Zig** and **WebAssembly (WASM)** to deliver near-native DSP performance directly in modern web browsers and high-speed terminal environments.

## 🚀 Overview

SonicPress represents a strategic pivot from creative multi-track environments to precision-focused audio utilities. Born from the refactoring of the SonicForge project, it focuses on "Smart Tools"—specialized, algorithmic processors that handle complex restoration and mastering tasks with mathematical accuracy.

### Key Features
*   **High-Fidelity Smart Tools:** A growing suite of sophisticated DSP algorithms including De-clipping, Spectral Denoising, and Tape Stabilization.
*   **Browser-Less Native Engine:** A high-performance CLI implementation that runs purely in Node.js, executing Zig DSP without the overhead of a browser.
*   **Near-Native Performance:** CPU-intensive operations (FFT, Matrix Solving, Spline Interpolation) are handled by highly optimized Zig code.
*   **Sample-Accurate A/B Auditing:** The engine maintains isolated source and processed buffers, allowing for instantaneous toggling between states.
*   **Professional Export:** Full support for high-quality WAV export in both the web PWA and the terminal TUI.

## 🛠 Smart Tools & Processors

SonicPress features a hybrid processing rack combining Zig/WASM precision with versatile JS/TS offline processors:

### Zig-Powered Smart Tools (Precision Restoration)
*   **De-Clipper:** Restoration of clipped peaks using Catmull-Rom spline interpolation.
*   **Tape Stabilizer:** Correction of pitch fluctuations (wow/flutter) using YIN-based pitch detection.
*   **Spectral Denoise:** Adaptive noise reduction using STFT spectral subtraction.
*   **Plosive Guard:** Energy-based suppression of vocal "pops."
*   **Echo Vanish:** Dereverberation leveraging Weighted Prediction Error (WPE).
*   **Loudness Normalization:** Automated gain adjustment to streaming standards (-14 LUFS).
*   **Phase Rotation:** Headroom recovery via all-pass filter chains.
*   **Mono Bass:** Low-frequency sum-to-mono utility.

### Standard Offline Processors (Node.js & TUI)
*   **Compressor:** Modeled dynamics processing with VCA, FET, and Opto characteristics.
*   **Saturation:** Analog-modeled Tape, Tube, and Fuzz saturation.
*   **Parametric EQ:** Multi-band equalization with RBJ Biquad filters.
*   **BitCrusher:** Digital degradation with variable bit depth and sample rate reduction.

## 📦 Getting Started

### Prerequisites
*   **Node.js 18+**: For the frontend and CLI orchestrator.
*   **Zig 0.13.0**: Required for compiling the DSP source code.

### Installation
```bash
# Clone the repository
git clone https://github.com/ray0404/zig-audiotools.git
cd zig-audiotools

# Install dependencies
npm install
```

### Running the Application
**Web Workspace (PWA):**
```bash
npm run dev
```

**Terminal Interface (TUI):**
```bash
# Start the TUI using the high-performance Native Engine
npm run dev:cli
```

### Building for Production
```bash
# Build both the web assets and the CLI
npm run build:cli
```

## 🏗 Architecture

The project follows a **Three-Layer Architecture** to bridge high-level UI state with low-level memory management:

1.  **Intent Layer (React/Ink)**: Captures user parameters and visualizes the audio state in either the browser or terminal.
2.  **Orchestration Layer (@sonic-core)**: Manages the life-cycle of WASM memory and provides a unified engine interface for both web and native environments.
3.  **Processing Layer (Zig/WASM)**: Executes the actual DSP math in a high-performance, freestanding environment.

## 📜 Development Conventions

### ESM Compliance
The CLI engine utilizes Node.js ESM. All relative imports in shared packages **MUST** include the `.js` extension (e.g., `import { x } from './y.js'`).

### Local-First
SonicPress is strictly local-first. All processing happens on your machine. Your audio files are never uploaded to any server.

## 📜 License

This project is private and for internal use.
