/// Which scale control is currently driving.
/// Frequency = Quadray-native (integer = on-grid).
/// Edge lengths = Cartesian observations (generally off-grid).
/// The Rationality Reciprocity: tet_edge = cube_edge * √2.
#[derive(Clone, Copy, PartialEq)]
pub enum ScaleDriver {
    Frequency, // frequency is integer → polyhedra on grid points
    TetEdge,   // tet edge is rational, cube edge is irrational
    CubeEdge,  // cube edge is rational, tet edge is irrational
}

/// Application state — drives UI and geometry generation.
///
/// All polyhedra toggles default to the stella octangula (tet + dual tet visible).
/// When any toggle or scale changes, `geometry_dirty` signals a buffer rebuild.
pub struct AppState {
    // Polyhedra visibility
    pub show_tetrahedron: bool,
    pub show_dual_tetrahedron: bool,
    pub show_cube: bool,
    pub show_octahedron: bool,
    pub show_icosahedron: bool,
    pub show_dodecahedron: bool,

    // Basis arrow visibility
    pub show_quadray_basis: bool,
    pub show_cartesian_basis: bool,

    // Cartesian grid planes (XY, XZ, YZ)
    pub show_cartesian_grids: bool, // master toggle
    pub show_grid_xy: bool,
    pub show_grid_xz: bool,
    pub show_grid_yz: bool,
    pub cartesian_divisions: u32, // 10–100, step 10
    pub cartesian_grid_opacity: f32, // 0.0–1.0

    // IVM Central Angle grid planes (6 basis-vector pairs)
    pub show_ivm_grids: bool, // master toggle
    pub show_grid_ab: bool,
    pub show_grid_ac: bool,
    pub show_grid_ad: bool,
    pub show_grid_bc: bool,
    pub show_grid_bd: bool,
    pub show_grid_cd: bool,
    pub ivm_tessellations: u32, // 12–144, step 12
    pub ivm_grid_opacity: f32, // 0.0–1.0

    // Scale — ONE metric, THREE controls.
    //
    // Frequency (Fuller): F = s = cube_edge / 2 = Quadray scale factor.
    // At integer F, polyhedra land on integer Quadray grid points.
    // cube_edge = 2F (rational when F integer), tet_edge = 2√2·F (always
    // irrational — the Rationality Reciprocity). See Janus10.tex §2.6.
    //
    // Two slider groups:
    //   1. Frequency slider — integer snap, Quadray-native, on-grid
    //   2. Edge length sliders — 0.1 snap, Cartesian observations, generally off-grid
    pub frequency: f32,    // Fuller frequency F = s = cube_edge / 2
    pub tet_edge: f32,
    pub cube_edge: f32,
    pub scale_driver: ScaleDriver, // which control is currently driving

    // Janus arena tracking (for crossing detection)
    pub janus_negative: bool, // true when frequency < 0 (negative arena)

    // Face rendering
    // P1: ABCD vertex interpolation (face vertices inherit per-vertex ABCD colors).
    // Future: per-polyhedron color palette (designer-choosable, like JS rs-color-theory-modal.js).
    pub show_faces: bool,
    pub face_opacity: f32, // 0.0–1.0

    // Geometry rebuild flag
    pub geometry_dirty: bool,

    // Geometry stats (updated on rebuild)
    pub vertex_count: usize,
    pub edge_count: usize,
    pub face_count: usize, // triangle count (after fan triangulation)
    pub bounding_radius: f32, // max Cartesian distance from origin across all visible vertices

    // UI layout (updated each frame by egui)
    pub panel_width: f32, // sidebar panel width in logical points

    // FPS tracking
    pub fps: f64,
    pub frame_count: u64,
    pub fps_timer: std::time::Instant,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            show_tetrahedron: true,
            show_dual_tetrahedron: true,
            show_cube: false,
            show_octahedron: false,
            show_icosahedron: false,
            show_dodecahedron: false,
            show_quadray_basis: true,
            show_cartesian_basis: false,
            show_cartesian_grids: false,
            show_grid_xy: true,
            show_grid_xz: true,
            show_grid_yz: true,
            cartesian_divisions: 10,
            cartesian_grid_opacity: 0.10,
            show_ivm_grids: false,
            show_grid_ab: true,
            show_grid_ac: true,
            show_grid_ad: true,
            show_grid_bc: true,
            show_grid_bd: true,
            show_grid_cd: true,
            ivm_tessellations: 12,
            ivm_grid_opacity: 0.10,
            frequency: 1.0,                           // F1: baseline
            tet_edge: 2.0 * std::f32::consts::SQRT_2, // F1: 2√2 ≈ 2.8284 (irrational)
            cube_edge: 2.0,                           // F1: 2 (rational integer)
            scale_driver: ScaleDriver::Frequency,      // Frequency is primary
            show_faces: true,      // faces visible by default
            face_opacity: 0.35,    // semi-transparent (matches JS app default)
            janus_negative: false, // Start in positive arena (F1)
            geometry_dirty: true, // Build on first frame
            vertex_count: 0,
            edge_count: 0,
            face_count: 0,
            bounding_radius: 0.0,
            panel_width: 220.0, // initial estimate, updated each frame by egui
            fps: 0.0,
            frame_count: 0,
            fps_timer: std::time::Instant::now(),
        }
    }
}

impl AppState {
    pub fn tick_fps(&mut self) {
        self.frame_count += 1;
        let elapsed = self.fps_timer.elapsed().as_secs_f64();
        if elapsed >= 1.0 {
            self.fps = self.frame_count as f64 / elapsed;
            self.frame_count = 0;
            self.fps_timer = std::time::Instant::now();
        }
    }
}
