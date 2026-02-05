# Blueprint: SpectralMatch (EQ Cloning)

## 1. Overview
**Target:** Broadcast Editors
**Goal:** Make a "Target" recording sound like a "Reference" recording.
**Technique:** FFT-based LTAS (Long-Term Average Spectrum) matching.

## 2. DSP Algorithm (Zig)
This is a "Match EQ" process implemented in the frequency domain.

### A. Fingerprinting (Analysis Phase)
*   **Input:** Two buffers: `Reference` and `Target`.
*   **Process:**
    1.  Compute Power Spectrum (magnitude squared) for overlapping windows (Hanning, 4096 bins).
    2.  Average all windows to get `AvgSpec_Ref` and `AvgSpec_Tgt`.
    3.  **Smoothing:** Apply 1/3 octave smoothing to both spectra to mimic human hearing and avoid narrow resonances.

### B. Filter Generation
1.  **Quotient:** `Filter_Mag[k] = AvgSpec_Ref[k] / AvgSpec_Tgt[k]`.
2.  **Limiting:** Clamp the max gain/cut (e.g., +/- 12dB) to prevent noise boosting.
3.  **Phase:** Generate a **Linear Phase** or **Minimum Phase** filter from this magnitude response.
    *   *Linear Phase:* Constant group delay (pre-ringing risk).
    *   *Minimum Phase:* Natural phase shift (post-ringing only). Minimum Phase is usually better for dialogue. Use Cepstral method or Hilbert Transform if feasible, otherwise Linear Phase is easier (Inverse FFT with zero phase -> Window -> Shift).

### C. Application
*   **Convolution:** Convolve the `Target` audio with the generated Impulse Response (IR).
*   **FFT Convolution:** Use Overlap-Add for efficiency.

## 3. WASM Interface
```zig
// Phase 1: Analyze Reference
export fn spectralmatch_analyze_ref(ptr: [*]f32, len: usize) *AnalysisResult;

// Phase 2: Analyze Target & Process
export fn process_spectralmatch(
    target_ptr: [*]f32, 
    target_len: usize, 
    ref_analysis: *AnalysisResult,
    amount: f32, // 0.0 to 1.0 (Blend)
    smooth: f32  // Smoothing factor
) void;
```
*Note: We might simplify to just passing two buffers if the "Reference" is a selected region of the main track.*

## 4. TypeScript Bridge
*   **Workflow:**
    1.  User selects "Reference Region".
    2.  App calls `analyzeRef()`.
    3.  User selects "Target Region" (or whole file).
    4.  App calls `processMatch()`.

## 5. UI Components
*   **Visualizer:** Spectrum Analyzer showing "Source Curve", "Reference Curve", and "Delta Curve".
*   **Controls:**
    *   **Slider:** "Match Amount" (0-100%).
    *   **Slider:** "Smoothing" (Fine/Coarse).

## 6. Step-by-Step Implementation Plan
1.  **Smoothing Algo:** Implement fractional octave smoothing in Zig.
2.  **IR Gen:** Implement Linear Phase IR generation from magnitude spectrum.
3.  **Convolution:** Implement fast FFT convolution (Overlap-Add).
4.  **State:** Manage the "Reference Fingerprint" persistence in the WASM heap.
