# Project Streamline: Unified Python/JavaScript Prime Polygon Search

**Created**: 2026-02-07
**Status**: COMPLETE (with post-mortem findings)
**Goal**: Reproduce Prime-Projection-Conjecture.tex results in ARTexplorer without translation errors

> **⚠️ Feb 2026 Discovery**: The display scaling issue stems from an **icosahedron circumradius miscalculation** in compound construction—NOT a Quadray translation problem. See [Post-Mortem](#post-mortem-display-scaling-discrepancy-feb-2026) for details.

---

## Results Summary

All prime polygons found and verified:

| Prime | Polygon | Projections Found | Verification |
|-------|---------|-------------------|--------------|
| 5 | Pentagon | 145 | PASS |
| 7 | Heptagon | 438,406 | PASS |
| 11 | Hendecagon | 36,360 | PASS |
| 13 | Tridecagon | 4,347 | PASS |

**Output file**: `prime_projections_verified.json`

---

## Problem Statement

The current Python search script (`scripts/prime_projection_search.py`) and JavaScript visualization (`modules/rt-projections.js`) use **different polyhedra constructions**, causing:
- Vertex orientation mismatches
- Hull counts that don't reproduce between environments
- 48+ hours debugging translation issues

**Root Cause**: Two separate implementations of the same geometry.

---

## Solution: Single Source of Truth

**Port JavaScript RT methods to Python, not the other way around.**

The JavaScript codebase (`rt-math.js`, `rt-polyhedra.js`) is:
- Battle-tested in production
- Uses RT principles (spread, quadrance, phi identities)
- Has established precision (15 decimal places via PurePhi)

---

## Phase 1: Port RT-Math to Python

Create `scripts/rt_math.py` with direct ports from `modules/rt-math.js`:

### Required Functions
```python
# From RT.PurePhi
PHI = (1 + sqrt(5)) / 2      # Golden ratio
PHI_SQ = PHI + 1             # Identity: φ² = φ + 1 (NOT φ * φ)
INV_PHI = PHI - 1            # Identity: 1/φ = φ - 1 (NOT 1 / φ)

# From RT core
def quadrance(p1, p2):
    """Q = distance² (no sqrt)"""
    return (p2[0]-p1[0])**2 + (p2[1]-p1[1])**2 + (p2[2]-p1[2])**2

def spread(v1, v2):
    """s = 1 - (v1·v2)² / (|v1|²|v2|²)"""
    dot = sum(a*b for a,b in zip(v1, v2))
    q1 = sum(a*a for a in v1)
    q2 = sum(b*b for b in v2)
    return 1 - (dot*dot) / (q1*q2)

def spread_to_sin_cos(s):
    """Convert spread to sin/cos: sin=√s, cos=√(1-s)"""
    return sqrt(s), sqrt(1-s)
```

### Rotation Matrix (ZYX Euler from spreads)
Use existing `_getProjectionPlaneBasis()` logic from `rt-projections.js`.

---

## Phase 2: Port Polyhedra to Python

Create `scripts/rt_polyhedra.py` with **exact copies** from `modules/rt-polyhedra.js`:

### Required Polyhedra

| Shape | Source | Vertices |
|-------|--------|----------|
| Tetrahedron | `Polyhedra.tetrahedron()` | 4 |
| Truncated Tetrahedron | `RT.ProjectionPolygons.heptagon.sourceVertices()` | 12 |
| Icosahedron | `Polyhedra.icosahedron()` | 12 |

**Critical**: Copy vertex arrays VERBATIM. No re-derivation.

```python
# Truncated Tetrahedron - EXACT copy from rt-math.js:1768
TRUNC_TET_VERTICES = [
    [1, 1, 3], [1, 3, 1], [3, 1, 1],
    [1, -1, -3], [1, -3, -1], [3, -1, -1],
    [-1, 1, -3], [-1, 3, -1], [-3, 1, -1],
    [-1, -1, 3], [-1, -3, 1], [-3, -1, 1],
]

# Tetrahedron - EXACT copy from rt-polyhedra.js:122
TET_VERTICES = [
    [-1, -1, -1], [1, 1, -1], [1, -1, 1], [-1, 1, 1],
]

# Icosahedron - from rt-polyhedra.js:370 (using a,b from phi)
# a = 1/√(1 + φ²), b = φ/√(1 + φ²)
```

---

## Phase 3: Simplified Search Axes

**Skip Quadray translation entirely.** Use cube-diagonal viewing axes:

```python
# Cube diagonal = (1,1,1)/√3 - equivalent to Quadray W-axis
# This gives RT-pure viewing angles without WXYZ conversion

VIEWING_AXES = {
    'cube_diagonal_ppp': [1, 1, 1],    # +W equivalent
    'cube_diagonal_pmm': [1, -1, -1],  # +X equivalent
    'cube_diagonal_mpm': [-1, 1, -1],  # +Y equivalent
    'cube_diagonal_mmp': [-1, -1, 1],  # +Z equivalent
}
```

Rotation spreads remain the same: s₁, s₂, s₃ ∈ [0, 1].

---

## Phase 4: Re-Run Search

With unified definitions, search for prime hulls:

```bash
python scripts/prime_search_streamlined.py \
    --polyhedra truncated_tetrahedron,trunc_tet_plus_tet,trunc_tet_plus_icosa \
    --primes 5,7,11,13 \
    --precision 2
```

**Output**: JSON with spreads that DIRECTLY work in JavaScript.

---

## Phase 5: Verify in JavaScript

1. Load search results JSON
2. Apply spreads to existing scene polyhedra
3. Confirm hull counts match

**No coordinate translation needed** - same definitions in both languages.

---

## Files to Create

| File | Purpose |
|------|---------|
| `scripts/rt_math.py` | Port of `modules/rt-math.js` core functions |
| `scripts/rt_polyhedra.py` | Port of polyhedra from `modules/rt-polyhedra.js` |
| `scripts/prime_search_streamlined.py` | New search using unified definitions |

---

## Files to Reference (Do Not Recreate)

- `Geometry documents/Prime-Projection-Conjecture.tex` - Target results to reproduce
- `Geometry documents/Polygon-Rationalize.md` - RT polygon theory
- `modules/rt-math.js` - Source of truth for RT functions
- `modules/rt-polyhedra.js` - Source of truth for geometry

---

## Success Criteria

1. ✅ `prime_search_streamlined.py` outputs JSON
2. ✅ JSON spreads produce correct hulls in JavaScript **without modification**
3. ✅ 5-gon, 7-gon verified
4. ✅ 11-gon, 13-gon verified

---

## KISS Principles

- **One source of truth**: JavaScript definitions, ported to Python
- **No Quadray in search**: Use cube-diagonals for equivalent views
- **Literal vertex copies**: No re-derivation, no "equivalent" constructions
- **Spread-based rotations**: Same math in both languages
- **Minimal translation**: Search output → direct JavaScript input

---

## Post-Mortem: Display Scaling Discrepancy (Feb 2026)

### Observed Problem

Prime polygon presets (`_getPrimePresetVertices()` in `rt-projections.js`) produce **correct hull counts** but render at **wrong visual scale** compared to scene polyhedra.

The "fix" proposed was display-only scaling after hull calculation. But this treats the symptom, not the cause.

### Root Cause Investigation

**Question**: Why do we need different vertex definitions at all? Hull counts are topological—uniform scaling should not change them.

**Findings**:

#### 1. Quadray→Cartesian Produces Identical Vertices

The Quadray truncated tetrahedron `{2,1,0,0}` permutations convert to the SAME Cartesian vertices as the Python/preset definitions:

| Quadray | Basis Expansion | Cartesian |
|---------|-----------------|-----------|
| `[2,1,0,0]` | `2(1,1,1) + 1(1,-1,-1)` | `(3,1,1)` |
| `[2,0,1,0]` | `2(1,1,1) + 1(-1,1,-1)` | `(1,3,1)` |
| `[2,0,0,1]` | `2(1,1,1) + 1(-1,-1,1)` | `(1,1,3)` |

The 12 vertices match the Python set `{±1,±1,±3}` permutations—just enumerated differently.

**Quadray basis vectors** (from `rt-quadray-polyhedra.js:43-48`):
```javascript
const QUADRAY_BASIS = {
  w: new THREE.Vector3(1, 1, 1),   // cube diagonal (√3 length)
  x: new THREE.Vector3(1, -1, -1),
  y: new THREE.Vector3(-1, 1, -1),
  z: new THREE.Vector3(-1, -1, 1),
};
```

These are the **cube diagonals** as specified—no Quadray coordinate translation required.

#### 2. The Actual Bug: Icosahedron Circumradius Miscalculation

**Python/Preset code** (`rt_polyhedra.py:185`, `rt-projections.js:533`):
```python
icosa_radius = PHI / sqrt(one_plus_phi_sq)  # ≈ 0.8507
```

**But** the actual icosahedron vertices with standard normalization are at distance **1.0** from origin:
```
Vertex [0, a, b] where a = 1/√(1+φ²), b = φ/√(1+φ²)
Distance = √(a² + b²) = √((1 + φ²)/(1 + φ²)) = 1.0
```

**Scene compound code** (`rt-quadray-polyhedra.js:764-771`):
```javascript
icosaRaw.vertices.forEach(v => {
  const r = v.length();
  if (r > icosaCircumradius) icosaCircumradius = r;
});
// icosaCircumradius = 1.0 (CORRECT)
```

**Result**:
- Python/presets scale icosahedron by `√11 / 0.8507 ≈ 3.898` (WRONG radius assumption)
- Scene compounds scale by `√11 / 1.0 ≈ 3.317` (CORRECT radius calculation)

This means the compounds have **different relative proportions**, producing different hull counts.

#### 3. Why the Bug "Works"

The Python search found primes using the incorrect 0.8507 scaling. The spreads that produce 11-gon and 13-gon hulls depend on this specific (wrong) relative scaling between truncated tetrahedron and icosahedron.

When scene compounds use the correct 1.0 scaling, the relative vertex positions change, and those spreads no longer produce the same hulls.

### The Real Problem

**It's not about display scaling—it's about compound construction consistency.**

The preset vertices and scene compounds use fundamentally different icosahedron scaling:
- Presets: `b ≈ 0.8507` (the φ-coordinate value, NOT the vertex distance)
- Scene: `1.0` (the actual vertex distance from origin)

### Resolution Options

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Match preset bug** | Change scene compounds to use `b` as circumradius | Maintains found primes | Propagates incorrect math |
| **B: Fix presets** | Use correct circumradius, re-run search | Mathematically correct | Loses current prime spreads |
| **C: Use scene vertices** | Extract from scene polyhedra at runtime | Single source of truth | Requires new search |

**Recommended**: Option C—use `_getWorldVerticesFromGroup()` (already exists at line 300) on the scene polyhedra, then search for prime-producing spreads with those ACTUAL vertices. This eliminates the parallel vertex definitions entirely.

### Architectural Lesson

The goal of Project-Streamline was "same definitions in both languages." But we created TWO parallel definitions:
1. Hardcoded preset vertices for projection calculation
2. Scene-rendered polyhedra from `rt-quadray-polyhedra.js`

When these diverge (even subtly, as with circumradius calculation), the projection visualization doesn't match the scene geometry.

**The fix isn't scaling—it's unification.** One vertex source, used everywhere.

---

## Next Steps (Feb 2026 Update)

### Completed: Parametric Truncation

Added `Polyhedra.truncatedTetrahedron(halfSize, truncation)` to base polyhedra:

| Parameter | Result |
|-----------|--------|
| `t = 0` | Base tetrahedron (4 vertices) |
| `t = 1/3` | Standard truncated tetrahedron (12 vertices) |
| `t = 0.5` | Octahedron limit (6 vertices) |

**Files modified:**
- `modules/rt-polyhedra.js` - Added `truncatedTetrahedron()` function
- `scripts/rt_polyhedra.py` - Matching Python implementation
- `index.html` - Truncation toggle + slider in Tetrahedron UI
- `modules/rt-ui-binding-defs.js` - Control bindings
- `modules/rt-rendering.js` - Rendering integration

This provides a **single source of truth** using base `Polyhedra.tetrahedron()` with truncation, avoiding Quadray-derived variants with normalization issues.

### Completed: Base Compound Polyhedra (Feb 2026)

Added `Polyhedra.compoundTruncTetTet()` and `Polyhedra.compoundTruncTetIcosa()` to rt-polyhedra.js:
- Match Python `rt_polyhedra.py` exactly
- No Quadray normalization
- Icosahedron scaled to match TruncTet circumradius (√11)

**Files modified:**
- `modules/rt-polyhedra.js` - Added compound functions
- `modules/rt-rendering.js` - Compound checkboxes now use base functions
- `modules/rt-prime-cuts.js` - Pentagon preset uses base tetrahedron

### Current Status (Feb 2026 Testing)

**Observation:** Pentagon preset produces 9-gon hull instead of expected 5-gon.

**Root cause:** The old spreads `[0.01, 0.5, 0]` were found with Quadray-normalized geometry. Now that we use base geometry (correct), the spreads are stale.

**What works:**
- Projection rays correctly target base truncated tetrahedron vertices
- Truncation slider properly forces t=1/3
- Single source of truth architecture is in place

**What doesn't work:**
- Quadray Truncated Tetrahedron still renders in scene (too large, different scale)
- Hull counts don't match because spreads need re-searching

### HANDOFF: Remaining Work

1. **CRITICAL: Remove Quadray TruncTet from prime projection pipeline**
   - The `showQuadrayTruncatedTet` checkbox still renders the old Quadray form
   - Prime presets should ONLY use base tetrahedron with truncation
   - Remove or hide the Quadray TruncTet checkbox for prime projection use cases
   - Files to modify: `rt-prime-cuts.js`, `rt-rendering.js`, potentially `index.html`

2. **Re-run Python search** with unified vertex definitions:
   ```bash
   python scripts/prime_search_streamlined.py \
       --primes 5,7,11,13 \
       --precision 2
   ```
   This will find NEW spreads that work with base geometry.

3. **Update preset spreads** with results from step 2

4. **Verify hull counts** in JavaScript match Python results exactly

### Architecture Notes

The truncation slider demonstrates the continuous transformation:
- Tetrahedron → Truncated Tetrahedron → Octahedron

This is geometrically elegant: at `t=1/3`, the hexagonal faces are regular and meet the triangular cut faces at edge midpoints. At `t=0.5`, the cut faces meet at vertices, producing the octahedron (dual relationship).

For prime polygon searches, use `t=1/3` with `half_size=3.0` to get the canonical [±1, ±1, ±3] vertex coordinates that match the original hardcoded definitions.
