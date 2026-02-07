# Project Streamline: Unified Python/JavaScript Prime Polygon Search

**Created**: 2026-02-07
**Status**: COMPLETE
**Goal**: Reproduce Prime-Projection-Conjecture.tex results in ARTexplorer without translation errors

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
