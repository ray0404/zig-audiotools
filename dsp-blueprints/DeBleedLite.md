# Blueprint: DeBleed Lite (Cross-Channel Interference Removal)

## 1. Overview
**Target:** Podcasters
**Goal:** Remove "bleed" (Guest voice leaking into Host mic) to allow cleaner editing and mixing.
**Technique:** Sidechain Spectral Subtraction.

## 2. DSP Algorithm (Zig)
This tool strictly requires **Stereo** or **Dual-Mono** input where Ch1 is "Target" and Ch2 is "Bleed Source" (or vice-versa).

### A. Envelope Follower & Gate
1.  **RMS:** Calculate RMS for both channels (window ~10ms).
2.  **Activity Detection:**
    *   `Active_A`: `RMS_A > Threshold`
    *   `Active_B`: `RMS_B > Threshold`
    *   `Dominant`: If `RMS_B > RMS_A + 6dB`, assume B is talking and A is just bleed.

### B. Spectral Subtraction
If `Dominant == B`:
1.  **FFT:** Transform both channels.
2.  **Magnitude Scaling:** Estimate the bleed magnitude in A as `Mag_B * BleedFactor` (where BleedFactor is ~0.1 - 0.3, derived from distance).
3.  **Subtraction:** `NewMag_A = Mag_A - (Mag_B * BleedFactor * Sensitivity)`.
    *   Clamp to 0.
4.  **Reconstruction:** `Active_A = IFFT(NewMag_A, Phase_A)`.

### C. Simplification (Broadband)
If FFT is too heavy or artifacts too strong:
*   **Duck/Expander:** Simply apply gain reduction to A when B is dominant.
*   *Manifest says "Spectral Subtraction"*, so we stick to FFT method but maybe with low resolution (fewer bins) to avoid "musical noise".

## 3. WASM Interface
```zig
export fn process_debleed(
    ptr_target: [*]f32, // The mic to clean
    ptr_source: [*]f32, // The mic causing the bleed
    len: usize,
    sensitivity: f32,   // Aggressiveness of subtraction
    threshold: f32      // Noise gate floor
) void;
```

## 4. TypeScript Bridge
*   **Stereo Handling:** The `Processor.ts` must likely split a Stereo track into L (Target) and R (Source) temporary buffers, process, then reconstruct. Or, if the UI allows selecting "Track 1" and "Track 2", pass pointers from both.
*   **Assumption:** In the current MVP, simpler to assume Stereo File: Left = Mic A, Right = Mic B.

## 5. UI Components
*   **Controls:**
    *   **Knob:** "Bleed Sensitivity".
    *   **Knob:** "Gate Threshold".
    *   **Switch:** "Listen to Removed" (Delta).

## 6. Step-by-Step Implementation Plan
1.  **Structure:** Create `dsp/zig/debleed.zig`.
2.  **FFT:** Reuse `math_utils.zig`.
3.  **Logic:** Implement the logic: `if (MagB > MagA) { subtract }`.
4.  **Artifact Control:** Implement spectral floor (don't reduce below X dB) to avoid watery artifacts.
