use crate::app_state::{AppState, ScaleDriver};

/// Apply dark theme styling to egui context.
pub fn configure_theme(ctx: &egui::Context) {
    let mut visuals = egui::Visuals::dark();
    visuals.panel_fill = egui::Color32::from_rgb(20, 20, 25);
    visuals.window_fill = egui::Color32::from_rgb(25, 25, 30);
    ctx.set_visuals(visuals);
}

/// Draw the egui side panel with polyhedra controls, scale sliders, and info.
pub fn draw_ui(ctx: &egui::Context, state: &mut AppState) {
    egui::SidePanel::right("control_panel")
        .default_width(220.0)
        .show(ctx, |ui| {
            ui.heading("ARTexplorer");
            ui.label(egui::RichText::new("Quadray/Metal + egui").small().weak());
            ui.separator();

            // --- Polyhedra toggles ---
            egui::CollapsingHeader::new("Polyhedra")
                .default_open(true)
                .show(ui, |ui| {
                    let mut changed = false;
                    changed |= ui
                        .checkbox(&mut state.show_tetrahedron, "Tetrahedron")
                        .changed();
                    changed |= ui
                        .checkbox(&mut state.show_dual_tetrahedron, "Dual Tetrahedron")
                        .changed();
                    changed |= ui
                        .checkbox(&mut state.show_cube, "Cube")
                        .changed();
                    changed |= ui
                        .checkbox(&mut state.show_octahedron, "Octahedron")
                        .changed();
                    changed |= ui
                        .checkbox(&mut state.show_icosahedron, "Icosahedron")
                        .changed();
                    changed |= ui
                        .checkbox(&mut state.show_dodecahedron, "Dodecahedron")
                        .changed();
                    if changed {
                        state.geometry_dirty = true;
                    }
                });

            // --- Scale sliders (Rationality Reciprocity) ---
            // ONE metric, TWO presentations. tet_edge = cube_edge * √2.
            // Whichever slider the user adjusts is the "driver" — it gets snapped
            // to 0.1 intervals (rational). The other shows the irrational conjugate.
            egui::CollapsingHeader::new("Scale")
                .default_open(true)
                .show(ui, |ui| {
                    let sqrt2 = std::f32::consts::SQRT_2;

                    // Tet edge slider
                    let tet_response = ui.add(
                        egui::Slider::new(&mut state.tet_edge, -5.0..=5.0)
                            .text("Tet edge")
                            .custom_formatter(|v, _| format!("{:.4}", v))
                    );
                    if tet_response.changed() {
                        state.scale_driver = ScaleDriver::TetEdge;
                        // Snap to 0.1 intervals
                        state.tet_edge = (state.tet_edge * 10.0).round() / 10.0;
                        // Compute irrational conjugate
                        state.cube_edge = state.tet_edge / sqrt2;
                        state.geometry_dirty = true;
                    }

                    // Cube edge slider
                    let cube_response = ui.add(
                        egui::Slider::new(&mut state.cube_edge, -3.6..=3.6)
                            .text("Cube edge")
                            .custom_formatter(|v, _| format!("{:.4}", v))
                    );
                    if cube_response.changed() {
                        state.scale_driver = ScaleDriver::CubeEdge;
                        // Snap to 0.1 intervals
                        state.cube_edge = (state.cube_edge * 10.0).round() / 10.0;
                        // Compute irrational conjugate
                        state.tet_edge = state.cube_edge * sqrt2;
                        state.geometry_dirty = true;
                    }

                    // Show which system is currently rational
                    let label = match state.scale_driver {
                        ScaleDriver::TetEdge => "Tet rational → Cube irrational",
                        ScaleDriver::CubeEdge => "Cube rational → Tet irrational",
                    };
                    ui.label(egui::RichText::new(label).small().weak());
                    ui.label(egui::RichText::new("Ratio: tet = cube × √2").small().weak());
                });

            // --- Info ---
            egui::CollapsingHeader::new("Info")
                .default_open(true)
                .show(ui, |ui| {
                    ui.label(format!("FPS: {:.0}", state.fps));
                    ui.separator();
                    ui.label(format!("Vertices: {}  Edges: {}", state.vertex_count, state.edge_count));
                    ui.separator();
                    ui.label(egui::RichText::new("ABCD → WGSL → Metal").small().weak());
                    ui.label(egui::RichText::new("Drag to orbit | Scroll to zoom").small().weak());
                });
        });
}
