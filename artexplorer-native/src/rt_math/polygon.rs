//! Polygon vertex generation — Wildberger reflection method
//!
//! Generates N-gon vertices using successive reflections through star lines.
//! Uses exactly ONE √ (for the initial slope), regardless of N.
//!
//! Compare: Gauss-Wantzel O(N) √, classical trig O(N) transcendentals.

use super::{circle_param, cubics, phi, radicals, slope_from_spread};

/// Method used to obtain the star spread.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum NgonMethod {
    Algebraic,
    Cubic,
    Transcendental,
}

impl std::fmt::Display for NgonMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            NgonMethod::Algebraic => write!(f, "algebraic"),
            NgonMethod::Cubic => write!(f, "cubic"),
            NgonMethod::Transcendental => write!(f, "transcendental"),
        }
    }
}

/// Result of n_gon_vertices().
#[derive(Debug)]
pub struct NgonResult {
    pub vertices: Vec<[f64; 2]>,
    pub star_spread: f64,
    pub method: NgonMethod,
}

/// Exact star spreads for regular n-gons: sin²(π/N).
///
/// Returns None for N without cached exact spreads.
/// Includes Gauss-Wantzel constructible (3,4,5,6,8,10,12) AND
/// cubic-cached (7,9).
pub fn star_spread(n: u32) -> Option<f64> {
    match n {
        3 => Some(3.0 / 4.0),
        4 => Some(1.0 / 2.0),
        5 => Some((5.0 - phi::sqrt5()) / 8.0),
        6 => Some(1.0 / 4.0),
        7 => Some(cubics::heptagon::star_spread()),
        8 => Some((2.0 - radicals::sqrt2()) / 4.0),
        9 => Some(cubics::nonagon::star_spread()),
        10 => Some((3.0 - phi::sqrt5()) / 8.0),
        12 => Some((2.0 - radicals::sqrt3()) / 4.0),
        _ => None,
    }
}

/// Unified N-gon vertex generator — Wildberger reflection method.
///
/// Generates N vertices of a regular N-gon inscribed in a circle of radius R.
/// Uses successive reflections through star lines (Chapter 14, §14.5).
///
/// Algorithm:
/// 1. Star spread s = sin²(π/N)
/// 2. m₁ = √(s/(1−s)) = tan(π/N) — THE one √
/// 3. Tangent addition recurrence: m_{k+1} = (mₖ + m₁) / (1 − mₖ·m₁)
/// 4. Vertex k: Weierstrass at t = mₖ
/// 5. Lower-half vertices by symmetry: y → −y
///
/// # Panics
/// If N < 3.
pub fn n_gon_vertices(n: u32, r: f64) -> NgonResult {
    assert!(n >= 3, "n_gon_vertices: N must be >= 3, got {}", n);

    // Get star spread
    let (ss, method) = match star_spread(n) {
        Some(s) => {
            let m = if n == 7 || n == 9 {
                NgonMethod::Cubic
            } else {
                NgonMethod::Algebraic
            };
            (s, m)
        }
        None => {
            // Transcendental fallback
            let sin_pi_n = (std::f64::consts::PI / n as f64).sin();
            (sin_pi_n * sin_pi_n, NgonMethod::Transcendental)
        }
    };

    let mut vertices = vec![[0.0_f64; 2]; n as usize];
    vertices[0] = [r, 0.0];

    // N even → antipodal vertex is exact
    if n % 2 == 0 {
        vertices[n as usize / 2] = [-r, 0.0];
    }

    // The ONE √: m₁ = tan(π/N)
    let m1 = slope_from_spread(ss);

    let half = ((n - 1) / 2) as usize;
    let mut mk = m1;

    for k in 1..=half {
        // Vertex k from Weierstrass at t = mk
        let [cx, cy] = circle_param(mk);
        vertices[k] = [r * cx, r * cy];
        vertices[n as usize - k] = [r * cx, -r * cy]; // symmetry

        // Tangent addition for next slope
        if k < half {
            mk = (mk + m1) / (1.0 - mk * m1);
        }
    }

    NgonResult {
        vertices,
        star_spread: ss,
        method,
    }
}

/// Central spread of a regular N-gon: spread between adjacent vertices from center.
/// Equivalent to sin²(π/N) but derived RT-pure from vertex coordinates.
pub fn central_spread(n: u32) -> f64 {
    let result = n_gon_vertices(n, 1.0);
    let v0 = result.vertices[0];
    let v1 = result.vertices[1];
    let dot = v0[0] * v1[0] + v0[1] * v1[1];
    let q0 = v0[0] * v0[0] + v0[1] * v0[1];
    let q1 = v1[0] * v1[0] + v1[1] * v1[1];
    1.0 - (dot * dot) / (q0 * q1)
}

#[cfg(test)]
mod tests {
    use super::*;

    const EPS: f64 = 1e-12;

    fn approx_eq(a: f64, b: f64) -> bool {
        (a - b).abs() < EPS
    }

    // --- Star spreads ---

    #[test]
    fn star_spread_triangle() {
        assert_eq!(star_spread(3), Some(0.75));
    }

    #[test]
    fn star_spread_square() {
        assert_eq!(star_spread(4), Some(0.5));
    }

    #[test]
    fn star_spread_hexagon() {
        assert_eq!(star_spread(6), Some(0.25));
    }

    #[test]
    fn star_spread_unsupported() {
        assert_eq!(star_spread(11), None);
    }

    // --- N-gon vertices ---

    #[test]
    fn triangle_vertices() {
        let result = n_gon_vertices(3, 1.0);
        assert_eq!(result.vertices.len(), 3);
        assert_eq!(result.method, NgonMethod::Algebraic);
        // v0 = (1, 0)
        assert!(approx_eq(result.vertices[0][0], 1.0));
        assert!(approx_eq(result.vertices[0][1], 0.0));
        // v1 = (-0.5, √3/2)
        assert!(approx_eq(result.vertices[1][0], -0.5));
        assert!(approx_eq(result.vertices[1][1], 3.0_f64.sqrt() / 2.0));
        // v2 = (-0.5, -√3/2)
        assert!(approx_eq(result.vertices[2][0], -0.5));
        assert!(approx_eq(result.vertices[2][1], -(3.0_f64.sqrt() / 2.0)));
    }

    #[test]
    fn square_vertices() {
        let result = n_gon_vertices(4, 1.0);
        assert_eq!(result.vertices.len(), 4);
        // v0=(1,0), v1=(0,1), v2=(-1,0), v3=(0,-1)
        assert!(approx_eq(result.vertices[0][0], 1.0));
        assert!(approx_eq(result.vertices[1][0], 0.0));
        assert!(approx_eq(result.vertices[1][1], 1.0));
        assert!(approx_eq(result.vertices[2][0], -1.0));
        assert!(approx_eq(result.vertices[3][1], -1.0));
    }

    #[test]
    fn pentagon_on_unit_circle() {
        let result = n_gon_vertices(5, 1.0);
        assert_eq!(result.vertices.len(), 5);
        assert_eq!(result.method, NgonMethod::Algebraic);
        for (i, v) in result.vertices.iter().enumerate() {
            let r2 = v[0] * v[0] + v[1] * v[1];
            assert!(approx_eq(r2, 1.0), "v{}: r² = {} != 1.0", i, r2);
        }
    }

    #[test]
    fn heptagon_cubic_method() {
        let result = n_gon_vertices(7, 1.0);
        assert_eq!(result.vertices.len(), 7);
        assert_eq!(result.method, NgonMethod::Cubic);
        for (i, v) in result.vertices.iter().enumerate() {
            let r2 = v[0] * v[0] + v[1] * v[1];
            assert!(approx_eq(r2, 1.0), "v{}: r² = {} != 1.0", i, r2);
        }
    }

    #[test]
    fn all_supported_ngons_correct_count() {
        for n in 3..=12 {
            let result = n_gon_vertices(n, 1.0);
            assert_eq!(
                result.vertices.len(),
                n as usize,
                "N={}: expected {} vertices, got {}",
                n,
                n,
                result.vertices.len()
            );
        }
    }

    #[test]
    fn all_supported_ngons_on_circle() {
        for n in 3..=12 {
            let result = n_gon_vertices(n, 2.5);
            for (i, v) in result.vertices.iter().enumerate() {
                let r2 = v[0] * v[0] + v[1] * v[1];
                assert!(
                    (r2 - 6.25).abs() < 1e-10,
                    "N={}, v{}: r² = {} != 6.25",
                    n,
                    i,
                    r2
                );
            }
        }
    }

    // --- Central spread ---

    #[test]
    fn central_spread_triangle() {
        assert!(approx_eq(central_spread(3), 0.75));
    }

    #[test]
    fn central_spread_square() {
        // sin²(2π/4) = sin²(90°) = 1.0
        assert!(approx_eq(central_spread(4), 1.0));
    }

    #[test]
    fn central_spread_hexagon() {
        // sin²(2π/6) = sin²(60°) = 3/4
        assert!(approx_eq(central_spread(6), 0.75));
    }
}
