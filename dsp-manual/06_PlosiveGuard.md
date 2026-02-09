# Plosive Guard

## Purpose
Plosive Guard is an intelligent dynamic processor specifically tuned to detect and attenuate microphone "pops" (plosives) caused by bursts of air hitting the diaphragm (typically 'P' and 'B' sounds). Unlike a static High-Pass Filter, it only engages when a plosive is detected, preserving the natural low-end body of the voice during non-plosive sections.

## How to Use
1.  Select **Plosive Guard**.
2.  Adjust **Sensitivity** to target the pops (start at 0.5).
3.  Adjust **Strength** to determine how much bass to cut when triggered.
4.  Adjust **Cutoff** to define the frequency range of the pop (usually 100-150Hz).
5.  Click **Run**.

## Parameters
*   **Sensitivity**: Controls the detection threshold. Higher values trigger on subtle pops; lower values require stronger bursts.
    *   *Range*: 0.0 - 1.0
*   **Strength**: The maximum attenuation applied to the low band when triggered.
    *   *Range*: 0.0 (0dB) - 1.0 (~-24dB)
*   **Cutoff**: The crossover frequency separating the "Pop" band from the rest of the voice.
    *   *Range*: 80 Hz - 250 Hz

## Math and Algorithms
The algorithm combines a multi-band split with transient energy detection.

### 1. Frequency Splitting
A **Linkwitz-Riley 4th Order Crossover** splits the signal into `Low` (Pop band) and `High` (Voice band).

### 2. Detection Logic (The "Guard")
The detector monitors the energy ratio and "flux" (rate of change) of the low band.
*   **Flux Detection**: Calculates the derivative of the low-band energy. Plosives are characterized by an explosive rise in low-frequency energy.
    ```math
    Delta E_low > FluxThreshold(Sensitivity)
    ```
*   **Ratio Check**: Ensures the event is bass-heavy (unlike a snare drum or loud vowel).
    ```math
    E_low > E_high + 12dB
    ```

### 3. Dynamic Attenuation
If both conditions are met, a gain envelope is triggered.
*   **Attack (2ms)**: Clamps down on the gain instantly to catch the pop transient.
*   **Release (80ms)**: Holds the attenuation through the body of the plosive air blast.
*   **Target Gain**: Defined by the `Strength` parameter.

### 4. Recombination
The signal is reconstructed by summing the processed Low band and the untouched High band.
```math
Out = (Low * Gain(t)) + High
```

## Implementation Details
*   **Source File**: `packages/sonic-core/src/dsp/zig/plosiveguard.zig`
*   **Function**: `process_plosiveguard`
*   **State Management**: Uses stateful biquad filters for the crossover and tracks previous energy levels for flux calculation.
