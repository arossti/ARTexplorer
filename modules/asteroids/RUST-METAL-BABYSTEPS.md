# Rust + Metal Baby Steps

**Porting ARTexplorer from JS/THREE.js to a native macOS app — from zero**

> This is not just a game port. The entire ARTexplorer platform — RT math, polyhedra,
> rendering, visualization, and the educational explorer — moves to Rust + Metal.
> A.r.t.steroids (the game) is a bonus that comes along for the ride.
>
> For a JavaScript developer who has never touched Rust, Swift, or Metal.
> Written February 2026.

---

## Agent Handoff: RT-Purity in the Native Codebase

**READ THIS FIRST if you are an agent working on the Rust/WGSL code.**

This application is a **demonstration and explorer for Rational Trigonometry** (N.J. Wildberger) and **Synergetics** (R. Buckminster Fuller). It is *not* a conventional 3D graphics app. The entire point is that geometry is computed using **quadrance** (Q = d², replacing distance), **spread** (s = sin²θ, replacing angle), and **Quadray ABCD coordinates** (tetrahedral basis, replacing Cartesian XYZ) — with classical trig functions (`sin`, `cos`, `tan`, `π`, `atan2`) appearing **only** at explicitly marked rendering boundaries.

**The Rust `rt_math/` and `rt_polyhedra/` modules are the RT-pure engine.** They already implement:
- `quadrance()`, `spread()` — the RT replacements for distance and angle
- `reflect_in_line()` — RT-pure rotation via double reflection (no sin/cos)
- `slope_from_spread()` — the ONE √ per polygon, via Wildberger's method
- `n_gon_vertices()` — algebraic polygon vertices using successive reflections, not `cos(2πk/N)`
- `PurePhi` — golden ratio algebra using φ²=φ+1 identity, not `(1+√5)/2` recomputed
- `PureRadicals` — cached √2, √3, √6 (computed once, reused)
- `PureCubics` — cached cubic roots for heptagon/nonagon (star spreads, not trig)
- All 6 Platonic solids generated in **Quadray ABCD coordinates** natively

**Do NOT**:
- Introduce `f64::sin()`, `f64::cos()`, `f64::atan2()`, or `std::f64::consts::PI` in geometry code
- Use Euler angles or rotation matrices where `reflect_in_line()` double-reflection works
- Convert to Cartesian XYZ "for convenience" — stay in Quadray ABCD until the GPU boundary
- Reach for `nalgebra`, `cgmath`, or conventional linear algebra crates for geometry operations — these embed classical assumptions. Use `glam` only for camera matrices (the rendering boundary).
- Add "helper" functions that duplicate what `rt_math` already provides

**The sole justified boundary** is the **wgpu/WGSL rendering handoff**: camera projection matrices (via `glam`), `f64→f32` conversion at GPU upload (`Quadray::to_f32_array()`), and the WGSL shader's BASIS matrix that converts ABCD→XYZ for vertex positioning. Every boundary crossing requires a comment explaining why.

**When in doubt**: read `rt_math/mod.rs` and `rt_math/polygon.rs`. If they don't provide what you need, extend them RT-pure rather than reaching for `std::f64::consts::PI`.

---

## Table of Contents

1. [Why Rust + Metal](#1-why-rust--metal)
2. [The Architecture Decision](#2-the-architecture-decision)
3. [Installing Rust on macOS](#3-installing-rust-on-macos)
4. [VS Code Setup](#4-vs-code-setup)
5. [Your First Rust Project](#5-your-first-rust-project)
6. [The Graphics Stack: wgpu](#6-the-graphics-stack-wgpu)
7. [First Window: wgpu + winit](#7-first-window-wgpu--winit)
8. [Porting RT Math from JS to Rust](#8-porting-rt-math-from-js-to-rust)
9. [Baby Steps Roadmap](#9-baby-steps-roadmap) — Steps 1-7 DONE, Steps 8-10 deferred (game mode)
10. [Key Rust Concepts for JS Developers](#10-key-rust-concepts-for-js-developers)
11. [Resources](#11-resources)

---

## 1. Why Rust + Metal

ARTexplorer has matured as a JS/THREE.js web app — Thomson polyhedra, prime projections, Quadray visualization, state management, view system. But we've always known the THREE.js boundary is a compromise. Every `Math.sin()` and `Math.PI` at the rendering handoff undermines RT purity. The `artsteroids.html` game prototype was the catalyst, but the motivation is broader: **the entire platform deserves a native rendering pipeline.**

### What moves to Rust

| Layer | Current (JS) | Native (Rust) |
|-------|-------------|---------------|
| **RT math** | `rt-math.js` — Quadray, quadrance, spread, reflections | `rt_math.rs` — identical API, type-safe Quadray struct |
| **Polyhedra** | `rt-polyhedra.js` — tet, cube, octa, icosa, dodeca, geodesics | `rt_polyhedra.rs` — same generators, compile-time vertex validation |
| **Thomson shells** | `rt-thomson.js` — great-circle shells, nGon vertices | `rt_thomson.rs` — exact same algorithm, f64 precision |
| **Rendering** | `rt-rendering.js` → THREE.js (WebGL) | wgpu → Metal (native GPU) |
| **State/views** | `rt-state-manager.js`, `rt-delta.js`, `rt-viewmanager.js` | Rust equivalents with serde serialization |
| **Game** | `artsteroids.html` prototype + skeleton modules | Native game loop — the bonus |

### Why this is worth it

| Problem | JS/THREE.js | Rust/Metal |
|---------|-------------|------------|
| **RT purity** | Math.PI/sin/cos leak at THREE.js boundary | RT-pure all the way to the GPU — write shaders in WGSL with quadrance/spread |
| **Performance** | JS garbage collection causes frame drops; Float32 precision | Zero-cost abstractions, no GC, f64 until GPU boundary |
| **Line rendering** | WebGL lineWidth > 1 not supported | Metal has proper wide lines, custom geometry shaders |
| **Distribution** | Browser-only, GitHub Pages | Native macOS app — Mac App Store, offline use |
| **IP protection** | JavaScript = readable source | Compiled binary — no source inspection needed |
| **Future platform** | Locked into browser sandbox | Metal compute shaders, multi-window, system integration |

The web version (`index.html` on GitHub Pages) continues as the free educational tool. The native app becomes the premium platform — same RT math, superior rendering, plus the game.

---

## 2. The Architecture Decision

### Recommended: **wgpu** (Rust-native GPU abstraction over Metal)

```
┌──────────────────────────────────────────────────┐
│              ARTexplorer Native (Rust)            │
│                                                  │
│  rt_math.rs       (Quadray, quadrance, spread)   │
│  rt_polyhedra.rs  (tet, cube, octa, icosa, …)    │
│  rt_thomson.rs    (great-circle shells)           │
│  rt_rendering.rs  (scene, camera, materials)      │
│  rt_state.rs      (state management, undo/redo)   │
│  rt_views.rs      (view sequences, delta/animate) │
│       │                                          │
│       ├── explorer mode (educational visualizer) │
│       └── game mode (A.r.t.steroids)             │
│               │                                  │
│               ▼                                  │
│  wgpu (Rust) ──── Metal backend ───────────► GPU │
│  winit (Rust) ─── macOS window + input ────► OS  │
└──────────────────────────────────────────────────┘
```

The core RT math and polyhedra modules serve **both** the educational explorer and the game. This is the same architecture we have in JS — `rt-math.js` and `rt-polyhedra.js` are shared by `index.html` (explorer) and `artsteroids.html` (game). In Rust, they become shared library crates.

**wgpu** is a Rust-native graphics API that:
- Automatically uses **Metal on macOS** (no configuration needed)
- Talks directly to Metal — no translation layer, no MoltenVK
- Uses **WGSL** (WebGPU Shading Language) for shaders, compiled to MSL (Metal Shading Language) automatically
- Is cross-platform (Metal/Vulkan/DX12/WebGPU) if we ever want Linux/Windows/web
- Is the standard choice in the Rust gamedev ecosystem

### Alternatives considered and rejected

| Option | Why not |
|--------|---------|
| **Bevy** (full game engine) | Overkill — we want direct control over the geometry pipeline, not an engine's abstractions |
| **macroquad** | 2D-focused, no proper 3D pipeline |
| **metal-rs** | Deprecated — use `objc2-metal` if raw Metal needed |
| **Swift + Metal** (Rust FFI) | Adds FFI complexity. Only needed later if we want native SwiftUI chrome around the viewport |
| **Vulkan + MoltenVK** | Unnecessary indirection — wgpu already gives us Metal directly |

### Future option: Swift/Metal for native UI

When we want native macOS menus, preferences panels, polyhedron browser, or App Store integration, we can add a thin Swift layer around the Rust core using **swift-bridge** (Rust-Swift FFI generator). The architecture would become:

```
SwiftUI (menus, inspector, polyhedron browser, preferences)
    │
    ▼ swift-bridge FFI
Rust core (rt_math, rt_polyhedra, rt_rendering, explorer + game)
    │
    ▼ Metal backend
GPU
```

This is Phase 2. Phase 1 is pure Rust + wgpu — get the RT math and rendering working first.

---

## 3. Installing Rust on macOS

### Step 0: Xcode Command Line Tools

```bash
# This gives you the C compiler, linker, and macOS SDK headers.
# Without it, Rust's linker will fail with cryptic errors.
xcode-select --install

# Verify it worked:
xcrun --show-sdk-path
# Should print something like: /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk
```

### Step 1: Install Rust via rustup

```bash
# The ONLY way to install Rust. Never use `brew install rust`.
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Follow the prompts — press `1` for default installation. This installs:
- **rustc** — the Rust compiler
- **cargo** — package manager + build tool (like npm but better)
- **rustup** — toolchain manager (like nvm for Node)

### Step 2: Activate the environment

```bash
# Either open a new terminal, or:
source "$HOME/.cargo/env"
```

### Step 3: Verify

```bash
rustc --version     # rustc 1.85.x or newer
cargo --version     # cargo 1.85.x or newer
rustup --version    # rustup 1.27.x or newer
```

### Step 4: Keep it updated

```bash
rustup update       # Updates the compiler and tools
```

### macOS gotchas

| Issue | Fix |
|-------|-----|
| Homebrew `rust` conflicts with `rustup` | `brew uninstall rust` then use `rustup` only |
| Linker fails with missing SDK | Run `xcode-select --install` |
| Full Xcode installed but wrong SDK | `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` |

---

## 4. VS Code Setup

### Essential extensions (install these first)

| Extension | What it does |
|-----------|-------------|
| **rust-analyzer** | THE Rust IDE experience. Completion, go-to-definition, inline type hints, diagnostics, auto-import, refactoring. Runs `cargo clippy` on save. This single extension replaces what a dozen JS extensions do. |
| **CodeLLDB** | Debugger. Set breakpoints, inspect variables, step through code. Uses LLDB (macOS native). |

### Recommended extras

| Extension | What it does |
|-----------|-------------|
| **Even Better TOML** | Syntax highlighting for `Cargo.toml` (Rust's `package.json`) |
| **crates** | Shows latest dependency versions inline in `Cargo.toml` |
| **Error Lens** | Displays errors/warnings inline next to the offending line |

**Note**: The old "Rust" extension (by rust-lang) is **deprecated**. Only use **rust-analyzer**.

---

## 5. Your First Rust Project

```bash
# Create a new project (like `npm init`)
cargo new artexplorer-native
cd artexplorer-native

# Run it (like `node index.js`)
cargo run
# Prints: Hello, world!
```

### Project structure

```
artexplorer-native/
├── Cargo.toml      ← package.json equivalent (dependencies, metadata)
├── Cargo.lock      ← package-lock.json equivalent (exact versions)
└── src/
    └── main.rs     ← entry point
```

### Cargo.toml (our starting dependencies)

```toml
[package]
name = "artexplorer-native"
version = "0.1.0"
edition = "2024"                  # Latest Rust edition (like ES2024)

[dependencies]
wgpu = "28"                       # GPU rendering (Metal on macOS)
winit = "0.30"                    # Window creation + input handling
pollster = "0.4"                  # Block on async (wgpu init is async)
env_logger = "0.11"               # CRITICAL: wgpu errors are silent without this
log = "0.4"                       # Logging framework
anyhow = "1"                      # Ergonomic error handling
```

### Key cargo commands (your new npm equivalents)

| npm | cargo | What it does |
|-----|-------|-------------|
| `npm install` | `cargo build` | Download deps + compile |
| `npm start` / `node .` | `cargo run` | Build + run |
| `npm test` | `cargo test` | Run tests |
| `npm install <pkg>` | `cargo add <crate>` | Add a dependency |
| `npx` | — | Cargo runs project binaries directly |
| `npm run lint` | `cargo clippy` | Linter (much stricter than ESLint) |
| `npm run format` | `cargo fmt` | Auto-formatter (like Prettier, but opinionated and standard) |

---

## 6. The Graphics Stack: wgpu

### How it maps to THREE.js concepts

| THREE.js | wgpu | Notes |
|----------|------|-------|
| `new THREE.WebGLRenderer()` | `wgpu::Device` + `wgpu::Queue` | Device = GPU handle, Queue = command submission |
| `renderer.domElement` (canvas) | `wgpu::Surface` | The window's drawable surface |
| `new THREE.Scene()` | Your own scene graph | wgpu is lower-level — you build the scene management |
| `new THREE.PerspectiveCamera()` | Uniform buffer with projection matrix | You compute the matrix, upload it to GPU |
| `new THREE.BufferGeometry()` | `wgpu::Buffer` | Vertex/index data uploaded to GPU |
| `new THREE.ShaderMaterial()` | `wgpu::RenderPipeline` | Combines vertex + fragment shaders |
| GLSL shaders | **WGSL** shaders | WebGPU Shading Language — looks like Rust, compiles to Metal Shading Language |
| `requestAnimationFrame` | `window.request_redraw()` + event loop | winit drives the frame loop |
| `renderer.render(scene, camera)` | `encoder.begin_render_pass()` | You build command buffers explicitly |

### The wgpu render loop

```
Each frame:
1. Get the next texture from the Surface (like swapping buffers)
2. Create a CommandEncoder (records GPU commands)
3. Begin a RenderPass (set clear color, attachments)
4. Set pipeline, bind groups, vertex buffers
5. Draw calls
6. End render pass
7. Submit command buffer to Queue
8. Present the texture
```

This is more explicit than THREE.js but gives you complete control — exactly what we need for RT-pure geometry rendering.

### Shaders: WGSL

WGSL is wgpu's shader language. It looks like a mix of Rust and GLSL:

```wgsl
// Vertex shader
@vertex
fn vs_main(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
    return vec4<f32>(position, 1.0);
}

// Fragment shader
@fragment
fn fs_main() -> @location(0) vec4<f32> {
    return vec4<f32>(0.0, 1.0, 0.8, 1.0); // Cyan — our ship color
}
```

**RT purity note**: We can write custom WGSL shaders that operate in quadrance space, taking the sqrt only at the final vertex position output. This is the rendering boundary we've always wanted — RT-pure math flowing directly into the GPU pipeline.

---

## 7. First Window: wgpu + winit

This is your "Hello World" — a window that clears to black (like our game background).

Create `src/main.rs`:

```rust
use std::sync::Arc;
use winit::{
    application::ApplicationHandler,
    event::WindowEvent,
    event_loop::EventLoop,
    window::Window,
};

// --- GPU State ---
struct GpuState {
    surface: wgpu::Surface<'static>,
    device: wgpu::Device,
    queue: wgpu::Queue,
    config: wgpu::SurfaceConfiguration,
    window: Arc<Window>,
}

impl GpuState {
    async fn new(window: Arc<Window>) -> anyhow::Result<Self> {
        let size = window.inner_size();

        // Create wgpu instance — selects Metal on macOS automatically
        let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor {
            backends: wgpu::Backends::PRIMARY,
            ..Default::default()
        });

        // Create a drawable surface from the window
        let surface = instance.create_surface(window.clone())?;

        // Find a GPU adapter compatible with our surface
        // wgpu 28: request_adapter returns Result, not Option
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                compatible_surface: Some(&surface),
                ..Default::default()
            })
            .await?;

        log::info!("GPU adapter: {:?}", adapter.get_info().name);

        // Create the device (GPU handle) and command queue
        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor::default())
            .await?;

        // Configure the surface for rendering
        let config = surface
            .get_default_config(&adapter, size.width, size.height)
            .ok_or_else(|| anyhow::anyhow!("Surface not supported"))?;
        surface.configure(&device, &config);

        Ok(Self { surface, device, queue, config, window })
    }

    fn resize(&mut self, new_size: winit::dpi::PhysicalSize<u32>) {
        if new_size.width > 0 && new_size.height > 0 {
            self.config.width = new_size.width;
            self.config.height = new_size.height;
            self.surface.configure(&self.device, &self.config);
        }
    }

    fn render(&mut self) -> Result<(), wgpu::SurfaceError> {
        let output = self.surface.get_current_texture()?;
        let view = output.texture.create_view(&Default::default());

        let mut encoder = self.device.create_command_encoder(
            &wgpu::CommandEncoderDescriptor { label: Some("Render Encoder") },
        );

        // Clear to pure black — ARTexplorer background
        let _render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("Clear Pass"),
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
        drop(_render_pass);

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
                .with_title("ARTexplorer — Rust/Metal")
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
                state.window.request_redraw(); // Continuous rendering
            }
            _ => {}
        }
    }
}

fn main() -> anyhow::Result<()> {
    // ESSENTIAL: wgpu panics with useless messages without a logger
    env_logger::init();
    let event_loop = EventLoop::new()?;
    let mut app = App { state: None };
    event_loop.run_app(&mut app)?;
    Ok(())
}
```

**Run it**: `cargo run` — you should see a 1280x720 black window titled "ARTexplorer — Rust/Metal". That's Metal rendering your first frame.

---

## 8. Porting RT Math from JS to Rust

Our JS `rt-math.js` translates almost 1:1 to Rust. The key insight: Rust's type system naturally enforces what we've been doing by convention (deferred sqrt, quadrance vs distance).

### JS → Rust mapping

```javascript
// JavaScript (rt-math.js)
const RT = {
    quadrance: (p1, p2) => {
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        return dx * dx + dy * dy;       // Stay in Q-space
    },
    spread: (Q1, Q2, Q3) => {
        // Triple spread formula (Wildberger)
        const num = (Q1 + Q2 - Q3) * (Q1 + Q2 - Q3);
        return 1 - num / (4 * Q1 * Q2);
    },
};
```

```rust
// Rust (rt_math.rs)

/// Quadrance between two 2D points — algebraic distance squared.
/// Stays in Q-space (no sqrt) until GPU boundary.
pub fn quadrance(p1: [f64; 2], p2: [f64; 2]) -> f64 {
    let dx = p2[0] - p1[0];
    let dy = p2[1] - p1[1];
    dx * dx + dy * dy  // Last expression = return value (no semicolon)
}

/// Spread from three quadrances (Wildberger triple spread formula).
/// s = 1 - (Q1 + Q2 - Q3)^2 / (4 * Q1 * Q2)
pub fn spread(q1: f64, q2: f64, q3: f64) -> f64 {
    let num = (q1 + q2 - q3).powi(2);  // .powi(2) = integer power
    1.0 - num / (4.0 * q1 * q2)
}
```

### Quadray coordinates in Rust

```rust
/// Quadray coordinate in WXYZ tetrahedral space.
/// Invariant: all components >= 0, at least one == 0 (normalized).
#[derive(Debug, Clone, Copy)]
pub struct Quadray {
    pub w: f64,
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Quadray {
    /// The four basis vectors
    pub const W: Self = Self { w: 1.0, x: 0.0, y: 0.0, z: 0.0 };
    pub const X: Self = Self { w: 0.0, x: 1.0, y: 0.0, z: 0.0 };
    pub const Y: Self = Self { w: 0.0, x: 0.0, y: 1.0, z: 0.0 };
    pub const Z: Self = Self { w: 0.0, x: 0.0, y: 0.0, z: 1.0 };

    /// Convert to Cartesian XYZ (the GPU boundary)
    pub fn to_cartesian(&self) -> [f64; 3] {
        let scale = 1.0 / (2.0_f64).sqrt();  // Only sqrt at the boundary!
        [
            scale * (self.w - self.x - self.y + self.z),
            scale * (self.w - self.x + self.y - self.z),
            scale * (self.w + self.x - self.y - self.z),
        ]
    }
}
```

**Note the beauty**: Rust's type system lets us define `Quadray` as a distinct type. You literally cannot pass a Cartesian coordinate where a Quadray is expected — the compiler catches it. In JS, both were just arrays.

---

## 8.1 The ABCD Convention — Killing the 3021 Scramble

### The Problem: WXYZ Creates Confusion

In the JS app, Quadray basis vectors are named **QW, QX, QY, QZ** — borrowing X, Y, Z from Cartesian notation. This creates two layers of confusion:

1. **Name collision**: An agent or user seeing "QX" naturally associates it with "Cartesian X" — but they're different axes pointing in different directions.
2. **The 3021 scramble**: The user-facing names (QW, QX, QY, QZ) don't match the internal array indices. QW→index 3, QX→index 0, QY→index 2, QZ→index 1. This `AXIS_INDEX` mapping has been a recurring source of axis-swap bugs in projections and cutplanes.

### The Fix: ABCD = 0123

For the native app, we eliminate both problems by adopting **ABCD** as the Quadray basis vector names. The letters are:
- **Completely disjoint from Cartesian XYZ** — no name collision possible
- **Naturally indexed**: A=0, B=1, C=2, D=3 — no scramble table needed
- **Self-documenting**: a 4-tuple `[a, b, c, d]` is immediately recognizable as Quadray

### The ABCD Convention Table

| Name | Index | Cartesian Direction | Color | Former Name | Vertex Pattern |
|------|-------|---------------------|-------|-------------|----------------|
| **A** | 0 | (-1, -1, +1) | **Yellow** | QW | [1, 0, 0, 0] |
| **B** | 1 | (+1, +1, +1) | **Red** | QX | [0, 1, 0, 0] |
| **C** | 2 | (-1, +1, -1) | **Blue** | QY | [0, 0, 1, 0] |
| **D** | 3 | (+1, -1, -1) | **Green** | QZ | [0, 0, 0, 1] |

### Why A = Yellow (Not Red)

Deliberate disambiguation. In the standard CG convention, **Cartesian X = Red**. If Quadray A were also Red, every agent and user would unconsciously equate A↔X. Making **A = Yellow** breaks this false association immediately. The color sequence Yellow→Red→Blue→Green never aligns with the Cartesian RGB pattern.

### Basis Vectors in WGSL

```wgsl
// ABCD basis vectors for Quadray → Cartesian conversion
const BASIS: mat4x3<f32> = mat4x3<f32>(
    vec3<f32>(-1.0, -1.0, 1.0),    // A (Yellow) — former QW
    vec3<f32>( 1.0,  1.0, 1.0),    // B (Red)    — former QX
    vec3<f32>(-1.0,  1.0,-1.0),    // C (Blue)   — former QY
    vec3<f32>( 1.0, -1.0,-1.0),    // D (Green)  — former QZ
);
```

A Quadray 4-tuple `[a, b, c, d]` converts to Cartesian via: `xyz = a*A_basis + b*B_basis + c*C_basis + d*D_basis`

### Polyhedra in ABCD Coordinates

| Polyhedron | Vertex Pattern | Example Vertex |
|------------|----------------|----------------|
| **Tetrahedron** | {1,0,0,0} permutations | A-vertex: [1,0,0,0] |
| **Dual Tetrahedron** | {0,1,1,1} permutations | A-absent: [0,1,1,1] |
| **Octahedron** | {1,1,0,0} permutations | AB-edge: [1,1,0,0] |
| **Truncated Tet** | {2,1,0,0} permutations | Near-A: [2,1,0,0] |
| **Cuboctahedron (VE)** | {2,1,1,0} permutations | A-dominant: [2,1,1,0] |

### Faces in ABCD

Each tetrahedron face is opposite one vertex and inherits its color:

| Face | Opposite Vertex | Color | Contains Vertices |
|------|----------------|-------|-------------------|
| **Face A** | Vertex A | **Yellow** | B, C, D |
| **Face B** | Vertex B | **Red** | A, C, D |
| **Face C** | Vertex C | **Blue** | A, B, D |
| **Face D** | Vertex D | **Green** | A, B, C |

### Migration Cheat Sheet (JS → Native)

| JS (Legacy) | Native (ABCD) | Notes |
|-------------|---------------|-------|
| QW | A | Yellow, index 0 (was index 3!) |
| QX | B | Red, index 1 (was index 0!) |
| QY | C | Blue, index 2 (unchanged) |
| QZ | D | Green, index 3 (was index 1!) |
| `AXIS_INDEX[name]` | Direct index | **3021 rule eliminated** |
| `basisVectors[3]` for QW | `basis[0]` for A | Natural indexing |
| `[w, x, y, z]` tuple | `[a, b, c, d]` tuple | Same values, new names |
| `Quadray.AXIS_INDEX` | Not needed | Name = index |

### Rule for Agents

**When working in the native Rust/WGSL codebase:**
- Use **A, B, C, D** for Quadray basis directions (never W, X, Y, Z)
- Use **X, Y, Z** only for Cartesian coordinates
- A 4-component tuple `[a, b, c, d]` is always Quadray; a 3-component `[x, y, z]` is always Cartesian
- Index directly: `basis[0]` = A, `basis[1]` = B, `basis[2]` = C, `basis[3]` = D
- Colors: A=Yellow, B=Red, C=Blue, D=Green

---

## 9. Baby Steps Roadmap

Each step is independently verifiable. Do not skip ahead.

### Step 1: Install + Hello World (Day 1) — DONE 2026-02-19
- [x] Install Xcode Command Line Tools
- [x] Install Rust via rustup — **Rust 1.93.1** (aarch64-apple-darwin)
- [ ] Install VS Code extensions (rust-analyzer, CodeLLDB)
- [x] `cargo new artexplorer-native && cd artexplorer-native && cargo run`
- [x] See "Hello, world!" in terminal
- **Verified**: `rustc --version` → 1.93.1

### Step 2: Black Window (Day 1-2) — DONE 2026-02-19
- [x] Add wgpu 28, winit 0.30, pollster 0.4, env_logger 0.11 to Cargo.toml
- [x] Write main.rs with wgpu + winit ApplicationHandler pattern
- [x] `cargo run` — 1280x720 black window on **Apple M2 Max** via Metal
- **Verified**: Window opens, title shows "ARTexplorer — Rust/Metal", GPU adapter detected
- **Notes**: wgpu 28 API changes vs. original doc: `request_adapter()` returns `Result` not `Option`; `RenderPassColorAttachment` requires `depth_slice: None`

### Step 3: Colored Triangle (Day 2-3) — DONE 2026-02-19
- [x] Write a WGSL vertex + fragment shader (`src/shader.wgsl`)
- [x] Create a render pipeline with vertex buffer layout
- [x] Define vertex buffer with 3 vertices (cyan triangle with color interpolation)
- [x] Draw it
- **Verified**: Cyan triangle on black background, resizes with window
- **Notes**: Additional wgpu 28 API changes: `push_constant_ranges` → `immediate_size`, `multiview` → `multiview_mask`. Added `bytemuck` crate for vertex data casting.

### Step 4: Quadray-Native Stella Octangula (Day 3-5) — DONE 2026-02-19
- [x] **REVISED**: Instead of porting Cartesian tetrahedron, render Quadray-native ABCD coordinates directly on GPU
- [x] Added `glam` crate for camera matrix math (Mat4, Vec3)
- [x] Quadray vertex format: `vec4<f32>` ABCD coordinates passed directly to GPU — NO Cartesian conversion in Rust!
- [x] WGSL vertex shader performs zero-sum normalization + basis matrix conversion (ABCD → XYZ) on GPU
- [x] Camera uniform buffer (perspective projection + view matrix via glam)
- [x] Index buffer with LineList topology for wireframe edge rendering
- [x] Stella Octangula: base tet `[1,0,0,0]` vertices + dual tet `[0,1,1,1]` vertices, ABCD colors (Yellow/Red/Blue/Green)
- [x] **ABCD convention adopted** — see Section 8.1. A=Yellow, B=Red, C=Blue, D=Green. No more 3021 scramble.
- **Verified**: Wireframe stella octangula renders on Apple M2 Max via Metal
- **Notes**: Key architectural step — WGSL shader's `mat4x3` BASIS matrix `[A=(-1,-1,+1), B=(+1,+1,+1), C=(-1,+1,-1), D=(+1,-1,-1)]` converts ABCD→XYZ on GPU. Window title: "ARTexplorer — Quadray/Metal".

### Step 5: Keyboard Input (Day 5-6) — DEFERRED (game mode)
- [ ] Handle `winit::event::KeyEvent` for A, S, D, F, Space, G
- [ ] Implement ASDF rubber-band displacement (port from artsteroids.html)
- [ ] Ship moves along Quadray axes
- **Deferred**: Game mode input — user chose Explorer UI (Path A) first

### Step 6: RT Math Port (Day 6-8) — DONE 2026-02-19
- [x] Created `src/rt_math/` module (6 files): `mod.rs`, `quadray.rs`, `phi.rs`, `radicals.rs`, `cubics.rs`, `polygon.rs`
- [x] Created `src/rt_polyhedra/` module (2 files): `mod.rs`, `platonic.rs`
- [x] **Quadray struct** — ABCD basis, `to_cartesian()`, `from_cartesian()` (closed-form 4×4 inverse), operator overloads
- [x] **RT primitives** — quadrance, spread, circle_param, reflect_in_line, slope_from_spread, verify_euler
- [x] **Symbolic algebra** — PurePhi (golden ratio), PureRadicals (√2, √3, √6), PhiSymbolic `(a+b√5)/c`
- [x] **Polygon generation** — Wildberger reflection method, 1 √ for any N. Exact star spreads for N=3..12
- [x] **All 6 Platonic solids** — tet, dual tet, cube, octa, icosa, dodeca (Quadray-native vertices)
- [x] **Integration** — `main.rs` generates stella octangula from `rt_polyhedra` instead of hardcoded arrays
- [x] **macOS .app bundle** — `bundle.sh` builds release + creates `ARTexplorer.app` with stella octangula icon
- [x] 89 tests passing: `cargo test` — numerical parity with JS for all polyhedra
- **Verified**: Rendered stella octangula identical to hardcoded version. App launches from Dock.
- **Notes**: Fixed 4 bugs during testing: `from_cartesian` needed closed-form inverse (non-orthogonal basis), heptagon cubic sign correction (8x³+4x²-4x-1=0), octahedron edge Q=8 (not 4), central_spread test values corrected.

### Step 7: Explorer UI — egui Side Panel (Day 8-10) — DONE 2026-02-19
- [x] Downgraded wgpu 28 → 27 for egui-wgpu 0.33 compatibility (2 API changes: `push_constant_ranges`, `multiview`)
- [x] Added egui 0.33 + egui-wgpu 0.33 + egui-winit 0.33 dependencies
- [x] **egui integration**: Two-layer rendering (3D wireframe + egui overlay) in single render pass via `render_pass.forget_lifetime()`
- [x] **Event routing**: egui gets events first; if not consumed, fall through to orbit camera
- [x] **New modules**:
  - `src/app_state.rs` — single `AppState` struct driving UI + geometry (polyhedra toggles, scale, FPS, stats)
  - `src/ui.rs` — egui right-side panel with collapsible Polyhedra/Scale/Info sections, dark theme
  - `src/geometry.rs` — `Vertex` struct, ABCD_COLORS, `build_visible_geometry()` for all 6 Platonic solids
  - `src/camera.rs` — `OrbitCamera` (left-drag orbit, scroll zoom, spherical coordinates via glam)
- [x] **All 6 Platonic solids** toggleable via checkboxes (tet, dual tet, cube, octa, icosa, dodeca)
- [x] **Scale sliders** — tet edge (0.1–5.0) and cube edge (0.1–3.6)
- [x] **FPS counter** and V/E stats in Info section
- [x] **Mouse orbit camera** — left-drag to rotate, scroll to zoom. Events blocked when clicking egui panel.
- [x] Dark theme (panel_fill rgb(20,20,25)), right-side panel matching JS app layout
- [x] Rebuilt .app bundle via `bundle.sh --run` — all controls visible from Dock launch
- **Verified**: Side panel + 3D viewport coexist. Toggle polyhedra → shapes appear/disappear. Sliders → resize. Orbit → rotate. Panel clicks don't orbit. 89 tests still pass.
- **Notes**: This is P0 from ART-RUST-UI.md. wgpu 27 API: `request_adapter()` returns Result (not Option as some docs suggest), `depth_slice: None` is required. egui theme param is `winit::window::Theme::Dark` not `egui::Theme::Dark`.

### Step 8: Face-Normal Firing (Day 10-12) — DEFERRED (game mode)
- [ ] Compute face normals (original tet for Quadray alignment)
- [ ] Spacebar-hold + ASDF firing
- [ ] Colored line rendering (wide lines in Metal — no WebGL limitation!)
- **Verify**: Colored darts fire from correct faces — compare with artsteroids.html

### Step 9: HUD Text Rendering (Day 12-14) — DEFERRED (game mode)
- [ ] Add a text rendering crate (e.g., `wgpu_text` or `glyphon`)
- [ ] Render WAVE, SCORE, FUEL, WXYZ coordinates
- [ ] Retro monospace font, cyan on black
- **Verify**: HUD matches the artsteroids.html layout
- **Deferred**: Game mode HUD — egui handles text for explorer mode

### Step 10: Feature Parity with Prototype (Day 14-17) — DEFERRED (game mode)
- [ ] Quadray basis vector arrows
- [ ] Grid toggle (G key)
- [ ] Crosshair triangles at face centroids
- [ ] Orbit camera (mouse drag) — **DONE in Step 7** (orbit camera shipped with egui)
- **Verify**: Side-by-side with artsteroids.html — functionally identical

### Step 11: Beyond the Prototype — Full Platform
- [ ] **Explorer mode**: Port `rt-rendering.js` scene management → `rt_rendering.rs`
- [ ] **Explorer mode**: Polyhedron browser (tet, cube, octa, icosa, dodeca, geodesics)
- [ ] **Explorer mode**: Thomson great-circle shells (`rt_thomson.rs`)
- [ ] **Explorer mode**: State management, undo/redo, view sequences
- [ ] **Game mode**: Asteroid generation (Cartesian cubes — the enemy!)
- [ ] **Game mode**: Collision detection (quadrance-based — no sqrt needed)
- [ ] **Game mode**: Sound effects (rodio crate)
- [ ] **Platform**: Swift/Metal UI wrapper (menus, preferences, polyhedron browser)
- [ ] **Platform**: App icon + Mac App Store packaging

---

## 10. Key Rust Concepts for JS Developers

### The Big Mental Shift: Ownership

In JavaScript, you never think about who "owns" data — the garbage collector handles it. In Rust, every value has exactly one owner. When the owner goes out of scope, the value is dropped (freed).

```rust
let ship = create_ship();       // `ship` owns the data
let backup = ship;              // Ownership MOVES to `backup`
// println!("{:?}", ship);      // ERROR: `ship` was moved, it's gone
println!("{:?}", backup);       // OK: `backup` owns it now
```

This feels alien at first. You'll fight the borrow checker for a week. Then it clicks, and you realize it's catching bugs that JavaScript hides until production.

### Borrowing (references)

When you want to use data without taking ownership:

```rust
fn print_position(q: &Quadray) {   // & means "I'm borrowing, not taking"
    println!("W={}", q.w);
}

let ship_pos = Quadray::W;
print_position(&ship_pos);         // Lend it out
println!("{:?}", ship_pos);        // Still valid — we only lent it
```

### No null, no undefined

Rust has no `null`. Instead, it uses `Option<T>`:

```rust
// JavaScript:  let target = null;
// Rust:
let target: Option<Enemy> = None;

// JavaScript:  if (target !== null) { ... }
// Rust:
if let Some(enemy) = target {
    shoot(enemy);
}
```

The compiler forces you to handle the `None` case. No more "Cannot read property of null" at runtime.

### Error handling

No `try/catch`. Rust uses `Result<T, E>`:

```rust
// JavaScript:
// try { const data = loadFile(); } catch(e) { console.error(e); }

// Rust:
match load_file() {
    Ok(data) => process(data),
    Err(e) => log::error!("Failed: {}", e),
}

// Or the shorthand with `?` (propagate error to caller):
let data = load_file()?;  // Returns early with Err if it fails
```

### JS → Rust cheat sheet

| JavaScript | Rust | Notes |
|-----------|------|-------|
| `let x = 5` | `let x = 5;` | Immutable by default in Rust! |
| `let x = 5` (mutable) | `let mut x = 5;` | Must explicitly opt into mutability |
| `const` | `const` | Compile-time constant (not just "can't reassign") |
| `function foo(x) {}` | `fn foo(x: i32) {}` | Types are required on function params |
| `x => x * 2` | `\|x\| x * 2` | Closures use pipes instead of arrows |
| `console.log()` | `println!()` | The `!` means it's a macro |
| `array.push(x)` | `vec.push(x)` | `Vec<T>` is Rust's growable array |
| `array.map(fn)` | `iter.map(fn).collect()` | Iterators are lazy, need `.collect()` |
| `{ key: value }` | `Struct { field: value }` | Named structs instead of object literals |
| `class Foo {}` | `struct Foo {} + impl Foo {}` | Data and methods are separate |
| `async/await` | `async/await` | Similar syntax, different runtime model |
| `import` | `use` | Module system is different but same idea |
| `npm` | `cargo` | Build tool + package manager |
| `package.json` | `Cargo.toml` | Project manifest |
| `node_modules/` | `target/` (gitignored) | Build artifacts + dependencies |

---

## 11. Resources

### Essential reading (in order)

1. **"The Rust Programming Language" (The Book)** — `rustup doc --book` opens it locally. Read chapters 1-6 first.
2. **[Learn Wgpu](https://sotrh.github.io/learn-wgpu/)** — Step-by-step wgpu tutorials. Do tutorials 1-5 to get a textured cube on screen.
3. **[wgpu examples](https://github.com/gfx-rs/wgpu/tree/trunk/examples)** — Official examples covering every wgpu feature.

### Reference

- [wgpu docs](https://docs.rs/wgpu) — API documentation
- [winit docs](https://docs.rs/winit) — Window/input documentation
- [WGSL specification](https://www.w3.org/TR/WGSL/) — Shader language reference
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/) — Learn Rust through annotated examples

### Community

- [Rust GameDev Discord](https://discord.gg/yNtPTb2) — Active community, quick answers
- [/r/rust_gamedev](https://reddit.com/r/rust_gamedev) — Monthly newsletters, project showcases

---

## Current Status

### Phase 1: Foundation (Steps 1–7)

| Milestone | Status |
|-----------|--------|
| artsteroids.html prototype (JS/THREE.js) | Done — controls validated |
| Private repo created (ARTexplorer-private) | Done |
| Rust toolchain installed | Done — Rust 1.93.1 (2026-02-19) |
| First black window (wgpu + Metal) | Done — Apple M2 Max, wgpu 28 (2026-02-19) |
| Colored triangle (WGSL shader + render pipeline) | Done — cyan triangle, wgpu 28 (2026-02-19) |
| **Quadray-native GPU rendering** | **Done — ABCD→XYZ in WGSL shader (2026-02-19)** |
| **RT math port** (`rt_math/`, `rt_polyhedra/`, 89 tests) | **Done — 8 files, all Platonics, Wildberger polygons (2026-02-19)** |
| **macOS .app bundle** (bundle.sh + icon) | **Done — ARTexplorer.app launches from Dock (2026-02-19)** |
| **P0 Explorer UI** (egui side panel, orbit camera, all 6 Platonics) | **Done — egui 0.33 + wgpu 27, right-side panel (2026-02-19)** |

### Phase 2: Game Mode (Steps 8–10) — DEFERRED

| Milestone | Status |
|-----------|--------|
| Keyboard input (ASDF rubber-band) | Deferred — game mode |
| Face-normal firing + HUD | Deferred — game mode |
| Feature parity with JS prototype | Deferred — game mode |
| Asteroid generation + collision | Pending |

### Phase 3: Explorer Mode — IN PROGRESS

| Milestone | Status |
|-----------|--------|
| **P0: egui side panel + basic polyhedra** | **Done — Step 7 (2026-02-19)** |
| **P0: Mouse orbit camera** | **Done — Step 7 (2026-02-19)** |
| **P0: All 6 Platonic solids toggleable** | **Done — Step 7 (2026-02-19)** |
| P1: Basis arrows (Cartesian + Quadray) | Next |
| P1: Grid planes + camera presets | Pending |
| P1: Node/face rendering (spheres, opacity) | Pending |
| P1: Coordinate display bar | Pending |
| P2: Thomson great-circle shells | Pending |
| P2: Geodesic subdivision + truncation | Pending |
| P2: View manager + state persistence | Pending |

### Phase 4: Native Platform

| Milestone | Status |
|-----------|--------|
| Swift/Metal UI wrapper (menus, preferences) | Pending |
| Mac App Store packaging | Pending |
| Web version continues as free educational tool | Ongoing |

---

*"In Rust, the borrow checker is your co-pilot. In Quadray space, it's your navigator. ARTexplorer was born in the browser — the whole platform grows up native."*
