# Voice Isolate

## Purpose
Voice Isolate is a noise reduction tool designed to separate human speech from background noise. It typically uses machine learning or advanced spectral masking. In this simplified high-performance implementation, it acts as a **Spectral Noise Gate**, attenuating frequency bands where the energy is below a "speech-like" threshold.

## How to Use
1.  Select **Voice Isolate**.
2.  Adjust **Amount** (0.0 to 1.0) to control the blend of the isolation effect.
3.  Click **Run**.

## Parameters
*   **Amount**: The intensity of the background suppression.
    *   *Range*: 0.0 (Bypass) - 1.0 (Max Isolation)

## Math and Algorithms
The implementation is based on **Bark-Scale Spectral Masking**.

### 1. STFT Analysis
The signal is transformed into the frequency domain using a Window Size of 1024 samples.

### 2. Bark Band Integration
The 513 unique frequency bins are mapped onto **22 Bark Scale Bands**. The Bark scale approximates the critical bands of human hearing. The energy in each band is calculated.
$$ E_b = \sum_{k \in Band_b} |X[k]|^2 $$

### 3. "Inference" / Gating
While the architecture supports a GRU/RNN inference model, the current lightweight implementation uses a heuristic energy thresholding per band.
*   If a band's energy exceeds a dynamic threshold (indicating speech formants), the gain is set to 1.0.
*   If energy is low (background noise), the gain is reduced (e.g., 0.1).

### 4. Mask Application
The computed gain mask (22 values) is interpolated back to the linear frequency bins and multiplied with the complex spectrum.
$$ X_{new}[k] = X[k] \cdot \text{Mask}[k] $$

### 5. Reconstruction
An Inverse STFT with Overlap-Add reconstruction creates the final isolated audio.

## Implementation Details
*   **Source File**: `packages/sonic-core/src/dsp/zig/voice_isolate.zig`
*   **Function**: `process_voiceisolate`
*   **Architecture**: Designed to swap the simple heuristic with a `.tflite` or custom weight-based inference engine in the future (`VoiceIsolateModel` struct).
