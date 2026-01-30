# JAN28-EXTRACT: rt-init.js Module Extraction Candidates

## Overview

`rt-init.js` is **4,648 lines** and continuing to grow. This document identifies LOW RISK extraction candidates based on patterns learned from successful and failed extractions.

### Key Lessons from Previous Extractions

**Successful extractions** (see `JAN26-EXTRACT.md`):
- `rt-primitives.js` (744 lines) - Pure geometry generation, no DOM interaction
- `rt-grids.js` (480 lines) - Pure geometry generation, no DOM interaction
- `rt-nodes.js` (772 lines) - Pure geometry with minimal state (factory pattern)

**Failed extractions** (see `Module-Extraction-Analysis.md`):
- `rt-controls.js` (1,085 lines) - Gumball controls, failed twice
  - Reason: Scope isolation issues, tight coupling with HTML event handlers
  - Stateful, interactive, DOM-dependent

**Pattern for success**:
> Functions that "call inward" (use libraries) succeed. Functions that "call outward" (to HTML/DOM) fail.

---

## rt-init.js Section Analysis

| Section | Lines | Risk | Candidate? |
|---------|-------|------|------------|
| Module Imports | 1-77 | — | No (bootstrap) |
| Event Handlers (toggles, sliders) | 128-1271 | HIGH | No |
| View Controls | 1272-1331 | MEDIUM | Maybe |
| Gumball State | 1493-1531 | HIGH | No |
| Rotation Input Handlers | 1679-1733 | MEDIUM | Maybe |
| Coordinate Input Handlers | 1734-2086 | HIGH | No |
| Editing Basis (Gumball) | 2087-2600 | HIGH | No |
| Selection System | 2601-2896 | HIGH | No |
| Object Snapping Helpers | 2897-3150 | **LOW** | **Yes** |
| Drag Handling | 3151-4416 | HIGH | No |
| File Handler Init | 4417-4515 | — | No (wiring) |
| Module Init | 4516-4648 | — | No (wiring) |

---

## LOW RISK Candidates

### 1. Object Snapping Helpers (Lines ~2897-3150)

**Functions**:
- `getPolyhedronVertices(polyGroup)` - Get all vertices in world coords
- `getPolyhedronEdgeMidpoints(polyGroup)` - Get edge midpoints
- `getPolyhedronFaceCentroids(polyGroup)` - Get face centroids
- `findNearestSnapTarget(position)` - Find nearest snap point

**Why LOW RISK**:
- Pure geometry queries (no DOM interaction)
- Takes THREE.Group as input, returns arrays of Vector3
- No state dependencies beyond THREE.js
- Similar pattern to successful rt-nodes.js extraction

**Estimated size**: ~250 lines

**Proposed module**: `rt-snap-geometry.js`

```javascript
// rt-snap-geometry.js
export function getPolyhedronVertices(polyGroup) { ... }
export function getPolyhedronEdgeMidpoints(polyGroup) { ... }
export function getPolyhedronFaceCentroids(polyGroup) { ... }
export function findNearestSnapTarget(position, candidates, threshold) { ... }
```

**Usage in rt-init.js**:
```javascript
import { getPolyhedronVertices, findNearestSnapTarget } from "./rt-snap-geometry.js";
```

---

## MEDIUM RISK Candidates (Defer)

### 2. Rotation Input Setup (Lines ~1679-1733)

**Function**: `setupRotationInputs(degreesId, spreadId, axis)`

**Why MEDIUM RISK**:
- Self-contained setup function
- But: relies on `document.getElementById()` and `RT.degreesToSpread()`
- Could be extracted with dependency injection

**Decision**: Defer. Only ~55 lines, low value for risk.

### 3. View Controls (Lines ~1272-1331)

**Why MEDIUM RISK**:
- Mostly wiring view buttons to `renderingAPI.setCameraPreset()`
- But: manages `activeViewButton` state and DOM classList

**Decision**: Defer. ~60 lines, UI wiring.

---

## HIGH RISK - Do NOT Extract

### Gumball System (Lines ~1493-2600)

**Why HIGH RISK**:
- ~1100 lines of tightly coupled state and event handling
- Mutates: `currentGumballTool`, `isDragging`, `selectedHandle`, `editingBasis`
- Two previous extraction attempts failed (`rt-controls.js`)
- Requires access to `renderer`, `camera`, `controls`, `scene`

**Status**: Keep in rt-init.js until major refactor.

### Selection System (Lines ~2601-2896)

**Why HIGH RISK**:
- Stateful (`currentSelection`, `selectedPolyhedra`)
- Tightly coupled with highlight system and RTStateManager
- Event-driven (click handlers)

**Status**: Keep in rt-init.js.

### Drag Handling (Lines ~3151-4416)

**Why HIGH RISK**:
- ~1200 lines of complex mouse/touch event handling
- Coordinates between gumball, object snapping, grid snapping
- Manages `isDragging`, `dragPlane`, `freeMoveDragOffset`

**Status**: Keep in rt-init.js.

---

## Recommended Action Plan

### Immediate (Low Risk)

1. **Extract `rt-snap-geometry.js`** (~250 lines)
   - Pure geometry helper functions
   - No state, no DOM
   - Test by verifying object snapping still works

### Future (When Needed)

2. **Consider `rt-deform.js` for Phase 2**
   - If deform mode is implemented, keep it in a separate module from the start
   - Follow rt-papercut.js pattern: `.init(scene, camera, renderer)`
   - Avoid adding deform logic to rt-init.js

---

## rt-init.js Size Tracking

| Date | Lines | Change | Notes |
|------|-------|--------|-------|
| Jan 26, 2026 | 4,120 | — | Baseline |
| Jan 28, 2026 | 4,648 | +528 | Multi-select + attempted grouping (reverted) |
| Jan 29, 2026 | ~4,700 | +52 | Bug 7 fix (selective connection updates) |

**Target**: Keep under 5,000 lines. If approaching limit, extract before adding new features.

---

## ⚠️ URGENT: Extract Before Jan 30 Feature Work

**Next feature planned**: Polyhedral instance node selection (select/deselect vertices on deposited instances)

This will add ~100-200 lines of selection state and handlers. If we add this BEFORE extracting, we'll be at ~4,900 lines and even harder to refactor.

**Required before node selection**:
1. Extract `rt-snap-geometry.js` (~250 lines saved)
2. Consider if node selection should be its own module (`rt-node-select.js`)

See [Deformations2.md](Deformations2.md) TODO section for Jan 30 work plan.

---

*Created: January 28, 2026*
*Status: PLANNING*
*Author: Andy & Claude*
