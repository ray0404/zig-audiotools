# Spectral Match

## Purpose
Spectral Match (or "EQ Match") applies the tonal characteristics (frequency curve) of a **Reference** track to a **Target** track. It is ideal for matching the tone of different takes (ADR matching), making a cheap mic sound like an expensive one, or copying a reference mastering curve.

## How to Use
1.  Select **Spectral Match**.
2.  **Load Reference**: Upload an audio file that represents the "sound" you want.
3.  Adjust **Match Amount** (0.0 to 1.0).
4.  Click **Run**.

## Parameters
*   **Reference File**: The source of the desired EQ curve.
*   **Amount**: The strength of the applied EQ.
    *   *Range*: 0.0 - 1.0

## Math and Algorithms
The algorithm generates a **Linear Phase Impulse Response (IR)** based on the spectral difference.

### 1. Spectrum Analysis
Both the Target and Reference signals are analyzed to compute their Average Power Spectra.
*   **Window**: Hanning, 4096 samples.
*   **Smoothing**: **1/3 Octave Smoothing** is applied to both spectra. This is critical to capture the general "tonal balance" rather than trying to match specific musical notes or harmonics.

### 2. Filter Computation
The "Difference Curve" (Transfer Function) is calculated:
$$ H_{mag}[k] = \sqrt{\frac{P_{ref}[k]}{P_{target}[k]}} $$
This magnitude response represents the EQ curve needed to turn Target into Reference.
*   **Clamping**: The curve is clamped to +/- 12dB to prevent extreme resonance.

### 3. Impulse Response Generation
1.  The Magnitude response is converted to a symmetric complex spectrum (Zero Phase).
2.  **Inverse FFT** generates a time-domain Impulse Response.
3.  **Circular Shift**: The IR is rotated by $N/2$ samples to center the impulse, making it **Linear Phase**. This ensures the matching EQ does not introduce phase distortion or "smearing" of transients.

### 4. Convolution
The Target audio is convolved with this generated Impulse Response to apply the EQ curve.

## Implementation Details
*   **Source File**: `packages/sonic-core/src/dsp/zig/spectralmatch.zig`
*   **Functions**: `spectralmatch_analyze_ref` (creates profile), `process_spectralmatch` (applies profile).
*   **Convolution**: Implemented via Frequency-Domain Convolution (FFT -> Multiply -> IFFT) for efficiency with large kernels (4096+ samples).
