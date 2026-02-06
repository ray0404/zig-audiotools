# SonicPress DSP Manifest

This document serves as the roadmap for the next generation of "Smart Tools" in SonicPress. These tools are designed to be high-performance, offline (batch) restoration and mastering utilities, implemented in Zig and compiled to WebAssembly.

## 1. "EchoVanish" (Algorithmic De-Reverb)
*   **Target:** Dialogue Editors / Podcasters
*   **Why:** Room ambience is the #1 killer of amateur recordings. Standard gates sound choppy. An offline "Weighted Prediction Error" algorithm can statistically estimate the "late reflections" (reverb tail) and subtract them without affecting the direct voice.
*   **How:**
    *   **Algorithm:** Implement **Weighted Prediction Error (WPE)** or a modified **Linear Predictive Coding (LPC)** residual estimator in Zig.
    *   **Implementation:**
        1.  **STFT Analysis:** Break the signal into overlapping frames (e.g., 64ms windows).
        2.  **Prediction:** For each frequency bin, calculate a prediction filter that estimates the current frame based on previous frames (the "tail").
        3.  **Subtraction:** Subtract this predicted "tail" from the current frame to leave the "direct" signal.
        4.  **Multi-pass:** Since this is offline, run a first pass to estimate the Reverb Time (RT60) and optimizing the prediction filter length, then a second pass for processing.
    *   **Dependencies:** `fftiny.zig` (or comparable Zig FFT implementation) for STFT.

## 2. "PlosiveGuard" (Targeted Low-End Restoration)
*   **Target:** Voiceover Artists / Singers
*   **Why:** "P" and "B" pops ruin otherwise perfect takes. High-passing everything kills the voice's body.
*   **How:**
    *   **Algorithm:** Dynamic band-selective attenuation triggered by spectral flux.
    *   **Implementation:**
        1.  **Split-Band:** Use a crossover (Linkwitz-Riley) to isolate Lows (<150Hz) from Highs.
        2.  **Detection:** Monitor the Low band for "Sudden Flux" (massive energy spike within <50ms) that exceeds the average Low energy by +12dB.
        3.  **Action:** When detected, applying a fast-attack (2ms), slow-release (100ms) gain reduction *only* to the Low band.
        4.  **Recombination:** Sum the processed Lows back with the untouched Highs.

## 3. "SpectralMatch" (EQ Cloning)
*   **Target:** Broadcast / Continuity Editors
*   **Why:** Matching the "tone" of a pickup recording (recorded later) to the original take is difficult.
*   **How:**
    *   **Algorithm:** FFT-based Spectrum Matching via Impulse Response generation.
    *   **Implementation:**
        1.  **Fingerprinting:** Calculate the Long-Term Average Spectrum (LTAS) of the "Reference" file using averaged FFT windows.
        2.  **Target Analysis:** Calculate the LTAS of the "Target" file.
        3.  **Difference Curve:** Compute `Reference_Magnitude / Target_Magnitude` per frequency bin to get the "Correction Filter."
        4.  **Smoothing:** Apply spectral smoothing (e.g., 1/3 octave) to the curve to avoid "ringing" artifacts.
        5.  **Convolution:** Generate a linear-phase FIR filter from this curve and convolve the Target audio with it.

## 4. "DeBleed Lite" (Cross-Channel Interference Removal)
*   **Target:** Multi-mic Podcasters
*   **Why:** Guest B's voice leaking into Host A's mic causes "comb filtering" and echo.
*   **How:**
    *   **Algorithm:** Sidechain Spectral Subtraction.
    *   **Implementation:**
        1.  **Assumption:** Requires 2 synchronized mono buffers (Mic A, Mic B).
        2.  **Gate Logic:** Calculate RMS envelopes for both. If `Mic A > Mic B + Threshold`, assume Mic A is active.
        3.  **Spectral Subtraction:** In the frequency domain, subtract the magnitude spectrum of Mic A (scaled down) from Mic B. This removes the "bleed" of A's voice from B's track more naturally than a hard gate.

## 5. "TapeStabilizer" (Wow & Flutter Correction)
*   **Target:** Archivists / Lofi Producers
*   **Why:** Tape/Vinyl digitization often has pitch wobble. Fixing this usually costs $300+ (Capstan).
*   **How:**
    *   **Algorithm:** Pitch Tracking + Variable Speed Resampling.
    *   **Implementation:**
        1.  **Tracking:** Use an autocorrelation-based pitch detector (like YIN) to track a steady tonal component (or a specific bias tone if known).
        2.  **Deviation:** Calculate the deviation of this tone from its average center frequency.
        3.  **Correction:** Invert this deviation curve to create a "Speed Map."
        4.  **Resampling:** Use a high-quality Sinc interpolator to resample the audio, speeding up when the pitch sags and slowing down when it spikes.

## 6. "SmartLevel" (Musical Gain Riding)
*   **Target:** Podcasters
*   **Why:** Listeners hate volume adjustments. Compression sounds "pump-y."
*   **How:**
    *   **Algorithm:** Inverse Automation ("Riding the Fader").
    *   **Implementation:**
        1.  **RMS Window:** Scan the file with a sliding RMS window (e.g., 300ms).
        2.  **Target Calculation:** `Gain_dB = Target_LUFS - Current_RMS`.
        3.  **Inertia:** Apply heavy smoothing (Attack: 500ms, Release: 1000ms) to this gain value so it behaves like a human hand slowly moving a fader, rather than a fast compressor.
        4.  **Clamping:** Limit max gain change to +/- 6dB to avoid bringing up noise floor too much.

## 7. "PsychoDynamic EQ" (Perceptual Balancing)
*   **Target:** Mastering Engineers
*   **Why:** Static EQ doesn't account for how the ear perceives loudness (Fletcher-Munson). A mix that sounds good loud sounds thin when quiet.
*   **How:**
    *   **Algorithm:** Dynamic EQ weighted by ISO 226:2003 Equal Loudness Contours.
    *   **Implementation:**
        1.  **Bands:** 3 dynamic bell filters (Low, Mid, High).
        2.  **Weighting:** As the input RMS drops, the Low and High filters automatically increase their gain (recreating the "Loudness" button effect), and decrease as RMS rises.
        3.  **Inverse:** The Mid band can slightly dip as volume rises to reduce harshness.

## 8. "VoiceIsolate" (Lightweight ML Denoise)
*   **Target:** Content Creators
*   **Why:** RNN-based denoising (like RNNoise) is incredibly effective for voice but hard to implement.
*   **How:**
    *   **Algorithm:** Recurrent Neural Network (GRU/LSTM).
    *   **Implementation:**
        1.  **Model:** Port the C-based **RNNoise** inference code to Zig.
        2.  **Weights:** Embed the pre-trained standard model weights directly into the Zig binary (or load as a separate WASM asset).
        3.  **Process:** The model takes a frame of audio, outputs a "gain mask" for 22 frequency bands.
        4.  **Apply:** Multiply the STFT bands of the noisy audio by this mask to silence non-voice frequencies.

## 9. "StereoExpanse" (Mid-Side Decorrelation)
*   **Target:** Archivists / Music Remastering
*   **Why:** Old mono recordings sound flat. Modern listeners expect width.
*   **How:**
    *   **Algorithm:** Mid/Side Decomposition + Decorrelation.
    *   **Implementation:**
        1.  **M/S Encode:** Convert Stereo L/R to Mid (L+R) and Side (L-R). If mono, Mid = Input, Side = Silence.
        2.  **Synthesis:** If Side is silent (Mono source), create a "Fake Side" signal by copying Mid and passing it through a Decorrelator (All-pass filter chain + 10ms Delay).
        3.  **EQ:** High-pass the Side channel (cut < 200Hz) to keep bass mono.
        4.  **M/S Decode:** Convert back to L/R.
