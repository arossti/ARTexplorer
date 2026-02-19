use crate::app_state::AppState;
use crate::rt_polyhedra;

// --- Vertex data (ABCD Convention) ---
// Quadray-native: each vertex carries ABCD coordinates (integers on CPU!)
// The WGSL shader converts ABCD → XYZ on the GPU via basis matrix multiplication.
// A=Yellow, B=Red, C=Blue, D=Green — ABCD=0123, no scramble.
#[repr(C)]
#[derive(Copy, Clone, bytemuck::Pod, bytemuck::Zeroable)]
pub struct Vertex {
    pub quadray: [f32; 4], // ABCD coordinates (Quadray)
    pub color: [f32; 3],   // RGB
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
                // color: vec3<f32> at offset 16
                wgpu::VertexAttribute {
                    offset: std::mem::size_of::<[f32; 4]>() as wgpu::BufferAddress,
                    shader_location: 1,
                    format: wgpu::VertexFormat::Float32x3,
                },
            ],
        }
    }
}

// --- ABCD color palette ---
// Each axis gets a consistent color across all polyhedra.
const ABCD_COLORS: [[f32; 3]; 4] = [
    [1.0, 1.0, 0.0], // A = Yellow
    [1.0, 0.0, 0.0], // B = Red
    [0.0, 0.4, 1.0], // C = Blue
    [0.0, 0.8, 0.2], // D = Green
];

/// Build combined vertex/index buffers for all visible polyhedra.
///
/// Each polyhedron's vertices are scaled by the appropriate edge parameter,
/// colored by ABCD axis (vertex index mod 4), and combined into a single
/// draw call using LineList topology.
pub fn build_visible_geometry(state: &AppState) -> (Vec<Vertex>, Vec<u16>) {
    let mut vertices = Vec::new();
    let mut indices = Vec::new();

    let polys: Vec<(bool, f32, rt_polyhedra::PolyhedronData)> = vec![
        (state.show_tetrahedron, state.tet_edge, rt_polyhedra::tetrahedron()),
        (state.show_dual_tetrahedron, state.tet_edge, rt_polyhedra::dual_tetrahedron()),
        (state.show_octahedron, state.tet_edge, rt_polyhedra::octahedron()),
        (state.show_cube, state.cube_edge, rt_polyhedra::cube()),
        (state.show_icosahedron, state.tet_edge, rt_polyhedra::icosahedron()),
        (state.show_dodecahedron, state.tet_edge, rt_polyhedra::dodecahedron()),
    ];

    for (visible, scale, poly) in &polys {
        if !visible {
            continue;
        }
        let base_offset = vertices.len() as u16;

        for (i, q) in poly.vertices.iter().enumerate() {
            let abcd = q.to_f32_array();
            vertices.push(Vertex {
                quadray: [
                    abcd[0] * scale,
                    abcd[1] * scale,
                    abcd[2] * scale,
                    abcd[3] * scale,
                ],
                color: ABCD_COLORS[i % 4],
            });
        }

        for [a, b] in &poly.edges {
            indices.push(*a as u16 + base_offset);
            indices.push(*b as u16 + base_offset);
        }
    }

    (vertices, indices)
}
