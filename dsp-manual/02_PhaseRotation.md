# Phase Rotation

## Purpose
Phase Rotation is a corrective tool designed to reduce the **Crest Factor** (Peak-to-RMS ratio) of asymmetrical waveforms, such as human voice or brass instruments. By smearing the phase relationships of harmonic components without altering their frequency magnitude, it can lower peak levels by 3-6dB, allowing for louder final masters without compression artifacts.

## How to Use
1.  Select **Phase Rotation** from the sidebar.
2.  Click **Run**.
3.  Observe the waveform: Asymmetrical peaks (where the positive cycle is much louder than the negative, or vice versa) will become more symmetrical and balanced.

## Parameters
*   **None**: The filter chain is tuned to a specific set of "Disperser" coefficients designed to maximize symmetry for typical speech and instrument fundamentals.

## Math and Algorithms
The effect is achieved using a chain of **First-Order All-Pass Filters**.

### All-Pass Filter Theory
An all-pass filter has a flat magnitude response (gain = 1 across all frequencies) but a frequency-dependent phase response.

```math
H(z) = (c + z^-1) / (1 + c * z^-1)
```
Where `c` is the filter coefficient.

### Phase Dispersion
When multiple all-pass filters are cascaded, their group delays sum up. Low frequencies are delayed differently than high frequencies. This "smears" the energy of a transient over a slightly longer time window, reducing the constructive interference that creates massive peaks in asymmetrical signals.

**Filter Chain Configuration:**
The module uses a chain of 4 filters with alternating signs to create a specific phase curve:
1.  `c = 0.4`
2.  `c = -0.4`
3.  `c = 0.6`
4.  `c = -0.6`

This configuration mimics the behavior of analog "Disperser" hardware units often used in broadcast processing.

## Implementation Details
*   **Source File**: `packages/sonic-core/src/dsp/zig/main.zig`
*   **Function**: `process_phase_rotation`
*   **Structure**: Uses a `struct AllPass` maintaining `x1` and `y1` state variables for the difference equation:
    ```math
    y[n] = c * x[n] + x[n-1] - c * y[n-1]
    ```
*   **Processing**: Iterates through the sample buffer, passing each sample through the 4-stage filter chain sequentially.
