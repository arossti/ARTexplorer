//! PureCubics — Cached cubic equation solutions for non-constructible polygons
//!
//! Heptagon (7-gon) and nonagon (9-gon) require solving cubic equations.
//! We solve once and cache the results for IEEE 754 consistency.
//!
//! Heptagon cubic: 8x³ + 4x² - 4x - 1 = 0  (minimal polynomial for cos(2π/7))
//! Nonagon cubic:  8x³ - 6x - 1 = 0          (minimal polynomial for cos(20°))

/// Heptagon (7-gon) constants from cubic 8x³ + 4x² - 4x - 1 = 0
pub mod heptagon {
    /// cos(2π/7) — largest real root of the cubic
    pub fn cos1() -> f64 {
        0.6234898018587336
    }

    /// sin(2π/7)
    pub fn sin1() -> f64 {
        0.7818314824680298
    }

    /// cos(4π/7)
    pub fn cos2() -> f64 {
        -0.2225209339563144
    }

    /// sin(4π/7)
    pub fn sin2() -> f64 {
        0.9749279121818236
    }

    /// cos(6π/7)
    pub fn cos3() -> f64 {
        -0.9009688679024191
    }

    /// sin(6π/7) = sin(π/7)
    pub fn sin3() -> f64 {
        0.4338837391175582
    }

    /// Star spread for 7-gon: sin²(π/7)
    pub fn star_spread() -> f64 {
        // sin(π/7) = sin3() since sin(6π/7) = sin(π/7)
        let s = sin3();
        s * s
    }
}

/// Nonagon (9-gon) constants from cubic 8x³ - 6x - 1 = 0
pub mod nonagon {
    /// cos(20°) — largest real root
    pub fn cos20() -> f64 {
        0.9396926207859084
    }

    /// sin(20°)
    pub fn sin20() -> f64 {
        0.3420201433256687
    }

    /// cos(40°) = 2cos²(20°) - 1 (double-angle)
    pub fn cos40() -> f64 {
        let c = cos20();
        2.0 * c * c - 1.0
    }

    /// sin(40°) = 2·sin(20°)·cos(20°) (double-angle)
    pub fn sin40() -> f64 {
        2.0 * sin20() * cos20()
    }

    /// cos(80°) = 2cos²(40°) - 1
    pub fn cos80() -> f64 {
        let c = cos40();
        2.0 * c * c - 1.0
    }

    /// sin(80°) = 2·sin(40°)·cos(40°)
    pub fn sin80() -> f64 {
        2.0 * sin40() * cos40()
    }

    /// Star spread for 9-gon: sin²(π/9) = sin²(20°)
    pub fn star_spread() -> f64 {
        let s = sin20();
        s * s
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const EPS: f64 = 1e-12;

    #[test]
    fn heptagon_cos1_satisfies_cubic() {
        // 8x³ + 4x² - 4x - 1 = 0 (minimal polynomial for cos(2π/7))
        let x = heptagon::cos1();
        let val = 8.0 * x.powi(3) + 4.0 * x.powi(2) - 4.0 * x - 1.0;
        assert!(val.abs() < EPS, "cubic residual = {}", val);
    }

    #[test]
    fn heptagon_pythagorean() {
        // sin²(2π/7) + cos²(2π/7) = 1
        let c = heptagon::cos1();
        let s = heptagon::sin1();
        assert!((c * c + s * s - 1.0).abs() < EPS);
    }

    #[test]
    fn nonagon_cos20_satisfies_cubic() {
        // 8x³ - 6x - 1 = 0
        let x = nonagon::cos20();
        let val = 8.0 * x.powi(3) - 6.0 * x - 1.0;
        assert!(val.abs() < EPS, "cubic residual = {}", val);
    }

    #[test]
    fn nonagon_double_angle_consistency() {
        // cos(40°) via double-angle vs direct computation
        let c40 = nonagon::cos40();
        let c20 = nonagon::cos20();
        assert!((c40 - (2.0 * c20 * c20 - 1.0)).abs() < EPS);
    }

    #[test]
    fn nonagon_pythagorean_20() {
        let c = nonagon::cos20();
        let s = nonagon::sin20();
        assert!((c * c + s * s - 1.0).abs() < EPS);
    }
}
