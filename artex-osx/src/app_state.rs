/// Which scale slider is currently the "driver" (gets rational snapping).
/// The Rationality Reciprocity: tet_edge = cube_edge * √2.
/// You cannot have both rational simultaneously.
#[derive(Clone, Copy, PartialEq)]
pub enum ScaleDriver {
    TetEdge,  // tet edge is rational, cube edge is irrational
    CubeEdge, // cube edge is rational, tet edge is irrational
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

    // Scale — ONE metric, TWO presentations (Rationality Reciprocity)
    // tet_edge = cube_edge * √2.  Whichever slider the user adjusts gets
    // snapped to rational (0.1) intervals; the other shows the irrational conjugate.
    // See Janus10.tex §2.6 and rt-init.js scale slider logic.
    pub tet_edge: f32,
    pub cube_edge: f32,
    pub scale_driver: ScaleDriver, // which slider is primary (gets rational snapping)

    // Geometry rebuild flag
    pub geometry_dirty: bool,

    // Geometry stats (updated on rebuild)
    pub vertex_count: usize,
    pub edge_count: usize,
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
            tet_edge: 2.0,
            cube_edge: 2.0 / std::f32::consts::SQRT_2, // √2 ≈ 1.4142
            scale_driver: ScaleDriver::TetEdge,
            geometry_dirty: true, // Build on first frame
            vertex_count: 0,
            edge_count: 0,
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
