# Blueprint: TapeStabilizer (Wow & Flutter Correction)

## 1. Overview
**Target:** Archivists
**Goal:** Fix pitch wobble in digitized tape/vinyl.
**Technique:** Pitch Tracking (YIN/Autocorrelation) + Variable Speed Resampling.

## 2. DSP Algorithm (Zig)

### A. Pitch Detection (YIN)
1.  **Autocorrelation:** Calculate the difference function $d(\tau) = \sum (x[j] - x[j+\tau])^2$.
2.  **Normalization:** Cumulative Mean Normalized Difference.
3.  **Picking:** Find the first dip below a threshold. This is the period $T$.
4.  **Frequency:** $f = Fs / T$.
5.  **Constraint:** We are looking for a *constant* tone (e.g., mains hum at 50/60Hz, or a bias tone). If music, we look for the "average global pitch deviation" which is much harder.
    *   *Simplification:* Track the strongest stable tonal component in the 50-60Hz range (Mains Hum) or 10-20kHz (Bias). Let's target **Mains Hum (50/60Hz)** as the anchor.

### B. Deviation Map
1.  **Reference:** User sets "Nominal Freq" (e.g. 60Hz).
2.  **Delta:** `SpeedFactor[t] = MeasuredFreq[t] / NominalFreq`.
    *   If measured is 59Hz, speed is 0.98x (tape ran slow), so we need to speed up (resample by 1/0.98).

### C. Resampling (Sinc / Hermite)
1.  **Interpolation:** To shift pitch/speed, we must interpolate.
    *   `Output[i] = Interpolate(Input, ReadHead)`.
    *   `ReadHead += SpeedFactor[i]`.
2.  **Buffer:** Requires arbitrary access to the input buffer.

## 3. WASM Interface
```zig
export fn process_tapestabilizer(
    ptr: [*]f32,
    len: usize,
    sample_rate: f32,
    nominal_freq: f32, // e.g. 60.0
    scan_freq_min: f32, // 45.0
    scan_freq_max: f32  // 65.0
) void;
```

## 4. TypeScript Bridge
*   **Two-Pass:**
    1.  **Scan:** Zig function `analyze_hum()` returns a variance score.
    2.  **Correct:** If hum found, run `process_tapestabilizer`.

## 5. UI Components
*   **Visualizer:** Pitch Deviation Graph (Line chart centered at 0%).
*   **Controls:**
    *   **Dropdown:** "Reference" (60Hz Hum, 50Hz Hum, 15kHz Pilot).
    *   **Knob:** "Correction Amount" (0-100%).

## 6. Step-by-Step Implementation Plan
1.  **YIN Algo:** Implement `dsp/zig/pitch_detect.zig`.
2.  **Resampler:** Implement a Cubic Hermite interpolator (fast, good enough) in `math_utils.zig`.
3.  **Logic:** Frame-by-frame pitch tracking -> smoothing -> resampling.

```