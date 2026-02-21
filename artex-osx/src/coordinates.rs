//! Coordinate Display Bar — two-row egui panel at the bottom of the window.
//!
//! Row 1 (Position): live cursor XYZ + ABCD, Absolute/Relative/Group mode buttons, Scale stub.
//! Row 2 (Rotation): stubbed degrees + spread for XYZ and ABCD, Normalize toggle, selection.
//!
//! **Must be called BEFORE `draw_ui()`** in the egui frame so the bottom panel is reserved
//! before the right side panel fills the remaining space.
//!
//! ABCD display modes (controlled by `state.coord_normalize`):
//!   OFF (default): zero-sum form — sum=0, negatives permitted — native "pure Quadray"
//!   ON:            canonical form — min component = 0, all values ≥ 0 — matches JS app

use crate::app_state::{AppState, CoordMode};

// ─── Color palette ────────────────────────────────────────────────────────────
// XYZ axis colors (standard Cartesian convention)
const X_RED:   egui::Color32 = egui::Color32::from_rgb(220,  60,  60);
const Y_GREEN: egui::Color32 = egui::Color32::from_rgb( 60, 185,  60);
const Z_BLUE:  egui::Color32 = egui::Color32::from_rgb( 60, 130, 230);
// ABCD basis colors (ABCD convention §8.1)
const A_YELLOW: egui::Color32 = egui::Color32::from_rgb(255, 210,   0);
const B_RED:    egui::Color32 = egui::Color32::from_rgb(220,  60,  60);
const C_BLUE:   egui::Color32 = egui::Color32::from_rgb( 60, 130, 230);
const D_GREEN:  egui::Color32 = egui::Color32::from_rgb( 60, 185,  60);
// UI chrome
const DIM:          egui::Color32 = egui::Color32::from_rgb( 90,  90, 100);
const ON_GRID:      egui::Color32 = egui::Color32::from_rgb( 60, 200,  80);
const FIELD_BG:     egui::Color32 = egui::Color32::from_rgb( 18,  18,  26);
const FIELD_STROKE: egui::Color32 = egui::Color32::from_rgb( 50,  50,  65);

// ─── Font loading ─────────────────────────────────────────────────────────────

/// Attempt to load macOS Menlo (which has slashed zeros) as the primary monospace font.
///
/// Menlo ships with every macOS since 10.6 — it's essentially always present.
/// Falls back silently to egui's default fonts if the file is missing (sandboxed builds,
/// non-macOS platforms, etc.).
///
/// Call once immediately after `egui::Context::default()`, before the first frame.
pub fn try_load_menlo_font(ctx: &egui::Context) {
    if let Ok(data) = std::fs::read("/System/Library/Fonts/Menlo.ttc") {
        let mut fonts = egui::FontDefinitions::default();
        fonts.font_data.insert(
            "Menlo".to_owned(),
            egui::FontData::from_owned(data).into(),
        );
        // Prepend Menlo so it's tried first for all monospace text
        if let Some(mono) = fonts.families.get_mut(&egui::FontFamily::Monospace) {
            mono.insert(0, "Menlo".to_owned());
        }
        ctx.set_fonts(fonts);
    }
    // Silently ignore — egui default fonts remain if Menlo is unavailable
}

// ─── Field widget ─────────────────────────────────────────────────────────────

/// Draw a styled "input field" box displaying a static value.
///
/// Renders a bordered, filled rectangle containing monospace text — visually matches
/// the editable input boxes from the JS coordinate bar. Not yet wired for user input.
///
/// `min_width`: controls field width.
///   - Live coordinate values: 54.0
///   - Degree stub: 38.0
///   - Spread stub: 48.0
fn coord_field(ui: &mut egui::Ui, text: &str, color: egui::Color32, min_width: f32) {
    egui::Frame::new()
        .stroke(egui::Stroke::new(1.0, FIELD_STROKE))
        .fill(FIELD_BG)
        .inner_margin(egui::Margin::symmetric(4, 1))
        .show(ui, |ui| {
            ui.set_min_width(min_width);
            ui.monospace(egui::RichText::new(text).color(color).size(11.0));
        });
}

// ─── Main draw function ───────────────────────────────────────────────────────

/// Draw the two-row coordinate bar at the bottom of the window.
///
/// **Must be called BEFORE `draw_ui()`** — egui panel ordering ensures bottom space
/// is reserved before the side panel fills the remaining area.
///
/// Stores actual height in `state.coord_bar_height` each frame so main.rs can
/// subtract it from the 3D viewport height.
pub fn draw_coord_bar(ctx: &egui::Context, state: &mut AppState) {
    let bar = egui::TopBottomPanel::bottom("coord_bar")
        .exact_height(52.0)
        .frame(
            egui::Frame::new()
                .fill(egui::Color32::from_rgb(10, 10, 16))
                .inner_margin(egui::Margin::symmetric(8, 2)),
        )
        .show(ctx, |ui| {
            ui.spacing_mut().item_spacing = egui::vec2(3.0, 2.0);

            // Row 1: Position (live cursor tracking)
            // Note: horizontal() not horizontal_centered() — the latter consumes ALL available
            // vertical space, leaving 0px for Row 2. horizontal() takes only natural row height.
            ui.horizontal(|ui| {
                draw_position_row(ui, state);
            });

            // Row 2: Rotation (stubbed — degrees + spread, all 0)
            ui.horizontal(|ui| {
                draw_rotation_row(ui, state);
            });
        });

    state.coord_bar_height = bar.response.rect.height();
}

// ─── Row 1: Position ─────────────────────────────────────────────────────────

fn draw_position_row(ui: &mut egui::Ui, state: &mut AppState) {
    use egui::RichText;

    // Position icon (↔ = move / translate)
    ui.label(RichText::new("↔").color(DIM).size(11.0));

    // XYZ position — live cursor values in Cartesian space.
    // Always render all three labeled fields to prevent layout collapse when off-geometry.
    ui.label(RichText::new("XYZ").color(DIM).size(10.0));
    for (label, val_opt, color) in [
        ("x", state.cursor_world_xyz.map(|[x, _, _]| x as f64), X_RED),
        ("y", state.cursor_world_xyz.map(|[_, y, _]| y as f64), Y_GREEN),
        ("z", state.cursor_world_xyz.map(|[_, _, z]| z as f64), Z_BLUE),
    ] {
        ui.label(RichText::new(label).color(color).size(10.0));
        match val_opt {
            Some(v) => coord_field(ui, &format!("{:+.3}", v), color, 54.0),
            None    => coord_field(ui, "  —  ", DIM, 54.0),
        }
    }

    ui.separator();

    // ABCD position — live cursor values in Quadray space.
    // Normalize OFF (default): zero-sum form (sum=0, negatives permitted)
    // Normalize ON: canonical form (min component = 0, all ≥ 0) — matches JS app
    // Always render all four labeled fields to prevent layout collapse when off-geometry.
    ui.label(RichText::new("ABCD").color(DIM).size(10.0));

    // Compute display values: Some([a,b,c,d]) when on-geometry, None when off.
    let abcd_display: Option<[f64; 4]> = state.cursor_abcd.map(|[a, b, c, d]| {
        if state.coord_normalize {
            let min = a.min(b).min(c).min(d);
            [a - min, b - min, c - min, d - min]
        } else {
            [a, b, c, d]
        }
    });

    for (i, label, color) in [
        (0usize, "A", A_YELLOW),
        (1,      "B", B_RED),
        (2,      "C", C_BLUE),
        (3,      "D", D_GREEN),
    ] {
        ui.label(RichText::new(label).color(color).size(10.0));
        match abcd_display {
            Some(vals) => coord_field(ui, &format!("{:+.3}", vals[i]), color, 54.0),
            None       => coord_field(ui, "  —  ", DIM, 54.0),
        }
    }

    // On-grid indicator: all components within ε of integers → IVM grid vertex
    if let Some(vals) = abcd_display {
        let eps = 0.02_f64;
        if vals.iter().all(|v| v.fract().abs() < eps) {
            ui.label(RichText::new("●").color(ON_GRID).size(10.0));
            ui.label(RichText::new("on grid").color(ON_GRID).size(10.0));
        }
    }

    // Right side: mode buttons + scale (right-to-left layout)
    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
        ui.spacing_mut().item_spacing.x = 3.0;

        // Scale — shows frequency as proxy until per-instance scale is implemented
        coord_field(ui, &format!("{:.4}", state.frequency), DIM, 52.0);
        ui.label(RichText::new("Scale").color(DIM).size(10.0));

        ui.separator();

        // Coordinate mode buttons — right-to-left order: Group | Relative | Absolute
        if ui
            .selectable_label(
                state.coord_mode == CoordMode::GroupCentre,
                RichText::new("Group").size(10.0),
            )
            .clicked()
        {
            state.coord_mode = CoordMode::GroupCentre;
        }

        if ui
            .selectable_label(
                state.coord_mode == CoordMode::Relative,
                RichText::new("Relative").size(10.0),
            )
            .clicked()
        {
            state.coord_mode = CoordMode::Relative;
        }

        if ui
            .selectable_label(
                state.coord_mode == CoordMode::Absolute,
                RichText::new("Absolute").size(10.0),
            )
            .clicked()
        {
            state.coord_mode = CoordMode::Absolute;
        }
    });
}

// ─── Row 2: Rotation (stub) ──────────────────────────────────────────────────

fn draw_rotation_row(ui: &mut egui::Ui, state: &mut AppState) {
    use egui::RichText;

    // Rotation icon (↻ = rotate)
    ui.label(RichText::new("↻").color(DIM).size(11.0));

    // XYZ rotation — degrees + spread (sin²θ), all stubbed to zero
    // Future: populate from per-instance StateManager rotation data
    ui.label(RichText::new("XYZ").color(DIM).size(10.0));
    for (label, color) in [("x", X_RED), ("y", Y_GREEN), ("z", Z_BLUE)] {
        ui.label(RichText::new(label).color(color).size(10.0));
        coord_field(ui, "0.00", DIM, 38.0);   // degrees stub
        coord_field(ui, "0.0000", DIM, 48.0); // spread (sin²θ) stub
    }

    ui.separator();

    // ABCD rotation — degrees + spread, all stubbed to zero
    ui.label(RichText::new("ABCD").color(DIM).size(10.0));
    for (label, color) in [("A", A_YELLOW), ("B", B_RED), ("C", C_BLUE), ("D", D_GREEN)] {
        ui.label(RichText::new(label).color(color).size(10.0));
        coord_field(ui, "0.00", DIM, 38.0);
        coord_field(ui, "0.0000", DIM, 48.0);
    }

    // Right side: Normalize toggle + selection (right-to-left)
    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
        ui.spacing_mut().item_spacing.x = 3.0;

        // Selection stub — always "no selection" in P1 (no instances yet)
        if let Some(name) = state.selected_polyhedron {
            ui.label(RichText::new(format!("[{}]", name)).color(DIM).size(10.0));
        } else {
            ui.label(RichText::new("no selection").color(DIM).size(10.0));
        }

        ui.separator();

        // Normalize toggle:
        //   OFF (default): display zero-sum ABCD — native "pure Quadray", negatives allowed
        //   ON: display canonical ABCD — all components ≥ 0, matches JS app behavior
        // See: artex-osx/docs/ARTEX-NORMALIZER.md for normalizer API design
        let norm_color = if state.coord_normalize { ON_GRID } else { DIM };
        if ui
            .selectable_label(
                state.coord_normalize,
                RichText::new("Normalize").color(norm_color).size(10.0),
            )
            .clicked()
        {
            state.coord_normalize = !state.coord_normalize;
        }
    });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use crate::rt_math::normalizer::xyz_to_quadray_raw;

    const EPS: f64 = 1e-10;

    /// Normalizing [a, b, c, d] by min-shift must produce all non-negative components.
    #[test]
    fn normalize_min_shift_produces_non_negative() {
        // xyz = [1, 1, 1] → zero-sum: a = (-1-1+1)/4 = -0.25, b = (1+1+1)/4 = 0.75
        let raw = xyz_to_quadray_raw([1.0, 1.0, 1.0]);
        // Zero-sum: sum must be 0
        let sum: f64 = raw.iter().sum();
        assert!(sum.abs() < EPS, "zero-sum: {}", sum);
        // Some components are negative (zero-sum without normalization)
        assert!(raw.iter().any(|&v| v < 0.0), "zero-sum should have negatives: {:?}", raw);

        // Canonical: subtract minimum → all ≥ 0
        let min = raw.iter().cloned().fold(f64::INFINITY, f64::min);
        let canonical: Vec<f64> = raw.iter().map(|v| v - min).collect();
        assert!(
            canonical.iter().all(|&v| v >= -EPS),
            "canonical must be non-negative: {:?}",
            canonical
        );
        // The maximum should be 1.0 (B = 0.75 - (-0.25) = 1.0)
        let max = canonical.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        assert!((max - 1.0).abs() < EPS, "canonical max should be 1.0: {}", max);
    }

    /// Zero-sum form of the A basis vertex should have both positive and negative components.
    #[test]
    fn zero_sum_a_vertex_has_negatives() {
        // A basis in XYZ: (-1, -1, +1)
        let raw = xyz_to_quadray_raw([-1.0, -1.0, 1.0]);
        let sum: f64 = raw.iter().sum();
        assert!(sum.abs() < EPS, "zero-sum constraint: {}", sum);
        assert!(
            raw.iter().any(|&v| v < 0.0),
            "zero-sum A should have negatives: {:?}",
            raw
        );
    }

    /// Canonical form of A should recover [1, 0, 0, 0] (all non-negative, on-grid).
    #[test]
    fn canonical_a_vertex_is_on_grid() {
        let raw = xyz_to_quadray_raw([-1.0, -1.0, 1.0]);
        let min = raw.iter().cloned().fold(f64::INFINITY, f64::min);
        let canonical: Vec<f64> = raw.iter().map(|v| v - min).collect();
        // On-grid check: all fract() < 0.02
        let eps_grid = 0.02_f64;
        assert!(
            canonical.iter().all(|v| v.fract().abs() < eps_grid),
            "canonical A must be on-grid: {:?}",
            canonical
        );
    }

    /// Zero-sum form of the origin should be all zeros (also on-grid).
    #[test]
    fn zero_sum_origin_is_zero() {
        let raw = xyz_to_quadray_raw([0.0, 0.0, 0.0]);
        assert!(raw.iter().all(|&v| v.abs() < EPS), "origin should be [0,0,0,0]: {:?}", raw);
    }
}
