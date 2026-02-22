//! primitives.rs — 2D/3D geometric primitives: Point, Line, N-gon, Prism, Cone, Penrose.
//!
//! Junior Phase: J1
//! Status: Stub — no functionality implemented yet.
//! Port from: modules/rt-primitives.js, modules/rt-penrose.js
//!
//! RT-purity notes:
//!   N-gon: reuses rt_math/polygon.rs Wildberger reflection method (1 √ only).
//!   Prism: N-gon base extruded by Q_height (deferred √ for height).
//!   Penrose: PurePhi (rt_math/phi.rs) for φ-rational thick/thin rhombi and kite/dart.
//!     Deflation algorithm: substitution rules on tile types, no sin/cos.

// TODO: Point — single vertex at origin or position
// TODO: Line — two vertices at ±√Q/2 along axis (Q = quadrance = length²)
// TODO: NGon — N-gon polygon via polygon::n_gon_vertices(n, radius)
//              with optional face (fan triangulation from centroid)
// TODO: Prism — NGon base + top + lateral faces; Q_height parameterized
// TODO: Cone — NGon base + apex; degenerate case of Prism with top collapsed
// TODO: PenroseTile enum (Thick, Thin, Kite, Dart)
// TODO: PenroseTiling { tiles, generations } — deflation-based generation
//        using PurePhi from rt_math/phi.rs; no Math.sin/cos

#[cfg(test)]
mod tests {
    // TODO: NGon n=3 → equilateral triangle spread = 3/4
    // TODO: NGon n=4 → square spread = 1/2
    // TODO: Prism n=3 Euler V-E+F = 2
    // TODO: Penrose thick tile golden ratio diagonal ratio
}
