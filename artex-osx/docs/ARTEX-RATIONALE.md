# ARTEX-RATIONALE: Why Quadray-Native Rendering Changes Everything

**The case for ABCD as the canonical coordinate system — not an encoding of XYZ.**

- February 20 2026. 
This document records the foundational insight
> behind the ARTexplorer native app: that Quadray ABCD coordinates are not
> a curiosity to be translated into Cartesian, but a superior basis for
> polyhedral geometry that the rendering pipeline should preserve end-to-end.

---

## 1. The Integer Polyhedra

In Quadray ABCD coordinates, the fundamental polyhedra are **pure integers**:

| Polyhedron | Quadray pattern | Example vertices | Count |
|---|---|---|---|
| **Tetrahedron** | One-hot basis | `[1,0,0,0]` `[0,1,0,0]` `[0,0,1,0]` `[0,0,0,1]` | 4 |
| **Dual Tetrahedron** | One-absent complement | `[0,1,1,1]` `[1,0,1,1]` `[1,1,0,1]` `[1,1,1,0]` | 4 |
| **Cube** | Tet + Dual Tet (all 8) | *union of above* | 8 |
| **Octahedron** | Two-hot edge midpoints | `[1,1,0,0]` `[1,0,1,0]` ... all permutations | 6 |

No square roots. No irrationals. No transcendentals. **Every coordinate is 0 or 1.**

The cube does not need its own generator. It IS the union of the tetrahedron and
its dual — the stella octangula. The octahedron does not need Cartesian face-center
coordinates. It IS the set of all pairwise Quadray basis sums.

Even the icosahedron and dodecahedron, while requiring the golden ratio phi, remain
**algebraically pure** — expressible via `PurePhi` symbolic arithmetic with no
transcendental functions.

### The Hierarchy of Purity

| Level | Polyhedra | Coordinate type |
|---|---|---|
| **Integer** | Tet, Dual Tet, Cube, Octahedron | ABCD in {0, 1} |
| **Algebraic** | Icosahedron, Dodecahedron | ABCD involving phi (algebraic irrational) |
| **Transcendental** | *None in geometry* | Only at screen projection boundary |

---

## 2. The Tom Ace Conversion: A secondary function, a Projection, Not a Foundation

The standard Quadray-to-Cartesian conversion (Tom Ace) maps:

```
A = [1,0,0,0]  →  (-1, -1, +1)
B = [0,1,0,0]  →  (+1, +1, +1)
C = [0,0,1,0]  →  (-1, +1, -1)
D = [0,0,0,1]  →  (+1, -1, -1)
```

This is a **linear projection** from 4D Quadray space to 3D Cartesian space.
It is one possible embedding. It is not the geometry itself.

### What the projection costs

The moment you project to Cartesian, the integer purity is destroyed:

| Measurement | In Quadray (ABCD) | In Cartesian (XYZ) |
|---|---|---|
| Tet edge quadrance | **8** (integer) | 8 (same, but only because Q = dx^2 + dy^2 + dz^2 happens to agree) |
| Tet edge *length* | sqrt(8) = 2*sqrt(2) | 2*sqrt(2) — **irrational forced** |
| Cube edge quadrance | **4** (integer) | 4 |
| Cube edge *length* | sqrt(4) = 2 | 2 |
| Tet/Cube edge ratio | Q ratio = 8/4 = **2** (integer) | Length ratio = sqrt(2) — **irrational forced** |

The "Rationality Reciprocity" — the fact that tet edge and cube edge cannot both
be rational simultaneously — **is a Cartesian disease**. In Quadray quadrance space,
the ratio is 2:1. Always. An integer. The sqrt(2) appears only when you ask
the Cartesian question "what is the *length*?"

### Implication for the Scale UI

The Scale sliders currently show "Tet edge" and "Cube edge" — these are Cartesian
projections of a single Quadray scale factor `s`. In ABCD space:

- Quadray scale: **s** (one rational number)
- Tet edge quadrance: **8*s^2** (rational)
- Cube edge quadrance: **4*s^2** (rational)
- Tet edge (Cartesian): 2*sqrt(2)*s (irrational unless s = 0)
- Cube edge (Cartesian): 2*s (rational)

The "reciprocity" is a display concern, not a geometric one.

---

## 3. What Actually Demands XYZ?

The current rendering pipeline:

```
ABCD integers       Tom Ace basis         Camera MVP           Screen
     |                   |                    |                  |
[1,0,0,0]  ──────►  (-1,-1,1)  ──────►  clip space  ──────►  pixels
  Quadray              XYZ              (x/w, y/w)           2D grid
```

**Step 2 (Tom Ace) converts to XYZ. But why?**

### What the GPU actually needs

The GPU rasterizer needs one thing: **clip-space coordinates** — a `vec4<f32>`
representing (cx, cy, cz, cw). After the vertex shader outputs this, the GPU
hardware performs:

1. Perspective division: (cx/cw, cy/cw, cz/cw)
2. Viewport transform: map to pixel coordinates
3. Rasterization: fill triangles, interpolate attributes

The rasterizer has no concept of "XYZ" or "Cartesian." It receives four numbers
and performs fixed arithmetic. **The vertex shader can compute those four numbers
however it wants.**

### Metal doesn't need XYZ

Metal is a GPU compute API. It executes shader code — arbitrary math on arbitrary
inputs. It has no built-in coordinate system. The concepts of "X axis," "Y axis,"
"Z axis" exist only in our shader code, not in the hardware.

wgpu (our abstraction layer) is the same. It passes vertex data to shaders and
receives clip-space output. It doesn't know or care what coordinate system
produced those numbers.

### The screen is Cartesian — sort of

The display is a 2D pixel grid. Pixels have (row, column) addresses. This is
inherently Cartesian in 2D. But the 3D-to-2D projection that maps geometry
to this grid does not require an intermediate 3D Cartesian step.

---

## 4. Direct ABCD-to-Clip Rendering

### Current shader (XYZ as intermediate)

```wgsl
// Step 1: Normalize ABCD (subtract average)
let avg = (a + b + c + d) / 4.0;
let normalized = quadray - vec4(avg);

// Step 2: Convert to XYZ via basis matrix  ← HERE IS THE "DUMB DOWN"
let position = BASIS * normalized;           //  4D → 3D projection

// Step 3: Apply camera (XYZ → clip space)
out.clip_position = view_proj * vec4(position, 1.0);
```

### What this could be

The normalization (step 1), basis conversion (step 2), and camera projection
(step 3) are ALL linear operations. They can be composed on the CPU into a
single matrix per frame:

```
ABCD_to_clip = view_proj * [BASIS * Normalize; translation_row]
```

The shader becomes:

```wgsl
out.clip_position = abcd_to_clip * in.quadray + clip_offset;
```

**XYZ never appears.** Not in the shader, not in any intermediate variable.
The Quadray coordinates flow directly to clip space through a single matrix
multiply. The Tom Ace basis vectors are folded into the camera matrix,
computed once per frame on the CPU.

### What we gain

1. **Conceptual purity**: The geometry pipeline is ABCD end-to-end. XYZ is
   not a waypoint — it's an implementation detail hidden inside a matrix.

2. **Performance**: One matrix multiply instead of normalize + basis + MVP.
   (Marginal on modern GPUs, but elegant.)

3. **Future flexibility**: If we ever change the Quadray-to-display mapping
   (different basis orientation, non-standard projection), we change ONE
   matrix on the CPU. The shader and all vertex data remain unchanged.

4. **Philosophical correctness**: The geometry is defined in Quadray.
   The display is a projection of Quadray. XYZ is not a privileged
   intermediate — it's one of infinitely many possible 3D embeddings
   of the 4D Quadray space, and we don't need to name it.

---

## 5. The Nesting — Why All Polyhedra Share One Scale

Because the polyhedra are defined in Quadray integers, their nesting is
**exact and automatic**:

```
Scale factor: s  (applied uniformly to all ABCD coordinates)

Tetrahedron:   [s, 0, 0, 0]  [0, s, 0, 0]  [0, 0, s, 0]  [0, 0, 0, s]
Dual Tet:      [0, s, s, s]  [s, 0, s, s]  [s, s, 0, s]  [s, s, s, 0]
Cube:          All 8 of the above
Octahedron:    [s, s, 0, 0]  and all permutations

At s = 1:
  Tet vertex A = [1,0,0,0]
  Dual vertex [0,1,1,1] = A-absent complement
  Cube vertex [1,0,0,0] = same as Tet vertex A  ← EXACT COINCIDENCE
  Octa vertex [1,1,0,0] = midpoint of edge AB   ← EXACT NESTING
```

The tet + dual tet = cube is not approximate. It is not "close enough."
It is **identity**. The 8 stella octangula vertices ARE the 8 cube vertices.
No floating-point tolerance. No epsilon. No rounding. They are the same
integers.

When you scale by `s`, you multiply every ABCD coordinate by `s`. All polyhedra
scale together. The nesting is preserved at every scale because it's an
algebraic identity, not a numerical coincidence.

### What goes wrong with separate scaling

The previous implementation used `tet_edge` to scale the tet and `cube_edge`
to scale the cube, as if they were independent. But the cube IS the tet + dual
tet. Scaling them differently is geometrically incoherent — like scaling the
left half of a circle differently from the right half.

---

## 6. Icosahedron and Dodecahedron — Algebraic, Not Integer

The 12-vertex icosahedron and 20-vertex dodecahedron introduce the golden
ratio phi = (1 + sqrt(5)) / 2. Their Quadray coordinates involve phi,
not just {0, 1}.

But phi is **algebraic** — it satisfies phi^2 = phi + 1. It can be represented
exactly via `PurePhi` symbolic arithmetic (a + b*phi form). No transcendental
functions. No pi. No sin or cos. The geometry remains RT-pure.

The icosahedron and dodecahedron do not share the integer nesting of the
cube-family polyhedra. They exist at a different circumradius and require
their own scale normalization. This is a mathematical fact, not a limitation
of the coordinate system.

At a given Quadray scale `s`:
- Cube-family (tet, dual, cube, octa): exact integer ABCD, all nested
- Phi-family (icosa, dodeca): algebraic ABCD, independently scaled

---

## 7. What We Have Built (February 2026)

### Accomplished

- **Pure Quadray cube generator**: `cube()` in `platonic.rs` defines 8 vertices
  as `Quadray::A/B/C/D` + 4 dual complements. No `from_cartesian()`. No irrationals.
  No Cartesian anywhere in the definition. The cube IS the stella octangula.

- **Unified Quadray scale**: ONE factor `s` multiplies all ABCD coordinates for
  all polyhedra. The tet, dual tet, and cube share the same `s`, so their vertex
  identity is preserved at every scale — algebraically, not numerically.

- **90 verified tests**: Including `cube_is_stella_octangula` which proves the
  cube's first 4 vertices ARE the tetrahedron and the next 4 ARE the dual.
  Euler, uniform edges, cross-polyhedron checks — all pass.

- **Integer polyhedra hierarchy**: Tet, Dual Tet, Cube, Octahedron — all defined
  with ABCD coordinates in {0, 1}. No square roots. No irrationals. This is,
  to our knowledge, a world first for a rendered 3D geometry application.

### Next: Eliminate XYZ from the Shader

The shader (`shader.wgsl`) still converts ABCD → XYZ via the Tom Ace basis
matrix as an explicit intermediate step. Section 4 describes how to fold this
into a single ABCD-to-clip matrix computed per frame on the CPU. When that
is done, the pipeline becomes:

```
Integer ABCD  →  one matrix multiply  →  clip space  →  pixels
```

XYZ will not appear in the shader, not as a variable, not as a concept.

### Open Question: Octahedron Nesting

The octahedron has two natural Quadray forms:

| Form | Quadray | Cartesian | Relationship |
|---|---|---|---|
| **Vector sum** `[1,1,0,0]` | Integer | (0, 0, 2) | Circumscribes the cube |
| **Edge midpoint** `[½,½,0,0]` | Rational | (0, 0, 1) | Inscribed in cube (at face centers) |

The vector sum form preserves integer purity. The midpoint form nests inside
the cube as in the JS app. Both are valid. The choice depends on whether we
privilege integer coordinates or classical nesting. To be discussed.

Note: In both forms, the octahedron shares the tetrahedron's face spread of
8/9 — a rational value. This is not a coincidence; it reflects the fact that
the octahedron's faces are parallel to the tetrahedron's faces. Spread, not
angle, is the natural measure of this relationship.

---

## 8. ABCD Projection to Screen: The Keylight Plane

### The question

Can we project ABCD coordinates to screen pixels without ever computing XYZ —
not even inside a matrix?

### The keylight plane

Imagine a plane behind the geometry, facing the viewer. It emits parallel rays
that pass through the geometry and strike the screen. This is **orthographic
projection** — no perspective distortion, no vanishing points. Every parallel
ray maps one point in 3D space to one pixel on screen.

To define this projection, we need three things:
1. **Screen horizontal axis**: a direction in space ("which way is right?")
2. **Screen vertical axis**: a direction in space ("which way is up?")
3. **Viewing direction**: perpendicular to the screen ("which way are the rays?")

In Cartesian, projecting a vertex onto the screen is three dot products:

```
screen_x = vertex . u_horizontal
screen_y = vertex . u_vertical
depth    = vertex . u_viewing      (for occlusion sorting)
```

### Direct ABCD projection

The ABCD-to-Cartesian conversion is linear: `xyz = Basis * Normalize * abcd`.
Substituting into the dot products:

```
screen_x = (Basis * N * abcd) . u_h  =  abcd . (N^T * Basis^T * u_h)
screen_y = (Basis * N * abcd) . u_v  =  abcd . (N^T * Basis^T * u_v)
depth    = (Basis * N * abcd) . u_d  =  abcd . (N^T * Basis^T * u_d)
```

The terms `N^T * Basis^T * u_h` etc. are **4-vectors in ABCD space**. They
depend only on the camera orientation, not on the vertices. Precompute them
once per frame. Call them **p_x**, **p_y**, **p_depth**.

Then for every vertex (a, b, c, d):

```
screen_x = a*p_x.a + b*p_x.b + c*p_x.c + d*p_x.d
screen_y = a*p_y.a + b*p_y.b + c*p_y.c + d*p_y.d
depth    = a*p_d.a + b*p_d.b + c*p_d.c + d*p_d.d
```

**Three dot products. Four multiplies and three adds each. No XYZ anywhere.**

The vertex goes directly from ABCD integers to a 2D screen position. The
Tom Ace basis, the normalization, the camera orientation — all folded into
three 4-vectors computed once when the camera moves.

### Perspective variant

For perspective projection (closer = larger), add a division:

```
screen_x = (abcd . p_x) / (abcd . p_d)
screen_y = (abcd . p_y) / (abcd . p_d)
```

Still no XYZ. The division is the same perspective division the GPU does
in clip space — we're just doing it ourselves, directly in ABCD space.

### Wireframe rendering without the 3D pipeline

For wireframe geometry (our current rendering mode), we don't need the GPU's
3D rasterizer at all. The full algorithm:

1. **Project vertices**: Compute (screen_x, screen_y, depth) for each vertex
   via ABCD dot products.

2. **Sort edges by depth**: Average the depth of each edge's two endpoints.
   Sort back-to-front (painter's algorithm).

3. **Draw 2D lines**: Render edges as 2D line segments on screen, back-to-front.
   Nearer edges overdraw farther ones — correct occlusion for free.

4. **Draw vertices**: Optionally render vertex nodes as 2D circles, also
   depth-sorted.

This works on ANY 2D rendering backend — Metal, Canvas 2D, SVG, PostScript,
a pen plotter. The geometry never enters a 3D coordinate system.

### Depth ordering without a Z-buffer

The painter's algorithm (sort, then draw back-to-front) is exact for
non-intersecting edges — which is always the case for wireframe polyhedra.
No per-pixel depth testing needed. No depth buffer. No Z-fighting.

For convex polyhedra, we can go further: determine which faces are
**front-facing** (face normal dot viewing direction < 0) and draw only
those edges. The face normal is computed from ABCD vertex cross products —
still no XYZ. This gives hidden-line removal without a depth buffer.

### What this means

The 3D GPU pipeline (vertex shader → rasterizer → fragment shader → depth
test) exists because general-purpose 3D rendering needs per-pixel depth
testing for arbitrary triangle meshes. But polyhedral wireframes don't need
any of that. They are a **graph** — vertices and edges — projected to 2D
and drawn in depth order.

The entire rendering reduces to:
```
ABCD integers  →  three dot products per vertex  →  2D screen coordinates
                                                  →  depth-sorted 2D lines
```

No vertex shader. No fragment shader. No rasterizer. No depth buffer.
No XYZ. Just ABCD, dot products, and lines.

---

## 9. The Larger Vision

Traditional 3D geometry software defines everything in Cartesian XYZ.
Tetrahedral coordinates are an afterthought, a curiosity, a "conversion."

ARTexplorer inverts this. **Quadray ABCD is the canonical system.** The polyhedra
live there as integers. The relationships between them — nesting, duality,
edge ratios — are exact integer arithmetic. The irrationals that appear in
classical geometry (sqrt(2) for tet/cube edge ratio, sqrt(3) for circumradius)
are artifacts of projecting to XYZ, not properties of the geometry.

The natural language of this geometry is not Angle and Distance, but
**Quadray Coordinates, Quadrance, and Spread** — the core of Rational
Trigonometry. Every measurement stays algebraic. Every relationship stays exact.
The only decimal tribute is paid at the screen boundary, where the 2D pixel
grid demands its Cartesian projection — and even that reduces to dot products
in ABCD space.

---

*"The geometry is tetrahedral. The screen is Cartesian. The bridge between them
is three dot products. Everything else is convention."*

---

## 10. Cameras and Projection Planes: On-Axis Views in ABCD Space

### What the JS app does today

The JavaScript ARTexplorer has a mature on-axis camera view system with seven
standard views and two basis systems:

| View | Camera axis | Cutplane normal | Projection normal |
|---|---|---|---|
| **Top / Bottom** | Z | (0, 0, 1) | (0, 0, 1) |
| **Front / Back** | Y | (0, 1, 0) | (0, 1, 0) |
| **Left / Right** | X | (1, 0, 0) | (1, 0, 0) |
| **QW (D axis)** | (-1,-1,1)/√3 | (-1,-1,1)/√3 | (-1,-1,1)/√3 |
| **QX (A axis)** | (1,1,1)/√3 | (1,1,1)/√3 | (1,1,1)/√3 |
| **QY (C axis)** | (-1,1,-1)/√3 | (-1,1,-1)/√3 | (-1,1,-1)/√3 |
| **QZ (B axis)** | (1,-1,-1)/√3 | (1,-1,-1)/√3 | (1,-1,-1)/√3 |

Each view button sets a camera position, a cutplane normal, and a projection
plane normal — all from the same direction vector. Three systems, one axis
selection, unified user experience.

But internally, the JS app routes every operation through XYZ:

```
ABCD → Tom Ace → XYZ → THREE.js camera → clip space → pixels
                  ↑ cutplane: THREE.Plane(normal_xyz, distance)
                  ↑ projection: planeNormal/planeRight/planeUp (XYZ vectors)
```

The XYZ and WXYZ basis systems require separate code paths (`if (basis ===
"tetrahedral") ...`), separate normal construction, and separate snap interval
logic. This works, but it treats XYZ as fundamental and WXYZ as a translation.

### How §8 unifies this

Section 8 showed that any camera orientation reduces to three precomputed
4-vectors in ABCD space: **p_x**, **p_y**, **p_depth**. The same principle
applies to cutplanes and projection planes.

**Camera view** = which direction we look from:

```
For each vertex (a, b, c, d):
  screen_x = a*p_x.a + b*p_x.b + c*p_x.c + d*p_x.d
  screen_y = a*p_y.a + b*p_y.b + c*p_y.c + d*p_y.d
  depth    = a*p_d.a + b*p_d.b + c*p_d.c + d*p_d.d
```

**Cutplane** = which side of a plane to keep:

```
vertex_distance = a*p_cut.a + b*p_cut.b + c*p_cut.c + d*p_cut.d
visible = (vertex_distance > threshold)
```

**Projection plane** = flatten 3D geometry to 2D shadow:

```
proj_x = a*p_px.a + b*p_px.b + c*p_px.c + d*p_px.d
proj_y = a*p_py.a + b*p_py.b + c*p_py.c + d*p_py.d
```

All three operations are the same shape: **a dot product of ABCD with a
precomputed 4-vector**. The only difference is what we do with the result
(display it, threshold it, or flatten to it).

### The seven views as stored 4-vector triplets

Each standard view becomes a precomputed constant — a triplet of 4-vectors
`(p_x, p_y, p_depth)` derived once from `N^T * Basis^T * u_camera`:

```
VIEW_TOP   = { p_x: [...], p_y: [...], p_depth: [...] }
VIEW_FRONT = { p_x: [...], p_y: [...], p_depth: [...] }
VIEW_QW    = { p_x: [...], p_y: [...], p_depth: [...] }
VIEW_QX    = { p_x: [...], p_y: [...], p_depth: [...] }
...
```

The orbit camera (free rotation) computes these three 4-vectors each frame
from the current yaw/pitch. The on-axis presets are just special cases where
the vectors are known constants.

### XYZ and WXYZ are the same thing

This is the key insight. In the JS app, switching from XYZ to WXYZ axes
requires branching into different code paths with different normal vectors
and different snap intervals. In the ABCD-native pipeline, **both are just
different 4-vectors**:

| View | p_depth (ABCD coefficients) | Origin |
|---|---|---|
| Top (Z) | Derived from `N^T * Basis^T * (0,0,1)` | Cartesian axis |
| Front (Y) | Derived from `N^T * Basis^T * (0,1,0)` | Cartesian axis |
| QW (D) | Derived from `N^T * Basis^T * (-1,-1,1)/√3` | Quadray axis |
| QX (A) | Derived from `N^T * Basis^T * (1,1,1)/√3` | Quadray axis |

The shader code is identical for all views. The CPU precomputation differs,
but the per-vertex math is always `abcd . p = scalar`. No `if (basis ===
"tetrahedral")`. No separate code paths. No conceptual privilege for either
basis.

In fact, the WXYZ views are **more natural** in this system than XYZ views.
The Quadray axes are cube diagonals — integer directions `(±1,±1,±1)` in
Cartesian, which means their ABCD projection vectors have simpler
coefficients. The XYZ axes are the ones that require the Tom Ace basis
to express in ABCD space. The historical "primary" and "secondary" roles
are reversed.

### Cutplane snap intervals in ABCD space

The JS app snaps the cutplane slider to grid intervals:
- **XYZ snap**: step = 1.0 (Cartesian grid spacing)
- **WXYZ snap**: step = √6/4 ≈ 0.612 (Quadray grid spacing, from `PureRadicals`)

In ABCD space, the Quadray snap is the natural one — it counts integer
multiples of the grid interval along a basis vector. The Cartesian snap
is the derived quantity. The √6/4 is not a special constant to be looked
up; it is the **unit step** of the native coordinate system.

### Projection and convex hull in ABCD space

The JS app's projection pipeline (in `rt-projections.js`) works as:

1. Extract world vertices from polyhedron group (XYZ)
2. Choose projection plane normal (XYZ vector)
3. Project vertices onto plane (XYZ dot products)
4. Compute 2D convex hull (Graham scan on projected XY)
5. Render hull polygon + rays

In the ABCD pipeline, steps 1–3 collapse:

1. Read ABCD vertex coordinates (integers or algebraic)
2. Compute `(proj_x, proj_y) = (abcd . p_px, abcd . p_py)` for each vertex
3. Compute 2D convex hull (Graham scan — unchanged)
4. Render hull polygon + rays

The hull computation is basis-agnostic — it operates on 2D points regardless
of how they were produced. The projection step becomes two dot products per
vertex instead of a matrix multiply plus XYZ normal construction.

### Implementation path (post-core)

These are research extensions after the core wireframe renderer is working:

1. **Precompute the seven standard view 4-vector triplets** from
   `N^T * Basis^T * u_camera` — store as constants, verify against
   current JS rendering output.

2. **Camera presets as 4-vector lookups** — on-axis view buttons select
   a stored `(p_x, p_y, p_depth)` triplet. Orbit camera computes them
   per frame from yaw/pitch.

3. **Cutplane in ABCD space** — `abcd . p_cut > threshold` replaces
   `THREE.Plane(normal_xyz, distance)`. Snap intervals are integer
   multiples of the native grid step.

4. **Projection in ABCD space** — convex hull on `(abcd . p_px, abcd . p_py)`
   directly, no XYZ intermediate.

5. **Wireframe painter's algorithm** (§8) — depth-sorted 2D lines with
   ABCD-space back-face culling. No GPU 3D pipeline required.
