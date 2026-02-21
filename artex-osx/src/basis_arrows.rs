//! Basis arrow generators — Quadray ABCD and Cartesian XYZ
//!
//! Generates wireframe arrows from origin along basis directions.
//! Arrowheads are mini dual tetrahedra from rt_polyhedra::dual_tetrahedron().
//! All geometry built in Cartesian, then converted to Quadray ABCD via
//! Quadray::from_cartesian() for the existing shader pipeline.
//!
//! Arrow directions:
//!   Quadray ABCD: toward dual tet vertices [0,1,1,1] etc.
//!   Cartesian XYZ: along +X, +Y, +Z unit axes
//!
//! Sizing (JS formula): targetLength = (tetEdge + 1) × gridInterval
//! where gridInterval = √6/4 ≈ 0.612 (Quadray grid interval).
//!
//! RENDERING BOUNDARY: glam::Quat used for arrowhead orientation (justified).

use crate::geometry::Vertex;
use crate::rt_math::quadray::Quadray;
use crate::rt_math::radicals;
use crate::rt_polyhedra;

/// ABCD colors matching geometry.rs palette (RGBA, fully opaque)
const ABCD_COLORS: [[f32; 4]; 4] = [
    [1.0, 1.0, 0.0, 1.0], // A = Yellow
    [1.0, 0.0, 0.0, 1.0], // B = Red
    [0.0, 0.4, 1.0, 1.0], // C = Blue
    [0.0, 0.8, 0.2, 1.0], // D = Green
];

/// Cartesian XYZ colors (standard CG convention, RGBA, fully opaque)
const XYZ_COLORS: [[f32; 4]; 3] = [
    [1.0, 0.0, 0.0, 1.0], // X = Red
    [0.0, 0.8, 0.2, 1.0], // Y = Green
    [0.0, 0.4, 1.0, 1.0], // Z = Blue
];

/// Arrowhead scale (constant, matching JS app's headSize = 0.15)
const HEAD_SIZE: f64 = 0.15;

/// Dual tetrahedron vertices + edges + faces in Cartesian at unit ABCD scale.
/// Vertices are at distance √3 from origin.
fn dual_tet_cartesian() -> (Vec<[f64; 3]>, Vec<[usize; 2]>, Vec<Vec<usize>>) {
    let poly = rt_polyhedra::dual_tetrahedron();
    let verts: Vec<[f64; 3]> = poly.vertices.iter().map(|q| q.to_cartesian()).collect();
    let edges: Vec<[usize; 2]> = poly.edges;
    let faces: Vec<Vec<usize>> = poly.faces;
    (verts, edges, faces)
}

/// Build a single arrow: shaft + dual-tet arrowhead (wireframe + filled faces).
///
/// All math in Cartesian. Converts to Quadray ABCD at the end.
/// Returns (vertices, edge_indices, face_indices).
///
/// - `direction_xyz`: normalized Cartesian direction of the arrow
/// - `target_length`: total arrow length (tip of arrowhead reaches here)
/// - `color`: RGBA color for all vertices in this arrow
/// - `index_offset`: base index for the returned indices
fn build_arrow(
    direction_xyz: [f64; 3],
    target_length: f64,
    color: [f32; 4],
    index_offset: u32,
) -> (Vec<Vertex>, Vec<u32>, Vec<u32>) {
    let dir = glam::DVec3::from_array(direction_xyz);
    let sqrt3 = radicals::sqrt3();

    // Shaft shortened by arrowhead tip extension
    // Dual tet vertex at distance HEAD_SIZE * √3 from arrowhead center
    let head_tip_extension = HEAD_SIZE * sqrt3;
    let shaft_length = target_length - head_tip_extension;

    // Safety: if target_length too small for arrowhead, draw shaft only
    if shaft_length <= 0.0 {
        let tip = dir * target_length;
        let origin_q = Quadray::ORIGIN.to_f32_array();
        let tip_q = Quadray::from_cartesian([tip.x, tip.y, tip.z]).to_f32_array();
        return (
            vec![
                Vertex { quadray: origin_q, color },
                Vertex { quadray: tip_q, color },
            ],
            vec![index_offset, index_offset + 1],
            vec![], // No faces when shaft-only
        );
    }

    let shaft_tip = dir * shaft_length;

    // --- Arrowhead: mini dual tet, oriented + translated ---
    let (tet_verts, tet_edges, tet_faces) = dual_tet_cartesian();

    // Scale by HEAD_SIZE (tet_verts are at distance √3 at unit scale)
    let scaled: Vec<glam::DVec3> = tet_verts
        .iter()
        .map(|v| glam::DVec3::from_array(*v) * HEAD_SIZE)
        .collect();

    // Find which vertex best aligns with arrow direction (max dot product)
    let mut best_idx = 0;
    let mut max_dot = f64::NEG_INFINITY;
    for (i, v) in scaled.iter().enumerate() {
        let dot = v.normalize().dot(dir);
        if dot > max_dot {
            max_dot = dot;
            best_idx = i;
        }
    }

    // Rotate arrowhead so best vertex points along arrow direction
    // Math.X justified: glam quaternion at rendering boundary
    let current_dir = scaled[best_idx].normalize().as_vec3().normalize();
    let target_dir = dir.as_vec3().normalize();
    let rotation = glam::Quat::from_rotation_arc(current_dir, target_dir);

    // Apply rotation and translate to shaft tip
    let arrowhead_verts: Vec<glam::DVec3> = scaled
        .iter()
        .map(|v| {
            let rotated = rotation.mul_vec3(v.as_vec3());
            glam::DVec3::from(rotated.as_dvec3()) + shaft_tip
        })
        .collect();

    // --- Convert all positions to Quadray ABCD ---
    let mut vertices = Vec::with_capacity(6);

    // Vertex 0: shaft origin
    vertices.push(Vertex {
        quadray: Quadray::ORIGIN.to_f32_array(),
        color,
    });

    // Vertex 1: shaft tip
    vertices.push(Vertex {
        quadray: Quadray::from_cartesian([shaft_tip.x, shaft_tip.y, shaft_tip.z]).to_f32_array(),
        color,
    });

    // Vertices 2-5: arrowhead dual tet
    for v in &arrowhead_verts {
        vertices.push(Vertex {
            quadray: Quadray::from_cartesian([v.x, v.y, v.z]).to_f32_array(),
            color,
        });
    }

    // --- Edge indices (LineList) ---
    let mut edge_indices = Vec::with_capacity(14);

    // Shaft edge: vertex 0 → vertex 1
    edge_indices.push(index_offset);
    edge_indices.push(index_offset + 1);

    // Arrowhead edges (offset by 2 for shaft vertices)
    for [a, b] in &tet_edges {
        edge_indices.push(*a as u32 + index_offset + 2);
        edge_indices.push(*b as u32 + index_offset + 2);
    }

    // --- Face indices (TriangleList) ---
    // Solid flat color: arrowhead vertices already have the arrow's color.
    // Fan triangulation for each face (all triangles for dual tet).
    let mut face_indices = Vec::with_capacity(12);
    for face in &tet_faces {
        for i in 1..face.len() - 1 {
            face_indices.push(face[0] as u32 + index_offset + 2);
            face_indices.push(face[i] as u32 + index_offset + 2);
            face_indices.push(face[i + 1] as u32 + index_offset + 2);
        }
    }

    (vertices, edge_indices, face_indices)
}

/// Build 4 Quadray ABCD basis arrows.
///
/// Arrows from origin toward **regular tetrahedron** vertex directions,
/// matching the IVM grid plane basis vectors:
///   A (Yellow): [1,0,0,0] → Cartesian (+1,+1,-1)/√3
///   B (Red):    [0,1,0,0] → Cartesian (-1,-1,-1)/√3
///   C (Blue):   [0,0,1,0] → Cartesian (+1,-1,+1)/√3
///   D (Green):  [0,0,0,1] → Cartesian (-1,+1,+1)/√3
///
/// Janus Inversion: when `janus_sign` < 0, Cartesian directions negate,
/// which maps regular tet directions to dual tet directions — the basis
/// tetrahedron naturally becomes its self-dual in the negative arena.
///
/// Sizing: targetLength = (tetEdge + 1) × quadray_grid_interval
pub fn build_quadray_basis(tet_edge: f32, janus_sign: f32, index_offset: u32) -> (Vec<Vertex>, Vec<u32>, Vec<u32>) {
    let grid_interval = radicals::quadray_grid_interval();
    let target_length = (tet_edge.abs() as f64 + 1.0) * grid_interval;
    let sign = if janus_sign < 0.0 { -1.0 } else { 1.0 };

    // Regular tet vertex directions — matches IVM grid plane basis.
    // Janus negation maps these to dual tet directions in Cartesian:
    //   -[1,0,0,0] in Cartesian = [0,1,1,1] in Quadray.
    let basis_verts = [
        Quadray::new(1.0, 0.0, 0.0, 0.0), // A
        Quadray::new(0.0, 1.0, 0.0, 0.0), // B
        Quadray::new(0.0, 0.0, 1.0, 0.0), // C
        Quadray::new(0.0, 0.0, 0.0, 1.0), // D
    ];

    let mut all_vertices = Vec::new();
    let mut all_edge_indices = Vec::new();
    let mut all_face_indices = Vec::new();

    for (i, q) in basis_verts.iter().enumerate() {
        let xyz = q.to_cartesian();
        let len = (xyz[0] * xyz[0] + xyz[1] * xyz[1] + xyz[2] * xyz[2]).sqrt();
        // Janus: negate direction in negative arena → tet basis becomes dual tet
        let direction = [sign * xyz[0] / len, sign * xyz[1] / len, sign * xyz[2] / len];

        let offset = index_offset + all_vertices.len() as u32;
        let (verts, edge_idxs, face_idxs) = build_arrow(direction, target_length, ABCD_COLORS[i], offset);
        all_vertices.extend(verts);
        all_edge_indices.extend(edge_idxs);
        all_face_indices.extend(face_idxs);
    }

    (all_vertices, all_edge_indices, all_face_indices)
}

/// Build 3 Cartesian XYZ basis arrows.
///
/// Arrows along +X (Red), +Y (Green), +Z (Blue).
/// Sizing: targetLength = cubeEdge (matches JS app convention).
pub fn build_cartesian_basis(cube_edge: f32, index_offset: u32) -> (Vec<Vertex>, Vec<u32>, Vec<u32>) {
    let target_length = cube_edge.abs() as f64;

    let directions: [[f64; 3]; 3] = [
        [1.0, 0.0, 0.0], // +X
        [0.0, 1.0, 0.0], // +Y
        [0.0, 0.0, 1.0], // +Z
    ];

    let mut all_vertices = Vec::new();
    let mut all_edge_indices = Vec::new();
    let mut all_face_indices = Vec::new();

    for (i, direction) in directions.iter().enumerate() {
        let offset = index_offset + all_vertices.len() as u32;
        let (verts, edge_idxs, face_idxs) = build_arrow(*direction, target_length, XYZ_COLORS[i], offset);
        all_vertices.extend(verts);
        all_edge_indices.extend(edge_idxs);
        all_face_indices.extend(face_idxs);
    }

    (all_vertices, all_edge_indices, all_face_indices)
}

#[cfg(test)]
mod tests {
    use super::*;

    const EPS: f64 = 1e-10;

    #[test]
    fn dual_tet_has_4_verts_6_edges_4_faces() {
        let (verts, edges, faces) = dual_tet_cartesian();
        assert_eq!(verts.len(), 4);
        assert_eq!(edges.len(), 6);
        assert_eq!(faces.len(), 4);
    }

    #[test]
    fn dual_tet_vertex_distances() {
        // All vertices at distance √3 from origin
        let (verts, _, _) = dual_tet_cartesian();
        let sqrt3 = radicals::sqrt3();
        for (i, v) in verts.iter().enumerate() {
            let dist = (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt();
            assert!(
                (dist - sqrt3).abs() < EPS,
                "vertex {} distance: {} != √3 ({})",
                i,
                dist,
                sqrt3
            );
        }
    }

    #[test]
    fn quadray_basis_produces_4_arrows() {
        let (verts, edge_idxs, face_idxs) = build_quadray_basis(2.0, 1.0, 0);
        // 4 arrows × 6 vertices each = 24
        assert_eq!(verts.len(), 24, "expected 24 vertices, got {}", verts.len());
        // 4 arrows × 14 edge indices each = 56
        assert_eq!(edge_idxs.len(), 56, "expected 56 edge indices, got {}", edge_idxs.len());
        // 4 arrows × 12 face indices each (4 faces × 3 indices) = 48
        assert_eq!(face_idxs.len(), 48, "expected 48 face indices, got {}", face_idxs.len());
    }

    #[test]
    fn cartesian_basis_produces_3_arrows() {
        let (verts, edge_idxs, face_idxs) = build_cartesian_basis(2.0, 0);
        // 3 arrows × 6 vertices each = 18
        assert_eq!(verts.len(), 18, "expected 18 vertices, got {}", verts.len());
        // 3 arrows × 14 edge indices each = 42
        assert_eq!(edge_idxs.len(), 42, "expected 42 edge indices, got {}", edge_idxs.len());
        // 3 arrows × 12 face indices each = 36
        assert_eq!(face_idxs.len(), 36, "expected 36 face indices, got {}", face_idxs.len());
    }

    #[test]
    fn index_offset_applied_correctly() {
        let (_, edge_idxs, face_idxs) = build_quadray_basis(2.0, 1.0, 100);
        // All edge indices should be >= 100
        for idx in &edge_idxs {
            assert!(*idx >= 100, "edge index {} < offset 100", idx);
        }
        // All face indices should be >= 100
        for idx in &face_idxs {
            assert!(*idx >= 100, "face index {} < offset 100", idx);
        }
    }

    #[test]
    fn a_arrow_direction_correct() {
        // Regular tet A [1,0,0,0] → Cartesian (-1, -1, 1)
        // Negation of dual A-absent [0,1,1,1] → (1, 1, -1)
        // Arrow points along A grid direction; Janus negation maps it to dual.
        let q = Quadray::new(1.0, 0.0, 0.0, 0.0);
        let xyz = q.to_cartesian();
        assert!((xyz[0] - (-1.0)).abs() < EPS, "x: {} != -1.0", xyz[0]);
        assert!((xyz[1] - (-1.0)).abs() < EPS, "y: {} != -1.0", xyz[1]);
        assert!((xyz[2] - 1.0).abs() < EPS, "z: {} != 1.0", xyz[2]);
    }

    #[test]
    fn shaft_origin_is_quadray_origin() {
        let (verts, _, _) = build_quadray_basis(2.0, 1.0, 0);
        // First vertex of each arrow (indices 0, 6, 12, 18) should be at origin
        for arrow in 0..4 {
            let v = &verts[arrow * 6];
            let sum: f32 = v.quadray.iter().sum();
            assert!(
                sum.abs() < 1e-6,
                "arrow {} origin has non-zero ABCD sum: {}",
                arrow,
                sum
            );
        }
    }

    #[test]
    fn arrows_scale_with_tet_edge() {
        let (v1, _, _) = build_quadray_basis(2.0, 1.0, 0);
        let (v2, _, _) = build_quadray_basis(4.0, 1.0, 0);
        // Shaft tip (vertex 1) should differ between scales
        assert_ne!(
            v1[1].quadray, v2[1].quadray,
            "shaft tip should change with tet_edge"
        );
    }

    #[test]
    fn negative_tet_edge_uses_abs() {
        let (v_pos, _, _) = build_quadray_basis(2.0, 1.0, 0);
        let (v_neg, _, _) = build_quadray_basis(-2.0, 1.0, 0);
        // Same arrow geometry (abs value used for sizing)
        for i in 0..v_pos.len() {
            assert_eq!(
                v_pos[i].quadray, v_neg[i].quadray,
                "vertex {} differs for ±tetEdge",
                i
            );
        }
    }

    #[test]
    fn janus_negative_inverts_arrows() {
        let (v_pos, _, _) = build_quadray_basis(2.0, 1.0, 0);
        let (v_neg, _, _) = build_quadray_basis(2.0, -1.0, 0);
        // Shaft tips (vertex 1 of each arrow) should differ:
        // positive arena points outward, negative arena points inward
        assert_ne!(
            v_pos[1].quadray, v_neg[1].quadray,
            "Janus inversion should flip arrow direction"
        );
    }
}
