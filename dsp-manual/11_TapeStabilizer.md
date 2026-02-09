# Tape Stabilizer

## Purpose
Tape Stabilizer corrects **Wow and Flutter** (pitch fluctuations) inherent in analog tape, vinyl, or damaged cassette recordings. It tracks the pitch center of the audio (or a specific pilot tone) and dynamically resamples the audio to flatten the pitch drift.

## How to Use
1.  Select **Tape Stabilizer**.
2.  **Nominal Freq**: Select the expected center frequency of the hum/pilot tone (e.g., **60Hz** mains hum or **50Hz**).
3.  Adjust **Amount**: Controls how strictly the pitch is corrected.
4.  Click **Run**.

## Parameters
*   **Nominal Freq**: The target frequency to track (50Hz or 60Hz).
*   **Amount**: Interpolation strength.
    *   *Range*: 0.0 - 1.0

## Math and Algorithms
The system uses **YIN Pitch Detection** combined with **Varispeed Resampling**.

### 1. YIN Pitch Detection
The input signal is analyzed using the YIN algorithm (a robust autocorrelation-based method) to detect the fundamental frequency `f_measured(t)` within a narrow range around the Nominal Frequency (e.g., 55Hz - 65Hz for a 60Hz target).
*   YIN uses a "Difference Function" rather than simple correlation to minimize octave errors.

### 2. Smoothing
The detected frequency curve is smoothed using a **Median Filter** (window size 5) to remove detection outliers/glitches.

### 3. Varispeed Resampling
The algorithm calculates a playback speed curve to counteract the drift.

```math
Speed(t) = Nominal_Freq / f_measured(t)
```
*   If the tape ran slow (Measured < Nominal), speed > 1 (speed up).
*   If the tape ran fast (Measured > Nominal), speed < 1 (slow down).

The audio is resampled using **Cubic Hermite Interpolation** at the calculated variable rate, effectively "straightening" the wow/flutter.

## Implementation Details
*   **Source File**: `packages/sonic-core/src/dsp/zig/tape_stabilizer.zig`
*   **Dependency**: `packages/sonic-core/src/dsp/zig/pitch_detect.zig` (Yin struct)
*   **Optimization**: Restricts YIN search range (`scan_min`, `scan_max`) to minimize CPU usage and prevent false positives from other instruments.
