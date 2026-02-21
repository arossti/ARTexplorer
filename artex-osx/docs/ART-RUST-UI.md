# ARTexplorer Native UI Plan

**Recreating the JS/THREE.js UI in Rust — panel by panel, control by control**

> This document maps every UI section and control from `index.html` to a planned
> native Rust implementation. The order mirrors the HTML file exactly. Each section
> has a priority tier and implementation approach.
>
> **RT-Purity applies here too.** All geometry uses `rt_math/` and `rt_polyhedra/` —
> never classical trig. See RUST-METAL-BABYSTEPS.md § "Agent Handoff" before writing code.
>
> Written February 2026. **Current state: P0 COMPLETE** — egui right-side panel with
> all 6 Platonic solids, orbit camera, scale sliders, FPS counter. wgpu 27 + egui 0.33
> + egui-wgpu 0.33 + egui-winit 0.33. RT math engine: 89 tests passing.

---

## Table of Contents

1. [Architecture: egui over wgpu](#1-architecture-egui-over-wgpu)
2. [Priority Tiers](#2-priority-tiers)
3. [Info Modal (Welcome Screen)](#3-info-modal-welcome-screen)
4. [Coordinates Panel (Bottom Bar)](#4-coordinates-panel-bottom-bar)
5. [Section 1: File](#5-section-1-file)
6. [Section 2: Coordinate Systems](#6-section-2-coordinate-systems)
7. [Section 3: Primitives](#7-section-3-primitives)
8. [Section 3B: Polyhedra](#8-section-3b-polyhedra)
9. [Section 3B2: Experimental Polyhedra](#9-section-3b2-experimental-polyhedra)
10. [Section 3C: Planar Matrices](#10-section-3c-planar-matrices)
11. [Section 3D: Radial Matrices](#11-section-3d-radial-matrices)
12. [Section 3E: Helices](#12-section-3e-helices)
13. [Section 4: Controls](#13-section-4-controls)
14. [Section 5: Scale](#14-section-5-scale)
15. [Section 6: Nodes and Faces](#15-section-6-nodes-and-faces)
16. [Section 7: View Manager](#16-section-7-view-manager)
17. [Section 8: Papercut](#17-section-8-papercut)
18. [Section 8B: Projections](#18-section-8b-projections)
19. [Section 9: Geometry Info](#19-section-9-geometry-info)
20. [Section 10: Math Demos](#20-section-10-math-demos)
21. [Context Menu](#21-context-menu)
22. [Keyboard Shortcuts](#22-keyboard-shortcuts)
23. [Implementation Phases](#23-implementation-phases)

---

## 1. Architecture: egui over wgpu

The native UI uses **egui** (immediate-mode GUI) rendered alongside the 3D viewport via wgpu. This is the standard approach in the Rust gamedev ecosystem.

```
┌─────────────────────────────────────────────────┐
│  wgpu 3D viewport    │  egui side panel (right) │
│                      │                           │
│  ┌────────────────┐  │  [Polyhedra] ✓            │
│  │  Metal render   │  │  [Scale] ✓               │
│  │  (all 6 solids) │  │  [Info / FPS] ✓          │
│  └────────────────┘  │  [Coordinate Systems]     │
│                      │  [View Manager]           │
│                      │  ...                      │
├──────────────────────┴───────────────────────────┤
│  egui bottom panel (coordinates bar) — P1        │
└──────────────────────────────────────────────────┘
```

> **✓ = implemented in P0** (2026-02-19)

### Dependencies (INSTALLED)

```toml
wgpu = "27"                  # GPU rendering — pinned for egui-wgpu 0.33 compat (was 28)
egui = "0.33"                # Immediate-mode GUI ✓
egui-wgpu = "0.33"           # wgpu integration ✓
egui-winit = "0.33"          # winit event integration ✓
glam = "0.29"                # Camera matrices (Mat4, Vec3) ✓
# Future:
serde = { version = "1", features = ["derive"] }  # State serialization (P2)
serde_json = "1"             # JSON import/export (P2)
```

> **Note**: egui-wgpu 0.33 requires wgpu ^27 (not 28). The wgpu downgrade was done in Step 7 of BABYSTEPS.

### Key design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| GUI framework | egui (not iced, not SwiftUI) | Renders directly on our wgpu surface; no separate window system |
| Panel layout | **Right sidebar** + bottom bar | Mirrors the JS app's HTML layout (right-side panel) |
| State model | Single `AppState` struct | egui is immediate-mode: UI reads/writes state each frame |
| Collapsible sections | `egui::CollapsingHeader` | Matches the JS accordion panels |
| Color scheme | Dark theme (panel_fill rgb(20,20,25)) | Matches ARTexplorer identity |
| Event routing | egui first, then camera | `egui_winit::State::on_window_event()` → if consumed, skip camera |
| Rendering | Two-layer single render pass | 3D wireframe first, egui overlay via `forget_lifetime()` |

---

## 2. Priority Tiers

| Tier | Scope | When |
|------|-------|------|
| **P0** | Core viewport + basic polyhedra | Next (Step 7-8) |
| **P1** | Coordinate systems, scale, camera views | After P0 |
| **P2** | All Platonic polyhedra + geodesics + Thomson | Feature parity push |
| **P3** | Primitives, matrices, helices, papercut, projections | Full feature set |
| **P4** | Math demos, context menu, advanced features | Polish |

---

## 3. Info Modal (Welcome Screen)

**JS**: `#info-modal-overlay` — modal with keyboard shortcuts, credits, RT explanation.

**Priority**: P1

### Native plan

```rust
// Show on first launch (persist "seen" flag via serde)
struct WelcomeState {
    shown: bool,
    dismissed: bool,
}
```

| Control | JS ID | egui Widget | Notes |
|---------|-------|-------------|-------|
| Modal overlay | `#info-modal-overlay` | `egui::Window` (modal) | Centered, semi-transparent backdrop |
| Close button | `#info-modal-close` | `ui.button("Get Started")` | Sets `dismissed = true` |
| Keyboard shortcuts | — | Static text grid | `egui::Grid` with monospace labels |
| Credits | — | Static text | Scrollable if needed |

---

## 4. Coordinates Panel (Bottom Bar)

**JS**: `#coordinates-panel` — XYZ + WXYZ position, rotation (degrees + spread), coordinate mode.

**Priority**: P0 (position display) / P2 (full editing)

### Native plan

```rust
struct CoordinatesState {
    // Position
    xyz: [f64; 3],
    abcd: [f64; 4],           // ABCD in native (was WXYZ in JS)

    // Mode
    coord_mode: CoordMode,     // Absolute | Relative | Group
    scale: f64,

    // Rotation (display both representations)
    rot_xyz_degrees: [f64; 3],
    rot_xyz_spread: [f64; 3],
    rot_abcd_degrees: [f64; 4],
    rot_abcd_spread: [f64; 4],
}

enum CoordMode { Absolute, Relative, Group }
```

| Control | JS ID | egui Widget | Tier |
|---------|-------|-------------|------|
| X/Y/Z position | `#coordX/Y/Z` | `DragValue` (f64, 4 decimals) | P0 (display), P2 (edit) |
| Mode toggle | `#coordModeAbsolute/Relative/Group` | `ui.selectable_value()` | P2 |
| Scale | `#coordScale` | `DragValue` | P1 |
| A/B/C/D position | `#coordQW/X/Y/Z` | `DragValue` (f64, 4 decimals) | P0 |
| XYZ rotation (deg) | `#rotX/Y/ZDegrees` | `DragValue` | P2 |
| XYZ rotation (spread) | `#rotX/Y/ZSpread` | `DragValue` | P2 |
| ABCD rotation (deg) | `#rotQW/X/Y/ZDegrees` | `DragValue` | P2 |
| ABCD rotation (spread) | `#rotQW/X/Y/ZSpread` | `DragValue` | P2 |

**ABCD Note**: JS uses WXYZ labels. Native uses ABCD. The coordinates panel displays both Cartesian (XYZ) and Quadray (ABCD) simultaneously, with live conversion via `Quadray::to_cartesian()` and `Quadray::from_cartesian()`.

---

## 5. Section 1: File

**JS**: Import/Export/Save buttons with Ctrl/Cmd shortcuts.

**Priority**: P2

### Native plan

```rust
struct FileState {
    current_file: Option<PathBuf>,
    unsaved_changes: bool,
}
```

| Control | JS ID | egui Widget | Tier |
|---------|-------|-------------|------|
| Import | `#importBtn` | `ui.button("Import")` + `rfd::FileDialog` | P2 |
| Export | `#exportBtn` | `ui.button("Export")` + `rfd::FileDialog` | P2 |
| Save | `#saveBtn` | `ui.button("Save")` | P2 |

**Format**: JSON via serde, compatible with JS app's export format where possible.

---

## 6. Section 2: Coordinate Systems

**JS**: Basis visibility, grid planes, tessellation sliders, UCS orientation.

**Priority**: P1 (basis + grids) / P2 (full IVM + polar)

### Native plan

```rust
struct CoordSystemState {
    // Basis visibility
    show_cartesian_basis: bool,    // XYZ arrows
    show_quadray_basis: bool,      // ABCD arrows (default: true)

    // Cartesian grid planes
    plane_xy: bool,
    plane_xz: bool,
    plane_yz: bool,
    cartesian_mode: GridMode,      // Uniform | Polar
    cartesian_tess: u32,           // 10..100, step 10

    // IVM / Central Angle grids (6 Quadray planes)
    ivm_planes: [bool; 6],        // AB, AC, AD, BC, BD, CD
    quadray_mode: GridMode,
    quadray_tess: u32,             // 12..144, step 12

    // Polar-specific
    ngon_sides: u32,               // 3..128
    show_radial_lines: bool,

    // Scene orientation
    ucs: UCS,                      // ZUp | YUp | StruppiUp
}

enum GridMode { Uniform, Polar }
enum UCS { ZUp, YUp, StruppiUp }
```

| Control | JS ID | egui Widget | Tier |
|---------|-------|-------------|------|
| Show Cartesian Basis | `#showCartesianBasis` | `ui.checkbox()` | P1 |
| Show Quadray Basis | `#showQuadray` | `ui.checkbox()` | P0 |
| Cartesian planes XY/XZ/YZ | `#planeXY/XZ/YZ` | `ui.checkbox()` x3 | P1 |
| Cartesian mode | `data-cartesian-mode` | `ui.selectable_value()` | P2 |
| Cartesian tessellation | `#cartesianTessSlider` | `ui.add(Slider::new(...))` | P1 |
| IVM planes (6) | `#planeIvmWX..YZ` | `ui.checkbox()` x6 | P2 |
| Quadray mode | `data-quadray-mode` | `ui.selectable_value()` | P2 |
| Quadray tessellation | `#quadrayTessSlider` | `ui.add(Slider::new(...))` | P2 |
| N-gon slider | `#nGonSlider` | `ui.add(Slider::new(3..=128))` | P2 |
| Radial lines | `#showRadialLines` | `ui.checkbox()` | P2 |
| UCS toggle | `data-ucs` | `ui.selectable_value()` x3 | P1 |

**Rendering**: Grid planes are generated in `rt_grids.rs` (to be ported). Each grid plane is a set of line segments uploaded to the GPU as a separate vertex buffer.

---

## 7. Section 3: Primitives

**JS**: Point, Line, Polygon, Prism, Cone, Penrose Tiling — each with extensive sub-controls.

**Priority**: P3 (except Polygon → P2 for RT demonstration)

### 7.1 Point

| Control | JS ID | egui Widget | Tier |
|---------|-------|-------------|------|
| Show Point | `#showPoint` | `ui.checkbox()` | P3 |

### 7.2 Line

| Control | JS ID | egui Widget | Tier |
|---------|-------|-------------|------|
| Show Line | `#showLine` | `ui.checkbox()` | P3 |
| Quadrance | `#lineQuadrance` | `DragValue` | P3 |
| Length | `#lineLength` | `DragValue` (computed: √Q) | P3 |
| Weight | `#lineWeight` | `Slider(1..=10)` | P3 |

### 7.3 Polygon

| Control | JS ID | egui Widget | Tier |
|---------|-------|-------------|------|
| Show Polygon | `#showPolygon` | `ui.checkbox()` | P2 |
| Sides | `#polygonSides` | `Slider(3..=24)` + `DragValue` | P2 |
| Method info | `#polygonMethodInfo` | `ui.label()` (auto: "algebraic"/"cubic"/"transcendental") | P2 |
| Quadrance (Q_R) | `#polygonQuadrance` | `DragValue` | P2 |
| Radius (R) | `#polygonRadius` | `DragValue` (computed: √Q) | P2 |
| Show Face | `#polygonShowFace` | `ui.checkbox()` | P2 |
| Edge Weight | `#polygonEdgeWeight` | `Slider(1..=10)` | P2 |
| Enable Tiling | `#polygonEnableTiling` | `ui.checkbox()` | P3 |
| Tiling Generations | `#polygonTilingGenerations` | `Slider(1..=5)` | P3 |

**Note**: The polygon uses `rt_math::polygon::n_gon_vertices()` — already ported! This is a great early demo.

### 7.4 Prism

| Control | JS ID | egui Widget | Tier |
|---------|-------|-------------|------|
| Show Prism | `#showPrism` | `ui.checkbox()` | P3 |
| Sides | `#prismSides` | `Slider(1..=24)` | P3 |
| Base Q / R | `#prismBaseQuadrance/Radius` | `DragValue` x2 | P3 |
| Height Q / H | `#prismHeightQuadrance/Height` | `DragValue` x2 | P3 |
| Show Faces | `#prismShowFaces` | `ui.checkbox()` | P3 |

### 7.5 Cone

| Control | JS ID | egui Widget | Tier |
|---------|-------|-------------|------|
| Show Cone | `#showCone` | `ui.checkbox()` | P3 |
| Sides | `#coneSides` | `DragValue(3..=24)` | P3 |
| Base Q / R | `#coneBaseQuadrance/Radius` | `DragValue` x2 | P3 |
| Height Q / H | `#coneHeightQuadrance/Height` | `DragValue` x2 | P3 |
| Show Faces | `#coneShowFaces` | `ui.checkbox()` | P3 |

### 7.6 Penrose Tiling

| Control | JS ID | egui Widget | Tier |
|---------|-------|-------------|------|
| Show Penrose | `#showPenroseTiling` | `ui.checkbox()` | P3 |
| Tile type | `penroseTileType` | `ui.radio_value()` x4 | P3 |
| Quadrance | `#penroseQuadrance` | `DragValue` | P3 |
| Edge Weight | `#penroseEdgeWeight` | `Slider(1..=10)` | P3 |
| Show Face | `#penroseShowFace` | `ui.checkbox()` | P3 |
| Enable Deflation | `#penroseTilingEnabled` | `ui.checkbox()` | P3 |
| Seed pattern | `penroseSeed` | `ui.radio_value()` x4 | P3 |
| Generations | `#penroseGenerations` | `Slider(0..=6)` | P3 |

---

## 8. Section 3B: Polyhedra

**JS**: The core — 8 polyhedra with geodesic variants, truncation, and face tiling.

**Priority**: P0 (tet + dual + cube) / P1 (octa + icosa + dodeca) / P2 (geodesic + truncation)

### State structure

```rust
struct PolyhedronState {
    visible: bool,
    geodesic: Option<GeodesicState>,
    truncation: Option<TruncationState>,
    face_tiling: Option<FaceTilingState>,
}

struct GeodesicState {
    enabled: bool,
    frequency: u32,           // 1..7
    projection: SphereProjection,
}

struct TruncationState {
    enabled: bool,
    factor: f64,              // 0.0..0.5
}

enum SphereProjection { Off, InSphere, MidSphere, OutSphere }
```

### Polyhedra controls

| Polyhedron | JS ID | Tier | Geodesic | Truncation | Face Tiling |
|------------|-------|------|----------|------------|-------------|
| Hexahedron (Cube) | `#showCube` | P0 | — | — | — |
| Tetrahedron | `#showTetrahedron` | P0 | P2 (freq 1-7, projection) | P2 (0→½) | — |
| Tetrahedron Dual | `#showDualTetrahedron` | P0 | P2 | P2 | — |
| Octahedron | `#showOctahedron` | P1 | P2 | — | — |
| Icosahedron | `#showIcosahedron` | P1 | P2 | — | P3 |
| Dodecahedron | `#showDodecahedron` | P1 | — | — | P3 (pentagon tiling) |
| Icosahedron Dual | `#showDualIcosahedron` | P1 | P2 | — | — |
| Cuboctahedron (VE) | `#showCuboctahedron` | P1 | — | — | — |
| Rhombic Dodecahedron | `#showRhombicDodecahedron` | P2 | — | — | — |

**Rendering per polyhedron** (each needs):
- Wireframe edges (line topology — already working)
- Vertex nodes (sphere geometry — P1)
- Face meshes (triangle fill with opacity — P1)
- ABCD vertex coloring (already working)

**Note**: Geometry generators for tet, dual_tet, cube, octa, icosa, dodeca are already ported in `rt_polyhedra/platonic.rs`. The rendering pipeline uses `geometry::build_visible_geometry()` which iterates all 6 solids based on `AppState` toggles — **done in P0**. Remaining work: node spheres (P1), face meshes with opacity (P1), geodesic subdivision (P2), truncation (P2).

---

## 9. Section 3B2: Experimental Polyhedra

**JS**: Quadray demonstrators, prime polygon projections, Thomson polyhedra.

**Priority**: P2 (Quadray demos) / P2 (Thomson) / P3 (prime projections)

### 9.1 Quadray Demonstrators

| Control | JS ID | Tier |
|---------|-------|------|
| Quadray Tetrahedron (4D) | `#showQuadrayTetrahedron` | P2 |
| Quadray Tet Deformed | `#showQuadrayTetraDeformed` | P3 |
| Quadray Cuboctahedron | `#showQuadrayCuboctahedron` | P2 |
| Quadray Octahedron | `#showQuadrayOctahedron` | P2 |
| Quadray Truncated Tet | `#showQuadrayTruncatedTet` | P2 |
| Quadray Stella Octangula | `#showQuadrayStellaOctangula` | P0 (already rendering!) |
| Zero-sum normalize toggle | Various | P2 |

### 9.2 Prime Polygon Projections

| Control | JS ID | Tier |
|---------|-------|------|
| Truncated Tet (5-gon) | `#showPrimeTruncTet` | P3 |
| Compound TruncTet+Tet | `#showPrimeCompoundTet` | P3 |
| Compound TruncTet+Icosa | `#showPrimeCompoundIcosa` | P3 |
| Geodesic Tet f=2 (7-gon) | `#showPrimeGeoTetF2` | P3 |
| Geodesic Tet f=4 (11/13-gon) | `#showPrimeGeoTetF4` | P3 |

### 9.3 Thomson Polyhedra

```rust
struct ThomsonState {
    enabled: bool,
    ngon: u32,              // 3..12
    rotation: f64,          // 0..360 (degrees, converted internally)
    face_planes: bool,
    edge_planes: bool,
    show_faces: bool,
    show_hull_edges: bool,
    jitterbug: JitterbugState,
}

struct JitterbugState {
    playing: bool,
    bounce: bool,
    t: f64,                 // 0..1 animation parameter
}
```

| Thomson Variant | JS ID | Tier | Special Controls |
|-----------------|-------|------|------------------|
| Tetrahedron | `#showThomsonTetrahedron` | P2 | N-gon, rotation, face/edge planes, jitterbug |
| Octahedron | `#showThomsonOctahedron` | P2 | N-gon, rotation, jitterbug |
| Cube | `#showThomsonCube` | P2 | N-gon, rotation, coord/diagonal planes, jitterbug |
| Icosahedron | `#showThomsonIcosahedron` | P2 | N-gon, rotation, coord/edge mirror planes, jitterbug |

**Dependencies**: Thomson polyhedra require `rt_thomson.rs` (great-circle shells) — not yet ported. Port priority: P2.

---

## 10. Section 3C: Planar Matrices

**JS**: Space-filling arrays of polyhedra (IVM lattice).

**Priority**: P3

```rust
struct MatrixState {
    enabled: bool,
    size: u32,              // 1..10
    rotate_45: bool,
    // Matrix-specific options
    colinear_edges: bool,   // octahedral only
    face_coplanar: bool,    // rhombic dodec only
}
```

| Matrix Type | JS ID | Tier |
|-------------|-------|------|
| Hexahedral (Cube) | `#showCubeMatrix` | P3 |
| Tetrahedral | `#showTetMatrix` | P3 |
| Octahedral | `#showOctaMatrix` | P3 |
| Cuboctahedral (VE) | `#showCuboctahedronMatrix` | P3 |
| Rhombic Dodecahedral | `#showRhombicDodecMatrix` | P3 |

---

## 11. Section 3D: Radial Matrices

**JS**: Frequency-based radial arrays.

**Priority**: P3

```rust
struct RadialMatrixState {
    enabled: bool,
    frequency: u32,         // 1..5 (displayed as F1, F3, F5...)
    // Type-specific options
    space_fill: bool,       // cube only
    ivm_mode: bool,         // tet only (fill oct voids)
    ivm_scale: bool,        // octa only (match tet faces)
}
```

| Matrix Type | JS ID | Tier |
|-------------|-------|------|
| Hexahedral Radial | `#showRadialCubeMatrix` | P3 |
| Tetrahedral Radial | `#showRadialTetrahedronMatrix` | P3 |
| Octahedral Radial | `#showRadialOctahedronMatrix` | P3 |
| Cuboctahedral Radial (VE) | `#showRadialCuboctahedronMatrix` | P3 |
| Rhombic Dodec Radial | `#showRadialRhombicDodecMatrix` | P3 |

---

## 12. Section 3E: Helices

**JS**: Three tetrahelix variants with complex strand/chirality controls.

**Priority**: P3

### Tetrahelix variants

| Helix Type | JS ID | Tier | Key Controls |
|------------|-------|------|-------------|
| Tetrahelix 1 (Toroidal) | `#showTetrahelix1` | P3 | Count (1-48), axis (ABCD) |
| Tetrahelix 2 (Linear) | `#showTetrahelix2` | P3 | Count (1-145), axis, direction(+/-), strands(1-4), mode(zipped/unzipped) |
| Tetrahelix 3 (Octahedral) | `#showTetrahelix3` | P3 | Count (1-96), 8 strand toggles (A-H), 8 chirality toggles |

---

## 13. Section 4: Controls

**JS**: Tool mode, grid snapping, object snaps, edit actions, history.

**Priority**: P1 (camera orbit) / P2 (selection + tools) / P3 (snapping + editing)

```rust
struct ControlState {
    tool: Tool,
    grid_snap: GridSnap,
    object_snaps: ObjectSnaps,
    selection: Vec<InstanceId>,
}

enum Tool { Move, Scale, Rotate }
enum GridSnap { Free, XYZ, ABCD }

struct ObjectSnaps {
    vertex: bool,
    edge: bool,
    face: bool,
}
```

| Control | JS ID | egui Widget | Tier |
|---------|-------|-------------|------|
| Tool mode (Move/Scale/Rotate) | `data-gumball-tool` | `ui.selectable_value()` x3 | P2 |
| Grid snap (Free/XYZ/ABCD) | `#snapFree/XYZ/WXYZ` | `ui.selectable_value()` x3 | P3 |
| Object snaps | `#snapVertex/Edge/Face` | `ui.toggle_value()` x3 | P3 |
| Selection count | `#selectionCount` | `ui.label()` | P2 |
| Deform/Group/Connect/Disconnect | Various | `ui.button()` (disabled when no selection) | P4 |
| Undo/Redo | `#undoBtn/redoBtn` | `ui.button()` | P2 |
| NOW button | `#nowButton` | `ui.button("NOW")` | P4 |

---

## 14. Section 5: Scale

**JS**: Global scale sliders for cube edge and tetrahedron edge.

**Priority**: P0

```rust
struct ScaleState {
    cube_edge: f64,         // -3.6..3.6 (4D±), default 1.4
    tet_edge: f64,          // -5.0..5.0 (4D±), default 2.0
}
```

| Control | JS ID | egui Widget | Tier |
|---------|-------|-------------|------|
| Cube Edge (4D±) | `#scaleSlider` | `Slider::new(-3.6..=3.6)` | P0 |
| Tet Edge (4D±) | `#tetScaleSlider` | `Slider::new(-5.0..=5.0)` | P0 |

**Note**: Negative values invert the polyhedron (4D inversion through the origin). The slider directly controls the `half_size` parameter passed to `rt_polyhedra` generators.

---

## 15. Section 6: Nodes and Faces

**JS**: Visual options for vertex spheres and face transparency.

**Priority**: P1

```rust
struct VisualState {
    node_size: u32,         // 0..8
    node_geometry: NodeGeometry,
    node_flat_shading: bool,
    face_opacity: f64,      // 0.0..1.0 (default 0.35)
    node_opacity: f64,      // 0.0..1.0 (default 0.60)
}

enum NodeGeometry {
    Classical,              // Smooth spheres
    Geodesic(u32),          // 1f..4f geodesic spheres
}
```

| Control | JS ID | egui Widget | Tier |
|---------|-------|-------------|------|
| Node size | `#nodeSizeSlider` | `Slider::new(0..=8)` | P1 |
| Node geometry | `#nodeGeomClassical/RT` | Button + ComboBox | P2 |
| Faceted nodes | `#nodeFlatShading` | `ui.checkbox()` | P2 |
| Face opacity | `#opacitySlider` | `Slider::new(0.0..=1.0)` | P1 |
| Node opacity | `#nodeOpacitySlider` | `Slider::new(0.0..=1.0)` | P1 |

---

## 16. Section 7: View Manager

**JS**: Camera projection, preset views, view capture/restore, animation.

**Priority**: P1 (camera + presets) / P2 (capture + animation)

```rust
struct ViewState {
    projection: Projection,
    saved_views: Vec<SavedView>,
    sort_by: ViewSort,
}

enum Projection { Perspective, Orthographic }
enum ViewSort { Name, Axis, Date }

struct SavedView {
    name: String,
    camera_pos: [f64; 3],
    camera_target: [f64; 3],
    projection: Projection,
    scene_state: Option<SceneSnapshot>,
    timestamp: u64,
}
```

| Control | JS ID | egui Widget | Tier |
|---------|-------|-------------|------|
| Perspective/Ortho | `#cameraPerspective/Orthographic` | `ui.selectable_value()` | P1 |
| Centre camera | `#cameraCentre` | `ui.button()` | P1 |
| XYZ views (X/Y/Z-Down/Z-Up/Axo) | `#viewX/Y/ZDown/ZUp/Axo` | `ui.button()` x5 | P1 |
| ABCD views | `#viewQuadQW/QX/QY/QZ` | `ui.button()` x4 | P1 |
| View name input | `#viewNameInput` | `ui.text_edit_singleline()` | P2 |
| Save view | `#saveViewBtn` | `ui.button("Save")` | P2 |
| Views table | `#viewsTableBody` | `egui::Grid` or `TableBuilder` | P2 |
| Import/Export views | `#importViewsBtn/exportAllViewsBtn` | `ui.button()` x2 | P2 |
| SVG export | `#downloadSelectedBtn` | `ui.button("SVG")` | P3 |
| Animation preview | `#previewAnimationBtn` | `ui.button("Play")` | P3 |
| Batch export | `#exportBatchBtn` | `ui.button("Batch")` | P4 |

---

## 17. Section 8: Papercut

**JS**: Cut-plane based section views with print mode.

**Priority**: P3

```rust
struct PapercutState {
    enabled: bool,
    line_weight: u32,       // 1..10
    backface_culling: bool,
    print_mode: bool,       // B&W mode
    cut_plane: CutPlaneState,
}

struct CutPlaneState {
    enabled: bool,
    inverted: bool,
    axis: CutAxis,
    snap_xyz: bool,
    snap_abcd: bool,
    section_nodes: bool,
    high_res_nodes: bool,
    sheet_size: SheetSize,
}

enum CutAxis { X, Y, Z, A, B, C, D }
enum SheetSize { A4, Letter, A3, Custom }
```

| Control | JS ID | egui Widget | Tier |
|---------|-------|-------------|------|
| Cut line weight | `#cutplaneLineWeight` | `Slider(1..=10)` | P3 |
| Backface culling | `#backfaceCulling` | `ui.checkbox()` | P3 |
| Print mode | `#enablePrintMode` | `ui.checkbox()` | P3 |
| Enable cut plane | `#enableCutPlane` | `ui.checkbox()` | P3 |
| Invert | `#invertCutPlane` | `ui.checkbox()` | P3 |
| Axis selection | `#cutplaneAxisX/Y/Z/QW/QX/QY/QZ` | `ui.selectable_value()` x7 | P3 |
| Sheet size | `#fitA4/Letter/A3/Custom` | `ui.selectable_value()` x4 | P3 |

---

## 18. Section 8B: Projections

**JS**: Stereographic-style projections onto a plane.

**Priority**: P3

```rust
struct ProjectionState {
    enabled: bool,
    show_rays: bool,
    show_interior: bool,
    show_ideal_ngon: bool,
    distance: f64,          // 1.0..20.0
    axis: ProjectionAxis,
}
```

| Control | JS ID | egui Widget | Tier |
|---------|-------|-------------|------|
| Enable projection | `#enableProjection` | `ui.checkbox()` | P3 |
| Show rays | `#projectionShowRays` | `ui.checkbox()` | P3 |
| Show interior | `#projectionShowInterior` | `ui.checkbox()` | P3 |
| Show ideal n-gon | `#projectionShowIdeal` | `ui.checkbox()` | P3 |
| Plane distance | `#projectionDistance` | `Slider(1.0..=20.0)` | P3 |
| Axis selection | `#projectionAxisX/Y/Z/QW/QX/QY/QZ` | `ui.selectable_value()` x7 | P3 |
| Info display | `#projectionInfo` | `ui.label()` | P3 |

---

## 19. Section 9: Geometry Info

**JS**: Live display of vertex/edge/face counts and performance stats.

**Priority**: P1

```rust
struct GeometryInfo {
    // Per-polyhedron (from PolyhedronData)
    poly_vertices: usize,
    poly_edges: usize,
    poly_faces: usize,

    // Scene totals
    total_vertices: usize,
    total_edges: usize,
    total_faces: usize,
    total_triangles: usize,

    // Performance
    calc_time_ms: f64,
    node_time_ms: f64,
    fps: f64,
}
```

| Control | JS ID | egui Widget | Tier |
|---------|-------|-------------|------|
| Polyhedra stats | `#polyhedraStats` | `ui.label()` (formatted) | P1 |
| Total V/E/F/T | `#totalVertices/Edges/Faces/Triangles` | `ui.label()` x4 | P1 |
| Calc time | `#perfCalcTime` | `ui.label()` | P1 |
| FPS | `#perfFPS` | `ui.label()` | P0 |
| Advanced logging | `#enableAdvancedLogging` | `ui.checkbox()` | P3 |

---

## 20. Section 10: Math Demos

**JS**: Links to demo pages (separate HTML files).

**Priority**: P4

In the native app, these become embedded panels or separate windows rather than separate HTML pages.

| Demo | JS ID | Native Approach | Tier |
|------|-------|-----------------|------|
| Quadrance | `#open-quadrance-demo` | egui panel with interactive diagram | P4 |
| Cross Product | `#open-cross-demo` | egui panel | P4 |
| Weierstrass | `#open-weierstrass-demo` | egui panel | P4 |
| Gravity Numberline | `#open-gravity-demo` | egui panel | P4 |
| Color Theory | `#open-color-theory-modal` | egui modal | P4 |
| Spread-Quadray Rotors | `#open-rotor-demo` | egui panel | P4 |
| 4D± Gravity + Inversion | `#open-4d-drop-demo` | egui panel | P4 |
| Prime Projections | `#open-prime-projections-demo` | egui panel | P4 |

---

## 21. Context Menu

**JS**: Right-click context menu with tool mode, snapping, editing.

**Priority**: P2

```rust
// egui supports context menus natively
response.context_menu(|ui| {
    ui.label(&format!("Selected: {}", name));
    ui.separator();
    // Tool mode
    ui.selectable_value(&mut state.tool, Tool::Move, "Move");
    // ... etc
});
```

---

## 22. Keyboard Shortcuts

**JS**: Various keyboard shortcuts handled in `rt-init.js`.

**Priority**: P1 (camera) / P2 (editing)

| Shortcut | Action | Tier |
|----------|--------|------|
| Left-click + drag | Orbit camera | P0 |
| Right-click | Context menu | P2 |
| Middle-click + drag | Pan camera | P1 |
| Scroll wheel | Zoom | P0 |
| ESC | Deselect | P2 |
| Delete | Remove selected | P2 |
| Cmd/Ctrl+Z | Undo | P2 |
| Cmd/Ctrl+Shift+Z | Redo | P2 |
| Cmd/Ctrl+O | Import | P2 |
| Cmd/Ctrl+E | Export | P2 |
| Cmd/Ctrl+S | Save | P2 |

---

## 23. Implementation Phases

### Phase P0: Core Viewport — DONE (2026-02-19)

**Goal**: egui side panel + 3D viewport coexisting. Basic polyhedra toggles.

**Actual module structure** (flat files, not nested `ui/` directory):
- `src/app_state.rs` — `AppState` struct (polyhedra toggles, scale, FPS, geometry stats, dirty flag)
- `src/ui.rs` — `configure_theme()` + `draw_ui()` (right-side panel, collapsible sections)
- `src/geometry.rs` — `Vertex` struct, `ABCD_COLORS`, `build_visible_geometry()` for all 6 solids
- `src/camera.rs` — `OrbitCamera` (yaw/pitch/distance, drag orbit, scroll zoom, `view_proj()` via glam)

**Deliverables**:
- [x] Add egui 0.33 + egui-wgpu 0.33 + egui-winit 0.33 dependencies (wgpu downgraded 28→27)
- [x] Right-side panel with collapsible "Polyhedra" section
- [x] Checkboxes for all 6 Platonic solids (tet, dual tet, cube, octa, icosa, dodeca)
- [x] Scale sliders (tet edge 0.1–5.0, cube edge 0.1–3.6)
- [x] FPS counter + V/E stats in "Info" collapsible section
- [x] Mouse orbit camera (left-drag rotate, scroll zoom, egui event routing)
- [x] Dark theme (panel_fill rgb(20,20,25), window_fill rgb(25,25,30))
- [x] Dynamic geometry rebuild (dirty flag → recreate vertex/index buffers)
- [x] .app bundle rebuilt and verified from Dock

### Phase P1: Core Features (Next)

**Goal**: Basis arrows, grids, camera presets, node/face rendering, coordinates bar.

**Starting point**: P0 gives us the egui panel, orbit camera, all 6 Platonic wireframes, scale sliders. P1 adds visual richness and the coordinate display.

**New/modified files**:
- `src/geometry.rs` — extend with basis arrow geometry, grid line generation, node sphere generation
- `src/camera.rs` — add `set_view_preset()` for named camera positions (X, Y, Z, Axo, A, B, C, D)
- `src/ui.rs` — add new collapsible sections for Coordinate Systems, Nodes & Faces, View Manager
- `src/app_state.rs` — add fields for basis visibility, grid planes, node/face settings, projection mode
- `src/shader.wgsl` — may need alpha blending support for face opacity (new fragment shader variant)

**Deliverables** (in suggested implementation order):
- [ ] **Basis arrows**: Cartesian XYZ (RGB) + Quadray ABCD (Yellow/Red/Blue/Green) — line segments from origin, toggleable via checkboxes
- [ ] **Cuboctahedron + Rhombic Dodecahedron** — add to polyhedra list (generators exist in `rt_polyhedra`, need UI toggles)
- [ ] **Camera presets**: buttons for X, Y, Z-Down, Z-Up, Axo, A, B, C, D views — each sets `OrbitCamera` yaw/pitch to known values
- [ ] **Perspective/Orthographic toggle** — switch between `glam::Mat4::perspective_rh()` and `glam::Mat4::orthographic_rh()`
- [ ] **Node rendering**: vertex spheres using icosahedron subdivision, size slider (0–8), node opacity slider (0.0–1.0)
  - Requires: new render pipeline with triangle topology + depth buffer
  - Per-vertex sphere instances at each polyhedron vertex
- [ ] **Face rendering**: translucent triangle fill for polyhedra faces, opacity slider (0.0–1.0)
  - Requires: alpha blending in render pipeline, face winding (CCW for outward normals)
  - New `build_face_geometry()` alongside existing `build_visible_geometry()` (edges)
- [ ] **Grid planes** (XY, XZ, YZ): port from `rt-grids.js` — line segments uploaded as separate vertex buffer
  - Checkboxes for each plane, tessellation slider (10–100, step 10)
- [ ] **Coordinates bottom bar**: `egui::TopBottomPanel::bottom()` showing XYZ + ABCD position (read-only in P1)
  - Display cursor-world intersection or camera target position
- [ ] **Geometry info enhancement**: per-polyhedron V/E/F breakdown, total scene stats
- [ ] **Middle-click pan**: extend OrbitCamera with pan (translate target point)

**Implementation notes**:
- Node + face rendering require a **depth buffer** (currently not used — wireframe-only doesn't need it). Add a depth texture to the render pipeline.
- Face opacity requires **alpha blending**: sort transparent faces back-to-front, or use order-independent transparency. Start simple with `BlendState::ALPHA_BLENDING` and accept minor artifacts.
- Basis arrows are just additional line segments appended to the existing wireframe vertex/index buffers — no new pipeline needed.
- Camera presets: ABCD views point the camera at the origin from the direction of each Quadray basis vector (A=Yellow, B=Red, C=Blue, D=Green).

### Phase P2: Feature Parity Core

**Goal**: Thomson polyhedra, geodesics, truncation, view management.

**New files**:
- `src/rt_thomson.rs` — great-circle shell generation (port from JS)
- `src/rt_geodesic.rs` — geodesic subdivision (port from JS)
- `src/ui/view_manager.rs` — save/load/animate views
- `src/state.rs` — undo/redo, state persistence

**Deliverables**:
- [ ] Thomson tetrahedron/octahedron/cube/icosahedron with N-gon + jitterbug
- [ ] Geodesic subdivision (freq 1-7) for tet, dual tet, octa, icosa, dual icosa
- [ ] Truncation slider (0→½) for tet, dual tet
- [ ] Polygon primitive with Wildberger N-gon generation
- [ ] View capture, save, restore, sort
- [ ] Undo/redo
- [ ] File import/export (JSON, serde-compatible with JS format)
- [ ] Selection + gumball (move/scale/rotate)
- [ ] Context menu

### Phase P3: Full Feature Set

**Goal**: All JS app features.

**New files**:
- `src/rt_matrices.rs` — planar + radial matrix generation
- `src/rt_helices.rs` — tetrahelix generation
- `src/rt_papercut.rs` — cut-plane sections
- `src/rt_projections.rs` — stereographic projections
- `src/rt_penrose.rs` — Penrose tiling deflation

**Deliverables**:
- [ ] Primitives: point, line, prism, cone, Penrose tiling
- [ ] Planar matrices (5 types, size 1-10)
- [ ] Radial matrices (5 types, freq 1-5)
- [ ] Tetrahelices (3 variants with strand/chirality controls)
- [ ] Papercut mode (cut planes, print mode, sheet sizes)
- [ ] Projection mode (rays, interior vertices, ideal N-gon)
- [ ] Quadray experimental demonstrators
- [ ] Prime polygon projections
- [ ] Grid snapping (XYZ + ABCD)
- [ ] Object snaps (vertex, edge, face)
- [ ] Advanced logging toggle

### Phase P4: Polish + Platform

**Goal**: Math demos, native platform integration.

**Deliverables**:
- [ ] 8 math demo panels (embedded egui windows)
- [ ] Edit actions (deform, group, connect, disconnect)
- [ ] NOW button
- [ ] SVG export
- [ ] Animation export (batch + video)
- [ ] Welcome modal with keyboard shortcuts
- [ ] SwiftUI wrapper for native menus + preferences (optional)
- [ ] Mac App Store packaging

---

## Summary: Control Count by Tier

| Tier | Controls | Status | Modules |
|------|----------|--------|---------|
| **P0** | ~15 | **DONE** ✓ | egui panel, orbit camera, polyhedra toggles, scale, FPS |
| **P1** | ~40 | **Next** | basis arrows, grids, camera presets, nodes/faces, coord bar |
| **P2** | ~80 | Pending | rt_thomson, rt_geodesic, view manager, state, undo/redo |
| **P3** | ~150 | Pending | rt_matrices, rt_helices, rt_papercut, rt_projections, rt_penrose |
| **P4** | ~30 | Pending | math demos, platform polish |
| **Total** | **~315** | | |

### Current Module Structure (after P0)

```
src/
  main.rs           GpuState, event loop, render — delegates to modules
  app_state.rs      AppState struct (polyhedra, scale, FPS, geometry stats)
  ui.rs             draw_ui() — right-side panel, dark theme, collapsible sections
  geometry.rs       Vertex, ABCD_COLORS, build_visible_geometry()
  camera.rs         OrbitCamera — yaw/pitch/distance, drag/scroll, view_proj()
  shader.wgsl       ABCD BASIS matrix, Quadray→XYZ on GPU
  rt_math/          6 files — quadray, phi, radicals, cubics, polygon, mod
  rt_polyhedra/     2 files — platonic, mod (all 6 Platonic solids)
```

---

*"The web version is the sketchpad. The native app is the blueprint."*
