# SonicPress - Agent Instructions & Context

Welcome, Agent. This document contains the definitive guide for understanding, maintaining, and extending the **SonicPress** ecosystem. 

## 1. Project Mission & Identity
**SonicPress** is a precision audio restoration and mastering suite. It is not a DAW for creative arrangement, but rather a surgical workbench for algorithmic processing. The codebase is designed for extreme performance, leveraging Zig/WASM for heavy lifting while keeping the UI lightweight and reactive.

## 2. Technical Architecture

### A. The "A/B" Workspace (`src/components/layout/SmartToolsWorkspace.tsx`)
The primary UI maintains a dual-buffer state to ensure instantaneous comparison:
*   `sourceBuffer`: The immutable original audio file.
*   `processedBuffer`: The target for all destructive tool applications.
*   **Workflow**: When a tool is triggered, it processes `processedBuffer` (or a clone of `sourceBuffer` if it's the first run) and updates the state. 
*   **Monitoring**: The `playbackMode` state ('source' | 'processed') determines which buffer is connected to the AudioContext destination during playback.

### B. The Orchestration Layer (`src/services/Processor.ts`)
This service acts as the dispatcher. It handles:
*   **Mono vs Stereo**: Some tools are channel-agnostic and run in a loop per-channel. Others (like `monoBass` or `debleed`) require cross-channel data.
*   **Dual-Pointer Logic**: Tools like `debleed` require passing two distinct pointers to WASM (target and source).
*   **Reference Buffers**: `spectralMatch` requires a separate `referenceBuffer` to analyze before processing the target.

### C. The Processing Layer (Zig/WASM)
*   **Core Source**: `packages/sonic-core/src/dsp/zig/main.zig`
*   **Shared Utils**: `math_utils.zig` contains optimized implementations of FFT, Biquad filters, and interpolators.
*   **Memory Management**: Always use the exported `alloc` and `free` functions. TypeScript is responsible for ensuring WASM memory is cleaned up after every processing call.

## 3. Implementation Patterns for New Tools

When adding a new Smart Tool, follow this exact pipeline:

1.  **DSP Module**: Create a new `.zig` file in `packages/sonic-core/src/dsp/zig/`.
2.  **Integration**:
    *   Import it in `main.zig`.
    *   If it exports its own functions (using `export fn`), add its import to the `comptime` block in `main.zig` to ensure the compiler doesn't strip it.
    *   If it needs a wrapper, define an `export fn` in `main.zig` that calls your module.
3.  **SDK Wrapper**: Add a corresponding method to the `SonicForgeSDK` class in `packages/sonic-core/src/sdk.ts`. Handle any multi-pointer or complex parameter logic here.
4.  **Processor Service**: Add the tool to the `tool` union type and implement the `switch` case in `src/services/Processor.ts`.
5.  **UI Component**: Add the control UI (Knobs, Toggles, Sliders) to the sidebar in `SmartToolsWorkspace.tsx`.

## 4. Key Conventions & Best Practices

### Performance
*   **SIMD**: Use `@Vector` in Zig for parallelizing gain applications and RMS calculations.
*   **FFT Windowing**: Always use Hanning or similar windows for STFT operations to avoid spectral leakage.
*   **Memory Growth**: In the TS SDK, always recreate views (e.g., `new Float32Array(this.memory.buffer, ...)`) immediately before reading/writing, as WASM memory growth can detach existing views.

### UI Consistency
*   **Color Palette**: Use `slate-950` for backgrounds, `slate-800` for borders, and `blue-600` for primary actions.
*   **Icons**: Use `lucide-react`. Standardize icons for similar tools (e.g., `Wand2` for restoration, `Settings2` for normalization).

## 5. Troubleshooting & Debugging

*   **WASM Collisions**: If you see "exported symbol collision," check if multiple files are using `export fn` with the same name, or if `main.zig` is re-exporting something already exported in a submodule.
*   **Silent Failures**: WASM panics often appear as generic "unreachable" errors in the browser console. Check the `print` bridge if you've added debug logs in Zig.
*   **Type Mismatches**: TypeScript may complain about `SharedArrayBuffer` vs `ArrayBuffer`. Use type casting (`as any`) when passing buffers to `copyToChannel` if needed, as Web Audio APIs can be strict.

## 6. Recent Updates (Feb 2026)
*   Integrated 8 new modules: Plosive Guard, Voice Isolate, PsychoDynamic EQ, Smart Level, DeBleed Lite, Tape Stabilizer, Spectral Match, and Echo Vanish.
*   Refactored `math_utils.zig` to centralize Biquad, FFT, and Resampling logic.
*   Enhanced `Processor.ts` to support dual-buffer inputs and reference analysis for matching tools.