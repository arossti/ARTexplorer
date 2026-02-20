use crate::app_state::{AppState, ScaleDriver};
use crate::camera::{OrbitCamera, ProjectionMode, PRESETS_XYZ, PRESETS_ABCD};

/// Apply dark theme styling to egui context.
pub fn configure_theme(ctx: &egui::Context) {
    let mut visuals = egui::Visuals::dark();
    visuals.panel_fill = egui::Color32::from_rgb(20, 20, 25);
    visuals.window_fill = egui::Color32::from_rgb(25, 25, 30);
    ctx.set_visuals(visuals);
}

/// Draw the egui side panel with polyhedra controls, scale sliders, camera presets, and info.
/// Updates `state.panel_width` with the actual sidebar width (logical points) each frame.
pub fn draw_ui(ctx: &egui::Context, state: &mut AppState, camera: &mut OrbitCamera) {
    let panel_response = egui::SidePanel::right("control_panel")
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

            // --- Basis arrow toggles ---
            egui::CollapsingHeader::new("Basis Arrows")
                .default_open(true)
                .show(ui, |ui| {
                    let mut changed = false;
                    changed |= ui
                        .checkbox(&mut state.show_quadray_basis, "Quadray ABCD")
                        .changed();
                    changed |= ui
                        .checkbox(&mut state.show_cartesian_basis, "Cartesian XYZ")
                        .changed();
                    if changed {
                        state.geometry_dirty = true;
                    }
                });

            // --- Cartesian Grid ---
            egui::CollapsingHeader::new("Cartesian Grid")
                .default_open(false)
                .show(ui, |ui| {
                    let mut changed = false;
                    changed |= ui
                        .checkbox(&mut state.show_cartesian_grids, "Enable")
                        .changed();
                    ui.horizontal(|ui| {
                        changed |= ui.checkbox(
                            &mut state.show_grid_xy,
                            egui::RichText::new("XY").color(egui::Color32::YELLOW),
                        ).changed();
                        changed |= ui.checkbox(
                            &mut state.show_grid_xz,
                            egui::RichText::new("XZ").color(egui::Color32::from_rgb(255, 0, 255)),
                        ).changed();
                        changed |= ui.checkbox(
                            &mut state.show_grid_yz,
                            egui::RichText::new("YZ").color(egui::Color32::from_rgb(0, 255, 255)),
                        ).changed();
                    });
                    let div_response = ui.add(
                        egui::Slider::new(&mut state.cartesian_divisions, 10..=100)
                            .step_by(10.0)
                            .text("Divisions")
                    );
                    if div_response.changed() {
                        changed = true;
                    }
                    if changed {
                        state.geometry_dirty = true;
                    }
                });

            // --- IVM Central Angle Grid ---
            egui::CollapsingHeader::new("IVM Grid")
                .default_open(false)
                .show(ui, |ui| {
                    let mut changed = false;
                    changed |= ui
                        .checkbox(&mut state.show_ivm_grids, "Enable")
                        .changed();
                    ui.horizontal(|ui| {
                        changed |= ui.checkbox(
                            &mut state.show_grid_ab,
                            egui::RichText::new("AB").color(egui::Color32::from_rgb(255, 170, 0)),
                        ).changed();
                        changed |= ui.checkbox(
                            &mut state.show_grid_ac,
                            egui::RichText::new("AC").color(egui::Color32::from_rgb(255, 0, 255)),
                        ).changed();
                        changed |= ui.checkbox(
                            &mut state.show_grid_ad,
                            egui::RichText::new("AD").color(egui::Color32::from_rgb(170, 255, 0)),
                        ).changed();
                    });
                    ui.horizontal(|ui| {
                        changed |= ui.checkbox(
                            &mut state.show_grid_bc,
                            egui::RichText::new("BC").color(egui::Color32::from_rgb(0, 255, 255)),
                        ).changed();
                        changed |= ui.checkbox(
                            &mut state.show_grid_bd,
                            egui::RichText::new("BD").color(egui::Color32::from_rgb(170, 170, 255)),
                        ).changed();
                        changed |= ui.checkbox(
                            &mut state.show_grid_cd,
                            egui::RichText::new("CD").color(egui::Color32::from_rgb(255, 128, 128)),
                        ).changed();
                    });
                    let tess_response = ui.add(
                        egui::Slider::new(&mut state.ivm_tessellations, 12..=144)
                            .step_by(12.0)
                            .text("Tessellations")
                    );
                    if tess_response.changed() {
                        changed = true;
                    }
                    if changed {
                        state.geometry_dirty = true;
                    }
                });

            // --- Camera ---
            // Projection, presets, and centre — all first-class, no hierarchy.
            // P3 migration: Replace yaw/pitch with ABCD 4-vector triplets (§10).
            egui::CollapsingHeader::new("Camera")
                .default_open(true)
                .show(ui, |ui| {
                    // Projection mode toggle + Centre
                    ui.horizontal(|ui| {
                        let persp_text = if camera.projection == ProjectionMode::Perspective {
                            egui::RichText::new("Perspective").strong()
                        } else {
                            egui::RichText::new("Perspective")
                        };
                        if ui.selectable_label(
                            camera.projection == ProjectionMode::Perspective,
                            persp_text,
                        ).clicked() {
                            camera.projection = ProjectionMode::Perspective;
                        }

                        let ortho_text = if camera.projection == ProjectionMode::Orthographic {
                            egui::RichText::new("Ortho").strong()
                        } else {
                            egui::RichText::new("Ortho")
                        };
                        if ui.selectable_label(
                            camera.projection == ProjectionMode::Orthographic,
                            ortho_text,
                        ).clicked() {
                            camera.projection = ProjectionMode::Orthographic;
                        }

                        ui.separator();
                        if ui.button("Centre").clicked() {
                            // Compute effective viewport aspect (screen minus this sidebar)
                            let screen = ui.ctx().input(|i| i.viewport().inner_rect
                                .unwrap_or(egui::Rect::from_min_size(egui::Pos2::ZERO, egui::vec2(1280.0, 720.0))));
                            let panel_w = ui.min_rect().width();
                            let viewport_w = (screen.width() - panel_w).max(100.0);
                            let viewport_aspect = viewport_w / screen.height();
                            camera.centre(state.bounding_radius, viewport_aspect);
                        }
                    });

                    // XYZ axis views
                    ui.horizontal(|ui| {
                        ui.label(egui::RichText::new("XYZ").small().weak());
                        for preset in PRESETS_XYZ {
                            let color = egui::Color32::from_rgb(
                                preset.color[0], preset.color[1], preset.color[2],
                            );
                            if ui.button(egui::RichText::new(preset.name).color(color)).clicked() {
                                camera.apply_preset(preset);
                            }
                        }
                    });
                    // ABCD Quadray axis views
                    ui.horizontal(|ui| {
                        ui.label(egui::RichText::new("ABCD").small().weak());
                        for preset in PRESETS_ABCD {
                            let color = egui::Color32::from_rgb(
                                preset.color[0], preset.color[1], preset.color[2],
                            );
                            if ui.button(egui::RichText::new(preset.name).color(color)).clicked() {
                                camera.apply_preset(preset);
                            }
                        }
                    });
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

    // Store actual panel width (logical points) for viewport calculation in render()
    state.panel_width = panel_response.response.rect.width();
}
