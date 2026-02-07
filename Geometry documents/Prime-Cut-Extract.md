# Prime Projection Module Extraction Workplan

## Objective

Extract prime polygon projection visualization code from `rt-papercut.js` into a dedicated `rt-prime-cuts.js` module using the **Shadow & Swap** pattern.

---

## Rationale

`rt-papercut.js` has grown to ~2000 lines with two distinct responsibilities:

| Lines | Responsibility | Keep In |
|-------|----------------|---------|
| 1-1097 | **Papercut Core**: Cutplane, print mode, section edges, line weights | `rt-papercut.js` |
| 1098-2065 | **Prime Projection**: Visualization, hull computation, spread matrices | `rt-prime-cuts.js` (NEW) |

**Benefits of extraction:**
- Separation of concerns (document/view vs. research visualization)
- Independent evolution of prime projection research code
- Cleaner testing (projection math without UI dependencies)
- Maintainability for new contributors

---

## Shadow & Swap Pattern

### Phase 1: Shadow (Create New Module)

1. Create `modules/rt-prime-cuts.js` with extracted code
2. Export all prime projection functions from new module
3. Have `rt-papercut.js` import and re-export from new module
4. **Zero breaking changes** - all existing callers continue to work

### Phase 2: Swap (Migrate Callers)

1. Update callers to import from `rt-prime-cuts.js` directly
2. Remove re-exports from `rt-papercut.js`
3. Delete shadowed code from `rt-papercut.js`

---

## Code to Extract

### State Properties
```javascript
_primePolygonGroup: null,
_primePolygonVisible: false,
```

### Public API (used by rt-init.js camera presets)
```javascript
showPrimePolygon(n, scene, camera, planeDistance)
updatePrimePolygonOrientation(scene, camera)
```

### Private Helpers
```javascript
_createProjectionHullVertices(n, radius, camera)
_computeConvexHull2D(points)
_createRegularPolygonVerticesFallback(n, radius, camera)
_getWorldVerticesFromGroup(group)
_generateCompoundVertices()
_activatePrimeProjectionCutplane(n, scene, planeNormal)
_deactivatePrimeProjectionCutplane(scene)
_getProjectionPlaneBasis(n)
_createProjectionHullVerticesFixed(n, radius, planeRight, planeUp)
_createRegularPolygonVerticesFixed(n, radius, planeRight, planeUp)
_updateProjectionInfo(n)
_hideProjectionInfo()
```

### Dependencies (import into new module)
- `THREE` from "three"
- `QuadrayPolyhedra` from "./rt-quadray-polyhedra.js"

### Dependencies (passed as parameters)
- `scene` - THREE.Scene
- `camera` - THREE.Camera
- `RTPapercut._renderer` - needs accessor or passed in

---

## Implementation Checklist

### Phase 1: Shadow

- [ ] **1.1** Create `modules/rt-prime-cuts.js` with module header
- [ ] **1.2** Copy state properties (`_primePolygonGroup`, `_primePolygonVisible`)
- [ ] **1.3** Copy all `_create*`, `_compute*`, `_get*`, `_update*`, `_hide*` methods
- [ ] **1.4** Copy `showPrimePolygon()` and `updatePrimePolygonOrientation()`
- [ ] **1.5** Add imports: `THREE`, `QuadrayPolyhedra`
- [ ] **1.6** Export as `RTPrimeCuts` object
- [ ] **1.7** Add `init(renderer)` method to receive renderer reference
- [ ] **1.8** Update `rt-papercut.js` to import and re-export:
    ```javascript
    import { RTPrimeCuts } from "./rt-prime-cuts.js";

    export const RTPapercut = {
      // ... existing papercut code ...

      // Shadow exports (Phase 1 - backwards compatibility)
      showPrimePolygon: RTPrimeCuts.showPrimePolygon,
      updatePrimePolygonOrientation: RTPrimeCuts.updatePrimePolygonOrientation,
      _primePolygonGroup: null, // Delegate to RTPrimeCuts
      _primePolygonVisible: false,
    };
    ```
- [ ] **1.9** Test: Verify all prime projection presets still work
- [ ] **1.10** Test: Verify 5-gon, 7-gon, 11-gon, 13-gon visualizations

### Phase 2: Swap

- [ ] **2.1** Find all callers of `RTPapercut.showPrimePolygon`
- [ ] **2.2** Update callers to import `RTPrimeCuts` directly
- [ ] **2.3** Update `rt-init.js` camera preset handlers
- [ ] **2.4** Remove shadow exports from `rt-papercut.js`
- [ ] **2.5** Delete extracted code from `rt-papercut.js` (lines 1098-2065)
- [ ] **2.6** Test: Full regression test of papercut features
- [ ] **2.7** Test: Full regression test of prime projection features

---

## New Module Structure

```javascript
/**
 * RT-PrimeCuts Module
 * Prime polygon projection visualization for Gauss-Wantzel bypass research
 *
 * Demonstrates that prime n-gons (7, 11, 13...) emerge as projections
 * of 3D polyhedra/compounds at rational-spread viewing angles.
 *
 * @module rt-prime-cuts
 * @author Andy & Claude (2026)
 */

import * as THREE from "three";
import { QuadrayPolyhedra } from "./rt-quadray-polyhedra.js";

export const RTPrimeCuts = {
  // State
  _primePolygonGroup: null,
  _primePolygonVisible: false,
  _renderer: null,

  /**
   * Initialize with renderer reference
   * Called from rt-init.js after scene setup
   */
  init: function(renderer) {
    RTPrimeCuts._renderer = renderer;
  },

  // === PUBLIC API ===
  showPrimePolygon: async function(n, scene, camera, planeDistance = 5) { ... },
  updatePrimePolygonOrientation: function(scene, camera) { ... },

  // === PROJECTION MATH ===
  _getProjectionPlaneBasis: function(n) { ... },
  _computeConvexHull2D: function(points) { ... },

  // === VERTEX EXTRACTION ===
  _getWorldVerticesFromGroup: function(group) { ... },
  _generateCompoundVertices: async function() { ... },

  // === VISUALIZATION ===
  _createProjectionHullVertices: function(n, radius, camera) { ... },
  _createProjectionHullVerticesFixed: function(n, radius, planeRight, planeUp) { ... },
  _createRegularPolygonVerticesFallback: function(n, radius, camera) { ... },
  _createRegularPolygonVerticesFixed: function(n, radius, planeRight, planeUp) { ... },

  // === CUTPLANE INTEGRATION ===
  _activatePrimeProjectionCutplane: function(n, scene, planeNormal) { ... },
  _deactivatePrimeProjectionCutplane: function(scene) { ... },

  // === UI ===
  _updateProjectionInfo: function(n) { ... },
  _hideProjectionInfo: function() { ... },
};
```

---

## Callers to Update (Phase 2)

| File | Function | Current Import | New Import |
|------|----------|----------------|------------|
| `rt-init.js` | Camera preset handlers | `RTPapercut` | `RTPrimeCuts` |
| `rt-init.js` | Prime projection checkboxes | `RTPapercut` | `RTPrimeCuts` |

---

## Testing Protocol

### After Phase 1 (Shadow)
1. Load ARTexplorer
2. Enable "Quadray Truncated Tetrahedron"
3. Select "5-gon Projection" preset - verify yellow/cyan overlay
4. Select "7-gon Projection" preset - verify 9-hull (known issue)
5. Enable "Quadray Compound (TruncTet + Icosa)"
6. Select "11-gon Projection" preset - verify 11-hull
7. Select "13-gon Projection" preset - verify 13-hull
8. Test cutplane features (unrelated to extraction)

### After Phase 2 (Swap)
1. Repeat all Phase 1 tests
2. Verify `rt-papercut.js` reduced to ~1100 lines
3. Verify no console errors about missing functions

---

## Notes

- The cutplane activation methods (`_activatePrimeProjectionCutplane`, etc.) call back into `RTPapercut` for clipping plane setup. These may need to accept the papercut module as a parameter or use a callback pattern.
- Consider whether `_hideProjectionInfo()` and `_updateProjectionInfo()` should remain in papercut (UI concern) or move to prime-cuts (projection concern). Currently moving to prime-cuts for cohesion.

---

## References

- `Geometry documents/Polygon-Rationalize.md` - Prime projection research context
- `Geometry documents/Add-Polyhedra-Guide.md` - Pattern for new modules
- `modules/rt-papercut.js` - Current implementation (lines 1098-2065)
