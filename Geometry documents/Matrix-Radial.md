# Matrix-Radial: Radial Frequency Expansion Workplan

## Quick Implementation Spec

**Module**: `modules/rt-matrix-radial.js` → exports `RTRadialMatrix`

### Function Signatures
```javascript
createRadialCubeMatrix(frequency, halfSize, spaceFilling, opacity, color, THREE) → THREE.Group
createRadialTetrahedronMatrix(frequency, halfSize, spaceFilling, opacity, color, THREE) → THREE.Group
createRadialOctahedronMatrix(frequency, halfSize, spaceFilling, opacity, color, THREE) → THREE.Group
createRadialCuboctahedronMatrix(frequency, halfSize, spaceFilling, opacity, color, THREE) → THREE.Group
createRadialRhombicDodecMatrix(frequency, halfSize, spaceFilling, opacity, color, THREE) → THREE.Group
createRadialIcosahedronMatrix(frequency, halfSize, opacity, color, THREE) → THREE.Group  // no spaceFilling
createRadialDodecahedronMatrix(frequency, halfSize, opacity, color, THREE) → THREE.Group  // no spaceFilling
```

### F2 Position Formulas (spacing = 2 × halfSize)

| Polyhedron | F2 Count | Neighbor Positions |
|------------|----------|-------------------|
| Cube | 1+6=7 | `(±s,0,0), (0,±s,0), (0,0,±s)` |
| Tetrahedron | 1+4=5 | Face normals × spacing (180° rotated) |
| Octahedron | 1+6=7 | `(±s,0,0), (0,±s,0), (0,0,±s)` vertex directions |
| Cuboctahedron | 1+12=13 | 12 vertex directions at edge length |
| Rhombic Dodec | 1+12=13 | 6 cubic + 6 diagonal face directions |
| Icosahedron | 1+12=13 | 12 vertex directions (gaps OK) |
| Dodecahedron | 1+12=13 | 12 face directions (gaps OK) |

### Shell Count Formulas (spaceFilling=true)

| Polyhedron | Formula | F1→F5 |
|------------|---------|-------|
| Cube (solid) | `(2f-1)³` | 1, 27, 125, 343, 729 |
| Cube (stellation) | `(2f-1)(2f²-2f+3)/3` | 1, 7, 25, 63, 129 |
| Rhombic Dodec | `(10f³-15f²+11f-3)/3` | 1, 13, 55, 147, 309 |
| Tet/Oct | n tets requires (n-1) octs for IVM | — |

**Note on Cube Modes:**
- **Space-filling (solid)**: Full `(2f-1)³` cube-of-cubes (3×3×3 at F2, 5×5×5 at F3, etc.)
- **Stellation (octahedral growth)**: Face-connected only using taxicab distance `|x|+|y|+|z| <= f-1`. Creates octahedral/cross shape. Uses centered octahedral numbers.

### Key Rules
- **IVM Complementary**: `n tetrahedra + (n-1) octahedra = space-filling`
- **spaceFilling=false**: Stellation only, leave voids
- **spaceFilling=true**: Fill all positions (cube/rhombic dodec) or add complementary shapes (tet/oct)
- **Icosa/Dodeca**: Always have gaps, no spaceFilling option

### UI Element IDs
- Checkbox: `radialCube`, `radialTet`, `radialOct`, `radialCubocta`, `radialRhombicDodec`, `radialIcosa`, `radialDodeca`
- Frequency: `radialCubeFreq` (1-5), etc.
- Space-filling: `radialCubeSpaceFill`, etc.
- Display: `radialCubeFreqDisplay`, `radialTetOctCount` (shows "+N octs")

---

## Overview

This workplan describes the implementation of **Radial Matrix Frequency** — a new feature that expands polyhedra outward from a central nucleus, packing space as efficiently as possible for each polyhedron type. Unlike the existing N×N planar matrix arrays, radial expansion grows concentrically in all directions, following crystallographic growth patterns.

## Current State (N×N Planar Matrices)

The existing `rt-matrix-planar.js` implements 2D planar arrays:
- **Cube Matrix**: Simple orthogonal grid, edge-to-edge contact
- **Tetrahedron Matrix**: Checkerboard alternating orientations
- **Octahedron Matrix**: Square grid with optional interstitial filling
- **Cuboctahedron Matrix**: Face-to-face via square faces
- **Rhombic Dodecahedron Matrix**: Face-to-face via rhombic faces

All use `spacing = 2 * halfSize` (cube edge) and generate N×N grids centered at origin in the X-Y plane.

## Radial Matrix Frequency Concept

### Frequency Definition
- **F1 (Frequency 1)**: Single nucleus polyhedron at origin
- **F2 (Frequency 2)**: Nucleus + first shell of adjacent polyhedra
- **F3+**: Additional concentric shells

### Core Principle
Each frequency level adds a complete "shell" of polyhedra around the existing structure, following crystallographic growth rules to:
1. Fill space without voids (where possible)
2. Avoid polyhedra intersection/overlap
3. Maintain rational exactness (RT-Pure methodology)

---

## Per-Polyhedron F2 Specifications

### 1. Hexahedron (Cube) — F2: 7 cubes total

**Geometry**: 6 cubes attach face-to-face to the 6 faces of the central cube.

```
      [T]           (Top)
       |
[L] - [C] - [R]     (Left - Center - Right)
       |
      [B]           (Bottom)
       |
      [F][K]        (Front, Back along Z)
```

**Positions** (center at origin, spacing = 2×halfSize):
- Center: (0, 0, 0)
- +X face: (+spacing, 0, 0)
- -X face: (-spacing, 0, 0)
- +Y face: (0, +spacing, 0)
- -Y face: (0, -spacing, 0)
- +Z face: (0, 0, +spacing)
- -Z face: (0, 0, -spacing)

**Space-filling**: YES — cubes tile 3D space perfectly.

**Beyond F2 Decision Point**:
- **Option A (Stellation)**: Continue radially outward only — each F2 cube gets 5 new neighbors (not counting the direction toward center). Creates a cross/axis pattern.
- **Option B (Void-filling)**: Fill all positions to create a larger cube-of-cubes (3×3×3 at F3, etc.). Standard crystallographic growth.
- **Option C (Ray projection)**: Extend only along primary axes, creating 6 rays of cubes.

**Recommended**: Option B (void-filling) as default — matches cubic crystal growth. Option A/C could be toggles.

---

### 2. Tetrahedron — F2: 5 tetrahedra total (Stella Octangula configuration)

**Geometry**: 4 tetrahedra attach face-to-face to each of the 4 faces of the central tetrahedron, creating a simple stellation.

**Key Insight**: When you attach a tetrahedron to each face of a tetrahedron, the 4 new tetrahedra form the 4 corners of a larger tetrahedron, with the original at center. The outer vertices form a **Stella Octangula** (tetrahedron + inverted dual).

**Positions**:
- Center tetrahedron at origin (vertices at alternating cube vertices)
- Each face-attached tetrahedron is rotated 180° relative to center
- Face normal vectors point to adjacent tetrahedron centers

**Space-filling**: NO — tetrahedra alone do not fill space. The voids between F2 tetrahedra are **octahedral**.

**Beyond F2 Challenge**:
- Pure tetrahedral stellation creates voids
- **IVM Solution**: Fill octahedral voids with octahedra (octet truss)
- **Alternative**: Accept voids for pure tetrahedral aesthetic
- **Helix Mode**: Specific face-selection rules for spiral growth (future feature)

---

### 3. Octahedron — F2: 7 octahedra total (approximate)

**Geometry**: Octahedra share edges, not faces, when packing. Two approaches:

**Approach A (Vertex-to-vertex stellation)**:
- 6 octahedra at each axial vertex direction
- Creates star-like pattern
- Significant voids remain

**Approach B (Edge-sharing IVM)**:
- Octahedra in IVM share edges
- Requires alternating with tetrahedra to fill space
- More complex positioning

**Space-filling**: NO — octahedra alone do not fill space. Combined with tetrahedra in 1:2 ratio, they form the **Octet Truss** (IVM).

**Beyond F2**:
- Pure octahedral growth leaves tetrahedral voids
- Toggle option: Fill tetrahedral voids with tets (IVM mode) vs. leave voids

---

### 4. Cuboctahedron (Vector Equilibrium) — F2: 13 VEs total

**Geometry**: The cuboctahedron is the nucleus of the IVM. F2 expansion:
- 12 VEs surrounding the central VE (one at each vertex direction)
- Square faces align with adjacent VE square faces
- Triangular faces face outward (or toward octahedral voids)

**Key Property**: VE has 12 vertices; each vertex direction corresponds to one of the 12 surrounding VEs in close-packing.

**Positions**: 12 directions from center at distance = edge length
- 6 along cubic axes (±x, ±y, ±z)
- 6 along face diagonals

**Space-filling**: VEs alone leave voids. Combined with octahedra, they fill space (IVM proper).

---

### 5. Rhombic Dodecahedron — F2: 13 rhombic dodecs total

**Geometry**: Rhombic dodecahedra are **space-filling** on their own. F2:
- 12 rhombic dodecahedra surrounding central one
- Face-to-face contact on all 12 rhombic faces
- Exactly fills space with no voids

**Key Property**: The rhombic dodecahedron is the Voronoi cell of FCC (face-centered cubic) lattice.

**Positions**: 12 neighbors at face-center directions
- 6 at cubic face directions
- 6 at edge midpoint directions (offset diagonals)

**Space-filling**: YES — perfect tiling like cubes.

**Beyond F2**: Straightforward concentric growth. Each shell adds a complete layer. Count follows FCC shell sequence.

---

### 6. Icosahedron — F2: 13 icosahedra total (approximate)

**Geometry**: Icosahedra are NOT space-filling. F2 is necessarily approximate:
- 12 icosahedra at vertex directions (face-to-face with triangular faces)
- Or 20 at face directions
- Significant gaps/overlaps depending on approach

**Strategy**:
- Accept gaps for aesthetic/educational visualization
- Show as vertex-to-vertex stellation (12 neighbors)
- Indicate non-space-filling nature in UI/docs

**Space-filling**: NO — impossible with regular icosahedra.

---

### 7. Dodecahedron — F2: Variable

**Geometry**: Dodecahedra are NOT space-filling on their own.
- Face-to-face attachment at 12 pentagonal faces
- Creates significant gaps

**Strategy**: Similar to icosahedron — accept gaps, show stellation pattern.

**Space-filling**: NO — requires other polyhedra to fill gaps (e.g., with rhombic triacontahedra).

---

## Growth Rules & Conventions

### Crystallographic Principles

1. **Bravais Lattice Alignment**:
   - Cubes, rhombic dodecahedra → Cubic/FCC lattice
   - Tetrahedra/octahedra → Octet truss (IVM)
   - Maintain lattice consistency across frequencies

2. **Shell Counting**:
   - F(n) shell count follows geometric series
   - Cubes: 1, 7, 25, 63... (n³ for solid, shell = n³ - (n-2)³)
   - FCC (rhombic dodec): 1, 13, 55, 147... (Mackay icosahedra sequence for FCC)

3. **Coordination Number**:
   - Cube: 6 neighbors (simple cubic)
   - Rhombic dodecahedron: 12 neighbors (FCC)
   - VE: 12 neighbors (same as FCC)

### Void-Handling Strategy

| Polyhedron | Voids at F2+ | Strategy |
|------------|--------------|----------|
| Cube | None | Perfect space-filling |
| Tetrahedron | Octahedral | Option: Fill with octs (IVM) or leave |
| Octahedron | Tetrahedral | Option: Fill with tets (IVM) or leave |
| Cuboctahedron | Octahedral | Option: Fill with octs or leave |
| Rhombic Dodec | None | Perfect space-filling |
| Icosahedron | Irregular | Accept gaps |
| Dodecahedron | Irregular | Accept gaps |

### Convention Decisions Required

1. **Growth Mode Toggle** (applies to all polyhedra):
   - `spaceFilling`: Fill all voids to create solid growth (default for cube, rhombic dodec)
   - `stellation`: Extend radially outward only, leaving interior voids

   This mirrors planar matrix options like "face coplanarity" and "edge colinearity" — we use consistent terminology across both planar and radial matrices.

2. **IVM Complementary Counting** (Tet/Oct space-filling):
   Similar to planar matrices where **n tetrahedra + (n-1) octahedra = space-filling**, radial growth follows the same principle:

   | Tet Frequency | Oct Count for Space-Fill |
   |---------------|--------------------------|
   | 5 tets | 4 octs |
   | 6 tets | 5 octs |
   | 17 tets | 16 octs |

   When `spaceFilling: true`, the system automatically calculates and renders the complementary polyhedra count. The UI should display both counts.

3. **Helix Preparation** (future `rt-matrix-helices.js`):
   - Tetrahedra can form left-hand or right-hand helices
   - Specific face-selection rules: always attach to "same face" creates helix
   - Future: `helixMode` option with `chirality: left|right` parameter

---

## UI Design

### New Controls (under "Matrices" section)

```html
<!-- Radial Matrix Frequency Controls -->
<div class="feature-divider">Radial Matrices</div>

<div class="param-row">
  <label for="radialCube" title="Radial cube matrix">
    <input type="checkbox" id="radialCube" />
    Cube (Radial)
  </label>
</div>
<div class="param-row">
  <label for="radialCubeFreq">Frequency</label>
  <input type="range" id="radialCubeFreq" min="1" max="5" value="1" />
  <span id="radialCubeFreqDisplay">1</span>
</div>
<div class="param-row">
  <label for="radialCubeSpaceFill" title="Fill voids vs stellation only">
    <input type="checkbox" id="radialCubeSpaceFill" checked />
    Space-filling
  </label>
</div>

<!-- For Tet/Oct, show complementary count -->
<div class="param-row">
  <label for="radialTet" title="Radial tetrahedron matrix">
    <input type="checkbox" id="radialTet" />
    Tetrahedron (Radial)
  </label>
</div>
<div class="param-row">
  <label for="radialTetFreq">Frequency</label>
  <input type="range" id="radialTetFreq" min="1" max="5" value="1" />
  <span id="radialTetFreqDisplay">1</span>
  <span id="radialTetOctCount" class="count-hint">(+0 octs)</span>
</div>
<div class="param-row">
  <label for="radialTetSpaceFill" title="Add octahedra to fill voids">
    <input type="checkbox" id="radialTetSpaceFill" />
    Space-filling
  </label>
</div>

<!-- Repeat pattern for Oct, Cubocta, Rhombic Dodec, Icosa, Dodeca -->
```

**Note**: For Tet/Oct radial matrices, when "Space-filling" is checked, the complementary polyhedra count is displayed (e.g., "5 tets (+4 octs)").

### Frequency Slider
- **Range**: 1–5 (keeps polyhedra count manageable)
- **Display**: Show current frequency value
- **Performance**: Cap at F5 to prevent overwhelming the scene

### Polyhedra Count Estimates

| Frequency | Cube (solid) | Rhombic Dodec | Tet (no voids) | Oct (no voids) |
|-----------|--------------|---------------|----------------|----------------|
| F1 | 1 | 1 | 1 | 1 |
| F2 | 7 | 13 | 5 | 7 |
| F3 | 25 | 55 | ~17 | ~25 |
| F4 | 63 | 147 | ~49 | ~63 |
| F5 | 129 | 309 | ~113 | ~129 |

---

## Module Architecture

### File Structure
```
modules/
├── rt-matrix-planar.js    ← renamed rt-matrix.js - Existing planar N×N matrices
├── rt-matrix-radial.js    ← NEW: Radial frequency matrices
└── rt-matrix-helices.js   ← FUTURE: Helix generation from radial seeds
```

**Rationale**: Keep modules compact and focused. Radial matrices have distinct logic from planar matrices (shell-based vs grid-based), and helices will have their own face-selection rules that warrant separation.

---

## Implementation Phases

### Phase 1: Core Infrastructure ✅ COMPLETE
- [x] Create `rt-matrix-radial.js` module
- [x] Implement `RTRadialMatrix` namespace with shared utilities
- [x] Add frequency-based shell position calculator
- [x] Import from `rt-math.js` and `rt-polyhedra.js`

### Phase 2: Space-Filling Polyhedra ✅ COMPLETE
- [x] `createRadialCubeMatrix(frequency, halfSize, spaceFilling, ...)` — with solid + stellation modes
- [x] `createRadialRhombicDodecMatrix(frequency, halfSize, ...)` — FCC lattice, always space-filling
- [x] Validate space-filling at each frequency
- [x] Vertex node integration via `addRadialMatrixNodes()`

**Implementation Notes (Phase 2):**
- Cube stellation uses centered octahedral numbers: `(2f-1)(2f²-2f+3)/3`
- Cube stellation constraint: taxicab distance `|x|+|y|+|z| <= f-1`
- RD uses FCC shell metric: `(|i|+|j|+|k|)/2` for half-integer coords where `i+j+k` is even
- RD has no space-fill toggle (inherently space-filling, no voids possible)

### Phase 3: IVM Polyhedra (Tet/Oct Complementary) 🔄 IN PROGRESS
- [x] `createRadialTetrahedronMatrix(frequency, halfSize, ...)` — basic taxicab stellation
- [x] `createRadialOctahedronMatrix(frequency, halfSize, ivmScale, ...)` — with 2× IVM scale option
- [x] `createRadialCuboctahedronMatrix(frequency, halfSize, ...)` — FCC lattice positioning
- [ ] Implement proper IVM edge-to-edge close-packing (see "IVM Close-Packing Geometry" below)
- [ ] Implement IVM complementary counting

### Phase 4: Non-Space-Filling Polyhedra ⏸️ DEFERRED
> *Icosahedron and Dodecahedron radial matrices deferred — these have irregular gaps*
> *and are lower priority than IVM polyhedra and helix foundation.*
- [ ] `createRadialIcosahedronMatrix(frequency, halfSize, ...)`
- [ ] `createRadialDodecahedronMatrix(frequency, halfSize, ...)`
- [ ] Document gaps and stellation-only behavior

### Phase 5: UI Integration ✅ COMPLETE (for Phase 2 polyhedra)
- [x] Add radial matrix controls to `index.html` (Cube + RD)
- [x] Wire up event handlers in `rt-init.js`
- [x] Add radial groups to `rt-rendering.js`
- [ ] Implement state save/load for radial settings (pending)

### Phase 6: Helix Foundation (separate module)
- [ ] Create `rt-matrix-helices.js` module
- [ ] Design face-selection rules for helical growth
- [ ] Implement `helixMode` parameter for tetrahedra
- [ ] Add chirality toggle (left/right hand)

---

## Technical Considerations

### RT-Pure Compliance
- All position calculations use quadrance where applicable
- Rotations via `RT.applyRotation45()` and `RT.applyRotation180()`
- No `Math.PI`, `Math.sin`, `Math.cos` in matrix generation
- Deferred √ expansion until Vector3 creation

### Performance
- Use instanced geometry for F4+ (many identical polyhedra)
- Consider LOD (level-of-detail) for distant shells
- Profile with F5 and high-frequency geodesics combined

### Validation
- Add `validateRadialSpacing()` using quadrance
- Console logging for each shell generation
- Error display for invalid configurations

---

## References

- Fuller, R.B. *Synergetics*: Sections 400-480 (IVM), 610 (Jitterbug), 950-954 (Closest Packing)
- Weisstein, Eric W. "Rhombic Dodecahedron." *MathWorld*
- Mackay, A.L. "A dense non-crystallographic packing of equal spheres" (icosahedral clusters)
- IUCr. *International Tables for Crystallography, Volume A: Space-group symmetry*

---

## Future Extensions

1. **Helix Generation**: Tetrahelices from face-selection rules
2. **Mixed-Polyhedra Radial**: IVM with both tets and octs visible
3. **Frequency Animation**: Animate growth from F1 to Fn
4. **Sectioning**: Cut radial structures with papercut plane
5. **Dual Overlays**: Show VE and rhombic dodec together (dual relationship)

---

## Lessons Learned: Radial vs Planar Matrices

### Key Insight: Center Polyhedron Presence
- **Radial matrices** always have a center polyhedron at origin (F1 = 1)
- **Planar 2×2 matrices** have NO center polyhedron (4 at corners, centered on origin)
- This affects how we think about "space-filling" — radial grows outward FROM a nucleus

### Applying Planar Logic to Radial
The planar matrix implementation (especially the cuboctahedron/octahedron/RD relationships) informs radial matrix design:

1. **Face coplanarity / Edge colinearity toggles** in planar matrices control void filling
2. **Radial equivalent**: The `spaceFilling` toggle serves similar purpose
3. **Future possibility**: Add coplanarity/colinearity switches to radial matrices for finer control over which voids get filled

### Void-Filling Philosophy
When a radial matrix has voids (e.g., cube stellation at F3 has 8 corner voids):
- **Option A**: Leave voids (pure stellation aesthetic)
- **Option B**: Fill with same polyhedron type (becomes space-filling)
- **Option C**: Fill with complementary polyhedra (IVM approach for tet/oct)

Currently implemented: Options A and B for cube, Option B only for RD (no voids possible).

---

## IVM Close-Packing Geometry (Phase 3 Enhancement)

### Problem Statement

The current IVM Scale implementation (2× octahedron scaling) correctly sizes the octahedra to match tetrahedron face dimensions, but the **positioning/spacing is wrong**. The octahedra overlap each other instead of touching edge-to-edge.

### Target Configuration: Octet Truss (IVM)

The IVM (Isotropic Vector Matrix) is an octet truss where:
- **Central octahedron** at origin (yellow in reference images)
- **6 octahedra** surround it at F1, all **edge-to-edge** (colinear edges, no overlap)
- **8 tetrahedra** fill the voids between octahedra
- When 4 "up" tetrahedra meet 4 "down" tetrahedra, they form a **cuboctahedral void** at their shared vertex

### Key Geometry Relationships

**Octahedron Dimensions (for IVM-scaled oct at 2× halfSize):**
- Edge length: `2√2 × halfSize` (matches tetrahedron edge)
- Vertex-to-vertex (diagonal when viewed in plan): `4 × halfSize`
- Outsphere radius: `2 × halfSize` (vertex touches sphere)

**Edge-to-Edge Spacing:**
For octahedra to touch edge-to-edge (not vertex-to-vertex), the center-to-center distance should be:
- **Spacing = diagonal dimension = 4 × halfSize** (when viewed from above, the "width" of the octahedron)
- This equals `2 × outsphere radius`

### Current vs Required Positioning

| Mode | Current Spacing | Required Spacing | Result |
|------|-----------------|------------------|--------|
| Standard | `2 × halfSize` | `2 × halfSize` | Correct (vertex-to-vertex) |
| IVM Scale | `2 × halfSize` | `4 × halfSize` | **WRONG** (overlapping) |

### Proposed Solution: IVM Mode Positioning

When `ivmScale = true`:

1. **Scale octahedra 2×** (already implemented) → edge = `2√2 × halfSize`
2. **Double the spacing** → spacing = `4 × halfSize` (octahedra touch edge-to-edge)
3. **No octahedron at origin** (optional) → center void for tetrahedra OR keep central oct
4. **First shell = 6 octahedra** at `(±spacing, 0, 0), (0, ±spacing, 0), (0, 0, ±spacing)`

### Tetrahedral Layer Positioning

The tetrahedra fill voids between octahedra. Key insight from testing:
- Tetrahedra need **alternating orientations** (up/down based on parity)
- When 4 "up" tets meet 4 "down" tets vertex-to-vertex, they create a cuboctahedral void
- The pattern is **not pure taxicab stellation** — rotations matter

**Tetrahedral positions relative to octahedral centers:**
- Tets sit at the 8 octants: `(±s/2, ±s/2, ±s/2)` relative to oct centers
- Orientation alternates: `(i+j+k) % 2 == 0` → "up", else → "down"

### Layer Structure

The IVM has a layered structure that's not purely radial:
- **Layer 0 (z=0)**: Planar arrangement of octahedra + tetrahedra
- **Layer ±1**: Offset layer (shifted by half-spacing in x and y)
- Pattern repeats with alternating offsets

This is fundamentally different from pure taxicab radial growth and may require a separate `ivmMode` position generator.

### Implementation Options

**Option A: Adjust spacing only**
- Keep taxicab positions, just change spacing to `4 × halfSize` when IVM
- Simple but may not create correct edge alignment

**Option B: True IVM lattice generator**
- New function: `getIVMOctahedronPositions(frequency, spacing)`
- Implements proper FCC-like lattice with correct layer offsets
- More complex but geometrically correct

**Option C: Planar + layer stacking**
- Reuse planar matrix logic for individual layers
- Stack layers with 180° rotation offset
- Leverages existing working code

### Next Steps

1. Verify the edge-to-edge spacing calculation: `4 × halfSize` for IVM-scaled octs
2. Test Option A (spacing adjustment) first — quickest to validate
3. If edge alignment is wrong, implement Option B or C
4. Add tetrahedral void-filling once octahedral layer is correct

---

*Workplan created: 2026-01-18*
*Last updated: 2026-01-19*
*Branch: Matrix-Radial*
