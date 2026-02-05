# SonicPress - Agent Instructions & Context

Welcome, Agent. This document provides the critical context needed to understand, maintain, and expand the **SonicPress** codebase.

## 1. Project Identity
*   **Name:** SonicPress (formerly SonicForge).
*   **Mission:** Provide specialized, high-performance audio DSP tools for the web and CLI.
*   **Core Logic:** Located in `packages/sonic-core/src/dsp/zig`.

## 2. Technical Map

### The "Smart Tools" Workspace
The main entry point for the user is `src/components/layout/SmartToolsWorkspace.tsx`.
*   It manages two buffers: `sourceBuffer` and `processedBuffer`.
*   When a tool runs, it calls `processAudioBuffer` from `src/services/Processor.ts`.
*   Playback switches between buffers seamlessly using the `playbackMode` state.

### The Zig Bridge
*   **Zig Source:** `packages/sonic-core/src/dsp/zig/main.zig`.
*   **TS SDK:** `packages/sonic-core/src/sdk.ts`.
*   **WASM Memory Workflow:** TS allocates memory in WASM -> copies data -> calls Zig function -> copies result out -> frees memory.

### CLI / Headless Engine
*   The CLI uses Puppeteer to "remote control" an instance of SonicPress.
*   The bridge is defined in `src/main-headless.tsx` and exposed via `window.__SONICFORGE_BRIDGE__` (legacy naming preserved in internal bridge objects for compatibility).

## 3. Key Conventions

### DSP Performance
*   Avoid large memory copies in tight loops.
*   Prefer **Interleaved Stereo** when passing data to Zig for tools that need to "see" both channels (like Mono Bass).
*   Always use `alloc` and `free` exported from WASM to prevent memory leaks in the linear memory space.

### UI / UX
*   Maintain the "Dark Mode" aesthetic using Tailwind's `slate-950` and `blue-600` primary colors.
*   Ensure all visualizers use the `ResponsiveCanvas` to properly handle high-DPI screens.

## 4. Troubleshooting & FAQ

*   **Audio doesn't play in CLI?** Check if Chromium is launched with `--autoplay-policy=no-user-gesture-required`.
*   **WASM binary not found?** Ensure `npm run build:wasm` was successful and the file exists in `public/wasm/dsp.wasm`.
*   **A/B comparison sounds the same?** Ensure `processedBuffer` was properly cloned from `sourceBuffer` before processing, otherwise you may be modifying the same object in memory.

## 5. Future Expansion
When adding a new tool:
1.  Add the algorithm to `main.zig`.
2.  Export the function using `export fn`.
3.  Add a wrapper in `sdk.ts`.
4.  Expose it in `Processor.ts`.
5.  Add a button to `SmartToolsWorkspace.tsx`.
