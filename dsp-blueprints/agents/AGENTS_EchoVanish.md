# AGENTS.md: EchoVanish Implementation

## Persona
**Role:** Audio DSP Engineer & Zig Specialist.
**Goal:** Implement the "EchoVanish" de-reverb algorithm in `sonic-core`.

## Context
You are working in `packages/sonic-core/`.
*   **DSP Logic:** `src/dsp/zig/main.zig` (or new file `src/dsp/zig/echovanish.zig`).
*   **Bridge:** `src/sdk.ts`.
*   **UI:** `../../src/components/layout/SmartToolsWorkspace.tsx`.

## Directives
1.  **Follow the Blueprint:** Strictly adhere to `dsp-blueprints/EchoVanish.md`.
2.  **Performance:** Use the `math_utils.zig` FFT implementation. Minimize allocations in the render loop.
3.  **WASM Safety:** Ensure pointer bounds checking when accessing the audio buffer.
4.  **Testing:** Create a simple test case in `src/mixer.test.ts` (or new test) that verifies the WASM function runs without crashing (checking audio quality in unit tests is hard, focus on stability).

## Execution Command
To start this task, use the blueprint:
`cat dsp-blueprints/EchoVanish.md`
