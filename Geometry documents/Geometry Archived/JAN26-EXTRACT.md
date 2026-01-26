# JAN26-EXTRACT: Module Extraction Workplan

## Overview

Extract components from oversized modules to improve maintainability and code organization.

### Initial State (Jan 25, 2026)

| File | Lines | Content |
|------|-------|---------|
| rt-init.js | 4,120 | Event handlers, UI wiring, initialization |
| rt-rendering.js | 3,866 | Scene setup, grids, nodes, rendering, camera |
| rt-polyhedra.js | 2,760 | 2D primitives + 3D polyhedra |

### Final State (Jan 26, 2026)

| File | Lines | Change |
|------|-------|--------|
| rt-init.js | 4,120 | (unchanged) |
| rt-rendering.js | 2,656 | -1,210 (-31%) |
| rt-polyhedra.js | 2,060 | -700 (-25%) |
| **rt-primitives.js** | 744 | NEW |
| **rt-grids.js** | 480 | NEW |
| **rt-nodes.js** | 772 | NEW |

---

## Phase 1: rt-primitives.js ✅ COMPLETED

**Extract from**: rt-polyhedra.js
**Status**: Completed Jan 26, 2026
**Commit**: `4cf65cd` - "Refactor: Extract rt-primitives.js from rt-polyhedra.js (Phase 1)"

### Functions Extracted

| Function | Description |
|----------|-------------|
| `point()` | 0D primitive |
| `line()` | 1D primitive |
| `polygon()` | Dispatcher with dual-engine logic |
| `_polygonClassical()` | Classical trig fallback |
| `_polygonTriangle()` | RT-pure using √3 |
| `_polygonSquare()` | RT-pure using integers |
| `_polygonPentagon()` | RT-pure using φ |
| `_polygonHexagon()` | RT-pure using √3 |
| `_polygonOctagon()` | RT-pure using √2 |
| `_polygonNonagon()` | Triangle subdivision |
| `_polygonDecagon()` | RT-pure using φ |
| `_polygonDodecagon()` | RT-pure using √3 |

### Validation ✅

- [x] All primitive tests pass
- [x] Console logs show correct RT-pure/classical engine
- [x] Polygon slider works for n=3..24
- [x] No breaking changes to existing callers

---

## Phase 2: rt-grids.js ✅ COMPLETED

**Extract from**: rt-rendering.js
**Status**: Completed Jan 26, 2026
**Commit**: `e9aadaa` - "Refactor: Extract rt-grids.js from rt-rendering.js (Phase 2)"

### Functions Extracted

| Function | Description |
|----------|-------------|
| `createCartesianGrid()` | XY/XZ/YZ plane grids |
| `createTetrahedralArrow()` | WXYZ basis arrowheads |
| `createQuadrayBasis()` | WXYZ tetrahedral basis |
| `createIVMGrid()` | Triangular lattice generation |
| `createIVMPlanes()` | 6 central angle planes |
| `rebuildQuadrayGrids()` | Dynamic tessellation update |
| `rebuildCartesianGrids()` | Dynamic divisions update |

### Validation ✅

- [x] Grid tessellation slider works (1-24)
- [x] Central Angle grids display correctly
- [x] Quadray basis vectors render properly
- [x] Cartesian basis vectors render properly

---

## Phase 3: rt-nodes.js ✅ COMPLETED

**Extract from**: rt-rendering.js
**Status**: Completed Jan 26, 2026
**Commit**: `b435e52` - "Refactor: Extract rt-nodes.js from rt-rendering.js (Phase 3)"

### Functions Extracted

| Function | Description |
|----------|-------------|
| `getPolyhedronEdgeQuadrance()` | RT-pure edge Q for each type |
| `getClosePackedRadius()` | Universal r = √(Q/4) |
| `getCachedNodeGeometry()` | Geometry cache management |
| `addMatrixNodes()` | Planar matrix node generation |
| `addRadialMatrixNodes()` | Radial matrix node generation |
| `setNodeGeometryType()` | Toggle RT/classical geometry |
| `setGeodesicFrequency()` | Set geodesic subdivision level |
| `setNodeOpacity()` | Set node transparency |
| `clearNodeCache()` | Clear geometry cache |
| `getNodeConfig()` | Get current node state |

### Module-Level State

State variables moved to rt-nodes.js with accessor functions:
- `nodeGeometryCache` - Map for caching node geometries
- `useRTNodeGeometry` - Boolean for RT vs classical mode
- `geodesicFrequency` - Integer 1-4 for geodesic level
- `nodeOpacity` - Float 0-1 for transparency

### Validation ✅

- [x] Node rendering works (RT and classical modes)
- [x] Geodesic frequency slider works
- [x] Node opacity slider works
- [x] Packed node sizing calculates correctly
- [x] Performance clock shows correct triangle counts

---

## Phase 4: rt-camera.js — NOT PURSUED

**Extract from**: rt-rendering.js
**Status**: Evaluated and declined (Jan 26, 2026)
**Decision**: Keep in rt-rendering.js permanently

### Functions Identified

| Function | Lines | Description |
|----------|-------|-------------|
| `setCameraPreset()` | ~170 | Named view presets (iso, top, front, WXYZ, etc.) |
| `switchCameraType()` | ~60 | Perspective ↔ Orthographic |

### Complexity Analysis

Camera extraction is more complex than other phases due to **tight coupling** with rt-rendering.js state:

1. **Multiple shared references**:
   - `camera` - The active THREE.Camera instance
   - `controls` - OrbitControls instance
   - `scene` - For RTPapercut integration
   - `isOrthographic` - Boolean flag
   - `orthographicCamera` - Stored ortho camera
   - `originalPerspectiveCamera` - Stored perspective camera

2. **Cross-module dependencies**:
   - `Quadray.basisVectors` - For WXYZ view presets
   - `RTPapercut.setCutplaneAxis()` - View-to-cutplane axis mapping
   - DOM elements for checkbox state

3. **Extraction options** (for future consideration):
   - **Option A**: Pass all references as parameters (verbose)
   - **Option B**: Create Camera module with init() that receives references
   - **Option C**: Use dependency injection pattern

### Decision

Camera functions remain in rt-rendering.js. The ~224 lines of camera code mutate shared `camera` and `controls` references, requiring awkward patterns (callbacks or wrapper objects) to extract. Given the code is stable, rarely changes, and not needed by other modules, extraction provides no benefit. This is a permanent decision—not on the roadmap for future work.

---

## Summary

| Phase | Module | Status | Lines |
|-------|--------|--------|-------|
| 1 | rt-primitives.js | ✅ Complete | 744 |
| 2 | rt-grids.js | ✅ Complete | 480 |
| 3 | rt-nodes.js | ✅ Complete | 772 |
| 4 | rt-camera.js | ❌ Not pursued | — |

**Total lines extracted**: ~1,996 lines
**rt-rendering.js reduction**: 3,866 → 2,656 (-31%)
**rt-polyhedra.js reduction**: 2,760 → 2,060 (-25%)

---

*Created: 2026-01-25*
*Completed: 2026-01-26*
*Archived: 2026-01-26*
*Status: COMPLETED — Phases 1-3 extracted; Phase 4 evaluated and declined*

---

# COORDINATES: Bottom Panel UI Relocation

## Overview

Relocate coordinate and rotation input fields from the Controls section in the right panel to a new fixed panel along the bottom of the canvas. This improves workflow by keeping coordinate data visible while manipulating objects.

### Current Location (index.html lines 1522-1754)

The Controls section contains these coordinate/rotation groups:
- **XYZ Coordinates** (lines 1522-1554): X, Y, Z position inputs
- **WXYZ Coordinates** (lines 1556-1597): W, X, Y, Z quadray position inputs
- **XYZ Rotation (°)** (lines 1599-1631): X, Y, Z rotation in degrees
- **XYZ Rotation (s)** (lines 1633-1665): X, Y, Z rotation in spread
- **WXYZ Rotation (°)** (lines 1667-1708): W, X, Y, Z rotation in degrees
- **WXYZ Rotation (s)** (lines 1710-1754): W, X, Y, Z rotation in spread

### Target Location

New `#coordinates-panel` fixed to bottom of `#canvas-container`, horizontally arranged.

---

## Stage 1: CREATE — Build Bottom Panel Structure

### 1.1 HTML Structure (index.html)

Add new panel inside `#canvas-container` after the canvas element:

```html
<div id="coordinates-panel">
  <div class="coords-group">
    <label class="coords-group-label">XYZ Position</label>
    <div class="coords-row">
      <!-- X, Y, Z inputs -->
    </div>
  </div>
  <div class="coords-group">
    <label class="coords-group-label">WXYZ Position</label>
    <div class="coords-row">
      <!-- W, X, Y, Z inputs -->
    </div>
  </div>
  <div class="coords-divider"></div>
  <div class="coords-group">
    <label class="coords-group-label">XYZ Rotation</label>
    <div class="coords-row">
      <!-- Degrees row -->
    </div>
    <div class="coords-row">
      <!-- Spread row -->
    </div>
  </div>
  <div class="coords-group">
    <label class="coords-group-label">WXYZ Rotation</label>
    <div class="coords-row">
      <!-- Degrees row -->
    </div>
    <div class="coords-row">
      <!-- Spread row -->
    </div>
  </div>
</div>
```

### 1.2 CSS Styles (art.css)

```css
#coordinates-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(42, 42, 42, 0.95);
  border-top: 1px solid #444;
  padding: 8px 15px;
  display: flex;
  align-items: center;
  gap: 20px;
  backdrop-filter: blur(4px);
  z-index: 100;
}

.coords-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.coords-group-label {
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.coords-row {
  display: flex;
  gap: 8px;
}

.coords-divider {
  width: 1px;
  height: 40px;
  background: #444;
}
```

### 1.3 Validation Checklist

- [ ] Panel renders at bottom of canvas
- [ ] Panel does not overlap with 3D scene
- [ ] Existing styles (`.coord-input`, `.label-axis-*`, etc.) apply correctly
- [ ] Panel is responsive (doesn't break on narrow windows)

---

## Stage 2: REFINE — Wire Up Functionality

### 2.1 Preserve Element IDs

All input IDs must remain identical for existing JavaScript bindings:
- `coordX`, `coordY`, `coordZ`
- `coordW`, `coordX2`, `coordY2`, `coordZ2`
- `rotXDegrees`, `rotYDegrees`, `rotZDegrees`
- `rotXSpread`, `rotYSpread`, `rotZSpread`
- `rotWDegrees`, `rotXQDegrees`, `rotYQDegrees`, `rotZQDegrees`
- `rotWSpread`, `rotXQSpread`, `rotYQSpread`, `rotZQSpread`

### 2.2 Test Event Bindings

Verify in rt-init.js that all coordinate input event handlers still work:
- Manual coordinate entry updates object position
- Object selection populates coordinate fields
- Rotation inputs update object orientation
- Spread ↔ Degrees conversion works bidirectionally

### 2.3 Layout Refinements

- Add unit labels (°/s) inline with rotation inputs
- Consider collapsible/expandable state for smaller screens
- Ensure tab order flows naturally left-to-right

### 2.4 Validation Checklist

- [ ] All coordinate inputs respond to manual entry
- [ ] Selection updates populate all fields
- [ ] Rotation in degrees updates spread (and vice versa)
- [ ] Gumball transformations update coordinate display

---

## Stage 3: REMOVE — Clean Up Controls Section

### 3.1 Remove from Controls Section

Delete these elements from `#controls-section` in index.html:
- Lines 1522-1554: XYZ Coordinates block
- Lines 1556-1597: WXYZ Coordinates block
- Lines 1599-1631: XYZ Rotation (°) block
- Lines 1633-1665: XYZ Rotation (s) block
- Lines 1667-1708: WXYZ Rotation (°) block
- Lines 1710-1754: WXYZ Rotation (s) block

### 3.2 Adjust Controls Section Layout

- Remove extra spacing that was between coordinate blocks
- Verify remaining Controls content (Tool Mode, Grid Snapping, Object Snaps, NOW button) still displays correctly

### 3.3 Final Validation

- [ ] No duplicate element IDs in DOM
- [ ] Controls section renders cleanly without orphan styles
- [ ] All coordinate functionality works from new location
- [ ] No console errors related to missing elements

---

## File Changes Summary

| File | Changes |
|------|---------|
| index.html | Add `#coordinates-panel` in `#canvas-container`; remove coordinate blocks from `#controls-section` |
| art.css | Add bottom panel styles (~40 lines) |
| rt-init.js | No changes expected (IDs preserved) |

---

*Created: 2026-01-26*
*Status: PLANNING*
