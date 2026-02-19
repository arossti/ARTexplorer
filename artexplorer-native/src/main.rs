mod rt_math;
mod rt_polyhedra;

use std::sync::Arc;
use wgpu::util::DeviceExt;
use winit::{
    application::ApplicationHandler,
    event::WindowEvent,
    event_loop::EventLoop,
    window::Window,
};

// --- Vertex data (ABCD Convention) ---
// Quadray-native: each vertex carries ABCD coordinates (integers on CPU!)
// The WGSL shader converts ABCD → XYZ on the GPU via basis matrix multiplication.
// A=Yellow, B=Red, C=Blue, D=Green — ABCD=0123, no scramble.
#[repr(C)]
#[derive(Copy, Clone, bytemuck::Pod, bytemuck::Zeroable)]
struct Vertex {
    quadray: [f32; 4], // ABCD coordinates (Quadray)
    color: [f32; 3],   // RGB
}

impl Vertex {
    fn layout() -> wgpu::VertexBufferLayout<'static> {
        wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<Vertex>() as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &[
                // quadray: vec4<f32> at offset 0
                wgpu::VertexAttribute {
                    offset: 0,
                    shader_location: 0,
                    format: wgpu::VertexFormat::Float32x4,
                },
                // color: vec3<f32> at offset 16
                wgpu::VertexAttribute {
                    offset: std::mem::size_of::<[f32; 4]>() as wgpu::BufferAddress,
                    shader_location: 1,
                    format: wgpu::VertexFormat::Float32x3,
                },
            ],
        }
    }
}

// --- ABCD color palette ---
// Each axis gets a consistent color across all polyhedra.
const ABCD_COLORS: [[f32; 3]; 4] = [
    [1.0, 1.0, 0.0], // A = Yellow
    [1.0, 0.0, 0.0], // B = Red
    [0.0, 0.4, 1.0], // C = Blue
    [0.0, 0.8, 0.2], // D = Green
];

/// Build stella octangula from rt_polyhedra generators.
///
/// Replaces the hardcoded VERTICES/INDICES with generated geometry.
/// Base tetrahedron + dual tetrahedron, ABCD colors, LineList edges.
fn build_stella_octangula() -> (Vec<Vertex>, Vec<u16>) {
    let tet = rt_polyhedra::tetrahedron();
    let dual = rt_polyhedra::dual_tetrahedron();

    let mut vertices = Vec::new();
    let mut indices = Vec::new();

    // Base tet: vertex i colored by axis i
    for (i, q) in tet.vertices.iter().enumerate() {
        vertices.push(Vertex {
            quadray: q.to_f32_array(),
            color: ABCD_COLORS[i],
        });
    }

    // Dual tet: vertex i colored by absent axis i
    let base_offset = tet.vertices.len() as u16;
    for (i, q) in dual.vertices.iter().enumerate() {
        vertices.push(Vertex {
            quadray: q.to_f32_array(),
            color: ABCD_COLORS[i],
        });
    }

    // Base tet edges
    for [a, b] in &tet.edges {
        indices.push(*a as u16);
        indices.push(*b as u16);
    }

    // Dual tet edges (offset by base vertex count)
    for [a, b] in &dual.edges {
        indices.push(*a as u16 + base_offset);
        indices.push(*b as u16 + base_offset);
    }

    (vertices, indices)
}

// --- Camera uniform ---
#[repr(C)]
#[derive(Copy, Clone, bytemuck::Pod, bytemuck::Zeroable)]
struct CameraUniform {
    view_proj: [[f32; 4]; 4],
}

impl CameraUniform {
    fn new(aspect: f32) -> Self {
        let view = glam::Mat4::look_at_rh(
            glam::Vec3::new(3.0, 3.0, 3.0), // eye: looking from (3,3,3)
            glam::Vec3::ZERO,                 // target: origin
            glam::Vec3::Y,                    // up: Y-up
        );
        let proj = glam::Mat4::perspective_rh(
            std::f32::consts::FRAC_PI_4, // 45° FOV
            aspect,
            0.1,   // near
            100.0,  // far
        );
        Self {
            view_proj: (proj * view).to_cols_array_2d(),
        }
    }
}

// --- GPU State ---
struct GpuState {
    surface: wgpu::Surface<'static>,
    device: wgpu::Device,
    queue: wgpu::Queue,
    config: wgpu::SurfaceConfiguration,
    window: Arc<Window>,
    render_pipeline: wgpu::RenderPipeline,
    vertex_buffer: wgpu::Buffer,
    index_buffer: wgpu::Buffer,
    num_indices: u32,
    uniform_buffer: wgpu::Buffer,
    bind_group: wgpu::BindGroup,
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
        let aspect = size.width as f32 / size.height as f32;
        let camera_uniform = CameraUniform::new(aspect);

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
            immediate_size: 0,
        });

        let render_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Quadray Wireframe Pipeline"),
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
                targets: &[Some(wgpu::ColorTargetState {
                    format: config.format,
                    blend: Some(wgpu::BlendState::REPLACE),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::LineList, // Wireframe edges!
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: None, // No culling for wireframe
                polygon_mode: wgpu::PolygonMode::Fill,
                unclipped_depth: false,
                conservative: false,
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState {
                count: 1,
                mask: !0,
                alpha_to_coverage_enabled: false,
            },
            multiview_mask: None,
            cache: None,
        });

        // --- Generate geometry from RT polyhedra ---
        let (vertices, indices) = build_stella_octangula();
        log::info!(
            "Stella octangula: {} vertices, {} edges ({} indices)",
            vertices.len(),
            indices.len() / 2,
            indices.len()
        );

        // --- Vertex buffer (Quadray ABCD) ---
        let vertex_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Quadray ABCD Vertex Buffer"),
            contents: bytemuck::cast_slice(&vertices),
            usage: wgpu::BufferUsages::VERTEX,
        });

        // --- Index buffer (edge pairs for LineList) ---
        let index_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Edge Index Buffer"),
            contents: bytemuck::cast_slice(&indices),
            usage: wgpu::BufferUsages::INDEX,
        });

        let num_indices = indices.len() as u32;

        Ok(Self {
            surface, device, queue, config, window,
            render_pipeline, vertex_buffer, index_buffer, num_indices,
            uniform_buffer, bind_group,
        })
    }

    fn resize(&mut self, new_size: winit::dpi::PhysicalSize<u32>) {
        if new_size.width > 0 && new_size.height > 0 {
            self.config.width = new_size.width;
            self.config.height = new_size.height;
            self.surface.configure(&self.device, &self.config);

            // Update camera aspect ratio
            let aspect = new_size.width as f32 / new_size.height as f32;
            let camera_uniform = CameraUniform::new(aspect);
            self.queue.write_buffer(
                &self.uniform_buffer,
                0,
                bytemuck::cast_slice(&[camera_uniform]),
            );
        }
    }

    fn render(&mut self) -> Result<(), wgpu::SurfaceError> {
        let output = self.surface.get_current_texture()?;
        let view = output.texture.create_view(&Default::default());

        let mut encoder = self.device.create_command_encoder(
            &wgpu::CommandEncoderDescriptor { label: Some("Render Encoder") },
        );

        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Quadray Wireframe Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    depth_slice: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: 0.0, g: 0.0, b: 0.0, a: 1.0,
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                ..Default::default()
            });

            render_pass.set_pipeline(&self.render_pipeline);
            render_pass.set_bind_group(0, &self.bind_group, &[]);
            render_pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));
            render_pass.set_index_buffer(self.index_buffer.slice(..), wgpu::IndexFormat::Uint16);
            render_pass.draw_indexed(0..self.num_indices, 0, 0..1);
        }

        self.queue.submit(std::iter::once(encoder.finish()));
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
                .with_title("ARTexplorer — Quadray/Metal")
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
            _ => {}
        }
    }
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
