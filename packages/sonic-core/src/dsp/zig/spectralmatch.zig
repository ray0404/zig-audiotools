const std = @import("std");
const math = @import("math_utils.zig");

var gpa = std.heap.GeneralPurposeAllocator(.{}){};
const allocator = gpa.allocator();

pub const AnalysisResult = struct {
    power_spectrum: []f32,
    size: usize,
};

const WINDOW_SIZE: usize = 4096;
const HOP_SIZE: usize = 2048;

fn create_hanning_window(size: usize) ![]f32 {
    const window = try allocator.alloc(f32, size);
    var i: usize = 0;
    while (i < size) : (i += 1) {
        window[i] = 0.5 * (1.0 - std.math.cos(math.TWO_PI * @as(f32, @floatFromInt(i)) / @as(f32, @floatFromInt(size - 1))));
    }
    return window;
}

// 1/3 Octave Smoothing
// Simple implementation: Moving average with width proportional to frequency
fn smooth_spectrum(spectrum: []f32) void {
    const len = spectrum.len;
    // We need a temp buffer
    const temp = allocator.alloc(f32, len) catch return;
    defer allocator.free(temp);
    @memcpy(temp, spectrum);

    const octave_width: f32 = 0.333; // 1/3 octave
    const factor = std.math.pow(f32, 2.0, octave_width) - 1.0; // Approximation of bandwidth

    var i: usize = 0;
    while (i < len) : (i += 1) {
        // Determine window width for this bin
        // Width roughly proportional to index
        const width = @as(f32, @floatFromInt(i)) * factor;
        var w_int = @as(usize, @intFromFloat(width));
        if (w_int < 1) w_int = 1;

        const start = if (i > w_int) i - w_int else 0;
        const end = if (i + w_int >= len) len - 1 else i + w_int;

        var sum: f32 = 0;
        const count = @as(f32, @floatFromInt(end - start + 1));

        var j = start;
        while (j <= end) : (j += 1) {
            sum += temp[j];
        }

        spectrum[i] = sum / count;
    }
}

// Analyze spectrum of a buffer
// Returns a heap-allocated array of power spectrum
fn analyze_signal(data: []f32) ![]f32 {
    const spec_size = WINDOW_SIZE / 2; // Real FFT magnitude size (ignoring DC/Nyquist symmetry for now or keeping strictly positive)
    // Actually math_utils FFT is Complex->Complex size N.
    // Result is symmetric. We only care about 0..N/2.

    const avg_spec = try allocator.alloc(f32, spec_size);
    @memset(avg_spec, 0);

    const window = try create_hanning_window(WINDOW_SIZE);
    defer allocator.free(window);

    const fft_buf = try allocator.alloc(math.Complex, WINDOW_SIZE);
    defer allocator.free(fft_buf);

    var pos: usize = 0;
    var frames: usize = 0;

    while (pos + WINDOW_SIZE <= data.len) : (pos += HOP_SIZE) {
        // Prepare frame
        var i: usize = 0;
        while (i < WINDOW_SIZE) : (i += 1) {
            fft_buf[i] = .{ .re = data[pos + i] * window[i], .im = 0 };
        }

        math.fft_iterative(fft_buf, false);

        // Accumulate Power
        i = 0;
        while (i < spec_size) : (i += 1) {
            const mag = fft_buf[i].magnitude();
            avg_spec[i] += mag * mag; // Power
        }
        frames += 1;
    }

    if (frames > 0) {
        var i: usize = 0;
        while (i < spec_size) : (i += 1) {
            avg_spec[i] /= @as(f32, @floatFromInt(frames));
        }
    }

    // Smooth immediately? Yes, usually good for "Fingerprint"
    smooth_spectrum(avg_spec);

    return avg_spec;
}

export fn spectralmatch_analyze_ref(ptr: [*]f32, len: usize) ?*AnalysisResult {
    const data = ptr[0..len];
    const spec = analyze_signal(data) catch return null;

    const result = allocator.create(AnalysisResult) catch return null;
    result.* = .{
        .power_spectrum = spec,
        .size = spec.len,
    };
    return result;
}

export fn spectralmatch_free_analysis(ptr: *AnalysisResult) void {
    allocator.free(ptr.power_spectrum);
    allocator.destroy(ptr);
}

export fn process_spectralmatch(
    target_ptr: [*]f32,
    target_len: usize,
    ref_analysis: *AnalysisResult,
    amount: f32, // 0.0 to 1.0
    smooth_factor: f32 // Not used in this simple impl, or could use for smoothing target
) void {
    _ = smooth_factor;
    const target_data = target_ptr[0..target_len];

    // 1. Analyze Target
    const target_spec = analyze_signal(target_data) catch return;
    defer allocator.free(target_spec);

    // 2. Compute Filter Magnitude
    // Filter = Ref / Target
    // We work with Power Spectrum, so MagResponse = sqrt(Ref/Target)
    const filter_len = ref_analysis.size;
    const filter_mag = allocator.alloc(f32, filter_len) catch return;
    defer allocator.free(filter_mag);

    var i: usize = 0;
    while (i < filter_len) : (i += 1) {
        const ref = ref_analysis.power_spectrum[i];
        const tgt = target_spec[i] + 1e-9; // Avoid div by zero

        const ratio = ref / tgt;

        // Convert to dB to clamp
        var db = math.linearToDb(std.math.sqrt(ratio));

        // Clamp +/- 12dB
        if (db > 12.0) db = 12.0;
        if (db < -12.0) db = -12.0;

        // Apply amount
        db *= amount;

        filter_mag[i] = math.dbToLinear(db);
    }

    // 3. Generate Linear Phase IR
    // Construct full complex spectrum
    const fft_size = WINDOW_SIZE;
    const ir_spec = allocator.alloc(math.Complex, fft_size) catch return;
    defer allocator.free(ir_spec);

    // Linear Phase: Constant Group Delay of N/2
    // Phase = -2*pi*k * (N/2) / N = -pi*k
    // wait, delay is in samples. N/2 samples.
    // phase slope.

    // Actually, simple method:
    // Create Magnitude buffer (symmetric)
    // Inverse FFT to get zero-phase IR (centered at 0, wraps around)
    // Rotate (circular shift) by N/2 to center it.

    // Fill ir_spec
    i = 0;
    while (i < fft_size) : (i += 1) {
        ir_spec[i] = .{ .re = 0, .im = 0 };
    }

    i = 0;
    while (i < filter_len) : (i += 1) {
        ir_spec[i].re = filter_mag[i];
    }
    // Mirror for real signal
    // filter_len is N/2.
    // Nyquist at N/2.
    // 0..N/2-1 are positive freqs.
    // N/2 is Nyquist.
    // N/2+1 .. N-1 are negative freqs (mirrored)

    // If filter_len is N/2, it includes 0..N/2-1.
    // Wait, analyze_signal loops 0..spec_size (WINDOW_SIZE/2).
    // So 0 to 2047.
    // 2048 is Nyquist.

    i = 1;
    while (i < filter_len) : (i += 1) {
        ir_spec[fft_size - i] = ir_spec[i];
    }

    // Inverse FFT -> Zero Phase IR
    math.fft_iterative(ir_spec, true);

    // Extract Real part and Shift to make it Linear Phase (Casual)
    const ir = allocator.alloc(f32, fft_size) catch return;
    defer allocator.free(ir);

    const shift = fft_size / 2;
    i = 0;
    while (i < fft_size) : (i += 1) {
        var src_idx = i;
        // Logic for circular shift by N/2
        // index i in output corresponds to i - shift in input (modulo N)
        // if i < shift, idx = N - shift + i
        // if i >= shift, idx = i - shift
        if (i < shift) {
            src_idx = fft_size - shift + i;
        } else {
            src_idx = i - shift;
        }
        ir[i] = ir_spec[src_idx].re;
    }

    // Apply Window to IR to smooth edges
    const window = create_hanning_window(fft_size) catch return;
    defer allocator.free(window);
    i = 0;
    while (i < fft_size) : (i += 1) {
        ir[i] *= window[i];
    }

    // 4. Convolution (Overlap-Add)
    // We will process the target buffer using this IR

    const output_buf = allocator.alloc(f32, target_len + fft_size) catch return; // Extra space for tail
    defer allocator.free(output_buf);
    @memset(output_buf, 0);

    // Actually standard Overlap-Add:
    // Block size L. IR size M. FFT size N >= L + M - 1.
    // Here our IR is size N (4096).
    // So we need FFT size at least 4096 + L.
    // This implies we need a larger FFT for convolution or we perform block convolution with smaller blocks?
    // Or we use the 4096 IR.
    // If IR is 4096, and we want to convolve, we probably need N=8192 FFTs.

    // Simplification: Truncate IR?
    // 4096 samples at 48k is 85ms. Pretty long.
    // But let's assume we can use a larger FFT for convolution.

    // Let's implement simple time-domain convolution for clarity/robustness if N is small?
    // No, 4096^2 is too slow.

    // Let's use N=8192 for convolution.
    const N = 8192;
    const L = N - fft_size + 1; // Block size

    const fft_conv_buf = allocator.alloc(math.Complex, N) catch return;
    defer allocator.free(fft_conv_buf);

    // Prepare IR spectrum for N=8192
    const ir_padded = allocator.alloc(math.Complex, N) catch return;
    defer allocator.free(ir_padded);
    @memset(ir_padded, .{ .re=0, .im=0 });

    i = 0;
    while (i < fft_size) : (i += 1) {
        ir_padded[i] = .{ .re = ir[i], .im = 0 };
    }
    math.fft_iterative(ir_padded, false);

    var pos: usize = 0;
    while (pos < target_len) : (pos += L) {
        // Read block L
        @memset(fft_conv_buf, .{ .re=0, .im=0 });

        var blockSize = L;
        if (pos + blockSize > target_len) blockSize = target_len - pos;

        var j: usize = 0;
        while (j < blockSize) : (j += 1) {
            fft_conv_buf[j].re = target_data[pos + j];
        }

        math.fft_iterative(fft_conv_buf, false);

        // Multiply
        j = 0;
        while (j < N) : (j += 1) {
            fft_conv_buf[j] = fft_conv_buf[j].mul(ir_padded[j]);
        }

        math.fft_iterative(fft_conv_buf, true);

        // Add to output
        j = 0;
        while (j < N and pos + j < output_buf.len) : (j += 1) {
            output_buf[pos + j] += fft_conv_buf[j].re;
        }
    }

    // Copy back to target (truncating tail)
    @memcpy(target_data, output_buf[0..target_len]);
}
