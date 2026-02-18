# Close-Packed Vertex Spheres

**Feature Implementation Plan**

## Overview

Add "Packed" node size option that automatically calculates vertex sphere radii using the universal close-packing formula for kissing spheres at polyhedron vertices.

## Mathematical Foundation

### Classical Distance Formula

```
r = a/2
```

Where:

- `r` = vertex sphere radius
- `a` = edge length of polyhedron

### Rational Trigonometry (Quadrance) Formula

```
Q_vertex = Q_edge / 4
```

Where:

- `Q_vertex` = quadrance of vertex sphere radius (r²)
- `Q_edge` = quadrance of edge length (a²)

**Universal Law**: This formula applies to ALL regular polyhedra when spheres at adjacent vertices are mutually tangent.

## Implementation Plan

### Phase 1: Core Formula Implementation

**Location**: `src/geometry/rt-init.js`

1. **Add edge length calculator** (lines ~635-697, near `getCachedNodeGeometry`)

   ```javascript
   /**
    * Calculate edge length for each polyhedron type
    * @param {string} type - Polyhedron type (tetrahedron, cube, octahedron, etc.)
    * @param {number} scale - halfSize parameter
    * @returns {number} Edge length in world units
    */
   function getPolyhedronEdgeLength(type, scale) {
     switch (type) {
       case "tetrahedron":
       case "dualTetrahedron":
         return 2 * scale * Math.sqrt(2); // Tet edge = 2s√2

       case "cube":
         return 2 * scale; // Cube edge = 2s

       case "octahedron":
         return 2 * scale; // Octa edge = 2s (same as cube in RT system)

       case "icosahedron":
         return 2 * scale; // Icosa edge = 2s

       case "dodecahedron":
         return (2 * scale) / Math.sqrt(3); // Dodeca edge

       case "cuboctahedron":
         return 2 * scale; // Cubocta edge = 2s

       case "rhombicDodecahedron":
         return 2 * scale; // Rhombic dodeca edge

       case "geodesicTetrahedron":
       case "geodesicOctahedron":
       case "geodesicIcosahedron":
         // Geodesics subdivide base edges - use base polyhedron formula
         const baseType = type.replace("geodesic", "").toLowerCase();
         return getPolyhedronEdgeLength(baseType, scale);

       default:
         console.warn(`Unknown polyhedron type: ${type}`);
         return 2 * scale;
     }
   }
   ```

2. **Add close-pack radius calculator**

   ```javascript
   /**
    * Calculate close-packed vertex sphere radius using universal formula
    * Universal formula: r = a/2 (works for ALL regular polyhedra)
    * Rational Trigonometry: Q_vertex = Q_edge / 4
    *
    * @param {string} type - Polyhedron type
    * @param {number} scale - halfSize parameter
    * @returns {number} Vertex sphere radius for close-packing
    */
   function getClosePackedRadius(type, scale) {
     const edgeLength = getPolyhedronEdgeLength(type, scale);

     // Universal close-packing formula: r = a/2
     const radius = edgeLength / 2;

     // DIAGNOSTIC: Log quadrance calculation (RT verification)
     const edgeQuadrance = edgeLength * edgeLength;
     const vertexQuadrance = edgeQuadrance / 4;
     const vertexRadius = Math.sqrt(vertexQuadrance);

     console.log(`Close-pack for ${type}:`);
     console.log(`  Edge length (a): ${edgeLength.toFixed(4)}`);
     console.log(`  Edge quadrance (a²): ${edgeQuadrance.toFixed(4)}`);
     console.log(`  Vertex quadrance (a²/4): ${vertexQuadrance.toFixed(4)}`);
     console.log(`  Vertex radius (a/2): ${radius.toFixed(4)}`);
     console.log(`  RT verification (√Q_vertex): ${vertexRadius.toFixed(4)}`);

     return radius;
   }
   ```

3. **Modify `getCachedNodeGeometry` function** (lines ~637-696)
   - Add `packed` case to handle close-packed sizing
   - Pass `polyhedronType` parameter to determine correct edge length

   ```javascript
   function getCachedNodeGeometry(useRT, nodeSize, polyhedronType, scale) {
     const cacheKey = `${useRT ? "rt" : "classical"}-${nodeSize}-${polyhedronType}`;

     if (nodeGeometryCache.has(cacheKey)) {
       return nodeGeometryCache.get(cacheKey);
     }

     let nodeGeometry;
     let trianglesPerNode = 0;
     let radius;

     if (nodeSize === "packed") {
       // CLOSE-PACKED MODE: Calculate from edge length
       radius = getClosePackedRadius(polyhedronType, scale);
     } else {
       // FIXED SIZE MODE: Use predefined sizes
       const nodeSizes = {
         sm: 0.02,
         md: 0.04,
         lg: 0.08,
       };
       radius = nodeSizes[nodeSize];
     }

     if (useRT) {
       // RT Geodesic Icosahedron node
       const polyData = window.RTPolyhedra.geodesicIcosahedron(
         radius,
         0,
         "out"
       );
       // ... rest of RT geometry code
     } else {
       // Classical THREE.js Sphere
       nodeGeometry = new THREE.SphereGeometry(radius, 16, 16);
       trianglesPerNode = 16 * 16 * 2;
     }

     const result = { geometry: nodeGeometry, triangles: trianglesPerNode };
     nodeGeometryCache.set(cacheKey, result);
     return result;
   }
   ```

4. **Update `renderPolyhedron` function** (lines ~702-818)
   - Pass `group.userData.type` and `scale` to `getCachedNodeGeometry`
   - Clear cache when switching to/from packed mode

   ```javascript
   function renderPolyhedron(group, geometry, color, opacity) {
     // ... existing code ...

     if (showNodes) {
       // Start node generation timing
       PerformanceClock.startNodeGeneration();

       // Get polyhedron type and scale from group
       const polyType = group.userData.type;
       const scale =
         parseFloat(document.getElementById("tetScaleSlider").value) /
         (2 * Math.sqrt(2));

       // Get cached geometry with polyhedron-specific parameters
       const { geometry: nodeGeometry, triangles: trianglesPerNode } =
         getCachedNodeGeometry(useRTNodeGeometry, nodeSize, polyType, scale);

       // ... rest of node rendering code ...
     }
   }
   ```

### Phase 2: UI Implementation

**Location**: `src/geometry/index.html`

1. **Add "Packed" button to Node size selector** (around line ~240)

   ```html
   <!-- Node Size Selector -->
   <div class="control-group">
     <label>Nodes</label>
     <div class="button-group">
       <button class="node-size-btn" data-node-size="off">Off</button>
       <button class="node-size-btn" data-node-size="sm">Sm</button>
       <button class="node-size-btn active" data-node-size="md">Md</button>
       <button class="node-size-btn" data-node-size="lg">Lg</button>
       <button class="node-size-btn" data-node-size="packed">Packed</button>
     </div>
   </div>
   ```

2. **Add tooltip/help text**

   ```html
   <button
     class="node-size-btn"
     data-node-size="packed"
     title="Close-packed spheres: r = edge/2 (kissing number)"
   >
     Packed
   </button>
   ```

3. **Update CSS** (if needed for 5-button layout)
   ```css
   .button-group {
     display: grid;
     grid-template-columns: repeat(5, 1fr); /* Changed from 4 to 5 */
     gap: 5px;
   }
   ```

### Phase 3: Event Handler Updates

**Location**: `src/geometry/rt-init.js`

1. **Node size selector handler** (lines ~1804-1817)
   - Already handles dynamic button clicks
   - No changes needed - will automatically support 'packed' value

2. **Add cache clearing logic** when toggling between modes

   ```javascript
   document.querySelectorAll(".node-size-btn").forEach(btn => {
     btn.addEventListener("click", function () {
       const newSize = this.dataset.nodeSize;
       const oldActiveBtn = document.querySelector(".node-size-btn.active");
       const oldSize = oldActiveBtn ? oldActiveBtn.dataset.nodeSize : null;

       // Clear cache when switching to/from packed mode
       if (newSize === "packed" || oldSize === "packed") {
         nodeGeometryCache.clear();
         console.log("🔄 Cache cleared: switching packed mode");
       }

       // ... existing button toggle code ...
     });
   });
   ```

### Phase 4: Testing & Validation

1. **Visual Tests**
   - [ ] Verify spheres at adjacent vertices are tangent (kissing)
   - [ ] Test on all polyhedron types (tet, cube, octa, icosa, dodeca)
   - [ ] Test on geodesic subdivisions (freq 1-5)
   - [ ] Verify Classical Spheres mode
   - [ ] Verify RT Geodesics mode

2. **Mathematical Verification**
   - [ ] Console log edge lengths for each polyhedron type
   - [ ] Verify quadrance calculations (Q_vertex = Q_edge / 4)
   - [ ] Compare Classical (distance) vs RT (quadrance) approaches
   - [ ] Measure actual sphere spacing in scene

3. **Performance Tests**
   - [ ] Check geometry caching working correctly
   - [ ] Verify no geometry regeneration on camera movement
   - [ ] Test cache clearing on mode switches
   - [ ] Monitor triangle count for different node sizes

### Phase 5: Documentation

1. **Code Comments**
   - Add JSDoc comments to new functions
   - Explain universal formula derivation
   - Reference Synergetics and Rational Trigonometry

2. **User Documentation**
   - Add tooltip explaining "Packed" mode
   - Update help text with formula explanation
   - Add visual diagram showing kissing spheres

3. **Developer Notes**
   - Document edge length formulas for each polyhedron
   - Explain relationship to Synergetics unit-radius spheres
   - Note connection to kissing number problem

## Mathematical References

### Synergetics (Buckminster Fuller)

- Unit-radius sphere packing as foundation
- Tetrahedron as unit of volume from 4 closest-packed spheres
- IVM (Isotropic Vector Matrix) from CCP lattice
- Prime vector = 2 (distance between unit-radius sphere centers)

### Rational Trigonometry (Norman Wildberger)

- Quadrance Q = d² (square of distance)
- No transcendental functions (sin, cos, tan)
- Pure algebraic relationships
- Q_vertex = Q_edge / 4 (rational, exact)

### Universal Formula Proof

```
For two spheres of radius r centered at adjacent vertices:
- Centers are separated by edge length a
- Spheres are tangent when 2r = a
- Therefore: r = a/2

In quadrance terms:
- Q(2r) = (2r)² = 4r² = Q_edge
- Q(r) = r² = Q_edge / 4
```

## Future Enhancements

1. **Dynamic Sizing**
   - Update packed radius when sliders change
   - Live edge length display
   - Show quadrance values in UI

2. **Multi-Polyhedra**
   - Different radii for each polyhedron type when multiple active
   - Color-code spheres by polyhedron type
   - Highlight tangent pairs

3. **Educational Mode**
   - Show edge length measurements
   - Display quadrance calculations
   - Animate sphere packing demonstration

4. **Export**
   - Include sphere data in glTF export
   - Preserve close-pack relationships
   - Metadata with mathematical properties

## Implementation Priority

1. ✅ Phase 1: Core formula (CRITICAL - foundation)
2. ✅ Phase 2: UI button (HIGH - user access)
3. ✅ Phase 3: Event handlers (HIGH - functionality)
4. ⬜ Phase 4: Testing (MEDIUM - validation)
5. ⬜ Phase 5: Documentation (LOW - polish)

## Estimated Effort

- **Phase 1-3**: 2-3 hours (core implementation)
- **Phase 4**: 1-2 hours (testing)
- **Phase 5**: 1 hour (documentation)
- **Total**: 4-6 hours

---

## Implementation Status (2026-01-04)

**Status**: ✅ **IMPLEMENTED** (Phases 1-3 Complete)
**Commit**: `964f057` - "Feat: Add close-packed vertex spheres (Packed button)"
**Net Code Added**: ~110 lines (127 insertions, 17 deletions in rt-init.js + 3 in HTML)

### What Was Implemented

#### Phase 1: Core Functions (rt-init.js)

- ✅ `getPolyhedronEdgeLength(type, scale)` - lines 645-694
- ✅ `getClosePackedRadius(type, scale)` - lines 696-716
- ✅ Modified `getCachedNodeGeometry()` to support 'packed' mode - lines 718-782
- ✅ Updated `renderPolyhedron()` to pass polyType and scale - lines 869-910

#### Phase 2: UI (index.html)

- ✅ Added "Packed" button (5th button: Off/Sm/Md/Lg/Packed) - line 1029-1031
- ✅ Tooltip: "Close-packed spheres: r = a/2 (kissing number)"
- ✅ Flexbox auto-distributes 5 buttons evenly (no CSS changes needed)

#### Phase 3: Integration

- ✅ Works with **both** Classical Spheres and RT Geodesics
- ✅ Dynamic cache key includes polyhedronType and scale
- ✅ Console logging shows classical vs RT verification
- ✅ Supports all polyhedra including geodesic subdivisions

### Actual Edge Length Formulas (from rt-polyhedra.js logs)

All formulas at **halfSize = 1**:

| Polyhedron               | Edge Quadrance Q | Edge Length Formula | Status            |
| ------------------------ | ---------------- | ------------------- | ----------------- |
| **Cube**                 | 4.0              | `2s`                | ✅ Working        |
| **Tetrahedron**          | 8.0              | `2s√2`              | ✅ Working        |
| **Dual Tetrahedron**     | 4.0              | `2s`                | ✅ Working        |
| **Octahedron**           | 2.0              | `s√2`               | ✅ Fixed (was 2s) |
| **Icosahedron**          | 1.105573         | `s√1.105573`        | ✅ Working        |
| **Dodecahedron**         | 1.527864         | `s√1.527864`        | ✅ Working        |
| **Dual Icosahedron**     | 1.447214         | `s√1.447214`        | ⚠️ Needs tuning   |
| **Cuboctahedron**        | 0.5              | `s/√2`              | ✅ Working        |
| **Rhombic Dodecahedron** | 0.5              | `s/√2`              | ✅ Working        |

### Testing Results

**Working Correctly:**

- ✅ Cube - Spheres kiss perfectly
- ✅ Tetrahedron - Perfect close-packing
- ✅ Dual Tetrahedron - Correct
- ✅ Octahedron - Fixed edge length formula
- ✅ Icosahedron - Correct
- ✅ Dodecahedron - Correct
- ✅ Cuboctahedron - Correct
- ✅ Rhombic Dodecahedron - Correct

**Needs Investigation:**

- ⚠️ **Dual Icosahedron** - Spheres too small (not kissing)
  - Issue: Dual icosa scaled to dodec inradius φ·s, not dodec halfSize
  - Logged Q=1.447214 at icosa radius 1.144123 (≠ dodec halfSize 0.707)
  - Need to account for scaling relationship between dual and parent

---

## CRITICAL ISSUE: Not Staying in Rational Trigonometry Space! ⚠️

### Current Implementation Problem

The current implementation **breaks Rational Trigonometry principles** by:

1. **Using hardcoded decimal approximations**:

   ```javascript
   case 'icosahedron':
     return scale * Math.sqrt(1.105573);  // ❌ BAD: Static decimal terminated number
   ```

2. **Taking sqrt() too early**:
   - We compute `Math.sqrt(Q)` immediately in `getPolyhedronEdgeLength()`
   - We should stay in **quadrance space** and defer sqrt until render

3. **Losing algebraic precision**:
   - 1.105573 is a decimal approximation
   - Should use symbolic expressions involving φ (golden ratio)

### What We SHOULD Be Doing (Wildberger Principles)

**Stay in quadrance space as long as possible:**

```javascript
// CURRENT (BAD):
function getPolyhedronEdgeLength(type, scale) {
  case 'icosahedron':
    return scale * Math.sqrt(1.105573);  // ❌ sqrt too early!
}

function getClosePackedRadius(type, scale) {
  const edgeLength = getPolyhedronEdgeLength(type, scale);
  return edgeLength / 2;  // Distance-based
}

// BETTER (Rational Trigonometry):
function getPolyhedronEdgeQuadrance(type, scale) {
  case 'icosahedron':
    // Return QUADRANCE, not distance!
    const Q_base = 1.105573;  // Or better: symbolic form with φ
    return Q_base * scale * scale;  // Q scales as s²
}

function getClosePackedRadiusQuadrance(type, scale) {
  const Q_edge = getPolyhedronEdgeQuadrance(type, scale);

  // Work in QUADRANCE space - pure algebra!
  const Q_vertex = Q_edge / 4;  // ✅ Rational: Q_vertex = Q_edge / 4

  // Only sqrt at the VERY END for rendering
  return Math.sqrt(Q_vertex);
}
```

### Even Better: Use Symbolic Ratios

**Leverage RT.Phi library for golden ratio:**

```javascript
case 'icosahedron':
  // Q involves φ (golden ratio) - use symbolic form!
  const phi = RT.Phi.value();  // φ = (1 + √5)/2
  const Q_edge = /* symbolic expression with φ */;
  return Q_edge * scale * scale;
```

### Why This Matters

1. **Precision**: Algebraic ratios are exact, decimals are approximations
2. **Philosophy**: Wildberger's Rational Trig avoids transcendental functions
3. **Correctness**: Q_vertex = Q_edge / 4 is pure algebra (no sqrt needed!)
4. **Performance**: Fewer sqrt() calls = faster computation

### Recommended Refactor

**Priority**: HIGH (aligns with RT philosophy)
**Effort**: 2-3 hours
**Benefit**: True Rational Trigonometry implementation

**Steps**:

1. Rename `getPolyhedronEdgeLength()` → `getPolyhedronEdgeQuadrance()`
2. Return quadrance values (Q = a²), not distances
3. Update `getClosePackedRadius()` to work in quadrance space
4. Only call `Math.sqrt()` at final render step
5. Use `RT.Phi` library for symbolic golden ratio expressions

---

## Known Issues & TODO

### Immediate Issues

1. ⚠️ **Dual Icosahedron**: Edge length formula needs correction for scaling relationship
2. ⚠️ **Not using Rational Trigonometry properly**: Taking sqrt() too early, using decimal approximations

### Future Work

1. **Refactor to stay in quadrance space** (HIGH priority)
2. **Use symbolic ratios** instead of decimal approximations
3. **Leverage RT.Phi library** for golden ratio calculations
4. Add UI display showing quadrance values
5. Visual diagram of kissing spheres
6. Export sphere data in glTF format

---

## 🚨 CRITICAL ISSUE: Fundamental Unit Inconsistency Discovered (2026-01-04)

### Problem Statement

During testing of the RT-pure refactor, we discovered that **Tetrahedron and Dual Tetrahedron report different edge quadrances** despite being created with identical `halfSize` parameters:

```
rt-polyhedra.js:120 Tetrahedron: Expected Q=4.000000, Max error=0.00e+0
rt-polyhedra.js:160 Dual Tetrahedron: Expected Q=4.000000, Max error=0.00e+0
```

BUT the **rt-polyhedra.js code** explicitly states:

- **Tetrahedron**: `expectedQ = 8 * halfSize * halfSize` (line 117)
- **Dual Tetrahedron**: `expectedQ = 8 * halfSize * halfSize` (line 157)

**If both use `halfSize = 0.707`, then Q should = 8 × 0.5 = 4.0** ✓

This means they're both reporting Q=4.0, which is correct! But wait...

### The Real Issue: Scale Parameter Confusion

Looking at the vertex definitions:

**Tetrahedron** (lines 88-93):

```javascript
const s = halfSize;
new THREE.Vector3(s, s, s); // (+, +, +)
new THREE.Vector3(s, -s, -s); // (+, -, -)
new THREE.Vector3(-s, s, -s); // (-, +, -)
new THREE.Vector3(-s, -s, s); // (-, -, +)
```

**Dual Tetrahedron** (lines 134-137):

```javascript
const s = halfSize;
new THREE.Vector3(s, -s, -s); // 1: (+, -, -)
new THREE.Vector3(-s, s, -s); // 3: (-, +, -)
new THREE.Vector3(-s, -s, s); // 4: (-, -, +)
new THREE.Vector3(s, s, s); // 6: (+, +, +)
```

**THESE ARE IDENTICAL VERTICES!** Same coordinates, just different ordering!

Edge [0,1] in both:

- Tetrahedron: (s,s,s) to (s,-s,-s) → Q = 0² + (2s)² + (2s)² = 8s²
- Dual Tetrahedron: (s,-s,-s) to (-s,s,-s) → Q = (2s)² + (-2s)² + 0² = 8s²

**Both should have Q = 8s²!** ✓

### So Why Are Close-Packed Spheres Different Sizes?

The issue is NOT in rt-polyhedra.js geometry generation. The issue is in **how we're calculating the close-packed radius**:

**Current code** (rt-init.js:645-655):

```javascript
case "tetrahedron":
  return 8 * s2;  // Q = 8s²

case "dualTetrahedron":
  return 4 * s2;  // Q = 4s² ❌ WRONG!
```

**WE HARDCODED THE WRONG QUADRANCE VALUE FOR DUAL TETRAHEDRON!**

The close-pack.md doc stated `Q = 4` based on **misreading the logs** - we saw `Q=4.000000` and thought that was the edge quadrance, but it was actually the result of `8 × (0.707/√2)²`.

### Root Cause Analysis

1. **Assumption Error**: We assumed the logged `Q=4.000000` was the edge quadrance formula
2. **Missing Verification**: We didn't cross-check against the actual vertex coordinates
3. **Decimal Confusion**: Working with `s=0.707` obscured the fact that `s²=0.5`, so `8s²=4.0`

### Systematic Investigation Required

**HYPOTHESIS**: If we got dual tetrahedron wrong, **other polyhedra may also have incorrect hardcoded quadrance values**.

We need to:

1. **Verify EVERY polyhedron's edge quadrance** by:
   - Reading actual vertex coordinates from rt-polyhedra.js
   - Manually calculating Q for sample edge
   - Comparing to our hardcoded values in getPolyhedronEdgeQuadrance()

2. **Check for scaling inconsistencies**:
   - Cuboctahedron: Is it using same halfSize as cube/octahedron?
   - Rhombic Dodecahedron: Is it using same halfSize as cube?
   - Dual Icosahedron: Is it using dodecahedron's halfSize or icosahedron's?

3. **Establish ground truth**:
   - What is the canonical halfSize for each polyhedron?
   - Are all polyhedra scaled consistently relative to tet edge = 2?
   - Does the slider value represent tet edge, or something else?

### Test Results Indicating Problems

From visual testing:

- ✅ **Tetrahedron**: Spheres kiss (correct)
- ❌ **Dual Tetrahedron**: Spheres too small (Q value wrong in code)
- ✅ **Cube**: Spheres kiss (correct)
- ✅ **Octahedron**: Spheres kiss (correct)
- ✅ **Icosahedron**: Spheres kiss (correct)
- ✅ **Dodecahedron**: Spheres kiss (correct)
- ❌ **Dual Icosahedron**: Spheres too small (Q value likely wrong)
- ❌ **Cuboctahedron**: Spheres too small (Q value likely wrong)
- ❌ **Rhombic Dodecahedron**: Spheres too large (Q value likely wrong)

### Action Plan

**IMMEDIATE** (before proceeding with anything else):

1. ✅ **Document this critical finding** (this section)
2. ⬜ **Audit rt-polyhedra.js** - Extract actual edge quadrance for each polyhedron
3. ⬜ **Create verification table** - Compare rt-polyhedra.js Q vs our hardcoded Q
4. ⬜ **Fix all incorrect quadrance values** in getPolyhedronEdgeQuadrance()
5. ⬜ **Add RT.validateEdges() call** in getClosePackedRadius() to verify our Q matches
6. ⬜ **Test all polyhedra** with corrected values
7. ⬜ **Document canonical scaling relationships** between all polyhedra

**PRINCIPLE**: In a rational trigonometry system, **exactitude is non-negotiable**. Every polyhedron must have algebraically correct edge quadrance derived from actual vertex coordinates, not empirical observation or decimal approximation.

---

## ✅ RESOLUTION: RT-Pure Implementation Complete (2026-01-04)

### Fixes Applied

All edge quadrance errors have been corrected and refactored to use **RT-pure algebraic expressions**:

#### 1. Dual Tetrahedron ✅

- **Was**: `Q = 4s²` (hardcoded wrong value)
- **Now**: `Q = 8s²` (same as regular tetrahedron)
- **Result**: Spheres now kiss correctly

#### 2. Cuboctahedron ✅

- **Was**: `Q = 0.5s²` (factor of 2 error)
- **Now**: `Q = s²` (algebraic, exact)
- **Result**: Spheres now kiss correctly

#### 3. Dual Icosahedron ✅

- **Was**: `Q = 1.447214·s²` (hardcoded decimal at specific scale)
- **Now**: `Q = [8/(5+√5)] × φ² × s²` (RT-pure, algebraic!)
- **Uses**: `RT.Phi.squared()` and `RT.Phi.sqrt5()`
- **Result**: Spheres now kiss correctly

#### 4. Icosahedron ✅

- **Was**: `Q = 1.105573·s²` (hardcoded decimal approximation)
- **Now**: `Q = 8/(5+√5) × s²` (RT-pure, algebraic!)
- **Uses**: `RT.Phi.sqrt5()` to defer √5 expansion
- **Result**: Still correct, now algebraically pure

#### 5. Dodecahedron ✅

- **Was**: `Q = 1.527864·s²` (hardcoded decimal approximation)
- **Now**: `Q = 2(3-√5) × s²` (RT-pure, algebraic!)
- **Derivation**: From vertex coordinates using φ identities
- **Uses**: `RT.Phi.sqrt5()` to defer √5 expansion
- **Result**: Still correct, now algebraically pure

### RT-Pure Principles Achieved

**All golden-ratio polyhedra now use symbolic algebraic expressions:**

1. **No hardcoded decimals** - All use `RT.Phi` methods
2. **Deferred sqrt operations** - `√5` only computed when `RT.Phi.sqrt5()` called
3. **Algebraic identities used** - `φ² = φ + 1`, `1/φ = φ - 1`
4. **Traceable to foundations** - Every value derives from vertex coordinates
5. **Wildberger-compliant** - Stays algebraic until rendering requires numeric value

### Verification Table

| Polyhedron           | Edge Quadrance Formula   | RT-Pure?       | Status       |
| -------------------- | ------------------------ | -------------- | ------------ |
| Tetrahedron          | `Q = 8s²`                | ✅ Algebraic   | Correct      |
| Dual Tetrahedron     | `Q = 8s²`                | ✅ Algebraic   | **FIXED**    |
| Cube                 | `Q = 4s²`                | ✅ Algebraic   | Correct      |
| Octahedron           | `Q = 2s²`                | ✅ Algebraic   | Correct      |
| Icosahedron          | `Q = 8/(5+√5) × s²`      | ✅ **RT-PURE** | **UPGRADED** |
| Dodecahedron         | `Q = 2(3-√5) × s²`       | ✅ **RT-PURE** | **UPGRADED** |
| Dual Icosahedron     | `Q = [8/(5+√5)]×φ² × s²` | ✅ **RT-PURE** | **FIXED**    |
| Cuboctahedron        | `Q = s²`                 | ✅ Algebraic   | **FIXED**    |
| Rhombic Dodecahedron | `Q = 3s²/8 = 0.375s²`    | ✅ Algebraic   | **FIXED**    |

#### 6. Rhombic Dodecahedron ✅

- **Issue**: Validation comment in rt-polyhedra.js was WRONG
- **Discovery**: Code correctly uses `u = t/2` for planar rhombic faces (not `u = 2t/3`!)
- **Actual edge Q**: With u=t/2, edge (t,0,0)→(t/2,t/2,t/2) gives Q = 3t²/4 = 3s²/8
- **Fix**:
  - rt-init.js: Changed from Q=0.5s² to Q=0.375s² (= 3s²/8)
  - rt-polyhedra.js: Fixed validation comment and expectedQ to match actual geometry
- **Result**: Spheres should now kiss correctly, geometry remains planar

**Key insight**: The CODE was correct all along! The `u = t/2` produces proper planar rhombic faces. The validation comment claiming `u = 2t/3` was erroneous and would have broken the geometry (as user confirmed - saddle-shaped faces instead of flat rhombi).

---

**Last Updated**: 2026-01-04
**Status**: ✅ **RT-PURE IMPLEMENTED** - All golden-ratio polyhedra now algebraic
**Rhombic Dodec**: 🚨 **BUG IDENTIFIED** - Code uses u=t/2 but validation expects u=2t/3
**Next Session**: Fix rhombic dodecahedron u parameter or adjust close-pack Q value
