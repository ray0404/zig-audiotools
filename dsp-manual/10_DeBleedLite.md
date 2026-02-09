# DeBleed Lite

## Purpose
DeBleed Lite reduces "bleed" or "spill" (audio from one source appearing in another microphone's track) using spectral gating. It is designed for multi-track scenarios (e.g., removing headphone bleed from a vocal mic or drum bleed from a guitar mic).

## How to Use
1.  **Preparation**: This tool requires a **Stereo** file where:
    *   **Left Channel**: The Target track (to be cleaned).
    *   **Right Channel**: The Source of the bleed (the reference).
    *(Note: In the PWA, this is usually handled by the "DeBleed" tool logic wrapping a stereo buffer)*.
2.  Select **DeBleed Lite**.
3.  Adjust **Sensitivity** and **Threshold**.
4.  Click **Run**.

## Parameters
*   **Sensitivity**: How aggressively to subtract the bleed when detected.
    *   *Range*: 0.0 - 1.0
*   **Threshold**: The level the bleed source must exceed to trigger reduction.
    *   *Range*: -80 dB to 0 dB

## Math and Algorithms
The algorithm uses **Cross-Channel Spectral Subtraction**.

### 1. Dual STFT
Both the Target (Left) and Source (Right) channels are transformed into the frequency domain (STFT).

### 2. Transient/Activity Detection
The algorithm calculates the RMS of the Source frame.
*   **Active Check**: Is Source > Threshold?
*   **Dominance Check**: Is Source significantly louder than Target? (RMS Source > 1.5 * RMS Target). This prevents reducing the Target when the Target itself is loud (masking the bleed).

### 3. Spectral Subtraction
If bleed is detected, the algorithm estimates the bleed magnitude in the Target spectrum based on the Source spectrum.

```math
BleedEst[k] = |X_source[k]| * 0.3
|X_target_new[k]| = |X_target[k]| - (BleedEst[k] * Sensitivity)
```

This subtracts the frequency footprint of the Source from the Target, effectively "erasing" the bleed.

## Implementation Details
*   **Source File**: `packages/sonic-core/src/dsp/zig/debleed.zig`
*   **Function**: `process` (wrapped by `process_declip` in main)
*   **Requirement**: Strictly requires a stereo buffer input where L=Target, R=Source. If input is Mono, the effect is bypassed.
