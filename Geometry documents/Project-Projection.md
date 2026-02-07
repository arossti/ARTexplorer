# Project-Projection: Generalized Projection Feature

> **Agent Handoff Document** - Implementation guide for extracting and generalizing projection visualization from prime polygon search code.

---

## Objective

Create a reusable **Projections** feature that allows users to project ANY polyhedron's convex hull onto a 2D plane, with XYZ and WXYZ (Tetrahedral) axis selection.

### Background

The prime polygon search (Feb 2026) developed useful projection visualization infrastructure in `rt-prime-cuts.js`. While the search for regular prime n-gons was inconclusive (projections are irregular), the **projection visualization code is valuable** and should be generalized.

**Current state**: Projection code is hardcoded to specific primes (5, 7, 11, 13-gon) and compounds.

**Target state**: Generic projection for ANY polyhedron with user-selectable axis and distance.

---

## Architecture: Shadow & Swap Pattern

### Phase 1: Shadow
Create new `modules/rt-projections.js` with generalized API, keeping `rt-prime-cuts.js` intact.

### Phase 2: Swap
Update `rt-prime-cuts.js` to delegate generic functions to `rt-projections.js`.

### Phase 3: Cleanup
Remove duplicated code from `rt-prime-cuts.js`, reduce to thin wrapper for prime-specific presets.

---

## API Design

### RTProjections Module

```javascript
/**
 * rt-projections.js
 * Generalized projection visualization for any polyhedron
 *
 * @module rt-projections
 * @author Andy & Claude (2026)
 */

import * as THREE from "three";
import { Quadray } from "./rt-math.js";

export const RTProjections = {
  // ═══════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════

  state: {
    enabled: false,
    basis: 'cartesian',        // 'cartesian' | 'tetrahedral'
    axis: 'z',                 // 'x','y','z' | 'qw','qx','qy','qz'
    distance: 5,               // Plane distance from polyhedron center
    showRays: true,            // Show projection ray lines
    showInterior: false,       // Show interior projected vertices
    showIdealPolygon: false,   // Show ideal regular n-gon overlay
  },

  _projectionGroup: null,
  _renderer: null,
  _scene: null,
  _camera: null,

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Initialize with scene references
   */
  init(scene, camera, renderer) { ... },

  /**
   * Set projection axis (mirrors RTPapercut.setCutplaneAxis pattern)
   * @param {string} basis - 'cartesian' or 'tetrahedral'
   * @param {string} axis - 'x','y','z' or 'qw','qx','qy','qz'
   */
  setProjectionAxis(basis, axis) { ... },

  /**
   * Set projection plane distance from polyhedron center
   */
  setProjectionDistance(distance) { ... },

  /**
   * Main entry point - show projection for a polyhedron group
   * @param {THREE.Group} polyhedronGroup - The polyhedron to project
   * @param {Object} options - Visualization options
   */
  showProjection(polyhedronGroup, options = {}) { ... },

  /**
   * Hide and cleanup projection visualization
   */
  hideProjection() { ... },

  /**
   * Update projection (call on state change)
   */
  updateProjection() { ... },

  // ═══════════════════════════════════════════════════════════════════════
  // GENERIC UTILITIES (extracted from rt-prime-cuts.js)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Extract world-space vertices from a polyhedron group
   * Skips node spheres, uses coarse tolerance for deduplication
   * 100% generic - works for ANY polyhedron
   */
  _getWorldVerticesFromGroup(group) { ... },

  /**
   * Compute 2D convex hull using Graham scan
   * 100% generic - works for any 2D point set
   */
  _computeConvexHull2D(points) { ... },

  /**
   * Get projection plane basis vectors from viewing spreads
   * Generalized to accept spreads directly (not n-specific lookup)
   */
  _getProjectionPlaneBasis(spreads) { ... },

  /**
   * Convert axis state to spreads for projection plane
   */
  _axisToSpreads() { ... },

  /**
   * Create projection visualization (rays, hull, nodes)
   */
  _createProjectionVisualization(vertices, options) { ... },
};
```

---

## File Changes

### Create: `modules/rt-projections.js`

Extract these functions from `rt-prime-cuts.js`:

| Function | Source Lines | Notes |
|----------|--------------|-------|
| `_getWorldVerticesFromGroup` | 584-622 | 100% generic, copy directly |
| `_computeConvexHull2D` | 525-570 | 100% generic, copy directly |
| `_getProjectionPlaneBasis` | 467-518 | Generalize: accept spreads, not n |

Add new functions:
- `_axisToSpreads()` - Convert axis state to ZYX spreads
- `showProjection()` - Main entry point
- `init()`, `setProjectionAxis()`, `setProjectionDistance()`

### Modify: `index.html`

Add after Papercut section (~line 3457):

```html
<!-- Projections Section -->
<h3 class="collapsible-header">
  <span class="collapse-icon" data-target="projections-section"></span>
  Projections
</h3>
<div id="projections-section" class="section-content collapsed">
  <!-- Enable Projection -->
  <div class="control-item">
    <label class="checkbox-label">
      <input type="checkbox" id="enableProjection" />
      Enable Projection
    </label>
  </div>

  <div id="projection-options" style="display: none">
    <!-- Options: Show Rays, Interior, Ideal -->
    <div class="control-item">
      <label class="checkbox-label">
        <input type="checkbox" id="projectionShowRays" checked />
        Show Projection Rays
      </label>
    </div>
    <div class="control-item">
      <label class="checkbox-label">
        <input type="checkbox" id="projectionShowInterior" />
        Show Interior Vertices
      </label>
    </div>
    <div class="control-item">
      <label class="checkbox-label">
        <input type="checkbox" id="projectionShowIdeal" />
        Show Ideal n-gon
      </label>
    </div>

    <!-- Distance Slider -->
    <div class="control-item">
      <label class="label-subsection">Plane Distance</label>
      <div class="slider-container">
        <input type="range" id="projectionDistance" min="1" max="20" step="0.5" value="5" />
        <span class="slider-value" id="projectionDistanceValue">5</span>
      </div>
    </div>

    <!-- Axis Selection -->
    <div class="control-item spacing-top-large">
      <label class="label-section">Projection Axis</label>
      <label class="label-subsection">Cartesian (XYZ)</label>
      <div style="display: flex; gap: 4px; margin-bottom: 8px">
        <button class="toggle-btn variant-small" id="projectionAxisX">X</button>
        <button class="toggle-btn variant-small" id="projectionAxisY">Y</button>
        <button class="toggle-btn variant-small active" id="projectionAxisZ">Z</button>
      </div>
      <label class="label-subsection">Tetrahedral (WXYZ)</label>
      <div style="display: flex; gap: 4px">
        <button class="toggle-btn variant-small" id="projectionAxisQW">QW</button>
        <button class="toggle-btn variant-small" id="projectionAxisQX">QX</button>
        <button class="toggle-btn variant-small" id="projectionAxisQY">QY</button>
        <button class="toggle-btn variant-small" id="projectionAxisQZ">QZ</button>
      </div>
    </div>

    <!-- Info Display -->
    <div class="control-item">
      <p class="info-text" id="projectionInfo">
        Axis: Z | Hull: -- vertices
      </p>
    </div>
  </div>
</div>
```

### Modify: `rt-ui-binding-defs.js`

Add to appropriate arrays:

```javascript
// checkboxWithControlsBindings
{
  id: "enableProjection",
  type: "checkbox-controls",
  controlsId: "projection-options",
},

// simpleCheckboxBindings
{ id: "projectionShowRays", type: "checkbox" },
{ id: "projectionShowInterior", type: "checkbox" },
{ id: "projectionShowIdeal", type: "checkbox" },
```

### Modify: `rt-init.js`

Add import and initialization:

```javascript
import { RTProjections } from "./rt-projections.js";

// In startARTexplorer(), after RTPapercut.init():
RTProjections.init(scene, camera, renderer);
window.RTProjections = RTProjections;

// Wire axis buttons (mirror cutplaneAxisButtons pattern):
const projectionAxisButtons = [
  { id: "projectionAxisX", basis: "cartesian", axis: "x" },
  { id: "projectionAxisY", basis: "cartesian", axis: "y" },
  { id: "projectionAxisZ", basis: "cartesian", axis: "z" },
  { id: "projectionAxisQW", basis: "tetrahedral", axis: "qw" },
  { id: "projectionAxisQX", basis: "tetrahedral", axis: "qx" },
  { id: "projectionAxisQY", basis: "tetrahedral", axis: "qy" },
  { id: "projectionAxisQZ", basis: "tetrahedral", axis: "qz" },
];

let activeProjectionButton = document.getElementById("projectionAxisZ");

projectionAxisButtons.forEach(({ id, basis, axis }) => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener("click", () => {
      if (activeProjectionButton) {
        activeProjectionButton.classList.remove("active");
      }
      btn.classList.add("active");
      activeProjectionButton = btn;
      RTProjections.setProjectionAxis(basis, axis);
    });
  }
});
```

### Modify: `rt-prime-cuts.js` (Phase 2 - Swap)

After RTProjections is working, delegate generic functions:

```javascript
import { RTProjections } from "./rt-projections.js";

// Replace implementations with delegates:
_getWorldVerticesFromGroup: function(group) {
  return RTProjections._getWorldVerticesFromGroup(group);
},

_computeConvexHull2D: function(points) {
  return RTProjections._computeConvexHull2D(points);
},
```

Keep prime-specific code:
- `VERIFIED_PROJECTIONS` registry
- Compound selection logic
- Prime-specific UI text
- Verification system

---

## Visualization Behavior

### Projection Rays
- Color-matched to polyhedron (or configurable)
- Draw from each 3D vertex to its projected 2D position
- Optional: Hide rays, show only hull

### Convex Hull
- Yellow outline (actual projection boundary)
- Shows n-gon where n = number of hull vertices
- Updates on axis/distance change

### Ideal Polygon (optional)
- Cyan outline (regular n-gon for comparison)
- Same circumradius as hull
- Shows deviation from regularity

### Interior Vertices (optional)
- Small nodes at projected positions
- Interior to hull (not on boundary)
- Useful for understanding vertex distribution

---

## Axis Mapping

### Cartesian (XYZ)
| Axis | Projection Plane | Normal | Spreads |
|------|-----------------|--------|---------|
| X | YZ plane | (1,0,0) | [0.5, 0, 0] |
| Y | XZ plane | (0,1,0) | [0, 0.5, 0] |
| Z | XY plane | (0,0,1) | [0, 0, 0.5] |

### Tetrahedral (WXYZ)
| Axis | Normal | Spreads (approx) |
|------|--------|------------------|
| QW | (1,1,1)/√3 | Custom |
| QX | (1,-1,-1)/√3 | Custom |
| QY | (-1,1,-1)/√3 | Custom |
| QZ | (-1,-1,1)/√3 | Custom |

---

## Verification Checklist

- [ ] RTProjections module loads without errors
- [ ] Projections UI section renders correctly
- [ ] Enable Projection checkbox shows/hides options
- [ ] Axis buttons toggle correctly (exclusive selection)
- [ ] Distance slider updates projection
- [ ] Show Rays toggle works
- [ ] Show Interior toggle works
- [ ] Show Ideal toggle works
- [ ] Projection works with: Cube, Tetrahedron, Octahedron
- [ ] Projection works with: Truncated Tetrahedron
- [ ] Projection works with compound polyhedra
- [ ] Existing prime projections (5, 7, 11, 13-gon) still work
- [ ] Console logs show hull vertex count

---

## References

- **Source of generic code**: `modules/rt-prime-cuts.js`
- **UI pattern template**: `modules/rt-papercut.js` (axis selection)
- **Quadray coordinates**: `modules/rt-math.js` (Quadray.basisVectors)
- **Prime projection research**: `Geometry documents/Polygon-Rationalize.md`
