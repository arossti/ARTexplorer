//! animation.rs — Camera slerp, view transitions, dissolve, stepped tick, SVG export.
//!
//! Junior Phase: J7
//! Status: Stub — no functionality implemented yet.
//! Port from: modules/rt-animate.js
//!
//! Core math:
//!   animate_to_view: slerp camera direction + lerp distance + smoothstep easing
//!   Smoothstep: t_eased = t * (3 - 2*t)  (no sin/cos needed — pure polynomial)
//!   Slerp: angle-based spherical interpolation (robust for all angular separations)
//!   Dissolve: per-geometry opacity interpolation via render callbacks
//!   Stepped tick: integer sliders snap at even rawT intervals during animation

// TODO: AnimationState enum (Idle, Running { progress: f32, view_id, duration_ms })
// TODO: AnimationEngine struct (current, queue)
// TODO: animate_to_view(view_id, duration_ms) — promise-style via state machine
// TODO: smoothstep(t: f32) -> f32   — t * (3 - 2*t)
// TODO: slerp_camera(from, to, t)  — spherical lerp on camera direction
// TODO: setup_dissolve(from_state, to_state) — opacity delta per geometry group
// TODO: stepped_tick(from, to, raw_t) — integer slider values snap per even intervals
// TODO: export_batch_svg(views, renderer) — one SVG per view (wgpu readback)

#[cfg(test)]
mod tests {
    // TODO: smoothstep boundary values (t=0→0, t=1→1, t=0.5→0.5)
    // TODO: tests land with full implementation
}
