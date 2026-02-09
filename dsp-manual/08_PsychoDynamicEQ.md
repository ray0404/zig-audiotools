# PsychoDynamic EQ

## Purpose
PsychoDynamic EQ is a dynamic equalizer that adjusts the tonal balance of a recording in real-time based on its loudness. It simulates the **Fletcher-Munson (Equal Loudness) Curves**: human hearing perceives bass and treble less prominently at lower volumes. This tool boosts low and high frequencies during quiet sections to maintain a consistent perceived tonal balance ("Loudness" button effect).

## How to Use
1.  Select **PsychoDynamic EQ**.
2.  Adjust **Intensity** to control how aggressively the EQ reacts to volume drops.
3.  Adjust **Ref dB** to set the "Normal" volume level where the EQ should be flat.
4.  Click **Run**.

## Parameters
*   **Intensity**: Scaling factor for the dynamic gain.
    *   *Range*: 0.0 - 2.0
    *   *Default*: 1.0
*   **Ref dB**: The RMS level considered "Loud". Below this level, the smile curve (bass/treble boost) engages.
    *   *Range*: -60 dB to 0 dB
    *   *Default*: -18 dB

## Math and Algorithms
The algorithm uses an **RMS-driven Dynamic Filter Bank**.

### 1. Energy Detection
The RMS (Root Mean Square) energy of the signal is tracked using a fast attack (100ms) and slow release (500ms) envelope follower.
$$ E_{rms} = \sqrt{\text{MeanSquare}} $$

### 2. Deficit Calculation
The algorithm calculates how far the current volume is below the reference level.
$$ \text{Deficit}_{dB} = (\text{Ref}_{dB} - \text{Current}_{dB}) \cdot \text{Intensity} $$

### 3. Dynamic Filter Coefficients
Three filters are adjusted per sample block based on the deficit:
1.  **Low Shelf (100Hz)**: Boosts bass. Gain $\approx 0.4 \times \text{Deficit}$.
2.  **Mid Bell (2.5kHz)**: Cuts harshness slightly. Gain $\approx -0.1 \times \text{Deficit}$.
3.  **High Shelf (10kHz)**: Boosts "air". Gain $\approx 0.2 \times \text{Deficit}$.

*Example: If the audio drops 10dB below reference, the Low Shelf might boost by +4dB and High Shelf by +2dB, making the quiet section sound fuller.*

## Implementation Details
*   **Source File**: `packages/sonic-core/src/dsp/zig/main.zig`
*   **Function**: `process_psychodynamic`
*   **Filters**: Re-calculates biquad coefficients (`math.calc_low_shelf_coeffs`, etc.) dynamically for every block of 64 samples to prevent zipper noise while remaining efficient.
