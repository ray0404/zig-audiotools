# Loudness Normalization

## Purpose
The Loudness Normalization module ensures that audio signals meet specific loudness standards, primarily compliant with **EBU R128**. It automates the process of adjusting gain to achieve a target Integrated Loudness (LUFS), eliminating volume disparities between different tracks or sections of audio.

## How to Use
1.  Select the **Loudness Normalize** tool from the sidebar.
2.  Adjust the **Target LUFS** slider to your desired level (default: -14 LUFS).
    *   **-14 LUFS**: Standard for streaming platforms like Spotify and YouTube.
    *   **-23 LUFS**: Broadcast standard (EBU R128).
    *   **-16 LUFS**: Common for podcasts and mobile consumption.
3.  Click **Run** to process the audio. The waveform will update to reflect the gain change.

## Parameters
*   **Target LUFS**: The desired integrated loudness level in Loudness Units Full Scale.
    *   *Range*: -24.0 to -6.0 LUFS
    *   *Default*: -14.0 LUFS

## Math and Algorithms
The implementation follows a simplified version of the **EBU R128** specification (ITU-R BS.1770-4).

### 1. K-Weighting Filter
Before measurement, the audio is passed through a **K-weighting** pre-filter to model human loudness perception. This consists of two cascaded biquad filters:
1.  **High Shelving Filter**: Simulates the acoustic effect of the head (head-related transfer function), boosting high frequencies.
2.  **High-Pass Filter (RLB)**: Simulates the ear's insensitivity to low frequencies.

**Coefficients (48kHz):**
*   *Pre-filter (High Shelf)*: Boosts ~1.5kHz and above.
*   *RLB Filter (High Pass)*: Simple 2nd order HPF to cut sub-bass.

### 2. Mean Square Calculation
The filtered signal is squared and averaged over the duration of the file (Integrated Loudness).

```math
z_i = filtered_sample_i^2
MeanSquare = (1/N) * sum(z_i) from i=0 to N-1
```

### 3. Loudness Calculation
The RMS value is converted to Decibels (dB) and then to LUFS by applying a relative gate offset (though the current simplified implementation uses a direct RMS approximation for performance).

```math
LUFS = 10 * log10(MeanSquare) - 0.691
```
*(The -0.691 offset is standard for aligning K-weighted RMS with subjective loudness perception).*

### 4. Gain Application
The difference between the **Target LUFS** and **Measured LUFS** is calculated, and a constant linear gain is applied to the entire signal.

```math
Delta_dB = Target - Measured
LinearGain = 10^(Delta_dB / 20)
```

## Implementation Details
*   **Source File**: `packages/sonic-core/src/dsp/zig/main.zig`
*   **Function**: `process_lufs_normalize`
*   **Optimization**: Uses SIMD (Single Instruction, Multiple Data) via Zig's `@Vector` to compute the sum of squares efficiently in blocks of 4 samples.
