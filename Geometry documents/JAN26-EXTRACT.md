# JAN26-EXTRACT: Module Extraction Workplan

## Overview

Extract components from oversized modules to improve maintainability and code organization.

### Current State (Jan 25, 2026)

| File | Lines | Content |
|------|-------|---------|
| rt-init.js | 4,120 | Event handlers, UI wiring, initialization |
| rt-rendering.js | 3,866 | Scene setup, grids, nodes, rendering, camera |
| rt-polyhedra.js | 2,760 | 2D primitives + 3D polyhedra |

---

## Phase 1: rt-primitives.js (~700 lines)

**Extract from**: rt-polyhedra.js
**Priority**: High — cleanest extraction, clear conceptual boundary

### Functions to Extract

| Function | Lines | Description |
|----------|-------|-------------|
| `point()` | ~20 | 0D primitive |
| `line()` | ~60 | 1D primitive |
| `polygon()` | ~40 | Dispatcher with dual-engine logic |
| `_polygonClassical()` | ~50 | Classical trig fallback |
| `_polygonTriangle()` | ~50 | RT-pure using √3 |
| `_polygonSquare()` | ~50 | RT-pure using integers |
| `_polygonPentagon()` | ~60 | RT-pure using φ |
| `_polygonHexagon()` | ~55 | RT-pure using √3 |
| `_polygonOctagon()` | ~65 | RT-pure using √2 |
| `_polygonNonagon()` | ~105 | Triangle subdivision |
| `_polygonDecagon()` | ~65 | RT-pure using φ |
| `_polygonDodecagon()` | ~65 | RT-pure using √3 |
| Commented reference block | ~55 | Classical implementation for researchers |

### Dependencies

```javascript
// rt-primitives.js will need:
import { RT } from "./rt-math.js";
// Uses: RT.PureRadicals, RT.PurePhi, RT.StarSpreads

// THREE.js for Vector3
// (passed in or imported)
```

### Export Pattern

```javascript
// rt-primitives.js
export const Primitives = {
  point,
  line,
  polygon,
  // Private generators accessible for testing
  _polygonTriangle,
  _polygonSquare,
  // ... etc
};

// rt-polyhedra.js - re-export for backwards compatibility
export { Primitives } from "./rt-primitives.js";
// OR merge into Polyhedra object
```

### Validation

- [ ] All primitive tests pass
- [ ] Console logs show correct RT-pure/classical engine
- [ ] Polygon slider works for n=3..24
- [ ] No breaking changes to existing callers

---

## Phase 2: rt-grids.js (~400 lines)

**Extract from**: rt-rendering.js
**Priority**: Medium — self-contained, rarely changes

### Functions to Extract

| Function | Lines | Description |
|----------|-------|-------------|
| `createCartesianGrid()` | ~115 | XY/XZ/YZ plane grids |
| `createTetrahedralArrow()` | ~75 | WXYZ basis arrowheads |
| `createQuadrayBasis()` | ~75 | WXYZ tetrahedral basis |
| `createIVMGrid()` | ~90 | Triangular lattice generation |
| `createIVMPlanes()` | ~90 | 6 central angle planes |
| `rebuildQuadrayGrids()` | ~95 | Dynamic tessellation update |
| `rebuildCartesianGrids()` | ~95 | Dynamic divisions update |

### Dependencies

```javascript
// rt-grids.js will need:
import { RT } from "./rt-math.js";
import { Quadray } from "./rt-math.js";
import { Polyhedra } from "./rt-polyhedra.js"; // for dualTetrahedron arrowhead
// THREE.js for geometry/materials
```

---

## Phase 3: rt-nodes.js (~450 lines)

**Extract from**: rt-rendering.js
**Priority**: Medium — complex, could grow with new node types

### Functions to Extract

| Function | Lines | Description |
|----------|-------|-------------|
| `getPolyhedronEdgeQuadrance()` | ~130 | RT-pure edge Q for each type |
| `getClosePackedRadius()` | ~30 | Universal r = √(Q/4) |
| `getCachedNodeGeometry()` | ~80 | Geometry cache management |
| `addMatrixNodes()` | ~195 | Planar matrix node generation |
| `addRadialMatrixNodes()` | ~145 | Radial matrix node generation |

### Dependencies

```javascript
// rt-nodes.js will need:
import { RT } from "./rt-math.js";
import { Polyhedra } from "./rt-polyhedra.js";
import { PerformanceClock } from "./performance-clock.js";
// THREE.js, module-level state (nodeOpacity, useRTNodeGeometry, geodesicFrequency)
```

### Notes

- Module-level state (`nodeOpacity`, `useRTNodeGeometry`, `geodesicFrequency`) needs careful handling
- Could expose setters or accept config object

---

## Phase 4: rt-camera.js (~250 lines)

**Extract from**: rt-rendering.js
**Priority**: Low — independent but not urgent

### Functions to Extract

| Function | Lines | Description |
|----------|-------|-------------|
| `setCameraPreset()` | ~170 | Named view presets (iso, top, front, etc.) |
| `switchCameraType()` | ~60 | Perspective ↔ Orthographic |

---

## Execution Order

1. **rt-primitives.js** — Start here (cleanest, highest value)
2. **rt-grids.js** — If time permits
3. **rt-nodes.js** — Consider for future
4. **rt-camera.js** — Low priority

## Post-Extraction Target

| File | Target Lines | Reduction |
|------|--------------|-----------|
| rt-polyhedra.js | ~2,060 | -700 (-25%) |
| rt-rendering.js | ~2,800 | -1,100 (-28%) |

---

## Backwards Compatibility

Ensure existing imports continue to work:

```javascript
// Current usage (must still work):
import { Polyhedra } from "./rt-polyhedra.js";
Polyhedra.polygon(1, { sides: 5 });
Polyhedra.cube(1);

// Option A: Re-export primitives from polyhedra
// Option B: Merge Primitives into Polyhedra at export
```

---

*Created: 2026-01-25*
*Status: WORKPLAN - Ready for Jan 26 execution*
