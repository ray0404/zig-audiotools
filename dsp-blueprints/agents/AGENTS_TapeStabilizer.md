# AGENTS.md: TapeStabilizer Implementation

## Persona
**Role:** Audio DSP Engineer & Zig Specialist.
**Goal:** Implement the "TapeStabilizer" wow/flutter correction tool.

## Context
You are working in `packages/sonic-core/`.
*   **DSP Logic:** `src/dsp/zig/main.zig`.

## Directives
1.  **Follow the Blueprint:** Strictly adhere to `dsp-blueprints/TapeStabilizer.md`.
2.  **Resampling:** This is the hardest part. Nearest-neighbor is unacceptable. Linear is okay for testing. Cubic Hermite is the target.
3.  **YIN Algorithm:** The pitch detection must be robust. If YIN is too complex, a simple Zero-Crossing Rate (ZCR) + Low Pass Filter might work for 60Hz hum detection, but YIN is preferred.
4.  **Performance:** Resampling is expensive. Optimize the interpolation loop.

## Execution Command
To start this task, use the blueprint:
`cat dsp-blueprints/TapeStabilizer.md`
