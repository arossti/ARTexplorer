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

    // Scale controls (Quadray edge lengths)
    pub tet_edge: f32,
    pub cube_edge: f32,

    // Geometry rebuild flag
    pub geometry_dirty: bool,

    // Geometry stats (updated on rebuild)
    pub vertex_count: usize,
    pub edge_count: usize,

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
            tet_edge: 2.0,
            cube_edge: 1.4,
            geometry_dirty: true, // Build on first frame
            vertex_count: 0,
            edge_count: 0,
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
