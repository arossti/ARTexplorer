//! helices.rs — Helical chains of face-sharing tetrahedra (Tetrahelix variants).
//!
//! Junior Phase: J1
//! Status: Stub — no functionality implemented yet.
//! Port from: modules/rt-helices.js
//!
//! RT-purity notes:
//!   Face-sharing algorithm uses spread = 8/9 (tetrahedral dihedral, validated in platonic.rs).
//!   Apex Q ratio = 2/3 (tet height from edge quadrance — exact rational).
//!   PurePhi (rt_math/phi.rs) for icosahedral applications in Tetrahelix3.
//!   NO sin/cos for helix orientation — dihedral propagation via spread arithmetic.
//!
//! Variants:
//!   Tetrahelix1: Toroidal, left-handed. Max 48 tets before closure to torus.
//!   Tetrahelix2: Linear multi-strand, tetrahedral seed. Unbounded.
//!   Tetrahelix3: Linear multi-strand, octahedral seed. Unbounded.

// TODO: HelixType enum (Toroidal, LinearTet, LinearOcta)
// TODO: HelixConfig { helix_type, count: usize, strand_count: usize }
// TODO: build_tetrahelix(config) -> Vec<PolyhedronData>
//        face-sharing: orient next tet from current face normal + spread=8/9
// TODO: tetrahelix_face_normal(tet, face_idx) -> Quadray
// TODO: next_tet_from_face(tet, shared_face) -> PolyhedronData

#[cfg(test)]
mod tests {
    // TODO: toroidal Tetrahelix1 with count=48 closes (first ≈ last vertex)
    // TODO: linear chain edge quadrance uniform throughout
    // TODO: face-sharing: shared face has matching vertices in both tets
}
