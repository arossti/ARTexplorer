use crate::app_state::AppState;
use crate::basis_arrows;
use crate::grids;
use crate::rt_polyhedra;

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

/// Geometry build output — vertices shared between edge and face pipelines.
///
/// Edge vertices have alpha=1.0, face vertices have alpha=face_opacity.
/// Both sets share the same vertex buffer; index buffers are separate.
pub struct GeometryOutput {
    pub vertices: Vec<Vertex>,
    pub edge_indices: Vec<u32>,
    pub face_indices: Vec<u32>,
    pub bounding_radius: f32,
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

    let polys: Vec<(bool, rt_polyhedra::PolyhedronData)> = vec![
        (state.show_tetrahedron, rt_polyhedra::tetrahedron()),
        (state.show_dual_tetrahedron, rt_polyhedra::dual_tetrahedron()),
        (state.show_cube, rt_polyhedra::cube()),
        (state.show_octahedron, rt_polyhedra::octahedron()),
        (state.show_icosahedron, rt_polyhedra::icosahedron()),
        (state.show_dodecahedron, rt_polyhedra::dodecahedron()),
    ];

    for (visible, poly) in &polys {
        if !visible {
            continue;
        }

        // --- Edge vertices (alpha = 1.0) ---
        let edge_base = vertices.len() as u32;
        for (i, q) in poly.vertices.iter().enumerate() {
            let abcd = q.to_f32_array();
            vertices.push(Vertex {
                quadray: [abcd[0] * s, abcd[1] * s, abcd[2] * s, abcd[3] * s],
                color: ABCD_COLORS[i % 4],
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
            for (i, q) in poly.vertices.iter().enumerate() {
                let abcd = q.to_f32_array();
                let c = ABCD_COLORS[i % 4];
                vertices.push(Vertex {
                    quadray: [abcd[0] * s, abcd[1] * s, abcd[2] * s, abcd[3] * s],
                    color: [c[0], c[1], c[2], state.face_opacity],
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
    if state.show_quadray_basis {
        let offset = vertices.len() as u32;
        let (arrow_verts, arrow_idxs) =
            basis_arrows::build_quadray_basis(state.tet_edge, state.frequency, offset);
        vertices.extend(arrow_verts);
        edge_indices.extend(arrow_idxs);
    }
    if state.show_cartesian_basis {
        let offset = vertices.len() as u32;
        let (arrow_verts, arrow_idxs) =
            basis_arrows::build_cartesian_basis(state.cube_edge, offset);
        vertices.extend(arrow_verts);
        edge_indices.extend(arrow_idxs);
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
            ..AppState::default()
        };
        let geo = build_visible_geometry(&state);
        assert_eq!(
            geo.face_indices.len(), 0,
            "face_indices should be empty when show_faces=false"
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
}
