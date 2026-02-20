//! PurePhi — Golden ratio symbolic algebra
//!
//! φ = (1 + √5)/2 ≈ 1.618033988749895
//!
//! Key identities (algebraic, no multiplication/division needed):
//!   φ² = φ + 1
//!   1/φ = φ - 1
//!   φ³ = 2φ + 1
//!   φ⁴ = 3φ + 2
//!
//! Used in icosahedron and dodecahedron geometry.

use std::sync::OnceLock;

/// Cached √5 — computed once, reused everywhere.
pub fn sqrt5() -> f64 {
    static SQRT5: OnceLock<f64> = OnceLock::new();
    *SQRT5.get_or_init(|| 5.0_f64.sqrt())
}

/// φ = (1 + √5)/2
pub fn phi() -> f64 {
    0.5 * (1.0 + sqrt5())
}

/// φ² = φ + 1 (algebraic identity — exact)
pub fn phi_squared() -> f64 {
    phi() + 1.0
}

/// 1/φ = φ - 1 (algebraic identity — exact)
pub fn phi_inverse() -> f64 {
    phi() - 1.0
}

/// φ³ = 2φ + 1
pub fn phi_cubed() -> f64 {
    2.0 * phi() + 1.0
}

/// φ⁴ = 3φ + 2
pub fn phi_fourth() -> f64 {
    3.0 * phi() + 2.0
}

/// Symbolic golden ratio expression: (a + b√5) / c
///
/// Maintains algebraic exactness through computation chains.
/// Call `to_decimal()` only at the GPU boundary.
#[derive(Debug, Clone, Copy)]
pub struct PhiSymbolic {
    pub a: f64,
    pub b: f64,
    pub c: f64,
}

impl PhiSymbolic {
    pub const fn new(a: f64, b: f64, c: f64) -> Self {
        Self { a, b, c }
    }

    // --- Common constants ---
    pub const PHI: Self = Self {
        a: 1.0,
        b: 1.0,
        c: 2.0,
    }; // (1+√5)/2
    pub const PHI_SQ: Self = Self {
        a: 3.0,
        b: 1.0,
        c: 2.0,
    }; // (3+√5)/2
    pub const INV_PHI: Self = Self {
        a: -1.0,
        b: 1.0,
        c: 2.0,
    }; // (-1+√5)/2
    pub const ONE: Self = Self {
        a: 1.0,
        b: 0.0,
        c: 1.0,
    };
    pub const ZERO: Self = Self {
        a: 0.0,
        b: 0.0,
        c: 1.0,
    };

    /// Convert to decimal — THE expansion point.
    pub fn to_decimal(&self) -> f64 {
        (self.a + self.b * sqrt5()) / self.c
    }

    /// Multiply: (a₁+b₁√5)/c₁ × (a₂+b₂√5)/c₂
    pub fn multiply(&self, other: &Self) -> Self {
        Self {
            a: self.a * other.a + 5.0 * self.b * other.b,
            b: self.a * other.b + self.b * other.a,
            c: self.c * other.c,
        }
    }

    /// Add: find common denominator and combine.
    pub fn add(&self, other: &Self) -> Self {
        Self {
            a: self.a * other.c + other.a * self.c,
            b: self.b * other.c + other.b * self.c,
            c: self.c * other.c,
        }
    }

    /// Subtract.
    pub fn subtract(&self, other: &Self) -> Self {
        Self {
            a: self.a * other.c - other.a * self.c,
            b: self.b * other.c - other.b * self.c,
            c: self.c * other.c,
        }
    }

    /// Scale by rational number.
    pub fn scale(&self, k: f64) -> Self {
        Self {
            a: self.a * k,
            b: self.b * k,
            c: self.c,
        }
    }
}

impl std::fmt::Display for PhiSymbolic {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.b == 0.0 {
            write!(f, "{}/{}", self.a, self.c)
        } else {
            let sign = if self.b >= 0.0 { "+" } else { "" };
            write!(f, "({} {}{}√5)/{}", self.a, sign, self.b, self.c)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const EPS: f64 = 1e-14;

    #[test]
    fn phi_value() {
        assert!((phi() - 1.618033988749895).abs() < EPS);
    }

    #[test]
    fn phi_squared_identity() {
        assert!((phi_squared() - (phi() + 1.0)).abs() < EPS);
    }

    #[test]
    fn phi_inverse_identity() {
        assert!((1.0 / phi() - phi_inverse()).abs() < EPS);
    }

    #[test]
    fn phi_cubed_identity() {
        assert!((phi().powi(3) - phi_cubed()).abs() < EPS);
    }

    #[test]
    fn phi_fourth_identity() {
        assert!((phi().powi(4) - phi_fourth()).abs() < EPS);
    }

    #[test]
    fn symbolic_phi_to_decimal() {
        assert!((PhiSymbolic::PHI.to_decimal() - phi()).abs() < EPS);
    }

    #[test]
    fn symbolic_multiply_phi_squared() {
        let p = PhiSymbolic::PHI;
        let p2 = p.multiply(&p);
        assert!((p2.to_decimal() - phi_squared()).abs() < EPS);
    }

    #[test]
    fn symbolic_add_phi_plus_one() {
        let result = PhiSymbolic::PHI.add(&PhiSymbolic::ONE);
        // φ + 1 = φ²
        assert!((result.to_decimal() - phi_squared()).abs() < EPS);
    }
}
