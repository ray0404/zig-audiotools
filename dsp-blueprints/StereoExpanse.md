# Blueprint: StereoExpanse (Mid-Side Decorrelation)

## 1. Overview
**Target:** Archivists
**Goal:** Turn mono recordings into fake stereo, or widen narrow stereo.
**Technique:** Mid-Side processing + Side Synthesis via Decorrelation.

## 2. DSP Algorithm (Zig)

### A. M/S Encode
1.  `Mid = (L + R) * 0.5`
2.  `Side = (L - R) * 0.5`

### B. Decorrelation (Side Synthesis)
If the source is Mono, `Side` is 0. We need to manufacture a Side signal.
1.  `FakeSide = Mid`.
2.  **Delay:** Delay `FakeSide` by ~10-20ms.
3.  **All-Pass Chain:** Run `FakeSide` through 3-4 series All-Pass filters to scramble phase without altering frequency response.
4.  **EQ:** High-Pass `FakeSide` at 200Hz (keep bass mono!).
5.  **Mixing:** `Side = OriginalSide + (FakeSide * Amount)`.

### C. M/S Decode
1.  `L = Mid + Side`
2.  `R = Mid - Side`

## 3. WASM Interface
```zig
export fn process_stereoexpanse(
    ptr: [*]f32, // Interleaved
    len: usize,
    width: f32, // 0.0 (Mono) to 2.0 (Extra Wide)
    synthesis: f32 // 0.0 (Off) to 1.0 (Full Fake Stereo)
) void;
```

## 4. TypeScript Bridge
*   Must handle Interleaved Stereo buffer.

## 5. UI Components
*   **Visualizer:** Vectorscope / Goniometer.
*   **Controls:**
    *   **Knob:** "Width" (M/S Ratio).
    *   **Knob:** "Synthesis" (Artificial Width).
    *   **Knob:** "Delay" (10-30ms).

## 6. Step-by-Step Implementation Plan
1.  **M/S:** Implement encode/decode.
2.  **Delay Line:** Implement a circular buffer in Zig.
3.  **Decorrelator:** Reuse All-Pass from `main.zig`.
4.  **WASM:** Export `process_stereoexpanse`.
