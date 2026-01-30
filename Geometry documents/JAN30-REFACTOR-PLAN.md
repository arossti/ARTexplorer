# JAN30-REFACTOR-PLAN: Non-Disruptive rt-init.js Modularization

---

## 📋 HANDOFF STATUS (End of Jan 30, 2026)

### What Was Completed Today

| Task | Status | Commits |
|------|--------|---------|
| Declarative UI binding engine | ✅ DONE | 9d34887 |
| 88 binding definitions | ✅ DONE | b30bb75, d236dfe |
| Radio-group binding type | ✅ DONE | d236dfe |
| View controls + basis visibility bindings | ✅ DONE | d236dfe |
| Legacy handlers wrapped in conditional | ✅ DONE | 62bf77b |
| Documentation updates | ✅ DONE | c57b9dc |
| **RTSelection module created** | ⏪ REVERTED | Lesson learned |
| **RTSelection shadow integration** | ⏪ REVERTED | Lesson learned |

### Current State

- **`USE_DECLARATIVE_UI = true`** in [rt-init.js:31](modules/rt-init.js#L31)
- **RTSelection: REVERTED** - Module deleted, shadow integration removed (see lessons learned)
- **88 declarative bindings** active, 0 skipped
- **~957 lines of legacy handlers** wrapped in `if (!USE_DECLARATIVE_UI)` (lines 256-1213)
- **App tested and working** with declarative-only mode

### What Remains

1. **Delete Legacy Block** (WHEN READY) - Remove lines 256-1213 (~957 lines)
   - This will bring rt-init.js from 4,774 → ~3,800 lines
2. ~~**Phase 2b: RTSelection Switchover**~~ - **REVERTED** (see lessons learned below)
3. **Phase 3: Gumball Extraction** (FUTURE) - ~1,700 lines, high risk

### 📚 Lessons Learned: Why RTSelection Was Reverted

**The Problem:** Selection and gumball are tightly coupled by design, not by accident.

When `USE_RTSELECTION = true` was enabled, opt-click-drag copy broke because:
- Gumball code reads local `currentSelection` variable (~40 references throughout drag/copy/transform code)
- RTSelection maintained its own `selection.state.currentSelection`
- This created two sources of truth that couldn't easily sync

**The Insight:** The "sync issue" wasn't a bug to fix - it was **architectural feedback** that selection belongs with gumball.

**Contrast with Declarative UI (which worked):**
- UI bindings are genuinely decoupled from the rest of the system
- They just call `updateGeometry()` and don't need shared state
- The extraction provided real value by centralizing 88 scattered handlers

**Selection is different:**
- Selection IS gumball's concern - they're inherently coupled
- `currentSelection` is read by move, scale, rotate, copy, connect, disconnect...
- Future node selection will need gumball changes anyway
- Adding callback sync would create dual source of truth without benefit

**Decision:** Revert the extraction. Selection stays in rt-init.js as part of the gumball system.

**Key Takeaway:** Extract genuinely decoupled systems (like UI bindings). Don't artificially separate tightly coupled systems just to reduce file size.

### Files Modified Today

| File | Lines | Change |
|------|-------|--------|
| `modules/rt-ui-bindings.js` | 402 | Added `_bindRadioGroup()` method |
| `modules/rt-ui-binding-defs.js` | 562 | Added 9 bindings (geodesic radios, views, basis) |
| `modules/rt-init.js` | 4,774 | Wrapped legacy handlers; RTSelection shadow integration added then reverted |
| ~~`modules/rt-selection.js`~~ | ~~566~~ | **DELETED** - Reverted extraction attempt |

### Quick Resume Commands

```bash
# Check current state
git log --oneline -5

# Verify app works
# Open in browser, check console for "88 bindings"

# When ready to delete legacy block (AFTER extended verification):
# 1. Delete lines 256-1213 in rt-init.js
# 2. Run: npm run lint
# 3. Test in browser
# 4. Commit with message "Refactor: Delete legacy handlers (~957 lines)"
```

---

## Core Principle: Shadow + Switchover

> **Never delete working code until its replacement is proven.**

Each phase follows this pattern:
1. **Build** the new module alongside existing code
2. **Test** the new module independently
3. **Shadow** - run both old and new in parallel (new code disabled by default)
4. **Switchover** - enable new, disable old via feature flag
5. **Remove** old code only after new is stable

---

## Phase 1: Declarative UI Binding System (Biggest Win)

**Goal:** Replace 1,150 lines of individual event listeners with ~200 lines of data + generic handler

**Impact:** -950 lines from rt-init.js (once complete)

### Step 1.1: Create the Binding Engine (New File)

```javascript
// modules/rt-ui-bindings.js (NEW)

/**
 * Declarative UI binding system for ARTexplorer
 * Replaces hundreds of individual addEventListener() calls with data-driven binding
 */

/**
 * Binding types supported:
 * - checkbox: Toggle visibility, triggers updateGeometry
 * - checkbox-controls: Toggle visibility + show/hide sub-controls
 * - slider: Update value display, triggers updateGeometry
 * - slider-linked: Bidirectional conversion (e.g., Quadrance ↔ Length)
 * - button-group: Exclusive selection within group
 */

export class RTUIBindings {
  constructor() {
    this.bindings = [];
    this.updateGeometry = null; // Set during init
    this.renderingAPI = null;   // Set during init
  }

  /**
   * Initialize with dependencies
   * @param {Object} deps - { updateGeometry, renderingAPI, RT, Quadray }
   */
  init(deps) {
    this.updateGeometry = deps.updateGeometry;
    this.renderingAPI = deps.renderingAPI;
    this.RT = deps.RT;
    this.Quadray = deps.Quadray;
  }

  /**
   * Register a binding definition
   * @param {Object} binding - Binding configuration
   */
  register(binding) {
    this.bindings.push(binding);
  }

  /**
   * Register multiple bindings at once
   * @param {Array} bindings - Array of binding configurations
   */
  registerAll(bindings) {
    bindings.forEach(b => this.register(b));
  }

  /**
   * Apply all registered bindings to the DOM
   * Call this AFTER DOM is ready
   */
  applyAll() {
    this.bindings.forEach(binding => this._applyBinding(binding));
    console.log(`✅ RTUIBindings: Applied ${this.bindings.length} bindings`);
  }

  /**
   * Internal: Apply a single binding
   */
  _applyBinding(binding) {
    const element = document.getElementById(binding.id);
    if (!element) {
      console.warn(`⚠️ RTUIBindings: Element not found: ${binding.id}`);
      return;
    }

    switch (binding.type) {
      case 'checkbox':
        this._bindCheckbox(element, binding);
        break;
      case 'checkbox-controls':
        this._bindCheckboxWithControls(element, binding);
        break;
      case 'slider':
        this._bindSlider(element, binding);
        break;
      case 'slider-linked':
        this._bindLinkedSliders(binding);
        break;
      case 'button-group':
        this._bindButtonGroup(binding);
        break;
      default:
        console.warn(`⚠️ RTUIBindings: Unknown binding type: ${binding.type}`);
    }
  }

  _bindCheckbox(element, binding) {
    element.addEventListener('change', () => {
      if (binding.onChange) {
        binding.onChange(element.checked, this.renderingAPI);
      }
      if (binding.updateGeometry !== false) {
        this.updateGeometry();
      }
    });
  }

  _bindCheckboxWithControls(element, binding) {
    const controlsElement = document.getElementById(binding.controlsId);

    element.addEventListener('change', () => {
      // Show/hide controls
      if (controlsElement) {
        controlsElement.style.display = element.checked ? 'block' : 'none';
      }
      // Custom handler
      if (binding.onChange) {
        binding.onChange(element.checked, this.renderingAPI);
      }
      // Update geometry
      if (binding.updateGeometry !== false) {
        this.updateGeometry();
      }
    });
  }

  _bindSlider(element, binding) {
    const valueDisplay = binding.valueId ? document.getElementById(binding.valueId) : null;

    element.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);

      // Update value display
      if (valueDisplay) {
        const displayValue = binding.formatValue ? binding.formatValue(value) : value;
        valueDisplay.textContent = displayValue;
      }

      // Custom handler
      if (binding.onInput) {
        binding.onInput(value, this.renderingAPI, this.RT);
      }

      // Update geometry
      if (binding.updateGeometry !== false) {
        this.updateGeometry();
      }
    });
  }

  _bindLinkedSliders(binding) {
    const primaryEl = document.getElementById(binding.primaryId);
    const secondaryEl = document.getElementById(binding.secondaryId);

    if (!primaryEl || !secondaryEl) return;

    // Primary → Secondary conversion
    primaryEl.addEventListener('input', () => {
      const primaryValue = parseFloat(primaryEl.value);
      const secondaryValue = binding.primaryToSecondary(primaryValue);
      secondaryEl.value = secondaryValue.toFixed(4);
      this.updateGeometry();
    });

    // Secondary → Primary conversion
    secondaryEl.addEventListener('input', () => {
      const secondaryValue = parseFloat(secondaryEl.value);
      const primaryValue = binding.secondaryToPrimary(secondaryValue);
      primaryEl.value = primaryValue.toFixed(4);
      this.updateGeometry();
    });
  }

  _bindButtonGroup(binding) {
    const buttons = binding.buttons.map(b => ({
      element: document.getElementById(b.id),
      ...b
    })).filter(b => b.element);

    buttons.forEach(btn => {
      btn.element.addEventListener('click', () => {
        // Remove active from all
        buttons.forEach(b => b.element.classList.remove('active'));
        // Add active to clicked
        btn.element.classList.add('active');
        // Call handler
        if (btn.onClick) {
          btn.onClick(this.renderingAPI);
        }
      });
    });
  }
}

// Singleton instance
export const uiBindings = new RTUIBindings();
```

**This file is 100% NEW - no disruption to existing code.**

### Step 1.2: Create Binding Definitions (New File)

```javascript
// modules/rt-ui-binding-defs.js (NEW)

/**
 * Declarative binding definitions for ARTexplorer UI
 * Each binding replaces a manual addEventListener() in rt-init.js
 */

export const polyhedraBindings = [
  // Simple checkboxes - just trigger updateGeometry
  { id: 'showPoint', type: 'checkbox' },
  { id: 'showCube', type: 'checkbox' },
  { id: 'showDodecahedron', type: 'checkbox' },
  { id: 'showCuboctahedron', type: 'checkbox' },
  { id: 'showRhombicDodecahedron', type: 'checkbox' },

  // Checkboxes with sub-controls
  {
    id: 'showLine',
    type: 'checkbox-controls',
    controlsId: 'line-controls'
  },
  {
    id: 'showPolygon',
    type: 'checkbox-controls',
    controlsId: 'polygon-controls'
  },
  {
    id: 'showPrism',
    type: 'checkbox-controls',
    controlsId: 'prism-controls'
  },
  {
    id: 'showCone',
    type: 'checkbox-controls',
    controlsId: 'cone-controls'
  },

  // Tetrahedron with geodesic controls (complex case)
  {
    id: 'showTetrahedron',
    type: 'checkbox-controls',
    controlsId: 'geodesic-tetra-all',
    // Keep controls visible if geodesic variant is also checked
    onChange: (checked, renderingAPI) => {
      const geodesicCheckbox = document.getElementById('showGeodesicTetrahedron');
      const controls = document.getElementById('geodesic-tetra-all');
      if (controls) {
        const shouldShow = checked || (geodesicCheckbox && geodesicCheckbox.checked);
        controls.style.display = shouldShow ? 'block' : 'none';
      }
    }
  },
  // ... more polyhedra
];

export const sliderBindings = [
  // Simple sliders with value display
  {
    id: 'opacitySlider',
    type: 'slider',
    valueId: 'opacityValue'
  },
  {
    id: 'nodeOpacitySlider',
    type: 'slider',
    valueId: 'nodeOpacityValue',
    onInput: (value, renderingAPI) => {
      renderingAPI.setNodeOpacity(value);
    }
  },

  // Linked sliders (Quadrance ↔ Length)
  {
    type: 'slider-linked',
    primaryId: 'lineQuadrance',
    secondaryId: 'lineLength',
    primaryToSecondary: (Q) => Math.sqrt(Q),  // Q → L = √Q
    secondaryToPrimary: (L) => L * L          // L → Q = L²
  },
  {
    type: 'slider-linked',
    primaryId: 'polygonQuadrance',
    secondaryId: 'polygonRadius',
    primaryToSecondary: (Q) => Math.sqrt(Q),
    secondaryToPrimary: (R) => R * R
  },
  // ... more linked sliders
];

export const matrixBindings = [
  {
    id: 'showCubeMatrix',
    type: 'checkbox-controls',
    controlsId: 'cube-matrix-controls'
  },
  {
    id: 'cubeMatrixSizeSlider',
    type: 'slider',
    valueId: 'cubeMatrixSizeValue',
    formatValue: (v) => `${v}×${v}`
  },
  { id: 'cubeMatrixRotate45', type: 'checkbox' },
  // ... more matrix controls
];

// Combine all bindings
export const allBindings = [
  ...polyhedraBindings,
  ...sliderBindings,
  ...matrixBindings,
];
```

**This file is 100% NEW - no disruption to existing code.**

### Step 1.3: Shadow Integration in rt-init.js

Add to rt-init.js (ALONGSIDE existing code, not replacing):

```javascript
// At top of rt-init.js, add import
import { uiBindings } from './rt-ui-bindings.js';
import { allBindings } from './rt-ui-binding-defs.js';

// FEATURE FLAG - controls which system is active
const USE_DECLARATIVE_UI = false; // Set to true to test new system

// In startARTexplorer(), after renderingAPI is set up:
if (USE_DECLARATIVE_UI) {
  // Initialize new declarative binding system
  uiBindings.init({
    updateGeometry: renderingAPI.updateGeometry,
    renderingAPI: renderingAPI,
    RT: RT,
    Quadray: Quadray
  });
  uiBindings.registerAll(allBindings);
  uiBindings.applyAll();
  console.log('🆕 Using DECLARATIVE UI bindings');
} else {
  // EXISTING CODE - all the manual addEventListener() calls
  // ... (unchanged)
  console.log('📜 Using LEGACY UI bindings');
}
```

### Step 1.4: Testing Protocol

1. **Flag OFF (default):** App works exactly as before
2. **Flag ON:** New system handles UI bindings
3. **Test each binding type:**
   - Toggle polyhedra checkboxes
   - Adjust sliders
   - Verify updateGeometry is called
   - Verify controls show/hide correctly

### Step 1.5: Progressive Migration

Once basic system works:
1. Add more binding definitions (10-20 at a time)
2. Test each batch
3. When ALL bindings are migrated and tested:
   - Set `USE_DECLARATIVE_UI = true` as default
   - Comment out (don't delete!) legacy code
   - Test for a week
   - Delete legacy code in final cleanup

---

## Phase 2: RTGumball Module (The Big One)

**Goal:** Extract gumball state + visuals + events as encapsulated class

**Impact:** -1,700 lines from rt-init.js

### Step 2.1: Create RTGumball Class (New File)

```javascript
// modules/rt-gumball.js (NEW)

/**
 * RTGumball - Encapsulated gumball transformation system
 *
 * Manages:
 * - Tool state (move/scale/rotate)
 * - Snap modes (free/xyz/wxyz)
 * - Object snap targets (vertex/edge/face)
 * - Editing basis visualization
 * - Drag handling
 */

export class RTGumball {
  constructor() {
    // Internal state (was global variables in rt-init.js)
    this.state = {
      tool: null,           // null | 'move' | 'scale' | 'rotate'
      snapMode: 'free',     // 'free' | 'xyz' | 'wxyz'
      isDragging: false,
      isFreeMoving: false,
      isDragCopying: false,
      selectedHandle: null,
      editingBasis: null,
      hoveredHandle: null,

      // Object snap
      objectSnapVertex: false,
      objectSnapEdge: false,
      objectSnapFace: false,
      currentSnapTarget: null,
      snapPreviewMarker: null,

      // Drag state
      dragPlane: null,
      dragStartPoint: null,
      freeMoveDragOffset: null,
      freeMoveInitialPositions: [],
      freeMoveStartPoint: null,
      selectedPolyhedra: [],

      // Drag-copy
      dragCopyOriginalPosition: null,
      dragCopyOriginalQuaternion: null,
      dragCopyOriginalScale: null,
    };

    // Dependencies (set during init)
    this.THREE = null;
    this.Quadray = null;
    this.RT = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.renderingAPI = null;

    // Callbacks (set during init)
    this.getSelectedPolyhedra = null;
    this.onTransformComplete = null;
  }

  /**
   * Initialize with dependencies
   */
  init(deps) {
    this.THREE = deps.THREE;
    this.Quadray = deps.Quadray;
    this.RT = deps.RT;
    this.scene = deps.scene;
    this.camera = deps.camera;
    this.renderer = deps.renderer;
    this.controls = deps.controls;
    this.renderingAPI = deps.renderingAPI;
    this.getSelectedPolyhedra = deps.getSelectedPolyhedra;
    this.onTransformComplete = deps.onTransformComplete;

    // Initialize THREE objects
    this.state.dragStartPoint = new this.THREE.Vector3();
    this.state.freeMoveDragOffset = new this.THREE.Vector3();
    this.state.freeMoveStartPoint = new this.THREE.Vector3();
    this.state.dragCopyOriginalPosition = new this.THREE.Vector3();
    this.state.dragCopyOriginalQuaternion = new this.THREE.Quaternion();
    this.state.dragCopyOriginalScale = new this.THREE.Vector3();

    // Initialize raycaster
    this.raycaster = new this.THREE.Raycaster();
    this.mouse = new this.THREE.Vector2();

    console.log('✅ RTGumball initialized');
  }

  /**
   * Attach event listeners to renderer
   * Call this AFTER scene is ready
   */
  attachEventListeners() {
    // mousedown
    this.renderer.domElement.addEventListener('mousedown',
      (e) => this._onMouseDown(e), { capture: true });

    // mousemove
    this.renderer.domElement.addEventListener('mousemove',
      (e) => this._onMouseMove(e), { capture: true });

    // mouseup
    this.renderer.domElement.addEventListener('mouseup',
      (e) => this._onMouseUp(e), { capture: true });

    console.log('✅ RTGumball event listeners attached');
  }

  // ========== PUBLIC API ==========

  /**
   * Set active tool
   * @param {string|null} tool - 'move' | 'scale' | 'rotate' | null
   */
  setTool(tool) {
    this.state.tool = tool;

    if (tool) {
      this.controls.enabled = false;
      this._createEditingBasis();
    } else {
      this.controls.enabled = true;
      this._destroyEditingBasis();
    }
  }

  /**
   * Get current tool
   */
  getTool() {
    return this.state.tool;
  }

  /**
   * Set snap mode
   */
  setSnapMode(mode) {
    this.state.snapMode = mode;
  }

  /**
   * Set object snap flags
   */
  setObjectSnap(type, enabled) {
    if (type === 'vertex') this.state.objectSnapVertex = enabled;
    if (type === 'edge') this.state.objectSnapEdge = enabled;
    if (type === 'face') this.state.objectSnapFace = enabled;
  }

  /**
   * Update editing basis to follow selection
   */
  updatePosition(position) {
    if (this.state.editingBasis) {
      this.state.editingBasis.position.copy(position);
    }
  }

  /**
   * Clean up on selection change
   */
  onSelectionChanged(selection) {
    if (selection && this.state.tool) {
      this._createEditingBasis();
    } else if (!selection) {
      this._destroyEditingBasis();
    }
  }

  // ========== INTERNAL METHODS ==========
  // (Move all the existing functions here, prefixed with _)

  _createEditingBasis() {
    // ... existing createEditingBasis code
  }

  _destroyEditingBasis() {
    // ... existing destroyEditingBasis code
  }

  _onMouseDown(event) {
    // ... existing mousedown handler code
  }

  _onMouseMove(event) {
    // ... existing mousemove handler code
  }

  _onMouseUp(event) {
    // ... existing mouseup handler code
  }

  // ... all other internal methods
}

// Singleton instance
export const gumball = new RTGumball();
```

### Step 2.2: Shadow Integration in rt-init.js

```javascript
// At top of rt-init.js
import { gumball } from './rt-gumball.js';

// FEATURE FLAG
const USE_RTGUMBALL = false; // Set to true to test new system

// In startARTexplorer(), after scene init:
if (USE_RTGUMBALL) {
  // Initialize new gumball system
  gumball.init({
    THREE, Quadray, RT,
    scene, camera, renderer, controls,
    renderingAPI,
    getSelectedPolyhedra: () => getSelectedPolyhedra(),
    onTransformComplete: () => { /* update UI */ }
  });
  gumball.attachEventListeners();

  // Wire up tool buttons to new system
  document.querySelectorAll('.toggle-btn.variant-tool').forEach(btn => {
    btn.addEventListener('click', function() {
      const tool = this.dataset.gumballTool;
      // Toggle
      if (gumball.getTool() === tool) {
        gumball.setTool(null);
        this.classList.remove('active');
      } else {
        document.querySelectorAll('.toggle-btn.variant-tool')
          .forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        gumball.setTool(tool);
      }
    });
  });

  console.log('🆕 Using RTGumball module');
} else {
  // EXISTING CODE - all the gumball state and functions
  // ... (unchanged)
  console.log('📜 Using LEGACY gumball');
}
```

### Step 2.3: Progressive Migration

1. Start with just the STATE encapsulation (tool, snapMode)
2. Add editing basis visualization
3. Add drag handling (the complex part)
4. Test each addition thoroughly
5. Switchover when complete

---

## Phase 2b: Selection System Extraction - ⏪ REVERTED

> **STATUS: REVERTED** - This extraction was attempted and reverted. See lessons learned below.

**Original Goal:** Extract selection logic to prepare for node-based selection and deformation features

**What Happened:** Selection is tightly coupled with gumball (~40 references to `currentSelection` in drag/copy/transform code). Extracting selection without gumball created an artificial separation that added complexity without real value.

**Lesson Learned:** Extract genuinely decoupled systems (like UI bindings). Don't artificially separate tightly coupled systems just to reduce file size. The "sync issue" wasn't a bug to fix - it was architectural feedback that selection belongs with gumball.

### Current Selection Code in rt-init.js

| Function | Lines | Purpose |
|----------|-------|---------|
| `selectPolyhedron()` | 2707-2778 | Select/multi-select with highlight |
| `updateSelectionCountUI()` | 2784-2796 | Update UI counter |
| `applyHighlight()` | 2802-2833 | Visual highlight on selected |
| `clearHighlight()` | 2839-2869 | Remove highlight |
| `deselectAll()` | 2875-2886 | Clear all selections |
| `onCanvasClick()` | 2891-2996 | Click-to-select handler |
| `getSelectedPolyhedra()` | 2999-3009 | Get selection array |
| **Total** | ~300 lines | |

### Step 2b.1: Stub File Created ✅

```javascript
// modules/rt-selection.js (CREATED)

export class RTSelection {
  constructor() {
    this.state = {
      currentSelection: null,
      selectedNodes: [],        // Future: node-level selection
      nodeSelectionMode: false, // Future: toggle object vs node selection
    };
  }

  init(deps) { /* THREE, scene, camera, renderer, RTStateManager */ }

  // Object selection (current)
  selectPolyhedron(polyhedron, addToSelection = false) { /* STUB */ }
  deselectAll() { /* STUB */ }
  applyHighlight(polyhedron) { /* STUB */ }
  clearHighlight(polyhedron) { /* STUB */ }
  onCanvasClick(event, formGroups) { /* STUB */ }
  getSelectedPolyhedra() { /* STUB */ }

  // Node selection (future)
  enterNodeSelectionMode() { /* STUB */ }
  exitNodeSelectionMode() { /* STUB */ }
  selectNode(instanceId, nodeType, nodeIndex, addToSelection) { /* STUB */ }
  getSelectedNodes() { /* STUB */ }
  moveSelectedNodes(offset) { /* STUB */ }
  snapSelectedNodesToPosition(targetPosition) { /* STUB */ }
}

export const selection = new RTSelection();
```

### Step 2b.2: Migration Protocol

Follow the same Shadow + Switchover pattern used for declarative UI:

#### Phase A: Shadow Integration (NO DISRUPTION)

1. Add import to rt-init.js (don't use yet):
   ```javascript
   import { selection } from './rt-selection.js';

   const USE_RTSELECTION = false; // Feature flag
   ```

2. Initialize in startARTexplorer():
   ```javascript
   if (USE_RTSELECTION) {
     selection.init({ THREE, scene, camera, renderer, RTStateManager,
       onSelectionChanged: updateSelectionCountUI });
   }
   ```

#### Phase B: Move Implementation

3. Copy function bodies from rt-init.js to rt-selection.js methods
4. Wire up click handler:
   ```javascript
   if (USE_RTSELECTION) {
     renderer.domElement.addEventListener('click', (e) => {
       selection.onCanvasClick(e, formGroups);
     });
   }
   ```

5. Test with `USE_RTSELECTION = true`

#### Phase C: Switchover

6. Set `USE_RTSELECTION = true` as default
7. Wrap legacy selection code in `if (!USE_RTSELECTION)`
8. After verification, delete legacy code

### Step 2b.3: Dependencies to Pass

RTSelection needs access to:

| Dependency | Source | Notes |
|------------|--------|-------|
| `THREE` | Global | For raycasting, Vector3, etc. |
| `scene` | rt-init.js | For traversing objects |
| `camera` | renderingAPI | For raycasting (may switch ortho/persp) |
| `renderer` | renderingAPI | For cursor changes |
| `RTStateManager` | Import | For selection state, getInstance() |
| `formGroups[]` | rt-init.js | Array of form groups for hit testing |

**Option A:** Pass formGroups as parameter to `onCanvasClick()`
**Option B:** Pass formGroups during init(), update on visibility change
**Recommended:** Option A (simpler, no stale state)

### Step 2b.4: Verification Tests

After extraction, verify in browser console:

```javascript
// Test 1: Object selection
// Click on a visible polyhedron
console.log('Selected:', RTStateManager.getSelectionCount()); // Should be 1

// Test 2: Multi-select
// Shift+click on another polyhedron
console.log('Selected:', RTStateManager.getSelectionCount()); // Should be 2

// Test 3: Deselect
// Press ESC or click NOW button
console.log('Selected:', RTStateManager.getSelectionCount()); // Should be 0

// Test 4: Highlight visual
// Select a polyhedron - should show cyan glow
// Deselect - glow should disappear
```

### Step 2b.5: Current Status & Known Issues

**Shadow Integration Status: ✅ COMPLETE**

- Import added to rt-init.js
- Feature flag: `USE_RTSELECTION = false`
- `selection.init()` wired up after scene initialization
- Canvas click handler routes to RTSelection when flag is true
- Drag state coordination: `selection.setDragging()`, `selection.setJustFinishedDrag()` called at 4 locations

**Known Issue: currentSelection State Sync**

When `USE_RTSELECTION = true`, opt-click-drag copy functionality breaks.

**Root Cause:** The gumball/drag-copy code reads from local `currentSelection` variable in rt-init.js (line ~3342), but RTSelection updates its own `selection.state.currentSelection`. The two systems don't share the same selection state.

**Symptoms:**
- Single-click selection works ✅
- Multi-select (shift+click) works ✅
- Highlight visualization works ✅
- Opt-click-drag to create copies: **BROKEN** ❌

**Resolution Options for Future Switchover:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A | RTSelection also updates local `currentSelection` | Minimal change | Dual source of truth |
| B | All code reading `currentSelection` checks flag and uses `selection.state` | Clean separation | Many edit locations |
| C | Keep in shadow mode until full gumball extraction | No risk | Delays cleanup |
| D | Expose `selection.getCurrentSelection()` and replace all reads | Single API | Requires thorough audit |

**Recommended:** Option D when ready for full extraction. Audit all ~15 locations that read `currentSelection` and route through RTSelection API.

**Current Decision:** Flag remains OFF (`USE_RTSELECTION = false`). Shadow integration complete, ready for future switchover when sync issue is resolved.

### Step 2b.6: Future Node Selection Integration

Once object selection is extracted, adding node selection:

1. Add UI toggle: "Object Mode" | "Node Mode"
2. In Node Mode, `onCanvasClick()` calls `selectNode()` instead
3. Node selection highlights individual vertices (small spheres)
4. `getSelectedNodes()` returns array of `{ instanceId, nodeType, nodeIndex }`
5. Gumball move uses node centroid instead of object centroid
6. Deform commands operate on selected nodes

This architecture separates concerns:
- **RTSelection**: What is selected (objects or nodes)
- **RTGumball**: How transformations work
- **RTStateManager**: Persistence and undo/redo

---

## Phase 3: Connect/Disconnect to RTStateManager

**Goal:** Move connection logic to where it belongs

**Impact:** -50 lines from rt-init.js, better encapsulation

### Step 3.1: Add Methods to RTStateManager

```javascript
// In rt-state-manager.js, add:

/**
 * Connect two Point instances with a Line
 * (Moved from rt-init.js handleConnectAction)
 */
connectPointsFromSelection(scene) {
  const selected = this.getSelectedObjects();

  if (selected.length !== 2) {
    console.warn('⚠️ Connect requires exactly 2 selected Points');
    return null;
  }

  const idA = selected[0].userData.instanceId;
  const idB = selected[1].userData.instanceId;

  // ... existing validation logic

  return this.connectPoints(idA, idB, scene);
}

/**
 * Disconnect selected Line back to Points
 * (Moved from rt-init.js handleDisconnectAction)
 */
disconnectFromSelection(scene) {
  const selected = this.getSelectedObjects();

  if (selected.length !== 1) {
    console.warn('⚠️ Disconnect requires exactly 1 selected connectedLine');
    return false;
  }

  // ... existing validation logic

  return this.disconnectLine(lineId, scene);
}
```

### Step 3.2: Update rt-init.js

```javascript
// Replace handleConnectAction() with:
function handleConnectAction() {
  const result = RTStateManager.connectPointsFromSelection(scene);
  if (result) {
    document.getElementById('nowCount').textContent = RTStateManager.getDepositedCount();
    deselectAll();
    selectPolyhedron(result.threeObject);
  }
}

// Replace handleDisconnectAction() with:
function handleDisconnectAction() {
  if (RTStateManager.disconnectFromSelection(scene)) {
    document.getElementById('nowCount').textContent = RTStateManager.getDepositedCount();
    deselectAll();
  }
}
```

**This is LOW RISK and can be done immediately.**

---

## Implementation Timeline

| Week | Phase | Risk | Lines Saved | Status |
|------|-------|------|-------------|--------|
| 1 | 3: Connect/Disconnect | 🟢 LOW | 50 | ✅ DONE (Jan 30) |
| 1-2 | 1.1-1.2: Create binding engine | 🟢 LOW | 0 (new files) | ✅ DONE (Jan 30) |
| 2-3 | 1.3-1.4: Shadow integration | 🟡 MED | 0 (parallel) | ✅ DONE (Jan 30) |
| 3-4 | 1.5: Progressive migration | 🟡 MED | 950 | 🔄 IN PROGRESS |
| ~~4-5~~ | ~~2b: RTSelection~~ | ~~🟡 MED~~ | ~~300~~ | ⏪ REVERTED (lesson learned) |
| 6+ | 2: RTGumball | 🔴 HIGH | 1,700 | Future |

**Total potential savings: ~2,700 lines (from 4,730 to ~2,030)**

### Revised Strategy: Extract Around Gumball

Instead of extracting gumball (high risk), extract everything ELSE:
- ✅ Declarative UI bindings (-950 lines when legacy deleted)
- ⏪ ~~Selection system (-300 lines)~~ - REVERTED: Selection is coupled with gumball
- 🔮 Coordinate input handlers (~350 lines) - future
- 🔮 View controls (~60 lines) - future

**Result:** rt-init.js becomes focused gumball+selection orchestration (~2,000 lines)

**Key insight:** Selection and gumball are one logical unit. Don't separate them artificially.

---

## Current Status (Jan 30, 2026 - End of Day)

### ✅ Phase 1 Complete: Declarative UI Binding System

**Commits:**
- `9d34887` - Refactor: Add declarative UI binding system (Phase 1)
- `b30bb75` - Test: Enable declarative UI bindings (verified working)
- `f2ccf85` - Docs: Document parallel UI binding execution

**New Files Created:**
- `modules/rt-ui-bindings.js` - Binding engine class (370 lines)
- `modules/rt-ui-binding-defs.js` - Binding definitions (455 lines)

**Results:**
- 88 bindings registered (26 checkboxes, 23 sliders, 6 linked, 5 radio-groups, 2 button-groups, 2 basis visibility)
- `USE_DECLARATIVE_UI = true` enabled in production
- All UI controls verified working through manual testing

**Current Execution State:**
Legacy handlers wrapped in `if (!USE_DECLARATIVE_UI)` conditional. Only declarative bindings are active.

### ⏳ Phase 1.5: Legacy Handler Deletion (READY)

**Status:** ~957 lines wrapped in conditional, ready to delete after extended verification.

**To delete:**
1. Remove lines 256-1213 in rt-init.js
2. Run `npm run lint`
3. Test in browser
4. Commit with message "Refactor: Delete legacy handlers (~957 lines)"

### ✅ Phase 3 Complete: Connect/Disconnect to RTStateManager

**Added to rt-state-manager.js:**
- `connectFromSelection(scene)` - Connect two selected Points
- `disconnectFromSelection(scene)` - Disconnect selected connectedLine

### ⏪ Phase 2b: RTSelection - REVERTED

**What Happened:**
- Created `modules/rt-selection.js` (566 lines)
- Added shadow integration with feature flag
- Discovered `currentSelection` sync issue broke opt-click-drag copy
- Analyzed the coupling: ~40 references to `currentSelection` in gumball code
- Realized selection-gumball coupling is by design, not accidental

**Resolution:**
- Deleted `modules/rt-selection.js`
- Removed all shadow integration from rt-init.js
- Documented lessons learned (see Handoff Status above)

**Why This Was the Right Call:**
- Declarative UI extraction worked because UI bindings are genuinely decoupled
- Selection extraction failed because selection IS gumball's concern
- Adding sync callbacks would create dual source of truth without real benefit
- "We learned. Let's be smart not stupid."

---

## Rollback Safety

At any point during this process:

1. **Feature flags** allow instant rollback to legacy code
2. **Legacy code remains** until new code is proven
3. **Git branches** protect against mistakes
4. **Each phase is independent** - can stop at any point

```javascript
// Quick rollback in rt-init.js
const USE_DECLARATIVE_UI = false; // Instant rollback
const USE_RTGUMBALL = false;      // Instant rollback
```

---

## Key Insight

> **The disruption is OPTIONAL, not REQUIRED.**
>
> By using feature flags and shadow integration, you can:
> - Build new systems without touching working code
> - Test new systems in parallel with old
> - Switch over gradually, one feature at a time
> - Roll back instantly if problems occur
>
> This is how large codebases evolve safely.

---

## Next Steps

1. **Optional:** Remove legacy handlers section by section (low priority)
2. **Future:** Phase 2 RTGumball extraction (~1,700 lines) - HIGH RISK, requires careful planning
3. **Feature work:** Can proceed with new features; declarative system is stable

---

_Created: January 30, 2026_
_Updated: January 30, 2026 - Phase 1 COMPLETE, Phase 2b REVERTED, Phase 3 COMPLETE_
_Status: DECLARATIVE UI DEPLOYED, LEGACY READY TO DELETE_
_Risk: LOW (feature flag rollback available)_
_Lesson: Extract genuinely decoupled systems; don't artificially separate tightly coupled ones_
_Author: Andy & Claude_
