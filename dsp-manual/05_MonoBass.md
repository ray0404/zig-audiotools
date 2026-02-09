# Mono Bass

## Purpose
Mono Bass (also known as "Bass Mono-Maker" or "Elliptic EQ") centers the low-frequency content of a stereo mix. This is crucial for vinyl mastering and club sound systems, where stereo information in the sub-bass can cause tracking issues or phase cancellation. It sums frequencies below a cutoff point to mono while leaving higher frequencies in stereo.

## How to Use
1.  Select **Mono Bass** from the sidebar.
2.  Adjust the **Cutoff (Hz)** slider (e.g., 120Hz).
3.  Click **Run**.

## Parameters
*   **Cutoff Frequency**: The crossover point below which the signal will be summed to mono.
    *   *Range*: 20 Hz - 500 Hz
    *   *Default*: 120 Hz

## Math and Algorithms
The module employs a **Linkwitz-Riley 4th Order Crossover** network to split the signal into Low and High bands without phase distortion at the crossover point.

### 1. Linkwitz-Riley Crossover (LR4)
The LR4 filter is created by cascading two 2nd-order Butterworth filters. It provides a steep 24dB/octave slope and sums to unity gain (flat amplitude response) at the crossover frequency.
*   **Low-Pass Filter (LPF)**: Isolates bass.
*   **High-Pass Filter (HPF)**: Isolates mids/highs.

### 2. Summation Logic
For each sample frame (Left `L`, Right `R`):
1.  **Filter**:
    *   `L_low = LPF(L)`, `R_low = LPF(R)`
    *   `L_high = HPF(L)`, `R_high = HPF(R)`
2.  **Sum to Mono**:
    The low-frequency components are averaged.
    ```math
    M_low = (L_low + R_low) / 2
    ```
3.  **Recombine**:
    The mono bass is added back to the original stereo high frequencies.
    *   `L_out = M_low + L_high`
    *   `R_out = M_low + R_high`

## Implementation Details
*   **Source File**: `packages/sonic-core/src/dsp/zig/main.zig`
*   **Function**: `process_mono_bass`
*   **Filter Design**: Coefficients are calculated using `math.calc_lpf_coeffs` and `math.calc_hpf_coeffs`. The module maintains 4 filter states per channel (2 for LPF cascade, 2 for HPF cascade) to ensure correct 4th-order behavior.
