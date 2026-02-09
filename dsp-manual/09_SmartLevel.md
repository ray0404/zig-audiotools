# Smart Level

## Purpose
Smart Level is a broadcast-grade automatic leveling tool (Leveller / AGC). Unlike a standard compressor that reacts to peaks, Smart Level reacts to **Loudness (RMS)**. It slowly rides the gain fader to keep the average volume consistent over long durations, similar to a broadcast processor or a human engineer riding a fader.

## How to Use
1.  Select **Smart Level**.
2.  Set **Target LUFS** to your desired output level (e.g., -16 LUFS).
3.  Set **Max Gain** to limit how much it can boost quiet sections.
4.  Set **Gate** to prevent it from boosting background noise during silence.
5.  Click **Run**.

## Parameters
*   **Target LUFS**: The goal average loudness.
    *   *Range*: -24 to -6 LUFS
*   **Max Gain (dB)**: The maximum positive or negative gain applied.
    *   *Range*: 0 to 24 dB
*   **Gate (dB)**: Signal level below which gain correction freezes.
    *   *Range*: -100 to -30 dB

## Math and Algorithms
The algorithm simulates a "slow-hand" gain rider.

### 1. Sliding Window RMS
Instead of instantaneous detection, it uses a **300ms Sliding Window** to calculate RMS. This ignores micro-dynamics (transients) and focuses on the "body" of the sound.
Pre-filtering with a High-Pass Filter (approx 38Hz) ensures sub-bass doesn't skew the leveling logic.

### 2. Gain Computer
Calculates the raw gain needed to bring the current RMS to the Target.

```math
RawGain = Target - CurrentRMS
```

### 3. Gating Logic
If the current signal is below the `Gate Threshold` (e.g., silence between sentences), the gain freezes at its last valid value. This prevents "breathing" or rushing noise floor up during pauses.

### 4. Inertia (Smoothing)
The raw gain is smoothed using asymmetric time constants:
*   **Attack (Rise)**: 500ms. If the signal is too quiet, gain rises slowly.
*   **Release (Fall)**: 1000ms. If signal is too loud, gain reduces even more slowly.
This ensures the leveling is transparent and inaudible.

## Implementation Details
*   **Source File**: `packages/sonic-core/src/dsp/zig/smart_level.zig`
*   **Function**: `process_smartlevel`
*   **Buffer Management**: Uses a circular buffer to efficiently compute the sliding sum-of-squares for the 300ms window.
