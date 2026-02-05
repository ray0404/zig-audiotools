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
