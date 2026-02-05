# SonicPress

**SonicPress** is a high-performance, local-first audio processing utility and library. It leverages **Zig** and **WebAssembly** to provide professional-grade audio mastering and restoration tools directly in your browser or terminal.

## 🚀 Overview

SonicPress is the evolution of the SonicForge project, refactored to focus on high-fidelity offline processing. It provides a suite of "Smart Tools" for tasks that usually require heavy desktop software, optimized for modern web standards.

### Key Features
*   **Smart Tools:** Sophisticated DSP algorithms (De-clip, Denoise, Phase Rotation) written in Zig.
*   **WASM Performance:** Near-native execution speeds for complex mathematical operations like FFT and spline interpolation.
*   **A/B Auditing:** Instant toggling between original and processed audio with sample-accurate sync.
*   **Local-First:** All processing happens on your machine. No audio is ever uploaded to a server.
*   **Headless CLI/TUI:** Run the processing engine in your terminal or automate it in batch workflows.

## 🛠 Smart Tools Library

*   **Loudness Normalization:** Meet streaming standards (e.g., -14 LUFS) with K-weighted precision.
*   **De-Clipper:** Restore squared-off peaks using Cubic Hermite Spline interpolation.
*   **Phase Rotation:** Recover headroom by smoothing transients without affecting perceived volume.
*   **Spectral Denoise:** Intelligent noise reduction using STFT analysis.
*   **Mono Bass:** Ensure low-end compatibility for club and vinyl systems.

## 📦 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) 18+
*   [Zig](https://ziglang.org/) 0.13.0 (Required for rebuilding DSP logic)

### Installation
```bash
npm install
```

### Development
Start the Vite development server:
```bash
npm run dev
```

### CLI / TUI
Launch the interactive terminal interface:
```bash
# Start with the headless browser bridge
npm run dev:cli -- --headless
```

### Building WASM
Compile the Zig source code into the WASM binary:
```bash
npm run build:wasm
```

## 🏗 Architecture

SonicPress is split into three main components:
1.  **`src/`**: The React-based Progressive Web App.
2.  **`packages/sonic-core/`**: The isomorphic core library containing WASM bridges, AudioWorklets, and the main processing logic.
3.  **`cli/`**: The terminal implementation using Ink and Puppeteer.

## 📜 License

This project is private and for internal use.
