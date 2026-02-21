/// Projection mode for the orbit camera.
#[derive(Clone, Copy, PartialEq)]
pub enum ProjectionMode {
    Perspective,
    Orthographic,
}

/// Orbit camera — spherical coordinates around the origin.
///
/// Left-click drag rotates (yaw/pitch), scroll wheel zooms.
/// Math.X justified: spherical→Cartesian and look_at are rendering-boundary math.
pub struct OrbitCamera {
    pub yaw: f32,       // radians, horizontal rotation
    pub pitch: f32,     // radians, vertical rotation (clamped)
    pub distance: f32,  // distance from origin
    pub projection: ProjectionMode,
    dragging: bool,
    last_cursor: Option<(f64, f64)>,
}

impl Default for OrbitCamera {
    fn default() -> Self {
        // Default: B-axis view — looking from (+1,+1,+1) direction
        // yaw = π/4, pitch = asin(1/√3) ≈ 0.6155, distance = √27
        Self {
            yaw: std::f32::consts::FRAC_PI_4,
            pitch: QUADRAY_ELEVATION,
            distance: DEFAULT_DISTANCE,
            projection: ProjectionMode::Perspective,
            dragging: false,
            last_cursor: None,
        }
    }
}

impl OrbitCamera {
    pub fn on_mouse_button(&mut self, pressed: bool) {
        self.dragging = pressed;
        if !pressed {
            self.last_cursor = None;
        }
    }

    pub fn on_cursor_moved(&mut self, x: f64, y: f64) {
        if self.dragging {
            if let Some((lx, ly)) = self.last_cursor {
                let dx = (x - lx) as f32;
                let dy = (y - ly) as f32;
                self.yaw += dx * 0.005;
                self.pitch += dy * 0.005;
                // Clamp pitch to avoid gimbal lock during manual drag
                self.pitch = self.pitch.clamp(-1.5, 1.5);
            }
            self.last_cursor = Some((x, y));
        }
    }

    pub fn on_scroll(&mut self, delta: f32) {
        // Proportional zoom: scroll speed scales with distance so zooming
        // feels uniform whether close-up at F1 or remote at F12 + 144 tessellations.
        self.distance -= delta * self.distance * 0.05;
        self.distance = self.distance.clamp(0.1, 10000.0);
    }

    /// Apply a camera preset (yaw, pitch, distance).
    /// Presets can set exact ±π/2 pitch (top/bottom views) — the view_proj
    /// method handles the up-vector switch for polar orientations.
    pub fn apply_preset(&mut self, preset: &CameraPreset) {
        self.yaw = preset.yaw;
        self.pitch = preset.pitch;
        self.distance = preset.distance;
    }

    /// Centre the camera to fit the visible geometry in the viewport.
    ///
    /// `viewport_aspect` is the effective aspect ratio of the 3D viewport area
    /// (excluding UI panels). The method fits the bounding sphere within BOTH
    /// the vertical and horizontal extents, using whichever is tighter.
    /// Math.X justified: tan/atan are rendering-boundary math.
    pub fn centre(&mut self, bounding_radius: f32, viewport_aspect: f32) {
        if bounding_radius <= 0.0 {
            return;
        }
        let margin = 1.3; // 30% padding around the geometry
        let r = bounding_radius * margin;
        match self.projection {
            ProjectionMode::Perspective => {
                // Vertical: distance = r / tan(fov_v / 2)
                let half_fov_v = std::f32::consts::FRAC_PI_4 * 0.5; // fov=45°, half=22.5°
                let dist_v = r / half_fov_v.tan();
                // Horizontal: half_fov_h = atan(tan(fov_v/2) * aspect)
                // distance = r / tan(half_fov_h) = r / (tan(half_fov_v) * aspect)
                let dist_h = r / (half_fov_v.tan() * viewport_aspect);
                // Use the tighter constraint (larger distance)
                self.distance = dist_v.max(dist_h).clamp(0.1, 10000.0);
            }
            ProjectionMode::Orthographic => {
                // Vertical: distance * ORTHO_SCALE >= r
                let dist_v = r / ORTHO_SCALE;
                // Horizontal: distance * ORTHO_SCALE * aspect >= r
                let dist_h = r / (ORTHO_SCALE * viewport_aspect);
                self.distance = dist_v.max(dist_h).clamp(0.1, 10000.0);
            }
        }
    }

    /// Compute the view-projection matrix for this camera.
    /// Math.X justified: sin/cos/look_at/perspective/orthographic are rendering-boundary math.
    pub fn view_proj(&self, aspect: f32) -> glam::Mat4 {
        let eye = glam::Vec3::new(
            self.distance * self.pitch.cos() * self.yaw.cos(),
            self.distance * self.pitch.sin(),
            self.distance * self.pitch.cos() * self.yaw.sin(),
        );
        // Switch up-vector near poles to avoid gimbal lock.
        // At pitch > 1.4 rad (~80°), Y-up becomes nearly parallel to view direction.
        let up = if self.pitch.abs() > 1.4 {
            if self.pitch > 0.0 { glam::Vec3::NEG_Z } else { glam::Vec3::Z }
        } else {
            glam::Vec3::Y
        };
        let view = glam::Mat4::look_at_rh(eye, glam::Vec3::ZERO, up);
        // Dynamic near/far planes: scale with distance to maintain z-buffer precision.
        // At distance 5, near=0.1 far=500. At distance 5000, near=100 far=50000.
        let near = (self.distance * 0.02).clamp(0.01, 100.0);
        let far = (self.distance * 100.0).clamp(500.0, 1_000_000.0);
        let proj = match self.projection {
            ProjectionMode::Perspective => {
                glam::Mat4::perspective_rh(
                    std::f32::consts::FRAC_PI_4, // 45° FOV
                    aspect,
                    near,
                    far,
                )
            }
            ProjectionMode::Orthographic => {
                // Ortho half-size scales with distance so scroll-zoom works naturally.
                // At default distance 5.196, half_h ≈ 2.16 — similar visual coverage.
                let half_h = self.distance * ORTHO_SCALE;
                let half_w = half_h * aspect;
                glam::Mat4::orthographic_rh(-half_w, half_w, -half_h, half_h, near, far)
            }
        };
        proj * view
    }
}

/// Scale factor mapping camera distance to orthographic half-size.
/// Chosen so switching perspective↔ortho at default distance preserves
/// roughly the same apparent object size: tan(fov/2) = tan(22.5°) ≈ 0.4142.
const ORTHO_SCALE: f32 = 0.4142;

// --- Camera presets ---
// P1: Conventional yaw/pitch/distance. See BABYSTEPS "P1 → P3 Camera Migration Note"
// for the future ABCD 4-vector triplet approach (RATIONALE §10).

/// asin(1/√3) — the elevation angle for cube diagonal directions (Quadray axes).
/// All four ABCD basis directions have this same |pitch| from the XZ plane.
const QUADRAY_ELEVATION: f32 = 0.6155;

/// Default camera distance (√27 ≈ 5.196, the (3,3,3) radius).
const DEFAULT_DISTANCE: f32 = 5.196;

/// Camera preset — stored yaw/pitch/distance for on-axis views.
///
/// P3 migration: Each preset will become a stored ABCD 4-vector triplet
/// (p_x, p_y, p_depth) computed from N^T * Basis^T * u_camera.
/// The §10 ABCD coefficients are noted in comments for each preset.
pub struct CameraPreset {
    pub name: &'static str,
    pub yaw: f32,
    pub pitch: f32,
    pub distance: f32,
    pub color: [u8; 3],  // RGB for UI button text
}

/// 7 standard camera presets: 3 XYZ axis views + 4 ABCD Quadray axis views.
///
/// XYZ views look from Cartesian axis directions.
/// ABCD views look from Quadray basis directions (cube diagonal directions).
///
/// Both groups are first-class — no hierarchy, no branching.
pub const PRESETS_XYZ: &[CameraPreset] = &[
    // Right (+X axis): eye at (d, 0, 0), looking along -X
    // §10 p_depth: N^T * Basis^T * (1,0,0) = ABCD coefficients for X-axis view
    CameraPreset {
        name: "Right",
        yaw: 0.0,
        pitch: 0.0,
        distance: DEFAULT_DISTANCE,
        color: [255, 0, 0], // X = Red
    },
    // Front (+Z axis): eye at (0, 0, d), looking along -Z
    // §10 p_depth: N^T * Basis^T * (0,0,1) = ABCD coefficients for Z-axis view
    CameraPreset {
        name: "Front",
        yaw: std::f32::consts::FRAC_PI_2,
        pitch: 0.0,
        distance: DEFAULT_DISTANCE,
        color: [0, 102, 255], // Z = Blue
    },
    // Top (+Y axis): eye at (0, d, 0), looking down
    // §10 p_depth: N^T * Basis^T * (0,1,0) = ABCD coefficients for Y-axis view
    CameraPreset {
        name: "Top",
        yaw: 0.0,
        pitch: std::f32::consts::FRAC_PI_2,
        distance: DEFAULT_DISTANCE,
        color: [0, 204, 51], // Y = Green
    },
];

pub const PRESETS_ABCD: &[CameraPreset] = &[
    // A (Yellow): Cartesian (-1,-1,+1)/√3 → yaw = 3π/4, pitch = -asin(1/√3)
    // §10 p_depth: N^T * Basis^T * (-1,-1,+1)/√3 — Quadray A-axis has simplest ABCD form
    CameraPreset {
        name: "A",
        yaw: 2.3562,  // 3π/4
        pitch: -QUADRAY_ELEVATION,
        distance: DEFAULT_DISTANCE,
        color: [255, 255, 0], // A = Yellow
    },
    // B (Red): Cartesian (+1,+1,+1)/√3 → yaw = π/4, pitch = asin(1/√3)
    // §10 p_depth: N^T * Basis^T * (+1,+1,+1)/√3 — the default view direction
    CameraPreset {
        name: "B",
        yaw: std::f32::consts::FRAC_PI_4,
        pitch: QUADRAY_ELEVATION,
        distance: DEFAULT_DISTANCE,
        color: [255, 0, 0], // B = Red
    },
    // C (Blue): Cartesian (-1,+1,-1)/√3 → yaw = -3π/4, pitch = asin(1/√3)
    // §10 p_depth: N^T * Basis^T * (-1,+1,-1)/√3
    CameraPreset {
        name: "C",
        yaw: -2.3562,  // -3π/4
        pitch: QUADRAY_ELEVATION,
        distance: DEFAULT_DISTANCE,
        color: [0, 102, 255], // C = Blue
    },
    // D (Green): Cartesian (+1,-1,-1)/√3 → yaw = -π/4, pitch = -asin(1/√3)
    // §10 p_depth: N^T * Basis^T * (+1,-1,-1)/√3
    CameraPreset {
        name: "D",
        yaw: -std::f32::consts::FRAC_PI_4,
        pitch: -QUADRAY_ELEVATION,
        distance: DEFAULT_DISTANCE,
        color: [0, 204, 51], // D = Green
    },
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_is_b_axis() {
        let cam = OrbitCamera::default();
        assert!((cam.yaw - std::f32::consts::FRAC_PI_4).abs() < 0.01);
        assert!((cam.pitch - QUADRAY_ELEVATION).abs() < 0.01);
    }

    #[test]
    fn apply_preset_sets_values() {
        let mut cam = OrbitCamera::default();
        cam.apply_preset(&PRESETS_XYZ[2]); // Top
        assert!((cam.pitch - std::f32::consts::FRAC_PI_2).abs() < 0.001);
        assert!(cam.yaw.abs() < 0.001);
    }

    #[test]
    fn top_view_produces_valid_matrix() {
        let mut cam = OrbitCamera::default();
        cam.apply_preset(&PRESETS_XYZ[2]); // Top
        let vp = cam.view_proj(1.0);
        // Matrix should not contain NaN (gimbal lock would cause NaN)
        for col in 0..4 {
            for row in 0..4 {
                assert!(!vp.col(col)[row].is_nan(), "NaN in view_proj at [{},{}]", row, col);
            }
        }
    }

    #[test]
    fn presets_have_correct_count() {
        assert_eq!(PRESETS_XYZ.len(), 3);
        assert_eq!(PRESETS_ABCD.len(), 4);
    }

    #[test]
    fn ortho_produces_valid_matrix() {
        let mut cam = OrbitCamera::default();
        cam.projection = ProjectionMode::Orthographic;
        let vp = cam.view_proj(1.0);
        for col in 0..4 {
            for row in 0..4 {
                assert!(!vp.col(col)[row].is_nan(), "NaN in ortho view_proj at [{},{}]", row, col);
            }
        }
    }

    #[test]
    fn centre_adjusts_distance() {
        let mut cam = OrbitCamera::default();
        let original = cam.distance;
        cam.centre(5.0, 1.5);
        assert!((cam.distance - original).abs() > 0.01, "centre should change distance");
        assert!(cam.distance > 5.0, "distance should be larger than bounding radius");
    }

    #[test]
    fn centre_narrow_viewport_uses_horizontal() {
        // With aspect < 1 (tall narrow window), horizontal fitting should dominate
        let mut cam = OrbitCamera::default();
        cam.centre(3.0, 1.5); // wide viewport
        let dist_wide = cam.distance;
        cam.centre(3.0, 0.5); // narrow viewport
        let dist_narrow = cam.distance;
        assert!(dist_narrow > dist_wide, "narrow viewport should need more distance");
    }

    #[test]
    fn quadray_presets_symmetric_pitch() {
        // A and D have negative pitch, B and C have positive pitch
        assert!(PRESETS_ABCD[0].pitch < 0.0, "A pitch should be negative");
        assert!(PRESETS_ABCD[1].pitch > 0.0, "B pitch should be positive");
        assert!(PRESETS_ABCD[2].pitch > 0.0, "C pitch should be positive");
        assert!(PRESETS_ABCD[3].pitch < 0.0, "D pitch should be negative");
    }
}
