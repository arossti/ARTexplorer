# Code Quality Audit — 2026-02-18

**Branch:** Thomson-Polyhedra2
**Audit Type:** Major + RT-Purity (first audit using updated CODE-QUALITY-AUDIT.md v1.3)
**Status:** ALL 5 PHASES COMPLETE ✅

---

## Automated Check Results

### Prettier: 13 files need formatting

```
modules/color-theory-modal.js
modules/rt-animate.js
modules/rt-delta.js
modules/rt-filehandler.js
modules/rt-grids.js
modules/rt-matrix-planar.js
modules/rt-matrix-radial.js
modules/rt-nodes.js
modules/rt-papercut.js
modules/rt-rendering.js
modules/rt-thomson.js
modules/rt-ui-bindings.js
modules/rt-viewmanager.js
```

**Fix:** `npx prettier --write "modules/**/*.js"`

### ESLint: 231 problems (172 errors, 59 warnings)

- 168 errors = Prettier formatting (auto-fixable with `--fix`)
- 4 real code errors (non-formatting, in rt-rendering.js and rt-viewmanager.js)
- 59 warnings = unused vars/imports

**Notable unused vars:**

| File | Line | Variable | Action |
|---|---|---|---|
| `rt-quadray-polyhedra.js` | 407 | `edges` | Prefix `_edges` or remove |
| `rt-quadray-polyhedra.js` | 484 | `sampleQ` | Prefix `_sampleQ` or remove |
| `rt-quadray-rotor.js` | 45 | `RT` import | Remove unused import |
| `rt-rendering.js` | 1084 | `opacity` param | Prefix `_opacity` |
| `rt-rendering.js` | 5257 | `currentUCSMode` | Remove or use |
| `rt-rotor-demo.js` | 19 | `CommonSpreads` | Remove unused import |
| `rt-rotor-demo.js` | 684, 739, 761 | `event` params | Prefix `_event` |
| `rt-state-manager.js` | 805 | `updatedCount` | Remove or use |

### Module Boundaries: PASS

- `rt-math.js` does NOT import THREE.js
- `rt-polyhedra.js` does NOT reference DOM elements

---

## RT-Purity Analysis

### Methodology

Scanned all `modules/` files for:
- `Math.PI`, `Math.sin`, `Math.cos`, `Math.tan`, `Math.asin`, `Math.acos`, `Math.atan`
- `Math.sqrt` (premature expansion check)
- `(1 + Math.sqrt(5)) / 2` (should use PurePhi)
- `2 * Math.PI * i / n` + `Math.cos/sin` (should use RT.nGonVertices)
- `Math.pow(Math.sin(Math.PI / n), 2)` (should derive spread from RT)

Each occurrence evaluated against the RT-Alternative Lookup Table in CODE-QUALITY-AUDIT.md Section 4.

### Summary: ~95 classical trig occurrences across 18 files

| Category | Count | Verdict |
|---|---|---|
| Justified: THREE.js rendering handoff | ~15 | No action |
| Justified: UX degree/radian boundary | ~25 | No action |
| Justified: Demo/experimental modules | ~35 | No action |
| **Violations needing fix** | **~20** | **See below** |

---

## Violations — Fix Plan

### V1: `(1 + Math.sqrt(5)) / 2` should use `PurePhi` [HIGH PRIORITY]

**4 occurrences, 2 files. Trivial fix — direct substitution.**

| File | Line | Current Code | RT Fix |
|---|---|---|---|
| `rt-helices.js` | 47 | `PHI: (1 + Math.sqrt(5)) / 2` | `PHI: RT.PurePhi.value()` |
| `rt-helices.js` | 48 | `PHI_SQUARED: (1 + Math.sqrt(5)) / 2 + 1` | `PHI_SQUARED: RT.PurePhi.squared()` |
| `rt-helices.js` | 49 | `INV_PHI: (1 + Math.sqrt(5)) / 2 - 1` | `INV_PHI: RT.PurePhi.inverse()` |
| `rt-prime-cuts.js` | 1414 | `const phi = (1 + Math.sqrt(5)) / 2` | `const phi = RT.PurePhi.value()` |

**Prerequisites:**
- `rt-helices.js` already imports `RT` from `rt-math.js` (line 19) ✅
- `rt-prime-cuts.js` needed `RT` import added ✅
- `RT.PurePhi.value()` returns the same numeric value (cached `(1 + Math.sqrt(5)) / 2`)

**Status: COMPLETE** ✅

---

### V2: `Math.pow(Math.sin(Math.PI / n), 2)` for spread [MEDIUM PRIORITY]

**4 occurrences, 3 files. Need a utility function or derive from RT.nGonVertices.**

| File | Line | Context |
|---|---|---|
| `rt-rendering.js` | 3435 | `Math.pow(Math.sin(Math.PI / polySides), 2)` — polygon primitive spread |
| `rt-rendering.js` | 3457 | `Math.pow(Math.sin(Math.PI / prismSides), 2)` — prism base spread |
| `rt-nodes.js` | 117 | `Math.pow(Math.sin(centralAngle), 2)` — node polygon spread |
| `rt-prime-cuts.js` | 1340 | `Math.pow(Math.sin(Math.PI / n), 2)` — projection spread |

**Proposed fix — add `RT.centralSpread(n)` to rt-math.js:**

```javascript
/**
 * Central spread of a regular N-gon: the spread between adjacent vertices
 * as seen from the center. Equivalent to sin^2(pi/N) but derived RT-pure
 * from nGonVertices.
 */
centralSpread(n) {
  if (n < 3) return 0;
  const verts = RT.nGonVertices(n, 1).vertices;
  const v0 = verts[0], v1 = verts[1];
  // spread = 1 - dot^2 / (Q0 * Q1)  where vectors are from origin
  const dot = v0.x * v1.x + v0.y * v1.y;
  const Q0 = v0.x * v0.x + v0.y * v0.y;
  const Q1 = v1.x * v1.x + v1.y * v1.y;
  return 1 - (dot * dot) / (Q0 * Q1);
}
```

Then replace all 4 occurrences with `RT.centralSpread(n)`.

**Verification:** `RT.centralSpread(4)` should equal `0.5` (sin^2(45deg) = 0.5). `RT.centralSpread(3)` should equal `0.75`.

**Status: COMPLETE** ✅ (commit `8e3e268`)

---

### V3: Classical trig n-gon generation — should use `RT.nGonVertices()` [MEDIUM PRIORITY]

**3 occurrences, 2 files. Direct drop-in replacement available.**

| File | Line | Current Pattern | RT Fix |
|---|---|---|---|
| `rt-projections.js` | 769-771 | `angle = 2*PI*i/n; x = r*cos(angle); y = r*sin(angle)` | `RT.nGonVertices(n, maxRadius).vertices` |
| `rt-prime-cuts.js` | 975-977 | Same pattern | `RT.nGonVertices(n, radius).vertices` |
| `rt-prime-cuts.js` | 1117-1119 | Same pattern | `RT.nGonVertices(n, radius).vertices` |

**Prerequisites:**
- Check that surrounding code consumes `{x, y}` pairs (RT.nGonVertices returns `[{x,y}, ...]`)
- May need minor adaptation if loop index `i` is used for other purposes in the same block

**Verification:** Visual — the generated polygons should look identical before/after.

**Status: COMPLETE** ✅

---

### V4: Penrose tiling classical trig [LOW PRIORITY — DEFERRED]

**~6 occurrences in `rt-penrose.js` (lines 541-606).**

Uses `Math.atan2`, `Math.PI`, `Math.cos`, `Math.sin` for tile rotation/orientation. Converting to spread-based orientation + double-reflection is a deeper refactor.

**Action:** TODO comments added with specific RT-purify strategies:
- `_rotationFromVerts()`: Replace atan2 with spread-based discrete rotation detection (10 known spread values for decagonal orientations)
- `_vertsForTile()`: Replace trig rotation with `RT.nGonVertices(10, 1)` lookup for pre-cached cos/sin rotation matrix pairs

**Status: DEFERRED** — TODO comments in place (commit `e3ce1d5`)

---

### V5: Pentagon hardcoded with trig in rt-rendering.js [MEDIUM PRIORITY]

**1 occurrence at `rt-rendering.js:1661-1668`.**

**Fix:** Replaced with `RT.nGonVertices(5, radius).vertices` + 90° CCW rotation `(x,y) → (-y, x)` to preserve first-vertex-at-top orientation.

**Status: COMPLETE** ✅ (commit `55ed53e`)

---

### V6: `rt-ik-solvers.js` atan2 [LOW PRIORITY — DEFERRED]

**1 occurrence at line 54:** `Math.atan2(dx, dy)` for heading calculation.

**Action:** TODO comment added — IK solvers can work in quadrance/spread space directly; rigid constraint only needs direction vector + target quadrance, not explicit angle.

**Status: DEFERRED** — TODO comment in place (commit `e3ce1d5`)

---

### V7: `rt-nodes.js` spread calculations [MEDIUM PRIORITY]

**3 additional occurrences at lines 156-167** using `Math.PI / prismSides` and `Math.PI / coneSides` for spread. Same pattern as V2 — fixed by `RT.centralSpread(n)`.

**Status: COMPLETE** ✅ (commit `8e3e268`, fixed alongside V2)

---

## Fix Execution Order

### Phase 1: Auto-fix (no behavior change) ✅

1. `npx prettier --write` — 13 files formatted
2. `npx eslint --fix` — 231 → 63 problems (168 auto-fixed)
3. **Commit:** `fd49b45`

### Phase 2: V1 — PurePhi substitution ✅

1. Fixed 4 occurrences in `rt-helices.js` and `rt-prime-cuts.js`
2. **Commit:** `9538c68`

### Phase 3: V2+V7 — Add `RT.centralSpread(n)` utility ✅

1. Added `centralSpread(n)` to `rt-math.js` RT namespace
2. Replaced 7 occurrences across `rt-rendering.js`, `rt-nodes.js`, `rt-prime-cuts.js`
3. **Commit:** `8e3e268`

### Phase 4: V3+V5 — Replace cos/sin n-gon generation ✅

1. Replaced 3 classical n-gon loops with `RT.nGonVertices()` in `rt-projections.js`, `rt-prime-cuts.js`
2. Replaced pentagon hardcode in `rt-rendering.js` (nGonVertices + 90° rotation)
3. **Commit:** `55ed53e`

### Phase 5: V4+V6 — Add TODO comments for deferred items ✅

1. Added `// TODO: RT-purify` comments to `rt-penrose.js` (2 locations) and `rt-ik-solvers.js` (1 location)
2. Each TODO includes specific RT-purify strategy (spread lookup, decagon vertices, direction+quadrance)
3. **Commit:** `e3ce1d5`

---

## Justified Occurrences (No Action Needed)

### THREE.js Rendering Handoff

| File | Lines | Pattern | Justification |
|---|---|---|---|
| `rt-grids.js` | 67, 82, 88, 95 | `Math.PI / 2` | THREE.js GridHelper rotation — has comment |
| `rt-rendering.js` | 267 | `2 * Math.PI / 1800` | THREE.js orbit speed |
| `rt-rendering.js` | 4167-4169 | `Math.asin(Math.sqrt(s))` | Spread to Euler for THREE.js rotation |
| `rt-rendering.js` | 4283 | `Math.tan(fov * Math.PI / 360)` | THREE.js camera frustum |
| `rt-animate.js` | 120-141 | `Math.acos`, `Math.sin` | SLERP quaternion interpolation for THREE.js camera |

### UX Degree/Radian Boundary

| File | Lines | Pattern |
|---|---|---|
| `rt-thomson.js` | 100-103 | Degree-to-slope — has justification comment |
| `rt-math.js` | 963-975, 1154-1242 | Conversion utilities (these ARE the boundary functions) |
| `rt-coordinates.js` | 149-152 | Degree/spread display conversion |
| `rt-ui-binding-defs.js` | 364-381 | Spread display in slider labels |
| `rt-init.js` | 1502-1679 | Degree-to-radian for sliders |
| `rt-init.js` | 3794-3823 | Mouse rotation gestures |
| `rt-controls.js` | 256, 380, 820, 824 | Gumball controls (UI interaction) |

### Demo/Experimental Modules

| File | Count | Notes |
|---|---|---|
| `rt-rotor-demo.js` | ~20 | Demo module — educational |
| `rt-quadray-rotor.js` | ~15 | Experimental rotor algebra |

---

## Quality Gate Assessment

| Gate | Target | Before Fix | After Phase 1 | After All 5 Phases |
|---|---|---|---|---|
| Prettier Violations | 0 | 13 files | 0 ✅ | 0 ✅ |
| ESLint Errors | 0 | 172 | 4 | 4 (hasOwnProperty in asteroids) |
| ESLint Warnings | <10 | 59 | ~50 | ~50 (mostly experimental modules) |
| Classical Trig (violations) | 0 | ~20 | ~20 | ~7 (V4+V6 deferred with TODOs) |
| Module Boundaries | Clean | Clean | Clean ✅ | Clean ✅ |
| Duplicate Functions | 0 | 0 | 0 ✅ | 0 ✅ |

**Final tally:** 13 of ~20 violations fixed. 7 deferred (Penrose rotation + IK atan2) with actionable TODO comments.

---

## Notes

- The 59 ESLint warnings are mostly in `rt-rotor-demo.js` (experimental) — the 8 listed above are the ones in core modules
- `rt-math.js` itself contains `Math.sin`/`Math.cos`/`Math.PI` in its conversion utilities and cached radical computations — these are the RT-system internals and are justified
- The `Math.sqrt` scan found ~150+ occurrences; the vast majority are at the GPU boundary (Vector3 creation, circumradius, edge length display). No violations found — all are properly deferred
- `rt-penrose.js` also has ~15 premature `Math.sqrt` calls in tile subdivision that could potentially stay in quadrance space longer, but this is a separate optimization task
