# Blueprint: PsychoDynamicEQ (Perceptual Balancing)

## 1. Overview
**Target:** Mastering Engineers
**Goal:** Maintain tonal balance at all volume levels (Fletcher-Munson compensation).
**Technique:** Dynamic EQ weighted by ISO 226:2003.

## 2. DSP Algorithm (Zig)

### A. ISO 226 Contours
*   **Concept:** The ear is less sensitive to Bass and Treble at low volumes.
*   **Logic:**
    1.  Measure global loudness (RMS/LUFS).
    2.  Calculate "Loudness Deficit" = `Reference_Level (85dB) - Current_Level`.
    3.  Apply EQ boost to Lows and Highs proportional to this deficit.

### B. Filter Bank
1.  **Low Band:** Low Shelf at 100Hz.
2.  **Mid Band:** Bell at 2.5kHz (Ear resonance).
3.  **High Band:** High Shelf at 10kHz.

### C. Dynamic Gain Logic
*   `Gain_Low[n] = BaseGain_Low + (Deficit * 0.4)`.
*   `Gain_High[n] = BaseGain_High + (Deficit * 0.2)`.
*   `Gain_Mid[n] = BaseGain_Mid - (Deficit * 0.1)` (Mid-scoop effect).
*   **Attack/Release:** Smooth the Deficit calculation (100ms/500ms) so EQ doesn't jitter.

## 3. WASM Interface
```zig
export fn process_psychodynamic(
    ptr: [*]f32,
    len: usize,
    sample_rate: f32,
    intensity: f32, // 0.0 to 1.0 (How much to follow ISO curve)
    ref_db: f32     // Reference Level (e.g. -18dBFS = 85dB SPL)
) void;
```

## 4. TypeScript Bridge
*   Pass standard buffer.

## 5. UI Components
*   **Visualizer:** Dynamic EQ Curve (Moving lines showing the boost/cut in real-time).
*   **Controls:**
    *   **Knob:** "Calibration" (Ref Level).
    *   **Knob:** "Dynamics" (Intensity).

## 6. Step-by-Step Implementation Plan
1.  **Filters:** Reuse Biquad structs (Shelving/Peaking).
2.  **ISO Logic:** Implement a simplified polynomial approximation of the Equal Loudness Contour differences.
3.  **Gain Computer:** Smoothed RMS -> Coefficient calculation per frame (or block of 64 samples for optimization).
