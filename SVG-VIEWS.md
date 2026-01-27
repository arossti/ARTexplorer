# SVG Views System - Implementation Workplan

## Overview

A new **View Management System** for ARTexplorer that enables:
1. **SVG Export** - Vector graphics export of the current canvas view (geometry, cutplanes, section lines)
2. **View Persistence** - Save/restore named views with full recreation capability
3. **Parametric Recreation** - Views store parameters, not geometry clones (like instancing pattern)

## Architecture

### New Module: `rt-viewmanager.js`

Central coordinator that integrates with:
- **RTPapercut** - Section rendering, cutplane state, intersection lines
- **RTFileHandler** - Import/export (`.artview` files)
- **RTStateManager** - View registry, environment state persistence
- **rt-rendering.js** - Canvas capture, camera state

```
┌─────────────────────────────────────────────────────────────────┐
│                        rt-viewmanager.js                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ View Registry│  │ SVG Generator│  │ View Recreation      │  │
│  │ (named views)│  │ (vector out) │  │ (parametric rebuild) │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                   │                    │
         ▼                   ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│RTStateManager│      │ RTPapercut  │      │RTFileHandler│
│(persistence) │      │(section data)│      │(import/export)│
└─────────────┘      └─────────────┘      └─────────────┘
```

---

## View Naming Convention

### Format: `{Axis}{DrawingNumber}`

Views are named by **camera axis** (viewing direction) and sequential **drawing number**.

| Camera View | Basis | Axis Code | Example Names |
|-------------|-------|-----------|---------------|
| X (Right) | Cartesian | X | X1, X2, X3... |
| Y (Front) | Cartesian | Y | Y1, Y2, Y3... |
| Z (Top) | Cartesian | Z | Z1, Z2, Z3... |
| W (Quadray) | Tetrahedral | QW | QW1, QW2, QW3... |
| X (Quadray) | Tetrahedral | QX | QX1, QX2, QX3... |
| Y (Quadray) | Tetrahedral | QY | QY1, QY2, QY3... |
| Z (Quadray) | Tetrahedral | QZ | QZ1, QZ2, QZ3... |
| Axonometric | Combined | AXO | AXO1, AXO2... |
| Perspective | Free | P | P1, P2, P3... |

**Auto-increment**: Each new view of the same axis type increments the drawing number.

---

## Data Structures

### View Definition Object

```javascript
{
  // Identity
  id: "view_1706380800000_abc123",
  name: "Z1",                          // Auto-generated or user-defined
  label: "Top Section @ z=0.5",        // Optional user description
  timestamp: 1706380800000,

  // Camera State (for recreation)
  camera: {
    position: { x: 0, y: 0, z: 10 },
    rotation: { x: -1.57, y: 0, z: 0 },
    zoom: 1.0,
    type: "perspective"                // or "orthographic"
  },

  // Cutplane State (for section recreation)
  cutplane: {
    enabled: true,
    axis: "z",                         // 'x'|'y'|'z' (Cartesian) or 'w'|'x'|'y'|'z' (Tetrahedral)
    basis: "cartesian",                // 'cartesian' or 'tetrahedral'
    value: 0.5,                        // Slider position
    inverted: false
  },

  // Render Settings
  render: {
    printMode: true,                   // B&W mode
    lineWeight: 3,                     // Section line thickness (1-10)
    sectionNodes: true,                // Sphere intersections visible
    adaptiveResolution: false,         // 32 vs 64 segment circles
    backfaceCulling: true
  },

  // Instance References (parametric, not clones)
  // Only stores instance IDs - geometry is recreated from StateManager
  instanceRefs: ["instance_123", "instance_456"],

  // Grid Visibility
  grids: {
    cartesian: { visible: true, tessellation: 10 },
    quadray: { visible: false }
  },

  // Colors at capture time
  colors: {
    background: "#ffffff",             // Print mode white or scene color
    palette: null                      // null = use default, or custom overrides
  },

  // SVG Data (optional - only populated after export)
  svg: {
    exported: false,
    filename: null,                    // "Z1.svg"
    width: 1920,
    height: 1080,
    data: null                         // SVG string (if embedded)
  }
}
```

### Views Collection in StateManager

```javascript
RTStateManager.state.views = {
  registry: [],                        // Array of View objects
  counters: {                          // Drawing number counters per axis
    X: 0, Y: 0, Z: 0,
    QW: 0, QX: 0, QY: 0, QZ: 0,
    AXO: 0, P: 0
  },
  activeView: null                     // Currently displayed view ID
}
```

---

## SVG Generation Strategy

### Phase 1: Canvas Raster Capture (Quick Win)
- Use `renderer.domElement.toDataURL('image/png')`
- Embed in SVG as `<image>` element
- Preserves exact visual output
- Limitation: Not true vector

### Phase 2: Vector Path Generation (Full Implementation)
Extract vector data from RTPapercut's intersection lines:

```javascript
// RTPapercut._intersectionLines contains Line2 objects
// Each Line2 has LineGeometry with position attribute

function generateSVGPaths() {
  const paths = [];

  RTPapercut._intersectionLines.traverse(child => {
    if (child.isLine2) {
      const positions = child.geometry.attributes.position.array;
      const projected = projectToScreen(positions);  // 3D → 2D
      paths.push({
        d: positionsToSVGPath(projected),
        stroke: getMaterialColor(child.material),
        strokeWidth: child.material.linewidth * 1000  // Scale to SVG units
      });
    }
  });

  return paths;
}
```

### SVG Structure

```xml
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 1920 1080"
     data-art-view="Z1"
     data-art-version="1.0">

  <!-- Metadata for reimport -->
  <metadata>
    <art:view xmlns:art="https://artexplorer.github.io/schema">
      <!-- JSON view definition embedded here -->
    </art:view>
  </metadata>

  <!-- Background -->
  <rect width="100%" height="100%" fill="#ffffff"/>

  <!-- Grid Layer (optional) -->
  <g id="grid-layer" stroke="#e0e0e0" stroke-width="0.5">
    <!-- Grid lines -->
  </g>

  <!-- Section Edges Layer -->
  <g id="section-edges" stroke="#000000" stroke-width="2" fill="none">
    <path d="M100,200 L300,400 L500,200"/>
    <!-- More paths... -->
  </g>

  <!-- Section Nodes Layer (sphere intersections) -->
  <g id="section-nodes" stroke="#000000" stroke-width="1.5" fill="none">
    <circle cx="250" cy="300" r="15"/>
    <!-- More circles... -->
  </g>

  <!-- Title Block (optional) -->
  <g id="title-block" transform="translate(1700, 1000)">
    <text>Z1 - Top Section</text>
  </g>
</svg>
```

---

## Module Implementation

### `rt-viewmanager.js` - API

```javascript
export const RTViewManager = {
  // Dependencies (set during init)
  _stateManager: null,
  _fileHandler: null,
  _papercut: null,
  _scene: null,
  _camera: null,
  _renderer: null,

  // Initialize with dependencies
  init(stateManager, fileHandler, papercut, scene, camera, renderer) { },

  // ==================== VIEW CREATION ====================

  // Capture current state as a new view
  captureView(options = {}) { },          // Returns View object

  // Generate view name based on current camera/cutplane
  generateViewName() { },                  // Returns "Z1", "QW2", etc.

  // ==================== SVG EXPORT ====================

  // Export current view to SVG file
  exportSVG(options = {}) { },            // Triggers download

  // Generate SVG string from current state
  generateSVG(options = {}) { },          // Returns SVG string

  // Generate vector paths from intersection lines
  extractVectorPaths() { },               // Returns path data array

  // ==================== VIEW MANAGEMENT ====================

  // Save view to registry
  saveView(view) { },

  // Load view by ID or name
  loadView(idOrName) { },                 // Restores camera, cutplane, etc.

  // Delete view by ID or name
  deleteView(idOrName) { },

  // Delete all views (with confirmation)
  clearAllViews() { },

  // List all views
  listViews() { },                        // Returns array of view summaries

  // ==================== TABLE UI ====================

  // Render views table to DOM
  renderViewsTable() { },                 // Updates #viewsTableBody

  // Sort views by column
  sortViews(column, direction) { },       // column: 'name'|'axis'|'date', direction: 'asc'|'desc'

  // Get current sort state
  getSortState() { },                     // Returns { column, direction }

  // Highlight active view in table
  setActiveViewRow(viewId) { },

  // ==================== VIEW RECREATION ====================

  // Recreate view from definition (parametric rebuild)
  recreateView(viewDef) { },

  // Apply camera state
  applyCameraState(cameraState) { },

  // Apply cutplane state
  applyCutplaneState(cutplaneState) { },

  // ==================== IMPORT/EXPORT ====================

  // Export views to .artview file
  exportViewsFile(viewIds = null) { },    // null = all views

  // Import views from .artview file
  importViewsFile(file) { },              // Returns imported view count

  // Parse SVG metadata for view recreation
  parseSVGMetadata(svgString) { },        // Returns View object or null
};
```

---

## UI Integration

### Papercut Section Additions

```html
<!-- In index.html, within papercut-section -->

<div class="control-item" style="margin-top: 12px; border-top: 1px solid #444; padding-top: 12px;">
  <label class="label-section">View Export</label>

  <!-- Save SVG Button -->
  <button class="toggle-btn variant-tool" id="saveSVGView" style="width: 100%; margin-bottom: 8px;">
    Save SVG View
  </button>

  <!-- View Name Display/Edit -->
  <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
    <label style="font-size: 11px; color: #888;">View:</label>
    <input type="text" id="viewNameInput"
           style="flex: 1; background: #333; border: 1px solid #555; color: #fff; padding: 4px 8px; font-size: 12px;"
           placeholder="Auto: Z1" />
  </div>
</div>

<!-- Views Table -->
<div class="control-item">
  <label class="label-section">Saved Views</label>

  <!-- Table Header with Sort Controls -->
  <div class="views-table-header" style="display: flex; gap: 4px; margin-bottom: 4px; font-size: 10px; color: #888;">
    <span style="flex: 0 0 50px; cursor: pointer;" id="sortByName" title="Sort by name">Name ▼</span>
    <span style="flex: 0 0 50px; cursor: pointer;" id="sortByAxis" title="Sort by axis">Axis</span>
    <span style="flex: 1; cursor: pointer;" id="sortByDate" title="Sort by date">Date</span>
    <span style="flex: 0 0 60px;">Actions</span>
  </div>

  <!-- Views Table Body (scrollable) -->
  <div id="viewsTableBody" style="max-height: 150px; overflow-y: auto; border: 1px solid #444; border-radius: 4px;">
    <!-- Empty state -->
    <div class="views-empty-state" style="padding: 12px; text-align: center; color: #666; font-size: 11px;">
      No saved views. Click "Save SVG View" to capture current view.
    </div>
    <!-- Populated rows (generated by JS) -->
    <!--
    <div class="view-row" data-view-id="view_123" style="display: flex; gap: 4px; padding: 4px 8px; border-bottom: 1px solid #333; align-items: center;">
      <span class="view-name" style="flex: 0 0 50px; font-weight: 500; color: #00B4FF;">Z1</span>
      <span class="view-axis" style="flex: 0 0 50px; color: #888;">Cart-Z</span>
      <span class="view-date" style="flex: 1; color: #666; font-size: 10px;">Jan 27</span>
      <span class="view-actions" style="flex: 0 0 60px; display: flex; gap: 4px;">
        <button class="view-load-btn" title="Load view">▶</button>
        <button class="view-export-btn" title="Export SVG">↓</button>
        <button class="view-delete-btn" title="Delete view">✕</button>
      </span>
    </div>
    -->
  </div>

  <!-- Bulk Actions -->
  <div style="display: flex; gap: 4px; margin-top: 8px;">
    <button class="toggle-btn variant-small" id="exportAllViewsBtn" title="Export all views to .artview file" style="flex: 1;">
      Export All
    </button>
    <button class="toggle-btn variant-small" id="importViewsBtn" title="Import views from file" style="flex: 1;">
      Import
    </button>
    <button class="toggle-btn variant-small" id="clearAllViewsBtn" title="Delete all views" style="flex: 0 0 auto; color: #ff6b6b;">
      Clear
    </button>
  </div>
</div>
```

### Views Table Features

| Feature | Description |
|---------|-------------|
| **Sortable Columns** | Click column headers to sort by Name (A-Z), Axis type, or Date (newest/oldest) |
| **Row Actions** | Each row has Load (▶), Export SVG (↓), and Delete (✕) buttons |
| **Scrollable** | Table body scrolls when >5 views, keeps UI compact |
| **Empty State** | Helpful message when no views saved |
| **Bulk Actions** | Export All (`.artview`), Import, Clear All |

### CSS for Views Table

```css
/* In art.css */

/* Views Table Styling */
.views-table-header span:hover {
  color: #00B4FF;
}

.view-row {
  transition: background 0.15s;
}

.view-row:hover {
  background: rgba(0, 180, 255, 0.1);
}

.view-row.active {
  background: rgba(0, 180, 255, 0.2);
  border-left: 2px solid #00B4FF;
}

.view-actions button {
  background: transparent;
  border: 1px solid #555;
  color: #888;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
}

.view-actions button:hover {
  background: #444;
  color: #fff;
  border-color: #00B4FF;
}

.view-actions .view-delete-btn:hover {
  background: #442222;
  border-color: #ff6b6b;
  color: #ff6b6b;
}

/* Sort indicator */
.sort-asc::after { content: " ▲"; }
.sort-desc::after { content: " ▼"; }
```

### Workflow

1. User sets up scene (geometry, cutplane, camera angle)
2. User clicks **"Save SVG View"**
3. System:
   - Generates view name (e.g., "Z1") based on camera/cutplane axis
   - Captures all parameters (camera, cutplane, render settings, instance refs)
   - Generates SVG with embedded metadata
   - Downloads `.svg` file
   - Saves view to registry for later recall
4. User can later:
   - Select saved view from dropdown → Load → Scene recreates view
   - Import `.svg` file → Metadata parsed → View recreated

---

## Implementation Progress

### Status: Phase 2 Complete (2026-01-27)

**What's Working:**
- ✅ Full `rt-viewmanager.js` module with 1000+ lines of functionality
- ✅ View capture with auto-naming (X1, Y2, QW1, AXO3, P1, etc.)
- ✅ Sheet size presets (A4, Letter, A3, Custom)
- ✅ Vector SVG export with true 3D→2D projection
- ✅ Section line extraction from RTPapercut intersection lines
- ✅ Mesh face extraction with depth sorting (back-to-front)
- ✅ Vertex node extraction as projected circles
- ✅ Color and opacity preservation from materials
- ✅ Cutplane visibility filtering (hides geometry behind cutplane)
- ✅ Views table UI with sort, load, export, delete actions
- ✅ Bulk actions (Export All, Import, Clear)
- ✅ Title block with view name and date

**Known Issues (To Fix):**
1. **Save Button Stuck in Down State** - After clicking Save, the button remains visually pressed
2. **Orbit Controls Freeze** - Camera orbit controls stop responding after Save is clicked
3. **Geodesic Edge Vectors Not Exporting** - Geodesic wireframe edges missing from SVG
4. **Polyhedral Edge Vectors Not Exporting** - Wireframe edges (likely hairlines) not captured
5. **Grids Not Exporting** - Cartesian/Quadray grids not included even when visible

**SVG Output Quality:**
The vector SVG output is clean and high quality. Exports include:
- Translucent colored mesh faces with proper depth layering
- Section cut lines (black in print mode, red otherwise)
- Vertex nodes as filled circles with outlines
- White/dark background based on print mode

---

## Implementation Phases

### Phase 1: Foundation (MVP) ✅ COMPLETE
**Goal**: Basic SVG export with raster fallback

- [x] Create `rt-viewmanager.js` module skeleton
- [x] Implement `init()` with dependency injection
- [x] Implement `generateViewName()` with axis detection and counters
- [x] Implement `captureView()` to capture current state
- [x] Implement `exportSVG()` with canvas raster capture
- [x] Add "Save SVG View" button to Papercut UI
- [x] Wire up button to trigger export

**Deliverable**: Click button → Downloads PNG-in-SVG with metadata ✅

### Phase 2: Vector Paths ✅ COMPLETE
**Goal**: True vector SVG from intersection lines

- [x] Implement `extractVectorPaths()` to read RTPapercut._intersectionLines
- [x] Implement 3D→2D projection using camera matrices
- [x] Generate SVG `<path>` elements from projected coordinates
- [x] Handle line colors from material/palette
- [x] Handle line weights from Papercut settings
- [x] Add sphere intersection circles as `<circle>` elements
- [x] **BONUS**: Extract mesh faces with depth sorting
- [x] **BONUS**: Extract vertex nodes as circles

**Deliverable**: Clean vector SVG output ✅

### Phase 3: View Registry & Table UI ✅ MOSTLY COMPLETE
**Goal**: Save/load views within session with sortable table

- [x] Add `views` structure to RTStateManager.state
- [x] Implement `saveView()` to add to registry
- [ ] Implement `loadView()` to restore camera + cutplane (partial)
- [x] Implement `deleteView()` to remove single view
- [x] Implement `clearAllViews()` with confirmation dialog
- [x] Implement `listViews()` for table population
- [x] Add Views Table HTML to Papercut section
- [x] Add Views Table CSS styles to art.css
- [x] Implement `renderViewsTable()` to populate table rows
- [x] Implement `sortViews()` with column click handlers
- [x] Implement row action buttons (Load ▶, Export ↓, Delete ✕)
- [x] Implement `setActiveViewRow()` to highlight current view
- [x] Add empty state display when no views
- [x] Add bulk action buttons (Export All, Import, Clear)

**Deliverable**: Full views table with sort, load, delete, and bulk actions ✅

### Phase 4: File Persistence
**Goal**: Import/export views as files

- [ ] Define `.artview` JSON file format
- [ ] Implement `exportViewsFile()`
- [ ] Implement `importViewsFile()`
- [x] Add embedded metadata to SVG exports
- [ ] Implement `parseSVGMetadata()` for reimport
- [ ] Add import button/handler to FileHandler UI

**Deliverable**: Views survive page refresh via file import

### Phase 5: Integration & Polish
**Goal**: Full integration with existing systems

- [ ] Persist views in auto-save (localStorage)
- [ ] Include views in main `.json` state export
- [ ] Add view recreation on state import
- [ ] Add orthographic camera mode for true tech drawings
- [x] Add title block option for SVG
- [ ] Add grid export option
- [ ] Fix Save button down state bug
- [ ] Fix orbit controls freeze after save
- [ ] Add geodesic/polyhedral edge export
- [ ] Add grid line export

**Deliverable**: Complete view management system

---

## File Format: `.artview`

```json
{
  "format": "artexplorer-views",
  "version": "1.0",
  "exported": "2024-01-27T12:00:00Z",
  "views": [
    { /* View object */ },
    { /* View object */ }
  ],
  "instanceDefinitions": {
    "instance_123": {
      "type": "geodesicIcosahedron",
      "parameters": { "frequency": 3, "projection": "out" },
      "transform": { /* position, rotation, scale */ }
    }
  }
}
```

The `instanceDefinitions` section provides enough data to recreate geometry if the instances don't exist in the current scene.

---

## Technical Considerations

### 3D to 2D Projection

```javascript
function projectToScreen(point3D, camera, renderer) {
  const vector = new THREE.Vector3(point3D.x, point3D.y, point3D.z);
  vector.project(camera);

  const width = renderer.domElement.width;
  const height = renderer.domElement.height;

  return {
    x: (vector.x * 0.5 + 0.5) * width,
    y: (-vector.y * 0.5 + 0.5) * height  // Flip Y for SVG coordinates
  };
}
```

### Camera Axis Detection

```javascript
function detectCameraAxis(camera) {
  const forward = new THREE.Vector3(0, 0, -1);
  forward.applyQuaternion(camera.quaternion);

  // Check alignment with cardinal axes
  const axes = [
    { name: 'Z', vec: new THREE.Vector3(0, 0, 1), threshold: 0.9 },
    { name: 'Z', vec: new THREE.Vector3(0, 0, -1), threshold: 0.9 },
    { name: 'Y', vec: new THREE.Vector3(0, 1, 0), threshold: 0.9 },
    { name: 'Y', vec: new THREE.Vector3(0, -1, 0), threshold: 0.9 },
    { name: 'X', vec: new THREE.Vector3(1, 0, 0), threshold: 0.9 },
    { name: 'X', vec: new THREE.Vector3(-1, 0, 0), threshold: 0.9 },
  ];

  for (const axis of axes) {
    if (forward.dot(axis.vec) > axis.threshold) {
      return axis.name;
    }
  }

  // Check for axonometric (equal components)
  if (Math.abs(forward.x) > 0.4 && Math.abs(forward.y) > 0.4 && Math.abs(forward.z) > 0.4) {
    return 'AXO';
  }

  return 'P';  // Perspective/free view
}
```

### Quadray Axis Detection

For tetrahedral cutplane basis, detect which quadray axis:

```javascript
function detectQuadrayAxis(cutplaneState) {
  if (cutplaneState.basis !== 'tetrahedral') return null;

  const axisMap = { w: 'QW', x: 'QX', y: 'QY', z: 'QZ' };
  return axisMap[cutplaneState.axis] || null;
}
```

---

## Questions/Decisions

1. **SVG Size**: Fixed dimensions (1920x1080) or match current canvas?
2. **Title Block**: Include by default? User configurable?
3. **Grid Export**: Always include grid? Toggle option?
4. **Color Mode**: Always B&W for sections, or preserve scene colors?
5. **File Association**: Should `.artview` be distinct from `.json` state, or merged?

---

## Summary

This system follows the existing architectural patterns:
- **Parametric recreation** (like instancing) rather than geometry clones
- **Module separation** with clear responsibilities
- **State persistence** through RTStateManager
- **File I/O** through RTFileHandler patterns

The view naming convention (X1, QW2, etc.) provides clear identification of:
- Camera orientation (which axis you're looking along)
- Drawing sequence (for multiple views of same orientation)

Implementation can proceed incrementally, with each phase delivering usable functionality.
