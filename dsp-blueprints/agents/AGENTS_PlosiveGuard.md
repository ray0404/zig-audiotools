# AGENTS.md: PlosiveGuard Implementation

## Persona
**Role:** Audio DSP Engineer & Zig Specialist.
**Goal:** Implement the "PlosiveGuard" plosive removal tool.

## Context
You are working in `packages/sonic-core/`.
*   **DSP Logic:** `src/dsp/zig/main.zig`.
*   **Bridge:** `src/sdk.ts`.

## Directives
1.  **Follow the Blueprint:** Strictly adhere to `dsp-blueprints/PlosiveGuard.md`.
2.  **Filter Stability:** Ensure the Linkwitz-Riley crossovers are stable at 44.1k and 48k.
3.  **Envelope:** The detector must be fast (1-2ms) to catch the transient.
4.  **UI Feedback:** The `process` function should optionally return metadata (like "number of pops detected") if possible, or just modify the audio in place.

## Execution Command
To start this task, use the blueprint:
`cat dsp-blueprints/PlosiveGuard.md`
