# RT-Papercut Module

**Module**: `rt-papercut.js`
**Branch**: `Papercut` (branched from `Fold-Space`)
**Created**: 2026-01-01
**Status**: ✅ **Phase 1 Complete** - Core features implemented

---

## Implementation Status

### ✅ Completed Features

- **Dynamic Cutplane** - Slides along current view axis with ±10 unit range
- **Intersection Edge Rendering** - Clean Line2 edges where cutplane slices through geometry
- **Print Mode (B&W)** - One-click toggle for white background, black lines, dark gray meshes
- **Line Weight Control** - Real-time slider (1-5) with Line2/LineMaterial for actual thickness
- **Invert Cutplane** - Simple checkbox to flip normal direction (ground plane mode)
- **Smart Filtering** - Automatically excludes grids, basis vectors (up to 3 levels), hidden objects

### 🔲 TODO Features

- **Visualize Cutplane** - Optional visible plane with light gray fill and Line2 boundary edges
  - Should inherit grid extent (±10 units default)
  - Works for both normal and inverted modes
  - Toggle on/off independently of clipping

---

## 1. Overview

RT-Papercut transforms the ART Explorer into a print-ready architectural section tool by:

- Switching UI from black background to white (print-optimized)
- Adding depth-based line weights (LOD - Level of Detail)
- Implementing a dynamic cutplane with UI slider control
- Leveraging existing camera view presets
- Exporting via browser's native print-to-PDF functionality

**Design Philosophy**: Maximize reuse of existing tools (camera views, rendering utilities, state management) without creating redundant systems.

---

## 2. Core Features

### 2.1 Print Mode Toggle

- **UI Control**: Checkbox in Papercut section: "Enable Print Mode"
- **Visual Changes**:
  - Background: Black (`#000000`) → White (`#FFFFFF`)
  - Line colors: Bright/saturated → Dark/print-optimized
  - Hide non-essential UI elements (performance stats, debug info)
  - Show print-specific controls (cutplane slider, line weight options)

### 2.2 Depth-Based Line Weights (LOD)

Geometry closer to the view plane gets thicker lines than distant geometry.

**Implementation Strategy**:

- Calculate distance from each vertex/edge to the current camera position
- Map distance to line weight: `lineWeight = lerp(maxWeight, minWeight, normalizedDistance)`
- Update on camera move (debounced for performance)

**Weight Ranges**:

- **Close**: 2.0 - 3.0 px (foreground detail)
- **Medium**: 1.0 - 2.0 px (mid-ground context)
- **Far**: 0.5 - 1.0 px (background reference)

### 2.3 Dynamic Cutplane

A plane that slices through geometry, hiding everything on one side.

**Cutplane Properties**:

- **Orientation**: Aligned to current camera view (Top = XY horizontal, Front = XZ vertical, etc.)
- **Range**: Full grid extent (if grid is 12 units tall, slider ranges from -12 to +12)
- **UI Control**: Slider in Papercut section
- **Visual Feedback**: Optional plane visualization (toggle-able, semi-transparent grid)

**Cutplane Logic**:

```javascript
// Pseudocode
function applyCutplane(geometry, cutplaneHeight, cutplaneAxis) {
  geometry.vertices.forEach(vertex => {
    const distanceFromPlane = vertex[cutplaneAxis] - cutplaneHeight;
    vertex.visible = distanceFromPlane >= 0; // Show only above cutplane
  });

  // Update faces to hide those with all vertices below cutplane
  geometry.faces.forEach(face => {
    const allVerticesVisible = face.vertices.every(v => v.visible);
    face.visible = allVerticesVisible;
  });
}
```

### 2.4 SVG Export

Generate SVG from visible geometry for high-quality vector output.

**SVG Generation**:

- Project 3D geometry to 2D screen space
- Convert THREE.js line geometry to SVG `<path>` elements
- Apply line weights based on depth
- Include visible UI controls (view name, scale bar, cutplane indicator)
- Output to new browser tab/window for print dialog

---

## 3. Integration with Existing Systems

### 3.1 Camera View Presets (Leverage Existing)

**File**: `src/geometry/rt-init.js:1632-1722`

Existing views to leverage:

- **Top** (`camera.position.set(0, 0, distance)`) - XY plane cutplane slides along Z
- **Front** (`camera.position.set(0, -distance, 0)`) - XZ plane cutplane slides along Y
- **Left/Right** (45° angles) - Angled cutplane (more complex, phase 2)
- **Axo** - Isometric cutplane (advanced feature)

**Cutplane Axis Mapping**:

```javascript
const cutplaneConfig = {
  top: { axis: "z", normal: [0, 0, 1] },
  bottom: { axis: "z", normal: [0, 0, -1] },
  front: { axis: "y", normal: [0, 1, 0] },
  back: { axis: "y", normal: [0, -1, 0] },
  left: { axis: "x", normal: [1, 0, 0] },
  right: { axis: "x", normal: [-1, 0, 0] },
};
```

### 3.2 Grid Extent Detection

**File**: `src/geometry/rt-init.js:260-307`

Cartesian grid already calculates extent:

```javascript
const gridSize = divisions; // Line 266
// divisions from slider: min=10, max=100, step=10
```

**Cutplane Range Calculation**:

```javascript
function getCutplaneRange() {
  const cartesianSlider = document.getElementById("cartesianTessSlider");
  const divisions = parseInt(cartesianSlider.value);
  const gridExtent = divisions;

  return {
    min: -gridExtent / 2,
    max: gridExtent / 2,
  };
}
```

### 3.3 Rendering Utilities (rt-rendering.js)

**File**: `src/geometry/modules/rt-rendering.js`

Leverage existing functions:

- `RTRendering.createEdgeGeometry()` - Line rendering
- `RTRendering.createMeshWithEdges()` - Mesh + wireframe combo

**New Functions to Add**:

```javascript
// rt-rendering.js additions
RTRendering.setLineWeightByDepth = function (
  lineGeometry,
  camera,
  minWeight,
  maxWeight
) {
  // Calculate distance from camera to each line segment
  // Update LineBasicMaterial.linewidth based on depth
};

RTRendering.applyClippingPlane = function (
  geometry,
  planeNormal,
  planeConstant
) {
  // Use THREE.Plane for geometry clipping
  // Returns clipped geometry or null if fully clipped
};
```

### 3.4 State Management

**Status**: ⏸️ DEFERRED (Not needed for MVP)

**Initial Implementation Philosophy**:
The first version of Papercut is a **"one-shot" print export** tool - the user simply clicks a button to generate a print-ready view, then prints via browser. No persistent state management needed.

**Why defer StateManager integration?**

- Simpler initial implementation (fewer dependencies)
- Faster time to working prototype
- User can regenerate print view on demand (no need to save/restore print states)
- Reduces complexity for first iteration

**Future Enhancement** (Post-MVP):
If users request the ability to save/restore multiple papercut configurations (different cutplane positions, line weight presets, etc.), we can integrate with StateManager:

```javascript
// FUTURE: Add to StateManager for persistent papercut configurations
const papercutState = {
  enabled: false,
  cutplaneEnabled: false,
  cutplaneHeight: 0,
  cutplaneAxis: "z",
  lineWeightEnabled: true,
  lineWeightMin: 0.5,
  lineWeightMax: 3.0,
  currentView: "top",
};
```

**Current Approach** (MVP):

- Papercut module maintains local state (not persisted)
- State resets when print mode is toggled off
- User adjusts cutplane/line weights, then immediately exports
- Simple, fast, no undo/redo complexity

---

## 4. Module Structure: rt-papercut.js

### 4.1 Module Exports

```javascript
/**
 * RT-Papercut Module
 * Print-optimized rendering with cutplane and depth-based line weights
 */

export const RTPapercut = {
  // Core state
  state: {
    printModeEnabled: false,
    cutplaneEnabled: false,
    cutplaneValue: 0, // Current slider position
    cutplaneAxis: "z", // 'x', 'y', or 'z'
    cutplaneNormal: null, // THREE.Vector3
    lineWeightEnabled: true,
    currentView: "top",
  },

  // Public API
  enablePrintMode: function (scene, renderer) {},
  disablePrintMode: function (scene, renderer) {},
  updateCutplane: function (value, scene) {},
  updateLineWeights: function (camera, scene) {},
  exportToSVG: function (camera, scene) {},

  // Internal helpers
  _switchToWhiteBackground: function (scene, renderer) {},
  _updateMaterialsForPrint: function (scene) {},
  _createCutplaneVisual: function () {},
  _clipGeometry: function (geometry, plane) {},
  _calculateLineWeight: function (vertex, camera) {},
};
```

### 4.2 Initialization Function

```javascript
/**
 * Initialize Papercut module and wire up UI controls
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {THREE.WebGLRenderer} renderer
 */
RTPapercut.init = function (scene, camera, renderer) {
  // 1. Enable Print Mode checkbox
  const printModeCheckbox = document.getElementById("enablePrintMode");
  printModeCheckbox.disabled = false;
  printModeCheckbox.addEventListener("change", e => {
    if (e.target.checked) {
      RTPapercut.enablePrintMode(scene, renderer);
    } else {
      RTPapercut.disablePrintMode(scene, renderer);
    }
  });

  // 2. Enable Cutplane checkbox
  const cutplaneCheckbox = document.getElementById("enableCutPlane");
  cutplaneCheckbox.disabled = false;
  cutplaneCheckbox.addEventListener("change", e => {
    RTPapercut.state.cutplaneEnabled = e.target.checked;
    RTPapercut.updateCutplane(RTPapercut.state.cutplaneValue, scene);
  });

  // 3. Create Cutplane slider (NEW UI ELEMENT)
  const cutplaneSlider = document.createElement("input");
  cutplaneSlider.type = "range";
  cutplaneSlider.id = "cutplaneSlider";
  cutplaneSlider.min = "-12"; // Will be updated dynamically
  cutplaneSlider.max = "12";
  cutplaneSlider.step = "0.1";
  cutplaneSlider.value = "0";
  cutplaneSlider.addEventListener("input", e => {
    RTPapercut.state.cutplaneValue = parseFloat(e.target.value);
    RTPapercut.updateCutplane(RTPapercut.state.cutplaneValue, scene);
  });

  // 4. Inject slider into Papercut section
  const papercutSection = document.getElementById("papercut-section");
  const sliderContainer = document.createElement("div");
  sliderContainer.className = "slider-container";
  sliderContainer.innerHTML = `
    <label class="label-subsection">Cut Plane Height</label>
    <div class="slider-container">
      <input type="range" id="cutplaneSlider" min="-12" max="12" step="0.1" value="0" />
      <span class="slider-value" id="cutplaneValue">0.0</span>
    </div>
  `;
  papercutSection.appendChild(sliderContainer);

  // 5. Listen to camera view changes to update cutplane axis
  document.querySelectorAll('[id^="view"]').forEach(button => {
    button.addEventListener("click", () => {
      const view = button.id.replace("view", "").toLowerCase();
      RTPapercut._updateCutplaneAxisForView(view);
    });
  });

  console.log("✅ RT-Papercut module initialized");
};
```

### 4.3 Print Mode Toggle

```javascript
/**
 * Enable print mode: white background, dark lines, hide UI chrome
 */
RTPapercut.enablePrintMode = function (scene, renderer) {
  RTPapercut.state.printModeEnabled = true;

  // 1. Switch background to white
  scene.background = new THREE.Color(0xffffff);
  renderer.setClearColor(0xffffff);

  // 2. Update all materials for print (dark colors)
  scene.traverse(object => {
    if (object.material) {
      // Store original material for restoration
      if (!object.userData.originalMaterial) {
        object.userData.originalMaterial = object.material.clone();
      }

      // Convert to print-optimized material
      if (object.material.color) {
        object.material.color.setHex(0x000000); // Black lines
      }
      if (object.material.emissive) {
        object.material.emissive.setHex(0x000000); // No glow
      }
    }
  });

  // 3. Hide UI elements
  document.getElementById("info-overlay").style.display = "none";
  document.getElementById("controls-panel").style.backgroundColor = "white";
  document.getElementById("controls-panel").style.color = "black";

  // 4. Enable line weight updates
  if (RTPapercut.state.lineWeightEnabled) {
    RTPapercut.updateLineWeights(camera, scene);
  }

  console.log("✅ Print mode enabled");
};

/**
 * Disable print mode: restore original appearance
 */
RTPapercut.disablePrintMode = function (scene, renderer) {
  RTPapercut.state.printModeEnabled = false;

  // 1. Restore black background
  scene.background = new THREE.Color(0x000000);
  renderer.setClearColor(0x000000);

  // 2. Restore original materials
  scene.traverse(object => {
    if (object.userData.originalMaterial) {
      object.material = object.userData.originalMaterial;
      delete object.userData.originalMaterial;
    }
  });

  // 3. Show UI elements
  document.getElementById("info-overlay").style.display = "block";
  document.getElementById("controls-panel").style.backgroundColor = "";
  document.getElementById("controls-panel").style.color = "";

  console.log("✅ Print mode disabled");
};
```

### 4.4 Cutplane Implementation

```javascript
/**
 * Update cutplane position and clip geometry
 * @param {number} value - Cutplane position along current axis
 * @param {THREE.Scene} scene
 */
RTPapercut.updateCutplane = function (value, scene) {
  if (!RTPapercut.state.cutplaneEnabled) {
    // Remove clipping planes from all materials
    scene.traverse(object => {
      if (object.material && object.material.clippingPlanes) {
        object.material.clippingPlanes = [];
      }
    });
    return;
  }

  // 1. Create clipping plane based on current axis
  const normal = new THREE.Vector3();
  if (RTPapercut.state.cutplaneAxis === "x") {
    normal.set(1, 0, 0);
  } else if (RTPapercut.state.cutplaneAxis === "y") {
    normal.set(0, 1, 0);
  } else {
    // 'z'
    normal.set(0, 0, 1);
  }

  const plane = new THREE.Plane(normal, -value);
  RTPapercut.state.cutplaneNormal = plane;

  // 2. Apply clipping plane to all renderable objects
  scene.traverse(object => {
    if (object.material) {
      object.material.clippingPlanes = [plane];
      object.material.clipShadows = true;
      object.material.needsUpdate = true;
    }
  });

  // 3. Update renderer to enable local clipping
  if (!window.renderer.localClippingEnabled) {
    window.renderer.localClippingEnabled = true;
  }

  // 4. Update slider value display
  const valueDisplay = document.getElementById("cutplaneValue");
  if (valueDisplay) {
    valueDisplay.textContent = value.toFixed(1);
  }

  console.log(
    `✂️ Cutplane updated: ${RTPapercut.state.cutplaneAxis} = ${value.toFixed(1)}`
  );
};

/**
 * Update cutplane axis based on camera view
 * @param {string} view - Camera view name (top, front, left, etc.)
 * @private
 */
RTPapercut._updateCutplaneAxisForView = function (view) {
  const axisMap = {
    top: "z",
    bottom: "z",
    front: "y",
    back: "y",
    left: "x",
    right: "x",
    axo: "z", // Default to Z for axonometric
    perspective: "z",
  };

  const newAxis = axisMap[view] || "z";

  if (newAxis !== RTPapercut.state.cutplaneAxis) {
    RTPapercut.state.cutplaneAxis = newAxis;
    RTPapercut.state.currentView = view;

    // Update slider range based on grid extent
    const range = RTPapercut._getCutplaneRange();
    const slider = document.getElementById("cutplaneSlider");
    if (slider) {
      slider.min = range.min;
      slider.max = range.max;
      slider.value = 0; // Reset to center
      RTPapercut.state.cutplaneValue = 0;
    }

    console.log(`📐 Cutplane axis updated: ${newAxis} (view: ${view})`);
  }
};

/**
 * Get cutplane range based on current grid extent
 * @returns {{min: number, max: number}}
 * @private
 */
RTPapercut._getCutplaneRange = function () {
  const slider = document.getElementById("cartesianTessSlider");
  const divisions = slider ? parseInt(slider.value) : 10;
  const extent = divisions;

  return {
    min: -extent / 2,
    max: extent / 2,
  };
};
```

### 4.5 Depth-Based Line Weights

```javascript
/**
 * Update line weights based on distance from camera (LOD)
 * @param {THREE.Camera} camera
 * @param {THREE.Scene} scene
 */
RTPapercut.updateLineWeights = function (camera, scene) {
  if (
    !RTPapercut.state.printModeEnabled ||
    !RTPapercut.state.lineWeightEnabled
  ) {
    return;
  }

  const minWeight = 0.5;
  const maxWeight = 3.0;

  scene.traverse(object => {
    // Only process LineSegments and Line objects
    if (object.type === "LineSegments" || object.type === "Line") {
      const positions = object.geometry.attributes.position;
      if (!positions) return;

      // Calculate average distance from camera to line
      let totalDistance = 0;
      let count = 0;

      for (let i = 0; i < positions.count; i++) {
        const vertex = new THREE.Vector3(
          positions.getX(i),
          positions.getY(i),
          positions.getZ(i)
        );

        // Transform to world space
        vertex.applyMatrix4(object.matrixWorld);

        // Distance to camera
        const distance = camera.position.distanceTo(vertex);
        totalDistance += distance;
        count++;
      }

      const avgDistance = totalDistance / count;

      // Map distance to line weight (closer = thicker)
      // Assume max distance is ~15 units (camera distance preset)
      const normalizedDistance = Math.min(avgDistance / 15, 1.0);
      const lineWeight =
        maxWeight - normalizedDistance * (maxWeight - minWeight);

      // Update material
      if (object.material && object.material.linewidth !== undefined) {
        object.material.linewidth = lineWeight;
        object.material.needsUpdate = true;
      }
    }
  });

  console.log("📏 Line weights updated based on depth");
};
```

### 4.6 SVG Export

```javascript
/**
 * Export current view to SVG for print
 * @param {THREE.Camera} camera
 * @param {THREE.Scene} scene
 */
RTPapercut.exportToSVG = function (camera, scene) {
  // Import THREE.js SVGRenderer dynamically
  // Note: SVGRenderer is in examples/jsm/renderers/SVGRenderer.js

  import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/renderers/SVGRenderer.js")
    .then(({ SVGRenderer }) => {
      const svgRenderer = new SVGRenderer();
      svgRenderer.setSize(window.innerWidth, window.innerHeight);
      svgRenderer.render(scene, camera);

      // Get SVG element
      const svgElement = svgRenderer.domElement;

      // Open in new window for printing
      const svgBlob = new Blob([svgElement.outerHTML], {
        type: "image/svg+xml",
      });
      const svgUrl = URL.createObjectURL(svgBlob);

      const printWindow = window.open(svgUrl, "_blank");
      printWindow.onload = function () {
        printWindow.print();
      };

      console.log("📄 SVG export complete - print dialog opened");
    })
    .catch(err => {
      console.error("❌ SVG export failed:", err);
      alert(
        "SVG export requires THREE.js SVGRenderer. Falling back to browser print."
      );
      window.print(); // Fallback to regular print
    });
};
```

---

## 5. HTML/CSS Changes

### 5.1 New UI Elements in index.html

**Location**: Papercut section (around line 1150)

```html
<!-- ========================================
     SECTION 7: PAPERCUT (PRINT MODE)
     ======================================== -->
<div class="control-group">
  <h3>
    <span
      class="section-toggle collapsed"
      data-target="papercut-section"
    ></span>
    Papercut
  </h3>
  <div id="papercut-section" class="section-content collapsed">
    <!-- Enable Print Mode -->
    <div class="control-item">
      <label class="checkbox-label">
        <input type="checkbox" id="enablePrintMode" />
        Enable Print Mode
      </label>
      <p class="info-text">White background, dark lines, optimized for print</p>
    </div>

    <!-- Enable Cut Plane -->
    <div class="control-item">
      <label class="checkbox-label">
        <input type="checkbox" id="enableCutPlane" />
        Enable Cut Plane
      </label>
    </div>

    <!-- Cutplane Slider (dynamically injected by rt-papercut.js) -->
    <div id="cutplane-slider-container"></div>

    <!-- Line Weight Controls -->
    <div class="control-item">
      <label class="checkbox-label">
        <input type="checkbox" id="enableLineWeights" checked />
        Depth-Based Line Weights
      </label>
    </div>

    <div class="control-item">
      <label class="label-subsection">Min/Max Line Weight</label>
      <div class="slider-container">
        <input
          type="range"
          id="lineWeightMin"
          min="0.1"
          max="2.0"
          step="0.1"
          value="0.5"
        />
        <span class="slider-value" id="lineWeightMinValue">0.5</span>
      </div>
      <div class="slider-container">
        <input
          type="range"
          id="lineWeightMax"
          min="1.0"
          max="5.0"
          step="0.1"
          value="3.0"
        />
        <span class="slider-value" id="lineWeightMaxValue">3.0</span>
      </div>
    </div>

    <!-- Export to SVG/Print -->
    <div class="control-item">
      <label class="label-section">Export</label>
      <div class="toggle-btn-group">
        <button class="toggle-btn variant-standard" id="exportSVG">
          Export SVG
        </button>
        <button class="toggle-btn variant-standard" id="browserPrint">
          Print (Browser)
        </button>
      </div>
    </div>

    <!-- Print Extents (A4, Letter, etc.) - FUTURE -->
    <div class="control-item">
      <label class="label-section">Print Extents</label>
      <div class="button-grid-2col">
        <button class="toggle-btn variant-standard" id="fitA4" disabled>
          A4
        </button>
        <button class="toggle-btn variant-standard" id="fitLetter" disabled>
          Letter
        </button>
        <button class="toggle-btn variant-standard" id="fitA3" disabled>
          A3
        </button>
        <button class="toggle-btn variant-standard" id="fitCustom" disabled>
          Custom
        </button>
      </div>
      <p class="info-text">Page size helpers - Coming soon</p>
    </div>
  </div>
</div>
```

### 5.2 CSS Additions (art.css)

```css
/* Papercut Print Mode Overrides */
body.print-mode {
  background-color: #ffffff !important;
}

body.print-mode #controls-panel {
  background-color: #ffffff;
  color: #000000;
  border-color: #cccccc;
}

body.print-mode .control-group h3,
body.print-mode .label-section,
body.print-mode .label-subsection {
  color: #000000;
}

/* Cutplane Visual Indicator */
.cutplane-indicator {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 16px;
  border-radius: 4px;
  font-family: "Courier New", monospace;
  font-size: 14px;
  color: #000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 100;
}

/* Print-specific styles */
@media print {
  #controls-panel,
  #info-overlay,
  .cutplane-indicator {
    display: none !important;
  }

  #canvas-container {
    width: 100% !important;
    height: 100% !important;
  }
}
```

---

## 6. Implementation Phases

### Phase 1: Core Papercut Module (Day 1)

**Estimated Effort**: 4-6 hours

1. ✅ Create `src/geometry/modules/rt-papercut.js`
2. ✅ Implement print mode toggle (white background, dark materials)
3. ✅ Add UI controls to Papercut section in `index.html`
4. ✅ Wire up initialization in `rt-init.js`
5. ✅ Test print mode toggle

**Success Criteria**:

- Checkbox toggles black/white background
- Materials update to print-optimized colors
- UI remains functional in both modes

### Phase 2: Cutplane Implementation (Day 1-2)

**Estimated Effort**: 6-8 hours

1. ✅ Implement cutplane slider UI (dynamic range based on grid extent)
2. ✅ Add cutplane logic using THREE.Plane and material clipping
3. ✅ Wire up camera view listeners to update cutplane axis
4. ✅ Add optional visual cutplane indicator (semi-transparent grid)
5. ✅ Test cutplane in all 6 orthographic views

**Success Criteria**:

- Slider correctly clips geometry along current view axis
- Range updates when grid extent changes
- Cutplane axis updates when view changes
- No performance degradation

### Phase 3: Depth-Based Line Weights (Day 2)

**Estimated Effort**: 4-6 hours

1. ✅ Implement `updateLineWeights()` function
2. ✅ Add debounced camera movement listener
3. ✅ Test with various polyhedra and geodesics
4. ✅ Add min/max weight sliders to UI
5. ✅ Optimize performance (limit updates to visible geometry)

**Success Criteria**:

- Lines visibly thicken when closer to camera
- No jitter or performance issues during orbit
- Weight ranges are aesthetically pleasing

### Phase 4: SVG Export & Browser Print (Day 2-3)

**Estimated Effort**: 4-6 hours

1. ✅ Implement SVG export using THREE.SVGRenderer
2. ✅ Add "Export SVG" button
3. ✅ Add "Print (Browser)" button (leverages native print)
4. ✅ Test print output quality
5. ✅ Document workflow in user guide

**Success Criteria**:

- SVG export opens in new window with print dialog
- Browser print produces acceptable output
- Line weights and cutplane respected in output

### Phase 5: Polish & Documentation (Day 3)

**Estimated Effort**: 2-4 hours

1. ✅ Add keyboard shortcuts (Ctrl+P for print mode toggle)
2. ✅ Add tooltips/help text to Papercut controls
3. ✅ Update ARTexplorer.md with Papercut section
4. ✅ Create user guide with examples
5. ✅ Test across browsers (Chrome, Firefox, Safari)

---

## 7. Code Integration Points

### 7.1 rt-init.js Modifications

**Location**: After line 3800 (end of initialization)

```javascript
// Import Papercut module
import { RTPapercut } from "./modules/rt-papercut.js";

// Initialize Papercut (after scene, camera, renderer are ready)
RTPapercut.init(scene, camera, renderer);

// Add camera movement listener for line weight updates
let lineWeightUpdateTimeout;
controls.addEventListener("change", () => {
  if (RTPapercut.state.printModeEnabled && RTPapercut.state.lineWeightEnabled) {
    clearTimeout(lineWeightUpdateTimeout);
    lineWeightUpdateTimeout = setTimeout(() => {
      RTPapercut.updateLineWeights(camera, scene);
    }, 150); // Debounce 150ms
  }
});

// Add to global window object for debugging
window.RTPapercut = RTPapercut;
```

### 7.2 index.html Script Imports

**Location**: Bottom of `<body>`, after existing script tags

```html
<!-- Papercut Module -->
<script type="module">
  import { RTPapercut } from "./modules/rt-papercut.js";

  // Export button listeners
  document.getElementById("exportSVG").addEventListener("click", () => {
    RTPapercut.exportToSVG(window.camera, window.scene);
  });

  document.getElementById("browserPrint").addEventListener("click", () => {
    window.print();
  });

  // Line weight slider listeners
  document.getElementById("lineWeightMin").addEventListener("input", e => {
    RTPapercut.state.lineWeightMin = parseFloat(e.target.value);
    document.getElementById("lineWeightMinValue").textContent = e.target.value;
    RTPapercut.updateLineWeights(window.camera, window.scene);
  });

  document.getElementById("lineWeightMax").addEventListener("input", e => {
    RTPapercut.state.lineWeightMax = parseFloat(e.target.value);
    document.getElementById("lineWeightMaxValue").textContent = e.target.value;
    RTPapercut.updateLineWeights(window.camera, window.scene);
  });
</script>
```

---

## 8. Testing Plan

### 8.1 Unit Tests

- [ ] Print mode toggle (black ↔ white background)
- [ ] Material color updates (bright ↔ dark)
- [ ] Cutplane range calculation (grid extent changes)
- [ ] Cutplane axis update (view changes)
- [ ] Line weight calculation (distance to camera)

### 8.2 Integration Tests

- [ ] Cutplane + geodesic subdivision (complex geometry)
- [ ] Line weights + camera orbit (performance)
- [ ] Print mode + gumball selection (UI interaction)
- [ ] SVG export + cutplane (correct clipping in output)

### 8.3 Manual Tests

- [ ] Print to PDF in Chrome, Firefox, Safari
- [ ] SVG export quality (vector lines, no rasterization)
- [ ] Cutplane in all 6 orthographic views
- [ ] Line weights visible at various zoom levels
- [ ] UI responsiveness (slider feedback, checkbox states)

---

## 9. Performance Considerations

### 9.1 Line Weight Updates

**Challenge**: Updating line weights on every camera move is expensive.

**Solution**:

- Debounce updates (150ms delay after camera stops moving)
- Only update visible geometry (frustum culling)
- Cache distance calculations per frame
- Option to disable line weights for complex scenes

### 9.2 Cutplane Clipping

**Challenge**: THREE.Plane clipping is GPU-based but requires material updates.

**Solution**:

- Apply clipping plane to materials once, not every frame
- Only update when cutplane slider value changes
- Use `material.needsUpdate = true` sparingly

### 9.3 SVG Export

**Challenge**: SVGRenderer is slow for complex scenes (1000+ lines).

**Solution**:

- Warn user if scene has >2000 line segments
- Offer fallback to browser print (faster, rasterized output)
- Consider WebGL screenshot + overlay SVG labels (hybrid approach)

---

## 10. Future Enhancements (Post-MVP)

### 10.1 Advanced Cutplane Features

- [ ] **Dual Cutplanes**: Top and bottom cutplanes (sandwich clip)
- [ ] **Angled Cutplanes**: Cutplane rotation for axo/perspective views
- [ ] **Cutplane Interpolation**: Animate cutplane sweeping through geometry
- [ ] **Boolean Operations**: Union/Intersection/Difference of multiple cutplanes

### 10.2 Enhanced SVG Export

- [ ] **Layer Separation**: Export edges, faces, nodes as separate SVG groups
- [ ] **Stroke Dashing**: Dashed lines for hidden edges (architectural convention)
- [ ] **Dimension Annotations**: Auto-generate dimension lines from geometry
- [ ] **Scale Bar**: Embedded scale indicator in SVG

### 10.3 Print Templates

- [ ] **Title Block**: Customizable project info (name, date, scale)
- [ ] **Border Margins**: A4/Letter/A3 preset margins
- [ ] **Multi-View Layout**: Export 4 views on single page (Top/Front/Left/Axo)

### 10.4 Material Overrides

- [ ] **Hatch Patterns**: Fill faces with architectural hatch patterns
- [ ] **Color by Property**: Color code geometry by vertex count, symmetry, etc.
- [ ] **Transparency Control**: Adjust face opacity for X-ray views

---

## 11. Known Limitations

### 11.1 THREE.js Line Weights

**Issue**: `LineBasicMaterial.linewidth` is not supported in WebGL (only value of 1.0).

**Workaround**:

- Use `THREE.Line2` from `examples/jsm/lines/Line2.js` (supports variable line widths)
- Or accept constant line width in WebGL, rely on SVG export for variable weights

**Decision**: Start with constant line width (1.0), add Line2 support in Phase 3 if needed.

### 11.2 Browser Print Limitations

**Issue**: Browser print is rasterized (not vector), quality depends on zoom level.

**Workaround**:

- Encourage users to use SVG export for high-quality output
- Document recommended zoom levels for browser print (e.g., fit to page width)

### 11.3 Cutplane Edge Generation

**Issue**: THREE.Plane clips geometry but doesn't generate new edges at cut boundary.

**Workaround**:

- Accept open edges for MVP
- Future enhancement: Use CSG (Constructive Solid Geometry) library to generate cap faces

---

## 12. Git Workflow

### 12.1 Branching Strategy

**Option A: New Branch from Fold-Space (Recommended)**

```bash
git checkout Fold-Space
git pull origin Fold-Space
git checkout -b Papercut
```

**Option B: Continue on Fold-Space**

```bash
git checkout Fold-Space
# Implement Papercut features directly
```

**Recommendation**: Use **Option A** (new branch) to keep Fold-Space stable while Papercut is in development.

### 12.2 Commit Strategy

Commit after each phase:

1. `feat(papercut): Add print mode toggle and white background`
2. `feat(papercut): Implement cutplane with dynamic slider`
3. `feat(papercut): Add depth-based line weights`
4. `feat(papercut): Add SVG export and browser print`
5. `docs(papercut): Update ARTexplorer.md with Papercut section`

### 12.3 Merge Strategy

Once Papercut is stable:

```bash
git checkout Fold-Space
git merge Papercut --no-ff
git push origin Fold-Space

# Then merge to main when ready
git checkout main
git merge Fold-Space --no-ff
git push origin main
```

---

## 13. Success Metrics

### 13.1 Functional Goals

- ✅ Print mode toggle works reliably
- ✅ Cutplane clips geometry correctly in all 6 orthographic views
- ✅ Line weights visually differentiate foreground/background geometry
- ✅ SVG export produces vector output (no rasterization)
- ✅ Browser print is acceptable quality (min 150 DPI equivalent)

### 13.2 Performance Goals

- ✅ Print mode toggle: < 100ms
- ✅ Cutplane update: < 50ms (for scenes with <1000 objects)
- ✅ Line weight update: < 200ms (debounced)
- ✅ SVG export: < 5s (for scenes with <500 lines)

### 13.3 Usability Goals

- ✅ User can produce print-ready output in < 5 clicks
- ✅ Cutplane slider provides real-time visual feedback
- ✅ Print output matches on-screen preview (WYSIWYG)

---

## 14. Questions & Decisions

### 14.1 Open Questions

1. **Line Weight Range**: Should we support custom min/max via sliders or use fixed presets (Thin/Medium/Thick)?
   - **Decision**: Start with sliders (more flexible), consider presets in future.

2. **Cutplane Visual**: Should the cutplane itself be visible (semi-transparent grid) or invisible?
   - **Decision**: Make it optional via checkbox ("Show Cutplane Grid").

3. **SVG Fallback**: If SVGRenderer fails, should we fallback to canvas screenshot or abort?
   - **Decision**: Fallback to `window.print()` (browser print), notify user via console/alert.

4. **Print Mode Default**: Should Print Mode automatically switch to orthographic view?
   - **Decision**: No, let user choose view. Print mode only affects colors/background.

### 14.2 Resolved Decisions

- ✅ **Module Location**: `src/geometry/modules/rt-papercut.js` (consistent with existing modules)
- ✅ **UI Location**: Papercut section in `index.html` (already exists, currently disabled)
- ✅ **Cutplane Axis**: Auto-update based on camera view (Top=Z, Front=Y, Left=X)
- ✅ **Grid Extent**: Use existing Cartesian grid extent (no new configuration needed)
- ✅ **Line Weight Method**: Start with constant width (1.0), upgrade to Line2 if needed

---

## 15. References & Resources

### 15.1 THREE.js Documentation

- [THREE.Plane](https://threejs.org/docs/#api/en/math/Plane) - Clipping plane math
- [Material.clippingPlanes](https://threejs.org/docs/#api/en/materials/Material.clippingPlanes) - Material clipping
- [SVGRenderer](https://threejs.org/docs/#examples/en/renderers/SVGRenderer) - Vector export
- [Line2](https://threejs.org/docs/#examples/en/lines/Line2) - Variable line widths

### 15.2 Existing Codebase References

- `src/geometry/rt-init.js:1632-1722` - Camera view presets
- `src/geometry/rt-init.js:260-307` - Grid extent calculation
- `src/geometry/modules/rt-rendering.js` - Rendering utilities
- `src/geometry/modules/rt-state-manager.js` - State management patterns
- `docs/development/Geometry documents/ARTexplorer.md` - Main documentation

### 15.3 Architectural References

- [Architectural Line Weights](https://www.archisoup.com/line-weights) - Standard conventions
- [Section Cut Conventions](https://www.archtoolbox.com/representation/architectural-drawings/sections.html) - Cut plane visualization

---

## Appendix A: File Checklist

### Files to Create

- [ ] `src/geometry/modules/rt-papercut.js` (new module)

### Files to Modify

- [ ] `src/geometry/index.html` (enable Papercut UI controls)
- [ ] `src/geometry/rt-init.js` (import and initialize Papercut module)
- [ ] `src/geometry/art.css` (add print mode styles)
- [ ] `docs/development/Geometry documents/ARTexplorer.md` (add Papercut section)

### Files to Reference (no changes)

- `src/geometry/modules/rt-rendering.js`
- `src/geometry/modules/rt-state-manager.js`
- `src/geometry/modules/rt-math.js`

---

## Appendix B: Code Snippets Reference

### B.1 Import Statement (rt-init.js)

```javascript
import { RTPapercut } from "./modules/rt-papercut.js";
```

### B.2 Initialization Call (rt-init.js)

```javascript
// After scene, camera, renderer are ready (line ~3800)
RTPapercut.init(scene, camera, renderer);
```

### B.3 Debounced Camera Listener (rt-init.js)

```javascript
let lineWeightUpdateTimeout;
controls.addEventListener("change", () => {
  if (RTPapercut.state.printModeEnabled && RTPapercut.state.lineWeightEnabled) {
    clearTimeout(lineWeightUpdateTimeout);
    lineWeightUpdateTimeout = setTimeout(() => {
      RTPapercut.updateLineWeights(camera, scene);
    }, 150);
  }
});
```

### B.4 Print Mode Toggle (HTML Button)

```html
<input type="checkbox" id="enablePrintMode" />
```

### B.5 Cutplane Slider (HTML)

```html
<input
  type="range"
  id="cutplaneSlider"
  min="-12"
  max="12"
  step="0.1"
  value="0"
/>
```

---

**Document Status**: ✅ Phase 1 Complete, Phase 2 (Cutplane Integration) In Design
**Next Action**: Implement axis-aware cutplane with dynamic grid extent ranges
**Estimated Total Effort**: 20-30 hours across 3 days

---

## 16. QWXYZ Tetrahedral Basis Views Integration (2026-01-12)

### 16.1 Phase 1: QWXYZ Camera Views ✅ COMPLETE

**Implementation Date**: 2026-01-12
**Branch**: `WXYZ-Basis-Views`
**Status**: Core views implemented, cutplane integration pending

**What Was Implemented**:

1. **Four QWXYZ View Buttons** - QW View, QX View, QY View, QZ View added to View Options UI
2. **Camera Positioning Logic** - Camera placed at distance=10 along Quadray tetrahedral basis vectors
3. **Orthographic Support** - Existing orthographic/perspective toggle works for all views
4. **Event System Integration** - WXYZ views fully wired into existing view preset infrastructure

**Files Modified**:

- `index.html:1285-1303` - Added WXYZ view buttons with visual divider
- `rt-rendering.js:2096-2138` - Camera preset logic for W/X/Y/Z views
- `rt-init.js:854-857` - Event listener wiring for WXYZ views
- `README.md:4315-4329` - Updated 8.1.4 status to Partial completion

**Technical Details**:

```javascript
// Quadray basis vectors (from rt-math.js:695-700)
Quadray.basisVectors = [
  new THREE.Vector3(1, 1, 1).normalize(), // W: (0.577, 0.577, 0.577)
  new THREE.Vector3(1, -1, -1).normalize(), // X: (0.577, -0.577, -0.577)
  new THREE.Vector3(-1, 1, -1).normalize(), // Y: (-0.577, 0.577, -0.577)
  new THREE.Vector3(-1, -1, 1).normalize(), // Z: (-0.577, -0.577, 0.577)
];

// Camera positioning (rt-rendering.js:2114)
const cameraPosition = basisVector.clone().multiplyScalar(distance); // distance = 10
camera.position.copy(cameraPosition);
camera.lookAt(0, 0, 0);
```

---

### 16.2 Phase 2: Axis-Aware Cutplane System (DESIGN PHASE)

**Goal**: Integrate WXYZ tetrahedral views with RT-Papercut cutplane system, providing unified sectioning across both Cartesian and Quadray coordinate systems.

#### 16.2.1 Core Design Principle

**The cutplane orientation follows the selected view's coordinate system:**

- **Cartesian Basis Views** (Top, Bottom, Left, Right, Front, Back) → Cutplane perpendicular to XYZ axes
- **Tetrahedral Basis Views** (W, X, Y, Z) → Cutplane perpendicular to WXYZ basis vectors

**The cutplane slider range dynamically matches the grid intervals:**

- **XYZ Views** → Range follows "Grid Intervals" slider in Coordinate Systems (default ±10, scales to ±20, etc.)
- **QWXYZ Views** → Range follows "QWXYZ Grid Intervals" slider (default ±10, same scaling behavior)

#### 16.2.2 UI Specification: Cutplane Axis Selector

**New UI Control**: Add to Papercut section in `index.html`

```html
<!-- Cutplane Axis Selector -->
<div class="control-item">
  <label class="label-subsection">Cutplane Basis</label>

  <!-- Cartesian Basis Options -->
  <div class="button-group">
    <span class="basis-label">Cartesian:</span>
    <button
      class="toggle-btn variant-small"
      id="cutplaneAxisX"
      data-axis="x"
      data-basis="cartesian"
    >
      X
    </button>
    <button
      class="toggle-btn variant-small"
      id="cutplaneAxisY"
      data-axis="y"
      data-basis="cartesian"
    >
      Y
    </button>
    <button
      class="toggle-btn variant-small active"
      id="cutplaneAxisZ"
      data-axis="z"
      data-basis="cartesian"
    >
      Z (default)
    </button>
  </div>

  <!-- Tetrahedral Basis Options -->
  <div class="button-group">
    <span class="basis-label">Tetrahedral:</span>
    <button
      class="toggle-btn variant-small"
      id="cutplaneAxisW"
      data-axis="w"
      data-basis="tetrahedral"
    >
      W
    </button>
    <button
      class="toggle-btn variant-small"
      id="cutplaneAxisQX"
      data-axis="qx"
      data-basis="tetrahedral"
    >
      X
    </button>
    <button
      class="toggle-btn variant-small"
      id="cutplaneAxisQY"
      data-axis="qy"
      data-basis="tetrahedral"
    >
      Y
    </button>
    <button
      class="toggle-btn variant-small"
      id="cutplaneAxisQZ"
      data-axis="qz"
      data-basis="tetrahedral"
    >
      Z
    </button>
  </div>

  <p class="info-text">Cutplane perpendicular to selected axis</p>
</div>
```

#### 16.2.3 Automatic Axis Selection Logic

**When user clicks a camera view button, automatically select corresponding cutplane axis:**

```javascript
// View → Cutplane Axis Mapping
const viewToCutplaneAxis = {
  // Cartesian views → Cartesian axes
  top: { basis: "cartesian", axis: "z" },
  bottom: { basis: "cartesian", axis: "z" },
  front: { basis: "cartesian", axis: "y" },
  back: { basis: "cartesian", axis: "y" },
  left: { basis: "cartesian", axis: "x" },
  right: { basis: "cartesian", axis: "x" },

  // Tetrahedral views → Quadray axes (QW, QX, QY, QZ)
  quadqw: { basis: "tetrahedral", axis: "qw" },
  quadqx: { basis: "tetrahedral", axis: "qx" },
  quadqy: { basis: "tetrahedral", axis: "qy" },
  quadqz: { basis: "tetrahedral", axis: "qz" },

  // Special views default to Cartesian Z
  axo: { basis: "cartesian", axis: "z" },
  perspective: { basis: "cartesian", axis: "z" },
};

// Implementation in rt-rendering.js setCameraPreset()
function setCameraPreset(view) {
  // ... existing camera positioning logic ...

  // Auto-update cutplane axis based on view
  const cutplaneConfig = viewToCutplaneAxis[view];
  if (cutplaneConfig && RTPapercut) {
    RTPapercut.setCutplaneAxis(cutplaneConfig.basis, cutplaneConfig.axis);
    RTPapercut.updateCutplaneRange(); // Refresh slider range from grid intervals
  }
}
```

#### 16.2.4 Dynamic Range Calculation

**Cutplane slider range expands to match grid extent settings:**

```javascript
// rt-papercut.js: Get cutplane range based on current basis and grid intervals
RTPapercut.updateCutplaneRange = function () {
  const state = RTPapercut.state;
  let extent = 10; // Default

  if (state.cutplaneBasis === "cartesian") {
    // Read from Cartesian Grid Intervals slider
    const cartesianSlider = document.getElementById("cartesianTessSlider");
    extent = cartesianSlider ? parseInt(cartesianSlider.value) : 10;
  } else if (state.cutplaneBasis === "tetrahedral") {
    // Read from WXYZ Grid Intervals slider
    const quadraySlider = document.getElementById("quadrayTessSlider");
    extent = quadraySlider ? parseInt(quadraySlider.value) : 10;
  }

  // Update slider range: ±extent
  const slider = document.getElementById("cutplaneSlider");
  if (slider) {
    slider.min = -extent;
    slider.max = extent;
    slider.value = 0; // Reset to center when range changes
    state.cutplaneValue = 0;
  }

  console.log(
    `✂️ Cutplane range updated: ±${extent} (basis: ${state.cutplaneBasis})`
  );
};

// Listen to grid interval slider changes
document
  .getElementById("cartesianTessSlider")
  ?.addEventListener("input", () => {
    if (RTPapercut.state.cutplaneBasis === "cartesian") {
      RTPapercut.updateCutplaneRange();
    }
  });

document.getElementById("quadrayTessSlider")?.addEventListener("input", () => {
  if (RTPapercut.state.cutplaneBasis === "tetrahedral") {
    RTPapercut.updateCutplaneRange();
  }
});
```

#### 16.2.5 Tetrahedral Cutplane Implementation

**For WXYZ views, cutplane normal = Quadray basis vector:**

```javascript
// rt-papercut.js: Update cutplane with tetrahedral basis support
RTPapercut.updateCutplane = function (value, scene) {
  if (!RTPapercut.state.cutplaneEnabled) {
    // Remove clipping planes from all materials
    scene.traverse(object => {
      if (object.material) {
        object.material.clippingPlanes = [];
        object.material.needsUpdate = true;
      }
    });
    return;
  }

  // 1. Determine cutplane normal based on basis and axis
  let normal = new THREE.Vector3();
  const invert = RTPapercut.state.invertCutPlane ? 1 : -1;

  if (RTPapercut.state.cutplaneBasis === "cartesian") {
    // Cartesian axes (existing logic)
    if (RTPapercut.state.cutplaneAxis === "x") {
      normal.set(invert * 1, 0, 0);
    } else if (RTPapercut.state.cutplaneAxis === "y") {
      normal.set(0, invert * 1, 0);
    } else {
      // 'z'
      normal.set(0, 0, invert * 1);
    }
  } else if (RTPapercut.state.cutplaneBasis === "tetrahedral") {
    // Tetrahedral axes - use Quadray basis vectors
    if (!Quadray.basisVectors) {
      Quadray.init(THREE);
    }

    // Map axis to Quadray basis vector with correct color mapping
    // QW=Yellow(3), QX=Red(0), QY=Blue(2), QZ=Green(1)
    const axisMap = { qw: 3, qx: 0, qy: 2, qz: 1 };
    const axisIndex = axisMap[RTPapercut.state.cutplaneAxis];
    normal.copy(Quadray.basisVectors[axisIndex]).multiplyScalar(invert);
  }

  // 2. Create clipping plane
  const plane = new THREE.Plane(normal, -value);

  // 3. Apply to all materials (existing logic continues...)
  scene.traverse(object => {
    if (object.material && !shouldExcludeFromCutplane(object)) {
      if (Array.isArray(object.material)) {
        object.material.forEach(mat => {
          mat.clippingPlanes = [plane];
          mat.needsUpdate = true;
        });
      } else {
        object.material.clippingPlanes = [plane];
        object.material.needsUpdate = true;
      }
    }
  });

  // 4. Enable renderer clipping
  if (RTPapercut._renderer) {
    RTPapercut._renderer.localClippingEnabled = true;
  }

  console.log(
    `✂️ Cutplane updated: ${RTPapercut.state.cutplaneBasis} ${RTPapercut.state.cutplaneAxis} = ${value.toFixed(1)}`
  );
};
```

#### 16.2.6 State Management Updates

**Add new state properties to rt-papercut.js:**

```javascript
export const RTPapercut = {
  state: {
    printModeEnabled: false,
    cutplaneEnabled: false,
    cutplaneValue: 0,

    // NEW: Basis-aware cutplane properties
    cutplaneBasis: "cartesian", // 'cartesian' or 'tetrahedral'
    cutplaneAxis: "z", // 'x'|'y'|'z' (cartesian) or 'qw'|'qx'|'qy'|'qz' (tetrahedral/Quadray)
    cutplaneNormal: null, // THREE.Vector3

    invertCutPlane: false,
    lineWeightEnabled: true,
    lineWeightMin: 0.5,
    lineWeightMax: 3.0,
    currentView: "top",
    sectionNodesEnabled: false,
    adaptiveNodeResolution: false,
    backfaceCullingEnabled: true,
  },

  // NEW: Public API for setting cutplane axis
  setCutplaneAxis: function (basis, axis) {
    RTPapercut.state.cutplaneBasis = basis;
    RTPapercut.state.cutplaneAxis = axis;

    // Update UI button active states
    document.querySelectorAll("[data-basis]").forEach(btn => {
      btn.classList.remove("active");
    });

    const activeBtn = document.querySelector(
      `[data-basis="${basis}"][data-axis="${axis}"]`
    );
    if (activeBtn) {
      activeBtn.classList.add("active");
    }

    console.log(`✂️ Cutplane axis set: ${basis} ${axis}`);
  },

  // ... rest of existing API ...
};
```

#### 16.2.7 Implementation Status ✅ COMPLETE

**Phase 2A: UI & State Management** ✅

- [x] Add cutplane axis selector buttons to Papercut UI section
- [x] Update RTPapercut.state with basis/axis properties
- [x] Implement setCutplaneAxis() function
- [x] Wire up button click listeners with persistent active state

**Phase 2B: Automatic Axis Selection** ✅

- [x] Add automatic view-to-axis mapping in rt-rendering.js
- [x] Call RTPapercut.setCutplaneAxis() in setCameraPreset()
- [x] Automatic axis switching on view changes working

**Phase 2C: Tetrahedral Cutplane Logic** ✅

- [x] Extended updateCutplane() to support tetrahedral basis
- [x] Calculate cutplane normal from Quadray basis vectors
- [x] WXYZ cutplanes tested with polyhedra - reveals triangular sections vs. rectangular in XYZ

**Key Discovery**: XYZ Cartesian cutplanes consistently reveal rectangular relationships across polyhedra, while WXYZ Tetrahedral cutplanes reveal triangular relationships for the same polyhedra groups.

**Implementation Complete**: 2026-01-12
**Files Modified**:

- `art.css:528-547` - Added .variant-small button style
- `index.html:1374-1389` - Added Cartesian/Tetrahedral axis selector UI
- `rt-init.js:860-877,2741-2774` - Persistent active state tracking, axis button listeners
- `rt-papercut.js:15,23-24,336-359,912-923` - Tetrahedral basis support, setCutplaneAxis()
- `rt-rendering.js:16,2168-2194` - Automatic view-to-axis mapping

---

#### 16.2.8 Dual Snap Interval System (2026-01-15) ✅ COMPLETE

**Branch**: `QUADRAY-SNAP`
**Implementation Date**: 2026-01-15
**Status**: Production-ready

**Goal**: Add independent interval snap functionality for both XYZ (Cartesian) and WXYZ (Quadray) grid systems, allowing cutplanes to lock precisely to grid intersections along their respective coordinate axes.

##### Overview

The dual snap interval system extends the cutplane functionality by providing grid-aligned snapping in both coordinate systems:

- **XYZ Interval Snap**: Snaps cutplane to Cartesian grid intervals (step = 1.0 unit)
- **WXYZ Interval Snap**: Snaps cutplane to Quadray IVM grid intervals (step = √6/4 ≈ 0.612372 units)

Each snap mode operates independently, allowing users to enable/disable snapping per coordinate system based on their visualization needs.

##### Implementation Details

**UI Changes (index.html:1627-1638)**:

```html
<!-- XYZ Interval Snap -->
<div class="control-item">
  <label class="checkbox-label">
    <input type="checkbox" id="intervalSnapXYZ" checked />
    XYZ Interval Snap
  </label>
</div>

<!-- WXYZ Interval Snap -->
<div class="control-item">
  <label class="checkbox-label">
    <input type="checkbox" id="intervalSnapWXYZ" />
    WXYZ Interval Snap
  </label>
</div>
```

**State Management (rt-papercut.js:27-28)**:

```javascript
intervalSnapXYZEnabled: true,   // XYZ: Snap to Cartesian grid intervals (step=1.0)
intervalSnapWXYZEnabled: false, // WXYZ: Snap to Quadray grid intervals (step=√6/4≈0.612)
```

**Event Listeners (rt-papercut.js:157-175)**:

```javascript
// XYZ Interval Snap checkbox
const intervalSnapXYZCheckbox = document.getElementById("intervalSnapXYZ");
if (intervalSnapXYZCheckbox) {
  intervalSnapXYZCheckbox.addEventListener("change", e => {
    RTPapercut.state.intervalSnapXYZEnabled = e.target.checked;
    RTPapercut._updateSliderRange();
  });
}

// WXYZ Interval Snap checkbox
const intervalSnapWXYZCheckbox = document.getElementById("intervalSnapWXYZ");
if (intervalSnapWXYZCheckbox) {
  intervalSnapWXYZCheckbox.addEventListener("change", e => {
    RTPapercut.state.intervalSnapWXYZEnabled = e.target.checked;
    RTPapercut._updateSliderRange();
  });
}
```

**Dynamic Extent Calculation (rt-papercut.js:226-231)**:

Critical fix: Cutplane range must match actual grid tessellation extent, not arbitrary values.

```javascript
// Listen for Quadray tessellation slider changes
const quadraySlider = document.getElementById("quadrayTessSlider");
if (quadraySlider) {
  quadraySlider.addEventListener("change", () => {
    RTPapercut._updateSliderRange();
  });
}
```

##### RT-Pure Methodology: Grid Alignment & Algebraic Constants

**Core Principle**: The implementation maintains Rational Trigonometry principles by using algebraically exact constants and deferring √ expansion to the GPU boundary.

**Grid Interval Constant** (rt-math.js):

```javascript
RT.PureRadicals.QUADRAY_GRID_INTERVAL = Math.sqrt(6) / 4; // ≈ 0.6123724356957945
```

This represents the exact spacing between IVM (Isotropic Vector Matrix) grid intersections in the Quadray tetrahedral lattice.

**Important**: This implementation uses the new RT Pure interval functions introduced in the codebase for maintaining algebraic exactness throughout the rendering pipeline. These functions ensure that square roots are only computed once (at constant definition) and integer multiples are used for all subsequent calculations, preventing floating-point error accumulation.

**Slider Semantics: Distance vs Quadrance**:

The cutplane slider represents signed **distance** (not quadrance) from origin along the selected basis vector. This is appropriate because:

1. **THREE.Plane API Requirement**: The plane equation `normal·point + constant = 0` uses distance for the constant parameter
2. **RT-Pure Maintenance**: Step intervals ARE calculated from RT-pure algebraic constants (`RT.PureRadicals.QUADRAY_GRID_INTERVAL`)
3. **Integer Arithmetic**: The slider counts INTEGER multiples of the grid interval (pure arithmetic, no floating point error accumulation)
4. **Pedagogical Value**: Console logs show both distance AND quadrance for RT education

**Grid Alignment Verification**:

Grid intersections (from `createIVMGrid()` in rt-rendering.js):

```
Position = i × gridInterval × basis1 + j × gridInterval × basis2
```

Cutplane positions when snapped:

```
Position = n × gridInterval along selected basis vector (n ∈ ℤ)
```

**Result**: Perfect alignment - cutplane intersects grid at exact lattice points.

**Critical Range Calculation** (rt-papercut.js:325-390):

The slider range must dynamically match the actual 3D extent of the grid geometry:

```javascript
_getCutplaneRange: function () {
  const basis = RTPapercut.state.cutplaneBasis;
  const xyzSnapEnabled = RTPapercut.state.intervalSnapXYZEnabled;
  const wxySnapEnabled = RTPapercut.state.intervalSnapWXYZEnabled;

  let step;

  if (basis === "tetrahedral") {
    if (wxySnapEnabled) {
      // RT-PURE: Use algebraically exact constant (√6/4)
      step = RT.PureRadicals.QUADRAY_GRID_INTERVAL;
    } else {
      step = 0.1; // Fine-grained control when snap disabled
    }

    // WXYZ Tetrahedral: Calculate extent from grid tessellations
    // Grid extends to: tessellations × gridInterval
    // Example: tessellations=12 → extent = 12 × 0.612372 ≈ 7.348469
    const tessellations = parseInt(
      document.getElementById("quadrayTessSlider")?.value || "12"
    );
    const extent = tessellations * RT.PureRadicals.QUADRAY_GRID_INTERVAL;

    return { min: -extent, max: extent, step: step };
  } else {
    // XYZ Cartesian: Calculate extent from Cartesian grid
    const divisions = parseInt(
      document.getElementById("cartesianTessSlider")?.value || "10"
    );
    const extent = divisions / 2;

    step = xyzSnapEnabled ? 1.0 : 0.1;

    return { min: -extent, max: extent, step: step };
  }
}
```

**RT-Pure Diagnostic Logging** (rt-papercut.js:520-546):

Console output provides pedagogical insight into RT principles:

```javascript
// Calculate both distance and quadrance
const quadrance = value * value; // Q = d² (deferred √ principle)
const basis = RTPapercut.state.cutplaneBasis;
const axis = RTPapercut.state.cutplaneAxis.toUpperCase();

// Calculate interval number (how many grid spacings from origin)
let intervalNum = 0;
if (basis === "tetrahedral" && RTPapercut.state.intervalSnapWXYZEnabled) {
  intervalNum = Math.round(value / RT.PureRadicals.QUADRAY_GRID_INTERVAL);
} else if (basis === "cartesian" && RTPapercut.state.intervalSnapXYZEnabled) {
  intervalNum = Math.round(value / 1.0);
}

console.log(
  `✂️ Cutplane: ${basis === "tetrahedral" ? "WXYZ" : "XYZ"}-${axis} | ` +
    `Distance d = ${value.toFixed(6)}, Quadrance Q = ${quadrance.toFixed(6)} | ` +
    `Interval: ${intervalNum} × gridStep`
);
```

Example console output:

```
✂️ Cutplane: WXYZ-W | Distance d = 3.674234, Quadrance Q = 13.500000 | Interval: 6 × gridStep
```

##### Geometric Insight: Tetrahedral Lattice Sectioning

**Observation**: A flat plane perpendicular to one WXYZ axis does NOT intersect ALL Quadray grid points simultaneously - only those along the selected axis plus a triangular cross-section of the IVM lattice.

**Why This is Correct**:

1. **Tetrahedral Lattice Structure**: The Quadray grid forms a tetrahedral lattice, not a rectilinear one
2. **Architectural Section Cuts**: Flat planes are correct for architectural sectioning and demonstrate how tetrahedral coordinates project onto section planes
3. **Natural Grain of IVM**: To follow the "natural grain" of the IVM lattice would require THREE folded planes at the tetrahedral dihedral angle (not desirable for section cuts)

**Future Enhancement: Complete IVM Grid Extension**

To extend the grid system to show ALL parallel lines in the Quadray system simultaneously:

- **Method**: Attach cutplanes to the face-normals of a **Rhombic Dodecahedron**
- **Reason**: The Rhombic Dodecahedron has exactly one plane for each set of parallel lines in the Quadray grid system
- **Implementation**: Each of the 12 rhombic faces defines a family of parallel planes in the IVM lattice

This discovery reveals the deep connection between the Rhombic Dodecahedron and the IVM grid structure, showing how the 12 face-normals define the complete set of grid plane families.

##### Camera Views Integration

The snap interval system integrates seamlessly with both XYZ and WXYZ camera view presets:

**XYZ Camera Views** (Cartesian basis):

- Top / Bottom - Look along ±Z axis
- Front / Back - Look along ±Y axis
- Left / Right - Look along ±X axis
- When active: XYZ Interval Snap locks cutplane to integer grid positions (step = 1.0)

**WXYZ Camera Views** (Tetrahedral basis):

- QW View - Look along QW basis vector (0.577, 0.577, 0.577)
- QX View - Look along QX basis vector (0.577, -0.577, -0.577)
- QY View - Look along QY basis vector (-0.577, 0.577, -0.577)
- QZ View - Look along QZ basis vector (-0.577, -0.577, 0.577)
- When active: WXYZ Interval Snap locks cutplane to IVM grid positions (step = √6/4 ≈ 0.612372)

The cutplane automatically switches coordinate basis when changing between XYZ and WXYZ views, maintaining snap alignment with the visible grid system.

##### Files Modified

- `index.html:1627-1638` - Dual snap interval checkboxes (XYZ and WXYZ)
- `rt-papercut.js:27-28` - State properties for both snap modes
- `rt-papercut.js:157-175` - Event listeners for snap checkboxes
- `rt-papercut.js:226-231` - Dynamic range listener for Quadray tessellation changes
- `rt-papercut.js:325-390` - RT-pure methodology comments in `_getCutplaneRange()`
- `rt-papercut.js:520-546` - Quadrance diagnostic logging in `updateCutplane()`

##### Verification & Testing

**Test Case 1**: XYZ Interval Snap

- Enable XYZ Interval Snap
- Select Top View (Z axis)
- Drag cutplane slider: should lock at integer positions (0, ±1, ±2, ±3...)
- Grid intersections align perfectly with snap positions ✅

**Test Case 2**: WXYZ Interval Snap

- Enable WXYZ Interval Snap
- Select QW View (tetrahedral QW axis)
- Drag cutplane slider: should lock at IVM grid intervals (0, ±0.612, ±1.225, ±1.837...)
- Grid intersections align perfectly with snap positions ✅

**Test Case 3**: Dynamic Range Scaling

- Set Quadray tessellation slider to 12
- Note cutplane range: ±7.35 (12 × 0.612)
- Increase tessellation to 20
- Cutplane range expands to ±12.25 (20 × 0.612) ✅

**Test Case 4**: Independent Operation

- Enable both XYZ and WXYZ snap modes
- Switch between Top View (XYZ) and QW View (QWXYZ)
- Each maintains its own snap behavior ✅

##### Implementation Status

- [x] Rename "Interval Snap" to "XYZ Interval Snap" in UI and comments
- [x] Add "WXYZ Interval Snap" checkbox below XYZ version
- [x] Wire up event listeners for both snap modes
- [x] Calculate WXYZ snap interval from `RT.PureRadicals.QUADRAY_GRID_INTERVAL`
- [x] Fix cutplane range to match actual grid tessellation extent (not hardcoded)
- [x] Add RT-pure methodology comments explaining algebraic approach
- [x] Add console logging showing both distance and quadrance
- [x] Verify grid alignment with snap intervals (perfect match achieved)
- [x] Document Rhombic Dodecahedron discovery for future IVM extension
- [x] Update RT-Papercut.md documentation

**Branch**: `QUADRAY-SNAP`
**Completion Date**: 2026-01-15
**Status**: ✅ Ready for merge to main

---

### 16.3 Expected Workflow: QWXYZ Views + Cutplane

**Example User Session**:

1. User clicks **"QW View"** button
   - Camera moves to position along W-axis basis vector (0.577, 0.577, 0.577) at distance=10
   - Cutplane axis auto-selects **Tetrahedral: W**
   - Cutplane slider range updates to match WXYZ Grid Intervals (default ±10)

2. User enables **"Enable Cut Plane"** checkbox
   - Cutplane activates perpendicular to W-axis basis vector
   - Geometry clips to show section through polyhedra

3. User adjusts **cutplane slider** from 0 to +5
   - Section plane moves 5 units along W-axis
   - Real-time feedback as geometry clips

4. User increases **WXYZ Grid Intervals** slider from 10 to 20
   - Cutplane slider range automatically expands to ±20
   - Allows deeper sectioning through larger grid extent

5. User switches to **"Top View"** button
   - Camera moves to orthographic top view (0, 0, 10)
   - Cutplane axis auto-switches to **Cartesian: Z**
   - Cutplane slider range updates to match XYZ Grid Intervals

**Key Insight**: The cutplane system "follows" the view system, automatically adapting to the coordinate basis (Cartesian vs Tetrahedral) and scaling to match the visible grid extent.

---

### 16.4 Benefits of Integrated WXYZ Cutplane System

1. **Unified Sectioning**: Single cutplane tool works across both coordinate systems
2. **Educational Value**: Reveals how polyhedra section differently along tetrahedral vs Cartesian axes
3. **Great Circle Visualization**: WXYZ cutplanes reveal "happy accident" polygonal great circle patterns
4. **Dynamic Range Scaling**: Cutplane range automatically matches grid visualization extent
5. **Intuitive Workflow**: Cutplane axis follows camera view, no manual axis selection needed (but available for advanced users)

---

### 16.5 Technical Notes

**Why separate 'qx', 'qy', 'qz' from Cartesian 'x', 'y', 'z'?**

- Distinguishes between Cartesian axis X (unit vector [1,0,0]) and Quadray axis X (basis vector [0.577,-0.577,-0.577])
- Prevents confusion in code and UI
- Allows both systems to coexist in same cutplane selector

**Performance Considerations**:

- Tetrahedral cutplane uses same THREE.Plane clipping as Cartesian (GPU-accelerated)
- No performance penalty for using Quadray basis vectors as plane normals
- Clipping updates only when slider moves (not every frame)

**Future Enhancements** (Phase 3):

- [ ] Dual cutplanes (top + bottom) for "sandwich" sectioning
- [ ] Cutplane interpolation (animate section sweep)
- [ ] Section edge highlighting (Line2 edges at cut boundary)
- [ ] Export section views with cutplane indicator overlays

---

**Document Status**: ✅ Phase 1 Complete, ✅ Phase 2 Complete
**Branch**: `WXYZ-Basis-Views`
**Completion Date**: 2026-01-12
**Next Action**: Test and refine, then merge to main

---

## 17. Future Development: RT-Pure Circle Generation

### 17.1 Current Implementation (Classical Trig)

**Identified in Code Audit**: 2026-01-29

The section node circles in `rt-papercut.js:988-990` currently use classical trigonometry:

```javascript
const angle = (i / segments) * Math.PI * 2;
const x = Math.cos(angle) * circleRadius;
const y = Math.sin(angle) * circleRadius;
```

### 17.2 Proposed RT-Pure Alternative: Weierstrass Substitution

The Weierstrass half-angle substitution provides a **rational parametrization** of the circle:

```
t = tan(θ/2)

x = (1 - t²) / (1 + t²)
y = (2t) / (1 + t²)
```

**Key Properties**:

- For any rational value of `t`, both `x` and `y` are rational
- Sweeping `t` from -∞ to +∞ traces the entire unit circle (except (-1, 0))
- The "missing point" at `t = ±∞` can be handled separately

**RT-Pure Implementation** (proposed):

```javascript
/**
 * RT-Pure circle point generation using Weierstrass substitution
 * @param {number} segments - Number of points on circle
 * @param {number} radius - Circle radius
 * @returns {Array<{x: number, y: number}>} Array of circle points
 */
function generateRTPureCircle(segments, radius) {
  const points = [];

  // Use evenly-spaced t values for visual uniformity
  // Note: Points are NOT equidistant in arc length, but form a valid circle
  for (let i = 0; i < segments; i++) {
    // Map i to t range (e.g., -10 to +10 for good coverage)
    const t = -10 + (20 * i) / (segments - 1);

    const denom = 1 + t * t; // Pure algebra
    const x = (radius * (1 - t * t)) / denom;
    const y = (radius * (2 * t)) / denom;

    points.push({ x, y });
  }

  // Add the "missing point" at (-radius, 0) explicitly
  points.push({ x: -radius, y: 0 });

  return points;
}
```

**Trade-offs**:

- ✅ RT-pure (no transcendental functions)
- ✅ Exact rational coordinates for rational `t`
- ⚠️ Non-uniform arc length spacing (visual clustering near t=0)
- ⚠️ Requires handling the point at infinity

**Recommendation**: Implement as optional "RT-Pure Circle Mode" toggle for educational purposes, keeping classical method as default for uniform visual appearance.

### 17.3 Reference Implementation

See `demos/rt-weierstrass-demo.js` for existing Weierstrass circle visualization.

---
