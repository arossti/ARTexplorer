//! demos.rs — Educational math demo sub-windows (Quadrance, Spread, Weierstrass).
//!
//! Junior Phase: J5
//! Status: Stub — no functionality implemented yet.
//! Port from: demos/rt-quadrance-demo.js, rt-cross-demo.js, rt-weierstrass-demo.js
//!
//! Each demo opens as an egui sub-window (Window::new("...").show()).
//! Demos are RT-pure educational displays — no THREE.js coupling.

// TODO: DemoState enum (None, Quadrance, Spread, Weierstrass, RtVsClassical)
// TODO: draw_quadrance_demo(ui)    — Q = d², Babylonian Plimpton 322 connection
// TODO: draw_spread_demo(ui)       — s = sin²θ, rational spread table for common angles
// TODO: draw_weierstrass_demo(ui)  — t → (1-t²)/(1+t²), 2t/(1+t²) rational circle
// TODO: draw_rt_vs_classical(ui)   — side-by-side comparison panel

#[cfg(test)]
mod tests {
    // TODO: tests land with implementation
}
