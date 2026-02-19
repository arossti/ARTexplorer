use crate::app_state::AppState;

/// Apply dark theme styling to egui context.
pub fn configure_theme(ctx: &egui::Context) {
    let mut visuals = egui::Visuals::dark();
    visuals.panel_fill = egui::Color32::from_rgb(20, 20, 25);
    visuals.window_fill = egui::Color32::from_rgb(25, 25, 30);
    ctx.set_visuals(visuals);
}

/// Draw the egui side panel with polyhedra controls, scale sliders, and info.
pub fn draw_ui(ctx: &egui::Context, state: &mut AppState) {
    egui::SidePanel::left("control_panel")
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

            // --- Scale sliders ---
            egui::CollapsingHeader::new("Scale")
                .default_open(true)
                .show(ui, |ui| {
                    let mut changed = false;
                    changed |= ui
                        .add(egui::Slider::new(&mut state.tet_edge, 0.1..=5.0).text("Tet edge"))
                        .changed();
                    changed |= ui
                        .add(egui::Slider::new(&mut state.cube_edge, 0.1..=3.6).text("Cube edge"))
                        .changed();
                    if changed {
                        state.geometry_dirty = true;
                    }
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
