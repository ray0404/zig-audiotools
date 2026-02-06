# SonicPress - Agent Instructions & Context

Welcome, Agent. This document contains the definitive guide for understanding, maintaining, and extending the **SonicPress** ecosystem.

## 1. Project Mission & Identity
**SonicPress** is a precision audio restoration and mastering suite. It is not a DAW for creative arrangement, but rather a surgical workbench for algorithmic processing. The codebase is designed for extreme performance, leveraging Zig/WASM for heavy lifting while keeping the UI lightweight and reactive.

## 2. Technical Architecture

### A. The "A/B" Workspace (`src/components/layout/SmartToolsWorkspace.tsx`)
The primary UI maintains a dual-buffer state to ensure instantaneous comparison:
*   `sourceBuffer`: The immutable original audio file.
*   `processedBuffer`: The target for all destructive tool applications.

### B. The Native Engine (`cli/engine/native-engine.ts`)
The CLI uses a specialized engine for browser-less processing:
*   **Interleaved Logic**: The `NativeEngine` assumes interleaved Float32Array buffers for stereo processing.
*   **Module Mapping**: It maps `RackModule` types to either `SonicForgeSDK` (Zig/WASM) methods or `OfflineDSP` (JS/TS) functions.
*   **Export**: It uses the `encodeWAV` utility to save processed results to the filesystem.

### C. Offline Processors (`packages/sonic-core/src/core/offline-processors.ts`)
Standard JS-based processors (Compressor, Saturation, etc.) are implemented here as pure functions for use in environments where AudioWorklets are unavailable (like Node.js).
*   These functions should mimic the behavior of their Worklet counterparts exactly.
*   They must handle interleaved buffers correctly.

### D. Memory Management (Zig/WASM)
*   **Core Source**: `packages/sonic-core/src/dsp/zig/main.zig`
*   **Alloc/Free**: Always use the exported `alloc` and `free` functions from the WASM module. TypeScript is responsible for ensuring memory is cleaned up after every processing call.
*   **Safety**: Ensure pointers are validated before passing them to Zig functions.

## 3. Implementation Patterns for New Tools

When adding a new Smart Tool, follow this exact pipeline:

1.  **DSP Module**: Create a new `.zig` file in `packages/sonic-core/src/dsp/zig/`.
2.  **Integration**:
    *   Import it in `main.zig`.
    *   Add an `export fn` wrapper in `main.zig`.
3.  **SDK Wrapper**: Add a corresponding method to the `SonicForgeSDK` class in `packages/sonic-core/src/sdk.ts`.
4.  **Engine Mapping**: 
    *   Add the new type to `RackModuleType` in `types.ts`.
    *   Add a descriptor in `module-descriptors.ts`.
    *   Implement the switch case in `NativeEngine.applyRack` and the browser `Processor.ts`.

## 4. Key Conventions & Best Practices

### ESM Compatibility (CRITICAL)
The project uses `NodeNext` for CLI compilation. **All relative imports in shared packages MUST include the `.js` extension.**
*   *Bad*: `import { types } from "./types"`
*   *Good*: `import { types } from "./types.js"`

### Type Safety
*   Avoid `any` where possible, except when bridging between Node-specific `Buffer` and browser-specific `ArrayBuffer` where type overlaps are problematic.
*   Use `Float32Array` as the primary exchange format for audio data.

### Performance
*   **Loop Unrolling**: In Zig, prefer explicit loops that can be vectorized by the compiler.
*   **Memory Growth**: Access `wasmInstance.exports.memory.buffer` immediately before reading/writing data, as `alloc` calls may trigger memory growth, invalidating existing `ArrayBuffer` views.
