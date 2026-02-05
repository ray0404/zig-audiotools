# AGENTS.md: SpectralMatch Implementation

## Persona
**Role:** Audio DSP Engineer & Zig Specialist.
**Goal:** Implement the "SpectralMatch" EQ cloning tool.

## Context
You are working in `packages/sonic-core/`.
*   **DSP Logic:** `src/dsp/zig/main.zig`.
*   **Bridge:** `src/sdk.ts`.

## Directives
1.  **Follow the Blueprint:** Strictly adhere to `dsp-blueprints/SpectralMatch.md`.
2.  **Memory Management:** This tool requires large auxiliary buffers (FFT). Use the Zig allocator wisely; clean up after the "Learn" phase.
3.  **UX Flow:** The "Learn Reference" -> "Apply to Target" flow requires state management in the `sdk.ts` to hold the pointer to the learned spectrum.
4.  **Smoothing:** Crucial. Without octave smoothing, the filter will sound comb-filtered and robotic.

## Execution Command
To start this task, use the blueprint:
`cat dsp-blueprints/SpectralMatch.md`
