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

| Section                           | Lines     | Risk    | Candidate?     |
| --------------------------------- | --------- | ------- | -------------- |
| Module Imports                    | 1-77      | —       | No (bootstrap) |
| Event Handlers (toggles, sliders) | 128-1271  | HIGH    | No             |
| View Controls                     | 1272-1331 | MEDIUM  | Maybe          |
| Gumball State                     | 1493-1531 | HIGH    | No             |
| Rotation Input Handlers           | 1679-1733 | MEDIUM  | Maybe          |
| Coordinate Input Handlers         | 1734-2086 | HIGH    | No             |
| Editing Basis (Gumball)           | 2087-2600 | HIGH    | No             |
| Selection System                  | 2601-2896 | HIGH    | No             |
| Object Snapping Helpers           | 2897-3150 | **LOW** | **Yes**        |
| Drag Handling                     | 3151-4416 | HIGH    | No             |
| File Handler Init                 | 4417-4515 | —       | No (wiring)    |
| Module Init                       | 4516-4648 | —       | No (wiring)    |

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
import {
  getPolyhedronVertices,
  findNearestSnapTarget,
} from "./rt-snap-geometry.js";
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

| Date         | Lines  | Change | Notes                                        |
| ------------ | ------ | ------ | -------------------------------------------- |
| Jan 26, 2026 | 4,120  | —      | Baseline                                     |
| Jan 28, 2026 | 4,648  | +528   | Multi-select + attempted grouping (reverted) |
| Jan 29, 2026 | ~4,700 | +52    | Bug 7 fix (selective connection updates)     |
| Jan 30, 2026 | 4,733  | +33    | Added declarative UI import & init           |

**Target**: Keep under 5,000 lines. If approaching limit, extract before adding new features.

**Note (Jan 30)**: Declarative UI system adds ~33 lines to rt-init.js for imports and initialization, but creates foundation for removing ~1,000+ lines of legacy handlers in next phase.

---

## ⚠️ URGENT: Extract Before Jan 30 Feature Work

> **Update (Jan 30, 2026)**: Declarative UI system implemented. rt-snap-geometry.js extraction already complete.

**Next feature planned**: Polyhedral instance node selection (select/deselect vertices on deposited instances)

This will add ~100-200 lines of selection state and handlers. If we add this BEFORE extracting, we'll be at ~4,900 lines and even harder to refactor.

**Required before node selection**:

1. ✅ Extract `rt-snap-geometry.js` (~173 lines extracted)
2. ✅ Implement declarative UI binding system (foundation for 1,000+ line reduction)
3. Consider if node selection should be its own module (`rt-node-select.js`)

See [Deformations2.md](Deformations2.md) TODO section for Jan 30 work plan.

---

## Extraction Verification Methodology (Jan 30)

> **CRITICAL**: This section defines HOW we verify each extraction step works before committing.
> Previous failures occurred because we extracted first, tested later. This time: **verify continuously**.

### Pre-Extraction Checklist

Before ANY extraction:

```bash
# 1. Verify clean git state
git status  # Should be clean or have only planned changes

# 2. Run ESLint to establish baseline
npm run lint 2>&1 | head -50

# 3. Note current rt-init.js line count
wc -l modules/rt-init.js
```

### Verification Test Suite (Manual Browser Console)

Since this project has no automated test framework, we use **browser console verification**.
Copy-paste these tests into the browser console after each extraction step.

#### Test 1: Module Loading (After ANY extraction)

```javascript
// Paste in browser console - should not throw errors
console.log("=== MODULE LOADING TEST ===");
console.log("THREE loaded:", typeof THREE !== "undefined");
console.log("RTStateManager loaded:", typeof RTStateManager !== "undefined");
console.log("renderingAPI loaded:", typeof renderingAPI !== "undefined");
console.log("=== END MODULE TEST ===");
```

**Expected**: All three should be `true`, no console errors about missing imports.

#### Test 2: Object Snapping Geometry (After rt-snap-geometry.js extraction)

```javascript
// Test snap geometry functions exist and work
console.log("=== SNAP GEOMETRY TEST ===");

// Get a visible polyhedron
const testPoly = window.renderingAPI?.scene?.children?.find(
  c => c.userData?.polyhedronType && c.visible
);

if (testPoly) {
  console.log("Found test poly:", testPoly.userData.polyhedronType);

  // Test vertex extraction (function should exist after extraction)
  // Note: After extraction, function is imported into rt-init.js scope
  // We verify by checking if snapping UI works, not direct function access
  console.log("Test poly has children:", testPoly.children.length);
  console.log("Test poly position:", testPoly.position.toArray());
} else {
  console.log("No visible polyhedron - enable one first!");
}

console.log("=== END SNAP TEST ===");
```

#### Test 3: Interactive Snap Test (Manual)

**Steps to verify object snapping still works:**

1. Enable Hexahedron (cube) checkbox
2. Click Move tool
3. Enable "Vertex" object snap toggle
4. Drag cube near origin
5. **VERIFY**: Orange snap marker appears when cube vertex approaches grid intersection
6. Release - cube should snap if within threshold

**Pass criteria**: Snap preview marker (orange sphere) appears and snapping occurs.

#### Test 4: Full Gumball Functionality

```javascript
// Quick gumball sanity check
console.log("=== GUMBALL TEST ===");
console.log("Scene objects:", window.renderingAPI?.scene?.children?.length);

// Check editing basis can be created (won't error)
const selectedCount = RTStateManager?.getSelectedObjects?.()?.length ?? 0;
console.log("Selected objects:", selectedCount);
console.log("=== END GUMBALL TEST ===");
```

### Extraction Protocol

For each function group extracted:

#### Step 1: Create Module Stub

```javascript
// rt-snap-geometry.js - STUB FIRST, VERIFY IMPORT
export function getPolyhedronVertices(polyGroup) {
  console.log("[STUB] getPolyhedronVertices called");
  return [];
}
// ... other stubs
```

#### Step 2: Add Import to rt-init.js

```javascript
import { getPolyhedronVertices, ... } from "./rt-snap-geometry.js";
```

#### Step 3: Verify No Errors

```bash
# Run lint
npm run lint

# Open in browser, check console for import errors
# Run Test 1 (Module Loading)
```

#### Step 4: Move Real Implementation

Copy function body from rt-init.js to module, remove from rt-init.js.

#### Step 5: Run Full Test Suite

Run Tests 1-4 above. Only proceed to commit if ALL pass.

### Commit Protocol

**Commit ONLY after verification passes:**

```bash
# Verify all tests pass, then:
git add modules/rt-snap-geometry.js modules/rt-init.js
git commit -m "$(cat <<'EOF'
Refactor: Extract rt-snap-geometry.js from rt-init.js

- Extracted ~250 lines of pure geometry helper functions
- Functions: getPolyhedronVertices, getPolyhedronEdgeMidpoints,
  getPolyhedronFaceCentroids, findNearestSnapTarget
- Verified: ESLint passes, object snapping works in browser

🤖 Co-Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Andy🤦‍♂️ & Claude🤖 <andy@openbuilding.ca>
EOF
)"
```

### Rollback Protocol

If verification fails at any step:

```bash
# Option 1: Undo uncommitted changes
git checkout -- modules/rt-init.js modules/rt-snap-geometry.js

# Option 2: If committed, revert
git revert HEAD

# Option 3: Hard reset (destructive - loses uncommitted work)
git reset --hard HEAD~1
```

### Dependency Graph (Critical for Extraction)

```
rt-snap-geometry.js (NEW)
├── Inputs: THREE.Group, THREE.Vector3, threshold (number)
├── Outputs: Array<THREE.Vector3>, snap target object
├── Dependencies: THREE.js only (passed as objects, not imported)
└── NO DOM, NO RTStateManager, NO renderingAPI

findNearestSnapTarget() - SPECIAL CASE
├── Uses: objectSnapVertex, objectSnapEdge, objectSnapFace (state flags)
├── Uses: formGroups array (list of polyhedra groups)
├── Uses: RTStateManager.getAllInstances()
└── DECISION: Keep in rt-init.js OR pass dependencies as parameters
```

**findNearestSnapTarget() Extraction Options:**

| Option                                   | Pros                  | Cons                  |
| ---------------------------------------- | --------------------- | --------------------- |
| A: Keep in rt-init.js                    | No refactoring needed | Larger file           |
| B: Pass all deps as params               | Clean extraction      | Long param list       |
| C: Extract all BUT findNearestSnapTarget | Partial win           | Some coupling remains |

**Recommended**: Option C - Extract the three pure geometry functions, keep `findNearestSnapTarget` in rt-init.js since it coordinates multiple dependencies.

---

## Extraction Status Summary (Jan 30, 2026)

### Completed Extractions

| Module | Lines | Status | Notes |
|--------|-------|--------|-------|
| `rt-snap-geometry.js` | 173 | ✅ DONE | Pure geometry helpers |
| `rt-ui-bindings.js` | 370 | ✅ DONE | Declarative binding engine |
| `rt-ui-binding-defs.js` | 455 | ✅ DONE | 79 binding definitions |

### Pending Extractions

| Module | Est. Lines | Status | Notes |
|--------|------------|--------|-------|
| Legacy handler cleanup | -1,000 | ⏳ NEXT | Wrap in conditional, then remove |
| `rt-gumball.js` | 1,700 | 🔮 FUTURE | Phase 3 - high risk |

### Current Strategy

**Shadow + Switchover Pattern:**
1. ✅ Build new system alongside old (declarative bindings)
2. ✅ Test in parallel (both systems active)
3. ⏳ Switchover via feature flag (`USE_DECLARATIVE_UI`)
4. ⏳ Remove legacy handlers after verification

---

_Created: January 28, 2026_
_Updated: January 30, 2026 - End of Day_
_Status: PHASE 2 COMPLETE (Declarative UI implemented)_
_Author: Andy & Claude_
