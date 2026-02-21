use crate::app_state::AppState;
use crate::basis_arrows;
use crate::grids;
use crate::rt_polyhedra;
use crate::rt_polyhedra::geodesic::{self, ProjectionMode as GeoProjection, quadray_quadrance_from_origin};

// --- Vertex data (ABCD Convention) ---
// Quadray-native: each vertex carries ABCD coordinates (integers on CPU!)
// The WGSL shader converts ABCD → XYZ on the GPU via basis matrix multiplication.
// A=Yellow, B=Red, C=Blue, D=Green — ABCD=0123, no scramble.
#[repr(C)]
#[derive(Copy, Clone, bytemuck::Pod, bytemuck::Zeroable)]
pub struct Vertex {
    pub quadray: [f32; 4], // ABCD coordinates (Quadray)
    pub color: [f32; 4],   // RGBA (alpha for universal opacity control)
}

impl Vertex {
    pub fn layout() -> wgpu::VertexBufferLayout<'static> {
        wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<Vertex>() as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &[
                // quadray: vec4<f32> at offset 0
                wgpu::VertexAttribute {
                    offset: 0,
                    shader_location: 0,
                    format: wgpu::VertexFormat::Float32x4,
                },
                // color: vec4<f32> at offset 16 (RGBA)
                wgpu::VertexAttribute {
                    offset: std::mem::size_of::<[f32; 4]>() as wgpu::BufferAddress,
                    shader_location: 1,
                    format: wgpu::VertexFormat::Float32x4,
                },
            ],
        }
    }
}

// --- ABCD color palette (RGBA) ---
// Each axis gets a consistent color across all polyhedra.
// Polyhedra are fully opaque (alpha=1.0). Grids carry their own alpha.
const ABCD_COLORS: [[f32; 4]; 4] = [
    [1.0, 1.0, 0.0, 1.0], // A = Yellow
    [1.0, 0.0, 0.0, 1.0], // B = Red
    [0.0, 0.4, 1.0, 1.0], // C = Blue
    [0.0, 0.8, 0.2, 1.0], // D = Green
];

/// Derive vertex color from actual ABCD coordinates.
///
/// Blends the four basis colors (A=Yellow, B=Red, C=Blue, D=Green)
/// weighted by each component's proportion of the total. For the base
/// tetrahedron [1,0,0,0] this gives pure Yellow; for geodesic midpoints
/// like [0.5, 0.5, 0, 0] it gives Yellow+Red blend. Geometrically
/// meaningful at any subdivision level.
fn abcd_color(abcd: &[f32; 4], alpha: f32) -> [f32; 4] {
    let sum = abcd[0] + abcd[1] + abcd[2] + abcd[3];
    if sum.abs() < 1e-6 {
        // Origin — neutral gray
        return [0.5, 0.5, 0.5, alpha];
    }
    let weights = [abcd[0] / sum, abcd[1] / sum, abcd[2] / sum, abcd[3] / sum];
    let mut r = 0.0f32;
    let mut g = 0.0f32;
    let mut b = 0.0f32;
    for i in 0..4 {
        r += weights[i] * ABCD_COLORS[i][0];
        g += weights[i] * ABCD_COLORS[i][1];
        b += weights[i] * ABCD_COLORS[i][2];
    }
    [r, g, b, alpha]
}

// --- Node sphere helpers ---

/// Fixed Cartesian radii for node sizes 1–7 (matching JS app NODE_SIZE_RADII).
const NODE_SIZE_RADII: [f32; 7] = [0.01, 0.02, 0.03, 0.04, 0.06, 0.08, 0.12];

/// Node sphere template — geodesic icosahedron at unit scale.
///
/// Returns (ABCD f32 vertices, triangulated face indices, Cartesian circumradius).
/// Generated once per rebuild; reused for every polyhedron vertex.
fn node_template(frequency: u32) -> (Vec<[f32; 4]>, Vec<[usize; 3]>, f32) {
    let poly = geodesic::geodesic_icosahedron(frequency, GeoProjection::OutSphere);

    // Compute circumradius in Cartesian (ONE √ at boundary)
    let q_circ = quadray_quadrance_from_origin(&poly.vertices[0]);
    // Math.X justified: sqrt at rendering boundary
    let circ_radius = (q_circ as f32).sqrt();

    let verts: Vec<[f32; 4]> = poly.vertices.iter().map(|q| q.to_f32_array()).collect();

    // Convert variable-length faces to triangles (fan triangulation)
    let mut tris = Vec::new();
    for face in &poly.faces {
        for i in 1..face.len() - 1 {
            tris.push([face[0], face[i], face[i + 1]]);
        }
    }

    (verts, tris, circ_radius)
}

/// Compute node Cartesian radius for a given size setting.
///
/// Sizes 1–7: fixed radii from NODE_SIZE_RADII (scale-independent).
/// Size 8 (Packed): RT-pure close-packing from edge quadrance.
///   Q_vertex = Q_edge / 4 → radius = √(Q_vertex)
///   At scale s: Q_scaled = Q_edge · s², radius = √(Q_edge · s² / 4)
///   ONE √ at rendering boundary.
fn node_radius(node_size: u8, edge_quadrance: f64, s: f32) -> f32 {
    if node_size >= 1 && node_size <= 7 {
        NODE_SIZE_RADII[(node_size - 1) as usize]
    } else {
        // Size 8 = Packed: half-edge close-packing
        // Q_scaled = Q_edge * s²; Q_vertex = Q_scaled / 4
        // Math.X justified: sqrt at rendering boundary
        let q_scaled = edge_quadrance * (s as f64) * (s as f64);
        (q_scaled / 4.0).sqrt() as f32
    }
}

/// Geometry build output — vertices shared between edge and face pipelines.
///
/// Edge vertices have alpha=1.0, face vertices have alpha=face_opacity.
/// Both sets share the same vertex buffer; index buffers are separate.
pub struct GeometryOutput {
    pub vertices: Vec<Vertex>,
    pub edge_indices: Vec<u32>,
    pub face_indices: Vec<u32>,
    pub bounding_radius: f32,
    pub node_count: usize,
}

/// Build combined vertex/index buffers for all visible polyhedra.
///
/// ONE Quadray scale factor `s` is applied uniformly to all ABCD coordinates.
/// All polyhedra scale together — the nesting is algebraic identity, not
/// numerical coincidence. The cube IS the tet + dual tet at every scale.
///
/// In Cartesian projection: cube_edge = 2s, tet_edge = 2√2·s.
/// The √2 ratio is a Cartesian artifact, not a Quadray property.
/// See ARTEX-RATIONALE.md §5.
///
/// Face color strategy (P1): ABCD vertex interpolation — face vertices inherit
/// per-vertex ABCD colors with face_opacity alpha. Future: per-polyhedron color
/// palette (designer-choosable, like JS rs-color-theory-modal.js).
pub fn build_visible_geometry(state: &AppState) -> GeometryOutput {
    let mut vertices = Vec::new();
    let mut edge_indices = Vec::new();
    let mut face_indices = Vec::new();

    // ONE scale factor — cube_edge = 2s, so s = cube_edge / 2
    let s = state.cube_edge / 2.0;

    // Build polyhedra list — geodesic replaces base when enabled.
    let tet_poly = if state.show_geodesic_tet && state.geodesic_tet_freq > 1 {
        geodesic::geodesic_tetrahedron(
            state.geodesic_tet_freq,
            GeoProjection::from_u8(state.geodesic_tet_projection),
        )
    } else {
        rt_polyhedra::tetrahedron()
    };
    let octa_poly = if state.show_geodesic_octa && state.geodesic_octa_freq > 1 {
        geodesic::geodesic_octahedron(
            state.geodesic_octa_freq,
            GeoProjection::from_u8(state.geodesic_octa_projection),
        )
    } else {
        rt_polyhedra::octahedron()
    };
    let icosa_poly = if state.show_geodesic_icosa && state.geodesic_icosa_freq > 1 {
        geodesic::geodesic_icosahedron(
            state.geodesic_icosa_freq,
            GeoProjection::from_u8(state.geodesic_icosa_projection),
        )
    } else {
        rt_polyhedra::icosahedron()
    };

    let polys: Vec<(bool, rt_polyhedra::PolyhedronData)> = vec![
        (state.show_tetrahedron, tet_poly),
        (state.show_dual_tetrahedron, rt_polyhedra::dual_tetrahedron()),
        (state.show_cube, rt_polyhedra::cube()),
        (state.show_octahedron, octa_poly),
        (state.show_icosahedron, icosa_poly),
        (state.show_dodecahedron, rt_polyhedra::dodecahedron()),
    ];

    for (visible, poly) in &polys {
        if !visible {
            continue;
        }

        // --- Edge vertices (alpha = 1.0) ---
        let edge_base = vertices.len() as u32;
        for q in poly.vertices.iter() {
            let abcd = q.to_f32_array();
            vertices.push(Vertex {
                quadray: [abcd[0] * s, abcd[1] * s, abcd[2] * s, abcd[3] * s],
                color: abcd_color(&abcd, 1.0),
            });
        }
        for [a, b] in &poly.edges {
            edge_indices.push(*a as u32 + edge_base);
            edge_indices.push(*b as u32 + edge_base);
        }

        // --- Face vertices (alpha = face_opacity) ---
        // Duplicated with reduced alpha so faces can be semi-transparent
        // while edges stay fully opaque, sharing the same vertex buffer.
        if state.show_faces {
            let face_base = vertices.len() as u32;
            for q in poly.vertices.iter() {
                let abcd = q.to_f32_array();
                let c = abcd_color(&abcd, state.face_opacity);
                vertices.push(Vertex {
                    quadray: [abcd[0] * s, abcd[1] * s, abcd[2] * s, abcd[3] * s],
                    color: c,
                });
            }
            // Fan triangulation: face [v0, v1, v2, ..., vN] →
            //   triangles (v0,v1,v2), (v0,v2,v3), ..., (v0,v(N-1),vN)
            for face in &poly.faces {
                for i in 1..face.len() - 1 {
                    face_indices.push(face[0] as u32 + face_base);
                    face_indices.push(face[i] as u32 + face_base);
                    face_indices.push(face[i + 1] as u32 + face_base);
                }
            }
        }
    }

    // --- Basis arrows (own sizing, NOT scaled by s) ---
    // Janus: arrows point inward in negative arena (frequency < 0)
    // Arrowhead faces: solid flat ABCD colors (A=Yellow, B=Red, C=Blue, D=Green).
    if state.show_quadray_basis {
        let offset = vertices.len() as u32;
        let (arrow_verts, arrow_edge_idxs, arrow_face_idxs) =
            basis_arrows::build_quadray_basis(state.tet_edge, state.frequency, offset);
        vertices.extend(arrow_verts);
        edge_indices.extend(arrow_edge_idxs);
        face_indices.extend(arrow_face_idxs);
    }
    if state.show_cartesian_basis {
        let offset = vertices.len() as u32;
        let (arrow_verts, arrow_edge_idxs, arrow_face_idxs) =
            basis_arrows::build_cartesian_basis(state.cube_edge, offset);
        vertices.extend(arrow_verts);
        edge_indices.extend(arrow_edge_idxs);
        face_indices.extend(arrow_face_idxs);
    }

    // --- Grid planes ---
    {
        let offset = vertices.len() as u32;
        let (grid_verts, grid_idxs) = grids::build_cartesian_grids(state, offset);
        vertices.extend(grid_verts);
        edge_indices.extend(grid_idxs);
    }
    {
        let offset = vertices.len() as u32;
        let (grid_verts, grid_idxs) = grids::build_quadray_grids(state, offset);
        vertices.extend(grid_verts);
        edge_indices.extend(grid_idxs);
    }

    // --- Node spheres (geodesic icosahedra at each polyhedron vertex) ---
    // Template generated once, instanced at every visible vertex.
    // ABCD offset linearity: xyz(V + T) = xyz(V) + xyz(T), so adding
    // template ABCD coords to vertex ABCD coords correctly places the
    // icosphere at the vertex's Cartesian position.
    let mut node_instance_count: usize = 0;
    if state.show_nodes && state.node_size > 0 {
        let (template_verts, template_tris, template_r) =
            node_template(state.node_geodesic_freq);

        for (visible, poly) in &polys {
            if !visible {
                continue;
            }
            let radius = node_radius(state.node_size, poly.edge_quadrance, s);
            let node_scale = radius / template_r;

            for q in &poly.vertices {
                let center = [q.a as f32 * s, q.b as f32 * s, q.c as f32 * s, q.d as f32 * s];
                let color = abcd_color(&q.to_f32_array(), state.node_opacity);
                let node_base = vertices.len() as u32;

                for tv in &template_verts {
                    vertices.push(Vertex {
                        quadray: [
                            center[0] + tv[0] * node_scale,
                            center[1] + tv[1] * node_scale,
                            center[2] + tv[2] * node_scale,
                            center[3] + tv[3] * node_scale,
                        ],
                        color,
                    });
                }
                for [a, b, c] in &template_tris {
                    face_indices.push(*a as u32 + node_base);
                    face_indices.push(*b as u32 + node_base);
                    face_indices.push(*c as u32 + node_base);
                }
                node_instance_count += 1;
            }
        }
    }

    // Compute bounding radius: max Cartesian distance from origin across all vertices.
    // Math.X justified: sqrt is at the rendering boundary (Cartesian projection).
    let inv_sqrt2: f32 = std::f32::consts::FRAC_1_SQRT_2;
    let mut max_dist_sq: f32 = 0.0;
    for v in &vertices {
        let [a, b, c, d] = v.quadray;
        let avg = (a + b + c + d) * 0.25;
        let (na, nb, nc, nd) = (a - avg, b - avg, c - avg, d - avg);
        let x = inv_sqrt2 * (-na + nb - nc + nd);
        let y = inv_sqrt2 * (-na + nb + nc - nd);
        let z = inv_sqrt2 * (na + nb - nc - nd);
        let dist_sq = x * x + y * y + z * z;
        if dist_sq > max_dist_sq {
            max_dist_sq = dist_sq;
        }
    }
    let bounding_radius = max_dist_sq.sqrt();

    GeometryOutput {
        vertices,
        edge_indices,
        face_indices,
        bounding_radius,
        node_count: node_instance_count,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::app_state::AppState;

    fn state_all_visible() -> AppState {
        AppState {
            show_tetrahedron: true,
            show_dual_tetrahedron: true,
            show_cube: true,
            show_octahedron: true,
            show_icosahedron: true,
            show_dodecahedron: true,
            show_faces: true,
            face_opacity: 0.35,
            show_quadray_basis: false,
            show_cartesian_basis: false,
            show_cartesian_grids: false,
            show_ivm_grids: false,
            ..AppState::default()
        }
    }

    #[test]
    fn face_indices_triangulated() {
        // Expected triangles per polyhedron:
        // tet:4, dual:4, octa:8, cube:6*2=12, icosa:20, dodeca:12*3=36 → total=84
        let state = state_all_visible();
        let geo = build_visible_geometry(&state);
        let triangle_count = geo.face_indices.len() / 3;
        assert_eq!(
            triangle_count, 84,
            "expected 84 triangles (all 6 Platonics), got {}",
            triangle_count
        );
    }

    #[test]
    fn face_indices_valid_range() {
        let state = state_all_visible();
        let geo = build_visible_geometry(&state);
        let max_vertex = geo.vertices.len() as u32;
        for (i, idx) in geo.face_indices.iter().enumerate() {
            assert!(
                *idx < max_vertex,
                "face index {} at position {} exceeds vertex count {}",
                idx, i, max_vertex
            );
        }
    }

    #[test]
    fn faces_hidden_when_toggled_off() {
        let state = AppState {
            show_tetrahedron: true,
            show_dual_tetrahedron: true,
            show_faces: false,
            show_quadray_basis: false,  // Disable arrows (arrow faces are always visible)
            show_cartesian_basis: false,
            ..AppState::default()
        };
        let geo = build_visible_geometry(&state);
        assert_eq!(
            geo.face_indices.len(), 0,
            "face_indices should be empty when show_faces=false (no arrows)"
        );
        // Edges should still exist
        assert!(geo.edge_indices.len() > 0, "edge_indices should not be empty");
    }

    #[test]
    fn face_opacity_in_vertex_alpha() {
        let state = AppState {
            show_tetrahedron: true,
            show_dual_tetrahedron: false,
            show_cube: false,
            show_octahedron: false,
            show_icosahedron: false,
            show_dodecahedron: false,
            show_faces: true,
            face_opacity: 0.42,
            show_quadray_basis: false,
            show_cartesian_basis: false,
            show_cartesian_grids: false,
            show_ivm_grids: false,
            ..AppState::default()
        };
        let geo = build_visible_geometry(&state);
        // Tet has 4 vertices. First 4 = edge verts (alpha=1.0), next 4 = face verts (alpha=0.42)
        assert!(geo.vertices.len() >= 8, "expected at least 8 vertices (4 edge + 4 face)");
        for v in &geo.vertices[..4] {
            assert_eq!(v.color[3], 1.0, "edge vertex alpha should be 1.0");
        }
        for v in &geo.vertices[4..8] {
            assert!(
                (v.color[3] - 0.42).abs() < 0.001,
                "face vertex alpha should be 0.42, got {}",
                v.color[3]
            );
        }
    }

    // --- Node rendering tests ---

    fn state_tet_nodes(node_size: u8, node_freq: u32) -> AppState {
        AppState {
            show_tetrahedron: true,
            show_dual_tetrahedron: false,
            show_cube: false,
            show_octahedron: false,
            show_icosahedron: false,
            show_dodecahedron: false,
            show_faces: false,
            show_nodes: true,
            node_size,
            node_opacity: 0.6,
            node_geodesic_freq: node_freq,
            show_quadray_basis: false,
            show_cartesian_basis: false,
            show_cartesian_grids: false,
            show_ivm_grids: false,
            ..AppState::default()
        }
    }

    #[test]
    fn nodes_disabled_when_off() {
        let state = AppState {
            show_tetrahedron: true,
            show_nodes: false,
            show_faces: false,
            show_quadray_basis: false,
            show_cartesian_basis: false,
            ..AppState::default()
        };
        let geo = build_visible_geometry(&state);
        assert_eq!(geo.node_count, 0, "node_count should be 0 when show_nodes=false");
        // Only edge vertices (4 for tet)
        assert_eq!(geo.face_indices.len(), 0, "no face indices when nodes+faces off");
    }

    #[test]
    fn nodes_disabled_when_size_zero() {
        let state = AppState {
            show_tetrahedron: true,
            show_nodes: true,
            node_size: 0,
            show_faces: false,
            show_quadray_basis: false,
            show_cartesian_basis: false,
            ..AppState::default()
        };
        let geo = build_visible_geometry(&state);
        assert_eq!(geo.node_count, 0, "node_count should be 0 when node_size=0");
    }

    #[test]
    fn node_vertex_count_tet_3f() {
        // Tet has 4 vertices. 3F geodesic icosahedron has 92 vertices.
        // Expected: 4 edge verts + 4 * 92 = 4 + 368 = 372 total vertices
        let state = state_tet_nodes(4, 3);
        let geo = build_visible_geometry(&state);
        assert_eq!(geo.node_count, 4, "tet should produce 4 node instances");
        // 4 edge verts + 4 * 92 node verts = 372
        assert_eq!(
            geo.vertices.len(), 4 + 4 * 92,
            "expected 4 edge + 368 node vertices, got {}",
            geo.vertices.len()
        );
    }

    #[test]
    fn node_face_count_tet_3f() {
        // 3F geodesic icosahedron has 180 triangular faces.
        // 4 tet vertices × 180 = 720 node triangles.
        let state = state_tet_nodes(4, 3);
        let geo = build_visible_geometry(&state);
        let tri_count = geo.face_indices.len() / 3;
        assert_eq!(
            tri_count, 4 * 180,
            "expected 720 node triangles, got {}",
            tri_count
        );
    }

    #[test]
    fn node_opacity_in_vertex_alpha() {
        let state = state_tet_nodes(4, 1);
        let geo = build_visible_geometry(&state);
        // First 4 verts are edge vertices (alpha 1.0), rest are node verts
        for v in &geo.vertices[4..] {
            assert!(
                (v.color[3] - 0.6).abs() < 0.001,
                "node vertex alpha should be 0.6, got {}",
                v.color[3]
            );
        }
    }

    #[test]
    fn node_color_inherits_parent() {
        // Tet vertex A = [1,0,0,0] → pure yellow (R=1,G=1,B=0)
        let state = state_tet_nodes(4, 1);
        let geo = build_visible_geometry(&state);
        // First node sphere starts at index 4 (after 4 edge verts).
        // 1F geodesic icosahedron has 12 vertices.
        // First 12 node verts belong to first tet vertex [1,0,0,0].
        let node_v = &geo.vertices[4];
        assert!(
            (node_v.color[0] - 1.0).abs() < 0.01 && (node_v.color[1] - 1.0).abs() < 0.01,
            "node at tet vertex A should be yellow, got ({:.2}, {:.2}, {:.2})",
            node_v.color[0], node_v.color[1], node_v.color[2]
        );
    }

    #[test]
    fn packed_radius_tet() {
        // Tet edge_quadrance = 8 (unit Quadray). At s=1:
        // Q_scaled = 8 * 1 * 1 = 8. Q_vertex = 8/4 = 2. radius = sqrt(2) ≈ 1.414
        let r = node_radius(8, 8.0, 1.0);
        assert!(
            (r - std::f32::consts::SQRT_2).abs() < 0.001,
            "packed tet radius should be sqrt(2) ≈ 1.414, got {}",
            r
        );
    }

    #[test]
    fn packed_radius_cube() {
        // Cube edge_quadrance = 4 (unit Quadray). At s=1:
        // Q_scaled = 4 * 1 * 1 = 4. Q_vertex = 4/4 = 1. radius = sqrt(1) = 1.0
        let r = node_radius(8, 4.0, 1.0);
        assert!(
            (r - 1.0).abs() < 0.001,
            "packed cube radius should be 1.0, got {}",
            r
        );
    }

    #[test]
    fn node_indices_valid_range() {
        let state = state_tet_nodes(4, 2);
        let geo = build_visible_geometry(&state);
        let max_vertex = geo.vertices.len() as u32;
        for (i, idx) in geo.face_indices.iter().enumerate() {
            assert!(
                *idx < max_vertex,
                "node face index {} at position {} exceeds vertex count {}",
                idx, i, max_vertex
            );
        }
    }
}
