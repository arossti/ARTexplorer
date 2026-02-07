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

### Phase 4: Presets System
Convert hardcoded prime polygon buttons to use RTProjections presets, enabling any Quadray Form to be projected with saved configurations.

---

## Phase 4: Presets System

### Overview

The prime polygon buttons (5-gon, 7-gon, 11-gon, 13-gon) currently duplicate projection logic. Phase 4 converts these to **presets** that:

1. Auto-enable the required polyhedron
2. Set projection spreads via `RTProjections.applyPreset()`
3. Reuse the generalized visualization from RTProjections

### Preset Registry Schema

The existing `VERIFIED_PROJECTIONS` in `rt-prime-cuts.js` becomes the preset source:

```javascript
// rt-prime-cuts.js - PROJECTION_PRESETS (rename from VERIFIED_PROJECTIONS)
const PROJECTION_PRESETS = {
  "pentagon": {
    name: "Pentagon (5-gon)",
    polyhedronType: "quadrayTruncatedTet",  // userData.type to find/enable
    polyhedronCheckbox: "showQuadrayTruncatedTet",
    spreads: [0, 0, 0.5],
    expectedHull: 5,
    description: "Truncated Tetrahedron → 5-vertex hull",
  },
  "heptagon": {
    name: "Heptagon (7-gon)",
    polyhedronType: "quadrayCompoundTet",
    polyhedronCheckbox: "showQuadrayCompoundTet",
    spreads: [0, 0, 0.5],
    expectedHull: 7,
    description: "TruncTet + Tet compound → 7-vertex hull",
  },
  "hendecagon": {
    name: "Hendecagon (11-gon)",
    polyhedronType: "quadrayCompoundTet",
    polyhedronCheckbox: "showQuadrayCompoundTet",
    spreads: [0, 0.2, 0.5],
    expectedHull: 11,
    description: "TruncTet + Tet compound → 11-vertex hull",
  },
  "tridecagon": {
    name: "Tridecagon (13-gon)",
    polyhedronType: "quadrayCompound",
    polyhedronCheckbox: "showQuadrayCompound",
    spreads: [0, 0.6, 0.8],
    expectedHull: 13,
    description: "TruncTet + Icosa compound → 13-vertex hull",
  },
};
```

### RTProjections Preset API

Add to `rt-projections.js`:

```javascript
/**
 * Apply a named preset configuration
 * @param {Object} preset - Preset object with spreads, polyhedronType, etc.
 * @param {THREE.Scene} scene - Scene to find/enable polyhedron
 */
applyPreset: function(preset, scene) {
  // 1. Auto-enable the required polyhedron checkbox
  const checkbox = document.getElementById(preset.polyhedronCheckbox);
  if (checkbox && !checkbox.checked) {
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // 2. Find the polyhedron in scene
  let targetGroup = null;
  scene.traverse(obj => {
    if (obj.userData?.type === preset.polyhedronType) {
      targetGroup = obj;
    }
  });

  if (!targetGroup) {
    console.warn(`⚠️ Polyhedron ${preset.polyhedronType} not found`);
    return;
  }

  // 3. Set projection spreads directly (bypass axis buttons)
  RTProjections.state.customSpreads = preset.spreads;
  RTProjections.state.presetName = preset.name;

  // 4. Show projection with preset spreads
  RTProjections.showProjection(targetGroup, {
    spreads: preset.spreads,
    showIdealPolygon: true,  // Always show ideal for comparison
  });

  console.log(`📐 Applied preset: ${preset.name}`);
},

/**
 * Get projection plane basis from explicit spreads
 * (Used by presets instead of _axisToSpreads)
 */
_getProjectionPlaneBasisFromSpreads: function(spreads) {
  // Reuse existing _getProjectionPlaneBasis with spreads array
  return RTProjections._getProjectionPlaneBasis(spreads);
},
```

### UI Changes: Prime Polygon Buttons

Refactor the view preset buttons in `rt-ui-binding-defs.js`:

```javascript
// viewControlBindings - Prime Projection Views
{
  id: "viewPentagonProjection",
  onClick: (renderingAPI, scene) => {
    const preset = RTPrimeCuts.getPreset("pentagon");
    RTProjections.applyPreset(preset, scene);
  },
},
{
  id: "viewHeptagonProjectionTet",
  onClick: (renderingAPI, scene) => {
    const preset = RTPrimeCuts.getPreset("heptagon");
    RTProjections.applyPreset(preset, scene);
  },
},
// ... etc for 11-gon, 13-gon
```

### RTPrimeCuts Thin Wrapper

After Phase 4, `rt-prime-cuts.js` becomes a thin wrapper:

```javascript
export const RTPrimeCuts = {
  // Preset registry (single source of truth)
  _presets: PROJECTION_PRESETS,

  /**
   * Get a preset by name
   */
  getPreset: function(name) {
    return PROJECTION_PRESETS[name];
  },

  /**
   * Get all preset names
   */
  getPresetNames: function() {
    return Object.keys(PROJECTION_PRESETS);
  },

  /**
   * Verify a preset produces expected hull count
   */
  verifyPreset: function(name) {
    const preset = PROJECTION_PRESETS[name];
    // ... verification logic (keep from current implementation)
  },

  // Legacy compatibility - delegates to RTProjections
  showPrimePolygon: function(n, scene, camera, planeDistance) {
    const presetMap = { 5: "pentagon", 7: "heptagon", 11: "hendecagon", 13: "tridecagon" };
    const preset = PROJECTION_PRESETS[presetMap[n]];
    if (preset) {
      RTProjections.applyPreset(preset, scene);
    }
  },
};
```

### Code Removal Candidates

After Phase 4, these can be removed from `rt-prime-cuts.js`:

| Function | Lines | Reason |
|----------|-------|--------|
| `showPrimePolygon` (body) | 106-433 | Replaced by `RTProjections.applyPreset()` |
| `_createProjectionHullVertices` | 576-682 | Unused after preset migration |
| `_createProjectionHullVerticesFixed` | 712-780 | Unused after preset migration |
| `_createRegularPolygonVerticesFallback` | 687-702 | Unused after preset migration |
| `_createRegularPolygonVerticesFixed` | 790-802 | Unused after preset migration |
| `_activatePrimeProjectionCutplane` | 816-885 | Move to RTProjections if needed |
| `_deactivatePrimeProjectionCutplane` | 893-948 | Move to RTProjections if needed |

**Estimated reduction**: ~600 lines from rt-prime-cuts.js

### Verification Checklist (Phase 4)

- [ ] PROJECTION_PRESETS registry defined
- [ ] `RTProjections.applyPreset()` implemented
- [ ] Pentagon button uses preset
- [ ] Heptagon button uses preset
- [ ] Hendecagon (11-gon) button uses preset
- [ ] Tridecagon (13-gon) button uses preset
- [ ] Legacy `showPrimePolygon(n)` still works
- [ ] Verification system still validates presets
- [ ] Removed ~600 lines of duplicated code

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

### Phase 1-2: Shadow & Swap (COMPLETE)
- [x] RTProjections module loads without errors
- [x] Projections UI section renders correctly
- [x] Enable Projection checkbox shows/hides options
- [x] Axis buttons toggle correctly (exclusive selection)
- [x] Distance slider updates projection
- [x] Show Rays toggle works
- [x] Show Interior toggle works
- [x] Show Ideal toggle works
- [x] Projection works with: Cube, Tetrahedron, Octahedron
- [x] Projection works with: Truncated Tetrahedron
- [x] rt-prime-cuts.js delegates to RTProjections
- [x] Console logs show hull vertex count

### Phase 4: Presets (TODO)
- [ ] PROJECTION_PRESETS registry defined
- [ ] `RTProjections.applyPreset()` implemented
- [ ] Pentagon button uses preset
- [ ] Heptagon button uses preset
- [ ] Hendecagon (11-gon) button uses preset
- [ ] Tridecagon (13-gon) button uses preset
- [ ] Legacy `showPrimePolygon(n)` still works
- [ ] ~600 lines removed from rt-prime-cuts.js

---

## References

- **Source of generic code**: `modules/rt-prime-cuts.js`
- **UI pattern template**: `modules/rt-papercut.js` (axis selection)
- **Quadray coordinates**: `modules/rt-math.js` (Quadray.basisVectors)
- **Prime projection research**: `Geometry documents/Polygon-Rationalize.md`
