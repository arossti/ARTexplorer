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

/// Build combined vertex/index buffers for all visible polyhedra.
///
/// ONE Quadray scale factor `s` is applied uniformly to all ABCD coordinates.
/// All polyhedra scale together — the nesting is algebraic identity, not
/// numerical coincidence. The cube IS the tet + dual tet at every scale.
///
/// In Cartesian projection: cube_edge = 2s, tet_edge = 2√2·s.
/// The √2 ratio is a Cartesian artifact, not a Quadray property.
/// See ARTEX-RATIONALE.md §5.
pub fn build_visible_geometry(state: &AppState) -> (Vec<Vertex>, Vec<u32>, f32) {
    let mut vertices = Vec::new();
    let mut indices = Vec::new();

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
        let base_offset = vertices.len() as u32;

        for (i, q) in poly.vertices.iter().enumerate() {
            let abcd = q.to_f32_array();
            vertices.push(Vertex {
                quadray: [
                    abcd[0] * s,
                    abcd[1] * s,
                    abcd[2] * s,
                    abcd[3] * s,
                ],
                color: ABCD_COLORS[i % 4],
            });
        }

        for [a, b] in &poly.edges {
            indices.push(*a as u32 + base_offset);
            indices.push(*b as u32 + base_offset);
        }
    }

    // --- Basis arrows (own sizing, NOT scaled by s) ---
    // Janus: arrows point inward in negative arena (frequency < 0)
    if state.show_quadray_basis {
        let offset = vertices.len() as u32;
        let (arrow_verts, arrow_idxs) =
            basis_arrows::build_quadray_basis(state.tet_edge, state.frequency, offset);
        vertices.extend(arrow_verts);
        indices.extend(arrow_idxs);
    }
    if state.show_cartesian_basis {
        let offset = vertices.len() as u32;
        let (arrow_verts, arrow_idxs) =
            basis_arrows::build_cartesian_basis(state.cube_edge, offset);
        vertices.extend(arrow_verts);
        indices.extend(arrow_idxs);
    }

    // --- Grid planes ---
    {
        let offset = vertices.len() as u32;
        let (grid_verts, grid_idxs) = grids::build_cartesian_grids(state, offset);
        vertices.extend(grid_verts);
        indices.extend(grid_idxs);
    }
    {
        let offset = vertices.len() as u32;
        let (grid_verts, grid_idxs) = grids::build_quadray_grids(state, offset);
        vertices.extend(grid_verts);
        indices.extend(grid_idxs);
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

    (vertices, indices, bounding_radius)
}
