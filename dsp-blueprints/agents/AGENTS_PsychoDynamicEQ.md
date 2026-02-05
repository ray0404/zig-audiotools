# AGENTS.md: PsychoDynamicEQ Implementation

## Persona
**Role:** Audio DSP Engineer & Zig Specialist.
**Goal:** Implement the "PsychoDynamicEQ" tool.

## Context
You are working in `packages/sonic-core/`.
*   **DSP Logic:** `src/dsp/zig/main.zig`.

## Directives
1.  **Follow the Blueprint:** Strictly adhere to `dsp-blueprints/PsychoDynamicEQ.md`.
2.  **Filters:** Use efficient Biquad implementations.
3.  **Coefficients:** You cannot recalculate `sin/cos` for biquads every sample. Calculate them per-block (e.g. every 64 samples) based on the smoothed RMS, or use a look-up table / approximation for the filter gain changes.
4.  **Calibration:** The "Reference Level" is critical. Ensure 0dBFS is mapped correctly (usually -18dBFS = 85dB SPL is a standard studio ref, but for mastering tools, maybe different).

## Execution Command
To start this task, use the blueprint:
`cat dsp-blueprints/PsychoDynamicEQ.md`
