//! ARTEX Normalizer — XYZ ↔ Quadray ABCD Conversion API
//!
//! A standalone translation service between XYZ Cartesian and Quadray ABCD
//! coordinate systems. Sits at the boundary between the external XYZ world
//! (other tools, file formats, GPU) and the internal ABCD world (all geometry).
//!
//! **Normalization is OPTIONAL.** The full 4D± system operates without the
//! zero-sum constraint. Normalization is required only for XYZ conversion
//! (projecting 4D → 3D) and destroys arena information by forcing min(ABCD) = 0.
//!
//! Theory: Janus10.tex (Geometry Documents/Whitepaper LaTEX/)
//!   §2.3  Zero-sum constraint as projection from 4D to 3D
//!   §2.6  Rationality Reciprocity — Q_tet/Q_cube = 2 (exact rational)
//!   §3    Janus Inversion — sign-flip in all 4 coordinates
//!         P_i ↦ -P_i maps tet ↔ dual tet; normalization collapses this
//!         distinction by shifting min → 0.
//!
//! ABCD Basis Vectors (Quadray → Cartesian):
//!   A = (-1, -1, +1)  Yellow  index 0
//!   B = (+1, +1, +1)  Red     index 1
//!   C = (-1, +1, -1)  Blue    index 2
//!   D = (+1, -1, -1)  Green   index 3
//!
//! Must match shader.wgsl BASIS matrix exactly.

use super::Quadray;

/// ABCD basis vectors: Quadray → Cartesian conversion matrix.
/// Each row is a basis vector [x, y, z].
/// Single source of truth — shader.wgsl carries a copy for the GPU.
pub const BASIS: [[f64; 3]; 4] = [
    [-1.0, -1.0, 1.0],  // A (Yellow)
    [1.0, 1.0, 1.0],    // B (Red)
    [-1.0, 1.0, -1.0],  // C (Blue)
    [1.0, -1.0, -1.0],  // D (Green)
];

// ─── Canonical conversion (with normalization) ────────────────────────

/// Convert Quadray ABCD → Cartesian XYZ.
///
/// Algorithm: zero-sum normalize (subtract average), then multiply by BASIS.
/// Produces identical results to shader.wgsl `BASIS * normalized`.
pub fn quadray_to_xyz(q: &Quadray) -> [f64; 3] {
    let n = q.normalize();
    [
        n.a * BASIS[0][0] + n.b * BASIS[1][0] + n.c * BASIS[2][0] + n.d * BASIS[3][0],
        n.a * BASIS[0][1] + n.b * BASIS[1][1] + n.c * BASIS[2][1] + n.d * BASIS[3][1],
        n.a * BASIS[0][2] + n.b * BASIS[1][2] + n.c * BASIS[2][2] + n.d * BASIS[3][2],
    ]
}

/// Convert Cartesian XYZ → Quadray ABCD (canonical form).
///
/// Solves the 4×4 linear system (zero-sum + 3 basis equations),
/// then shifts to canonical form (min component → 0).
///
/// Exact inverse: `xyz_to_quadray(quadray_to_xyz(q))` recovers canonical(q).
pub fn xyz_to_quadray(xyz: [f64; 3]) -> Quadray {
    let [n_a, n_b, n_c, n_d] = xyz_to_abcd_raw(xyz);
    // Shift to canonical form: min component → 0
    let min = n_a.min(n_b).min(n_c).min(n_d);
    Quadray::new(n_a - min, n_b - min, n_c - min, n_d - min)
}

// ─── Raw conversion (without canonical normalization) ─────────────────

/// Convert raw ABCD components → Cartesian XYZ.
///
/// Accepts any ABCD values (positive, negative, non-canonical).
/// Applies zero-sum normalization for the 4D → 3D projection
/// but does NOT require canonical input.
///
/// Janus-safe: `quadray_to_xyz_raw([-1,0,0,0])` and
/// `quadray_to_xyz_raw([0,1,1,1])` produce the same XYZ —
/// they are the same 3D point viewed from different 4D arenas.
pub fn quadray_to_xyz_raw(abcd: [f64; 4]) -> [f64; 3] {
    let avg = (abcd[0] + abcd[1] + abcd[2] + abcd[3]) / 4.0;
    let n = [abcd[0] - avg, abcd[1] - avg, abcd[2] - avg, abcd[3] - avg];
    [
        n[0] * BASIS[0][0] + n[1] * BASIS[1][0] + n[2] * BASIS[2][0] + n[3] * BASIS[3][0],
        n[0] * BASIS[0][1] + n[1] * BASIS[1][1] + n[2] * BASIS[2][1] + n[3] * BASIS[3][1],
        n[0] * BASIS[0][2] + n[1] * BASIS[1][2] + n[2] * BASIS[2][2] + n[3] * BASIS[3][2],
    ]
}

/// Convert Cartesian XYZ → raw zero-sum ABCD (NOT canonical).
///
/// Returns the zero-sum normalized components where `a + b + c + d = 0`.
/// Components can be negative. No min-shift to canonical form.
///
/// Preserves full 4D± information for Janus transitions:
/// the sign pattern tells you which arena the point belongs to.
pub fn xyz_to_quadray_raw(xyz: [f64; 3]) -> [f64; 4] {
    xyz_to_abcd_raw(xyz)
}

// ─── Batch conversion (mesh import/export) ────────────────────────────

/// Batch convert Quadray vertices → Cartesian XYZ.
///
/// For mesh export to standard formats (OBJ, STL, PLY).
/// Topology (edges, faces) is index-based and passes through unchanged.
pub fn batch_quadray_to_xyz(vertices: &[Quadray]) -> Vec<[f64; 3]> {
    vertices.iter().map(quadray_to_xyz).collect()
}

/// Batch convert Cartesian XYZ vertices → Quadray ABCD (canonical).
///
/// For mesh import from standard formats.
pub fn batch_xyz_to_quadray(vertices: &[[f64; 3]]) -> Vec<Quadray> {
    vertices.iter().map(|xyz| xyz_to_quadray(*xyz)).collect()
}

// ─── Internal ─────────────────────────────────────────────────────────

/// Closed-form solution of the 4×4 linear system:
///   n_a + n_b + n_c + n_d = 0       (zero-sum constraint)
///   -n_a + n_b - n_c + n_d = x       (from BASIS column 0)
///   -n_a + n_b + n_c - n_d = y       (from BASIS column 1)
///    n_a + n_b - n_c - n_d = z       (from BASIS column 2)
fn xyz_to_abcd_raw(xyz: [f64; 3]) -> [f64; 4] {
    let [x, y, z] = xyz;
    [
        (-x - y + z) / 4.0,  // n_a
        (x + y + z) / 4.0,   // n_b
        (-x + y - z) / 4.0,  // n_c
        (x - y - z) / 4.0,   // n_d
    ]
}

// ─── Tests ────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    const EPS: f64 = 1e-12;

    fn approx_eq(a: f64, b: f64) -> bool {
        (a - b).abs() < EPS
    }

    fn xyz_approx_eq(a: [f64; 3], b: [f64; 3]) -> bool {
        approx_eq(a[0], b[0]) && approx_eq(a[1], b[1]) && approx_eq(a[2], b[2])
    }

    // --- Basis vector conversion ---

    #[test]
    fn basis_a_to_xyz() {
        let xyz = quadray_to_xyz(&Quadray::A);
        assert!(xyz_approx_eq(xyz, [-1.0, -1.0, 1.0]), "A → {:?}", xyz);
    }

    #[test]
    fn basis_b_to_xyz() {
        let xyz = quadray_to_xyz(&Quadray::B);
        assert!(xyz_approx_eq(xyz, [1.0, 1.0, 1.0]), "B → {:?}", xyz);
    }

    #[test]
    fn basis_c_to_xyz() {
        let xyz = quadray_to_xyz(&Quadray::C);
        assert!(xyz_approx_eq(xyz, [-1.0, 1.0, -1.0]), "C → {:?}", xyz);
    }

    #[test]
    fn basis_d_to_xyz() {
        let xyz = quadray_to_xyz(&Quadray::D);
        assert!(xyz_approx_eq(xyz, [1.0, -1.0, -1.0]), "D → {:?}", xyz);
    }

    // --- Dual tet vertices ---

    #[test]
    fn dual_a_absent_to_xyz() {
        let q = Quadray::new(0.0, 1.0, 1.0, 1.0);
        let xyz = quadray_to_xyz(&q);
        assert!(xyz_approx_eq(xyz, [1.0, 1.0, -1.0]), "A-absent → {:?}", xyz);
    }

    // --- Roundtrip ---

    #[test]
    fn roundtrip_canonical() {
        // quadray → xyz → quadray should recover canonical form
        let verts = [Quadray::A, Quadray::B, Quadray::C, Quadray::D,
                     Quadray::new(0.0, 1.0, 1.0, 1.0), // A-absent
                     Quadray::new(1.0, 0.0, 1.0, 1.0)]; // B-absent
        for q in &verts {
            let xyz = quadray_to_xyz(q);
            let recovered = xyz_to_quadray(xyz);
            let xyz2 = quadray_to_xyz(&recovered);
            assert!(xyz_approx_eq(xyz, xyz2),
                "roundtrip failed: {:?} → {:?} → {:?} → {:?}", q, xyz, recovered, xyz2);
        }
    }

    // --- Raw conversion ---

    #[test]
    fn raw_roundtrip() {
        // xyz → raw_abcd → xyz should be identity
        let test_points: Vec<[f64; 3]> = vec![
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
            [0.0, 0.0, 1.0],
            [1.0, 2.0, 3.0],
            [-1.0, -1.0, 1.0],
        ];
        for xyz in &test_points {
            let abcd = xyz_to_quadray_raw(*xyz);
            let recovered = quadray_to_xyz_raw(abcd);
            assert!(xyz_approx_eq(*xyz, recovered),
                "raw roundtrip failed: {:?} → {:?} → {:?}", xyz, abcd, recovered);
        }
    }

    #[test]
    fn raw_preserves_sign() {
        // Raw conversion should return negative components (no min-shift)
        let abcd = xyz_to_quadray_raw([1.0, 1.0, 1.0]);
        // n_a = (-1-1+1)/4 = -0.25, n_b = (1+1+1)/4 = 0.75
        assert!(abcd[0] < 0.0, "raw n_a should be negative: {}", abcd[0]);
        assert!(approx_eq(abcd[0] + abcd[1] + abcd[2] + abcd[3], 0.0),
            "raw should be zero-sum: {}", abcd[0] + abcd[1] + abcd[2] + abcd[3]);
    }

    #[test]
    fn janus_equivalence() {
        // A = [1,0,0,0] and its Janus inverse [-1,0,0,0]
        // should map to DIFFERENT XYZ (A and its negation)
        let xyz_a = quadray_to_xyz_raw([1.0, 0.0, 0.0, 0.0]);
        let xyz_neg_a = quadray_to_xyz_raw([-1.0, 0.0, 0.0, 0.0]);
        // Negating all coords negates the XYZ output (Janus inversion)
        assert!(xyz_approx_eq(xyz_neg_a, [-xyz_a[0], -xyz_a[1], -xyz_a[2]]),
            "Janus: -A should negate XYZ: {:?} vs {:?}", xyz_neg_a, xyz_a);

        // But [-1,0,0,0] normalized to canonical form [0,1,1,1] (A-absent = dual A)
        // maps to the SAME XYZ as the canonical dual vertex
        let dual_a = Quadray::new(0.0, 1.0, 1.0, 1.0);
        let xyz_dual = quadray_to_xyz(&dual_a);
        let xyz_neg_canonical = quadray_to_xyz_raw([0.0, 1.0, 1.0, 1.0]);
        assert!(xyz_approx_eq(xyz_dual, xyz_neg_canonical),
            "canonical dual should match: {:?} vs {:?}", xyz_dual, xyz_neg_canonical);
    }

    // --- Batch conversion ---

    #[test]
    fn batch_matches_individual() {
        let verts = vec![Quadray::A, Quadray::B, Quadray::C, Quadray::D];
        let batch_result = batch_quadray_to_xyz(&verts);
        for (i, q) in verts.iter().enumerate() {
            let individual = quadray_to_xyz(q);
            assert!(xyz_approx_eq(batch_result[i], individual),
                "batch[{}] mismatch: {:?} vs {:?}", i, batch_result[i], individual);
        }
    }

    #[test]
    fn batch_import_export_roundtrip() {
        let xyz_verts = vec![[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]];
        let quadrays = batch_xyz_to_quadray(&xyz_verts);
        let recovered = batch_quadray_to_xyz(&quadrays);
        for i in 0..xyz_verts.len() {
            assert!(xyz_approx_eq(xyz_verts[i], recovered[i]),
                "batch roundtrip[{}] failed: {:?} → {:?}", i, xyz_verts[i], recovered[i]);
        }
    }

    // --- Origin ---

    #[test]
    fn origin_roundtrip() {
        let xyz = quadray_to_xyz(&Quadray::ORIGIN);
        assert!(xyz_approx_eq(xyz, [0.0, 0.0, 0.0]));
        let recovered = xyz_to_quadray([0.0, 0.0, 0.0]);
        assert!(approx_eq(recovered.a, 0.0) && approx_eq(recovered.b, 0.0)
             && approx_eq(recovered.c, 0.0) && approx_eq(recovered.d, 0.0));
    }
}
