# Blueprint: PlosiveGuard (Targeted Low-End Restoration)

## 1. Overview
**Target:** Voiceover Artists
**Goal:** Transparently remove "P" and "B" pops (plosives) without thinning the voice.
**Technique:** Multi-band dynamic attenuation triggered by spectral flux.

## 2. DSP Algorithm (Zig)
Unlike a standard High-Pass Filter (HPF), this only cuts low frequencies when a plosive is detected.

### A. Frequency Splitting
*   **Crossover:** 4th Order Linkwitz-Riley at ~150Hz.
*   **Low Band:** Contains the plosive energy + fundamental body.
*   **High Band:** Contains intelligibility (passed through untouched).

### B. Detection Logic (The "Guard")
1.  **Flux Calculation:** Measure the energy delta of the Low Band over a short window (5ms).
2.  **Thresholding:** If `LowBand_Energy > HighBand_Energy + 12dB` AND `Flux > Threshold`, trigger reduction.
    *   Plosives have massive Low energy and very little High energy compared to vowels.

### C. Reduction Logic
1.  **Envelope:** Attack 1-2ms, Release 50-100ms.
2.  **Gain:** Apply dynamic gain reduction to the Low Band.
    *   Reduction factor proportional to the over-threshold amount.
3.  **Recombination:** `Output = (Low * Gain) + High`.

## 3. WASM Interface
```zig
export fn process_plosiveguard(
    ptr: [*]f32, 
    len: usize, 
    sample_rate: f32,
    sensitivity: f32, // 0.0 to 1.0 (Threshold offset)
    strength: f32,    // 0.0 to 1.0 (Max attenuation depth)
    cutoff: f32       // 80Hz to 200Hz (Crossover freq)
) void;
```

## 4. TypeScript Bridge
*   **Buffer Handling:** Requires internal buffering in Zig or processing in chunks if real-time, but for offline, can process whole buffer in place.

## 5. UI Components
*   **Visualizer:** Dual Waveform (Original vs Processed Low End).
*   **Controls:**
    *   **Knob:** "Sensitivity" (Threshold).
    *   **Knob:** "Max Reduction" (dB).
    *   **Knob:** "Freq Split" (Hz).

## 6. Step-by-Step Implementation Plan
1.  **Crossover:** Reuse `calc_lpf_coeffs` / `calc_hpf_coeffs` from `main.zig`.
2.  **Detector:** Implement the flux/ratio logic.
3.  **Gain Computer:** Implement the attack/release envelope follower.
4.  **WASM:** Export `process_plosiveguard`.
5.  **UI:** Add to Smart Tools menu.
