//! Platonic solid generators — all in Quadray ABCD coordinates
//!
//! Tetrahedron vertices are the ABCD basis vectors themselves.
//! Higher polyhedra built from Quadray permutation patterns:
//!   Tet:   {1,0,0,0} permutations (4 vertices)
//!   Dual:  {0,1,1,1} permutations (4 vertices)
//!   Octa:  {1,1,0,0} permutations (6 vertices)
//!   Cube:  all ±1 combinations in Cartesian (8 vertices)
//!   Icosa: golden rectangle vertices (12 vertices)
//!   Dodeca: dual of icosahedron (20 vertices)

use crate::rt_math::phi;
use crate::rt_math::Quadray;

use super::PolyhedronData;

/// Tetrahedron — the fundamental Quadray solid.
///
/// Vertices are the 4 ABCD basis vectors: [1,0,0,0], [0,1,0,0], [0,0,1,0], [0,0,0,1].
/// Edge quadrance Q = 8 (from ABCD basis geometry).
/// Face spread = 8/9 (exact rational).
pub fn tetrahedron() -> PolyhedronData {
    PolyhedronData {
        name: "Tetrahedron",
        schlafli: "{3,3}",
        vertices: vec![Quadray::A, Quadray::B, Quadray::C, Quadray::D],
        edges: vec![[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]],
        faces: vec![
            vec![0, 1, 2], // Face opposite D
            vec![0, 3, 1], // Face opposite C
            vec![0, 2, 3], // Face opposite B
            vec![1, 3, 2], // Face opposite A
        ],
        face_spread: Some(8.0 / 9.0),
        edge_quadrance: 8.0,
    }
}

/// Dual Tetrahedron — the "A-absent" complement.
///
/// Vertices: [0,1,1,1], [1,0,1,1], [1,1,0,1], [1,1,1,0].
/// Each vertex is the complement of a basis vector (sum of the other three).
/// Forms the stella octangula when combined with the base tetrahedron.
pub fn dual_tetrahedron() -> PolyhedronData {
    PolyhedronData {
        name: "Dual Tetrahedron",
        schlafli: "{3,3}",
        vertices: vec![
            Quadray::new(0.0, 1.0, 1.0, 1.0), // A-absent
            Quadray::new(1.0, 0.0, 1.0, 1.0), // B-absent
            Quadray::new(1.0, 1.0, 0.0, 1.0), // C-absent
            Quadray::new(1.0, 1.0, 1.0, 0.0), // D-absent
        ],
        edges: vec![[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]],
        faces: vec![
            vec![0, 2, 1], // Reversed winding (inversion flips normals)
            vec![0, 1, 3],
            vec![0, 3, 2],
            vec![1, 2, 3],
        ],
        face_spread: Some(8.0 / 9.0),
        edge_quadrance: 8.0,
    }
}

/// Octahedron — {1,1,0,0} permutations in Quadray.
///
/// 6 vertices from all ways to place two 1s in ABCD.
/// Edge quadrance Q = 8 (same as tetrahedron at this scale).
/// Face spread = 8/9.
pub fn octahedron() -> PolyhedronData {
    let vertices = vec![
        Quadray::new(1.0, 1.0, 0.0, 0.0), // AB
        Quadray::new(1.0, 0.0, 1.0, 0.0), // AC
        Quadray::new(1.0, 0.0, 0.0, 1.0), // AD
        Quadray::new(0.0, 1.0, 1.0, 0.0), // BC
        Quadray::new(0.0, 1.0, 0.0, 1.0), // BD
        Quadray::new(0.0, 0.0, 1.0, 1.0), // CD
    ];

    // 12 edges — each vertex connects to 4 others (not its complement)
    let edges = vec![
        [0, 1], [0, 2], [0, 3], [0, 4], // AB connects to AC, AD, BC, BD
        [1, 2], [1, 3], [1, 5],          // AC connects to AD, BC, CD
        [2, 4], [2, 5],                   // AD connects to BD, CD
        [3, 4], [3, 5],                   // BC connects to BD, CD
        [4, 5],                           // BD connects to CD
    ];

    // 8 triangular faces (CCW winding for outward normals)
    let faces = vec![
        vec![0, 3, 1], // AB-BC-AC (top face around A+B axis)
        vec![0, 4, 3], // AB-BD-BC
        vec![0, 2, 4], // AB-AD-BD
        vec![0, 1, 2], // AB-AC-AD
        vec![5, 1, 3], // CD-AC-BC (bottom face around C+D axis)
        vec![5, 3, 4], // CD-BC-BD
        vec![5, 4, 2], // CD-BD-AD
        vec![5, 2, 1], // CD-AD-AC
    ];

    PolyhedronData {
        name: "Octahedron",
        schlafli: "{3,4}",
        vertices,
        edges,
        faces,
        face_spread: Some(8.0 / 9.0),
        edge_quadrance: 8.0,
    }
}

/// Cube — the stella octangula: union of tetrahedron + dual tetrahedron.
///
/// **Pure Quadray definition.** The cube does not need Cartesian coordinates.
/// Its 8 vertices ARE the 4 tet basis vectors + 4 dual complement vectors:
///   Tet:  [1,0,0,0] [0,1,0,0] [0,0,1,0] [0,0,0,1]   — all integers
///   Dual: [0,1,1,1] [1,0,1,1] [1,1,0,1] [1,1,1,0]   — all integers
///
/// Each tet vertex connects to exactly 3 dual vertices (the cube edges).
/// No from_cartesian(). No √2. No irrationals. This is a world first.
///
/// Edge quadrance Q = 4 (between any tet vertex and its 3 adjacent duals).
pub fn cube() -> PolyhedronData {
    // Vertices 0-3: tetrahedron basis (ABCD one-hot)
    // Vertices 4-7: dual tetrahedron (ABCD one-absent complements)
    let vertices = vec![
        // Tet
        Quadray::A,                         // 0: A  → (-1,-1, 1)
        Quadray::B,                         // 1: B  → ( 1, 1, 1)
        Quadray::C,                         // 2: C  → (-1, 1,-1)
        Quadray::D,                         // 3: D  → ( 1,-1,-1)
        // Dual Tet
        Quadray::new(0.0, 1.0, 1.0, 1.0),  // 4: A-absent → ( 1, 1,-1)
        Quadray::new(1.0, 0.0, 1.0, 1.0),  // 5: B-absent → (-1,-1,-1)
        Quadray::new(1.0, 1.0, 0.0, 1.0),  // 6: C-absent → ( 1,-1, 1)
        Quadray::new(1.0, 1.0, 1.0, 0.0),  // 7: D-absent → (-1, 1, 1)
    ];

    // 12 cube edges: each tet vertex connects to 3 adjacent dual vertices
    // (vertices that differ in exactly one Cartesian coordinate)
    let edges = vec![
        // A connects to B-absent, C-absent, D-absent
        [0, 5], [0, 6], [0, 7],
        // B connects to A-absent, C-absent, D-absent
        [1, 4], [1, 6], [1, 7],
        // C connects to A-absent, B-absent, D-absent
        [2, 4], [2, 5], [2, 7],
        // D connects to A-absent, B-absent, C-absent
        [3, 4], [3, 5], [3, 6],
    ];

    // 6 faces (CCW winding for outward normals)
    let faces = vec![
        vec![0, 6, 1, 7], // z=+1: A, C-abs, B, D-abs
        vec![5, 2, 4, 3], // z=-1: B-abs, C, A-abs, D
        vec![5, 3, 6, 0], // y=-1: B-abs, D, C-abs, A
        vec![4, 2, 7, 1], // y=+1: A-abs, C, D-abs, B
        vec![5, 0, 7, 2], // x=-1: B-abs, A, D-abs, C
        vec![3, 4, 1, 6], // x=+1: D, A-abs, B, C-abs
    ];

    PolyhedronData {
        name: "Cube",
        schlafli: "{4,3}",
        vertices,
        edges,
        faces,
        face_spread: Some(1.0), // Perpendicular faces
        edge_quadrance: 4.0,
    }
}

/// Icosahedron — 12 vertices, pure Quadray ABCD.
///
/// **Every vertex is a permutation of (0, 1, φ, φ²) / 2.**
/// 12 of the 24 possible permutations of {0, 1, φ, φ+1}.
/// No from_cartesian(). No Cartesian intermediaries.
///
/// In Cartesian projection these are the "three golden rectangles"
/// (0, ±1, ±φ) and cyclic permutations — but that's a Cartesian
/// observation, not how the geometry is defined.
///
/// Edge quadrance Q = 4 (for unit golden rectangle edge).
pub fn icosahedron() -> PolyhedronData {
    let p = phi::phi();           // φ
    let p2 = phi::phi_squared();  // φ² = φ + 1
    let h = 0.5;

    // Every vertex: permutation of (0, 1, φ, φ+1) / 2
    let vertices = vec![
        Quadray::new(p * h,  p2 * h, 1.0 * h, 0.0),      // 0: (φ, φ+1, 1, 0)/2
        Quadray::new(p2 * h, p * h,  0.0,     1.0 * h),   // 1: (φ+1, φ, 0, 1)/2
        Quadray::new(0.0,    1.0 * h, p2 * h, p * h),     // 2: (0, 1, φ+1, φ)/2
        Quadray::new(1.0 * h, 0.0,   p * h,   p2 * h),    // 3: (1, 0, φ, φ+1)/2
        Quadray::new(0.0,    p2 * h, p * h,   1.0 * h),   // 4: (0, φ+1, φ, 1)/2
        Quadray::new(1.0 * h, p * h, p2 * h,  0.0),       // 5: (1, φ, φ+1, 0)/2
        Quadray::new(p * h,  1.0 * h, 0.0,    p2 * h),    // 6: (φ, 1, 0, φ+1)/2
        Quadray::new(p2 * h, 0.0,    1.0 * h, p * h),     // 7: (φ+1, 0, 1, φ)/2
        Quadray::new(1.0 * h, p2 * h, 0.0,    p * h),     // 8: (1, φ+1, 0, φ)/2
        Quadray::new(p2 * h, 1.0 * h, p * h,  0.0),       // 9: (φ+1, 1, φ, 0)/2
        Quadray::new(0.0,    p * h,   1.0 * h, p2 * h),   // 10: (0, φ, 1, φ+1)/2
        Quadray::new(p * h,  0.0,     p2 * h,  1.0 * h),  // 11: (φ, 0, φ+1, 1)/2
    ];

    let edges = vec![
        // Top cap (around vertex 0)
        [0, 1], [0, 4], [0, 5], [0, 8], [0, 9],
        // Upper ring
        [1, 8], [8, 4], [4, 5], [5, 9], [9, 1],
        // Middle band
        [1, 6], [1, 7], [8, 6], [8, 10], [4, 10],
        [4, 2], [5, 2], [5, 11], [9, 11], [9, 7],
        // Lower ring
        [6, 10], [10, 2], [2, 11], [11, 7], [7, 6],
        // Bottom cap (around vertex 3)
        [3, 6], [3, 10], [3, 2], [3, 11], [3, 7],
    ];

    let faces = vec![
        // Top cap (CCW winding for outward normals)
        vec![0, 1, 8],
        vec![0, 8, 4],
        vec![0, 4, 5],
        vec![0, 5, 9],
        vec![0, 9, 1],
        // Upper middle
        vec![1, 6, 8],
        vec![8, 10, 4],
        vec![4, 2, 5],
        vec![5, 11, 9],
        vec![9, 7, 1],
        // Lower middle (reversed for outward normals)
        vec![6, 10, 8],
        vec![10, 2, 4],
        vec![2, 11, 5],
        vec![11, 7, 9],
        vec![7, 6, 1],
        // Bottom cap
        vec![3, 10, 6],
        vec![3, 2, 10],
        vec![3, 11, 2],
        vec![3, 7, 11],
        vec![3, 6, 7],
    ];

    // Edge Q = 4 (distance between adjacent golden rectangle vertices)
    PolyhedronData {
        name: "Icosahedron",
        schlafli: "{3,5}",
        vertices,
        edges,
        faces,
        face_spread: Some(4.0 / 9.0),
        edge_quadrance: 4.0,
    }
}

/// Dodecahedron — 20 vertices, pure Quadray ABCD, dual of icosahedron.
///
/// Two vertex families, both pure Quadray:
///   **Cube sub-vertices (8):** tet basis + dual tet basis — all integers {0, 1}.
///   **Phi-rectangle vertices (12):** permutations of (0, φ-1, φ, √5) / 2.
///
/// No from_cartesian(). The cube family IS the stella octangula vertices.
/// √5 = φ + 1/φ = 2φ - 1 (algebraic, not transcendental).
pub fn dodecahedron() -> PolyhedronData {
    let p = phi::phi();           // φ
    let q = phi::phi_inverse();   // 1/φ = φ - 1
    let s = p + q;                // √5 = φ + 1/φ = 2φ - 1
    let h = 0.5;

    let vertices = vec![
        // --- Cube sub-vertices: tet + dual tet (pure integer ABCD) ---
        Quadray::new(0.0, 1.0, 0.0, 0.0),  // 0: B            → ( 1, 1, 1)
        Quadray::new(0.0, 1.0, 1.0, 1.0),  // 1: A-absent      → ( 1, 1,-1)
        Quadray::new(1.0, 1.0, 0.0, 1.0),  // 2: C-absent      → ( 1,-1, 1)
        Quadray::new(0.0, 0.0, 0.0, 1.0),  // 3: D             → ( 1,-1,-1)
        Quadray::new(1.0, 1.0, 1.0, 0.0),  // 4: D-absent      → (-1, 1, 1)
        Quadray::new(0.0, 0.0, 1.0, 0.0),  // 5: C             → (-1, 1,-1)
        Quadray::new(1.0, 0.0, 0.0, 0.0),  // 6: A             → (-1,-1, 1)
        Quadray::new(1.0, 0.0, 1.0, 1.0),  // 7: B-absent      → (-1,-1,-1)
        // --- Phi-rectangle vertices: permutations of (0, q, p, √5) / 2 ---
        Quadray::new(q * h, s * h, p * h, 0.0),      // 8:  (q, √5, p, 0)/2     → ( 0, φ, 1/φ)
        Quadray::new(0.0,   p * h, s * h, q * h),     // 9:  (0, p, √5, q)/2     → ( 0, φ,-1/φ)
        Quadray::new(s * h, q * h, 0.0,   p * h),     // 10: (√5, q, 0, p)/2     → ( 0,-φ, 1/φ)
        Quadray::new(p * h, 0.0,   q * h, s * h),     // 11: (p, 0, q, √5)/2     → ( 0,-φ,-1/φ)
        Quadray::new(p * h, s * h, 0.0,   q * h),     // 12: (p, √5, 0, q)/2     → (1/φ, 0, φ)
        Quadray::new(s * h, p * h, q * h, 0.0),       // 13: (√5, p, q, 0)/2     → (-1/φ, 0, φ)
        Quadray::new(0.0,   q * h, p * h, s * h),     // 14: (0, q, p, √5)/2     → (1/φ, 0,-φ)
        Quadray::new(q * h, 0.0,   s * h, p * h),     // 15: (q, 0, √5, p)/2     → (-1/φ, 0,-φ)
        Quadray::new(0.0,   s * h, q * h, p * h),     // 16: (0, √5, q, p)/2     → ( φ, 1/φ, 0)
        Quadray::new(q * h, p * h, 0.0,   s * h),     // 17: (q, p, 0, √5)/2     → ( φ,-1/φ, 0)
        Quadray::new(p * h, q * h, s * h, 0.0),       // 18: (p, q, √5, 0)/2     → (-φ, 1/φ, 0)
        Quadray::new(s * h, 0.0,   p * h, q * h),     // 19: (√5, 0, p, q)/2     → (-φ,-1/φ, 0)
    ];

    let edges = vec![
        // Top pentagon
        [0, 8], [8, 4], [4, 13], [13, 12], [12, 0],
        // Upper ring
        [0, 16], [8, 9], [4, 18], [13, 6], [12, 2],
        // Upper middle
        [16, 17], [16, 1], [9, 1], [9, 5], [18, 5],
        [18, 19], [6, 19], [6, 10], [2, 10], [2, 17],
        // Lower middle
        [17, 3], [1, 14], [5, 15], [19, 7], [10, 11],
        // Lower ring
        [3, 14], [14, 15], [15, 7], [7, 11], [11, 3],
    ];

    let faces = vec![
        vec![0, 8, 4, 13, 12],     // Top
        vec![0, 12, 2, 17, 16],    // Front-right
        vec![0, 16, 1, 9, 8],      // Back-right
        vec![4, 8, 9, 5, 18],      // Back-left
        vec![4, 18, 19, 6, 13],    // Front-left
        vec![12, 13, 6, 10, 2],    // Front-bottom-left
        vec![16, 17, 3, 14, 1],    // Right-bottom
        vec![9, 1, 14, 15, 5],     // Back-bottom
        vec![18, 5, 15, 7, 19],    // Left-bottom
        vec![6, 19, 7, 11, 10],    // Front-bottom-right
        vec![2, 10, 11, 3, 17],    // Bottom-front
        vec![3, 11, 7, 15, 14],    // Bottom
    ];

    // Edge Q = 4/φ² for this vertex scale
    let eq = 4.0 / phi::phi_squared();
    PolyhedronData {
        name: "Dodecahedron",
        schlafli: "{5,3}",
        vertices,
        edges,
        faces,
        face_spread: Some(4.0 / 5.0),
        edge_quadrance: eq,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rt_math::normalizer::quadray_to_xyz;

    const EPS: f64 = 1e-10;

    fn approx_eq(a: f64, b: f64) -> bool {
        (a - b).abs() < EPS
    }

    // --- Tetrahedron ---

    #[test]
    fn tet_vertex_count() {
        let tet = tetrahedron();
        assert_eq!(tet.vertices.len(), 4);
    }

    #[test]
    fn tet_edge_count() {
        let tet = tetrahedron();
        assert_eq!(tet.edges.len(), 6);
    }

    #[test]
    fn tet_euler() {
        assert!(tetrahedron().validate_euler());
    }

    #[test]
    fn tet_uniform_edges() {
        assert!(tetrahedron().validate_edges(1e-10));
    }

    #[test]
    fn tet_a_vertex_matches_shader() {
        let tet = tetrahedron();
        let xyz = quadray_to_xyz(&tet.vertices[0]);
        assert!(approx_eq(xyz[0], -1.0), "A.x = {} != -1", xyz[0]);
        assert!(approx_eq(xyz[1], -1.0), "A.y = {} != -1", xyz[1]);
        assert!(approx_eq(xyz[2], 1.0), "A.z = {} != 1", xyz[2]);
    }

    #[test]
    fn tet_face_spread() {
        let tet = tetrahedron();
        assert!(approx_eq(tet.face_spread.unwrap(), 8.0 / 9.0));
    }

    // --- Dual Tetrahedron ---

    #[test]
    fn dual_tet_euler() {
        assert!(dual_tetrahedron().validate_euler());
    }

    #[test]
    fn dual_tet_uniform_edges() {
        assert!(dual_tetrahedron().validate_edges(1e-10));
    }

    #[test]
    fn dual_tet_a_absent_vertex() {
        let dual = dual_tetrahedron();
        let xyz = quadray_to_xyz(&dual.vertices[0]);
        // A-absent [0,1,1,1] should give negation of A's Cartesian: (1, 1, -1)
        assert!(approx_eq(xyz[0], 1.0), "x = {} != 1", xyz[0]);
        assert!(approx_eq(xyz[1], 1.0), "y = {} != 1", xyz[1]);
        assert!(approx_eq(xyz[2], -1.0), "z = {} != -1", xyz[2]);
    }

    #[test]
    fn stella_octangula_edge_parity() {
        // Both tets should have the same edge quadrance
        let tet = tetrahedron();
        let dual = dual_tetrahedron();
        assert!(approx_eq(tet.edge_quadrance, dual.edge_quadrance));
    }

    // --- Octahedron ---

    #[test]
    fn octa_vertex_count() {
        assert_eq!(octahedron().vertices.len(), 6);
    }

    #[test]
    fn octa_euler() {
        assert!(octahedron().validate_euler());
    }

    #[test]
    fn octa_uniform_edges() {
        assert!(octahedron().validate_edges(1e-10));
    }

    // --- Cube ---

    #[test]
    fn cube_vertex_count() {
        assert_eq!(cube().vertices.len(), 8);
    }

    #[test]
    fn cube_euler() {
        assert!(cube().validate_euler());
    }

    #[test]
    fn cube_uniform_edges() {
        assert!(cube().validate_edges(1e-10));
    }

    #[test]
    fn cube_is_stella_octangula() {
        // The cube's first 4 vertices must be exactly the tetrahedron basis
        let cube = cube();
        let tet = tetrahedron();
        let dual = dual_tetrahedron();
        for i in 0..4 {
            let cv = quadray_to_xyz(&cube.vertices[i]);
            let tv = quadray_to_xyz(&tet.vertices[i]);
            assert!(approx_eq(cv[0], tv[0]) && approx_eq(cv[1], tv[1]) && approx_eq(cv[2], tv[2]),
                "Cube vertex {} != Tet vertex {}", i, i);
        }
        // And the next 4 must be the dual tetrahedron
        for i in 0..4 {
            let cv = quadray_to_xyz(&cube.vertices[i + 4]);
            let dv = quadray_to_xyz(&dual.vertices[i]);
            assert!(approx_eq(cv[0], dv[0]) && approx_eq(cv[1], dv[1]) && approx_eq(cv[2], dv[2]),
                "Cube vertex {} != Dual vertex {}", i + 4, i);
        }
    }

    // --- Icosahedron ---

    #[test]
    fn icosa_vertex_count() {
        assert_eq!(icosahedron().vertices.len(), 12);
    }

    #[test]
    fn icosa_euler() {
        assert!(icosahedron().validate_euler());
    }

    #[test]
    fn icosa_uniform_edges() {
        assert!(icosahedron().validate_edges(1e-10));
    }

    // --- Dodecahedron ---

    #[test]
    fn dodeca_vertex_count() {
        assert_eq!(dodecahedron().vertices.len(), 20);
    }

    #[test]
    fn dodeca_euler() {
        assert!(dodecahedron().validate_euler());
    }

    #[test]
    fn dodeca_uniform_edges() {
        assert!(dodecahedron().validate_edges(1e-8));
    }

    // --- Cross-polyhedron checks ---

    #[test]
    fn all_platonics_satisfy_euler() {
        assert!(tetrahedron().validate_euler(), "tet");
        assert!(dual_tetrahedron().validate_euler(), "dual_tet");
        assert!(octahedron().validate_euler(), "octa");
        assert!(cube().validate_euler(), "cube");
        assert!(icosahedron().validate_euler(), "icosa");
        assert!(dodecahedron().validate_euler(), "dodeca");
    }

    // --- Face winding validation ---

    #[test]
    fn all_platonics_ccw_winding() {
        let polys: Vec<(&str, super::PolyhedronData)> = vec![
            ("tet", tetrahedron()),
            ("dual_tet", dual_tetrahedron()),
            ("octa", octahedron()),
            ("cube", cube()),
            ("icosa", icosahedron()),
            ("dodeca", dodecahedron()),
        ];
        let mut all_ok = true;
        for (name, poly) in &polys {
            let bad = poly.check_face_winding();
            if !bad.is_empty() {
                eprintln!("{}: faces with INWARD normals (indices): {:?} out of {} total", name, bad, poly.faces.len());
                all_ok = false;
            } else {
                eprintln!("{}: all {} faces have OUTWARD normals ✓", name, poly.faces.len());
            }
        }
        assert!(all_ok, "Some polyhedra have incorrect face winding — see above");
    }
}
