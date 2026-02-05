# Blueprint: SmartLevel (Musical Gain Riding)

## 1. Overview
**Target:** Podcasters
**Goal:** Even out levels (like a fader rider) without the "pumping" artifacts of a compressor.
**Technique:** RMS-based Inverse Automation with Inertia.

## 2. DSP Algorithm (Zig)

### A. Level Detection
1.  **Window:** Sliding RMS (300ms).
2.  **K-Weighting:** Apply High-shelf filter (see `main.zig` LUFS impl) before RMS to mimic loudness perception.

### B. Gain Computer
1.  **Target:** `TargetLUFS` (e.g. -16).
2.  **Delta:** `RawGain = Target - CurrentRMS`.
3.  **Clamping:** Limit `RawGain` to +/- 6dB (don't boost noise floor to infinity).
4.  **Gate:** If `CurrentRMS < SilenceThreshold`, freeze gain (don't boost silence).

### C. Inertia (Smoothing)
*   **Logic:** We don't want to react to every syllable. We want to react to phrases.
*   **Filter:** Low-pass filter the `RawGain` control signal.
    *   `Attack`: 500ms (Rise time).
    *   `Release`: 1000ms (Fall time).
*   `FinalGain[n] = Smooth(RawGain[n])`.

### D. Application
*   `Output[n] = Input[n] * dbToLinear(FinalGain[n])`.

## 3. WASM Interface
```zig
export fn process_smartlevel(
    ptr: [*]f32,
    len: usize,
    target_lufs: f32,
    max_gain_db: f32, // +/- limit
    gate_threshold_db: f32 // -50dB
) void;
```

## 4. TypeScript Bridge
*   Standard in-place processing.

## 5. UI Components
*   **Visualizer:** Gain Reduction/Boost Line Graph overlaid on Waveform.
*   **Controls:**
    *   **Knob:** "Target LUFS".
    *   **Knob:** "Range (+/- dB)".
    *   **Knob:** "Speed" (Slow/Med/Fast -> maps to Attack/Release coeffs).

## 6. Step-by-Step Implementation Plan
1.  **RMS:** Use existing SIMD RMS from `main.zig`.
2.  **Smoothing:** Implement a simple one-pole LPF for the gain curve.
3.  **Gate:** Add silence check.
4.  **WASM:** Export `process_smartlevel`.
