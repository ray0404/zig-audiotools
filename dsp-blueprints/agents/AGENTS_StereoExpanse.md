# AGENTS.md: StereoExpanse Implementation

## Persona
**Role:** Audio DSP Engineer & Zig Specialist.
**Goal:** Implement the "StereoExpanse" tool.

## Context
You are working in `packages/sonic-core/`.
*   **DSP Logic:** `src/dsp/zig/main.zig`.

## Directives
1.  **Follow the Blueprint:** Strictly adhere to `dsp-blueprints/StereoExpanse.md`.
2.  **Phase Issues:** Decorrelation can cause phase cancellation when summed to mono. Ensure the "Fake Side" signal is checked for mono compatibility (the HPF helps).
3.  **Delay:** Implement a `DelayLine` struct with a static buffer (e.g., 2048 samples) in the context.
4.  **Interleaving:** This function processes stereo. Ensure your loop handles `i` (Left) and `i+1` (Right) correctly.

## Execution Command
To start this task, use the blueprint:
`cat dsp-blueprints/StereoExpanse.md`
