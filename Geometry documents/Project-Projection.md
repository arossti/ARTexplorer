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

## Phase 4: Presets System (Leveraging Existing Infrastructure)

### Design Principle

**Presets work like file imports, except data comes from within the app.**

The existing `RTFileHandler` already has a complete preset system:
- `savePreset(name)` / `loadPreset(name)` / `deletePreset(name)` / `listPresets()`
- Uses localStorage with key prefix `art-explorer-preset-`
- State captured via `exportState()` / restored via `importState()`

Projection presets should integrate with this pattern rather than reinvent it.

### Two Types of Presets

1. **Built-in Prime Presets** (read-only, shipped with app)
   - Pentagon, Heptagon, Hendecagon, Tridecagon
   - Stored in `PROJECTION_PRESETS` constant in `rt-prime-cuts.js`
   - Applied via `RTProjections.applyPreset()`

2. **User Projection Presets** (saved/loaded by user)
   - Saved via existing `RTFileHandler.savePreset()` mechanism
   - Projection state included in `environment.projection` during export
   - Restored during `importState()` like any other environment setting

### State Management Integration

Add projection state to `RTStateManager.state.environment`:

```javascript
// rt-state-manager.js - Add to state.environment
environment: {
  colorPalette: null,
  canvasBackground: "0x1A1A1A",
  uiBackground: "0x2A2A2A",

  // NEW: Projection environment
  projection: {
    enabled: false,
    basis: "cartesian",
    axis: "z",
    distance: 3,
    showRays: true,
    showInterior: false,
    showIdealPolygon: false,
    // For preset-based projections:
    customSpreads: null,      // [s1, s2, s3] or null for axis-based
    presetName: null,         // "pentagon", "heptagon", etc. or null
    targetPolyhedronType: null, // userData.type of projected polyhedron
  },
},
```

### File Handler Integration

Extend `RTFileHandler.exportState()` to capture projection state:

```javascript
// rt-filehandler.js - In exportState(), add to environment object:
environment: {
  // ... existing camera, grids, forms, colorPalette ...

  // Projection state (mirrors RTProjections.state)
  projection: {
    enabled: RTProjections.state.enabled,
    basis: RTProjections.state.basis,
    axis: RTProjections.state.axis,
    distance: RTProjections.state.distance,
    showRays: RTProjections.state.showRays,
    showInterior: RTProjections.state.showInterior,
    showIdealPolygon: RTProjections.state.showIdealPolygon,
    customSpreads: RTProjections.state.customSpreads || null,
    presetName: RTProjections.state.presetName || null,
  },
},
```

Extend `RTFileHandler.importState()` to restore projection state:

```javascript
// rt-filehandler.js - In importState(), after restoring other environment:
if (stateData.environment?.projection) {
  const proj = stateData.environment.projection;

  // Restore RTProjections state
  Object.assign(RTProjections.state, proj);

  // Update UI elements
  const enableCheckbox = document.getElementById("enableProjection");
  if (enableCheckbox) enableCheckbox.checked = proj.enabled;

  const distanceSlider = document.getElementById("projectionDistance");
  if (distanceSlider) distanceSlider.value = proj.distance;

  // Update axis button highlighting
  const axisId = proj.basis === "cartesian"
    ? `projectionAxis${proj.axis.toUpperCase()}`
    : `projectionAxis${proj.axis.toUpperCase()}`;
  // ... set active class on correct button

  // If projection was enabled, re-apply it
  if (proj.enabled && proj.targetPolyhedronType) {
    // Find polyhedron in scene and show projection
    // (handled by updateGeometry callback after import)
  }

  console.log("✅ Projection state restored");
}
```

### Built-in Prime Presets

The existing `VERIFIED_PROJECTIONS` becomes `PROJECTION_PRESETS`:

```javascript
// rt-prime-cuts.js - Rename and extend
const PROJECTION_PRESETS = {
  pentagon: {
    name: "Pentagon (5-gon)",
    polyhedronType: "quadrayTruncatedTet",
    polyhedronCheckbox: "showQuadrayTruncatedTet",
    spreads: [0, 0, 0.5],
    expectedHull: 5,
    description: "Truncated Tetrahedron → 5-vertex hull",
    // State snapshot for import compatibility
    projectionState: {
      enabled: true,
      basis: "custom",
      axis: null,
      distance: 3,
      showRays: true,
      showInterior: false,
      showIdealPolygon: true,
      customSpreads: [0, 0, 0.5],
      presetName: "pentagon",
    },
  },
  // ... heptagon, hendecagon, tridecagon
};
```

### RTProjections Preset API

```javascript
// rt-projections.js - Add preset methods

/**
 * Apply a built-in or user preset
 * Uses same code path as importState() for consistency
 * @param {Object} preset - Preset with projectionState
 * @param {THREE.Scene} scene - Scene reference
 */
applyPreset: function(preset, scene) {
  // 1. Auto-enable required polyhedron (same as current)
  const checkbox = document.getElementById(preset.polyhedronCheckbox);
  if (checkbox && !checkbox.checked) {
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // 2. Apply projection state (same format as importState)
  if (preset.projectionState) {
    Object.assign(RTProjections.state, preset.projectionState);
  }

  // 3. Find target polyhedron
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

  // 4. Store for state export
  RTProjections.state.targetPolyhedronType = preset.polyhedronType;
  RTProjections.state.presetName = preset.name;

  // 5. Show projection
  RTProjections.showProjection(targetGroup, {
    spreads: preset.spreads,
    showIdealPolygon: true,
  });

  // 6. Update StateManager (for export)
  if (window.RTStateManager) {
    window.RTStateManager.state.environment.projection = { ...RTProjections.state };
  }

  console.log(`📐 Applied preset: ${preset.name}`);
},

/**
 * Export current projection state (for RTFileHandler)
 * @returns {Object} Projection state snapshot
 */
exportState: function() {
  return {
    enabled: RTProjections.state.enabled,
    basis: RTProjections.state.basis,
    axis: RTProjections.state.axis,
    distance: RTProjections.state.distance,
    showRays: RTProjections.state.showRays,
    showInterior: RTProjections.state.showInterior,
    showIdealPolygon: RTProjections.state.showIdealPolygon,
    customSpreads: RTProjections.state.customSpreads,
    presetName: RTProjections.state.presetName,
    targetPolyhedronType: RTProjections.state.targetPolyhedronType,
  };
},

/**
 * Import projection state (called from RTFileHandler.importState)
 * @param {Object} projectionState - State to restore
 */
importState: function(projectionState) {
  if (!projectionState) return;
  Object.assign(RTProjections.state, projectionState);
  // UI updates handled by caller
},
```

### User Workflow: Save/Load Custom Projection

Users can save their current projection setup as a preset:

1. Configure projection (axis, distance, options)
2. File > Save Preset > "MyProjection"
   - `RTFileHandler.savePreset("MyProjection")` captures entire state including `environment.projection`
3. Later: File > Load Preset > "MyProjection"
   - `RTFileHandler.loadPreset("MyProjection")` restores everything including projection

No new UI needed - leverages existing preset system!

### RTPrimeCuts Thin Wrapper

```javascript
export const RTPrimeCuts = {
  _presets: PROJECTION_PRESETS,

  getPreset: function(name) {
    return PROJECTION_PRESETS[name];
  },

  getPresetNames: function() {
    return Object.keys(PROJECTION_PRESETS);
  },

  // Legacy compatibility
  showPrimePolygon: function(n, scene, camera, planeDistance) {
    const presetMap = { 5: "pentagon", 7: "heptagon", 11: "hendecagon", 13: "tridecagon" };
    const preset = PROJECTION_PRESETS[presetMap[n]];
    if (preset) {
      RTProjections.applyPreset(preset, scene);
    }
  },

  // Verification (keep from current)
  verifyPreset: function(name) { /* ... */ },
  verifyAllProjections: function() { /* ... */ },
};
```

### Code Removal Candidates

After Phase 4, remove from `rt-prime-cuts.js`:

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

- [ ] `RTStateManager.state.environment.projection` defined
- [ ] `RTFileHandler.exportState()` includes projection
- [ ] `RTFileHandler.importState()` restores projection
- [ ] `RTProjections.exportState()` / `importState()` implemented
- [ ] `RTProjections.applyPreset()` implemented
- [ ] Built-in presets have `projectionState` snapshots
- [ ] Pentagon/Heptagon/Hendecagon/Tridecagon buttons use presets
- [ ] User-saved presets include projection state
- [ ] Legacy `showPrimePolygon(n)` still works
- [ ] ~600 lines removed from rt-prime-cuts.js

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

## Phase 5: Prime Preset Hull Calibration

### Problem Statement

After Phase 4 generalization, the prime polygon presets are **not producing the expected hull vertex counts**:

| Preset | Expected Hull | Actual Hull | Polyhedron | Spreads |
|--------|--------------|-------------|------------|---------|
| Pentagon | 5 | 8 | quadrayTruncatedTet | [0, 0, 0.5] |
| Heptagon | 7 | 8 | quadrayCompoundTet | [0, 0, 0.5] |
| Hendecagon | 11 | 8 | quadrayCompoundTet | [0, 0.2, 0.5] |
| Tridecagon | 13 | 10 | quadrayCompound | [0, 0.6, 0.8] |

### Root Cause Analysis

**Issue 1: Custom spreads not being used**

The `RTProjections.showProjection()` function calls `_axisToSpreads()` which reads from `state.axis`, but presets set `axis: null` and rely on `customSpreads`. The visualization code path ignores `customSpreads`.

**Issue 2: Preset spreads may differ from Python search results**

The spreads in `PROJECTION_PRESETS` may not exactly match the verified spreads from the Python search scripts. Need to cross-reference:

- `results/prime_projections_*.json` files
- `results/prime_compound_search_*.json` files
- `Geometry documents/Polygon-Rationalize.md` discoveries

### Diagnostic Approach

Add console logging to trace the projection pipeline:

```javascript
// In RTProjections.showProjection(), add:
console.log(`📐 showProjection called with options:`, options);
console.log(`   customSpreads from options:`, options.spreads);
console.log(`   state.customSpreads:`, RTProjections.state.customSpreads);

// In _createProjectionVisualization(), add:
console.log(`📐 Using spreads:`, spreads);
console.log(`   Basis vectors: right=${planeRight}, up=${planeUp}, normal=${planeNormal}`);
```

### Fix Strategy

**Code Fix 1**: Pass spreads through options to `_createProjectionVisualization`

In `showProjection()` (line ~223), pass spreads through:
```javascript
// In showProjection(), change:
RTProjections._createProjectionVisualization(polyhedronGroup, {
  showRays,
  showInterior,
  showIdealPolygon,
  rayColor,
  spreads: options.spreads,  // ADD THIS LINE
});
```

**Code Fix 2**: Use custom spreads in visualization

In `_createProjectionVisualization()` (line ~505), change:
```javascript
// BEFORE (line 505):
const spreads = RTProjections._axisToSpreads();

// AFTER:
const spreads = options.spreads || RTProjections.state.customSpreads || RTProjections._axisToSpreads();
```

**Data Fix**: Update PROJECTION_PRESETS in rt-prime-cuts.js with correct values from Python results.

3. **Verify each preset against Python search results**:

| n | Source File | Python Spreads | Compound | Vertices |
|---|-------------|----------------|----------|----------|
| 5 | `prime_breakthrough_*.json` | **[0, 0, 0.5]** | truncated_tetrahedron | 12 |
| 7 | `prime_breakthrough_*.json` | **[0.11, 0, 0.5]** | truncated_tetrahedron | 12 |
| 11 | `prime_breakthrough_*.json` | **[0, 0.4, 0.2]** | truncated_tet + icosahedron | 24 |
| 13 | `prime_breakthrough_*.json` | **[0, 0.6, 0.8]** | truncated_tet + icosahedron | 24 |

### Preset vs Python Discrepancies

| Preset | Current Spreads | Python Spreads | Current Polyhedron | Python Polyhedron |
|--------|-----------------|----------------|--------------------|--------------------|
| pentagon | [0, 0, 0.5] ✅ | [0, 0, 0.5] | quadrayTruncatedTet (12v) ✅ | trunc_tet (12v) |
| heptagon | [0, 0, 0.5] ❌ | [0.11, 0, 0.5] | quadrayCompoundTet (16v) ❌ | trunc_tet (12v) |
| hendecagon | [0, 0.2, 0.5] ❌ | [0, 0.4, 0.2] | quadrayCompoundTet (16v) ❌ | trunc_tet+icosa (24v) |
| tridecagon | [0, 0.6, 0.8] ✅ | [0, 0.6, 0.8] | quadrayCompound (24v) ✅ | trunc_tet+icosa (24v) |

### Required Fixes

**Heptagon (7-gon)**:
- Change spreads from `[0, 0, 0.5]` to `[0.11, 0, 0.5]`
- Change polyhedron from `quadrayCompoundTet` to `quadrayTruncatedTet`
- Python verified: 7-hull from truncated tetrahedron alone at s=(0.11, 0, 0.5)

**Hendecagon (11-gon)**:
- Change spreads from `[0, 0.2, 0.5]` to `[0, 0.4, 0.2]`
- Change polyhedron from `quadrayCompoundTet` to `quadrayCompound` (TruncTet+Icosa, 24v)
- Python verified: 11-hull from compound at s=(0, 0.4, 0.2)

### Verification Commands

Run in browser console to test each preset:

```javascript
// Test pentagon
RTPrimeCuts.verifyProjection(5);

// Test all presets
RTPrimeCuts.verifyAllProjections();

// Manual spread test
const group = /* get polyhedron from scene */;
RTProjections.showProjection(group, {
  spreads: [0, 0, 0.5],
  showIdealPolygon: true
});
```

### Phase 5 Checklist

- [ ] Add diagnostic logging to RTProjections
- [ ] Fix `showProjection()` to accept custom spreads from options
- [ ] Fix `_createProjectionVisualization()` to use custom spreads
- [ ] Cross-reference Python search results for correct spreads
- [ ] Update PROJECTION_PRESETS with verified spreads
- [ ] Verify pentagon produces 5-hull
- [ ] Verify heptagon produces 7-hull
- [ ] Verify hendecagon produces 11-hull
- [ ] Verify tridecagon produces 13-hull
- [ ] Console verification passes: `RTPrimeCuts.verifyAllProjections()`

### Python Search Result References

Prime polygon projections were discovered via brute-force search in Python. Key files:

- **Pentagon (5)**: Truncated tetrahedron alone, specific orientation
- **Heptagon (7)**: TruncTet + Tet compound at s=(0, 0, 0.5)
- **Hendecagon (11)**: TruncTet + Tet compound at s=(0, 0.2, 0.5)
- **Tridecagon (13)**: TruncTet + Icosa compound at s=(0, 0.6, 0.8)

See `Geometry documents/Prime-Projection-Conjecture.tex` for mathematical background.

---

## References

- **Source of generic code**: `modules/rt-prime-cuts.js`
- **UI pattern template**: `modules/rt-papercut.js` (axis selection)
- **Quadray coordinates**: `modules/rt-math.js` (Quadray.basisVectors)
- **Prime projection research**: `Geometry documents/Polygon-Rationalize.md`
- **Prime projection conjecture**: `Geometry documents/Prime-Projection-Conjecture.tex`
