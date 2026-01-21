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
- [x] **IVM Octahedra**: FCC lattice + 4× spacing for edge-to-edge colinearity ✅
- [ ] **IVM Tetrahedra**: Add `ivmMode` to fill voids between IVM octahedra
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

### Target Configuration: Octet Truss (IVM)

The IVM (Isotropic Vector Matrix) is an octet truss where:
- **Central octahedron** at origin
- **12 octahedra** surround it at F2 (using FCC lattice), all **edge-to-edge** (colinear edges, no overlap)
- **8 tetrahedra** fill the voids between octahedra at each frequency
- When 4 "up" tetrahedra meet 4 "down" tetrahedra, they form a **cuboctahedral void** at their shared vertex

### IVM Octahedra Implementation ✅ SOLVED (Geodesic Frequency Pattern)

**The correct approach**: IVM octahedra follow a **geodesic frequency pattern** similar to geodesic sphere subdivision, NOT FCC lattice or taxicab stellation.

#### Geodesic Frequency Pattern for Octahedra

The key insight is that octahedra expansion follows the same odd/even alternation as geodesic frequency:

| Frequency | XY Grid Pattern | Center at Origin? | XY Layer Count |
|-----------|-----------------|-------------------|----------------|
| F1 (odd)  | 1×1 | YES - octahedron at origin | 1 |
| F2 (even) | 2×2 | NO - shared vertex at origin | 4 |
| F3 (odd)  | 3×3 | YES - octahedron at origin | 9 |
| F4 (even) | 4×4 | NO - shared vertex at origin | 16 |
| F5 (odd)  | 5×5 | YES - octahedron at origin | 25 |

**Critical rule**:
- **Odd frequencies** (F1, F3, F5): n×n grid WITH center octahedron
- **Even frequencies** (F2, F4): n×n grid with shared VERTEX at origin (no center oct)

#### Stacked Layer Structure

Each frequency builds stacked layers, with each tier up/down decreasing frequency by 1:

**F1 (1 total)**:
- XY layer: 1 (F1 odd, has center)

**F2 (6 total)**:
- XY layer: 4 (F2 even, vertex at origin)
- Upper tier: 1 (F1 odd, apex)
- Lower tier: 1 (F1 odd, nadir)

**F3 (19 total)**:
- XY layer: 9 (F3 odd, has center)
- Upper tier 1: 4 (F2 even)
- Lower tier 1: 4 (F2 even)
- Upper tier 2: 1 (F1 odd, top)
- Lower tier 2: 1 (F1 odd, bottom)

**F4 (44 total)**:
- XY: 16 + Upper/Lower tier 1: 9+9 + Tier 2: 4+4 + Tier 3: 1+1 = 44

**F5 (85 total)**:
- 25 + 16+16 + 9+9 + 4+4 + 1+1 = 85

#### Implementation

```javascript
getIVMOctahedronLayer: (frequency, unit, z) => {
  const positions = [];

  if (frequency % 2 === 1) {
    // Odd: n×n grid WITH center (0, ±2, ±4, ...)
    const extent = frequency - 1;
    for (let i = -extent; i <= extent; i += 2) {
      for (let j = -extent; j <= extent; j += 2) {
        positions.push({ x: i * unit, y: j * unit, z: z });
      }
    }
  } else {
    // Even: n×n grid with vertex at origin (±1, ±3, ...)
    const extent = frequency - 1;
    for (let i = -extent; i <= extent; i += 2) {
      if (i === 0) continue;
      for (let j = -extent; j <= extent; j += 2) {
        if (j === 0) continue;
        positions.push({ x: i * unit, y: j * unit, z: z });
      }
    }
  }
  return positions;
}
```

#### Why NOT FCC Lattice

Previous attempts used FCC lattice which gives counts of 1, 13, 55, 147, 309 (rhombic dodec numbers). This is **incorrect** for IVM octahedra nesting because:

1. FCC assumes center octahedron at every frequency
2. FCC doesn't respect the odd/even vertex-sharing alternation
3. The counts don't match the tetrahedra IVM void structure

#### The 45° Rotation (Two-Stage)

The IVM octahedra require **two** 45° rotations using `RT.applyRotation45()`:

1. **Individual octahedron rotation**: Each octahedron is rotated 45° about Z-axis at origin BEFORE translation. This aligns edges for colinear edge contact between adjacent octahedra.

2. **Constellation rotation**: The entire `matrixGroup` is rotated 45° about Z-axis AFTER all octahedra are positioned. This aligns the octahedra constellation with the tetrahedra IVM lattice orientation.

Both rotations use RT-pure spread/cross values (s=0.5, c=0.5 - exact rationals!).

---

### IVM Tetrahedra Implementation ✅ COMPLETE (Independent Mode)

**Current state**: IVM tetrahedra generate correct space-filling lattice independently using octant void positions around FCC octahedron centers.

**Implementation details:**
- 8 tetrahedra per octahedron center (octant positions)
- Base/dual pairing creates cuboctahedral void pattern
- Frequency slider expands radially with deduplication
- Upper layer: 2 base + 2 dual tets (edges form square)
- Lower layer: inverted pattern (2 dual + 2 base)

---

### The `ivmScaleOnly` Parameter

| Parameter | Size | Positioning | Use Case |
|-----------|------|-------------|----------|
| Both false | 1× | Taxicab | Standard octahedral stellation |
| `ivmScale=true` | 2× | FCC lattice | Full IVM (edge colinearity) |
| `ivmScaleOnly=true` | 2× | Geodesic frequency | **Nesting into tetrahedra** ✅ |

**Implementation** (`createRadialOctahedronMatrix`):
```javascript
// Size: 2× when ivmScale OR ivmScaleOnly
const useScaledSize = ivmScale || ivmScaleOnly;
const octSize = useScaledSize ? halfSize * 2 : halfSize;

// Spacing: 4× for IVM modes
const spacing = (ivmScale || ivmScaleOnly) ? halfSize * 4 : halfSize * 2;

// Position generator
if (ivmScaleOnly) {
  positions = getIVMOctahedronPositions(frequency, spacing); // Geodesic frequency
} else {
  positions = getOctahedronPositions(frequency, spacing, ivmScale); // Taxicab or FCC
}
```

---

### IVM Octahedra Spacing Solution ✅ SOLVED

**The key insight**: All 6 octahedra at F2 (4 perimeter + apex + nadir) must be at the **same radial distance** from origin (outsphere radius = `octSize`).

**Implementation** (`getIVMOctahedronPositions`):
```javascript
const octSize = spacing / 2;  // Actual octahedron size = outsphere radius
const unit = octSize * Math.SQRT1_2;  // XY grid unit for perimeter positioning
const zStep = octSize;  // Z-distance for apex/nadir
```

**Why this works**:
- Perimeter octahedra at `(±1, ±1, 0) * unit` have distance `√2 * unit` from origin
- Setting `unit = octSize / √2 = octSize * SQRT1_2` makes this equal to `octSize`
- Apex/nadir at `(0, 0, ±zStep)` where `zStep = octSize` also at distance `octSize`
- All 6 octahedra converge at origin with vertices meeting at shared point

---

*Workplan created: 2026-01-18*
*Last updated: 2026-01-21*
*Branch: Matrix-Radial*

---

## Lessons Learned: FCC vs Geodesic Frequency (2026-01-20)

### The Multi-Day Debugging Journey

We spent significant time attempting to use FCC lattice and taxicab/Chebyshev distance metrics for IVM octahedra positioning. These approaches consistently failed because:

1. **FCC lattice** produces counts (1, 13, 55, 147, 309) that don't match the IVM void structure
2. **Taxicab distance** doesn't respect the odd/even frequency alternation
3. **Chebyshev distance** creates diamond patterns instead of square grids

### The Breakthrough: Geodesic Frequency Analogy

The solution came from recognizing that IVM octahedra follow the same pattern as geodesic sphere subdivision:

- **Odd frequency**: Polyhedron at center (like Class I geodesics)
- **Even frequency**: Vertex at center (like Class II geodesics)

This odd/even alternation is fundamental to how the IVM lattice grows and how octahedra nest into tetrahedra voids.

### Key Takeaway for Future Agents

**DO NOT use FCC lattice or taxicab/Chebyshev metrics for `ivmScaleOnly` octahedra.**

Use the dedicated `getIVMOctahedronPositions()` function which implements the correct geodesic frequency pattern with:
- n×n grids where n = frequency
- Odd freq: center included (even integer coords: 0, ±2, ±4...)
- Even freq: center excluded (odd integer coords: ±1, ±3, ±5...)
- Stacked layers with decreasing frequency per tier

---

## TODO: Remaining Work

### Nodes and Selection Integration

**Pattern from working implementations** (radial cube, radial RD in `rt-rendering.js`):

1. **Extend `addRadialMatrixNodes()`** (line ~1188) to support new polyhedron types:
   ```javascript
   // Add to the if/else chain at line ~1235:
   } else if (polyhedronType === "tetrahedron") {
     polyGeom = Polyhedra.tetrahedron(scale);
   } else if (polyhedronType === "octahedron") {
     // Note: For ivmScaleOnly, use scale * 2
     polyGeom = Polyhedra.octahedron(scale);
   } else if (polyhedronType === "cuboctahedron") {
     polyGeom = Polyhedra.cuboctahedron(scale);
   }
   ```

2. **Add node generation calls** in `updateScene()` for each radial matrix:
   - Radial Tetrahedron (line ~2090): Add `addRadialMatrixNodes()` call with `getIVMTetrahedronPositions()`
   - Radial Octahedron (line ~2126): Add `addRadialMatrixNodes()` call with `getIVMOctahedronPositions()`
   - Radial Cuboctahedron (line ~2154): Add `addRadialMatrixNodes()` call with `getCuboctahedronPositions()`

3. **Handle IVM scaling** - For octahedra with `ivmScaleOnly=true`, vertices need 45° rotation twice:
   - Individual vertex positions must be rotated to match the octahedron orientations
   - Or: Extract world positions from matrixGroup children after rendering

- [ ] Add node markers at octahedra vertices (like other matrix forms)
- [ ] Enable selection/editing of radial octahedra matrices
- [ ] Add node markers at tetrahedra vertices
- [ ] Enable selection/editing of radial tetrahedra matrices
- [ ] Add node markers at cuboctahedra vertices
- [ ] Enable selection/editing of radial cuboctahedra matrices

### Tetrahedra IVM Frequency Matching
- [ ] **Tetrahedral IVM frequency expansion** - Currently the tetrahedra IVM appears to skip frequencies or not match the octahedra frequency increments. Need to implement proper frequency scaling for tetrahedra to match octahedra (F1=1, F2=6, F3=19, F4=44, F5=85 pattern).

The octahedra implementation now correctly follows geodesic frequency expansion with proper odd/even alternation. The tetrahedra implementation needs similar refinement to ensure both expand in lockstep at each frequency level.
