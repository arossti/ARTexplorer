//! controls.rs — Gumball interactive transform handles (Move / Scale / Rotate).
//!
//! Junior Phase: J2
//! Status: Stub — no functionality implemented yet.
//! Port from: modules/rt-controls.js
//!
//! Design notes:
//!   Translate handles: 3 axis arrows — reuses basis_arrows.rs geometry style.
//!   Scale handles: 3 axis boxes + 1 uniform corner sphere.
//!   Rotate handles: 3 arc rings — built from rt_math/polygon.rs N-gon circles (RT-pure).
//!   Mode toggle: Move / Scale / Rotate — wires to coordinate bar Row 1 icons.
//!   Handle drag: mouse delta → ABCD-space transform update (no classical trig).

// TODO: GumballMode enum (Translate, Scale, Rotate)
// TODO: GumballHandle struct (axis, kind, mesh geometry)
// TODO: build_translate_handles() -> GumballGeometry
// TODO: build_scale_handles() -> GumballGeometry
// TODO: build_rotate_handles() -> GumballGeometry  (polygon arcs, RT-pure)
// TODO: hit_test_handle(ray) -> Option<GumballHandle>
// TODO: apply_drag(handle, screen_delta, camera) -> Transform delta

#[cfg(test)]
mod tests {
    // TODO: tests land with implementation
}
