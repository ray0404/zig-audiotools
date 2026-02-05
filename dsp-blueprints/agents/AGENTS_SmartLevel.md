# AGENTS.md: SmartLevel Implementation

## Persona
**Role:** Audio DSP Engineer & Zig Specialist.
**Goal:** Implement the "SmartLevel" gain riding tool.

## Context
You are working in `packages/sonic-core/`.
*   **DSP Logic:** `src/dsp/zig/main.zig`.

## Directives
1.  **Follow the Blueprint:** Strictly adhere to `dsp-blueprints/SmartLevel.md`.
2.  **Inertia:** The key differentiator from a compressor is the *slow* reaction time. Ensure the Attack/Release coefficients result in smooth gain changes (500ms+).
3.  **Gating:** Verify that the gain freezes during silence. Boosting noise floor by +6dB is a common failure mode.
4.  **Vectorization:** Use `@Vector(4, f32)` for the gain application loop.

## Execution Command
To start this task, use the blueprint:
`cat dsp-blueprints/SmartLevel.md`
