const std = @import("std");
const math = @import("math_utils.zig");

var gpa = std.heap.GeneralPurposeAllocator(.{}){};
const allocator = gpa.allocator();

// Solves A * X = B for X, where A is n*n matrix, B is n*1 vector.
// A and B are modified in place. X is output.
fn solve_linear_system(n: usize, A: []math.Complex, B: []math.Complex, X: []math.Complex) void {
    // Gaussian elimination with partial pivoting
    var i: usize = 0;
    while (i < n) : (i += 1) {
        // Find pivot
        var max_row = i;
        var max_val: f32 = A[i * n + i].magnitude();

        var k: usize = i + 1;
        while (k < n) : (k += 1) {
            const val = A[k * n + i].magnitude();
            if (val > max_val) {
                max_val = val;
                max_row = k;
            }
        }

        // Swap rows
        if (max_row != i) {
            var j: usize = i;
            while (j < n) : (j += 1) {
                const temp = A[i * n + j];
                A[i * n + j] = A[max_row * n + j];
                A[max_row * n + j] = temp;
            }
            const temp_b = B[i];
            B[i] = B[max_row];
            B[max_row] = temp_b;
        }

        // Eliminate
        if (max_val < 1e-9) continue; // Singular or near-singular

        k = i + 1;
        while (k < n) : (k += 1) {
            const factor = A[k * n + i].div(A[i * n + i]);

            var j: usize = i;
            while (j < n) : (j += 1) {
                // A[k][j] -= factor * A[i][j]
                A[k * n + j] = A[k * n + j].sub(factor.mul(A[i * n + j]));
            }
            // B[k] -= factor * B[i]
            B[k] = B[k].sub(factor.mul(B[i]));
        }
    }

    // Back substitution
    var i_back: isize = @as(isize, @intCast(n)) - 1;
    while (i_back >= 0) : (i_back -= 1) {
        const row = @as(usize, @intCast(i_back));
        var sum = math.Complex{ .re = 0, .im = 0 };

        var j: usize = row + 1;
        while (j < n) : (j += 1) {
            sum = sum.add(A[row * n + j].mul(X[j]));
        }

        // X[row] = (B[row] - sum) / A[row][row]
        X[row] = B[row].sub(sum).div(A[row * n + row]);
    }
}

pub fn process_echovanish(ptr: [*]f32, len: usize, sample_rate: f32, reduction_amount: f32, tail_length_ms: f32) void {
    const data = ptr[0..len];
    const window_size = 2048;
    const hop_size = window_size / 2; // 50% overlap

    // Calculate prediction order K based on tail_length_ms
    // tail_length_ms (e.g. 100ms) / hop_time (21ms) ~= 5 frames
    const hop_time_ms = (@as(f32, @floatFromInt(hop_size)) / sample_rate) * 1000.0;
    var K = @as(usize, @intFromFloat(tail_length_ms / hop_time_ms));
    if (K < 2) K = 2;
    if (K > 15) K = 15; // Limit complexity for performance

    const delay = 3; // Delay D (keep early reflections)

    // Window function
    const window = allocator.alloc(f32, window_size) catch return;
    defer allocator.free(window);
    for (window, 0..) |_, idx| {
        // Hanning window
        window[idx] = 0.5 * (1.0 - std.math.cos(math.TWO_PI * @as(f32, @floatFromInt(idx)) / @as(f32, @floatFromInt(window_size - 1))));
    }

    // Number of frames
    const num_frames = (len - window_size) / hop_size + 1;
    if (num_frames < K + delay + 1) return; // Not enough data

    // Allocate STFT buffer: [frames][bins]
    // Flattened: frames * window_size (since we store complex, actually window_size usually stores redundant half but we'll store full for simplicity in fft_iterative)
    // Actually fft_iterative is in-place on window_size.
    // We only need the positive frequencies (window_size / 2 + 1), but to allow simple inverse, let's keep it all or handle symmetry.
    // For WPE, we treat each bin independently. We only need to process bins 0 to window_size/2.

    // To save memory, let's allocate a "spectrogram" buffer
    // num_frames * (window_size / 2 + 1) Complex
    const num_bins = window_size / 2 + 1;
    const stft_data = allocator.alloc(math.Complex, num_frames * num_bins) catch return;
    defer allocator.free(stft_data);

    // 1. Analysis STFT
    const fft_buf = allocator.alloc(math.Complex, window_size) catch return;
    defer allocator.free(fft_buf);

    var frame_idx: usize = 0;
    while (frame_idx < num_frames) : (frame_idx += 1) {
        const pos = frame_idx * hop_size;

        // Windowing and Fill
        for (0..window_size) |k| {
            fft_buf[k] = .{ .re = data[pos + k] * window[k], .im = 0 };
        }

        math.fft_iterative(fft_buf, false);

        // Copy positive freq to stft_data
        for (0..num_bins) |k| {
            stft_data[frame_idx * num_bins + k] = fft_buf[k];
        }
    }

    // 2. WPE Processing per bin
    // Allocate scratch space for matrix solver
    const mat_A = allocator.alloc(math.Complex, K * K) catch return;
    defer allocator.free(mat_A);
    const vec_B = allocator.alloc(math.Complex, K) catch return;
    defer allocator.free(vec_B);
    const vec_G = allocator.alloc(math.Complex, K) catch return;
    defer allocator.free(vec_G);

    // Pre-allocate prediction vector x_n (size K)
    const vec_x = allocator.alloc(math.Complex, K) catch return;
    defer allocator.free(vec_x);

    var bin: usize = 0;
    while (bin < num_bins) : (bin += 1) {
        // For this bin, we have a time series across frames
        // We need to estimate G to minimize residual.
        // We'll use a simplified correlation method over the whole duration.

        // Reset R (mat_A) and P (vec_B)
        @memset(mat_A, .{ .re = 0, .im = 0 });
        @memset(vec_B, .{ .re = 0, .im = 0 });

        // Accumulate correlations
        // Start from frame where history is available
        const start_frame = delay + K;

        var n: usize = start_frame;
        while (n < num_frames) : (n += 1) {
            const current_val = stft_data[n * num_bins + bin];

            // Construct history vector x(n)
            // x(n) = [X(n-delay), X(n-delay-1), ..., X(n-delay-K+1)]^T
            for (0..K) |k| {
                const hist_frame = n - delay - k;
                vec_x[k] = stft_data[hist_frame * num_bins + bin];
            }

            // Simple power weighting (optional, often used in WPE to normalize)
            // For simplicity, we skip time-varying variance weighting (using Identity).
            // This makes it standard Linear Prediction.

            // Update R = R + x * x^H
            for (0..K) |r| {
                for (0..K) |c| {
                    // x[r] * conj(x[c])
                    const term = vec_x[r].mul(vec_x[c].conjugate());
                    mat_A[r * K + c] = mat_A[r * K + c].add(term);
                }
            }

            // Update P = P + x * conj(current_val)
            for (0..K) |r| {
                const term = vec_x[r].mul(current_val.conjugate());
                vec_B[r] = vec_B[r].add(term);
            }
        }

        // Regularization for stability
        const reg = 1e-5; // Small epsilon
        for (0..K) |k| {
            mat_A[k * K + k].re += reg;
        }

        // Solve R * G = P
        solve_linear_system(K, mat_A, vec_B, vec_G);

        // Apply prediction and subtraction
        // We iterate again
        n = start_frame;
        while (n < num_frames) : (n += 1) {
            const current_val = stft_data[n * num_bins + bin];

            // Reconstruct x(n)
            for (0..K) |k| {
                const hist_frame = n - delay - k;
                vec_x[k] = stft_data[hist_frame * num_bins + bin];
            }

            // Predict: y_hat = G^H * x = sum(conj(G[k]) * x[k])
            var prediction = math.Complex{ .re = 0, .im = 0 };
            for (0..K) |k| {
                prediction = prediction.add(vec_G[k].conjugate().mul(vec_x[k]));
            }

            // Subtract
            // Y = X - alpha * Prediction
            const scaled_pred = math.Complex{
                .re = prediction.re * reduction_amount,
                .im = prediction.im * reduction_amount
            };

            stft_data[n * num_bins + bin] = current_val.sub(scaled_pred);
        }
    }

    // 3. Synthesis (Inverse STFT)
    // Clear output buffer first (overlap-add)
    @memset(data, 0);

    // We need a temp output buffer because we cannot write directly to 'data' which is used for overlap-add
    // wait, 'data' is the input buffer, we can overwrite it if we zero it out first?
    // No, we need to accumulate. So we zero it out and add.
    // BUT 'data' was the input. If we zero it, we lose input for subsequent frames if we haven't processed them?
    // We already processed all analysis into `stft_data`. So 'data' is free to be overwritten.

    // Create a large accumulation buffer if 'data' is not large enough?
    // 'data' has size 'len'. It is large enough.

    // However, we need to be careful. STFT loop was done. data contains input.
    // We can memset it to 0 now.
    @memset(data, 0);

    frame_idx = 0;
    while (frame_idx < num_frames) : (frame_idx += 1) {
        const pos = frame_idx * hop_size;

        // Reconstruct full spectrum from positive bins
        for (0..num_bins) |k| {
            fft_buf[k] = stft_data[frame_idx * num_bins + k];
        }
        // Symmetric part
        var k: usize = num_bins;
        while (k < window_size) : (k += 1) {
            const sym_idx = window_size - k;
            fft_buf[k] = fft_buf[sym_idx].conjugate();
        }

        math.fft_iterative(fft_buf, true); // Inverse

        // Overlap-Add with Window
        // Use the same window for synthesis (or satisfy COLA constraint)
        // With 50% overlap and Hanning^2, it sums to constant.
        // Hanning * Hanning is not COLA for 50%.
        // Standard is: Analysis Window -> FFT -> Processing -> IFFT -> Synthesis Window -> Add.
        // Hanning w(n) = 0.5(1-cos). w(n)^2 + w(n+hop)^2 ?
        // For 50% overlap, sine window is COLA (sin^2 + cos^2 = 1).
        // Hanning is approx ok if we normalize.
        // Or we just skip synthesis window and rely on analysis window + overlap.
        // Let's apply window again to suppress blocking artifacts (standard WOLA).

        for (0..window_size) |j| {
            if (pos + j < len) {
                data[pos + j] += fft_buf[j].re * window[j];
            }
        }
    }

    // Gain compensation for windowing
    // For Hanning 50% WOLA, the gain factor is needed.
    // Sum of w[n]^2 for Hanning with 50% overlap is approx 1.5 * N / hop ?
    // Actually sum w[n] = 0.5 N.
    // 50% overlap of Hanning squared sums to ...
    // Let's just normalize empirically or use standard factor.
    // Factor for Hanning window overlap-add is usually 1 / sum(window^2 / hop_size) ?
    // Let's try 2.0/3.0 gain or similar.
    // Hanning coherent gain is 0.5.

    // Normalization loop
    // To match input level roughly
    // Simple way: Calculate scaling factor.
    // The accumulated window function sum can be precalculated.
    // For Hanning 50% overlap, the sum of squared windows is not perfectly constant but close (modulations).
    // Let's assume a factor.
    const scaling = 4.0 / 3.0; // Approximation for Hanning 50% overlap
    for (data) |*s| {
        s.* *= scaling;
    }
}
