const std = @import("std");

pub const PI: f32 = 3.14159265358979323846;
pub const TWO_PI: f32 = 6.28318530717958647692;

pub const Complex = struct {
    re: f32,
    im: f32,

    pub fn add(self: Complex, other: Complex) Complex {
        return .{ .re = self.re + other.re, .im = self.im + other.im };
    }

    pub fn sub(self: Complex, other: Complex) Complex {
        return .{ .re = self.re - other.re, .im = self.im - other.im };
    }

    pub fn mul(self: Complex, other: Complex) Complex {
        return .{
            .re = self.re * other.re - self.im * other.im,
            .im = self.re * other.im + self.im * other.re,
        };
    }

    pub fn div(self: Complex, other: Complex) Complex {
        const denom = other.re * other.re + other.im * other.im;
        return .{
            .re = (self.re * other.re + self.im * other.im) / denom,
            .im = (self.im * other.re - self.re * other.im) / denom,
        };
    }

    pub fn conjugate(self: Complex) Complex {
        return .{ .re = self.re, .im = -self.im };
    }
    
    pub fn magnitude(self: Complex) f32 {
        return std.math.sqrt(self.re * self.re + self.im * self.im);
    }
};

// Simple recursive Cooley-Tukey FFT
// Note: In production, an iterative version with precomputed twiddle factors is faster.
// Using this for simplicity and readability as per blueprint context.
pub fn fft(buffer: []Complex, stride: usize) void {
    const len = buffer.len;
    if (len <= 1) return;

    // Separate even and odd
    // This in-place recursive structure is a bit tricky in Zig without allocation.
    // For a simple implementation without external allocator, we might need a scratch buffer.
    // However, the standard recursive algorithm usually allocates.
    // Let's implement an iterative one or assume the caller provides scratch.
    // 
    // Actually, for the "Adaptive Spectral Denoise" with 2048 window, a simple iterative implementation is better.
    
    _ = stride; // Unused in this placeholder if we go iterative
}

// Minimal iterative FFT implementation
pub fn fft_iterative(buffer: []Complex, inverse: bool) void {
    const n = buffer.len;
    
    // Bit reversal permutation
    var j: usize = 0;
    var i: usize = 0;
    while (i < n) : (i += 1) {
        if (i < j) {
            const temp = buffer[i];
            buffer[i] = buffer[j];
            buffer[j] = temp;
        }
        var m = n / 2;
        while (m >= 1 and j >= m) {
            j -= m;
            m /= 2;
        }
        j += m;
    }

    // Butterfly
    var len: usize = 2;
    while (len <= n) : (len *= 2) {
        const sign: f32 = if (inverse) -1.0 else 1.0;
        const angle = TWO_PI / @as(f32, @floatFromInt(len)) * sign;
        const wlen = Complex{ .re = std.math.cos(angle), .im = std.math.sin(angle) };
        
        var k: usize = 0;
        while (k < n) : (k += len) {
            var w = Complex{ .re = 1.0, .im = 0.0 };
            var m: usize = 0;
            while (m < len / 2) : (m += 1) {
                const u = buffer[k + m];
                const v = w.mul(buffer[k + m + len / 2]);
                
                buffer[k + m] = u.add(v);
                buffer[k + m + len / 2] = u.sub(v);
                
                w = w.mul(wlen);
            }
        }
    }

    if (inverse) {
        const n_f32 = @as(f32, @floatFromInt(n));
        i = 0;
        while (i < n) : (i += 1) {
            buffer[i].re /= n_f32;
            buffer[i].im /= n_f32;
        }
    }
}

pub fn dbToLinear(db: f32) f32 {
    return std.math.pow(f32, 10.0, db / 20.0);
}

pub fn linearToDb(linear: f32) f32 {
    if (linear <= 0.000001) return -120.0;
    return 20.0 * std.math.log10(linear);
}

pub const Biquad = struct {
    a1: f32 = 0, a2: f32 = 0,
    b0: f32 = 0, b1: f32 = 0, b2: f32 = 0,
    x1: f32 = 0, x2: f32 = 0,
    y1: f32 = 0, y2: f32 = 0,

    pub fn process(self: *Biquad, input: f32) f32 {
        const output = self.b0 * input + self.b1 * self.x1 + self.b2 * self.x2 - self.a1 * self.y1 - self.a2 * self.y2;
        self.x2 = self.x1;
        self.x1 = input;
        self.y2 = self.y1;
        self.y1 = output;
        return output;
    }
};

pub fn calc_lpf_coeffs(fc: f32, sample_rate: f32) Biquad {
    // Butterworth 2nd order LPF
    const w0 = TWO_PI * fc / sample_rate;
    const cos_w0 = std.math.cos(w0);
    const alpha = std.math.sin(w0) / std.math.sqrt(2.0); // Q = 0.707 for Butterworth

    const a0 = 1 + alpha;
    return .{
        .b0 = (1 - cos_w0) / 2 / a0,
        .b1 = (1 - cos_w0) / a0,
        .b2 = (1 - cos_w0) / 2 / a0,
        .a1 = -2 * cos_w0 / a0,
        .a2 = (1 - alpha) / a0,
    };
}

pub fn calc_hpf_coeffs(fc: f32, sample_rate: f32) Biquad {
    // Butterworth 2nd order HPF
    const w0 = TWO_PI * fc / sample_rate;
    const cos_w0 = std.math.cos(w0);
    const alpha = std.math.sin(w0) / std.math.sqrt(2.0);

    const a0 = 1 + alpha;
    return .{
        .b0 = (1 + cos_w0) / 2 / a0,
        .b1 = -(1 + cos_w0) / a0,
        .b2 = (1 + cos_w0) / 2 / a0,
        .a1 = -2 * cos_w0 / a0,
        .a2 = (1 - alpha) / a0,
    };
}

pub fn calc_low_shelf_coeffs(fc: f32, sample_rate: f32, gain_db: f32) Biquad {
    const A = std.math.pow(f32, 10.0, gain_db / 40.0);
    const w0 = TWO_PI * fc / sample_rate;
    const cos_w0 = std.math.cos(w0);
    const alpha = std.math.sin(w0) / 2.0 * std.math.sqrt(2.0); // Q = 0.707

    const temp1 = 2.0 * std.math.sqrt(A) * alpha;
    const ap1 = A + 1.0;
    const am1 = A - 1.0;

    const b0 = A * (ap1 - am1 * cos_w0 + temp1);
    const b1 = 2.0 * A * (am1 - ap1 * cos_w0);
    const b2 = A * (ap1 - am1 * cos_w0 - temp1);
    const a0 = ap1 + am1 * cos_w0 + temp1;
    const a1 = -2.0 * (am1 + ap1 * cos_w0);
    const a2 = ap1 + am1 * cos_w0 - temp1;

    return .{
        .b0 = b0 / a0,
        .b1 = b1 / a0,
        .b2 = b2 / a0,
        .a1 = a1 / a0,
        .a2 = a2 / a0,
    };
}

pub fn calc_high_shelf_coeffs(fc: f32, sample_rate: f32, gain_db: f32) Biquad {
    const A = std.math.pow(f32, 10.0, gain_db / 40.0);
    const w0 = TWO_PI * fc / sample_rate;
    const cos_w0 = std.math.cos(w0);
    const alpha = std.math.sin(w0) / 2.0 * std.math.sqrt(2.0);

    const temp1 = 2.0 * std.math.sqrt(A) * alpha;
    const ap1 = A + 1.0;
    const am1 = A - 1.0;

    const b0 = A * (ap1 + am1 * cos_w0 + temp1);
    const b1 = -2.0 * A * (am1 + ap1 * cos_w0);
    const b2 = A * (ap1 + am1 * cos_w0 - temp1);
    const a0 = ap1 - am1 * cos_w0 + temp1;
    const a1 = 2.0 * (am1 - ap1 * cos_w0);
    const a2 = ap1 - am1 * cos_w0 - temp1;

    return .{
        .b0 = b0 / a0,
        .b1 = b1 / a0,
        .b2 = b2 / a0,
        .a1 = a1 / a0,
        .a2 = a2 / a0,
    };
}

pub fn calc_peaking_coeffs(fc: f32, sample_rate: f32, gain_db: f32, Q: f32) Biquad {
    const A = std.math.pow(f32, 10.0, gain_db / 40.0);
    const w0 = TWO_PI * fc / sample_rate;
    const cos_w0 = std.math.cos(w0);
    const alpha = std.math.sin(w0) / (2.0 * Q);

    const b0 = 1.0 + alpha * A;
    const b1 = -2.0 * cos_w0;
    const b2 = 1.0 - alpha * A;
    const a0 = 1.0 + alpha / A;
    const a1 = -2.0 * cos_w0;
    const a2 = 1.0 - alpha / A;

    return .{
        .b0 = b0 / a0,
        .b1 = b1 / a0,
        .b2 = b2 / a0,
        .a1 = a1 / a0,
        .a2 = a2 / a0,
    };
}

pub fn cubicHermite(y0: f32, y1: f32, y2: f32, y3: f32, mu: f32) f32 {
    const mu2 = mu * mu;
    const mu3 = mu2 * mu;

    const m0 = (y2 - y0) * 0.5;
    const m1 = (y3 - y1) * 0.5;

    const a0 = 2.0 * mu3 - 3.0 * mu2 + 1.0;
    const a1 = mu3 - 2.0 * mu2 + mu;
    const a2 = -2.0 * mu3 + 3.0 * mu2;
    const a3 = mu3 - mu2;

    return a0 * y1 + a1 * m0 + a2 * y2 + a3 * m1;
}