# Echo Vanish

## Purpose
Echo Vanish is a dereverberation tool designed to remove room ambiance, echo, and "boxiness" from recordings. Unlike a simple gate (which only silences gaps), Echo Vanish actively suppresses the "tail" of the sound while the sound is playing, tightening up vocals or instruments recorded in untreated rooms.

## How to Use
1.  Select **Echo Vanish**.
2.  Adjust **Amount**: Start low (0.5) and increase until the room sound disappears.
3.  Adjust **Tail (ms)**: Estimate the length of the reverb tail (e.g., 100ms for a small room, 500ms for a hall).
4.  Click **Run**.

## Parameters
*   **Amount**: The intensity of the suppression.
    *   *Range*: 0.0 - 1.0
*   **Tail (ms)**: The prediction horizon (how far back to look for correlations).
    *   *Range*: 10 ms - 2000 ms

## Math and Algorithms
The algorithm is based on the **Weighted Prediction Error (WPE)** method, a state-of-the-art technique for blind dereverberation.

### 1. The Reverb Model
Reverb is modeled as a convolution of the source signal with a Room Impulse Response (RIR). The "Late Reverberation" (the tail) is highly correlated with the "Direct Signal" (the dry sound), but delayed.
$$ y[n] = x[n] + \text{LateReverb}(x[n]) $$

### 2. Linear Prediction
WPE attempts to predict the Late Reverberation component of the current frame $Y_n$ based on a history of previous frames $Y_{n-D} \dots Y_{n-D-K}$.
$$ \hat{R}[n] = \sum_{k=0}^{K} G_k^H \cdot Y[n - D - k] $$
Where:
*   $D$: Delay (skip early reflections to preserve body).
*   $K$: Prediction Order (derived from `Tail ms`).
*   $G$: Prediction Filter Weights.

### 3. Decorrelation (The "Vanish")
The filter weights $G$ are estimated to minimize the variance of the residual (the prediction error). Since the dry signal is unpredictable (uncorrelated with its past in the long term) and reverb IS predictable, removing the predicted component removes the reverb.
$$ \text{Clean}[n] = Y[n] - \text{Amount} \cdot \hat{R}[n] $$

### Implementation (Simplified WPE)
This module implements a computationally efficient variant of WPE in the Short-Time Fourier Transform (STFT) domain.
1.  **STFT**: Convert to frequency domain.
2.  **MIMO Linear Solver**: For each frequency bin, a linear system $R \cdot G = P$ is solved to find the prediction filter $G$.
3.  **Subtraction**: The predicted reverb tail is subtracted from the spectrum.
4.  **ISTFT**: Signal is reconstructed.

## Implementation Details
*   **Source File**: `packages/sonic-core/src/dsp/zig/echovanish.zig`
*   **Function**: `process_echovanish`
*   **Optimization**: Uses a simplified correlation matrix update and Gaussian Elimination (`solve_linear_system`) instead of recursive least squares for stability on short buffers.
