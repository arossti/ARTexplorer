# Color Theory Modal Integration - Workplan

**Status**: ✅ COMPLETED (2026-01-12)
**Branch**: `Colour-Theory` (current)
**Goal**: Integrate color-theory-test.html as a modal feature in ART Explorer
**Reference Architecture**: [Geometry README](./README.md)

---

## Overview

Transform the standalone `color-theory-test.html` into an integrated modal feature matching the architecture of existing math demos (RT Cross, RT Spread). This will allow real-time color calibration while viewing the 3D scene underneath.

---

## Phase 1: CSS Extraction & Consolidation

### 1.1 Extract Reusable Styles to art.css

**File**: `src/geometry/art.css`

Extract and consolidate color theory styles into new CSS sections:

```css
/* ========================================================================
   COLOR THEORY MODAL
   ======================================================================== */

/* Color theory modal overlay (matches demo modal pattern) */
#color-theory-modal-overlay {
  /* Similar to #info-modal-overlay but full-screen */
}

#color-theory-modal {
  /* Wide modal like demo modals (1200px+) */
  /* Semi-transparent background to see scene underneath */
}

/* Color swatch components */
.color-swatch-container {
}
.color-swatch {
}
.color-label {
}
.color-input-group {
}
.color-picker-btn {
}

/* Brightness comparison bars */
.brightness-comparison {
}
.brightness-swatch {
}

/* Export section */
.color-export-section {
}
.color-code-output {
}
```

**Key Changes from Standalone HTML**:

- Reduce swatch heights from 80px → 40px (compact squares)
- Adjust grid layouts for modal width constraints
- Match existing modal blur/transparency patterns
- Reuse existing button/slider/input styles where possible

---

## Phase 2: JavaScript Module Creation

### 2.1 Create color-theory-modal.js

**File**: `src/geometry/modules/color-theory-modal.js`

**Architecture Pattern**: Follow `rt-cross-demo.js` structure

```javascript
/**
 * color-theory-modal.js
 * Color Theory Calibration Tool - Modal Integration
 *
 * Interactive color picker for adjusting polyhedra colors with
 * real-time preview and backface culling brightness compensation.
 *
 * @requires THREE.js
 * @requires rt-rendering.js (for color updates)
 */

export class ColorTheoryModal {
  constructor() {
    this.overlay = null;
    this.modal = null;
    this.colorData = [
      /* ... color definitions ... */
    ];
    this.isOpen = false;
  }

  /**
   * Initialize modal structure and event listeners
   */
  init() {
    this.createModalStructure();
    this.attachEventListeners();
  }

  /**
   * Open the color theory modal
   */
  open() {
    if (!this.overlay) this.init();
    this.overlay.classList.remove("hidden");
    this.isOpen = true;
    this.refreshColorValues(); // Read current rt-rendering.js colors
  }

  /**
   * Close the modal
   */
  close() {
    this.overlay.classList.add("hidden");
    this.isOpen = false;
  }

  /**
   * Create modal DOM structure (matches demo modal pattern)
   */
  createModalStructure() {
    // Build overlay + modal container
    // Add color swatches grid
    // Add global opacity/brightness controls
    // Add export section
  }

  /**
   * Refresh color swatches with current rt-rendering.js values
   */
  refreshColorValues() {
    // Read colors from rt-rendering.js module
    // Update swatch displays
  }

  /**
   * Apply selected colors to scene (live preview)
   */
  applyColors() {
    // Call rt-rendering.js update functions
    // Trigger scene re-render
  }

  /**
   * Export color values as code snippet
   */
  exportColors() {
    // Generate code output (same as standalone HTML)
    // Copy to clipboard option
  }

  /**
   * Handle color picker input
   */
  handleColorChange(id, hexValue) {
    // Update internal color data
    // Update swatch display
    // Call applyColors() for live preview
  }
}

// Export singleton instance
export const colorTheoryModal = new ColorTheoryModal();
```

**Key Features**:

- **Live Preview**: Colors apply to scene in real-time (no page reload)
- **Compact UI**: Smaller swatches (40px squares) for modal constraints
- **Two-Way Sync**: Reads current colors from rt-rendering.js on open
- **Export Code**: Generates copy-paste color values (like standalone)

---

## Phase 3: UI Integration

### 3.1 Add Control Panel Button

**File**: `src/geometry/art.html`

Add button in "Developer Tools" section (after existing demo buttons):

```html
<!-- Developer Tools Section -->
<div class="control-group">
  <h3>
    <span class="section-toggle" data-section="dev-tools"></span>
    Developer Tools
  </h3>
  <div class="section-content" id="dev-tools-section">
    <!-- Existing demos -->
    <button id="openRTCrossDemo">RT Cross Demo</button>
    <button id="openRTSpreadDemo">RT Spread Demo</button>

    <!-- NEW: Color Theory Tool -->
    <button id="openColorTheoryModal">🎨 Color Theory Calibration</button>
  </div>
</div>
```

### 3.2 Wire Up Button in rt-init.js

**File**: `src/geometry/modules/rt-init.js`

```javascript
import { colorTheoryModal } from "./color-theory-modal.js";

// In initialization function:
document
  .getElementById("openColorTheoryModal")
  ?.addEventListener("click", () => {
    colorTheoryModal.open();
  });
```

---

## Phase 4: Integration with rt-rendering.js

### 4.1 Expose Color Update API

**File**: `src/geometry/modules/rt-rendering.js`

Add public API for color updates:

```javascript
/**
 * Update polyhedron color and re-render
 * @param {string} polyhedronType - e.g., 'cube', 'tetrahedron'
 * @param {number} color - Hex color (e.g., 0xFF9300)
 */
export function updatePolyhedronColor(polyhedronType, color) {
  // Update internal color mapping
  // Trigger updateGeometry() to re-render
}

/**
 * Get current color for a polyhedron type
 * @param {string} polyhedronType
 * @returns {number} Current hex color
 */
export function getPolyhedronColor(polyhedronType) {
  // Return current color value
}

/**
 * Get all current colors as exportable object
 * @returns {Object} Color mapping
 */
export function exportColorPalette() {
  return {
    cube: 0x0433ff,
    cubeMatrix: 0x00fdff,
    tetrahedron: 0xfffb00,
    // ... all colors
  };
}
```

### 4.2 Color Theory Modal Calls API

**File**: `src/geometry/modules/color-theory-modal.js`

```javascript
import { updatePolyhedronColor, getPolyhedronColor, exportColorPalette } from './rt-rendering.js';

// In handleColorChange():
handleColorChange(id, hexValue) {
  const polyType = this.getPolyTypeFromId(id); // 'cube', 'tetrahedron', etc.
  updatePolyhedronColor(polyType, parseInt(hexValue.replace('0x', ''), 16));
  // Scene automatically re-renders via rt-rendering.js
}

// In refreshColorValues():
refreshColorValues() {
  const palette = exportColorPalette();
  Object.keys(palette).forEach(key => {
    this.updateSwatchDisplay(key, palette[key]);
  });
}
```

---

## Phase 5: Modal Layout Design

### 5.1 Compact Grid Layout

**Modal Structure**:

```
┌─────────────────────────────────────────────────────────────┐
│ Color Theory Calibration Tool                      [Close X]│
├─────────────────────────────────────────────────────────────┤
│ Global Controls (Opacity + Brightness sliders)              │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┬─────────────────────┬─────────────┐ │
│ │ Platonic Solids     │ Dual Polyhedra      │ Archimedean │ │
│ │                     │                     │             │ │
│ │ [Cube] [Matrix]     │ [Dual Tetra] [Geo]  │ [Cubocta]   │ │
│ │ [Tetra] [Geodesic]  │ [Dual Icosa] [Geo]  │ [Rhombic]   │ │
│ │ [Octa] [Geodesic]   │                     │             │ │
│ │ [Icosa] [Geodesic]  │                     │             │ │
│ │ [Dodeca]            │                     │             │ │
│ └─────────────────────┴─────────────────────┴─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Export Section                                               │
│ [Generate Code] [Copy to Clipboard]                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ // Generated color values...                            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Compact Swatch Design** (40px × 40px squares):

```
┌────────────────────┐
│ Label: Cube        │
├──────┬─────────────┤
│ [■]  │ 0x0433FF    │  ← Color picker button + hex input
└──────┴─────────────┘
```

---

## Phase 6: Testing & Refinement

### 6.1 Test Cases

- [ ] Modal opens/closes smoothly
- [ ] Scene visible underneath (semi-transparent modal)
- [ ] Color changes apply in real-time
- [ ] Opacity slider affects all swatches
- [ ] Brightness slider simulates backface culling loss
- [ ] Export code generates correct format
- [ ] Copy to clipboard works
- [ ] Keyboard shortcuts (ESC to close)

### 6.2 Performance Checks

- [ ] No lag when changing colors (debounce if needed)
- [ ] Modal doesn't block scene rendering
- [ ] Color updates don't cause memory leaks

---

## Phase 7: Documentation

### 7.1 Update Geometry README

**File**: `docs/development/Geometry Documents/README.md`

Add section under "Developer Tools":

```markdown
### Color Theory Calibration Tool

Interactive color picker for adjusting polyhedra colors with backface culling
brightness compensation.

**Features**:

- Live preview with 3D scene visible underneath
- Opacity/brightness controls for testing transparency
- Export code snippet for manual updates
- macOS color picker integration

**Usage**:

1. Open via "Developer Tools" → "Color Theory Calibration"
2. Adjust colors using color picker squares
3. Test at different opacity/brightness levels
4. Export code or apply directly to scene

**Technical**:

- Module: `src/geometry/modules/color-theory-modal.js`
- Styles: `src/geometry/art.css` (Color Theory Modal section)
- Integration: `rt-init.js` → `rt-rendering.js` API
```

### 7.2 Add Comments to color-theory-modal.js

Document all public methods with JSDoc format (matching rt-rendering.js style).

---

## Implementation Checklist

### Phase 1: CSS Extraction ✅

- [x] Extract color theory styles from standalone HTML
- [x] Add to art.css under "COLOR THEORY MODAL" section
- [x] Adjust dimensions for compact modal layout (80px → 40px swatches)
- [x] Test styles in isolation

### Phase 2: JavaScript Module ✅

- [x] Create `color-theory-modal.js` file
- [x] Implement ColorTheoryModal class (constructor, init, open, close)
- [x] Port color data structure from standalone HTML
- [x] Implement createModalStructure()
- [x] Implement color swatch generation logic
- [x] Add global opacity/brightness controls
- [x] Implement export functionality

### Phase 3: UI Integration ✅

- [x] Add button to index.html (Geometry Info section)
- [x] Import module in rt-init.js
- [x] Wire up button event listener
- [x] Test modal open/close

### Phase 4: rt-rendering.js API ✅

- [x] Add updatePolyhedronColor() function
- [x] Add getPolyhedronColor() function
- [x] Add exportColorPalette() function
- [x] Test API with manual calls

### Phase 5: Two-Way Integration ✅

- [x] Color modal calls rt-rendering.js API
- [x] Live preview updates scene in real-time
- [x] Modal reads current colors on open
- [x] Test round-trip (read → modify → apply)

### Phase 6: State Persistence ✅ (BONUS)

- [x] Add color palette to StateManager as environment setting
- [x] Implement localStorage persistence for session
- [x] Add color palette to JSON export/import
- [x] Colors restore on page refresh
- [x] Colors included in file export/import

### Phase 7: Documentation ✅

- [x] Update this workplan with "COMPLETED" status
- [x] Add JSDoc comments to color-theory-modal.js
- [ ] Update Geometry README (pending)

---

## Future Enhancements (Post-MVP)

1. **Color Presets**: Save/load color schemes (e.g., "High Contrast", "Pastel")
2. **Undo/Redo**: Color change history
3. **Real-time Contrast Analysis**: Warn if colors too similar (accessibility)
4. **Color Harmony Suggestions**: Auto-suggest complementary colors
5. **Persistent Storage**: Save custom colors to localStorage
6. **Export Formats**: CSS variables, JSON, THREE.js code snippets

---

## Success Criteria

✅ **Phase Complete When**:

- Modal opens from Developer Tools button
- All polyhedra colors editable via compact UI
- Live preview works without lag
- Export generates correct code format
- Modal matches existing demo architecture
- Documentation updated in Geometry README

---

## Notes

- **Architecture Consistency**: Follow RT Cross Demo pattern exactly
- **No Standalone File**: color-theory-test.html remains for reference only
- **Color Source of Truth**: rt-rendering.js holds all color values
- **Modal Transparency**: User can see 3D scene changes underneath
- **Keyboard Shortcuts**: ESC to close (matches info modal)

---

**Created**: 2026-01-11
**Completed**: 2026-01-12
**Author**: Andy & Claude
**Related Files**:

- Reference: `src/geometry/color-theory-test.html` (standalone prototype)
- Modal: `src/geometry/modules/color-theory-modal.js` ✅ CREATED
- Styles: `src/geometry/art.css` (COLOR THEORY MODAL section) ✅ ADDED
- Integration: `src/geometry/modules/rt-init.js` ✅ WIRED UP
- API: `src/geometry/modules/rt-rendering.js` ✅ API ADDED
- State: `src/geometry/modules/rt-state-manager.js` ✅ ENVIRONMENT SETTINGS
- File Handler: `src/geometry/modules/rt-filehandler.js` ✅ IMPORT/EXPORT

---

## Implementation Summary (Completed 2026-01-12)

### What Was Built

**Core Features:**

1. **Real-Time Color Updates**: Color changes apply instantly to the 3D scene without page reload
2. **State Persistence**: Colors saved to localStorage and survive browser refresh
3. **Import/Export**: Custom color palettes included in JSON scene exports
4. **Two-Way Sync**: Modal reads current colors from rendering engine and updates them bidirectionally

**Architecture:**

- Modal follows existing RT demo pattern (rt-cross-demo.js, rt-quadrance-demo.js)
- Color palette centralized in rt-rendering.js as single source of truth
- StateManager tracks colors as environment-level settings (not instance-specific)
- File handler automatically includes color palette in exports/imports

**User Experience:**

1. Open modal via "Color Theory" link in Geometry Info section
2. Click color swatches to open system color picker
3. Colors apply to scene immediately (no "save" button needed)
4. Colors persist across browser refreshes via localStorage
5. Export scene → colors included in JSON file
6. Import scene → colors automatically restored

### Technical Implementation

**API Functions Added to rt-rendering.js:**

```javascript
getPolyhedronColor(polyhedronType); // Get current color
updatePolyhedronColor(polyhedronType, color); // Update and re-render
exportColorPalette(); // Export all colors as object
```

**StateManager Environment Settings:**

```javascript
state: {
  environment: {
    colorPalette: null; // null = use defaults, object = user overrides
  }
}
```

**localStorage Key:**

- `artexplorer-color-palette` - Persists custom colors across sessions
- Cleared on hard refresh (Cmd+Shift+R) or browser quit

**JSON Export Structure:**

```json
{
  "version": "1.0",
  "environment": {
    "colorPalette": { "cube": 0x0433FF, "tetrahedron": 0xFFFB00, ... }
  },
  "instances": [...]
}
```

### Differences from Original Plan

**Enhanced Beyond MVP:**

- ✅ Added StateManager integration (originally "Future Enhancement #5")
- ✅ Added localStorage persistence (originally "Future Enhancement #5")
- ✅ Added JSON export/import (originally "Future Enhancement #6")
- ✅ All colors update in real-time (not just on "Export" button click)

**Not Yet Implemented:**

- Color presets system (Future Enhancement #1)
- Undo/redo for color changes (Future Enhancement #2)
- Contrast analysis warnings (Future Enhancement #3)
- Color harmony suggestions (Future Enhancement #4)

### Testing Status

**Manual Testing Required:**

- [ ] Open modal and verify all swatches display correctly
- [ ] Change cube color to red, verify scene updates immediately
- [ ] Refresh browser, verify red cube color persists
- [ ] Export scene JSON, verify colorPalette in file
- [ ] Import scene JSON, verify colors restore correctly
- [ ] Hard refresh (Cmd+Shift+R), verify colors reset to defaults

---

## Bug Fixes & Refinements (Post-Launch)

### Page Refresh Crash Fix (2026-01-12)

**Issue**: `TypeError: Cannot read properties of undefined (reading 'children')` on page refresh when localStorage had saved colors.

**Root Cause**: `restoreColorsFromLocalStorage()` was calling `updatePolyhedronColor()` before scene and polyhedron groups were fully initialized.

**Solution**: Explicit initialization sequence without race conditions:

1. `setRenderingAPI(api)` - Stores API reference only, no restoration
2. Scene completes full initialization in rt-init.js
3. `initializeAfterSceneReady()` - Called explicitly after scene is ready
4. Colors restore safely after all groups exist

**Implementation**:

- Added `initializeAfterSceneReady()` method to color-theory-modal.js
- Called from rt-init.js:2620 (after `initGumballEventListeners()`)
- No setTimeout() or arbitrary delays - deterministic execution order
- **Commit**: `ce60f58`

### Compact Layout Redesign (2026-01-12)

**User Feedback**: Modal was too large and required scrolling, redundant color swatches.

**Changes**:

- Removed large 40px color display swatches (picker squares now serve dual purpose)
- Removed global opacity/brightness sliders (not needed for real-time editing)
- Removed export section (auto-save makes it redundant)
- Multi-column responsive grid (2-3 columns based on screen width)
- Compact single-line items: [Picker Square] + Label + Hex Input
- Modal now fits without scrolling on most screens

**Implementation**:

- art.css: New `.color-item` compact layout, hide `.color-swatch`
- color-theory-modal.js: Simplified `generateColorSections()` for flat list
- Picker button background shows current color
- **Commit**: `5cde770`

---

**Git Commits**:

- `6f5fa17` - "Feat: Implement real-time color modal with state persistence"
- `09d38ba` - "Docs: Mark color theory modal integration as completed"
- `5cde770` - "Refactor: Simplify color modal to compact multi-column layout"
- `ce60f58` - "Fix: Use explicit initialization sequence for localStorage color restoration"
