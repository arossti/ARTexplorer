# ARTEX-RATIONALE: Why Quadray-Native Rendering Changes Everything

**The case for ABCD as the canonical coordinate system — not an encoding of XYZ.**

> Written February 2026. This document records the foundational insight
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

## 2. The Tom Ace Conversion: A Projection, Not a Foundation

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

## 7. Summary: The Revolution

Traditional 3D geometry software defines everything in Cartesian XYZ.
Tetrahedral coordinates are an afterthought, a curiosity, a "conversion."

ARTexplorer inverts this. **Quadray ABCD is the canonical system.** The polyhedra
live there as integers. The relationships between them — nesting, duality,
edge ratios — are exact integer arithmetic. The irrationals that appear in
classical geometry (sqrt(2) for tet/cube edge ratio, sqrt(3) for circumradius)
are artifacts of projecting to XYZ, not properties of the geometry.

The native app renders ABCD directly to the screen. The Tom Ace basis is folded
into the camera matrix. XYZ is not computed, not stored, not named. The pipeline
is:

```
Integer ABCD  →  GPU shader  →  clip space  →  pixels
```

This is, to our knowledge, a world first: a 3D rendering pipeline where the
canonical coordinate system is tetrahedral, and Cartesian coordinates never
appear as an explicit intermediate representation.

---

*"The geometry is tetrahedral. The screen is Cartesian. The bridge between them
is one matrix multiply. Everything else is convention."*
