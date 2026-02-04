# ARTexplorer - Algebraic Rational Trigonometry Explorer

**Interactive 3D Rational Geometry Visualization Tool**

> _"Geometry should be done with algebra, not transcendental functions."_ — N.J. Wildberger

**Live Application:** [https://arossti.github.io/ARTexplorer/](https://arossti.github.io/ARTexplorer/)

**Repository:** [https://github.com/arossti/ARTexplorer](https://github.com/arossti/ARTexplorer)

---

## Table of Contents

### 1. [Project Overview](#1-project-overview)

- [1.1 Introduction](#11-introduction)
- [1.2 Project Philosophy](#12-project-philosophy)
- [1.3 Why This Matters](#13-why-this-matters)

### 2. [Key Concepts](#2-key-concepts)

- [2.1 Rational Trigonometry](#21-rational-trigonometry)
- [2.2 Coordinate Systems](#22-coordinate-systems)
- [2.3 PurePhi Symbolic Algebra](#23-purephi-symbolic-algebra)

### 3. [Features](#3-features)

- [3.1 Polyhedra Library](#31-polyhedra-library)
- [3.2 Interactive Controls](#32-interactive-controls)
- [3.3 Educational Demos](#33-educational-demos)

### 4. [Getting Started](#4-getting-started)

- [4.1 Running Locally](#41-running-locally)
- [4.2 User Interface](#42-user-interface)
- [4.3 Basic Controls](#43-basic-controls)

### 5. [Architecture](#5-architecture)

- [5.1 Technology Stack](#51-technology-stack)
- [5.2 File Structure](#52-file-structure)
- [5.3 Module Overview](#53-module-overview)

### 6. [Mathematical Background](#6-mathematical-background)

- [6.1 On Dimensions and Coordinate Systems](#61-on-dimensions-and-coordinate-systems)
- [6.2 Rational Trigonometry Principles](#62-rational-trigonometry-principles)
- [6.3 Tetrahedral Geometry](#63-tetrahedral-geometry)
- [6.4 Platonic Solid Face Spreads](#64-platonic-solid-face-spreads-wildberger-chapter-26)
- [6.5 RT Implementation Summary](#65-rt-implementation-summary-wildberger-compliance)

### 7. [Contributing](#7-contributing)

### 8. [Documentation](#8-documentation)

### 9. [Contributors & Acknowledgments](#9-contributors--acknowledgments)

### 10. [License](#10-license)

---

## 1. Project Overview

### 1.1 Introduction

ARTexplorer (Algebraic Rational Trigonometry Explorer) is a standalone web application for exploring polyhedral geometry using Rational Trigonometry principles. Built with Three.js and pure JavaScript, it visualizes nested polyhedra in both 3D Cartesian (XYZ) and 4D tetrahedral (WXYZ/Quadray) coordinate spaces.

The application combines two profound geometric frameworks:

- **R. Buckminster Fuller's Synergetics** - Tetrahedral geometry and spatial relationships
- **N.J. Wildberger's Rational Trigonometry** - Pure algebraic geometry (quadrance/spread)

### 1.2 Project Philosophy

ARTexplorer implements a **RATIONAL approach to computational geometry** using N.J. Wildberger's Rational Trigonometry (RT) framework. While Three.js requires floating-point coordinates for rendering, all geometry _generation_ uses pure algebraic methods:

#### Core RT Principles

1. **Quadrance (Q) instead of Distance (d)**
   - Classical: `d = √(Δx² + Δy² + Δz²)` (requires irrational √)
   - RT-Pure: `Q = Δx² + Δy² + Δz²` (pure algebra, deferred √)

2. **Spread (s) instead of Angle (θ)**
   - Classical: `θ = arccos(v₁·v₂ / |v₁||v₂|)` (transcendental functions)
   - RT-Pure: `s = 1 - (v₁·v₂)² / (Q₁·Q₂)` (pure algebra)

3. **Deferred √ Expansion**
   - Compute all relationships in quadrance space
   - Only take √ at final THREE.Vector3 creation
   - Preserves algebraic exactness throughout generation pipeline

4. **Symbolic Algebra for Radicals (PurePhi Method)**
   - **Philosophy:** Represent radicals in exact form `(a + b√n)/c` until GPU boundary
   - **Golden Ratio (φ):** Work symbolically as `(a + b√5)/c` for 15-decimal precision
     - φ = (1 + √5)/2 → symbolic constant
     - φ² = (3 + √5)/2 using identity φ² = φ + 1 (not multiplication!)
     - 1/φ = (-1 + √5)/2 using identity 1/φ = φ - 1 (not division!)
   - **Achievements:** Identity error = 0e+0, quadrance error = 2.17e-19 (460× improvement)
   - **Extension principle:** Apply to √2, √3, √6 wherever premature expansion loses precision

### 1.3 Why This Matters

Three.js (and all GPU rendering) ultimately uses floating-point. Our RT approach provides advantages in both **geometry generation** and **rendering performance**:

**Computational Advantages:**

- Fewer numerical errors accumulate during construction
- Algebraic relationships are preserved until final output
- Educational value: demonstrates geometry without transcendental functions
- Philosophical alignment: proves most "trigonometry" is unnecessary

**Rendering Optimizations:**

- **Proper Face Winding**: Counter-clockwise vertex ordering ensures correct outward-facing normals, enabling efficient backface culling for 2× rendering speedup
- **Polygon Reduction**: RT geodesic subdivision produces superior triangle distribution compared to THREE.js UV spheres:
  - Geodesic Icosahedron (freq-3): ~180 triangles vs THREE.SphereGeometry (16×16): 512 triangles
  - 65% fewer polygons for equivalent visual quality
  - Lower GPU memory usage and faster rendering
- **Geometric Efficiency**: Geodesic distribution provides more uniform sphere approximation than latitude-longitude UV mapping

---

## 2. Key Concepts

### 2.1 Rational Trigonometry

**Rational Trigonometry** (developed by N.J. Wildberger) replaces classical trigonometry's reliance on transcendental functions (sin, cos, tan) with purely algebraic operations:

- **Quadrance**: Q = a² (replaces distance `d`)
- **Spread**: s = sin²θ (replaces angle `θ`)
- Maintains algebraic exactness throughout calculations
- Only expands to decimals at GPU boundary

This approach eliminates computational errors from floating-point transcendental function approximations and enables exact symbolic computation.

### 2.2 Coordinate Systems

ARTexplorer supports two complementary coordinate systems:

#### Cartesian XYZ (Traditional 3D)

- Three orthogonal axes at 90° angles
- Familiar x, y, z coordinates
- Standard in computer graphics

#### Quadray WXYZ (Tetrahedral 4D)

- Four equiangular axes from tetrahedron center to vertices
- Natural for describing tetrahedral and icosahedral symmetries
- Fuller's "Isotropic Vector Matrix" (IVM) foundation
- Conversion methods in `rt-math.js`

### 2.3 PurePhi Symbolic Algebra

High-precision golden ratio calculations using symbolic representation:

- φ = (1 + √5)/2
- Symbolic forms like `{a: 1, b: 1}` represent (a + b√5)/2
- Used for icosahedra, dodecahedra, and φ-dependent polyhedra
- Achieves machine-precision accuracy (< 1e-15 error)
- Methods implemented in `rt-polyhedra.js`

---

## 3. Features

### 3.1 Polyhedra Library

**Platonic Solids:**

- Tetrahedron (4 faces)
- Hexahedron/Cube (6 faces)
- Octahedron (8 faces)
- Dodecahedron (12 faces)
- Icosahedron (20 faces)

**Archimedean Solids:**

- Cuboctahedron (Vector Equilibrium) - Fuller's IVM foundation
- Rhombic Dodecahedron (dual of cuboctahedron)

**Geodesic Spheres:**

- Geodesic Tetrahedron (frequencies 1-7)
- Geodesic Octahedron (frequencies 1-7)
- Geodesic Icosahedron (frequencies 1-7)
- RT-pure subdivision using quadrance-based edge midpoint calculation

**Matrix Polyhedra (IVM Lattices):**

- Cube, Tetrahedron, Octahedron, Cuboctahedron, Rhombic Dodecahedron
- Space-filling arrays with "packed" node spheres
- Demonstrates close-packing and IVM spatial relationships

### 3.2 Interactive Controls

**ART Gumball System:**

- Move: Translate polyhedra in 3D space
- Scale: Resize with uniform or axis-specific scaling
- Rotate: Interactive rotation handles

**Note on Rotation Implementation:**
ARTexplorer uses a hybrid approach for rotations:

- **Geometry generation**: RT-pure rotations via spread/cross → Matrix4 (e.g., `RT.applyRotation45`, `RT.applyRotation180` in `rt-math.js`)
- **Interactive transforms**: THREE.js quaternions for real-time gumball operations (unavoidable for GPU interface)

This distinction reflects that while RT mathematics can compute rotation matrices from exact spread/cross values, THREE.js internally stores object orientation as quaternions. The RT-pure functions are optimal for predetermined rotations with algebraic values (90°, 180°, 45°), while interactive gumball rotations must interface with THREE.js's quaternion-based transform system.

**Visual Options:**

- Wireframe/solid face rendering
- Face opacity control (0.0-1.0)
- Node sphere visibility and opacity
- Geodesic frequency selection (1-6)
- Color theory palettes

**Papercut Mode:**

- Dynamic cutplane for cross-sections
- Section node circles at intersections
- High-resolution mode for print-quality output
- Adaptive node resolution (36/72 segments)
- Backface Culling for faster rendering (but dimmer display)
- XYZ or WXYZ axis cut planes with Orthogonal/Perspective switch

**State Management:**

- Undo/Redo system (partially complete)
- Save/Load geometry configurations (JSON)
- Export to glTF format
- Auto-save functionality (every 10 moves, saves to localstorage)

### 3.3 Educational Demos

Interactive demonstrations of Rational Trigonometry principles:

**Quadrance Demo:**

- Interactive visualization of distance² vs √distance
- Historical connection to Plimpton 322 (Babylonian mathematics)
- Real-time calculation display

**Spread/Cross Demo:**

- Spread values (sin²θ) visualization
- Cross values (rational angle relationships)
- Sexagesimal notation examples

**Weierstrass Circle Parametrization:**

- Rational circle parametrization using Weierstrass substitution
- Algebraic alternative to cos(t), sin(t)
- Exact rational coordinates on unit circle

---

## 4. Getting Started

### 4.1 Running Locally

ARTexplorer is a pure client-side application requiring only a web server:

**Option 1: Python HTTP Server**

```bash
cd ARTExplorer
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000)

**Option 2: Node.js HTTP Server**

```bash
npx http-server -p 8000
```

**Option 3: Live Server (VS Code)**

- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

### 4.2 User Interface

The interface consists of several control panels:

- **Polyhedra Panel**: Toggle visibility and select forms
- **Scale Panel**: Adjust cube/tetrahedron edge lengths
- **Matrix Panel**: Configure IVM lattice arrays
- **Papercut Panel**: Control section cuts and print mode
- **Utility Panel**: Save/load states, export geometry
- **Visual Options**: Rendering settings and appearance
- **Geometry Info**: Statistics and performance metrics

### 4.3 Basic Controls

**Camera Navigation:**

- **Left-click + drag**: Rotate camera (orbit)
- **Right-click + drag**: Pan camera
- **Scroll wheel**: Zoom in/out
- **Double-click**: Reset camera view

**Gumball Controls:**

- Click polyhedron to select (shows transform handles)
- **Red/Green/Blue arrows**: Move along X/Y/Z axes
- **Colored boxes**: Rotate around axes
- **Corner spheres**: Uniform scale

**Keyboard Shortcuts:**

- `Esc`: Deselect current polyhedron
- `Delete`: Hide selected polyhedron

---

## 5. Architecture

### 5.1 Technology Stack

- **Three.js** (v0.160.0): WebGL rendering engine (loaded via CDN)
- **Pure JavaScript**: ES6+ modules, no framework dependencies
- **WebGL**: GPU-accelerated 3D graphics
- **HTML5 Canvas**: Rendering target
- **CSS3**: UI styling and responsive layout

### 5.2 File Structure

```
/
├── index.html              ← Main entry point
├── art.css                 ← All application styles
├── modules/                ← Core JavaScript modules
│   ├── rt-init.js              ← Application initialization, UI wiring
│   ├── rt-rendering.js         ← WebGL rendering engine, camera, scene
│   ├── rt-math.js              ← Quadray coords & RT functions
│   ├── rt-polyhedra.js         ← 3D polyhedra generation (RT-pure)
│   ├── rt-primitives.js        ← 2D primitives (point, line, polygon)
│   ├── rt-grids.js             ← Cartesian/Quadray grid generation
│   ├── rt-nodes.js             ← Vertex node geometry & caching
│   ├── rt-matrix-planar.js     ← IVM spatial arrays (planar N×N)
│   ├── rt-matrix-radial.js     ← IVM spatial arrays (radial)
│   ├── rt-controls.js          ← Gumball interaction
│   ├── rt-papercut.js          ← Cutplane/slicing, print mode
│   ├── rt-state-manager.js     ← State persistence
│   ├── rt-filehandler.js       ← Import/export (JSON, glTF)
│   ├── rt-viewmanager.js       ← View management
│   ├── rt-context.js           ← Context menu handling
│   ├── rt-info-modal.js        ← Info modal UI
│   ├── rt-janus.js             ← Janus mode handling
│   ├── performance-clock.js    ← Performance monitoring
│   └── color-theory-modal.js   ← Color palettes
├── modules/asteroids/      ← Asteroids game module
│   ├── rt-asteroids-core.js    ← Game core logic
│   ├── rt-asteroids-player.js  ← Player controls
│   ├── rt-asteroids-enemies.js ← Enemy AI
│   ├── rt-asteroids-weapons.js ← Weapon systems
│   ├── rt-asteroids-hud.js     ← HUD display
│   ├── rt-asteroids-audio.js   ← Audio management
│   ├── rt-asteroids-blackhole.js ← Black hole effects
│   └── rt-asteroids-license.js ← License info
├── demos/                  ← Educational demonstrations
│   ├── rt-quadrance-demo.js    ← Plimpton 322 Babylonian math
│   ├── rt-cross-demo.js        ← Spread/Cross with Sexagesimal
│   ├── rt-weierstrass-demo.js  ← Rational circle parametrization
│   └── rt-demo-utils.js        ← Shared demo utilities
├── Geometry documents/     ← Technical documentation
└── .github/workflows/      ← GitHub Actions deployment
```

### 5.3 Module Overview

**Core Rendering:**

- `rt-rendering.js`: THREE.js scene management, camera, lighting, polyhedra rendering
- `rt-init.js`: Application orchestration, password protection, module imports, event wiring
- `rt-state-manager.js`: Forms/instances state management, undo/redo system
- `rt-viewmanager.js`: View management and camera presets

**Geometry & Mathematics:**

- `rt-polyhedra.js`: 3D polyhedra definitions using RT-pure methods (Platonic, Archimedean, Geodesic)
- `rt-primitives.js`: 2D primitives (point, line, polygon) with RT-pure and classical engines
- `rt-math.js`: Core RT library (quadrance, spread, golden ratio, circle parametrization)
- `rt-matrix-planar.js`: IVM spatial array generation for polyhedra matrices (planar N×N)
- `rt-matrix-radial.js`: IVM spatial array generation for radial arrangements

**Scene Infrastructure:**

- `rt-grids.js`: Cartesian XYZ and Quadray WXYZ grid generation, basis vectors
- `rt-nodes.js`: Vertex node geometry (RT geodesic/classical sphere), caching, close-packing

**UI & Controls:**

- `rt-controls.js`: ART Gumball interactive transform controls
- `rt-papercut.js`: Print mode, dynamic cutplane, section nodes, line weights
- `rt-context.js`: Context menu handling for object selection
- `rt-info-modal.js`: Information modal UI
- `rt-janus.js`: Janus mode handling (dual-view functionality)
- `color-theory-modal.js`: Color palette management

**Utilities:**

- `rt-filehandler.js`: State import/export to JSON, glTF geometry export
- `performance-clock.js`: Performance monitoring (FPS, triangle counts, timing)

**Asteroids Game (Easter Egg):**

- `modules/asteroids/`: Complete RT-based space game with player controls, enemies, weapons, HUD, and audio

---

## 6. Mathematical Background

### 6.1 On Dimensions and Coordinate Systems

Cartesian 3D space requires **3 orthogonal axes** but Fuller's tetrahedral space requires **4 equiangular axes**. This doesn't make space "4D" in the physics sense (you still have 3 degrees of freedom for position), but it does mean that natural spatial coordinatization is fundamentally 4-fold, not 3-fold.

The common assertion that "time is the 4th dimension" conflates three separate concepts:

1. The **geometric fact** that Cartesian space uses 3 axes (an arbitrary choice)
2. With the **assumption** that spatial dimensions must therefore = 3 (demonstrably false)
3. Leading to the **conclusion** that any 4th dimension must be non-spatial (misleading)

In physics, "dimension" means **degrees of freedom** - independent ways a system can vary. In geometry, "dimension" refers to **coordinate axes** needed to naturally describe space. Fuller was correct: **spatial geometry is inherently 4-fold** (tetrahedral), and Cartesian reduction to 3 axes is a convenient but limiting convention that obscures the natural symmetry of space.

### 6.2 Rational Trigonometry Principles

Rational Trigonometry eliminates transcendental functions by working directly with squared quantities:

**Classical vs RT Comparison:**

| Concept          | Classical        | RT-Pure        | Advantage    |
| ---------------- | ---------------- | -------------- | ------------ |
| Distance         | d = √(Δx² + Δy²) | Q = Δx² + Δy²  | No √ needed  |
| Angle            | θ = arccos(...)  | s = 1 - (...)² | Pure algebra |
| Perpendicularity | v₁·v₂ = 0        | v₁·v₂ = 0      | Same!        |
| Pythagorean      | a² + b² = c²     | Q₁ + Q₂ = Q₃   | Same!        |

**Key Insight:** Most geometric relationships work naturally with squared quantities. Taking square roots is often an unnecessary step that introduces computational error.

### 6.4 Platonic Solid Face Spreads (Wildberger Chapter 26)

N.J. Wildberger's "Divine Proportions" (Chapter 26) derives the **face spread** S for each Platonic solid - the spread between adjacent faces meeting at an edge. Remarkably, all five face spreads are **rational numbers**:

| Solid            | Face Spread S | Derivation                                           |
| ---------------- | ------------- | ---------------------------------------------------- |
| **Tetrahedron**  | S = 8/9       | Isosceles triangle CMD with quadrances 3Q/4, 3Q/4, Q |
| **Cube**         | S = 1         | Adjacent faces perpendicular (trivial case)          |
| **Octahedron**   | S = 8/9       | Same as tetrahedron (see relationship below)         |
| **Icosahedron**  | S = 4/9       | Uses pentagon α = (5-√5)/8, β = (5+√5)/8             |
| **Dodecahedron** | S = 4/5       | Derived from (4α - 1)/(4α²) where α = (5-√5)/8       |

**The Tetrahedron-Octahedron Relationship:**

Wildberger establishes a profound geometric fact: the six midpoints of a tetrahedron's edges form a regular octahedron. This can also be seen by slicing off the four corner tetrahedra from a larger tetrahedron - the remaining central solid is an octahedron that shares faces with those corner tetrahedra. Since adjacent faces of the corner tetrahedra become adjacent faces of the central octahedron, **both solids must have the same face spread: S = 8/9**.

This relationship has significant implications for IVM (Isotropic Vector Matrix) and Cuboctahedron/Vector Equilibrium implementations:

- **Space-filling property**: Tetrahedra and octahedra together fill space completely (the octet truss)
- **Shared face spread**: The 8/9 face spread creates consistent dihedral angles at all tet-oct interfaces
- **Midpoint construction**: An octahedron can be generated directly from tetrahedron edge midpoints
- **Dual construction**: The cuboctahedron (Vector Equilibrium) vertices lie at tetrahedron edge midpoints

**Implementation Note:** While ARTexplorer constructs tetrahedra and octahedra independently (for clarity and flexibility), the shared face spread S = 8/9 could enable more efficient IVM matrix generation by deriving octahedra from tetrahedron midpoints, ensuring perfect geometric alignment at all interfaces.

**Additional Quadrance Relationships (Wildberger Exercises 26.1-26.2):**

For a tetrahedron with edge quadrance Q:

- Q(vertex → opposite face centroid) = 2Q/3
- Q(vertex → tetrahedron center) = 3Q/8
- The face spread S = 8/9 equals s(PA, PB) where P is the tetrahedron center

**Pentagon Constants (Exercise 14.3, p.166):**

The icosahedron and dodecahedron calculations use two key constants:

- α = (5 - √5)/8 ≈ 0.345 (base spread at pentagon vertices)
- β = (5 + √5)/8 ≈ 0.905 (star spread / apex angle)

These satisfy the elegant relationships:

- α + β = 5/4
- α · β = 5/16
- β/α = φ² (golden ratio squared!)

ARTexplorer implements these as `RT.PurePhi.pentagon.alpha()` and `RT.PurePhi.pentagon.beta()` with cached √5 expansion for maximum precision.

### 6.5 RT Implementation Summary: Wildberger Compliance

This section documents how ARTexplorer implements Wildberger's Rational Trigonometry principles from "Divine Proportions: Rational Trigonometry to Universal Geometry."

#### Core RT Functions (`rt-math.js`)

| Wildberger Concept                  | ARTexplorer Implementation                       | Location           |
| ----------------------------------- | ------------------------------------------------ | ------------------ |
| **Quadrance** Q = Δx² + Δy² + Δz²   | `RT.quadrance(p1, p2)`                           | rt-math.js:36-41   |
| **Spread** s = 1 - (v₁·v₂)²/(Q₁·Q₂) | `RT.spread(v1, v2)`                              | rt-math.js:62-67   |
| **Spread ↔ Degrees**                | `RT.spreadToDegrees(s)`, `RT.degreesToSpread(θ)` | rt-math.js:728-744 |
| **Euler Formula** V - E + F = 2     | `RT.verifyEuler(V, E, F)`                        | rt-math.js:215-217 |
| **Edge Validation**                 | `RT.validateEdges(vertices, edges, expectedQ)`   | rt-math.js:709-720 |

#### Golden Ratio Symbolic Algebra (`RT.PurePhi`)

Wildberger emphasizes working with algebraic identities to avoid premature √ expansion. ARTexplorer implements this via symbolic algebra:

| Identity       | Implementation                 | Benefit               |
| -------------- | ------------------------------ | --------------------- |
| φ = (1 + √5)/2 | `RT.PurePhi.Symbolic(1, 1, 2)` | Single √5 expansion   |
| φ² = φ + 1     | `RT.PurePhi.constants.phiSq`   | Exact (not φ × φ!)    |
| 1/φ = φ - 1    | `RT.PurePhi.constants.invPhi`  | No division needed    |
| φ³ = 2φ + 1    | `RT.PurePhi.cubed()`           | Derived from identity |
| φ⁴ = 3φ + 2    | `RT.PurePhi.fourthPower()`     | Derived from identity |

The `Symbolic` class maintains exact `(a + b√5)/c` form with operations:

- `multiply(other)` - Preserves algebraic form
- `add(other)`, `subtract(other)` - Common denominator arithmetic
- `scale(n)`, `divide(n)` - Scalar operations
- `toDecimal()` - GPU boundary expansion (called once, at end)

#### Spread Polynomials (Chapter 14)

For regular n-gon diagonal quadrances, Wildberger defines Sₖ(s) polynomials:

| Polynomial | Formula              | ARTexplorer                     |
| ---------- | -------------------- | ------------------------------- |
| S₁(s)      | s                    | `RT.SpreadPolynomials.S1(s)`    |
| S₂(s)      | 4s(1-s)              | `RT.SpreadPolynomials.S2(s)`    |
| S₃(s)      | s(3-4s)²             | `RT.SpreadPolynomials.S3(s)`    |
| S₅(s)      | s(5-20s+16s²)²       | `RT.SpreadPolynomials.S5(s)`    |
| Sₙ(s)      | Chebyshev recurrence | `RT.SpreadPolynomials.Sn(n, s)` |

#### Star Spreads for Regular Polygons (Theorem 98)

Edge quadrance formula: **Q_edge = 4 · s · Q_circumradius**

| n-gon          | Star Spread s | ARTexplorer                  | RT-Pure?             |
| -------------- | ------------- | ---------------------------- | -------------------- |
| Triangle (3)   | 3/4           | `RT.StarSpreads.triangle()`  | Yes (exact rational) |
| Square (4)     | 1/2           | `RT.StarSpreads.square()`    | Yes (exact rational) |
| Pentagon (5)   | (5+√5)/8 = β  | `RT.StarSpreads.pentagon()`  | Yes (cached √5)      |
| Hexagon (6)    | 1/4           | `RT.StarSpreads.hexagon()`   | Yes (exact rational) |
| Octagon (8)    | (2-√2)/4      | `RT.StarSpreads.octagon()`   | Yes (cached √2)      |
| Decagon (10)   | (3-√5)/8 = α  | `RT.StarSpreads.decagon()`   | Yes (cached √5)      |
| Dodecagon (12) | (2-√3)/4      | `RT.StarSpreads.dodecagon()` | Yes (cached √3)      |

#### Polyhedra Construction (`rt-polyhedra.js`)

| Solid            | Construction Method                | RT Validation            |
| ---------------- | ---------------------------------- | ------------------------ |
| **Tetrahedron**  | Alternating cube vertices          | Q = 8s² verified         |
| **Cube**         | (±s, ±s, ±s)                       | Q = 4s² verified         |
| **Octahedron**   | Face centers of cube               | Q = 2s² verified         |
| **Icosahedron**  | 3 orthogonal golden rectangles     | PurePhi symbolic algebra |
| **Dodecahedron** | 8 cube + 12 φ-permutation vertices | 1/φ = φ-1 identity       |

#### Deferred √ Expansion Pattern

ARTexplorer follows Wildberger's principle of deferring irrational expansion:

```
1. ALGEBRAIC SPACE: Work with quadrance Q, spread s, symbolic (a+b√n)/c
2. RELATIONSHIPS: Use RT identities (Pythagorean, spread law, cross law)
3. GPU BOUNDARY: Only call Math.sqrt() when creating THREE.Vector3
```

This pattern is consistently applied in:

- `RT.spherePlaneCircleRadius()` - Computes circleRadiusQ, single √ at end
- `RT.PurePhi.Symbolic.toDecimal()` - Expands √5 once
- `RT.PureRadicals.QUADRAY_GRID_INTERVAL` - √6/4 computed once, cached
- All polygon generators - Cached radical values from `RT.PureRadicals`

#### Gauss-Wantzel Constructibility

ARTexplorer respects the Gauss-Wantzel theorem for polygon constructibility:

**RT-Pure (algebraic radicals only):** n = 3, 4, 5, 6, 8, 10, 12
**Classical fallback (transcendental):** n = 7, 9, 11, 13, ...

The heptagon (n=7) requires solving an irreducible cubic - no √-expression exists. ARTexplorer correctly falls back to `Math.sin/cos` for these cases while logging a warning.

### 6.3 Tetrahedral Geometry

The regular tetrahedron is the fundamental unit of 3D space (Fuller's "quantum of space"):

- **4 vertices** arranged symmetrically
- **6 edges** of equal length
- **4 faces** (equilateral triangles)
- **Dihedral angle**: arccos(1/3) ≈ 70.53° (exact in RT: spread = 8/9)

**Quadray Coordinate System:**

- Origin at tetrahedron center
- Four basis vectors to vertices
- Natural for tetrahedral/icosahedral symmetry
- All coordinates positive (no negative numbers needed)

---

## 7. Contributing

We welcome contributions! Areas of interest:

**Code Contributions:**

- RT-pure implementations of additional polyhedra
- Performance optimizations
- UI/UX improvements
- Bug fixes

**Documentation:**

- Educational tutorials
- Mathematical explanations
- Code examples

**Research:**

- RT applications to other domains
- Geometric discoveries
- Algorithm improvements

**Guidelines:**

- Maintain RT-pure geometry generation principles
- Preserve algebraic exactness until GPU boundary
- Follow existing code patterns (ES6 modules, IIFE)
- Test in both XYZ and WXYZ coordinate modes
- Verify face winding order (counter-clockwise)

---

## 8. Documentation

**In This Repository:**

- `README.md` (this file) - Project overview and getting started
- `DEV-PRIVATE.md` - Internal development documentation
- `Geometry documents/` - Detailed technical documentation:
  - `Basis-Vector-Symbols.md` - Coordinate system details
  - `puri-phi.md` - PurePhi symbolic algebra implementation
  - `Quadray-Grid.md` - Grid system specifications
  - `RT-Papercut.md` - Papercut module documentation
  - And more...

**External Resources:**

- [N.J. Wildberger - Rational Trigonometry](https://www.youtube.com/user/njwildberger) (YouTube lectures)
- [R. Buckminster Fuller - Synergetics](https://www.rwgrayprojects.com/synergetics/synergetics.html)
- [Kirby Urner - Quadray Introduction](http://www.grunch.net/synergetics/quadintro.html)
- [Tom Ace - Quadray Coordinates](http://minortriad.com/quadray.html) (C++ implementation)

---

## 9. Contributors & Acknowledgments

**Primary Development:**

- **Andy Thomson, M.Arch. OAA** - Architect, Creator, RT implementation, geometric research

**Conceptual Foundations:**

- **R. Buckminster Fuller** - Synergetics, tetrahedral geometry, IVM lattice theory
- **N.J. Wildberger** - Rational Trigonometry, algebraic geometry framework
- **Kirby Urner** - Quadray coordinate system, Python explorations
- **Tom Ace** - C++ Quadray implementation, geometric computations

**Special Thanks:**

- The Three.js community for excellent WebGL tools
- Claude 4.5 (Anthropic) and the VSC IDE for development assistance and code review
- Open source contributors and geometry enthusiasts

**Philosophical Acknowledgment:**
Witnessed silently by Metatron.

---

## 10. License

**Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)**

© OpenBuilding, Inc., 2025

This work is licensed under the Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License.

**You are free to:**

- Share — copy and redistribute the material in any medium or format for noncommercial purposes only.

**Under the following terms:**

- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made.
- **NonCommercial** — You may not use the material for commercial purposes.
- **No Derivatives** — If you remix, transform, or build upon the material, you may not distribute the modified material.

No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.

**Full License:** https://creativecommons.org/licenses/by-nc-nd/4.0/

See the [LICENSE](LICENSE) file for complete terms and conditions.

**NOTICE:** This software is owned by OpenBuilding, Inc., a nonprofit registered in Canada. It is supported by the Ontario Association of Architects, the regulator for Architects in Ontario. Unauthorized modification, redistribution, or misrepresentation of this work is not permitted.

---

**Last Updated:** 2026-01-29

**Live Application:** [https://arossti.github.io/ARTexplorer/](https://arossti.github.io/ARTexplorer/)

**Repository:** [https://github.com/arossti/ARTexplorer](https://github.com/arossti/ARTexplorer)

- Future work on Tetravolumes courtesy Tom Ace, Kirby Urner: https://github.com/4dsolutions/School_of_Tomorrow/blob/master/Qvolume.ipynb
