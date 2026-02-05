/**
 * Dithering Utility for SonicForge
 *
 * Implements TPDF (Triangular Probability Density Function) dithering
 * for audio bit-depth reduction.
 */

/**
 * Quantizes a single sample to the target bit depth.
 * This is a helper function that performs the quantization without dithering.
 *
 * @param sample The normalized float sample (-1.0 to 1.0)
 * @param bitDepth The target bit depth (e.g., 16, 24)
 * @returns The quantized sample in normalized float range
 */
export function quantize(sample: number, bitDepth: number): number {
  // Validate bit depth
  if (Number.isNaN(bitDepth) || bitDepth < 8 || bitDepth > 32) {
    bitDepth = 16;
  }

  const scale = Math.pow(2, bitDepth - 1);

  // Scale up
  let val = sample * scale;

  // Round
  val = Math.round(val);

  // Scale down
  val = val / scale;

  // Hard clip
  if (val > 1.0) return 1.0;
  if (val < -1.0) return -1.0;

  return val;
}

/**
 * Applies TPDF dither to a buffer of audio samples in-place.
 *
 * Logic:
 * 1. Scale up to integer domain
 * 2. Add TPDF noise (sum of two random uniform variables)
 * 3. Round to nearest integer
 * 4. Scale back down to normalized float
 * 5. Hard clip to [-1.0, 1.0]
 *
 * @param buffer The audio buffer to process (modified in-place)
 * @param targetBitDepth The target bit depth (default 16, range 8-32)
 * @returns The same buffer instance (modified)
 */
export function applyDither(buffer: Float32Array, targetBitDepth: number): Float32Array {
  // Basic validation
  let depth = targetBitDepth;
  if (typeof depth !== 'number' || Number.isNaN(depth) || depth < 8 || depth > 32) {
    depth = 16;
  }

  const scale = Math.pow(2, depth - 1);
  const len = buffer.length;

  for (let i = 0; i < len; i++) {
    const sample = buffer[i];

    // 1. Scale up
    let val = sample * scale;

    // 2. Add TPDF noise
    // noise = (Math.random() - Math.random()) * 1 LSB (which is 1.0 in scaled domain)
    const noise = Math.random() - Math.random();
    val += noise;

    // 3. Round
    val = Math.round(val);

    // 4. Scale down
    val = val / scale;

    // 5. Hard clip
    if (val > 1.0) {
      val = 1.0;
    } else if (val < -1.0) {
      val = -1.0;
    }

    buffer[i] = val;
  }

  return buffer;
}
