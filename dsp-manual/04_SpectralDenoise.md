# Spectral Denoise

## Purpose
Spectral Denoise removes stationary or broadband noise (hiss, hum, fan noise) from audio recordings using **Adaptive Spectral Subtraction**. It works by analyzing the frequency content of the "noise floor" and subtracting that energy from the overall signal.

## How to Use
1.  Select **Spectral Denoise** from the sidebar.
2.  **Noise Profile Selection**:
    *   **Auto Mode (Default)**: If no selection is made, the tool assumes the first ~200ms of the audio file is "silence/noise only" and builds a profile from that.
    *   **Manual Mode**:
        1.  Find a section of the audio containing *only* the noise you want to remove.
        2.  Click **Set Start** and **Set End** during playback to mark this range.
        3.  Click **Capture Selection**.
3.  Click **Run** to apply the denoising process using the captured (or auto) profile.

## Parameters
*   **Noise Profile**: A buffer containing the reference noise fingerprint.
*   **Subtraction Factor** (Internal): Fixed at 1.5 (moderate reduction).

## Math and Algorithms
The algorithm uses **Short-Time Fourier Transform (STFT)** based spectral subtraction.

### 1. Analysis (STFT)
The signal is sliced into overlapping frames (Window Size: 2048 samples, Hop Size: 1024 samples). A **Hanning Window** is applied to each frame to reduce spectral leakage.

```math
X[k] = FFT(x[n] * w[n])
```

### 2. Noise Profiling
A "Noise Fingerprint" vector `N[k]` is computed.
*   **Manual Mode**: The STFT magnitudes of the provided noise buffer are averaged over time.
*   **Auto Mode**: The magnitudes of the first 5 frames of the target file are averaged.

```math
N[k] = (1/M) * sum(|NoiseFrame_m[k]|) from m=0 to M-1
```

### 3. Spectral Subtraction
For every frame of the target audio:
1.  Compute Magnitude `M[k]` and Phase `phi[k]`.
2.  Subtract the scaled noise profile from the magnitude.
    ```math
    M_new[k] = M[k] - (alpha * N[k])
    ```
    *(Where `alpha = 1.5` is the subtraction factor)*.
3.  Half-wave rectification ensures no negative magnitudes:
    ```math
    M_new[k] = max(0, M_new[k])
    ```

### 4. Reconstruction (ISTFT)
The modified magnitude is recombined with the *original phase* `phi[k]` (Noise is assumed to affect magnitude more than phase).

```math
Y[k] = M_new[k] * e^(j * phi[k])
```
The Inverse FFT is calculated, and the frames are reassembled using **Overlap-Add (OLA)**.

## Implementation Details
*   **Source File**: `packages/sonic-core/src/dsp/zig/main.zig`
*   **Function**: `process_spectral_denoise`
*   **Memory Management**: Allocates temporary buffers for FFT (`fft_buf`), noise profile (`noise_profile`), and output accumulation (`output_buf`) on the heap via a standard allocator.
*   **Optimization**: Uses an iterative FFT implementation (`math.fft_iterative`) to avoid recursion overhead.
