//! projections.rs — Generalized polyhedron projection and prime n-gon presets.
//!
//! Junior Phase: J9
//! Status: Stub — no functionality implemented yet.
//! Port from: modules/rt-projections.js, modules/rt-prime-cuts.js
//!
//! Generalized projection: project polyhedron vertices onto a 2D plane,
//! compute convex hull, display as viewport overlay.
//! Prime n-gon presets: specific (polyhedron, camera view) pairs that project
//! to exact prime polygons (5-gon, 7-gon, 11-gon, 13-gon).
//! See: Geometry Documents/Whitepaper LaTEX/Prime-Projection-Conjecture.tex

// TODO: ProjectionPlane struct (normal: [f64; 3], origin: [f64; 3])
// TODO: project_vertices(vertices, plane) -> Vec<[f64; 2]>
// TODO: convex_hull_2d(points) -> Vec<[f64; 2]>  (Graham scan, cross product test)
// TODO: PrimeCutPreset struct (name, polyhedron, camera_preset, expected_n)
// TODO: PRIME_PRESETS: [PrimeCutPreset; N]  — 5, 7, 11, 13-gon presets
// TODO: build_projection_overlay(hull, viewport) -> ProjectionGeometry
// TODO: export_projection_svg(hull, filename)
// TODO: draw_projection_controls(ui, state)

#[cfg(test)]
mod tests {
    // TODO: convex hull of square → 4 vertices
    // TODO: tests land with full implementation
}
