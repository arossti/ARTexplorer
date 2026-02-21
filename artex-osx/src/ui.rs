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
                    ui.separator();
                    changed |= ui
                        .checkbox(&mut state.show_faces, "Show Faces")
                        .changed();
                    if state.show_faces {
                        let opacity_response = ui.add(
                            egui::Slider::new(&mut state.face_opacity, 0.0..=1.0)
                                .text("Face Opacity")
                                .custom_formatter(|v, _| format!("{:.2}", v))
                        );
                        if opacity_response.changed() {
                            changed = true;
                        }
                    }
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
                    let opacity_response = ui.add(
                        egui::Slider::new(&mut state.cartesian_grid_opacity, 0.0..=1.0)
                            .text("Opacity")
                            .custom_formatter(|v, _| format!("{:.2}", v))
                    );
                    if opacity_response.changed() {
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
                    let opacity_response = ui.add(
                        egui::Slider::new(&mut state.ivm_grid_opacity, 0.0..=1.0)
                            .text("Opacity")
                            .custom_formatter(|v, _| format!("{:.2}", v))
                    );
                    if opacity_response.changed() {
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

            // --- Scale: Frequency (Quadray-native) ---
            // Frequency F = s = Quadray scale factor. At integer F, polyhedra
            // vertices land on integer Quadray grid points.
            // cube_edge = 2F, tet_edge = 2√2·F (Rationality Reciprocity).
            egui::CollapsingHeader::new("Frequency")
                .default_open(true)
                .show(ui, |ui| {
                    let sqrt2 = std::f32::consts::SQRT_2;

                    // Frequency slider — integer snap, Quadray-native
                    let freq_response = ui.add(
                        egui::Slider::new(&mut state.frequency, -12.0..=12.0)
                            .step_by(1.0)
                            .text("F")
                            .custom_formatter(|v, _| {
                                let vi = v as i32;
                                if (v - vi as f64).abs() < 0.01 {
                                    format!("F{}", vi.abs())
                                } else {
                                    format!("F{:.1}", v.abs())
                                }
                            })
                    );
                    if freq_response.changed() {
                        state.scale_driver = ScaleDriver::Frequency;
                        state.cube_edge = 2.0 * state.frequency;
                        state.tet_edge = 2.0 * sqrt2 * state.frequency;
                        // Janus crossing: auto-adjust grid opacity for background contrast
                        let now_negative = state.frequency < 0.0;
                        if now_negative != state.janus_negative {
                            let opacity = if now_negative { 0.6 } else { 0.10 };
                            state.cartesian_grid_opacity = opacity;
                            state.ivm_grid_opacity = opacity;
                            state.janus_negative = now_negative;
                        }
                        state.geometry_dirty = true;
                    }

                    // Edge length readouts (derived from frequency)
                    let f = state.frequency;
                    let f_abs = f.abs();
                    let f_int = f_abs.round() as i32;
                    let is_integer = (f_abs - f_int as f32).abs() < 0.01;
                    let janus = if f < -0.01 { "  (Janus −)" } else { "" };

                    if is_integer && f_int > 0 {
                        ui.label(egui::RichText::new(
                            format!("Cube edge = {}    Tet edge = {}√2{}",
                                f_int * 2, f_int * 2, janus)
                        ).small());
                    } else if f_abs < 0.01 {
                        ui.label(egui::RichText::new("Origin (Janus point)").small());
                    } else {
                        ui.label(egui::RichText::new(
                            format!("Cube edge = {:.4}    Tet edge = {:.4}{}",
                                state.cube_edge, state.tet_edge, janus)
                        ).small());
                    }

                    ui.label(egui::RichText::new(
                        "Integer F → polyhedra on grid points"
                    ).small().weak());
                });

            // --- Scale: Edge Lengths (Cartesian observations) ---
            // Fine-grained edge control — generally off-grid.
            egui::CollapsingHeader::new("Edge Lengths")
                .default_open(false)
                .show(ui, |ui| {
                    let sqrt2 = std::f32::consts::SQRT_2;

                    // Tet edge slider
                    let tet_response = ui.add(
                        egui::Slider::new(&mut state.tet_edge, -34.0..=34.0)
                            .text("Tet edge")
                            .custom_formatter(|v, _| format!("{:.4}", v))
                    );
                    if tet_response.changed() {
                        state.scale_driver = ScaleDriver::TetEdge;
                        state.tet_edge = (state.tet_edge * 10.0).round() / 10.0;
                        state.cube_edge = state.tet_edge / sqrt2;
                        state.frequency = state.cube_edge / 2.0;
                        // Janus crossing: auto-adjust grid opacity for background contrast
                        let now_negative = state.frequency < 0.0;
                        if now_negative != state.janus_negative {
                            let opacity = if now_negative { 0.6 } else { 0.10 };
                            state.cartesian_grid_opacity = opacity;
                            state.ivm_grid_opacity = opacity;
                            state.janus_negative = now_negative;
                        }
                        state.geometry_dirty = true;
                    }

                    // Cube edge slider
                    let cube_response = ui.add(
                        egui::Slider::new(&mut state.cube_edge, -24.0..=24.0)
                            .text("Cube edge")
                            .custom_formatter(|v, _| format!("{:.4}", v))
                    );
                    if cube_response.changed() {
                        state.scale_driver = ScaleDriver::CubeEdge;
                        state.cube_edge = (state.cube_edge * 10.0).round() / 10.0;
                        state.tet_edge = state.cube_edge * sqrt2;
                        state.frequency = state.cube_edge / 2.0;
                        // Janus crossing: auto-adjust grid opacity for background contrast
                        let now_negative = state.frequency < 0.0;
                        if now_negative != state.janus_negative {
                            let opacity = if now_negative { 0.6 } else { 0.10 };
                            state.cartesian_grid_opacity = opacity;
                            state.ivm_grid_opacity = opacity;
                            state.janus_negative = now_negative;
                        }
                        state.geometry_dirty = true;
                    }

                    // Frequency readout (derived from edge)
                    let freq = state.frequency;
                    let freq_abs = freq.abs();
                    let freq_label = if (freq_abs - freq_abs.round()).abs() < 0.01 {
                        format!("F{}", freq_abs.round() as i32)
                    } else {
                        format!("F{:.2}", freq_abs)
                    };
                    let on_grid = if (freq_abs - freq_abs.round()).abs() < 0.01 {
                        " (on grid)"
                    } else {
                        " (off grid)"
                    };
                    ui.label(egui::RichText::new(
                        format!("Frequency: {}{}", freq_label, on_grid)
                    ).small().weak());
                });

            // --- Info ---
            egui::CollapsingHeader::new("Info")
                .default_open(true)
                .show(ui, |ui| {
                    ui.label(format!("FPS: {:.0}", state.fps));
                    ui.separator();
                    ui.label(format!("V: {}  E: {}  F: {}", state.vertex_count, state.edge_count, state.face_count));
                    ui.separator();
                    ui.label(egui::RichText::new("ABCD → WGSL → Metal").small().weak());
                    ui.label(egui::RichText::new("Drag to orbit | Scroll to zoom").small().weak());
                });
        });

    // Store actual panel width (logical points) for viewport calculation in render()
    state.panel_width = panel_response.response.rect.width();
}
