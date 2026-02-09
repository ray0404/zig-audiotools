# De-Clipper

## Purpose
The De-Clipper repairs digital or analog clipping artifacts where signal peaks have been "flat-topped" or truncated. It reconstructs the missing peak information using interpolation, restoring dynamic range and removing the harsh harmonic distortion associated with clipping.

## How to Use
1.  Select **De-Clip** from the sidebar.
2.  Adjust the **Threshold** slider.
    *   Lower values (e.g., 0.95) will detect and repair more "soft" clips or analog saturation.
    *   Higher values (e.g., 0.99) limit repair to obvious digital hard clipping.
3.  Click **Run**.

## Parameters
*   **Threshold**: The absolute signal level (normalized 0.0 - 1.0) above which samples are considered "clipped".
    *   *Range*: 0.50 to 1.00
    *   *Default*: 0.95 (approx -0.5 dB)

## Math and Algorithms
The core algorithm relies on **Cubic Hermite Spline Interpolation**.

### 1. Detection
The algorithm scans the audio buffer for samples where the absolute value exceeds the `threshold`.
$$ |x[n]| \ge \text{Threshold} $$
It groups consecutive clipped samples into a "clipped interval" $[start, end]$.

### 2. Constraint Checks
To ensure meaningful restoration, the algorithm requires:
*   The interval must have at least 3 consecutive clipped samples (to distinguish from transient noise).
*   Valid "anchor points" must exist before and after the clipped region (indices $start-2$ and $end+2$).

### 3. Cubic Hermite Interpolation
The algorithm uses four samples surrounding the clipped region as control points:
*   $p_0 = x[start-2]$
*   $p_1 = x[start-1]$ (Left Anchor)
*   $p_2 = x[end]$ (Right Anchor)
*   $p_3 = x[end+1]$

A Cubic Hermite Spline is generated to smoothly bridge $p_1$ and $p_2$, preserving both the slope (first derivative) and continuity of the waveform. The spline "overshoots" the flat top, effectively predicting where the natural peak of the wave would have been if it hadn't been clipped.

$$ \text{Interpolated}(t) = \text{CubicHermite}(p_0, p_1, p_2, p_3, t) $$
Where $t$ ranges from 0 to 1 across the duration of the clipped interval.

## Implementation Details
*   **Source File**: `packages/sonic-core/src/dsp/zig/main.zig`
*   **Function**: `process_declip`
*   **Helper**: `math.cubicHermite` (in `math_utils.zig`) implements the standard basis functions for the spline.
*   **Logic**: In-place modification of the buffer. The loop skips ahead past processed intervals to avoid re-triggering on reconstructed peaks.
