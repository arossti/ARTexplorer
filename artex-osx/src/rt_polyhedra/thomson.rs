//! thomson.rs — Thomson great-circle shells on Platonic solid symmetry planes.
//!
//! Junior Phase: J6
//! Status: Stub — no functionality implemented yet.
//! Port from: modules/rt-thomson.js
//!
//! RT-purity notes:
//!   Circles generated via rt_math/polygon.rs Wildberger reflection (1 √ per circle).
//!   Degree→slope conversion at UX rotation boundary only; all circle geometry is RT-pure.
//!   Gram-Schmidt orthonormal basis: pure f64 linear algebra (dot products, cross products).
//!
//! Output per polyhedron:
//!   Tetrahedron:  10 circles (4 face + 6 edge planes)
//!   Octahedron:    3 circles (3 coordinate planes)
//!   Cube:          9 circles
//!   Icosahedron:  15 circles (φ-based edge mirrors)

// TODO: CircleData { vertices: Vec<Quadray>, edges: Vec<[usize; 2]> }
// TODO: ThomsonOutput { circles: Vec<CircleData>, nodes: Vec<Quadray>,
//                        edges: Vec<[usize; 2]>, plane_count: usize, coincident_count: usize }
// TODO: build_plane_basis(normal: [f64; 3]) -> ([f64; 3], [f64; 3])
//        Gram-Schmidt orthonormal basis for the plane (no sin/cos)
// TODO: make_circle(normal, radius, n_gon, rotation_rad) -> CircleData
//        Generate N-gon vertices via polygon::n_gon_vertices(), transform to 3D
// TODO: collect_circle_vertices(circles, n_gon) -> (Vec<Quadray>, Vec<[usize;2]>)
//        Deduplicate nodes (Q < 1e-8), collect edges
// TODO: Thomson::tetrahedron(half_size, n_gon) -> ThomsonOutput
// TODO: Thomson::octahedron(half_size, n_gon) -> ThomsonOutput
// TODO: Thomson::cube(half_size, n_gon) -> ThomsonOutput
// TODO: Thomson::icosahedron(half_size, n_gon) -> ThomsonOutput

#[cfg(test)]
mod tests {
    // TODO: tetrahedron() → plane_count = 10
    // TODO: octahedron() → plane_count = 3
    // TODO: cube() → plane_count = 9
    // TODO: icosahedron() → plane_count = 15
    // TODO: all circles closed (last vertex ≈ first vertex)
    // TODO: nodes on circumsphere (Q uniform)
}
