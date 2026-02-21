/// Coordinate display mode — which reference frame to show transforms in.
/// GroupCentre requires 2+ selected objects; stubbed (no instances in P1).
#[derive(Clone, Copy, PartialEq, Default)]
pub enum CoordMode {
    #[default]
    Absolute,       // World-space transforms (default)
    Relative,       // Object-local (self = origin)
    GroupCentre,    // Centroid of multi-selection (stub — P1: no instances)
}

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

    // Central Angle grid planes (6 ABCD basis-vector pairs)
    // These are PLANAR grids on the tet face planes, not the full IVM spatial lattice.
    // Field names kept as `ivm_*` for backwards compatibility; UI says "Central Angle Grid".
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

    // Geodesic subdivision (P2)
    // Nested under parent polyhedron — only visible when parent is enabled.
    // Frequency = subdivision level (1 = base, 2..7 = subdivided).
    // Projection: 0=Off (flat), 1=InSphere, 2=MidSphere, 3=OutSphere (Fuller).
    pub show_geodesic_tet: bool,
    pub geodesic_tet_freq: u32,
    pub geodesic_tet_projection: u8,

    pub show_geodesic_octa: bool,
    pub geodesic_octa_freq: u32,
    pub geodesic_octa_projection: u8,

    pub show_geodesic_icosa: bool,
    pub geodesic_icosa_freq: u32,
    pub geodesic_icosa_projection: u8,

    // Face rendering
    // P1: ABCD vertex interpolation (face vertices inherit per-vertex ABCD colors).
    // Future: per-polyhedron color palette (designer-choosable, like JS rs-color-theory-modal.js).
    pub show_faces: bool,
    pub face_opacity: f32, // 0.0–1.0

    // Node rendering (geodesic vertex spheres)
    // Geodesic icosahedron at each polyhedron vertex — no classical spheres.
    // Size: 0=Off, 1-7=fixed radii, 8=Packed (close-packed from edge quadrance).
    // Packed: Q_vertex = Q_edge/4, radius = sqrt(Q_vertex) — RT-pure.
    pub show_nodes: bool,
    pub node_size: u8,              // 0=Off, 1-7=fixed, 8=Packed
    pub node_opacity: f32,          // 0.0–1.0
    pub node_geodesic_freq: u32,    // 1–4 (geodesic icosahedron subdivision)

    // Geometry rebuild flag
    pub geometry_dirty: bool,

    // Geometry stats (updated on rebuild)
    pub vertex_count: usize,
    pub edge_count: usize,
    pub face_count: usize, // triangle count (after fan triangulation)
    pub node_count: usize, // number of node sphere instances
    pub bounding_radius: f32, // max Cartesian distance from origin across all visible vertices

    // UI layout (updated each frame by egui)
    pub panel_width: f32,       // sidebar panel width in logical points
    pub coord_bar_height: f32,  // coordinate bar height in logical points (set by draw_coord_bar)

    // Coordinate bar mode + normalize toggle
    pub coord_mode: CoordMode,    // Absolute / Relative / GroupCentre
    pub coord_normalize: bool,    // false = zero-sum ABCD (native); true = canonical (JS-style)

    // Cursor tracking — populated each frame from CursorMoved + ray-sphere intersection.
    // Physical pixel coordinates stored raw; world position computed in render loop.
    pub cursor_screen: Option<(f32, f32)>,      // raw winit cursor (physical px)
    pub cursor_world_xyz: Option<[f32; 3]>,     // Cartesian XYZ of hit point
    pub cursor_abcd: Option<[f64; 4]>,          // zero-sum Quadray [a, b, c, d]

    // Selection stub — always None in P1. V2: ray-mesh picking, instances.
    pub selected_polyhedron: Option<&'static str>,

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
            show_geodesic_tet: false,
            geodesic_tet_freq: 3,
            geodesic_tet_projection: 3,  // OutSphere (Fuller geodesic)
            show_geodesic_octa: false,
            geodesic_octa_freq: 3,
            geodesic_octa_projection: 3,
            show_geodesic_icosa: false,
            geodesic_icosa_freq: 3,
            geodesic_icosa_projection: 3,
            show_faces: true,      // faces visible by default
            face_opacity: 0.35,    // semi-transparent (matches JS app default)
            show_nodes: false,     // nodes off by default
            node_size: 4,         // "Md" (medium, 0.04 Cartesian radius)
            node_opacity: 0.6,    // semi-transparent (matches JS app default)
            node_geodesic_freq: 3, // 3F icosphere (92V, 180F — good detail/perf ratio)
            janus_negative: false, // Start in positive arena (F1)
            geometry_dirty: true, // Build on first frame
            vertex_count: 0,
            edge_count: 0,
            face_count: 0,
            node_count: 0,
            bounding_radius: 0.0,
            panel_width: 220.0,     // initial estimate, updated each frame by egui
            coord_bar_height: 0.0,  // updated each frame by draw_coord_bar
            coord_mode: CoordMode::Absolute,
            coord_normalize: false, // default: zero-sum ABCD (native pure Quadray)
            cursor_screen: None,
            cursor_world_xyz: None,
            cursor_abcd: None,
            selected_polyhedron: None,
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
