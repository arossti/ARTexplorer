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
/// Quadray coordinate in ABCD tetrahedral space.
/// Fields are a, b, c, d — NOT w, x, y, z (see §8.1 for why).
/// Invariant: all components >= 0, at least one == 0 (normalized).
#[derive(Debug, Clone, Copy)]
pub struct Quadray {
    pub a: f64,    // Index 0 — Yellow (former QW)
    pub b: f64,    // Index 1 — Red    (former QX)
    pub c: f64,    // Index 2 — Blue   (former QY)
    pub d: f64,    // Index 3 — Green  (former QZ)
}

impl Quadray {
    /// The four basis vectors — ABCD = 0123, no scramble
    pub const A: Self = Self { a: 1.0, b: 0.0, c: 0.0, d: 0.0 };
    pub const B: Self = Self { a: 0.0, b: 1.0, c: 0.0, d: 0.0 };
    pub const C: Self = Self { a: 0.0, b: 0.0, c: 1.0, d: 0.0 };
    pub const D: Self = Self { a: 0.0, b: 0.0, c: 0.0, d: 1.0 };

    /// Convert to Cartesian XYZ (the GPU boundary)
    pub fn to_cartesian(&self) -> [f64; 3] {
        let scale = 1.0 / (2.0_f64).sqrt();  // Only sqrt at the boundary!
        [
            scale * (-self.a + self.b - self.c + self.d),  // X
            scale * (-self.a + self.b + self.c - self.d),  // Y
            scale * ( self.a + self.b - self.c - self.d),  // Z
        ]
    }
}
```

**Note the beauty**: Rust's type system lets us define `Quadray` as a distinct type. You literally cannot pass a Cartesian coordinate where a Quadray is expected — the compiler catches it. In JS, both were just arrays. The ABCD field names (§8.1) eliminate the WXYZ/XYZ name collision that caused the 3021 scramble bug in the JS codebase.

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
- [x] **Scale sliders** — tet edge (0.1–5.0) and cube edge (0.1–3.6), linked via **Rationality Reciprocity**: `tet_edge = cube_edge × √2`. A `ScaleDriver` enum tracks which slider the user moved last; the other updates as the irrational conjugate. Internally, ONE Quadray scale factor `s = cube_edge / 2` is applied uniformly to all ABCD coordinates (see RATIONALE §2, §5)
- [x] **FPS counter** and V/E stats in Info section
- [x] **Mouse orbit camera** — left-drag to rotate, scroll to zoom. Events blocked when clicking egui panel.
- [x] Dark theme (panel_fill rgb(20,20,25)), right-side panel matching JS app layout
- [x] Rebuilt .app bundle via `bundle.sh --run` — all controls visible from Dock launch
- **Verified**: Side panel + 3D viewport coexist. Toggle polyhedra → shapes appear/disappear. Sliders → resize. Orbit → rotate. Panel clicks don't orbit. 89 tests still pass.
- **Notes**: This is P0 from ART-RUST-UI.md. wgpu 27 API: `request_adapter()` returns Result (not Option as some docs suggest), `depth_slice: None` is required. egui theme param is `winit::window::Theme::Dark` not `egui::Theme::Dark`.

### P1: Basis Arrows (Quadray ABCD + Cartesian XYZ) — DONE 2026-02-20 (corrected 2026-02-21)
- [x] **New module `src/basis_arrows.rs`** — arrow construction, orientation, ABCD conversion
  - `build_quadray_basis(tet_edge, janus_sign, offset)` → 4 arrows toward regular tet vertex directions
  - `build_cartesian_basis(cube_edge, offset)` → 3 arrows along +X/+Y/+Z
  - Arrowheads: wireframe mini dual tetrahedra from `rt_polyhedra::dual_tetrahedron()`
  - Orientation via `glam::Quat::from_rotation_arc()` (rendering boundary, justified)
- [x] **Quadray ABCD arrows**: origin → [1,0,0,0], [0,1,0,0], [0,0,1,0], [0,0,0,1] directions
  - Regular tet basis — arrows align with IVM grid plane basis vectors (AB, AC, etc.)
  - Janus sign flip negates Cartesian direction → naturally produces dual tet in negative arena
  - **Correction (2026-02-21)**: Originally used dual tet [0,1,1,1] etc.; switched to regular tet per Janus10.tex §3.2 — normalization erases arena information, regular tet + sign flip is the true inversion
  - Colors: A=Yellow, B=Red, C=Blue, D=Green (ABCD convention)
  - Sizing: `(tetEdge + 1) × √6/4` (JS formula from `rt-grids.js`)
- [x] **Cartesian XYZ arrows**: +X (Red), +Y (Green), +Z (Blue)
  - Same arrowhead geometry (dual tet), different orientation per axis
  - Sizing: `cubeEdge` (matches JS convention)
- [x] **UI**: "Basis Arrows" collapsible section with Quadray ABCD / Cartesian XYZ checkboxes
- [x] **Independent sizing**: Basis arrows NOT multiplied by polyhedra scale factor `s` — they compute their own absolute ABCD coordinates via `Quadray::from_cartesian()`
- [x] **Dynamic regeneration**: Arrows rebuild when scale sliders change (via `geometry_dirty` flag)
- [x] 10 new unit tests (99 total): vertex/index counts, direction verification, offset, scale, abs()
- **Verified**: 99 tests pass. Arrows visible alongside stella octangula. Toggles work. Scale changes resize arrows.
- **No changes to**: `shader.wgsl`, `camera.rs`, `Cargo.toml`, `rt_math/`, `rt_polyhedra/`

### P1: Camera Presets (7 Views) — DONE 2026-02-20
- [x] **7 camera presets**: 3 XYZ views (Right, Front, Top) + 4 ABCD Quadray views (A, B, C, D)
- [x] **CameraPreset struct** in `camera.rs` — stored yaw/pitch/distance with UI color
  - XYZ views: Right (+X, Red), Front (+Z, Blue), Top (+Y, Green) — matching basis arrow colors
  - ABCD views: A (Yellow), B (Red), C (Blue), D (Green) — ABCD convention colors
  - Each preset annotated with §10 ABCD 4-vector triplet for future P3 migration
- [x] **Polar up-vector fix**: `view_proj()` switches up-vector from Y to ±Z near poles (|pitch| > 1.4 rad), enabling true Top/Bottom views without gimbal-lock NaN. See `ARTEX-HAIRYBALL.md` for the deeper research.
- [x] **egui Camera section**: Two rows of colored buttons — XYZ group and ABCD group, both first-class (no hierarchy)
- [x] **UI wiring**: `draw_ui()` takes `&mut OrbitCamera` directly; split borrow in main.rs closure
- [x] 5 new unit tests (104 total): default is B-axis, preset application, top view NaN-free, counts, pitch symmetry
- [x] **Default camera IS B-axis view**: yaw=π/4, pitch=asin(1/√3) ≈ 0.6155 — looking from (+1,+1,+1)/√3
- **Verified**: 104 tests pass. Preset buttons switch views instantly. Top view renders correctly. No NaN.
- **Modified**: `camera.rs` (presets + up-vector), `ui.rs` (Camera section), `main.rs` (split borrow)

### P1: Ortho Projection + Centre Button + Viewport-Aware Canvas — DONE 2026-02-20
- [x] **Orthographic projection** in `camera.rs` — `ProjectionMode::Orthographic` with `ORTHO_SCALE = tan(22.5°) ≈ 0.4142`
  - Ortho half-size scales with distance so scroll-zoom works naturally
  - Switching perspective↔ortho at same distance preserves apparent object size
- [x] **Centre button** — `OrbitCamera::centre(bounding_radius, viewport_aspect)` fits visible geometry
  - Respects both vertical and horizontal viewport extents (uses tighter constraint)
  - Perspective: `distance = r / tan(fov/2)`, Orthographic: `distance = r / ORTHO_SCALE`
- [x] **Viewport-aware canvas** — 3D viewport excludes egui sidebar width
  - `state.panel_width` updated each frame from egui panel response
  - Render pass viewport and scissor rect set to `[panel_width..window_width]`
  - Aspect ratio computed from effective viewport, not full window
- [x] **UI**: Perspective/Ortho selectable labels + Centre button in Camera section
- [x] 3 new unit tests (107 total): ortho valid matrix, centre adjusts distance, narrow viewport horizontal fitting
- **Verified**: Ortho/Perspective toggle preserves visual size. Centre fits geometry. Sidebar doesn't clip 3D viewport.
- **Modified**: `camera.rs` (ProjectionMode, centre, ORTHO_SCALE), `ui.rs` (projection toggle + Centre), `main.rs` (viewport scissor)

### P1: Grid Planes (Cartesian XYZ + IVM Central Angle) — DONE 2026-02-20
- [x] **New module `src/grids.rs`** (~380 lines) — grid geometry for both Cartesian and IVM reference frames
- [x] **Cartesian grids**: 3 orthogonal planes (XY, XZ, YZ)
  - Uniform rectangular grid with fixed cell spacing (`√6/4 ≈ 0.612`)
  - Divisions slider (10–100, step 10) **expands** the grid — more divisions = larger extent, not finer subdivision
  - Colors: XY=Yellow, XZ=Magenta, YZ=Cyan (full brightness, opacity-controlled)
- [x] **IVM Central Angle grids**: 6 planes from Quadray basis vector pairs (AB, AC, AD, BC, BD, CD)
  - Triangular tessellation filling the wedge between each pair of basis directions
  - Tessellations slider (12–144, step 12) grows the grid extent
  - Colors: AB=Orange, AC=Magenta, AD=Lime, BC=Cyan, BD=Lavender, CD=Salmon (full brightness, opacity-controlled)
- [x] **Fixed spatial reference frame** — grids do NOT scale with geometry scale slider
  - Grid cell spacing is always `radicals::quadray_grid_interval()` (√6/4)
  - Only polyhedra scale with the tet_edge/cube_edge sliders
- [x] **u16 → u32 index buffer migration** — at >60 tessellations with 6 IVM planes, vertex count exceeds 65,535
  - Changed `IndexFormat::Uint16` → `IndexFormat::Uint32` in `main.rs`
  - Updated all `Vec<u16>` → `Vec<u32>` across `geometry.rs`, `grids.rs`, `basis_arrows.rs`
- [x] **Far plane 100 → 500** — expanded grids need deeper clipping distance
- [x] **Universal alpha blending** — per-vertex RGBA opacity for grids (and future faces/nodes)
  - `Vertex.color` expanded from `[f32; 3]` (RGB) → `[f32; 4]` (RGBA) across entire pipeline
  - WGSL shader: `vec3<f32>` → `vec4<f32>` color passthrough, fragment outputs alpha directly
  - Render pipeline: `BlendState::REPLACE` → `BlendState::ALPHA_BLENDING` (src alpha / one-minus-src-alpha)
  - Grid colors at full brightness with alpha from opacity slider (default 0.10)
  - Polyhedra and basis arrows: alpha = 1.0 (fully opaque)
  - **Motivation**: At certain scales, polyhedra edges become invisible when colinear with grid lines. Alpha blending separates grid reference from geometry.
  - **Reusable**: Same per-vertex alpha infrastructure ready for future face and node opacity sliders
- [x] **UI**: Two new collapsible sections
  - "Cartesian Grid": Enable toggle, color-coded XY/XZ/YZ checkboxes, Divisions slider, Opacity slider (0.00–1.00)
  - "IVM Grid": Enable toggle, 6 color-coded pair checkboxes (2 rows of 3), Tessellations slider, Opacity slider (0.00–1.00)
- [x] **17 new state fields** in `app_state.rs`: master toggles, individual plane flags, slider values, opacity values
- [x] 10 new unit tests (117 total): vertex counts, coplanarity, master toggle, index offsets, unit directions
- **Verified**: 117 tests pass. Both grid types render correctly at all tessellation levels. Grids stay fixed while geometry scales. Opacity 0.10 default keeps grids visible without obscuring coincident polyhedra edges.
- **Modified**: `grids.rs` (NEW), `app_state.rs` (17 fields), `geometry.rs` (u32 + RGBA + grid calls), `basis_arrows.rs` (u32 + RGBA), `camera.rs` (far plane), `main.rs` (mod grids, Uint32, ALPHA_BLENDING), `ui.rs` (2 grid sections + opacity sliders), `shader.wgsl` (vec4 color)

### P1: Quadray-Native IVM Grid — DONE 2026-02-21

**Problem** (solved): The original IVM grid built geometry in Cartesian and converted back:
`Quadray → to_cartesian() → normalize (÷√3) → scale by √6/4 → linear combo → from_cartesian()`

This introduced 5 irrationals and 2 unnecessary coordinate conversions. The `√6/4` grid interval was the "Cartesian disease."

**Solution** (implemented): Grid vertices are now pure integer ABCD coordinates:

| Plane | Vertex (i, j) | i range | j range |
|-------|---------------|---------|---------|
| AB | `[i, j, 0, 0]` | 0..T | 0..T−i |
| AC | `[i, 0, j, 0]` | 0..T | 0..T−i |
| AD | `[i, 0, 0, j]` | 0..T | 0..T−i |
| BC | `[0, i, j, 0]` | 0..T | 0..T−i |
| BD | `[0, i, 0, j]` | 0..T | 0..T−i |
| CD | `[0, 0, i, j]` | 0..T | 0..T−i |

**What changed**:
- [x] `build_quadray_plane()` — pure integer ABCD via `basis: [usize; 2]` indices
- [x] `build_quadray_grids()` — replaced `build_ivm_grids()`, no Cartesian intermediaries
- [x] Removed `quadray_direction()` helper entirely
- [x] Removed `radicals::quadray_grid_interval()` dependency from grid pipeline
- [x] No `from_cartesian()` calls — vertices go straight to GPU as integer ABCD
- [x] Tests: `quadray_ab_vertices_are_integer`, `quadray_cd_vertices_are_integer`

**What stays the same**:
- Cartesian XYZ grids remain Cartesian (they ARE the XYZ reference frame — `from_cartesian()` is justified there)
- Tessellation slider still controls grid extent (T=12 means 12 integer steps along each basis direction)
- Same 6 planes, same colors, same opacity system
- Same triangular tessellation topology

**Janus Inversion and the Negative Arena** (see Janus10.tex §2.6, §3.1):

The grid itself uses positive integer ABCD and does not invert — visually it looks the same from either arena. But the coordinate system must support negative Quadray values natively, per the ARTexplorer extension of standard Quadray rules:

| Aspect | Standard Quadray (Urner/Ace) | ARTexplorer Extension |
|--------|----------------------------|-----------------------|
| Negative coordinates | Substituted: `[-1,0,0,0]` → `[0,1,1,1]` | Permitted: `[-1,0,0,0]` stays negative |
| Zero-sum constraint | Enforced (3 DOF, isomorphic to ℝ³) | Optional (native 4 DOF) |
| Janus Inversion | Not representable | Core operation |

The normalization step (`to_cartesian()` subtracts mean to enforce zero-sum) maps `[-1,0,0,0]` and `[0,1,1,1]` to the same Cartesian point — but **erases which arena the form lives in**. The sign is information, not redundancy.

Design implications for the native app:
- [ ] Quadray struct must store negative values without auto-normalizing to all-positive
- [ ] Forms can be defined at negative integer coordinates: tet at `[-1,0,0,0]`, `[0,-1,0,0]`, `[0,0,-1,0]`, `[0,0,0,-1]` (the dual, in negative space)
- [ ] Second-interval tet: `[-2,0,0,0]`, `[0,-2,0,0]`, `[0,0,-2,0]`, `[0,0,0,-2]` — pure negative integers
- [ ] **Visual signal**: background inverts from black to white when scale < 0 (entering negative arena)
- [ ] Non-inverted forms ghost/fade when viewing from the opposite arena
- [ ] Arena state (positive/negative) is first-class metadata, not derived from normalization
- [ ] `to_cartesian()` still works correctly with negative ABCD (the math is symmetric) — normalization is for XYZ translation only, not a constraint on the Quadray representation

**RT-Purity impact**: Eliminates all irrationals from the IVM grid pipeline. The only `sqrt()` remaining is in the WGSL shader's ABCD→XYZ basis matrix — the justified rendering boundary. Negative integer coordinates preserve the same RT-purity as positive ones — the sign carries geometric meaning (arena parity) without introducing any irrationals.

### P1: Frequency Slider + Edge Lengths — DONE 2026-02-21

**Frequency** (Fuller): F = s = cube_edge / 2 = Quadray scale factor. At integer F, polyhedra vertices land on integer Quadray grid points. The frequency IS the Quadray-native scale unit — edge lengths are Cartesian observations.

**Two slider groups** in the Scale UI:

1. **Frequency slider** (primary, default open) — integer snap F-12 to F12
   - At integer F: shows decomposition "Cube edge = 2N → Tet edge = 2N√2"
   - At F0: "Origin (Janus point)"
   - Janus indicator for negative frequencies
   - Footer: "Integer F → polyhedra on grid points"

2. **Edge Length sliders** (secondary, default closed) — fine-grained Cartesian control
   - Tet edge: ±34.0, snaps to 0.1 intervals
   - Cube edge: ±24.0, snaps to 0.1 intervals
   - Readout: derived frequency with "(on grid)" / "(off grid)" indicator
   - Edge-driven scaling generally lands off-grid — this is expected

**Scale pipeline**: All three controls (frequency, tet edge, cube edge) keep each other in sync via the Rationality Reciprocity: `tet_edge = cube_edge × √2`, `frequency = cube_edge / 2`. Default is F1 (s=1, cube_edge=2, tet_edge=2√2).

### P1: Extended Camera Zoom — DONE 2026-02-21

**Problem** (solved): Camera distance was clamped to 1.0–50.0 with additive scroll (`delta * 0.5`). At F12 with 144 grid tessellations, the grid extends ~88 Cartesian units — well beyond the camera's reach.

**Solution**:
- **Proportional scroll zoom**: `distance -= delta * distance * 0.05` — scroll speed scales with distance, feels uniform from close-up to extreme distances
- **Distance range**: 0.1 to 10,000 (was 1.0 to 50.0)
- **Dynamic near/far planes**: scale with distance to maintain z-buffer precision
  - Near: `distance * 0.02` clamped to [0.01, 100]
  - Far: `distance * 100` clamped to [500, 1,000,000]
- Centre button respects the new range

### P1: Janus Inversion — DONE 2026-02-21

**Janus Inversion** (see `Janus10.tex` §3): When frequency crosses F0 into the negative arena, the tetrahedron maps to its dual via coordinate sign-flip: `[1,0,0,0] → [-1,0,0,0]`, which (via vectorial neutrality) IS `[0,1,1,1]` — the dual vertex. The sign carries the arena information.

**Two visual orientation cues**:
1. **Background color**: transitions from black (F0) to white (F-1 and beyond) — `main.rs` clear color
2. **Basis arrows**: Janus sign flip negates Cartesian direction, so arrows built from regular tet `[1,0,0,0]` naturally point along dual tet directions `[0,1,1,1]` in negative space

**Key insight — normalization is the devil** (Janus10.tex §2.6):
- Standard Quadray normalizes `[-1,0,0,0]` → `[0,1,1,1]` (add `[1,1,1,1]`)
- This erases which arena the form lives in — the sign IS the information
- ARTexplorer's extension permits negative coordinates deliberately
- The basis arrows use regular tet directions + sign flip (NOT pre-normalized dual tet) because this preserves the true inversion structure

**What changed**:
- [x] `main.rs` — clear color transitions black→white when `frequency < 0` (clamped at F-1)
- [x] `basis_arrows.rs` — `janus_sign` parameter; regular tet basis with sign negation
- [x] `geometry.rs` — passes `state.frequency` as janus_sign to basis arrow builder
- [x] Basis arrow directions corrected from dual tet `[0,1,1,1]` to regular tet `[1,0,0,0]`
- [x] 1 new test: `janus_negative_inverts_arrows` (119 total)

**Centrosymmetric polyhedra**: Cube, octa, icosa, dodeca are centrosymmetric — their `P → -P` maps vertices to vertices of the SAME solid. Only the tetrahedron produces a genuinely different structure (its dual) under inversion. This is why only the tet and basis arrows visually change when crossing F0.

### P1: Grid Janus Inversion — DONE 2026-02-21

**Problem**: IVM grid used positive integer ABCD `[i, j, 0, 0]` regardless of arena — the grid didn't participate in Janus inversion, breaking the visual system's coherence.

**Solution**: `build_quadray_plane()` takes a `sign: f32` parameter that multiplies all ABCD coordinates. In the negative arena (frequency < 0), `sign = -1.0` produces `[-i, -j, 0, 0]` — the grid tessellates along dual tet directions. The shader's ABCD→XYZ conversion naturally places these at inverted Cartesian positions.

**Auto-opacity on Janus crossing**: Grid opacity auto-adjusts when crossing F0:
- Entering negative arena (white background): both grid opacities → 0.6 (visible against white)
- Returning to positive arena (black background): both grid opacities → 0.10 (subtle reference)
- Crossing detected via `state.janus_negative: bool` in all three scale slider handlers

**What changed**:
- [x] `grids.rs` — `build_quadray_plane()` gains `sign` param, `build_quadray_grids()` computes sign from frequency
- [x] `ui.rs` — Janus crossing detection + opacity auto-adjust in frequency, tet edge, and cube edge handlers
- [x] `app_state.rs` — `janus_negative: bool` for crossing detection (added in prior commit)
- [x] 119 tests pass (no new tests — existing grid tests use default positive frequency)

**Complete Janus visual system** (all done):
1. Background: black → white on crossing F0
2. Basis arrows: regular tet → dual tet via sign flip
3. IVM grid: positive ABCD → negative ABCD tessellation
4. Grid opacity: 0.10 → 0.6 for background contrast
5. Polyhedra: tet → dual tet (centrosymmetric solids unchanged)

### P1: Face Rendering — DONE 2026-02-21

**Problem**: All 6 Platonics rendered as wireframe only. Face data (`poly.faces`) existed in `rt_polyhedra/platonic.rs` with correct CCW winding but was unused. No depth buffer existed.

**Solution**: Depth buffer (Depth32Float) + second render pipeline (TriangleList for faces alongside LineList for edges). Fan triangulation for non-triangle faces (quads → 2 triangles, pentagons → 3 triangles).

**Architecture**:
```
Shared vertex buffer (Vertex { quadray, color })
    ├── edge vertices (alpha = 1.0)     → edge_index_buffer  → edge_pipeline (LineList)
    └── face vertices (alpha = opacity)  → face_index_buffer  → face_pipeline (TriangleList)

Both pipelines share: shader module, bind group, depth buffer (Depth32Float)
Draw order: faces FIRST (depth write), edges SECOND (depth bias → float above faces)
```

**Vertex duplication strategy**: Face vertices are duplicated with `alpha = face_opacity` while edge vertices keep `alpha = 1.0`. This avoids shader branching and keeps the existing shader unchanged. Total extra is ~54 vertices at most (trivial).

**Face color strategy — P1**: ABCD vertex interpolation — face vertices inherit `ABCD_COLORS[i % 4]` with face_opacity alpha. Triangular faces show smooth gradients between 3 vertex colors. Future: per-polyhedron color palette (designer-choosable, like JS `rs-color-theory-modal.js`).

**Triangle counts** (all 6 Platonics at F1):

| Polyhedron | Faces | Type | Triangles |
|------------|-------|------|-----------|
| Tetrahedron | 4 | tri | 4 |
| Dual Tet | 4 | tri | 4 |
| Octahedron | 8 | tri | 8 |
| Cube | 6 | quad | 12 |
| Icosahedron | 20 | tri | 20 |
| Dodecahedron | 12 | pent | 36 |
| **All 6** | **54** | — | **84** |

**What changed**:
- [x] `geometry.rs` — `GeometryOutput` struct (vertices, edge_indices, face_indices, bounding_radius), face vertex duplication, fan triangulation
- [x] `main.rs` — depth texture helper, `face_pipeline` (TriangleList, backface cull, depth write), `edge_pipeline` (depth bias -2/-1.0 to float above faces), depth_stencil_attachment, draw order (faces→edges), resize recreates depth texture, egui depth_stencil_format
- [x] `ui.rs` — Show Faces checkbox + Face Opacity slider in Polyhedra section, V/E/F stats in Info
- [x] `app_state.rs` — `show_faces`, `face_opacity`, `face_count` fields
- [x] 4 new tests (123 total): face_indices_triangulated, face_indices_valid_range, faces_hidden_when_toggled_off, face_opacity_in_vertex_alpha
- **No changes to**: `shader.wgsl` (existing color passthrough handles face alpha), `camera.rs`, `rt_math/`, `rt_polyhedra/`, `basis_arrows.rs`, `grids.rs`

### P1: Arrowhead Faces + "Nodes and Faces" UI — DONE 2026-02-21

**Problem**: Basis arrow arrowheads (mini dual tetrahedra) were wireframe only. Face controls lived inside "Polyhedra" section — didn't match JS app's "Nodes and Faces" panel layout.

**Solution**: `build_arrow()` now returns face indices alongside edge indices. Arrowhead vertices already carry the arrow's solid flat color — face rendering inherits this naturally. UI restructured with a separate "Nodes and Faces" collapsible section, stubbing for future node (vertex sphere) rendering.

**What changed**:
- [x] `basis_arrows.rs` — `dual_tet_cartesian()` returns faces, `build_arrow()` returns 3-tuple `(vertices, edge_indices, face_indices)`, public functions updated to aggregate face indices
- [x] `geometry.rs` — arrow face indices fed into `face_indices` buffer (always visible, not gated by `show_faces`)
- [x] `ui.rs` — face controls moved to "Nodes and Faces" collapsible section, stubbed disabled "Nodes" checkbox with "Node rendering — planned" label
- [x] Tests updated for 3-tuple returns, `faces_hidden_when_toggled_off` disables arrows to isolate polyhedra-only test

**Face index counts**: 4 Quadray arrows × 12 face indices = 48, 3 Cartesian arrows × 12 face indices = 36.

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
| **RT math port** (`rt_math/`, `rt_polyhedra/`, 89 → 99 → 104 → 107 → 117 tests) | **Done — 8 files, all Platonics, Wildberger polygons (2026-02-19)** |
| **macOS .app bundle** (bundle.sh + icon) | **Done — ARTexplorer.app launches from Dock (2026-02-19)** |
| **P0 Explorer UI** (egui side panel, orbit camera, all 6 Platonics) | **Done — egui 0.33 + wgpu 27, right-side panel (2026-02-19)** |

### Phase 2: Game Mode (Steps 8–10) — DEFERRED UNTIL CORE APP and FOUNDATIONS are COMPLETED

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
| **P1: Basis arrows (Quadray ABCD + Cartesian XYZ)** | **Done (2026-02-20)** |
| **P1: Camera presets (7 views: Right/Front/Top + A/B/C/D)** | **Done (2026-02-20)** |
| **P1: Ortho projection + Centre button + viewport-aware canvas** | **Done (2026-02-20)** |
| **P1: Grid planes (Cartesian XYZ + IVM Central Angle)** | **Done (2026-02-20)** |
| **P1: Universal alpha blending + grid opacity sliders** | **Done (2026-02-21)** |
| **P1: Quadray-native IVM grid (integer ABCD, eliminate √6/4)** | **Done (2026-02-21)** |
| **P1: Frequency slider (Fuller F1–F12) + edge length sliders** | **Done (2026-02-21)** |
| **P1: Extended camera zoom (proportional scroll, 10000 unit range)** | **Done (2026-02-21)** |
| **P1: Janus Inversion (background + basis arrows + tet→dual)** | **Done (2026-02-21)** |
| **P1: Basis arrow correction (dual→regular tet, per Janus10.tex §3.2)** | **Done (2026-02-21)** |
| **P1: Grid Janus Inversion (negative ABCD + auto-opacity)** | **Done (2026-02-21)** |
| **P1: Face rendering (depth buffer, TriangleList pipeline, fan triangulation)** | **Done (2026-02-21)** |
| **P1: Arrowhead faces + "Nodes and Faces" UI stub** | **Done (2026-02-21)** |
| P1: Node rendering (vertex spheres, opacity) | Pending |
| P1: Coordinate display bar | Pending |
| P2: Thomson great-circle shells | Pending |
| **P2: Geodesic subdivision (Quadray-native, 3 polyhedra × 4 projections)** | **Done (2026-02-21)** |
| P2: View manager + state persistence | Pending |
| P3: Rotor-based orbit camera — eliminate polar singularity ([ARTEX-HAIRYBALL.md](ARTEX-HAIRYBALL.md)) | Research |
| P3: ABCD-to-clip pipeline — eliminate XYZ from shader (RATIONALE §4, §8, §10) | Research |
| P3: Cutplane + projection as ABCD dot products (RATIONALE §10) | Research |
| P3: Wireframe painter's algorithm — depth-sorted 2D, no GPU 3D pipeline (RATIONALE §8) | Research |

### P2: Geodesic Subdivision — DONE 2026-02-21

**First P2 feature.** Quadray-native geodesic subdivision for tetrahedron, octahedron, and icosahedron with four projection modes.

**Key insight (RT-purity upgrade from JS app)**: The JS app subdivides in Cartesian (THREE.Vector3) and "projects to a sphere" using `v.normalize().multiplyScalar(r)`. The native app eliminates the sphere entirely — we **terminate at a target quadrance** in Quadray ABCD space. No Cartesian intermediary.

For zero-sum normalized `[a,b,c,d]` (sum=0), the quadrance from origin is:
```
Q = 4(a² + b² + c² + d²)
```
**ONE √ per vertex** at radius termination. All Q_targets are rational (tet, octa) or phi-algebraic (icosa).

**Q_target values (RT-pure):**

| Polyhedron | OutSphere Q | MidSphere Q | InSphere Q |
|---|---|---|---|
| Tetrahedron | 3 | 1 | 1/3 |
| Octahedron | 4 | 2 | 4/3 |
| Icosahedron | Q_circ | Q_circ·φ²/(φ+2) | Q_circ·(3φ+2)/(3(φ+2)) |

Tet and octa Q_targets are **pure rationals**. Icosa uses phi identities from `phi.rs` (φ²=φ+1, φ⁴=3φ+2).

**What was built**:
- [x] `rt_polyhedra/geodesic.rs` (NEW) — full subdivision algorithm in Quadray ABCD space
  - `ProjectionMode` enum: Off (flat), InSphere, MidSphere, OutSphere
  - `subdivide_triangles()` — barycentric grid with edge/face vertex caching
  - `terminate_at_radius()` — scale vertices to target Q (no sphere)
  - `geodesic_tetrahedron()`, `geodesic_octahedron()`, `geodesic_icosahedron()`
  - 24 tests: Q-norm, vertex counts, Euler, equal radius, face winding
- [x] `rt_polyhedra/mod.rs` — wired geodesic module + re-exports
- [x] `app_state.rs` — per-polyhedron geodesic state (show, freq 1–7, projection mode)
- [x] `ui.rs` — nested sub-controls under parent polyhedron checkboxes
  - Checkbox + frequency slider (1–7) + projection mode selectable labels
  - Only visible when parent polyhedron is enabled
- [x] `geometry.rs` — geodesic replaces base polyhedron when enabled (freq > 1)

**Vertex count formulas** (frequency f, base has V vertices, E edges, F faces):
- `V_geo = V + E(f-1) + F(f-1)(f-2)/2`
- `F_geo = F × f²`
- Icosa freq 3: V=92, F=180. Tet freq 3: V=18, F=36.

**UI layout** (nested under parent polyhedron):
```
☑ Tetrahedron
    ☐ Geodesic        Freq: [●===] 3
        Off  InSphere  MidSphere  OutSphere
```

**Tests**: 160 total (136 existing + 24 geodesic). All passing.

#### P1 → P3 Camera Migration Note

P1 camera presets use **conventional yaw/pitch/distance** stored as `(f32, f32, f32)` — the simplest implementation that works with the existing `OrbitCamera`. This is deliberately pragmatic: we need working camera presets before researching ABCD-native projection.

**P1 design decisions** (informing future P3 migration):

1. **ABCD labeling**: Quadray views are labeled **A, B, C, D** (not QW, QX, QY, QZ). The ABCD convention from §8.1 applies to camera UI, not just geometry.

2. **Both XYZ and Quadray first-class**: The 7 presets live in a flat list — no "primary/secondary" hierarchy, no `if (basis == "tetrahedral")` branching. Top/Front/Right and A/B/C/D are peers.

3. **§10 annotations as comments**: Each preset's stored angles include comments showing the equivalent ABCD 4-vector triplet `(p_x, p_y, p_depth)` from RATIONALE §10. When P3 replaces yaw/pitch with direct 4-vector lookups, the values are already documented inline.

4. **P3 migration path**: Replace `OrbitCamera`'s spherical-to-Cartesian conversion with §8's `ABCD_to_clip = view_proj * [BASIS * Normalize]` matrix, computed once per frame. Presets become stored 4-vector triplets instead of yaw/pitch pairs. The orbit camera interpolates in ABCD coefficient space. The shader reduces to `out.clip_position = abcd_to_clip * in.quadray`.

5. **Singularity-free camera via Quadray Rotors**: The deeper solution to the polar up-vector workaround is to replace yaw/pitch with a `QuadrayRotor` orientation (R in R^4 x Z_2). This eliminates the Hairy Ball singularity topologically rather than patching it. Full analysis, deployment plan, and verification targets in [ARTEX-HAIRYBALL.md](ARTEX-HAIRYBALL.md).

### Phase 4: Native Platform

| Milestone | Status |
|-----------|--------|
| Swift/Metal UI wrapper (menus, preferences) | Pending |
| Mac App Store packaging | Pending |
| Web version continues as free educational tool | Ongoing |

---

*"In Rust, the borrow checker is your co-pilot. In Quadray space, it's your navigator. ARTexplorer was born in the browser — the whole platform grows up native."*
