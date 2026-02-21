//! Rational Trigonometry Math Library for ARTexplorer (Rust port)
//!
//! Pure mathematical functions based on N.J. Wildberger's Rational Trigonometry.
//! Uses quadrance (Q = distance²) and spread (s) instead of distance and angle.
//!
//! Benefits:
//! - No square roots needed (exact calculations)
//! - No transcendental functions (sin, cos, atan)
//! - Algebraic identities remain exact
//! - Type-safe Quadray coordinates via Rust's type system
//!
//! All computations in f64 on CPU. Convert to f32 only at GPU boundary.

pub mod cubics;
pub mod normalizer;
pub mod phi;
pub mod polygon;
pub mod quadray;
pub mod radicals;

pub use quadray::Quadray;
pub use normalizer::{quadray_to_xyz, xyz_to_quadray};

/// Edge validation result.
#[derive(Debug)]
pub struct EdgeValidation {
    pub edge: [usize; 2],
    pub q: f64,
    pub error: f64,
    pub valid: bool,
}

/// Quadrance between two 3D points: Q = dx² + dy² + dz²
///
/// Avoids sqrt — stays in Q-space. The fundamental RT distance measure.
///
/// # Example
/// ```
/// let q = rt_math::quadrance([0.0, 0.0, 0.0], [1.0, 1.0, 1.0]);
/// assert_eq!(q, 3.0); // Not √3!
/// ```
pub fn quadrance(p1: [f64; 3], p2: [f64; 3]) -> f64 {
    let dx = p2[0] - p1[0];
    let dy = p2[1] - p1[1];
    let dz = p2[2] - p1[2];
    dx * dx + dy * dy + dz * dz
}

/// Spread between two 3D vectors: s = 1 - (v1·v2)² / (|v1|²·|v2|²)
///
/// Measures perpendicularity (0 = parallel, 1 = perpendicular).
/// The fundamental RT angle measure.
///
/// # Key values
/// - s = 0: vectors parallel (0°)
/// - s = 8/9: tetrahedral angle
/// - s = 1: vectors perpendicular (90°)
pub fn spread(v1: [f64; 3], v2: [f64; 3]) -> f64 {
    let dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
    let q1 = v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2];
    let q2 = v2[0] * v2[0] + v2[1] * v2[1] + v2[2] * v2[2];
    if q1 == 0.0 || q2 == 0.0 {
        return 0.0;
    }
    1.0 - (dot * dot) / (q1 * q2)
}

/// Rational circle parameterization — Wildberger's alternative to sin/cos.
///
/// Circle(t) = ((1 - t²) / (1 + t²), 2t / (1 + t²))
///
/// Based on Weierstrass substitution. Maps all reals to the unit circle:
/// - t = 0 → (1, 0)
/// - t = 1 → (0, 1)
/// - t → ∞ → (-1, 0)
pub fn circle_param(t: f64) -> [f64; 2] {
    let t2 = t * t;
    let d = 1.0 + t2;
    [(1.0 - t2) / d, (2.0 * t) / d]
}

/// Reflect point (x, y) across a line through the origin with slope m.
///
/// Purely rational: add, mul, div only (no √).
///
/// Formula (Wildberger "Divine Proportions" §14.5):
///   x' = ((1 − m²)x + 2my) / (1 + m²)
///   y' = (2mx − (1 − m²)y) / (1 + m²)
///
/// Key identity: reflect_in_line(R, 0, m) === R · circle_param(m).
pub fn reflect_in_line(x: f64, y: f64, m: f64) -> [f64; 2] {
    let m2 = m * m;
    let d = 1.0 + m2;
    [
        ((1.0 - m2) * x + 2.0 * m * y) / d,
        (2.0 * m * x - (1.0 - m2) * y) / d,
    ]
}

/// Compute slope from star spread: m = √(s / (1 − s)) = tan(π/N).
///
/// This is the ONE √ in Wildberger's reflection-based N-gon construction.
pub fn slope_from_spread(s: f64) -> f64 {
    (s / (1.0 - s)).sqrt()
}

/// Sphere-plane intersection circle radius (RT-pure).
///
/// Uses quadrance-based Pythagorean theorem.
/// Returns None if no intersection (plane too far from sphere).
pub fn sphere_plane_circle_radius(sphere_radius_q: f64, distance_q: f64) -> Option<f64> {
    if distance_q > sphere_radius_q {
        return None;
    }
    let circle_radius_q = sphere_radius_q - distance_q;
    Some(circle_radius_q.sqrt()) // Deferred sqrt at final step
}

/// Validate that all edges have uniform quadrance (regular polyhedron check).
pub fn validate_edges(
    vertices: &[[f64; 3]],
    edges: &[[usize; 2]],
    expected_q: f64,
    tolerance: f64,
) -> Vec<EdgeValidation> {
    edges
        .iter()
        .map(|&[i, j]| {
            let q = quadrance(vertices[i], vertices[j]);
            let error = (q - expected_q).abs();
            EdgeValidation {
                edge: [i, j],
                q,
                error,
                valid: error < tolerance,
            }
        })
        .collect()
}

/// Verify Euler's formula: V - E + F = 2 (valid for convex polyhedra).
pub fn verify_euler(vertices: usize, edges: usize, faces: usize) -> bool {
    vertices as i64 - edges as i64 + faces as i64 == 2
}

#[cfg(test)]
mod tests {
    use super::*;

    const EPS: f64 = 1e-12;

    fn approx_eq(a: f64, b: f64) -> bool {
        (a - b).abs() < EPS
    }

    // --- Quadrance ---

    #[test]
    fn quadrance_zero() {
        assert_eq!(quadrance([0.0, 0.0, 0.0], [0.0, 0.0, 0.0]), 0.0);
    }

    #[test]
    fn quadrance_unit_cube_diagonal() {
        assert!(approx_eq(
            quadrance([0.0, 0.0, 0.0], [1.0, 1.0, 1.0]),
            3.0
        ));
    }

    #[test]
    fn quadrance_axis_aligned() {
        assert!(approx_eq(quadrance([0.0, 0.0, 0.0], [3.0, 0.0, 0.0]), 9.0));
    }

    // --- Spread ---

    #[test]
    fn spread_perpendicular() {
        let s = spread([1.0, 0.0, 0.0], [0.0, 1.0, 0.0]);
        assert!(approx_eq(s, 1.0), "s = {} != 1.0", s);
    }

    #[test]
    fn spread_parallel() {
        let s = spread([1.0, 0.0, 0.0], [2.0, 0.0, 0.0]);
        assert!(approx_eq(s, 0.0), "s = {} != 0.0", s);
    }

    #[test]
    fn spread_antiparallel() {
        let s = spread([1.0, 0.0, 0.0], [-1.0, 0.0, 0.0]);
        assert!(approx_eq(s, 0.0), "s = {} != 0.0", s);
    }

    #[test]
    fn spread_tetrahedral() {
        // Spread between tet edges from center: 8/9
        // Vectors to two tet vertices: B=(1,1,1) and D=(1,-1,-1)
        let s = spread([1.0, 1.0, 1.0], [1.0, -1.0, -1.0]);
        assert!(approx_eq(s, 8.0 / 9.0), "s = {} != 8/9", s);
    }

    #[test]
    fn spread_zero_vector() {
        let s = spread([0.0, 0.0, 0.0], [1.0, 0.0, 0.0]);
        assert!(approx_eq(s, 0.0));
    }

    // --- Circle param ---

    #[test]
    fn circle_param_t0() {
        let [x, y] = circle_param(0.0);
        assert!(approx_eq(x, 1.0));
        assert!(approx_eq(y, 0.0));
    }

    #[test]
    fn circle_param_t1() {
        let [x, y] = circle_param(1.0);
        assert!(approx_eq(x, 0.0));
        assert!(approx_eq(y, 1.0));
    }

    #[test]
    fn circle_param_on_unit_circle() {
        for t in [0.0, 0.5, 1.0, 2.0, 5.0, -1.0, -3.0] {
            let [x, y] = circle_param(t);
            let r2 = x * x + y * y;
            assert!(approx_eq(r2, 1.0), "t={}: r²={} != 1.0", t, r2);
        }
    }

    // --- Reflect in line ---

    #[test]
    fn reflect_across_y_eq_x() {
        let [rx, ry] = reflect_in_line(1.0, 0.0, 1.0);
        assert!(approx_eq(rx, 0.0), "rx = {} != 0.0", rx);
        assert!(approx_eq(ry, 1.0), "ry = {} != 1.0", ry);
    }

    #[test]
    fn reflect_across_x_axis() {
        // slope = 0 → reflect across x-axis: (x, y) → (x, -y)
        let [rx, ry] = reflect_in_line(1.0, 2.0, 0.0);
        assert!(approx_eq(rx, 1.0));
        assert!(approx_eq(ry, -2.0));
    }

    #[test]
    fn reflect_identity_for_reflection_across_line_through_point() {
        // Key identity: reflect_in_line(R, 0, m) == R * circle_param(m)
        let r = 2.5;
        let m = 0.7;
        let [rx, ry] = reflect_in_line(r, 0.0, m);
        let [cx, cy] = circle_param(m);
        assert!(approx_eq(rx, r * cx), "rx={} != r*cx={}", rx, r * cx);
        assert!(approx_eq(ry, r * cy), "ry={} != r*cy={}", ry, r * cy);
    }

    // --- Slope from spread ---

    #[test]
    fn slope_from_spread_45_degrees() {
        // s = 1/2 → m = 1 (tan(45°))
        let m = slope_from_spread(0.5);
        assert!(approx_eq(m, 1.0), "m = {} != 1.0", m);
    }

    #[test]
    fn slope_from_spread_triangle() {
        // s = 3/4 → m = √3 (tan(60°))
        let m = slope_from_spread(0.75);
        assert!(approx_eq(m, 3.0_f64.sqrt()), "m = {} != √3", m);
    }

    // --- Euler ---

    #[test]
    fn euler_tetrahedron() {
        assert!(verify_euler(4, 6, 4));
    }

    #[test]
    fn euler_cube() {
        assert!(verify_euler(8, 12, 6));
    }

    #[test]
    fn euler_octahedron() {
        assert!(verify_euler(6, 12, 8));
    }

    #[test]
    fn euler_icosahedron() {
        assert!(verify_euler(12, 30, 20));
    }

    #[test]
    fn euler_dodecahedron() {
        assert!(verify_euler(20, 30, 12));
    }

    // --- Validate edges ---

    #[test]
    fn validate_tet_edges() {
        let verts = normalizer::batch_quadray_to_xyz(
            &[Quadray::A, Quadray::B, Quadray::C, Quadray::D]
        );
        let edges = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
        let results = validate_edges(&verts, &edges, 8.0, 1e-10);
        assert!(results.iter().all(|r| r.valid), "Not all edges Q=8");
    }
}
