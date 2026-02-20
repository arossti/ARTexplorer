//! PureRadicals — Cached radical constants
//!
//! Compute √2, √3, √6 once and cache for IEEE 754 precision consistency.
//! Same pattern as PurePhi: defer expansion until GPU boundary.

use std::sync::OnceLock;

/// √2 ≈ 1.4142135623730951
pub fn sqrt2() -> f64 {
    static VAL: OnceLock<f64> = OnceLock::new();
    *VAL.get_or_init(|| 2.0_f64.sqrt())
}

/// √3 ≈ 1.7320508075688772
pub fn sqrt3() -> f64 {
    static VAL: OnceLock<f64> = OnceLock::new();
    *VAL.get_or_init(|| 3.0_f64.sqrt())
}

/// √6 ≈ 2.449489742783178
pub fn sqrt6() -> f64 {
    static VAL: OnceLock<f64> = OnceLock::new();
    *VAL.get_or_init(|| 6.0_f64.sqrt())
}

/// Quadray grid interval: √6/4
/// The perpendicular distance between parallel tetrahedral planes.
pub fn quadray_grid_interval() -> f64 {
    sqrt6() / 4.0
}

#[cfg(test)]
mod tests {
    use super::*;

    const EPS: f64 = 1e-15;

    #[test]
    fn sqrt2_squared() {
        assert!((sqrt2() * sqrt2() - 2.0).abs() < EPS);
    }

    #[test]
    fn sqrt3_squared() {
        assert!((sqrt3() * sqrt3() - 3.0).abs() < EPS);
    }

    #[test]
    fn sqrt6_squared() {
        assert!((sqrt6() * sqrt6() - 6.0).abs() < EPS);
    }

    #[test]
    fn sqrt6_is_sqrt2_times_sqrt3() {
        assert!((sqrt6() - sqrt2() * sqrt3()).abs() < EPS);
    }

    #[test]
    fn quadray_grid_interval_value() {
        assert!((quadray_grid_interval() - 0.6123724356957945).abs() < 1e-14);
    }
}
