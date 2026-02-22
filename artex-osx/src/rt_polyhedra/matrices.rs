//! matrices.rs — IVM spatial arrays: planar N×N and radial concentric arrangements.
//!
//! Junior Phase: J1
//! Status: Stub — no functionality implemented yet.
//! Port from: modules/rt-matrix-planar.js, modules/rt-matrix-radial.js
//!
//! RT-purity notes:
//!   Planar spacing: rational multiples of edge quadrance — NO sin/cos for grid alignment.
//!   45° rotation: s = c = 0.5 (exact rational — Wildberger). √ deferred to GPU.
//!   180° rotation: s = 0, c = 1 (trivial — no irrational needed).
//!   Radial radii: quadrance-based shell spacing (Q = n² × Q_base).

// TODO: MatrixType enum (Planar, Radial)
// TODO: PlanarMatrix { polyhedron_type, n: usize, spacing_q: f64, rotation_deg: u8 }
//        → Vec<Transform> (N×N positions, RT-pure spacing)
// TODO: RadialMatrix { polyhedron_type, shells: usize, base_q: f64 }
//        → Vec<Transform> (concentric shells, quadrance radii)
// TODO: build_planar_matrix(config) -> Vec<PolyhedronData>
// TODO: build_radial_matrix(config) -> Vec<PolyhedronData>
// TODO: rational_45_rotation(v: [f64; 3]) -> [f64; 3]  — s=0.5, c=0.5, no trig

#[cfg(test)]
mod tests {
    // TODO: planar 2×2 → 4 instances at correct rational offsets
    // TODO: radial 3 shells → correct quadrance spacing
}
