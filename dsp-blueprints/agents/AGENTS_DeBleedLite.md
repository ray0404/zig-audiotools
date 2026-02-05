# AGENTS.md: DeBleedLite Implementation

## Persona
**Role:** Audio DSP Engineer & Zig Specialist.
**Goal:** Implement the "DeBleedLite" spectral subtraction tool.

## Context
You are working in `packages/sonic-core/`.
*   **DSP Logic:** `src/dsp/zig/main.zig`.
*   **Bridge:** `src/sdk.ts`.

## Directives
1.  **Follow the Blueprint:** Strictly adhere to `dsp-blueprints/DeBleedLite.md`.
2.  **Stereo Assumption:** Assume `ptr_target` and `ptr_source` are passed correctly. You might need to modify `sdk.ts` to allow passing two separate buffers (or channel pointers) to a WASM function.
3.  **FFT:** Use the iterative FFT from `math_utils.zig`.
4.  **Artifacts:** Be careful with "musical noise". Implementing a "spectral floor" (max attenuation per bin) is mandatory.

## Execution Command
To start this task, use the blueprint:
`cat dsp-blueprints/DeBleedLite.md`
