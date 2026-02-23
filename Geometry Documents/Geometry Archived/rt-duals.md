# Dual Polyhedra Refactoring Plan

**Objective:** Eliminate redundant geometry definitions for dual polyhedra by deriving them from base polyhedra using RT-pure transformations.

## Problem Statement

Currently, `rt-polyhedra.js` contains verbose, duplicate geometry definitions for dual polyhedra:

- **`dualTetrahedron()`** (lines 131-166): 35+ lines defining vertices, edges, faces independently
- **`dualIcosahedron()`** (lines 385-543): 160+ lines with redundant vertex/edge/face topology

This violates DRY principle and creates maintenance burden. Changes to base polyhedra don't propagate to duals, and geodesic subdivision features aren't inherited.

## Geometric Relationships

### Dual Tetrahedron

**Transformation:** Inversion (180° rotation)

- **Operation:** Multiply all vertices by -1
- **Face Winding:** Reverse to maintain outward normals
- **Scale:** Identical to base (halfSize remains unchanged)
- **Code:**

```javascript
dualTetrahedron: (halfSize = 1) => {
  const base = Polyhedra.tetrahedron(halfSize);
  const vertices = base.vertices.map(v => v.clone().multiplyScalar(-1));
  const faces = base.faces.map(face => [...face].reverse());
  return { vertices, edges: base.edges, faces };
};
```

**Mathematical Verification:**

- Base vertex: `(-s, -s, -s)` → Dual vertex: `(s, s, s)` ✓
- Base vertex: `(s, s, -s)` → Dual vertex: `(-s, -s, s)` ✓
- Edge quadrance: Q = 8s² (preserved under inversion)

### Dual Icosahedron

**Transformation:** Scale + Z-axis rotation (90° clockwise)

- **Scale Factor:** φ (golden ratio) to align with dodecahedron face centers
- **Rotation:** -90° around Z-axis (clockwise when viewed from +Z)
- **RT Purity:** Uses **exact integer spread values** (s=1, c=0)
- **Code:**

```javascript
dualIcosahedron: (halfSize = 1) => {
  const phi = RT.Phi.value(); // (1 + √5)/2
  const dualRadius = phi * halfSize; // Scale to dodecahedron face radius

  // Get base icosahedron at dual scale
  const base = Polyhedra.icosahedron(dualRadius);

  // Apply RT-pure Z-rotation: -90° → (x,y,z) → (y,-x,z)
  // Spread s = sin²(-π/2) = 1 (exact integer!)
  // Cross c = cos²(-π/2) = 0 (exact integer!)
  const vertices = base.vertices.map(v => new THREE.Vector3(v.y, -v.x, v.z));

  return { vertices, edges: base.edges, faces: base.faces };
};
```

**Mathematical Verification:**

- Rotation matrix: R_z(-π/2) = `[[0, 1, 0], [-1, 0, 0], [0, 0, 1]]`
- Pure integer transformation (only 0, 1, -1 multiplication)
- No transcendental functions - optimal RT approach
- Face winding preserved (rotation maintains handedness)

## Color Scheme

**Important:** Dual polyhedra use **reciprocal complementary colors** - the color relationship is symmetric and reversible.

### Color Relationship Rules

- **Base Polyhedra:** Primary color (e.g., Color A)
- **Base Geodesic Subdivisions:** Complementary color (e.g., Color B)
- **Dual Polyhedra:** Use base's complementary color (Color B)
- **Dual Geodesic Subdivisions:** Use base's primary color (Color A)

**The symmetry:** Base and Dual swap their solid/geodesic color assignments.

### Example: Tetrahedron Color Relationships

```
Base Tetrahedron (solid):          Color A (primary)
Base Tetrahedron (geodesic):       Color B (complementary)

Dual Tetrahedron (solid):          Color B (complementary - matches base geodesic)
Dual Tetrahedron (geodesic):       Color A (primary - matches base solid)
```

**Stella Octangula Example:** When displaying both tetrahedra together:

- Base solid + Dual solid = Colors A & B (complementary pair)
- Base geodesic + Dual geodesic = Colors B & A (same complementary pair, reversed)
- Perfect visual symmetry reflecting the geometric duality

This approach ensures:

- Color distinguishes base (primary) from dual (complementary)
- Geodesic versions complete the color swap
- Visual consistency reflects the mathematical dual relationship
- The complementary relationship works both ways (dual of dual returns to original colors)

## Benefits of Refactoring

1. **DRY Principle:** Single source of truth for geometry
2. **Geodesic Inheritance:** Dual polyhedra automatically support frequency subdivision
3. **Maintenance:** Fix base → dual updates automatically
4. **RT Purity:** Dual icosa uses exact integer spread (s=1, c=0)
5. **Code Reduction:**
   - Dual tetrahedron: 35 lines → 4 lines (88% reduction)
   - Dual icosahedron: 160 lines → 12 lines (92% reduction)
6. **Consistency:** Duals always perfectly aligned with base polyhedra
7. **Feature Parity:** Both base and dual can be geodesic-subdivided with identical UI controls
8. **Color Harmony:** Dual polyhedra automatically use complementary colors matching geodesic subdivisions

## Implementation Steps

### Phase 1: Dual Tetrahedron (Simple - Inversion)

1. ✅ Verify geometric relationship (inversion + face reversal)
2. Replace verbose implementation with 4-line inversion
3. Test with all edge cases (halfSize variations)
4. Verify RT edge quadrance validation still passes
5. Commit: "Refactor: Derive dualTetrahedron from base via inversion"

### Phase 2: Dual Icosahedron (RT-Pure Rotation)

1. ✅ Verify geometric relationship (φ-scale + Z-rotation)
2. Replace verbose implementation with scale + rotation
3. Preserve RT-pure integer spread approach (s=1, c=0)
4. Test alignment with dodecahedron face centers
5. Verify RT edge quadrance validation at dual radius
6. Commit: "Refactor: Derive dualIcosahedron from base via RT-pure rotation"

### Phase 3: UI Integration & Color Implementation

1. **Update HTML UI** (`src/geometry/index.html`):
   - Add geodesic frequency controls for Dual Tetrahedron
   - Add geodesic frequency controls for Dual Icosahedron
   - Mirror base polyhedra UI pattern (frequency dropdowns)
   - Position controls near corresponding dual polyhedra toggles

2. **Implement Reciprocal Complementary Color Scheme**:
   - Identify where base polyhedra colors are defined (solid + geodesic)
   - Apply reciprocal complementary color relationship to dual polyhedra:
     - **Dual Solid:** Uses base's geodesic color (complementary)
     - **Dual Geodesic:** Uses base's solid color (primary)
   - Ensure color symmetry for all dual pairs:
     - Base Tetrahedron (solid): Color A, (geodesic): Color B
     - Dual Tetrahedron (solid): Color B, (geodesic): Color A
     - Base Icosahedron (solid): Color C, (geodesic): Color D
     - Dual Icosahedron (solid): Color D, (geodesic): Color C
   - Verify color application in rendering module

3. **Testing**:
   - Test geodesic subdivision UI for both duals
   - Verify complementary colors render correctly
   - Test stella octangula display (overlapping dual tetrahedra with colors)
   - Verify icosa/dodeca dual relationship preservation

### Phase 4: Documentation & Finalization

1. Update code comments to reference base polyhedra
2. Update README.md with architectural notes
3. Document UI changes for geodesic controls
4. Document color scheme implementation

## RT Mathematical Details

### Dual Tetrahedron Spread Analysis

- **Rotation Angle:** θ = 180°
- **Spread:** s = sin²(180°) = 0² = 0
- **Cross:** c = cos²(180°) = (-1)² = 1
- **Transform:** Equivalent to scalar multiplication by -1

### Dual Icosahedron Spread Analysis (Gold Standard!)

- **Rotation Angle:** θ = -90° (clockwise around Z)
- **Spread:** s = sin²(-π/2) = (-1)² = **1** (exact integer!)
- **Cross:** c = cos²(-π/2) = 0² = **0** (exact integer!)
- **Transform:** (x, y, z) → (y, -x, z) using only {-1, 0, 1}
- **RT Purity:** No transcendental functions - pure algebraic transformation

This represents the **optimal RT approach**: when angles are multiples of 90°, spread and cross collapse to exact integers, eliminating ALL irrational operations.

## Dependencies

### Required Modules

- `src/geometry/modules/rt-polyhedra.js`: Source file for refactoring (✅ Phase 1 & 2 complete)
- `src/geometry/modules/rt-math.js`: RT.Phi.value() for golden ratio calculation
- `src/geometry/index.html`: UI controls for geodesic frequency selection
- `src/geometry/modules/rt-rendering.js`: Color scheme implementation and rendering

### Files to Modify (Phase 3)

- `src/geometry/index.html`: Add geodesic frequency dropdowns for dual polyhedra
- `src/geometry/modules/rt-rendering.js` (or equivalent): Apply complementary colors to dual polyhedra

### Testing Requirements

- Edge quadrance validation must pass for all duals (✅ Validated in refactored code)
- Stella octangula visualization (dual tetrahedra) must render correctly
- Icosa/dodeca dual alignment must be preserved
- Geodesic subdivision must work on dual polyhedra
- UI controls for dual geodesics must function correctly
- Complementary colors must match base polyhedra geodesic colors

## Future Work

After completing dual refactoring, this DRY approach enables:

1. **Tetrahedral Arrowheads for WXYZ Basis Vectors** (TODO 8.4.2)
   - Use refactored `dualTetrahedron()` geometry for WXYZ arrowheads
   - Each dual tetrahedron vertex points along a WXYZ axis direction
   - Scale appropriately to function as basis vector arrowhead
   - Distinguish WXYZ (tetrahedral) from XYZ (pentagonal cones)

   **Implementation Note:** For basis vector arrowheads, we need **static geometry only** (no geodesic subdivision complexity). The refactored dual functions should:
   - Return base geometry by default (frequency = 0 or undefined)
   - Only apply geodesic subdivision when explicitly requested
   - This keeps arrowhead implementation simple while preserving geodesic capability for polyhedra display

   **Recommendation:** Maintain dual implementations without automatic geodesic inheritance for arrowhead use case. The DRY refactoring still provides benefits (single source geometry, consistent alignment) while avoiding unnecessary complexity for simple arrowhead rendering.

2. **Other Dual Polyhedra**
   - Dual octahedron (cube) - already implemented as separate primitives
   - Dual cuboctahedron → rhombic dodecahedron (future)
   - Dual icosidodecahedron → rhombic triacontahedron (future)

## Success Criteria

### Phase 1 & 2: Geometry Refactoring

- ✅ Dual tetrahedron derives from base with ~12 lines (66% reduction)
- ✅ Dual icosahedron derives from base with ~47 lines (70% reduction)
- ✅ RT edge quadrance validation passes for all duals
- ✅ Geodesic subdivision capability inherited from base polyhedra
- ✅ Code reduction: ~140 lines removed

### Phase 3: UI & Color Integration

- ✅ HTML UI includes geodesic frequency controls for Dual Tetrahedron
- ✅ HTML UI includes geodesic frequency controls for Dual Icosahedron
- ✅ Dual polyhedra render with complementary colors (matching base geodesics)
- ✅ Stella octangula displays with correct complementary color scheme
- ✅ Icosa/dodeca dual pair displays with correct colors
- ✅ Geodesic dual functions implemented (thin wrappers around base)
- ✅ Event listeners wired up for all controls

### Phase 4: Rendering & UI Consolidation (Planned)

**Current Issue:** Geodesic rendering code is duplicated 6+ times in `rt-rendering.js`. Each geodesic polyhedron repeats ~25 lines of identical logic:

- Get frequency from `getElementById`
- Get projection from `querySelector`
- Parse values with `isNaN` checks
- Call polyhedron function
- Call `renderPolyhedron`
- Set visibility

**Solution:** Create `renderGeodesicPolyhedron()` helper function:

```javascript
function renderGeodesicPolyhedron(config) {
  const {
    checkboxId,
    frequencyId,
    projectionName,
    polyhedronFn,
    group,
    color,
    scale,
    opacity,
  } = config;

  if (document.getElementById(checkboxId).checked) {
    const frequency = parseInt(document.getElementById(frequencyId).value);
    const projectionRadio = document.querySelector(
      `input[name="${projectionName}"]:checked`
    );
    const projection = projectionRadio ? projectionRadio.value : "out";

    const geometry = polyhedronFn(
      scale,
      isNaN(frequency) ? 1 : frequency,
      projection
    );
    renderPolyhedron(group, geometry, color, opacity);
    group.visible = true;
  } else {
    group.visible = false;
  }
}
```

**Usage Example:**

```javascript
renderGeodesicPolyhedron({
  checkboxId: "showGeodesicDualTetrahedron",
  frequencyId: "geodesicDualTetraFrequency",
  projectionName: "geodesicDualTetraProjection",
  polyhedronFn: Polyhedra.geodesicDualTetrahedron,
  group: geodesicDualTetrahedronGroup,
  color: 0xffff00, // Reciprocal complementary (matches base solid)
  scale,
  opacity,
});
```

**Benefits:**

- Reduces ~150 lines of duplicated code to ~6 function calls
- Single source of truth for geodesic rendering logic
- Color scheme becomes explicit and centralized
- Easier to maintain/update

**UI/CSS Consolidation (Secondary):**
After rendering consolidation, geodesic UI controls can be further consolidated:

- All geodesic control sections share identical HTML structure
- All geodesic controls share identical CSS classes
- Only differences: IDs and data binding
- Potential for template-based generation or shared components

### Phase 5: Documentation (Pending)

- ⚠️ README.md updated with DRY architecture notes
- ⚠️ Final UI/rendering consolidation documented

### Overall

- ✅ No visual or geometric regressions in refactored geometry
- ✅ Complete feature parity with UI controls and color scheme
- ⚠️ Rendering consolidation pending (DRY improvement)

---

**Status:** Phase 1-3 Complete | Phase 4-5 Pending (Rendering Consolidation & Docs)
**Priority:** High (architectural improvement, enables future features)
**Estimated Complexity:** Low (helper function pattern straightforward)
