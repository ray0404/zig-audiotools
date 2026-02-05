# Blueprint: EchoVanish (Algorithmic De-Reverb)

## 1. Overview
**Target:** Dialogue Editors, Podcasters
**Goal:** Remove room ambience (late reflections) from spoken dialogue without artifacts.
**Technique:** Weighted Prediction Error (WPE) or LPC-based residual estimation.

## 2. DSP Algorithm (Zig)
The core algorithm relies on the assumption that late reverberation is a linear combination of past speech samples, while the direct signal is not.

### A. STFT Processing
*   **Window Size:** 64ms (approx 3072 samples at 48kHz).
*   **Hop Size:** 16ms (75% overlap).
*   **Window Function:** Hanning or Hamming.

### B. Prediction Filter (MIMO-WPE simplified for Mono)
For each frequency bin $f$ and frame $n$:
1.  **Buffer History:** Maintain a history of $D$ past frames (delay) up to $K$ frames (taps).
    *   Typically $D=3$ (early reflections kept), $K=10-20$ (prediction window).
2.  **Covariance Matrix:** Estimate the power spectral density (PSD) of the reverberation.
3.  **Filter Calculation:** Compute the prediction filter $G$ that minimizes the variance of the residual.
    *   $Y[n, f] = X[n, f] - \sum_{k=D}^{D+K-1} G[k, f] ^ H * X[n-k, f]$
4.  **Subtraction:** The result $Y$ is the de-reverbed signal.

### C. Implementation Strategy (Zig)
1.  **Struct:** `EchoVanishContext` holding history buffers for STFT frames.
2.  **Dependencies:** `math_utils.zig` for FFT.
3.  **Optimization:** Inverse matrix calculation (for filter estimation) is expensive. Use a recursive least squares (RLS) approach or a simplified gradient descent if CPU is tight, but since this is **Offline/Batch**, we can afford Cholesky decomposition or direct inversion per frequency bin.

## 3. WASM Interface
```zig
export fn process_echovanish(
    ptr: [*]f32, 
    len: usize, 
    sample_rate: f32,
    reduction_amount: f32, // 0.0 to 1.0 (scales the subtraction)
    tail_length_ms: f32    // 50ms to 500ms (defines K)
) void;
```

## 4. TypeScript Bridge (`sdk.ts`)
*   **Input:** Mono or Stereo (process channels independently).
*   **Params:**
    *   `reduction`: Maps to `reduction_amount`.
    *   `tailLength`: Maps to prediction filter order.

## 5. UI Components (`SmartToolsWorkspace.tsx`)
*   **Visualizer:** Spectrogram (essential to see the "smear" disappear).
*   **Controls:**
    *   **Knob:** "Dry/Wet" (Reduction Amount).
    *   **Slider:** "Room Size" (Tail Length).
    *   **Toggle:** "Focus Mode" (Listen to the removed Reverb/Diff).

## 6. Step-by-Step Implementation Plan
1.  **Zig Core:** Implement `STFT` struct in `dsp/zig/stft.zig` (refactor existing if needed).
2.  **WPE Logic:** Implement the prediction loop in `main.zig` or new `dsp/zig/echovanish.zig`.
3.  **WASM Export:** Expose `process_echovanish`.
4.  **TS Wrapper:** Add `echoVanish()` to `Processor.ts`.
5.  **UI:** Create `EchoVanishPanel.tsx` and register in `ToolsView.tsx`.
