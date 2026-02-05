# Blueprint: VoiceIsolate (Lightweight ML Denoise)

## 1. Overview
**Target:** Content Creators
**Goal:** Remove non-voice noise (fans, traffic) using Deep Learning.
**Technique:** Recurrent Neural Network (GRU) based masking (RNNoise port).

## 2. DSP Algorithm (Zig)

### A. Architecture (RNNoise-like)
1.  **Feature Extraction:**
    *   Input: 20ms Frame.
    *   Features: 22 Bark-scale bands (Energy), Pitch correlation, Spectral Flatness.
2.  **Neural Net (Inference):**
    *   Input Layer: Features + Previous State.
    *   Layers: 2 or 3 GRU layers + Dense Output.
    *   Output: 22 Gain values (0.0 to 1.0) for the Bark bands.
3.  **Synthesis:**
    *   Interpolate the 22 band gains to the full FFT bin size.
    *   Apply gains to the Magnitude Spectrum.
    *   IFFT.

### B. Model Weights
*   **Storage:** Embed the weights (approx 50-100KB) as a static constant array in Zig (`weights.zig`).
*   **Format:** Quantized (int8) or float32.

### C. Implementation Strategy
*   **From Scratch:** Too hard.
*   **Porting:** Port the `compute_band_corr`, `compute_pitch_gain`, and `rnn_layer` C functions from `rnnoise` repo to Zig.
*   *Note: This is a complex task. Start with a "Mini" model that just does simple spectral gating based on a pre-trained decision tree if RNN is too heavy.*
*   **For this blueprint:** We assume full RNN port.

## 3. WASM Interface
```zig
export fn process_voiceisolate(
    ptr: [*]f32,
    len: usize,
    amount: f32 // Blend mask (0.0 = No reduction, 1.0 = Full mask)
) void;
```

## 4. TypeScript Bridge
*   Requires a persistent state handle (`VoiceIsolateState`) for the RNN history.

## 5. UI Components
*   **Controls:**
    *   **Knob:** "Denoise Amount".
    *   **Toggle:** "Voice Activity LED".

## 6. Step-by-Step Implementation Plan
1.  **Features:** Implement Bark scale band energy calculation.
2.  **Inference:** Implement a generic GRU cell in Zig (`math/neural.zig`).
3.  **Weights:** Convert standard RNNoise weights to a Zig struct.
4.  **Pipeline:** STFT -> Features -> GRU -> Mask -> Apply -> IFFT.
