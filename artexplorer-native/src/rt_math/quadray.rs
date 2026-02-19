//! Quadray coordinate system — ABCD tetrahedral basis
//!
//! Four equiangular basis vectors from tetrahedron center to vertices.
//! ABCD = 0123, no scramble. The 3021 rule is dead.
//!
//! ABCD Basis Vectors (Quadray → Cartesian):
//!   A = (-1, -1, +1)  Yellow  index 0
//!   B = (+1, +1, +1)  Red     index 1
//!   C = (-1, +1, -1)  Blue    index 2
//!   D = (+1, -1, -1)  Green   index 3
//!
//! Must match shader.wgsl BASIS matrix exactly.

use std::ops::{Add, Mul, Sub};

/// ABCD basis vectors: Quadray → Cartesian conversion matrix.
/// Each row is a basis vector [x, y, z].
const BASIS: [[f64; 3]; 4] = [
    [-1.0, -1.0, 1.0],  // A (Yellow)
    [1.0, 1.0, 1.0],    // B (Red)
    [-1.0, 1.0, -1.0],  // C (Blue)
    [1.0, -1.0, -1.0],  // D (Green)
];

/// Quadray coordinate in ABCD tetrahedral space.
///
/// All components >= 0 in canonical form, at least one == 0 (normalized).
/// The compiler enforces type safety: you cannot pass a Cartesian coordinate
/// where a Quadray is expected.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Quadray {
    pub a: f64,
    pub b: f64,
    pub c: f64,
    pub d: f64,
}

impl Quadray {
    /// Create a new Quadray from components.
    pub fn new(a: f64, b: f64, c: f64, d: f64) -> Self {
        Self { a, b, c, d }
    }

    // --- Basis unit vectors ---
    pub const A: Self = Self {
        a: 1.0,
        b: 0.0,
        c: 0.0,
        d: 0.0,
    };
    pub const B: Self = Self {
        a: 0.0,
        b: 1.0,
        c: 0.0,
        d: 0.0,
    };
    pub const C: Self = Self {
        a: 0.0,
        b: 0.0,
        c: 1.0,
        d: 0.0,
    };
    pub const D: Self = Self {
        a: 0.0,
        b: 0.0,
        c: 0.0,
        d: 1.0,
    };
    pub const ORIGIN: Self = Self {
        a: 0.0,
        b: 0.0,
        c: 0.0,
        d: 0.0,
    };

    /// Zero-sum normalize: subtract average from each coordinate.
    /// Maps [1,0,0,0] → [3/4, -1/4, -1/4, -1/4].
    pub fn normalize(&self) -> Self {
        let avg = (self.a + self.b + self.c + self.d) / 4.0;
        Self {
            a: self.a - avg,
            b: self.b - avg,
            c: self.c - avg,
            d: self.d - avg,
        }
    }

    /// Convert to Cartesian [x, y, z] — THE GPU boundary.
    ///
    /// Algorithm: zero-sum normalize, then multiply by ABCD basis matrix.
    /// Must produce identical results to shader.wgsl BASIS * normalized.
    pub fn to_cartesian(&self) -> [f64; 3] {
        let n = self.normalize();
        [
            n.a * BASIS[0][0] + n.b * BASIS[1][0] + n.c * BASIS[2][0] + n.d * BASIS[3][0],
            n.a * BASIS[0][1] + n.b * BASIS[1][1] + n.c * BASIS[2][1] + n.d * BASIS[3][1],
            n.a * BASIS[0][2] + n.b * BASIS[1][2] + n.c * BASIS[2][2] + n.d * BASIS[3][2],
        ]
    }

    /// Convert from Cartesian [x, y, z] to Quadray.
    ///
    /// Exact inverse of to_cartesian(). Solves the 4×4 linear system:
    ///   n_a + n_b + n_c + n_d = 0       (zero-sum constraint)
    ///   -n_a + n_b - n_c + n_d = x       (from BASIS column 0)
    ///   -n_a + n_b + n_c - n_d = y       (from BASIS column 1)
    ///    n_a + n_b - n_c - n_d = z       (from BASIS column 2)
    ///
    /// Then shifts to canonical form (min = 0).
    pub fn from_cartesian(xyz: [f64; 3]) -> Self {
        let [x, y, z] = xyz;
        // Closed-form solution of the 4×4 system
        let n_a = (-x - y + z) / 4.0;
        let n_b = (x + y + z) / 4.0;
        let n_c = (-x + y - z) / 4.0;
        let n_d = (x - y - z) / 4.0;
        // Shift to canonical form: min component → 0
        let min = n_a.min(n_b).min(n_c).min(n_d);
        Self {
            a: n_a - min,
            b: n_b - min,
            c: n_c - min,
            d: n_d - min,
        }
    }

    /// Scale all components by a factor.
    pub fn scale(&self, factor: f64) -> Self {
        Self {
            a: self.a * factor,
            b: self.b * factor,
            c: self.c * factor,
            d: self.d * factor,
        }
    }

    /// As f32 array for GPU upload — the precision boundary.
    /// f64 → f32 conversion happens ONLY here.
    pub fn to_f32_array(&self) -> [f32; 4] {
        [self.a as f32, self.b as f32, self.c as f32, self.d as f32]
    }

    /// Quadrance between two Quadray points (computed via Cartesian).
    pub fn quadrance(&self, other: &Self) -> f64 {
        let p1 = self.to_cartesian();
        let p2 = other.to_cartesian();
        super::quadrance(p1, p2)
    }

    /// Spread between two Quadray vectors from origin (computed via Cartesian).
    pub fn spread(&self, other: &Self) -> f64 {
        let v1 = self.to_cartesian();
        let v2 = other.to_cartesian();
        super::spread(v1, v2)
    }
}

// --- Operator overloads ---

impl Add for Quadray {
    type Output = Self;
    fn add(self, rhs: Self) -> Self {
        Self {
            a: self.a + rhs.a,
            b: self.b + rhs.b,
            c: self.c + rhs.c,
            d: self.d + rhs.d,
        }
    }
}

impl Sub for Quadray {
    type Output = Self;
    fn sub(self, rhs: Self) -> Self {
        Self {
            a: self.a - rhs.a,
            b: self.b - rhs.b,
            c: self.c - rhs.c,
            d: self.d - rhs.d,
        }
    }
}

impl Mul<f64> for Quadray {
    type Output = Self;
    fn mul(self, rhs: f64) -> Self {
        self.scale(rhs)
    }
}

impl std::fmt::Display for Quadray {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "[A={:.4}, B={:.4}, C={:.4}, D={:.4}]",
            self.a, self.b, self.c, self.d
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const EPS: f64 = 1e-12;

    fn approx_eq(a: f64, b: f64) -> bool {
        (a - b).abs() < EPS
    }

    // --- Basis vector conversion (must match shader.wgsl) ---

    #[test]
    fn a_vertex_to_cartesian() {
        let xyz = Quadray::A.to_cartesian();
        assert!(approx_eq(xyz[0], -1.0), "x: {} != -1.0", xyz[0]);
        assert!(approx_eq(xyz[1], -1.0), "y: {} != -1.0", xyz[1]);
        assert!(approx_eq(xyz[2], 1.0), "z: {} != 1.0", xyz[2]);
    }

    #[test]
    fn b_vertex_to_cartesian() {
        let xyz = Quadray::B.to_cartesian();
        assert!(approx_eq(xyz[0], 1.0), "x: {} != 1.0", xyz[0]);
        assert!(approx_eq(xyz[1], 1.0), "y: {} != 1.0", xyz[1]);
        assert!(approx_eq(xyz[2], 1.0), "z: {} != 1.0", xyz[2]);
    }

    #[test]
    fn c_vertex_to_cartesian() {
        let xyz = Quadray::C.to_cartesian();
        assert!(approx_eq(xyz[0], -1.0), "x: {} != -1.0", xyz[0]);
        assert!(approx_eq(xyz[1], 1.0), "y: {} != 1.0", xyz[1]);
        assert!(approx_eq(xyz[2], -1.0), "z: {} != -1.0", xyz[2]);
    }

    #[test]
    fn d_vertex_to_cartesian() {
        let xyz = Quadray::D.to_cartesian();
        assert!(approx_eq(xyz[0], 1.0), "x: {} != 1.0", xyz[0]);
        assert!(approx_eq(xyz[1], -1.0), "y: {} != -1.0", xyz[1]);
        assert!(approx_eq(xyz[2], -1.0), "z: {} != -1.0", xyz[2]);
    }

    // --- Dual tetrahedron vertices ---

    #[test]
    fn a_absent_dual_vertex() {
        // [0,1,1,1] should give negation of A: (1, 1, -1)
        let q = Quadray::new(0.0, 1.0, 1.0, 1.0);
        let xyz = q.to_cartesian();
        assert!(approx_eq(xyz[0], 1.0), "x: {} != 1.0", xyz[0]);
        assert!(approx_eq(xyz[1], 1.0), "y: {} != 1.0", xyz[1]);
        assert!(approx_eq(xyz[2], -1.0), "z: {} != -1.0", xyz[2]);
    }

    #[test]
    fn b_absent_dual_vertex() {
        // [1,0,1,1] should give negation of B: (-1, -1, -1)
        let q = Quadray::new(1.0, 0.0, 1.0, 1.0);
        let xyz = q.to_cartesian();
        assert!(approx_eq(xyz[0], -1.0), "x: {} != -1.0", xyz[0]);
        assert!(approx_eq(xyz[1], -1.0), "y: {} != -1.0", xyz[1]);
        assert!(approx_eq(xyz[2], -1.0), "z: {} != -1.0", xyz[2]);
    }

    // --- Edge quadrance ---

    #[test]
    fn edge_quadrance_ab() {
        // Q between A=[1,0,0,0] and B=[0,1,0,0] should be 8
        let q = Quadray::A.quadrance(&Quadray::B);
        assert!(approx_eq(q, 8.0), "Q(A,B) = {} != 8.0", q);
    }

    #[test]
    fn all_tet_edges_equal_quadrance() {
        let verts = [Quadray::A, Quadray::B, Quadray::C, Quadray::D];
        for i in 0..4 {
            for j in (i + 1)..4 {
                let q = verts[i].quadrance(&verts[j]);
                assert!(
                    approx_eq(q, 8.0),
                    "Q({},{}) = {} != 8.0",
                    i,
                    j,
                    q
                );
            }
        }
    }

    // --- Roundtrip conversion ---

    #[test]
    fn cartesian_roundtrip() {
        let original = Quadray::new(2.0, 1.0, 0.0, 1.0);
        let xyz = original.to_cartesian();
        let recovered = Quadray::from_cartesian(xyz);
        // Canonical form: minimum should be 0
        let min = recovered
            .a
            .min(recovered.b)
            .min(recovered.c)
            .min(recovered.d);
        assert!(approx_eq(min, 0.0), "min = {} != 0.0", min);
        // Cartesian should match
        let xyz2 = recovered.to_cartesian();
        for i in 0..3 {
            assert!(
                approx_eq(xyz[i], xyz2[i]),
                "roundtrip mismatch at {}: {} vs {}",
                i,
                xyz[i],
                xyz2[i]
            );
        }
    }

    // --- Zero-sum normalization ---

    #[test]
    fn normalize_sums_to_zero() {
        let q = Quadray::new(3.0, 1.0, 2.0, 0.0);
        let n = q.normalize();
        let sum = n.a + n.b + n.c + n.d;
        assert!(approx_eq(sum, 0.0), "sum = {} != 0.0", sum);
    }

    // --- Origin ---

    #[test]
    fn origin_to_cartesian() {
        let xyz = Quadray::ORIGIN.to_cartesian();
        assert!(approx_eq(xyz[0], 0.0));
        assert!(approx_eq(xyz[1], 0.0));
        assert!(approx_eq(xyz[2], 0.0));
    }

    // --- Operators ---

    #[test]
    fn add_quadrays() {
        let sum = Quadray::A + Quadray::B;
        assert!(approx_eq(sum.a, 1.0));
        assert!(approx_eq(sum.b, 1.0));
        assert!(approx_eq(sum.c, 0.0));
        assert!(approx_eq(sum.d, 0.0));
    }

    #[test]
    fn scale_quadray() {
        let scaled = Quadray::A * 3.0;
        assert!(approx_eq(scaled.a, 3.0));
        assert!(approx_eq(scaled.b, 0.0));
    }
}
