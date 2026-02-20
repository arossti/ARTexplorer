/// Orbit camera — spherical coordinates around the origin.
///
/// Left-click drag rotates (yaw/pitch), scroll wheel zooms.
/// Math.X justified: spherical→Cartesian and look_at are rendering-boundary math.
pub struct OrbitCamera {
    pub yaw: f32,       // radians, horizontal rotation
    pub pitch: f32,     // radians, vertical rotation (clamped)
    pub distance: f32,  // distance from origin
    dragging: bool,
    last_cursor: Option<(f64, f64)>,
}

impl Default for OrbitCamera {
    fn default() -> Self {
        // Default: looking from (3,3,3) equivalent — atan2(3,3) = π/4, asin(3/√27)
        Self {
            yaw: std::f32::consts::FRAC_PI_4,
            pitch: 0.6154,  // ~35.26° = arctan(1/√2), the (3,3,3) elevation
            distance: 5.196, // √27 ≈ 5.196, matches (3,3,3) radius
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
                // Clamp pitch to avoid gimbal lock
                self.pitch = self.pitch.clamp(-1.5, 1.5);
            }
            self.last_cursor = Some((x, y));
        }
    }

    pub fn on_scroll(&mut self, delta: f32) {
        self.distance -= delta * 0.5;
        self.distance = self.distance.clamp(1.0, 30.0);
    }

    /// Compute the view-projection matrix for this camera.
    /// Math.X justified: sin/cos/look_at/perspective are rendering-boundary math.
    pub fn view_proj(&self, aspect: f32) -> glam::Mat4 {
        let eye = glam::Vec3::new(
            self.distance * self.pitch.cos() * self.yaw.cos(),
            self.distance * self.pitch.sin(),
            self.distance * self.pitch.cos() * self.yaw.sin(),
        );
        let view = glam::Mat4::look_at_rh(eye, glam::Vec3::ZERO, glam::Vec3::Y);
        let proj = glam::Mat4::perspective_rh(
            std::f32::consts::FRAC_PI_4,
            aspect,
            0.1,
            100.0,
        );
        proj * view
    }
}
