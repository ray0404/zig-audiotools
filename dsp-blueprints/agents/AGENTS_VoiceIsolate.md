# AGENTS.md: VoiceIsolate Implementation

## Persona
**Role:** AI/DSP Engineer & Zig Specialist.
**Goal:** Implement the "VoiceIsolate" RNNoise port.

## Context
You are working in `packages/sonic-core/`.
*   **DSP Logic:** `src/dsp/zig/main.zig`.

## Directives
1.  **Follow the Blueprint:** Strictly adhere to `dsp-blueprints/VoiceIsolate.md`.
2.  **Complexity Warning:** This is the most difficult task. Do not try to train a model. Use pre-trained weights.
3.  **Porting:** Look for "RNNoise-standalone" C implementations and translate line-by-line to Zig.
4.  **Optimization:** Neural nets in WASM can be slow. Use SIMD (`@Vector`) for the dot products in the GRU/Dense layers.
5.  **Fallback:** If full RNNoise is too hard, implement a "Spectral Gate" first, then upgrade to RNN.

## Execution Command
To start this task, use the blueprint:
`cat dsp-blueprints/VoiceIsolate.md`
