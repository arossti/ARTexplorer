# ARTexplorer: The SwiftUI Teenager Phase

**When the Rust/Metal geometry engine grows up, it gets a native macOS UI.**

> The egui "baby steps" phase builds the RT math engine, rendering pipeline, and
> geometry features using a Rust-only toolchain. When that core is mature (P1–P2
> complete), we wrap it in SwiftUI for a production-quality Mac app.
>
> This document captures the plan so we don't lose it. Not for now — for when we're ready.
>
> Written February 2026. Current phase: egui prototyping (BABYSTEPS P0 complete).

---

## Why SwiftUI (not egui forever)

| Concern | egui (current) | SwiftUI (future) |
|---------|---------------|------------------|
| Look & feel | "Gamedev overlay" | Native macOS — system fonts, sidebar, inspector |
| 315 controls | Immediate-mode redraws everything each frame | Declarative, retained state, efficient diffing |
| Native integration | Manual (file dialogs, menus, etc.) | Built-in — menus, preferences, Touch Bar, full-screen, multi-window |
| Accessibility | Limited | VoiceOver, keyboard nav, system accessibility for free |
| App Store | Significant packaging work | First-class Xcode target |
| Version coupling | egui-wgpu version pinning headaches | Metal is OS-native, no version drama |
| Dark mode | Manual theme (rgb(20,20,25)) | System dark mode, accent colors, vibrancy |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  SwiftUI App Shell (Xcode project)                      │
│                                                         │
│  ┌──────────────┐   ┌────────────────────────────────┐  │
│  │  Sidebar      │   │  MTKView (Metal viewport)      │  │
│  │  (SwiftUI)    │   │                                │  │
│  │               │   │  Rust rendering core           │  │
│  │  [Polyhedra]  │   │  via C FFI / swift-bridge      │  │
│  │  [Scale]      │   │                                │  │
│  │  [Grids]      │   │  rt_math ──► rt_polyhedra      │  │
│  │  [Views]      │   │      │           │             │  │
│  │  [Thomson]    │   │      ▼           ▼             │  │
│  │  ...          │   │  geometry.rs ──► wgpu/Metal    │  │
│  │               │   │                                │  │
│  ├──────────────┤   └────────────────────────────────┘  │
│  │  Bottom Bar   │                                      │
│  │  (XYZ + ABCD) │                                      │
│  └──────────────┘                                       │
│                                                         │
│  Native menu bar ──── File, Edit, View, Window, Help    │
│  Preferences panel ── SwiftUI Settings scene            │
│  File dialogs ─────── NSOpenPanel / NSSavePanel          │
└─────────────────────────────────────────────────────────┘
```

### What stays in Rust

Everything that matters — the RT-pure engine:

- `rt_math/` — quadrance, spread, Quadray, reflections, polygons, PurePhi, PureRadicals, PureCubics
- `rt_polyhedra/` — all Platonic solids, geodesics, truncation (when ported)
- `geometry.rs` — vertex buffer construction, ABCD colors
- `camera.rs` — orbit camera math (view/projection matrices)
- `shader.wgsl` — ABCD→XYZ conversion on GPU
- Future: `rt_thomson.rs`, `rt_grids.rs`, `rt_geodesic.rs`, etc.

**Rust compiles as a static library** (`cdylib` or `staticlib`) exposing C-compatible functions.

### What moves to Swift

UI chrome only — no geometry, no math:

- Sidebar with collapsible sections (SwiftUI `List` + `DisclosureGroup`)
- Sliders, checkboxes, buttons, color pickers
- Menu bar (File → Import/Export/Save, Edit → Undo/Redo, View → camera presets)
- Preferences window (SwiftUI `Settings` scene)
- File open/save dialogs (native `NSOpenPanel`)
- Bottom coordinate bar
- Window management (title, size, full-screen)

## FFI Boundary

### Option A: `swift-bridge` (recommended)

[swift-bridge](https://github.com/nicklimmern/swift-bridge) generates Swift↔Rust FFI bindings automatically.

```rust
// Rust side
#[swift_bridge::bridge]
mod ffi {
    extern "Rust" {
        type AppState;
        fn create_app_state() -> AppState;
        fn set_show_tetrahedron(state: &mut AppState, show: bool);
        fn set_tet_edge(state: &mut AppState, edge: f32);
        fn build_geometry(state: &AppState) -> GeometryBuffer;
        fn get_view_proj(camera: &OrbitCamera, aspect: f32) -> [f32; 16];
    }
}
```

```swift
// Swift side
let state = create_app_state()
state.set_show_tetrahedron(true)
let geometry = state.build_geometry()
metalView.render(geometry)
```

### Option B: Manual C FFI

More control, more boilerplate. Use `#[no_mangle] extern "C"` functions with opaque pointers.

### The key insight

**`AppState` is already the FFI boundary.** Our current `app_state.rs` is a plain struct with simple types (bool, f32, usize). It maps 1:1 to a Swift struct. The egui UI reads/writes `AppState`; SwiftUI would do the same thing through FFI calls.

## Prerequisites (what to finish in egui first)

Before the SwiftUI migration makes sense, the Rust core needs:

- [ ] **P1 complete**: basis arrows, grids, camera presets, node/face rendering
- [ ] **P2 started**: Thomson shells, geodesics, view management — proves the geometry pipeline handles complex features
- [ ] **State serialization**: serde JSON import/export working in Rust (P2) — the format doesn't change when we swap UI
- [ ] **Clean AppState API**: all geometry controlled through `AppState` mutations → `build_geometry()` — no UI-specific logic in the geometry path

At that point, the Rust core is a self-contained geometry engine with a clean state interface, and wrapping it in SwiftUI is a packaging exercise, not a rewrite.

## Migration Strategy

### Phase T1: Xcode project + embedded Rust library

1. Create Xcode project with SwiftUI app target
2. Build Rust core as `staticlib` via `cargo build --release`
3. Add Rust `.a` file + bridging header to Xcode project
4. Create `MTKView` subclass that calls Rust rendering functions
5. **Milestone**: Same stella octangula rendering, but launched from Xcode

### Phase T2: SwiftUI sidebar replaces egui

1. Port `ui.rs` controls to SwiftUI `List` + `DisclosureGroup`
2. SwiftUI writes to `AppState` through FFI
3. Rust rebuilds geometry on state change, renders to `MTKView`
4. Remove egui dependencies from Rust
5. **Milestone**: All P1 controls working in native SwiftUI sidebar

### Phase T3: Native integration

1. Add menu bar (File, Edit, View, Window, Help)
2. Add preferences panel (SwiftUI `Settings`)
3. Add native file open/save dialogs
4. Keyboard shortcuts via SwiftUI `.keyboardShortcut()`
5. App icon, About panel, App Store metadata
6. **Milestone**: App Store submission candidate

## Learning Resources for Swift

Coming from JavaScript, Swift will feel familiar — more so than Rust did:

| JS concept | Swift equivalent |
|-----------|-----------------|
| `let x = 5` | `let x = 5` (immutable by default, like Rust) |
| `var x = 5` | `var x = 5` (mutable) |
| `function foo(x) {}` | `func foo(x: Int) {}` |
| `x => x * 2` | `{ x in x * 2 }` |
| `class Foo {}` | `class Foo {}` or `struct Foo {}` |
| `console.log()` | `print()` |
| `async/await` | `async/await` (nearly identical) |
| `null` | `nil` (with `Optional<T>`, like Rust's `Option`) |

**Key resources:**
- [SwiftUI tutorials](https://developer.apple.com/tutorials/swiftui) — Apple's official, excellent
- [Hacking with Swift](https://www.hackingwithswift.com/) — practical project-based learning
- [swift-bridge docs](https://chinedufn.github.io/swift-bridge/) — Rust↔Swift FFI

---

## Timeline Estimate

Not dates — prerequisites:

| Gate | Trigger |
|------|---------|
| **Start T1** | P2 geometry features working in egui prototype |
| **Start T2** | T1 milestone hit (Metal rendering from Xcode) |
| **Start T3** | T2 milestone hit (all controls in SwiftUI) |
| **App Store** | T3 complete + beta testing |

---

*"Baby steps in Rust. Teenage years in Swift. The geometry engine stays RT-pure through it all."*
