//! Grid plane generators — Cartesian XYZ and IVM Central Angle
//!
//! Generates wireframe grid planes for spatial reference:
//!   - **Cartesian**: 3 uniform rectangular grids (XY, XZ, YZ)
//!   - **IVM**: 6 Central Angle triangular tessellations from Quadray basis pairs
//!
//! All geometry built in Cartesian, then converted to Quadray ABCD via
//! Quadray::from_cartesian() for the existing shader pipeline.
//!
//! Color conventions (at 40% brightness to simulate grid opacity):
//!   Cartesian: XY=Yellow, XZ=Magenta, YZ=Cyan (additive axis mixes)
//!   IVM: AB=Orange, AC=Magenta, AD=Lime, BC=Cyan, BD=Lavender, CD=Pink
//!
//! RENDERING BOUNDARY: Cartesian coordinates used for grid layout (justified).

use crate::app_state::AppState;
use crate::geometry::Vertex;
use crate::rt_math::quadray::Quadray;
use crate::rt_math::radicals;

// --- Cartesian grid plane colors (40% brightness) ---
const XY_COLOR: [f32; 3] = [0.4, 0.4, 0.0]; // Yellow
const XZ_COLOR: [f32; 3] = [0.4, 0.0, 0.4]; // Magenta
const YZ_COLOR: [f32; 3] = [0.0, 0.4, 0.4]; // Cyan

// --- IVM Central Angle plane colors (40% brightness) ---
const AB_COLOR: [f32; 3] = [0.4, 0.27, 0.0];  // Orange
const AC_COLOR: [f32; 3] = [0.4, 0.0, 0.4];   // Magenta
const AD_COLOR: [f32; 3] = [0.27, 0.4, 0.0];  // Lime
const BC_COLOR: [f32; 3] = [0.0, 0.4, 0.4];   // Cyan
const BD_COLOR: [f32; 3] = [0.27, 0.27, 0.4]; // Lavender
const CD_COLOR: [f32; 3] = [0.4, 0.2, 0.2];   // Pink

/// Build a uniform rectangular grid on one Cartesian plane.
///
/// Generates (divisions+1) lines in each of 2 directions, spanning
/// [-half_extent, +half_extent] in both axes. The third axis is 0.
///
/// Vertices are converted from Cartesian to Quadray for the shader pipeline.
///
/// - `plane`: 0=XY (z=0), 1=XZ (y=0), 2=YZ (x=0)
/// - `half_extent`: how far the grid extends from origin
/// - `divisions`: number of subdivisions per axis
/// - `color`: RGB color for all grid lines
/// - `index_offset`: base index for the returned indices
fn build_cartesian_plane(
    plane: u8,
    half_extent: f64,
    divisions: u32,
    color: [f32; 3],
    index_offset: u16,
) -> (Vec<Vertex>, Vec<u16>) {
    let n = divisions as usize;
    let step = 2.0 * half_extent / n as f64;

    // Each direction: (n+1) lines, each line = 2 vertices + 2 indices
    let line_count = 2 * (n + 1);
    let mut vertices = Vec::with_capacity(line_count * 2);
    let mut indices = Vec::with_capacity(line_count * 2);

    let mut push_line = |p0: [f64; 3], p1: [f64; 3]| {
        let idx = index_offset + vertices.len() as u16;
        vertices.push(Vertex {
            quadray: Quadray::from_cartesian(p0).to_f32_array(),
            color,
        });
        vertices.push(Vertex {
            quadray: Quadray::from_cartesian(p1).to_f32_array(),
            color,
        });
        indices.push(idx);
        indices.push(idx + 1);
    };

    for i in 0..=n {
        let t = -half_extent + i as f64 * step;

        match plane {
            0 => {
                // XY plane (z=0): lines parallel to X and Y
                push_line([-half_extent, t, 0.0], [half_extent, t, 0.0]); // parallel to X
                push_line([t, -half_extent, 0.0], [t, half_extent, 0.0]); // parallel to Y
            }
            1 => {
                // XZ plane (y=0): lines parallel to X and Z
                push_line([-half_extent, 0.0, t], [half_extent, 0.0, t]); // parallel to X
                push_line([t, 0.0, -half_extent], [t, 0.0, half_extent]); // parallel to Z
            }
            2 => {
                // YZ plane (x=0): lines parallel to Y and Z
                push_line([0.0, -half_extent, t], [0.0, half_extent, t]); // parallel to Y
                push_line([0.0, t, -half_extent], [0.0, t, half_extent]); // parallel to Z
            }
            _ => unreachable!(),
        }
    }

    (vertices, indices)
}

/// Build a triangular IVM grid on one Central Angle plane.
///
/// The plane is defined by two Quadray basis directions. The triangular
/// tessellation fills the wedge between them, generating equilateral
/// triangles with edge length = step_length.
///
/// Algorithm (from JS createIVMGrid):
///   For i=0..T, j=0..T-i:
///     P(i,j)   = basis1 * cumDist[i]   + basis2 * cumDist[j]
///     P(i+1,j) = basis1 * cumDist[i+1] + basis2 * cumDist[j]
///     P(i,j+1) = basis1 * cumDist[i]   + basis2 * cumDist[j+1]
///     Emit 3 edges forming a triangle.
///
/// - `basis1`, `basis2`: Normalized Cartesian direction vectors
/// - `tessellations`: number of triangle steps along each direction
/// - `step_length`: Cartesian distance per step
/// - `color`: RGB color for all grid lines
/// - `index_offset`: base index for the returned indices
fn build_ivm_plane(
    basis1: [f64; 3],
    basis2: [f64; 3],
    tessellations: u32,
    step_length: f64,
    color: [f32; 3],
    index_offset: u16,
) -> (Vec<Vertex>, Vec<u16>) {
    let t = tessellations as usize;

    // Pre-compute cumulative distances
    let cum_dist: Vec<f64> = (0..=t + 1).map(|k| k as f64 * step_length).collect();

    // Estimate capacity: each triangle = 3 edges = 6 vertices, 6 indices
    // Total triangles ≈ T*(T+1)/2
    let est_tris = t * (t + 1) / 2;
    let mut vertices = Vec::with_capacity(est_tris * 6);
    let mut indices = Vec::with_capacity(est_tris * 6);

    let [b1x, b1y, b1z] = basis1;
    let [b2x, b2y, b2z] = basis2;

    let mut push_line = |p0: [f64; 3], p1: [f64; 3]| {
        let idx = index_offset + vertices.len() as u16;
        vertices.push(Vertex {
            quadray: Quadray::from_cartesian(p0).to_f32_array(),
            color,
        });
        vertices.push(Vertex {
            quadray: Quadray::from_cartesian(p1).to_f32_array(),
            color,
        });
        indices.push(idx);
        indices.push(idx + 1);
    };

    for i in 0..t {
        let di = cum_dist[i];
        let di1 = cum_dist[i + 1];

        for j in 0..t - i {
            let dj = cum_dist[j];
            let dj1 = cum_dist[j + 1];

            // Triangle vertices
            let p_ij = [
                b1x * di + b2x * dj,
                b1y * di + b2y * dj,
                b1z * di + b2z * dj,
            ];
            let p_i1j = [
                b1x * di1 + b2x * dj,
                b1y * di1 + b2y * dj,
                b1z * di1 + b2z * dj,
            ];
            let p_ij1 = [
                b1x * di + b2x * dj1,
                b1y * di + b2y * dj1,
                b1z * di + b2z * dj1,
            ];

            // 3 edges of the triangle
            push_line(p_ij, p_i1j);
            push_line(p_i1j, p_ij1);
            push_line(p_ij1, p_ij);
        }
    }

    (vertices, indices)
}

/// Normalized Cartesian direction for a Quadray basis vector.
fn quadray_direction(q: &Quadray) -> [f64; 3] {
    let xyz = q.to_cartesian();
    let len = (xyz[0] * xyz[0] + xyz[1] * xyz[1] + xyz[2] * xyz[2]).sqrt();
    [xyz[0] / len, xyz[1] / len, xyz[2] / len]
}

/// Build all visible Cartesian grid planes.
///
/// Returns (vertices, indices) for the combined visible planes.
pub fn build_cartesian_grids(
    state: &AppState,
    index_offset: u16,
) -> (Vec<Vertex>, Vec<u16>) {
    if !state.show_cartesian_grids {
        return (Vec::new(), Vec::new());
    }

    // Grid extent: 1.5× cube_edge provides visual padding around geometry
    let half_extent = (state.cube_edge.abs() as f64) * 1.5;
    let divisions = state.cartesian_divisions;

    let mut all_verts = Vec::new();
    let mut all_idxs = Vec::new();

    let planes: [(bool, u8, [f32; 3]); 3] = [
        (state.show_grid_xy, 0, XY_COLOR),
        (state.show_grid_xz, 1, XZ_COLOR),
        (state.show_grid_yz, 2, YZ_COLOR),
    ];

    for (visible, plane_id, color) in &planes {
        if !visible {
            continue;
        }
        let offset = index_offset + all_verts.len() as u16;
        let (verts, idxs) = build_cartesian_plane(*plane_id, half_extent, divisions, *color, offset);
        all_verts.extend(verts);
        all_idxs.extend(idxs);
    }

    (all_verts, all_idxs)
}

/// Build all visible IVM Central Angle grid planes.
///
/// Each of the 6 planes is defined by a pair of Quadray basis vectors.
/// The triangular tessellation uses normalized Cartesian directions and
/// a step length scaled by the current geometry factor.
///
/// Returns (vertices, indices) for the combined visible planes.
pub fn build_ivm_grids(
    state: &AppState,
    index_offset: u16,
) -> (Vec<Vertex>, Vec<u16>) {
    if !state.show_ivm_grids {
        return (Vec::new(), Vec::new());
    }

    // Step length: scale quadray grid interval by geometry factor s
    let s = (state.cube_edge / 2.0).abs() as f64;
    let step_length = s * radicals::quadray_grid_interval();
    let tessellations = state.ivm_tessellations;

    // Normalized Quadray basis directions
    let dir_a = quadray_direction(&Quadray::A);
    let dir_b = quadray_direction(&Quadray::B);
    let dir_c = quadray_direction(&Quadray::C);
    let dir_d = quadray_direction(&Quadray::D);

    // 6 Central Angle planes: all C(4,2) pairs of basis vectors
    let planes: [(bool, [f64; 3], [f64; 3], [f32; 3]); 6] = [
        (state.show_grid_ab, dir_a, dir_b, AB_COLOR),
        (state.show_grid_ac, dir_a, dir_c, AC_COLOR),
        (state.show_grid_ad, dir_a, dir_d, AD_COLOR),
        (state.show_grid_bc, dir_b, dir_c, BC_COLOR),
        (state.show_grid_bd, dir_b, dir_d, BD_COLOR),
        (state.show_grid_cd, dir_c, dir_d, CD_COLOR),
    ];

    let mut all_verts = Vec::new();
    let mut all_idxs = Vec::new();

    for (visible, b1, b2, color) in &planes {
        if !visible {
            continue;
        }
        let offset = index_offset + all_verts.len() as u16;
        let (verts, idxs) = build_ivm_plane(*b1, *b2, tessellations, step_length, *color, offset);
        all_verts.extend(verts);
        all_idxs.extend(idxs);
    }

    (all_verts, all_idxs)
}

#[cfg(test)]
mod tests {
    use super::*;

    const EPS: f64 = 1e-10;

    #[test]
    fn cartesian_xy_plane_vertex_count() {
        let state = AppState {
            show_cartesian_grids: true,
            show_grid_xy: true,
            show_grid_xz: false,
            show_grid_yz: false,
            cartesian_divisions: 10,
            ..AppState::default()
        };
        let (verts, idxs) = build_cartesian_grids(&state, 0);
        // 10 divisions → 11 lines per direction × 2 directions = 22 lines
        // Each line = 2 vertices, 2 indices
        assert_eq!(verts.len(), 44, "expected 44 vertices, got {}", verts.len());
        assert_eq!(idxs.len(), 44, "expected 44 indices, got {}", idxs.len());
    }

    #[test]
    fn cartesian_all_planes_triple_count() {
        let state = AppState {
            show_cartesian_grids: true,
            show_grid_xy: true,
            show_grid_xz: true,
            show_grid_yz: true,
            cartesian_divisions: 10,
            ..AppState::default()
        };
        let (verts, _) = build_cartesian_grids(&state, 0);
        // 3 planes × 44 vertices = 132
        assert_eq!(verts.len(), 132, "expected 132 vertices, got {}", verts.len());
    }

    #[test]
    fn cartesian_master_toggle_off() {
        let state = AppState {
            show_cartesian_grids: false,
            show_grid_xy: true,
            show_grid_xz: true,
            show_grid_yz: true,
            ..AppState::default()
        };
        let (verts, idxs) = build_cartesian_grids(&state, 0);
        assert_eq!(verts.len(), 0);
        assert_eq!(idxs.len(), 0);
    }

    #[test]
    fn ivm_single_plane_has_triangles() {
        let state = AppState {
            show_ivm_grids: true,
            show_grid_ab: true,
            show_grid_ac: false,
            show_grid_ad: false,
            show_grid_bc: false,
            show_grid_bd: false,
            show_grid_cd: false,
            ivm_tessellations: 3,
            ..AppState::default()
        };
        let (verts, idxs) = build_ivm_grids(&state, 0);
        // T=3: triangles = 3+2+1 = 6, each has 3 edges, each edge = 2 verts
        // 6 triangles × 3 edges × 2 verts = 36 vertices
        assert_eq!(verts.len(), 36, "expected 36 vertices, got {}", verts.len());
        assert_eq!(idxs.len(), 36, "expected 36 indices, got {}", idxs.len());
    }

    #[test]
    fn ivm_master_toggle_off() {
        let state = AppState {
            show_ivm_grids: false,
            show_grid_ab: true,
            ..AppState::default()
        };
        let (verts, idxs) = build_ivm_grids(&state, 0);
        assert_eq!(verts.len(), 0);
        assert_eq!(idxs.len(), 0);
    }

    #[test]
    fn ivm_tessellation_12_default() {
        let state = AppState {
            show_ivm_grids: true,
            show_grid_ab: true,
            show_grid_ac: false,
            show_grid_ad: false,
            show_grid_bc: false,
            show_grid_bd: false,
            show_grid_cd: false,
            ivm_tessellations: 12,
            ..AppState::default()
        };
        let (verts, _) = build_ivm_grids(&state, 0);
        // T=12: triangles = sum(12..1) = 78, each = 6 verts → 468
        assert_eq!(verts.len(), 468, "expected 468 vertices, got {}", verts.len());
    }

    #[test]
    fn index_offset_applied() {
        let state = AppState {
            show_cartesian_grids: true,
            show_grid_xy: true,
            show_grid_xz: false,
            show_grid_yz: false,
            cartesian_divisions: 5,
            ..AppState::default()
        };
        let (_, idxs) = build_cartesian_grids(&state, 200);
        for idx in &idxs {
            assert!(*idx >= 200, "index {} < offset 200", idx);
        }
    }

    #[test]
    fn xy_plane_vertices_have_zero_z() {
        let state = AppState {
            show_cartesian_grids: true,
            show_grid_xy: true,
            show_grid_xz: false,
            show_grid_yz: false,
            cartesian_divisions: 4,
            ..AppState::default()
        };
        let (verts, _) = build_cartesian_grids(&state, 0);
        // All vertices should roundtrip to Cartesian with z ≈ 0
        for (i, v) in verts.iter().enumerate() {
            let q = Quadray::new(
                v.quadray[0] as f64,
                v.quadray[1] as f64,
                v.quadray[2] as f64,
                v.quadray[3] as f64,
            );
            let xyz = q.to_cartesian();
            assert!(
                xyz[2].abs() < 0.01,
                "vertex {} has z={} (expected ≈0 for XY plane)",
                i,
                xyz[2]
            );
        }
    }

    #[test]
    fn ivm_plane_vertices_on_plane() {
        // AB plane: all vertices should lie in the plane spanned by dir_a and dir_b
        // i.e., the cross product of (dir_a, dir_b) is the plane normal,
        // and dot(vertex, normal) should be ≈ 0
        let dir_a = quadray_direction(&Quadray::A);
        let dir_b = quadray_direction(&Quadray::B);
        let normal = [
            dir_a[1] * dir_b[2] - dir_a[2] * dir_b[1],
            dir_a[2] * dir_b[0] - dir_a[0] * dir_b[2],
            dir_a[0] * dir_b[1] - dir_a[1] * dir_b[0],
        ];

        let state = AppState {
            show_ivm_grids: true,
            show_grid_ab: true,
            show_grid_ac: false,
            show_grid_ad: false,
            show_grid_bc: false,
            show_grid_bd: false,
            show_grid_cd: false,
            ivm_tessellations: 4,
            ..AppState::default()
        };
        let (verts, _) = build_ivm_grids(&state, 0);
        for (i, v) in verts.iter().enumerate() {
            let q = Quadray::new(
                v.quadray[0] as f64,
                v.quadray[1] as f64,
                v.quadray[2] as f64,
                v.quadray[3] as f64,
            );
            let xyz = q.to_cartesian();
            let dot = xyz[0] * normal[0] + xyz[1] * normal[1] + xyz[2] * normal[2];
            assert!(
                dot.abs() < 0.01,
                "vertex {} not on AB plane: dot(xyz, normal) = {}",
                i,
                dot
            );
        }
    }

    #[test]
    fn quadray_directions_are_unit_vectors() {
        let dirs = [
            quadray_direction(&Quadray::A),
            quadray_direction(&Quadray::B),
            quadray_direction(&Quadray::C),
            quadray_direction(&Quadray::D),
        ];
        for (i, d) in dirs.iter().enumerate() {
            let len = (d[0] * d[0] + d[1] * d[1] + d[2] * d[2]).sqrt();
            assert!(
                (len - 1.0).abs() < EPS,
                "direction {} has length {} != 1.0",
                i,
                len
            );
        }
    }
}
