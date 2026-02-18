# RT File Handler - Technical Documentation

**Created:** 2026-01-05
**Updated:** 2026-01-26
**Status:** COMPLETE
**Modules:** `rt-filehandler.js`, `rt-state-manager.js`

---

## Overview

The File Handler system provides complete state persistence for ARTexplorer, enabling:

- JSON export/import of scene state (environment + instances)
- glTF/glB geometry export for external applications
- CSV data export for analysis
- Auto-save to localStorage
- Preset library system

---

## Module Architecture

### RTFileHandler (`modules/rt-filehandler.js`)

Primary file I/O module handling all export/import operations.

**Initialization:**

```javascript
RTFileHandler.init(stateManager, scene, camera);
```

**Dependencies:**

- `RTStateManager` - Instance management
- `THREE.Scene` - Scene reference for geometry operations
- `THREE.Camera` - Camera state persistence
- `window.renderingAPI` - Polyhedron creation via `createPolyhedronByType()`

---

### RTStateManager (`modules/rt-state-manager.js`)

State management module following TEUI/OBJECTIVE pattern.

**Key Concepts:**

- **Forms** - Templates at origin (not persisted)
- **Instances** - Deposited snapshots with transforms (persisted)

**Instance Lifecycle:**

1. User transforms a Form at origin
2. "NOW" button creates Instance via `createInstance()`
3. Instance stored in `state.instances[]` with full transform data
4. Instance can be selected, transformed, deleted
5. Undo/redo stack tracks all modifications

---

## JSON State Format (v1.0)

### Complete State Structure

```json
{
  "version": "1.0",
  "timestamp": "2026-01-26T10:30:00.000Z",
  "timestampMs": 1737886200000,

  "environment": {
    "camera": {
      "position": { "x": 5, "y": -5, "z": 5 },
      "rotation": { "x": 0.6, "y": 0.7, "z": 0 },
      "zoom": 1
    },
    "grids": {
      "quadray": { "visible": true, "tessellation": 12 },
      "cartesian": { "visible": false, "tessellation": 10 }
    },
    "polyhedraCheckboxes": {
      "showCube": true,
      "showTetrahedron": false,
      "showGeodesicIcosahedron": true
      // ... all form visibility states
    },
    "sliderValues": {
      "scaleSlider": 1.0,
      "tetScaleSlider": 1.0,
      "opacitySlider": 0.25,
      "nodeOpacitySlider": 0.35,
      "geodesicIcosaFrequency": 3
      // ... all slider values
    },
    "geodesicProjections": {
      "geodesicIcosaProjection": "out"
      // ... all projection radio states
    },
    "colorPalette": null
  },

  "instances": [
    {
      "id": "instance_1737886200000_abc123",
      "timestamp": 1737886200000,
      "type": "cube",
      "parameters": null,
      "transform": {
        "position": { "x": 2.5, "y": 0, "z": 0 },
        "rotation": { "x": 0, "y": 0.785, "z": 0, "order": "XYZ" },
        "scale": { "x": 1.5, "y": 1.5, "z": 1.5 }
      },
      "appearance": {
        "visible": true,
        "opacity": 0.25
      },
      "metadata": {
        "label": "cube_1737886200000",
        "tags": [],
        "notes": ""
      }
    }
  ],

  "metadata": {
    "depositedCount": 5,
    "instanceCount": 5
  }
}
```

### Supported Instance Types

| Type                      | Parameters                                               | Notes                          |
| ------------------------- | -------------------------------------------------------- | ------------------------------ |
| `cube`                    | —                                                        | Basic hexahedron               |
| `tetrahedron`             | —                                                        | Basic tetrahedron              |
| `dualTetrahedron`         | —                                                        | Inverted tetrahedron           |
| `octahedron`              | —                                                        | Dual of cube                   |
| `icosahedron`             | —                                                        | 20 triangular faces            |
| `dodecahedron`            | —                                                        | 12 pentagonal faces            |
| `dualIcosahedron`         | —                                                        | Rotated icosahedron at φ scale |
| `cuboctahedron`           | —                                                        | Vector Equilibrium             |
| `rhombicDodecahedron`     | —                                                        | Dual of cuboctahedron          |
| `geodesicIcosahedron`     | `frequency`, `projection`                                | Geodesic sphere                |
| `geodesicTetrahedron`     | `frequency`, `projection`                                | Geodesic tetrahedron           |
| `geodesicOctahedron`      | `frequency`, `projection`                                | Geodesic octahedron            |
| `geodesicDualTetrahedron` | `frequency`, `projection`                                | Geodesic dual tetrahedron      |
| `geodesicDualIcosahedron` | `frequency`, `projection`                                | Geodesic dual icosahedron      |
| `quadrayTetrahedron`      | `wxyz`, `normalize`                                      | Native Quadray coords          |
| `quadrayTetraDeformed`    | `wxyz`, `zStretch`                                       | Deformed Quadray               |
| `cubeMatrix`              | `matrixSize`, `rotate45`                                 | Planar cube array              |
| `tetMatrix`               | `matrixSize`, `rotate45`                                 | Planar tetrahedron array       |
| `octaMatrix`              | `matrixSize`, `rotate45`                                 | Planar octahedron array        |
| `cuboctaMatrix`           | `matrixSize`, `rotate45`                                 | Planar VE array                |
| `rhombicDodecMatrix`      | `matrixSize`, `rotate45`                                 | Planar RD array                |
| `point`                   | —                                                        | 0D primitive                   |
| `line`                    | `quadrance`, `length`, `weight`                          | 1D primitive                   |
| `polygon`                 | `sides`, `quadrance`, `radius`, `edgeWeight`, `showFace` | 2D primitive                   |

### Parameter Details

**Geodesic Parameters:**

- `frequency`: Integer 1-7 (Fuller notation)
- `projection`: `"off"`, `"in"`, `"mid"`, `"out"`

**Matrix Parameters:**

- `matrixSize`: Integer (N×N grid)
- `rotate45`: Boolean (45° rotation for IVM alignment)

**Quadray Parameters:**

- `wxyz`: Array `[w, x, y, z]` coordinates
- `normalize`: Boolean (zero-sum normalization)
- `zStretch`: Float (Z-axis deformation factor)

---

## API Reference

### RTFileHandler Methods

#### Export Methods

```javascript
// Export complete state to JSON object
const stateData = RTFileHandler.exportState();

// Export to downloadable JSON file
RTFileHandler.exportStateToFile(filename?);

// Export to glTF/glB format
await RTFileHandler.exportGLTF({
  binary: true,        // .glb (true) or .gltf (false)
  includeGrids: false, // Include grid geometry
  filename: null       // Custom filename
});

// Export instances to CSV
RTFileHandler.exportCSVToFile(filename?);
```

#### Import Methods

```javascript
// Import from state object
const success = RTFileHandler.importState(stateData);

// Import from File object
const success = await RTFileHandler.importStateFromFile(file);

// Show file picker dialog
RTFileHandler.showImportDialog();

// Show export format selection dialog
await RTFileHandler.showExportDialog();
```

#### Auto-Save Methods

```javascript
// Manual auto-save trigger
RTFileHandler.autoSave();

// Load from auto-save
const success = RTFileHandler.loadAutoSave();

// Clear auto-save
RTFileHandler.clearAutoSave();
```

#### Preset Methods

```javascript
// Save current state as preset
RTFileHandler.savePreset("my-preset");

// Load preset
RTFileHandler.loadPreset("my-preset");

// Delete preset
RTFileHandler.deletePreset("my-preset");

// List all presets
const presets = RTFileHandler.listPresets();
```

### RTStateManager Methods

#### Instance Management

```javascript
// Create instance from polyhedron group
const instance = RTStateManager.createInstance(polyhedronGroup, scene);

// Select instance
const instance = RTStateManager.selectInstance(instanceId);

// Update instance transform
RTStateManager.updateInstance(instanceId, newTransform);

// Delete instance
RTStateManager.deleteInstance(instanceId, scene);

// Get instance by ID
const instance = RTStateManager.getInstance(instanceId);

// Get all instances
const instances = RTStateManager.getAllInstances();

// Get deposited count
const count = RTStateManager.getDepositedCount();
```

#### Undo/Redo

```javascript
// Undo last action
RTStateManager.undo(scene);

// Redo last undone action
RTStateManager.redo(scene);
```

#### Modification Tracking

```javascript
// Register callback for modifications (used by auto-save)
RTStateManager.onModification((modCount, changesSinceSave, action) => {
  // Triggered on create/update/delete
});

// Mark current state as saved
RTStateManager.markAsSaved();

// Get unsaved changes count
const changes = RTStateManager.getUnsavedChanges();
```

#### Environment Settings

```javascript
// Set custom color palette
RTStateManager.setColorPalette(colorPalette);

// Get color palette
const palette = RTStateManager.getColorPalette();

// Clear color palette (revert to defaults)
RTStateManager.clearColorPalette();
```

---

## Instance Restoration Process

When importing a JSON state file, instances are restored through this pipeline:

1. **Validate State Data**
   - Check version compatibility
   - Verify required fields present

2. **Clear Existing State**
   - `RTStateManager.clearAll(scene)` removes all instances

3. **Restore Environment**
   - Camera position/rotation/zoom
   - Grid visibility and tessellation
   - All slider values (sliders restored BEFORE checkboxes)
   - Geodesic projection radio states
   - Polyhedra checkbox states
   - Color palette (if custom)

4. **Restore Instances**
   - For each instance in JSON:
     - Build options from `parameters` (frequency, projection, matrixSize, etc.)
     - Call `window.renderingAPI.createPolyhedronByType(type, options)`
     - Apply saved transform (position, rotation, scale)
     - Set visibility
     - Register via `RTStateManager.createInstance()`

5. **Trigger Geometry Update**
   - `window.renderingAPI.updateGeometry()` rebuilds visible forms

---

## Auto-Save System

### Configuration

```javascript
RTFileHandler.config = {
  autoSaveEnabled: true,
  autoSaveThreshold: 10, // Save every N modifications
  autoSaveKey: "art-explorer-autosave",
  presetKeyPrefix: "art-explorer-preset-",
  maxAutoSaveHistory: 5,
};
```

### Behavior

- Auto-save triggers after `autoSaveThreshold` modifications
- Saves to `localStorage` with key `art-explorer-autosave`
- Maintains history of last 5 saves (metadata only)
- Modification counter tracks: create, update, delete, updateEnvironment

---

## Keyboard Shortcuts

| Key            | Action                      |
| -------------- | --------------------------- |
| `Ctrl+S`       | Export state to JSON file   |
| `Ctrl+O`       | Import state from JSON file |
| `Ctrl+Z`       | Undo                        |
| `Ctrl+Shift+Z` | Redo                        |

---

## Error Handling

### Import Validation

- Version mismatch: Warning logged, import continues
- Missing required fields: Error thrown, import aborted
- Unknown polyhedron type: Warning logged, instance skipped
- Invalid transform data: Defaults applied (position 0,0,0; scale 1,1,1)

### Export Safety

- Instances without `threeObject`: Skipped in glTF export
- localStorage quota exceeded: Error logged, auto-save disabled

---

## File Formats

### JSON (.json)

- Complete state persistence
- Human-readable
- Version-controlled
- Recommended for project saves

### glTF (.gltf)

- JSON-based 3D format
- Geometry only (no state)
- External texture references
- Good for editing in other tools

### glB (.glb)

- Binary glTF format
- Single file with embedded data
- Smaller file size
- Good for sharing/archiving

### CSV (.csv)

- Instance data table
- Position/rotation/scale columns
- Good for data analysis
- Import not supported

---

## Testing Checklist

### Basic Operations

- [ ] Export empty scene
- [ ] Export scene with single instance
- [ ] Export scene with multiple instances
- [ ] Import exported JSON
- [ ] Verify camera restored
- [ ] Verify grid states restored
- [ ] Verify instances restored with correct transforms

### All Polyhedron Types

- [ ] Basic polyhedra (cube, tetrahedron, octahedron, etc.)
- [ ] Dual polyhedra
- [ ] Archimedean solids
- [ ] Geodesic polyhedra (all frequencies, all projections)
- [ ] Quadray demonstrators
- [ ] Matrix forms (all types, various sizes)
- [ ] Primitives (point, line, polygon)

### Edge Cases

- [ ] 50+ instances
- [ ] Extreme transforms (large scale, rotation)
- [ ] Mixed polyhedron types
- [ ] Custom color palette

### Round-Trip Fidelity

- [ ] Export → Import → Export produces identical JSON

---

## References

- [rt-filehandler.js](../modules/rt-filehandler.js) - File handler implementation
- [rt-state-manager.js](../modules/rt-state-manager.js) - State management
- [rt-rendering.js](../modules/rt-rendering.js) - `createPolyhedronByType()` factory
- [rt-polyhedra.js](../modules/rt-polyhedra.js) - Geometry generation

---

_Last Updated: 2026-01-26_
_Status: COMPLETE - All functionality implemented and working_
