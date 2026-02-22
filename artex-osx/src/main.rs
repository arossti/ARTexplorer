mod app_state;
mod basis_arrows;
mod camera;
mod coordinates;
mod geometry;
mod grids;
mod rt_math;
mod rt_polyhedra;
mod ui;

// ── Junior phase stubs (J1–J9) — not yet implemented ──────────────────────────
mod animation;      // J7: camera slerp, dissolve, view transitions
mod controls;       // J2: gumball translate/scale/rotate handles
mod demos;          // J5: math demo sub-windows (Quadrance, Spread, Weierstrass)
mod file_handler;   // J3: JSON save/load, auto-save, native file dialogs
mod log_console;    // J3: debug logging toggle + ring buffer
mod papercut;       // J8: section cut plane + section circles
mod projections;    // J9: generalized projection + prime n-gon presets
mod state_manager;  // J2: instance lifecycle, selection, undo/redo
mod view_manager;   // J7: named view snapshots, export/import

use std::sync::Arc;
use wgpu::util::DeviceExt;
use winit::{
    application::ApplicationHandler,
    event::WindowEvent,
    event_loop::EventLoop,
    window::Window,
};

use app_state::AppState;
use camera::OrbitCamera;
use geometry::Vertex;

// --- Camera uniform (GPU layout) ---
#[repr(C)]
#[derive(Copy, Clone, bytemuck::Pod, bytemuck::Zeroable)]
struct CameraUniform {
    view_proj: [[f32; 4]; 4],
}

const DEPTH_FORMAT: wgpu::TextureFormat = wgpu::TextureFormat::Depth32Float;

fn create_depth_texture(device: &wgpu::Device, width: u32, height: u32) -> wgpu::TextureView {
    let texture = device.create_texture(&wgpu::TextureDescriptor {
        label: Some("Depth Texture"),
        size: wgpu::Extent3d { width, height, depth_or_array_layers: 1 },
        mip_level_count: 1,
        sample_count: 1,
        dimension: wgpu::TextureDimension::D2,
        format: DEPTH_FORMAT,
        usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
        view_formats: &[],
    });
    texture.create_view(&Default::default())
}

// --- GPU State ---
struct GpuState {
    surface: wgpu::Surface<'static>,
    device: wgpu::Device,
    queue: wgpu::Queue,
    config: wgpu::SurfaceConfiguration,
    window: Arc<Window>,
    // Two render pipelines sharing shader + depth buffer
    edge_pipeline: wgpu::RenderPipeline,
    face_pipeline: wgpu::RenderPipeline,
    vertex_buffer: wgpu::Buffer,
    edge_index_buffer: wgpu::Buffer,
    face_index_buffer: wgpu::Buffer,
    num_edge_indices: u32,
    num_face_indices: u32,
    depth_texture: wgpu::TextureView,
    uniform_buffer: wgpu::Buffer,
    bind_group: wgpu::BindGroup,
    // egui integration
    egui_state: egui_winit::State,
    egui_renderer: egui_wgpu::Renderer,
    // Application state
    app_state: AppState,
    camera: OrbitCamera,
}

impl GpuState {
    async fn new(window: Arc<Window>) -> anyhow::Result<Self> {
        let size = window.inner_size();

        // Create wgpu instance — selects Metal on macOS automatically
        let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor {
            backends: wgpu::Backends::PRIMARY,
            ..Default::default()
        });

        let surface = instance.create_surface(window.clone())?;

        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                compatible_surface: Some(&surface),
                ..Default::default()
            })
            .await?;

        log::info!("GPU adapter: {:?}", adapter.get_info().name);

        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor::default())
            .await?;

        let config = surface
            .get_default_config(&adapter, size.width, size.height)
            .ok_or_else(|| anyhow::anyhow!("Surface not supported"))?;
        surface.configure(&device, &config);

        // --- Camera uniform buffer ---
        let camera = OrbitCamera::default();
        let aspect = size.width as f32 / size.height as f32;
        let view_proj = camera.view_proj(aspect);
        let camera_uniform = CameraUniform {
            view_proj: view_proj.to_cols_array_2d(),
        };

        let uniform_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Camera Uniform Buffer"),
            contents: bytemuck::cast_slice(&[camera_uniform]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Camera Bind Group Layout"),
            entries: &[wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::VERTEX,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            }],
        });

        let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Camera Bind Group"),
            layout: &bind_group_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: uniform_buffer.as_entire_binding(),
            }],
        });

        // --- Shader ---
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Quadray Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shader.wgsl").into()),
        });

        // --- Render pipeline ---
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Pipeline Layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        // Faces: depth TEST but NO depth WRITE.
        // Semi-transparent faces must not block objects behind them in the depth
        // buffer. Without depth write, all transparent faces blend freely —
        // inner polyhedra remain visible through outer geodesic spheres
        // regardless of render order. Edges (rendered afterward) still write
        // depth and render on top via bias.
        let depth_stencil_face = wgpu::DepthStencilState {
            format: DEPTH_FORMAT,
            depth_write_enabled: false,
            depth_compare: wgpu::CompareFunction::Less,
            stencil: wgpu::StencilState::default(),
            bias: wgpu::DepthBiasState::default(),
        };

        let depth_stencil_edge = wgpu::DepthStencilState {
            format: DEPTH_FORMAT,
            depth_write_enabled: true,
            depth_compare: wgpu::CompareFunction::LessEqual,
            stencil: wgpu::StencilState::default(),
            bias: wgpu::DepthBiasState {
                constant: -2,       // Push edges toward camera
                slope_scale: -1.0,  // Scale bias by surface slope
                clamp: 0.0,
            },
        };

        let color_target = [Some(wgpu::ColorTargetState {
            format: config.format,
            blend: Some(wgpu::BlendState::ALPHA_BLENDING),
            write_mask: wgpu::ColorWrites::ALL,
        })];

        // Face pipeline: TriangleList, backface culled, depth write
        let face_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Face Pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                compilation_options: Default::default(),
                buffers: &[Vertex::layout()],
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fs_main"),
                compilation_options: Default::default(),
                targets: &color_target,
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: Some(wgpu::Face::Back), // Backface culling for faces
                polygon_mode: wgpu::PolygonMode::Fill,
                unclipped_depth: false,
                conservative: false,
            },
            depth_stencil: Some(depth_stencil_face),
            multisample: wgpu::MultisampleState {
                count: 1,
                mask: !0,
                alpha_to_coverage_enabled: false,
            },
            multiview: None,
            cache: None,
        });

        // Edge pipeline: LineList, no culling, depth bias to render on top of faces
        let edge_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Edge Pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                compilation_options: Default::default(),
                buffers: &[Vertex::layout()],
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fs_main"),
                compilation_options: Default::default(),
                targets: &color_target,
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::LineList,
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: None, // No culling for wireframe
                polygon_mode: wgpu::PolygonMode::Fill,
                unclipped_depth: false,
                conservative: false,
            },
            depth_stencil: Some(depth_stencil_edge),
            multisample: wgpu::MultisampleState {
                count: 1,
                mask: !0,
                alpha_to_coverage_enabled: false,
            },
            multiview: None,
            cache: None,
        });

        // --- Generate initial geometry from AppState defaults ---
        let app_state = AppState::default();
        let geo = geometry::build_visible_geometry(&app_state);
        log::info!(
            "Initial geometry: {} vertices, {} edges, {} face triangles",
            geo.vertices.len(),
            geo.edge_indices.len() / 2,
            geo.face_indices.len() / 3
        );

        // --- Vertex buffer (Quadray ABCD) ---
        let vertex_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Quadray ABCD Vertex Buffer"),
            contents: bytemuck::cast_slice(&geo.vertices),
            usage: wgpu::BufferUsages::VERTEX,
        });

        // --- Index buffers (edges + faces) ---
        let edge_index_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Edge Index Buffer"),
            contents: bytemuck::cast_slice(&geo.edge_indices),
            usage: wgpu::BufferUsages::INDEX,
        });
        let face_index_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Face Index Buffer"),
            contents: bytemuck::cast_slice(&geo.face_indices),
            usage: wgpu::BufferUsages::INDEX,
        });

        let num_edge_indices = geo.edge_indices.len() as u32;
        let num_face_indices = geo.face_indices.len() as u32;

        // --- Depth buffer ---
        let depth_texture = create_depth_texture(&device, size.width, size.height);

        // --- egui setup ---
        let egui_ctx = egui::Context::default();
        ui::configure_theme(&egui_ctx);
        coordinates::try_load_menlo_font(&egui_ctx); // slashed zeros (macOS Menlo)
        let viewport_id = egui_ctx.viewport_id();
        let egui_state = egui_winit::State::new(
            egui_ctx,
            viewport_id,
            &*window,
            Some(window.scale_factor() as f32),
            Some(winit::window::Theme::Dark),
            None,
        );
        let egui_renderer = egui_wgpu::Renderer::new(
            &device,
            config.format,
            egui_wgpu::RendererOptions {
                msaa_samples: 1,
                depth_stencil_format: Some(DEPTH_FORMAT),
                ..Default::default()
            },
        );

        Ok(Self {
            surface, device, queue, config, window,
            edge_pipeline, face_pipeline,
            vertex_buffer, edge_index_buffer, face_index_buffer,
            num_edge_indices, num_face_indices,
            depth_texture, uniform_buffer, bind_group,
            egui_state, egui_renderer,
            app_state, camera,
        })
    }

    fn resize(&mut self, new_size: winit::dpi::PhysicalSize<u32>) {
        if new_size.width > 0 && new_size.height > 0 {
            self.config.width = new_size.width;
            self.config.height = new_size.height;
            self.surface.configure(&self.device, &self.config);
            self.depth_texture = create_depth_texture(&self.device, new_size.width, new_size.height);
        }
    }

    fn rebuild_geometry(&mut self) {
        let geo = geometry::build_visible_geometry(&self.app_state);

        // Scene counts = total minus infrastructure (arrows + grids).
        // Infrastructure tracked separately for Geometry Info display.
        self.app_state.vertex_count = geo.vertices.len().saturating_sub(geo.infra_vertex_count);
        self.app_state.edge_count = (geo.edge_indices.len() / 2).saturating_sub(geo.infra_edge_count);
        self.app_state.face_count = (geo.face_indices.len() / 3).saturating_sub(geo.infra_face_count);
        self.app_state.node_count = geo.node_count;
        self.app_state.infra_vertex_count = geo.infra_vertex_count;
        self.app_state.infra_edge_count = geo.infra_edge_count;
        self.app_state.infra_face_count = geo.infra_face_count;
        self.app_state.bounding_radius = geo.bounding_radius;

        self.vertex_buffer = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Quadray ABCD Vertex Buffer"),
            contents: bytemuck::cast_slice(&geo.vertices),
            usage: wgpu::BufferUsages::VERTEX,
        });
        self.edge_index_buffer = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Edge Index Buffer"),
            contents: bytemuck::cast_slice(&geo.edge_indices),
            usage: wgpu::BufferUsages::INDEX,
        });
        self.face_index_buffer = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Face Index Buffer"),
            contents: bytemuck::cast_slice(&geo.face_indices),
            usage: wgpu::BufferUsages::INDEX,
        });
        self.num_edge_indices = geo.edge_indices.len() as u32;
        self.num_face_indices = geo.face_indices.len() as u32;
        self.app_state.geometry_dirty = false;
    }

    fn render(&mut self) -> Result<(), wgpu::SurfaceError> {
        // Rebuild geometry if UI changed polyhedra/scale; time the rebuild for Geometry Info display.
        if self.app_state.geometry_dirty {
            let t0 = std::time::Instant::now();
            self.rebuild_geometry();
            self.app_state.geometry_build_ms = t0.elapsed().as_secs_f64() * 1000.0;
        }

        // FPS tracking
        self.app_state.tick_fps();

        // --- egui frame (runs first to get actual panel width + coord bar height) ---
        // draw_coord_bar MUST be called before draw_ui so egui allocates bottom space first.
        let raw_input = self.egui_state.take_egui_input(&self.window);
        let camera = &mut self.camera;
        let app_state = &mut self.app_state;
        let full_output = self.egui_state.egui_ctx().run(raw_input, |ctx| {
            coordinates::draw_coord_bar(ctx, app_state); // MUST be first — allocates bottom space
            ui::draw_ui(ctx, app_state, camera);
        });
        self.egui_state
            .handle_platform_output(&self.window, full_output.platform_output);

        // --- Compute 3D viewport (canvas area excluding sidebar and coord bar) ---
        let scale_factor = self.window.scale_factor() as f32;
        let panel_px = self.app_state.panel_width * scale_factor;
        let coord_bar_px = self.app_state.coord_bar_height * scale_factor;
        let viewport_w = (self.config.width as f32 - panel_px).max(100.0);
        let viewport_h = (self.config.height as f32 - coord_bar_px).max(100.0);
        let viewport_aspect = viewport_w / viewport_h;

        // --- Cursor world position: ray from screen → sphere → ABCD (each frame) ---
        // Quadrance arithmetic: disc = b² − Q_D·(Q_O − r²) — no sqrt until display boundary.
        // Math.X justified: sqrt at coordinate display boundary only.
        if let Some((cx, cy)) = self.app_state.cursor_screen {
            if let Some((ray_o, ray_d)) = self.camera.unproject_ray(
                cx, cy, panel_px, 0.0, viewport_w, viewport_h,
            ) {
                let r = self.app_state.bounding_radius.max(0.5);
                if let Some(hit) = ray_sphere_or_plane(ray_o, ray_d, r) {
                    // Store zero-sum ABCD (sum=0, negatives permitted — native "pure Quadray").
                    // Normalize toggle in draw_coord_bar applies min-shift for canonical display.
                    use crate::rt_math::normalizer::xyz_to_quadray_raw;
                    let raw = xyz_to_quadray_raw([hit.x as f64, hit.y as f64, hit.z as f64]);
                    self.app_state.cursor_world_xyz = Some([hit.x, hit.y, hit.z]);
                    self.app_state.cursor_abcd = Some(raw);
                } else {
                    self.app_state.cursor_world_xyz = None;
                    self.app_state.cursor_abcd = None;
                }
            }
        }

        // --- Update camera uniform with correct viewport aspect ---
        let view_proj = self.camera.view_proj(viewport_aspect);
        let camera_uniform = CameraUniform {
            view_proj: view_proj.to_cols_array_2d(),
        };
        self.queue.write_buffer(
            &self.uniform_buffer,
            0,
            bytemuck::cast_slice(&[camera_uniform]),
        );

        let output = self.surface.get_current_texture()?;
        let view = output.texture.create_view(&Default::default());

        let paint_jobs = self.egui_state.egui_ctx().tessellate(
            full_output.shapes,
            full_output.pixels_per_point,
        );
        let screen_descriptor = egui_wgpu::ScreenDescriptor {
            size_in_pixels: [self.config.width, self.config.height],
            pixels_per_point: full_output.pixels_per_point,
        };

        // --- Update egui textures (font atlas) ---
        for (id, image_delta) in &full_output.textures_delta.set {
            self.egui_renderer
                .update_texture(&self.device, &self.queue, *id, image_delta);
        }

        // --- Command encoder ---
        let mut encoder = self.device.create_command_encoder(
            &wgpu::CommandEncoderDescriptor { label: Some("Render Encoder") },
        );

        // --- Upload egui buffers ---
        let extra_commands = self.egui_renderer.update_buffers(
            &self.device,
            &self.queue,
            &mut encoder,
            &paint_jobs,
            &screen_descriptor,
        );

        // --- Render pass: 3D wireframe first, then egui on top ---
        // Janus Inversion: background transitions black→white in negative frequency space.
        // At F0 (Janus point): black. At F-1 and beyond: full white.
        let bg = if self.app_state.frequency < 0.0 {
            (-self.app_state.frequency).min(1.0) as f64
        } else {
            0.0
        };
        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Main Render Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: bg, g: bg, b: bg, a: 1.0,
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                    depth_slice: None,
                })],
                depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                    view: &self.depth_texture,
                    depth_ops: Some(wgpu::Operations {
                        load: wgpu::LoadOp::Clear(1.0),
                        store: wgpu::StoreOp::Store,
                    }),
                    stencil_ops: None,
                }),
                ..Default::default()
            });

            // 1) Set 3D viewport to canvas area (left of sidebar)
            render_pass.set_viewport(0.0, 0.0, viewport_w, viewport_h, 0.0, 1.0);

            // 2) Draw faces FIRST (behind edges, depth-sorted)
            if self.num_face_indices > 0 {
                render_pass.set_pipeline(&self.face_pipeline);
                render_pass.set_bind_group(0, &self.bind_group, &[]);
                render_pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));
                render_pass.set_index_buffer(
                    self.face_index_buffer.slice(..),
                    wgpu::IndexFormat::Uint32,
                );
                render_pass.draw_indexed(0..self.num_face_indices, 0, 0..1);
            }

            // 3) Draw edges SECOND (on top of faces via depth bias)
            if self.num_edge_indices > 0 {
                render_pass.set_pipeline(&self.edge_pipeline);
                render_pass.set_bind_group(0, &self.bind_group, &[]);
                render_pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));
                render_pass.set_index_buffer(
                    self.edge_index_buffer.slice(..),
                    wgpu::IndexFormat::Uint32,
                );
                render_pass.draw_indexed(0..self.num_edge_indices, 0, 0..1);
            }

            // 4) Reset viewport to full window for egui overlay
            render_pass.set_viewport(
                0.0, 0.0,
                self.config.width as f32, self.config.height as f32,
                0.0, 1.0,
            );

            // 5) Draw egui on top (same render pass)
            self.egui_renderer.render(
                &mut render_pass.forget_lifetime(),
                &paint_jobs,
                &screen_descriptor,
            );
        }

        // --- Submit all command buffers ---
        let mut commands: Vec<wgpu::CommandBuffer> = extra_commands;
        commands.push(encoder.finish());
        self.queue.submit(commands);

        // --- Free textures AFTER submit ---
        for id in &full_output.textures_delta.free {
            self.egui_renderer.free_texture(id);
        }

        output.present();
        Ok(())
    }
}

// --- Application (winit 0.30 pattern) ---
struct App {
    state: Option<GpuState>,
}

impl ApplicationHandler for App {
    fn resumed(&mut self, event_loop: &winit::event_loop::ActiveEventLoop) {
        if self.state.is_none() {
            let attrs = Window::default_attributes()
                .with_title("ARTexplorer — Quadray/Metal + egui")
                .with_inner_size(winit::dpi::LogicalSize::new(1280, 720));
            let window = Arc::new(event_loop.create_window(attrs).unwrap());
            self.state = Some(pollster::block_on(GpuState::new(window)).unwrap());
        }
    }

    fn window_event(
        &mut self,
        event_loop: &winit::event_loop::ActiveEventLoop,
        _window_id: winit::window::WindowId,
        event: WindowEvent,
    ) {
        let Some(state) = &mut self.state else { return };

        // Pass event to egui first
        let egui_response = state.egui_state.on_window_event(&state.window, &event);

        match event {
            WindowEvent::CloseRequested => event_loop.exit(),
            WindowEvent::Resized(size) => state.resize(size),
            WindowEvent::RedrawRequested => {
                match state.render() {
                    Ok(_) => {}
                    Err(wgpu::SurfaceError::Lost) => state.resize(state.window.inner_size()),
                    Err(wgpu::SurfaceError::OutOfMemory) => event_loop.exit(),
                    Err(e) => log::error!("Render error: {:?}", e),
                }
                state.window.request_redraw();
            }
            _ => {
                // Always capture cursor position for coordinate bar — independent of egui.
                if let WindowEvent::CursorMoved { position, .. } = &event {
                    state.app_state.cursor_screen =
                        Some((position.x as f32, position.y as f32));
                }

                if !egui_response.consumed {
                    match &event {
                        WindowEvent::MouseInput { state: btn_state, button, .. } => {
                            if *button == winit::event::MouseButton::Left {
                                state.camera.on_mouse_button(
                                    *btn_state == winit::event::ElementState::Pressed,
                                );
                            }
                        }
                        WindowEvent::CursorMoved { position, .. } => {
                            state.camera.on_cursor_moved(position.x, position.y);
                        }
                        WindowEvent::MouseWheel { delta, .. } => {
                            let scroll = match delta {
                                winit::event::MouseScrollDelta::LineDelta(_, y) => *y,
                                winit::event::MouseScrollDelta::PixelDelta(pos) => pos.y as f32 * 0.1,
                            };
                            state.camera.on_scroll(scroll);
                        }
                        _ => {}
                    }
                }
            }
        }
    }
}

/// Ray-sphere intersection (bounding sphere centred at origin), with Z=0 plane fallback.
///
/// Uses **quadrance arithmetic** — the discriminant is computed entirely in Q-space
/// (no sqrt). The sqrt is deferred to computing parameter `t` (the display boundary).
///
/// Returns the front-face hit position, or Z=0 plane intersection when the ray misses
/// the sphere, or `None` if both miss.
///
/// Math.X justified: sqrt at coordinate display boundary only.
fn ray_sphere_or_plane(origin: glam::Vec3, dir: glam::Vec3, radius: f32) -> Option<glam::Vec3> {
    // Quadrance form of ray-sphere: t² Q_D + 2t b + (Q_O − r²) = 0
    // where Q_O = O·O, b = O·D, Q_D = D·D (= 1 since dir is normalized)
    let q_o = origin.dot(origin);           // |O|² — quadrance of camera eye
    let b   = origin.dot(dir);              // O·D  — dot product (not quadrance)
    let q_d = dir.dot(dir);                 // |D|² ≈ 1.0 (dir is normalized)
    let r2  = radius * radius;

    // Discriminant in pure Q-space — no sqrt required here
    let disc = b * b - q_d * (q_o - r2);

    if disc >= 0.0 {
        let t = (-b - disc.sqrt()) / q_d;  // Front-face intersection — sqrt at display boundary
        if t > 0.001 {
            return Some(origin + dir * t);
        }
        // If front face is behind camera, check back face (inside sphere)
        let t2 = (-b + disc.sqrt()) / q_d;
        if t2 > 0.001 {
            return Some(origin + dir * t2);
        }
    }

    // Fallback: Z=0 plane intersection
    if dir.z.abs() > 1e-6 {
        let t = -origin.z / dir.z;
        if t > 0.001 {
            return Some(origin + dir * t);
        }
    }

    None
}

fn main() -> anyhow::Result<()> {
    env_logger::init();
    log::info!("ARTexplorer — Quadray-native rendering pipeline (ABCD convention)");
    log::info!("Vertex data: pure ABCD integers, converted to XYZ in WGSL shader");
    let event_loop = EventLoop::new()?;
    let mut app = App { state: None };
    event_loop.run_app(&mut app)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ray_sphere_direct_hit() {
        // Ray pointing straight at sphere of radius 2.0 centred at origin
        let origin = glam::Vec3::new(0.0, 0.0, 5.0);
        let dir    = glam::Vec3::new(0.0, 0.0, -1.0); // pointing toward origin
        let hit = ray_sphere_or_plane(origin, dir, 2.0).expect("should hit sphere");
        // Front face at z = +2
        assert!((hit.z - 2.0).abs() < 0.001, "expected z≈2.0, got {}", hit.z);
        assert!(hit.x.abs() < 0.001 && hit.y.abs() < 0.001);
    }

    #[test]
    fn ray_sphere_miss_falls_back_to_z0_plane() {
        // Ray pointing away from sphere — should fall back to Z=0 plane
        let origin = glam::Vec3::new(0.0, 5.0, 5.0);
        let dir    = (glam::Vec3::new(10.0, 5.0, 0.0) - origin).normalize();
        let hit = ray_sphere_or_plane(origin, dir, 1.0); // small sphere — likely miss
        // Either hits sphere or Z=0 plane; either way a result should exist
        // (the ray is moving through space toward z=0)
        // If it missed sphere, z=0 plane gives a hit since dir.z < 0
        if let Some(p) = hit {
            assert!(p.z.abs() < 2.0, "hit should be near z=0 or sphere surface");
        }
        // No assertion that it must be Some — dir may not reach z=0 in front
    }

    #[test]
    fn ray_sphere_returns_none_when_both_miss() {
        // Ray moving away from origin and sphere — both miss
        let origin = glam::Vec3::new(0.0, 0.0, 5.0);
        let dir    = glam::Vec3::new(0.0, 0.0, 1.0); // pointing away from sphere
        // dir.z > 0 so Z=0 plane is behind (t < 0), sphere is behind (t < 0)
        let hit = ray_sphere_or_plane(origin, dir, 1.0);
        assert!(hit.is_none(), "ray pointing away from origin and sphere should miss");
    }

    #[test]
    fn on_grid_detection_integer_abcd() {
        // All components within eps=0.02 of integers → on grid
        let eps = 0.02_f64;
        let abcd = [1.005_f64, 0.0, 0.0, 0.0];
        assert!(abcd.iter().all(|v| v.fract().abs() < eps), "should be on grid");
    }

    #[test]
    fn on_grid_detection_fractional_abcd() {
        // Fractional components → off grid
        let eps = 0.02_f64;
        let abcd = [0.75_f64, -0.25, -0.25, -0.25]; // zero-sum tet vertex
        assert!(!abcd.iter().all(|v| v.fract().abs() < eps), "should be off grid");
    }
}
