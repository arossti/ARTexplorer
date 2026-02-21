//! Grid plane generators — Cartesian XYZ and Quadray Central Angle
//!
//! Generates wireframe grid planes for spatial reference:
//!   - **Cartesian**: 3 uniform rectangular grids (XY, XZ, YZ)
//!   - **Central Angle**: 6 triangular tessellations from ABCD basis pairs
//!
//! These are PLANAR grids — wireframe lines on the 6 planes defined by pairs
//! of tetrahedral basis vectors. They are NOT the full IVM spatial lattice.
//! A true IVM grid (snap-to ABCD points in 3D space, rhombic dodecahedra
//! Voronoi cells) is a separate future feature.
//!
//! Cartesian grids are built in XYZ and converted to Quadray via normalizer::xyz_to_quadray().
//! Quadray grids are built directly as integer ABCD coordinates — no Cartesian
//! intermediaries, no irrationals, no from_cartesian(). The shader converts
//! ABCD → XYZ at the rendering boundary.
//!
//! Color conventions (full brightness, alpha-blended via per-grid-type opacity):
//!   Cartesian: XY=Yellow, XZ=Magenta, YZ=Cyan (additive axis mixes)
//!   Quadray: AB=Orange, AC=Magenta, AD=Lime, BC=Cyan, BD=Lavender, CD=Pink

use crate::app_state::AppState;
use crate::geometry::Vertex;
use crate::rt_math::normalizer::xyz_to_quadray;
use crate::rt_math::radicals;

// --- Cartesian grid plane colors (full brightness — alpha handles opacity) ---
const XY_COLOR: [f32; 3] = [1.0, 1.0, 0.0]; // Yellow
const XZ_COLOR: [f32; 3] = [1.0, 0.0, 1.0]; // Magenta
const YZ_COLOR: [f32; 3] = [0.0, 1.0, 1.0]; // Cyan

// --- Quadray Central Angle plane colors (full brightness — alpha handles opacity) ---
const AB_COLOR: [f32; 3] = [1.0, 0.67, 0.0];  // Orange
const AC_COLOR: [f32; 3] = [1.0, 0.0, 1.0];   // Magenta
const AD_COLOR: [f32; 3] = [0.67, 1.0, 0.0];  // Lime
const BC_COLOR: [f32; 3] = [0.0, 1.0, 1.0];   // Cyan
const BD_COLOR: [f32; 3] = [0.67, 0.67, 1.0]; // Lavender
const CD_COLOR: [f32; 3] = [1.0, 0.5, 0.5];   // Pink

/// Build a uniform rectangular grid on one Cartesian plane.
///
/// Generates (divisions+1) lines in each of 2 directions, spanning
/// [-half_extent, +half_extent] in both axes. The third axis is 0.
///
/// Vertices are converted from Cartesian to Quadray via normalizer::xyz_to_quadray().
/// RENDERING BOUNDARY: Cartesian coordinates used for XYZ grid layout (justified).
///
/// - `plane`: 0=XY (z=0), 1=XZ (y=0), 2=YZ (x=0)
/// - `half_extent`: how far the grid extends from origin
/// - `divisions`: number of subdivisions per axis
/// - `color`: RGBA color for all grid lines (alpha = opacity)
/// - `index_offset`: base index for the returned indices
fn build_cartesian_plane(
    plane: u8,
    half_extent: f64,
    divisions: u32,
    color: [f32; 4],
    index_offset: u32,
) -> (Vec<Vertex>, Vec<u32>) {
    let n = divisions as usize;
    let step = 2.0 * half_extent / n as f64;

    // Each direction: (n+1) lines, each line = 2 vertices + 2 indices
    let line_count = 2 * (n + 1);
    let mut vertices = Vec::with_capacity(line_count * 2);
    let mut indices = Vec::with_capacity(line_count * 2);

    let mut push_line = |p0: [f64; 3], p1: [f64; 3]| {
        let idx = index_offset + vertices.len() as u32;
        vertices.push(Vertex {
            quadray: xyz_to_quadray(p0).to_f32_array(),
            color,
        });
        vertices.push(Vertex {
            quadray: xyz_to_quadray(p1).to_f32_array(),
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
                push_line([-half_extent, t, 0.0], [half_extent, t, 0.0]);
                push_line([t, -half_extent, 0.0], [t, half_extent, 0.0]);
            }
            1 => {
                // XZ plane (y=0): lines parallel to X and Z
                push_line([-half_extent, 0.0, t], [half_extent, 0.0, t]);
                push_line([t, 0.0, -half_extent], [t, 0.0, half_extent]);
            }
            2 => {
                // YZ plane (x=0): lines parallel to Y and Z
                push_line([0.0, -half_extent, t], [0.0, half_extent, t]);
                push_line([0.0, t, -half_extent], [0.0, t, half_extent]);
            }
            _ => unreachable!(),
        }
    }

    (vertices, indices)
}

/// Build a triangular Quadray grid on one Central Angle plane.
///
/// The plane is defined by two ABCD basis indices (0=A, 1=B, 2=C, 3=D).
/// Grid vertices are **integer ABCD coordinates** — no Cartesian intermediary,
/// no irrationals, no from_cartesian(). The shader handles ABCD → XYZ.
///
/// Algorithm:
///   For i=0..T, j=0..T-i:
///     P(i,j)   = i*basis1 + j*basis2  (integer ABCD)
///     P(i+1,j) = (i+1)*basis1 + j*basis2
///     P(i,j+1) = i*basis1 + (j+1)*basis2
///     Emit 3 edges forming a triangle.
///
/// Example (AB plane, T=3):
///   [0,0,0,0]—[1,0,0,0]—[0,1,0,0]  (first triangle)
///   [1,0,0,0]—[2,0,0,0]—[1,1,0,0]  (second triangle)
///   ...all vertices are pure integers in ABCD.
///
/// - `basis`: indices of the two non-zero ABCD components, e.g. [0,1] for AB
/// - `tessellations`: number of integer steps along each basis direction
/// - `color`: RGBA color for all grid lines (alpha = opacity)
/// - `index_offset`: base index for the returned indices
fn build_quadray_plane(
    basis: [usize; 2],
    tessellations: u32,
    sign: f32,
    color: [f32; 4],
    index_offset: u32,
) -> (Vec<Vertex>, Vec<u32>) {
    let t = tessellations as usize;

    // Estimate capacity: each triangle = 3 edges = 6 vertices, 6 indices
    // Total triangles = T*(T+1)/2
    let est_tris = t * (t + 1) / 2;
    let mut vertices = Vec::with_capacity(est_tris * 6);
    let mut indices = Vec::with_capacity(est_tris * 6);

    // Build an ABCD quadray from two basis indices and integer coefficients.
    // Janus: sign = -1 negates all coordinates → grid tessellates in the
    // negative arena (dual tet directions). The shader's ABCD→XYZ conversion
    // places these at the inverted Cartesian positions naturally.
    let make_quadray = |ci: f32, cj: f32| -> [f32; 4] {
        let mut q = [0.0f32; 4];
        q[basis[0]] = sign * ci;
        q[basis[1]] = sign * cj;
        q
    };

    let mut push_line = |q0: [f32; 4], q1: [f32; 4]| {
        let idx = index_offset + vertices.len() as u32;
        vertices.push(Vertex { quadray: q0, color });
        vertices.push(Vertex { quadray: q1, color });
        indices.push(idx);
        indices.push(idx + 1);
    };

    for i in 0..t {
        let fi = i as f32;
        let fi1 = (i + 1) as f32;

        for j in 0..t - i {
            let fj = j as f32;
            let fj1 = (j + 1) as f32;

            // Three vertices of the triangle — pure integer ABCD
            let q_ij = make_quadray(fi, fj);
            let q_i1j = make_quadray(fi1, fj);
            let q_ij1 = make_quadray(fi, fj1);

            // 3 edges of the triangle
            push_line(q_ij, q_i1j);
            push_line(q_i1j, q_ij1);
            push_line(q_ij1, q_ij);
        }
    }

    (vertices, indices)
}

/// Build all visible Cartesian grid planes.
///
/// Returns (vertices, indices) for the combined visible planes.
pub fn build_cartesian_grids(
    state: &AppState,
    index_offset: u32,
) -> (Vec<Vertex>, Vec<u32>) {
    if !state.show_cartesian_grids {
        return (Vec::new(), Vec::new());
    }

    // Fixed cell spacing — grid is a spatial reference frame, independent of geometry scale.
    // Uses quadray grid interval (√6/4) for visual consistency with the Quadray grid.
    // Divisions slider EXPANDS the grid (more cells = larger extent), not subdivides it.
    let cell_spacing = radicals::quadray_grid_interval();
    let divisions = state.cartesian_divisions;
    let half_extent = divisions as f64 * cell_spacing / 2.0;

    let alpha = state.cartesian_grid_opacity;
    let mut all_verts = Vec::new();
    let mut all_idxs = Vec::new();

    let planes: [(bool, u8, [f32; 3]); 3] = [
        (state.show_grid_xy, 0, XY_COLOR),
        (state.show_grid_xz, 1, XZ_COLOR),
        (state.show_grid_yz, 2, YZ_COLOR),
    ];

    for (visible, plane_id, rgb) in &planes {
        if !visible {
            continue;
        }
        let color = [rgb[0], rgb[1], rgb[2], alpha];
        let offset = index_offset + all_verts.len() as u32;
        let (verts, idxs) = build_cartesian_plane(*plane_id, half_extent, divisions, color, offset);
        all_verts.extend(verts);
        all_idxs.extend(idxs);
    }

    (all_verts, all_idxs)
}

/// Build all visible Quadray Central Angle grid planes.
///
/// Each of the 6 planes is defined by a pair of ABCD basis indices.
/// Grid vertices are **pure integer ABCD coordinates** — no Cartesian
/// intermediary, no irrationals, no from_cartesian(). The WGSL shader
/// converts ABCD → XYZ at the rendering boundary.
///
/// Tessellations slider controls grid extent: T=12 means vertices from
/// [0,0,0,0] to [12,0,0,0] along each basis direction.
///
/// Returns (vertices, indices) for the combined visible planes.
pub fn build_quadray_grids(
    state: &AppState,
    index_offset: u32,
) -> (Vec<Vertex>, Vec<u32>) {
    if !state.show_ivm_grids {
        return (Vec::new(), Vec::new());
    }

    let tessellations = state.ivm_tessellations;
    let alpha = state.ivm_grid_opacity;

    // Janus: negative frequency → negative ABCD coordinates.
    // The grid tessellates in the dual tet directions, mirroring the
    // basis arrow + polyhedra inversion. See Janus10.tex §3.
    let sign = if state.frequency < 0.0 { -1.0f32 } else { 1.0f32 };

    // 6 Central Angle planes: all C(4,2) pairs of ABCD basis vectors
    // basis indices: 0=A, 1=B, 2=C, 3=D
    let planes: [(bool, [usize; 2], [f32; 3]); 6] = [
        (state.show_grid_ab, [0, 1], AB_COLOR),
        (state.show_grid_ac, [0, 2], AC_COLOR),
        (state.show_grid_ad, [0, 3], AD_COLOR),
        (state.show_grid_bc, [1, 2], BC_COLOR),
        (state.show_grid_bd, [1, 3], BD_COLOR),
        (state.show_grid_cd, [2, 3], CD_COLOR),
    ];

    let mut all_verts = Vec::new();
    let mut all_idxs = Vec::new();

    for (visible, basis, rgb) in &planes {
        if !visible {
            continue;
        }
        let color = [rgb[0], rgb[1], rgb[2], alpha];
        let offset = index_offset + all_verts.len() as u32;
        let (verts, idxs) = build_quadray_plane(*basis, tessellations, sign, color, offset);
        all_verts.extend(verts);
        all_idxs.extend(idxs);
    }

    (all_verts, all_idxs)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rt_math::quadray::Quadray;

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
    fn quadray_single_plane_has_triangles() {
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
        let (verts, idxs) = build_quadray_grids(&state, 0);
        // T=3: triangles = 3+2+1 = 6, each has 3 edges, each edge = 2 verts
        // 6 triangles × 3 edges × 2 verts = 36 vertices
        assert_eq!(verts.len(), 36, "expected 36 vertices, got {}", verts.len());
        assert_eq!(idxs.len(), 36, "expected 36 indices, got {}", idxs.len());
    }

    #[test]
    fn quadray_master_toggle_off() {
        let state = AppState {
            show_ivm_grids: false,
            show_grid_ab: true,
            ..AppState::default()
        };
        let (verts, idxs) = build_quadray_grids(&state, 0);
        assert_eq!(verts.len(), 0);
        assert_eq!(idxs.len(), 0);
    }

    #[test]
    fn quadray_tessellation_12_default() {
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
        let (verts, _) = build_quadray_grids(&state, 0);
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
            let xyz = crate::rt_math::normalizer::quadray_to_xyz(&q);
            assert!(
                xyz[2].abs() < 0.01,
                "vertex {} has z={} (expected ≈0 for XY plane)",
                i,
                xyz[2]
            );
        }
    }

    #[test]
    fn quadray_ab_vertices_are_integer() {
        // AB plane: all vertices should have integer A and B, zero C and D
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
        let (verts, _) = build_quadray_grids(&state, 0);
        for (i, v) in verts.iter().enumerate() {
            // C and D must be exactly 0
            assert_eq!(
                v.quadray[2], 0.0,
                "vertex {} has C={} (expected 0 for AB plane)",
                i, v.quadray[2]
            );
            assert_eq!(
                v.quadray[3], 0.0,
                "vertex {} has D={} (expected 0 for AB plane)",
                i, v.quadray[3]
            );
            // A and B must be non-negative integers
            assert_eq!(
                v.quadray[0], v.quadray[0].round(),
                "vertex {} has non-integer A={}",
                i, v.quadray[0]
            );
            assert_eq!(
                v.quadray[1], v.quadray[1].round(),
                "vertex {} has non-integer B={}",
                i, v.quadray[1]
            );
        }
    }

    #[test]
    fn quadray_cd_vertices_are_integer() {
        // CD plane: all vertices should have zero A and B, integer C and D
        let state = AppState {
            show_ivm_grids: true,
            show_grid_ab: false,
            show_grid_ac: false,
            show_grid_ad: false,
            show_grid_bc: false,
            show_grid_bd: false,
            show_grid_cd: true,
            ivm_tessellations: 3,
            ..AppState::default()
        };
        let (verts, _) = build_quadray_grids(&state, 0);
        for (i, v) in verts.iter().enumerate() {
            // A and B must be exactly 0
            assert_eq!(
                v.quadray[0], 0.0,
                "vertex {} has A={} (expected 0 for CD plane)",
                i, v.quadray[0]
            );
            assert_eq!(
                v.quadray[1], 0.0,
                "vertex {} has B={} (expected 0 for CD plane)",
                i, v.quadray[1]
            );
            // C and D must be non-negative integers
            assert_eq!(
                v.quadray[2], v.quadray[2].round(),
                "vertex {} has non-integer C={}",
                i, v.quadray[2]
            );
            assert_eq!(
                v.quadray[3], v.quadray[3].round(),
                "vertex {} has non-integer D={}",
                i, v.quadray[3]
            );
        }
    }

    #[test]
    fn quadray_plane_vertices_on_plane() {
        // AB plane: all vertices should lie in the plane spanned by A and B directions
        // Since vertices are [i,j,0,0], converting to Cartesian and checking the
        // normal direction (cross product of A and B Cartesian directions) should be ≈0
        let a_xyz = crate::rt_math::normalizer::quadray_to_xyz(&Quadray::A);
        let b_xyz = crate::rt_math::normalizer::quadray_to_xyz(&Quadray::B);
        let normal = [
            a_xyz[1] * b_xyz[2] - a_xyz[2] * b_xyz[1],
            a_xyz[2] * b_xyz[0] - a_xyz[0] * b_xyz[2],
            a_xyz[0] * b_xyz[1] - a_xyz[1] * b_xyz[0],
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
        let (verts, _) = build_quadray_grids(&state, 0);
        for (i, v) in verts.iter().enumerate() {
            let q = Quadray::new(
                v.quadray[0] as f64,
                v.quadray[1] as f64,
                v.quadray[2] as f64,
                v.quadray[3] as f64,
            );
            let xyz = crate::rt_math::normalizer::quadray_to_xyz(&q);
            let dot = xyz[0] * normal[0] + xyz[1] * normal[1] + xyz[2] * normal[2];
            assert!(
                dot.abs() < 0.01,
                "vertex {} not on AB plane: dot(xyz, normal) = {}",
                i,
                dot
            );
        }
    }
}
