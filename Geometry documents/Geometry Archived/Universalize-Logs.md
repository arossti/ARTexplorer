# Workplan: Universalize Polyhedra Console Logs

## Problem

Console logging across polyhedra is **wildly inconsistent**:

| Form | Current Format | Issues |
|------|---------------|--------|
| Cube | `Cube: Expected Q=2.000, Max error=0.00e+0, Face spread S=1` | No title, no construction info, no Schlafli |
| Tetrahedron | One-liner + separate rendering.js block | Split across two files, but rendering.js block is gold standard format |
| Dual Tetrahedron | `Dual Tetrahedron: Expected Q=..., Max error=...` | No face spread, no construction info |
| Octahedron | One-liner with Q, error, spread | Same as cube — no title, no construction |
| Icosahedron | 10-line PurePhi symbolic block + validation | Massive, dumps internal algebra that's useful but overwhelming |
| Dodecahedron | 4-line `[ThreeRT]` header + validation | Different prefix convention, decent structure |
| Dual Icosahedron | 7-line `[ThreeRT]` header + validation | Heavy, includes rotation matrix details |
| Cuboctahedron | 4-line `[ThreeRT]` header + validation | Decent, shows √2 construction |
| Rhombic Dodecahedron | 5-line `[ThreeRT]` header + validation | Decent, shows dual construction |
| Truncated Tet | Conditional one-liners (varies by t) | Different format for t=0, t=0.5, general |
| Geodesics | Multi-line with PurePhi (varies by projection) | Good detail, but varies between geodesic types |
| Compounds | **No logging at all** | Silent by design (internal calls silenced) |
| Tetrahelices | 5-6 line blocks with RT validation | Reasonable, but different convention |

### Key inconsistencies:
1. **No universal title** — some use `===`, some use `[ThreeRT]`, some use `[PurePhi]`, most use nothing
2. **Information varies** — cube gets 1 line, icosahedron gets 11 lines
3. **Missing data** — some skip V/E/F counts, Schlafli symbols, face spread, or construction method
4. **Split concerns** — tetrahedron construction info is in rt-rendering.js, not rt-polyhedra.js
5. **Prefix soup** — `[PurePhi]`, `[ThreeRT]`, `[RT]`, or no prefix at all

## Gold Standard: Tetrahedron (rendering.js block)

```
=== TETRAHEDRON EDGE LENGTH 2 ===
HalfSize (s): 0.7071067811865475
Edge length (2s√2): 2.0000000000000000
OutSphere radius (s√3): 1.2247448713915889
Grid interval (√6/4): 0.6123724356957945
```

What makes this good:
- **Clear `===` title** — scannable, grep-friendly, stands out in console
- **Labeled values with formulas** — `Edge length (2s√2): 2.000...` shows both the algebraic expression AND the numeric value
- **Full precision** — 16 decimal places, respects RT philosophy
- **Relevant derived metrics** — outsphere, grid interval (useful for IVM alignment)

## Proposed Universal Format

### Section 1: Identity (every form)
```
=== TETRAHEDRON {3,3} ===
  Construction: Algebraic (vertices at ±s)
  HalfSize (s): 0.707107
  V: 4, E: 6, F: 4
  Euler: V - E + F = 2 ✓
```

### Section 2: RT Metrics (every form)
```
  Edge Q (8s²): 4.000000
  Edge length (2s√2): 2.000000
  Max Q error: 0.00e+0
  Face spread S: 0.888889 (8/9)
```

### Section 3: Construction Details (form-specific, opt-in)
For phi-based forms (icosahedron, dodecahedron, dual icosahedron):
```
  [PurePhi] φ = (1 + √5)/2 = 1.618033988749895
  [PurePhi] φ² = φ + 1 = 2.618033988749895
  Normalization: 1/√(1 + φ²) = 0.525731112119134
  Identity check: |φ² - (φ + 1)| = 0e+0 ✓
```

For √2-based forms (cuboctahedron, rhombic dodecahedron):
```
  [PureRadicals] √2 = 1.414214 (cached)
  Vertex distance: s/√2 = 0.500000
```

For geodesic forms:
```
  Base: Icosahedron (V: 12, F: 20)
  Subdivision: freq=3, F: 180
  Projection: OutSphere (Fuller geodesic)
  Target Q: 0.001600, r: 0.040000
  Edge Q: avg=0.000251, max error=7.77e-5
```

### Section 4: Sphere Metrics (every closed form)
```
  OutSphere Q (3s²): 1.500000, r: 1.224745
  MidSphere Q (s²): 0.500000, r: 0.707107
  InSphere Q (s²/3): 0.166667, r: 0.408248
```

## Design Principles

1. **Title is always `=== NAME {Schlafli} ===`** — one convention, grep-able
2. **Indented body** — 2-space indent for all detail lines under title
3. **Formulas shown** — `Edge Q (8s²): 4.000` not just `Edge Q: 4.000`
4. **Consistent sections** — Identity → RT Metrics → Construction → Spheres
5. **Opt-in verbosity** — Section 3 (construction) only for forms that need it (phi, √2, geodesic). Simple platonic solids (cube, tet, oct) skip it.
6. **Compounds log their result** — Even though internal calls are silent, the compound itself should log its hull identity
7. **Tetrahelices** — Same pattern: `=== TETRAHELIX-1 (TOROIDAL, 10 TET) ===` with V/E/F and Q validation

## What Each Form Should Report

| Form | Schlafli | Construction Method | Special Constants | Sphere Metrics |
|------|----------|-------------------|-------------------|----------------|
| Cube | {4,3} | Algebraic (±s) | — | Out/Mid/In |
| Tetrahedron | {3,3} | Algebraic (±s) | — | Out/Mid/In |
| Dual Tetrahedron | {3,3} | Algebraic (±s, dual parity) | — | Out/Mid/In |
| Octahedron | {3,4} | Algebraic (±s axis) | — | Out/Mid/In |
| Icosahedron | {3,5} | PurePhi normalization | φ, φ², 1/φ | Out/Mid/In |
| Dodecahedron | {5,3} | PurePhi (cube + phi vertices) | φ, 1/φ | Out/Mid/In |
| Dual Icosahedron | — | PurePhi (scaled icosa) | φ, rotation | Out/Mid/In |
| Cuboctahedron | — | PureRadicals | √2 | Out/Mid/In |
| Rhombic Dodecahedron | — | PureRadicals (dual cubocta) | √2 | Out/Mid/In |
| Truncated Tet | — | Parametric (t) | truncation ratio | — |
| Geodesic Icosa | — | Subdivide + Project | freq, projection | Target Q |
| Geodesic Tet | — | Subdivide + Project | freq, projection | Target Q |
| Geodesic Octa | — | Subdivide + Project | freq, projection | Target Q |
| Compound TT+Icosa | — | Hull of compound | — | — |
| Compound TT+Tet | — | Hull of compound | — | — |
| Tetrahelix 1 | — | Face-bonding chain | chirality, count | — |
| Tetrahelix 2 | — | Javelin chain | strands, bondMode | — |
| Tetrahelix 3 | — | Octahedral seed chain | strands, chirality | — |

## Implementation

### Files to modify:
- `modules/rt-polyhedra.js` — All polyhedra log blocks (~15 functions)
- `modules/rt-helices.js` — All 3 tetrahelix log blocks
- `modules/rt-rendering.js` — Move the tetrahedron `=== EDGE LENGTH ===` block to polyhedra.js (or remove the rendering.js version and let polyhedra.js own all construction logging)

### Helper function (optional):
```javascript
// Could add a shared log formatter to reduce boilerplate:
function logPolyhedronIdentity(name, schlafli, data, options = {}) {
  console.log(`=== ${name} ${schlafli} ===`);
  console.log(`  V: ${data.V}, E: ${data.E}, F: ${data.F}`);
  console.log(`  Euler: V - E + F = ${data.V - data.E + data.F} ${data.V - data.E + data.F === 2 ? '✓' : '✗'}`);
  console.log(`  Edge Q: ${data.edgeQ.toFixed(6)}, Max error: ${data.maxError.toExponential(2)}`);
  if (data.faceSpread !== undefined) {
    console.log(`  Face spread S: ${data.faceSpread.toFixed(6)} (${data.spreadFraction})`);
  }
}
```

### Migration strategy:
1. Create the helper function (or inline the format)
2. Update one form at a time, starting with Platonic solids (simplest)
3. Test each form's console output after modification
4. Move tetrahedron rendering.js block to polyhedra.js
5. Update phi-based forms (icosa, dodec, dual icosa) last (most complex)

## Open Questions

- Should sphere metrics (Out/Mid/In) be logged for every form, or only on request?
- Should construction details (PurePhi, PureRadicals) be a separate verbosity level?
- Should compounds log their component names + hull vertex count?
- Should the helper function live in rt-math.js (shared) or rt-polyhedra.js (local)?
