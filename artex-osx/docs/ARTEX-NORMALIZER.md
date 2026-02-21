# ARTEX-Normalizer: XYZ ↔ Quadray Conversion API

## Status: Design Document (Future Project)

## Motivation

With all 6 Platonic solids now defined in **pure Quadray ABCD** — no `from_cartesian()` anywhere in `platonic.rs` — the only remaining XYZ dependency is the rendering boundary (shader converts ABCD → XYZ for the GPU). This raises a clear architectural question: where should XYZ ↔ Quadray conversion live?

Currently `Quadray::to_cartesian()` and `Quadray::from_cartesian()` are methods on the Quadray struct itself. This works, but conceptually they are a **translation service** between two coordinate languages, not an intrinsic property of Quadray coordinates. As the app grows to support geometry import/export, this translation deserves its own module.

## Core Concept

A standalone **normalizer** API that converts between XYZ Cartesian and Quadray ABCD coordinates, sitting at the boundary between the internal Quadray world and the external XYZ world.

```
External World (XYZ)          normalizer.rs            Internal World (ABCD)
                          ┌─────────────────────┐
  Import geometry    ──→  │  xyz_to_quadray()    │  ──→  Pure ABCD polyhedra
  (OBJ, STL, etc.)       │  quadray_to_xyz()    │  ←──  All computation in ABCD
  Export geometry    ←──  │                      │
  (OBJ, STL, etc.)       │  Normalization:       │
                          │    OPTIONAL           │
                          │    (full 4D± bypasses │
                          │     zero-sum constraint)│
                          └─────────────────────┘
```

## The Normalization Question

### What zero-sum normalization does

Quadray's canonical form subtracts the average from all four components so they sum to zero and the minimum is zero:

```
[1, 0, 0, 0]  →  normalize  →  [3/4, -1/4, -1/4, -1/4]  →  canonical  →  [1, 0, 0, 0]
```

This is **required** for XYZ conversion because the 4D → 3D projection assumes the zero-sum constraint. Without it, the extra degree of freedom (4 components, 3 spatial dimensions) is unresolved.

### Why normalization is optional in the full system

The Quadray system is natively 4D. The four basis vectors A, B, C, D point from tetrahedron center to vertices — a 4-ray coordinate system embedded in 3D space. The zero-sum constraint collapses this to 3 independent dimensions (matching XYZ), but it's an artificial restriction.

**In the full 4D± system:**
- Negative coordinates are meaningful (they extend beyond the origin in the opposite direction of a basis ray)
- The Janus transition (frequency < 0 → negative arena) relies on the full 4D± space
- Normalization destroys information by forcing `min(A,B,C,D) = 0`
- Two distinct 4D± points can normalize to the same canonical Quadray

**For XYZ conversion:** normalization is mandatory — it resolves the extra dimension.
**For internal ABCD computation:** normalization is unnecessary and can lose information.

## API Design

```rust
// normalizer.rs — XYZ ↔ Quadray conversion API

/// Convert XYZ Cartesian coordinates to Quadray ABCD (canonical form).
/// Applies zero-sum normalization + min-shift to canonical form.
pub fn xyz_to_quadray(xyz: [f64; 3]) -> Quadray { ... }

/// Convert Quadray ABCD to XYZ Cartesian coordinates.
/// Applies zero-sum normalization before basis multiplication.
pub fn quadray_to_xyz(q: &Quadray) -> [f64; 3] { ... }

/// Batch convert: transform a mesh of XYZ vertices to Quadray.
/// Preserves topology (edges, faces are index-based, unaffected).
pub fn mesh_xyz_to_quadray(vertices: &[[f64; 3]]) -> Vec<Quadray> { ... }

/// Batch convert: transform Quadray vertices to XYZ for export.
pub fn mesh_quadray_to_xyz(vertices: &[Quadray]) -> Vec<[f64; 3]> { ... }

/// Convert WITHOUT normalization — preserves full 4D± information.
/// Returns zero-sum components (sum = 0) but does NOT shift to canonical form.
/// Useful for Janus transitions and internal 4D± computation.
pub fn xyz_to_quadray_raw(xyz: [f64; 3]) -> [f64; 4] { ... }
```

## Use Cases

### Import (XYZ → Quadray)
- Load OBJ/STL/PLY geometry files (all XYZ)
- Convert vertices to Quadray ABCD via `mesh_xyz_to_quadray()`
- Store and compute in native ABCD
- Topological data (edges, faces) passes through unchanged

### Export (Quadray → XYZ)
- Select geometry in the explorer
- Convert vertices to XYZ via `mesh_quadray_to_xyz()`
- Write to standard format (OBJ, STL, etc.)
- Other tools receive geometry in a language they understand

### Rendering Boundary
- The shader already does this conversion (ABCD → XYZ via BASIS matrix)
- `normalizer.rs` provides the CPU-side equivalent
- Useful for CPU-side hit testing, bounding box computation, etc.

### Janus Transitions
- `xyz_to_quadray_raw()` preserves full 4D± coordinates
- No information loss from canonical-form normalization
- Enables smooth transitions through the origin (positive ↔ negative arena)

## Migration Path

1. **Create `normalizer.rs`** as a module in `rt_math/` (or standalone in `src/`)
2. **Migrate** `Quadray::to_cartesian()` and `Quadray::from_cartesian()` to call normalizer functions
3. **Keep the Quadray methods** as thin wrappers for ergonomics
4. **Add batch conversion** for mesh import/export
5. **Add raw (non-normalized) conversion** for Janus / 4D± work

## Relationship to Existing Code

| Component | Current | After Normalizer |
|-----------|---------|-----------------|
| `Quadray::to_cartesian()` | Inline conversion | Delegates to `normalizer::quadray_to_xyz()` |
| `Quadray::from_cartesian()` | Inline conversion | Delegates to `normalizer::xyz_to_quadray()` |
| `shader.wgsl` | BASIS matrix multiply | Unchanged (GPU-side conversion) |
| `geometry.rs` | Bounding radius via ABCD→XYZ | Could use normalizer for CPU-side |
| `platonic.rs` | **No XYZ anywhere** | Unchanged — pure ABCD |
| Future: OBJ import | Not implemented | `normalizer::mesh_xyz_to_quadray()` |
| Future: OBJ export | Not implemented | `normalizer::mesh_quadray_to_xyz()` |

## Non-Goals (for this module)

- File format parsing (OBJ, STL, PLY) — separate import/export modules
- GPU-side conversion — that stays in `shader.wgsl`
- Quadray arithmetic — that stays in `quadray.rs`
- Polyhedron generation — that stays in `rt_polyhedra/`

## Key Insight

The normalizer is a **language translator**, not a math library. It exists because the external world speaks XYZ and our internal world speaks ABCD. The translation is mechanical (a linear transform + optional normalization), but isolating it as a standalone service keeps the ABCD world pure and makes the XYZ dependency explicit and contained.

The long-term goal: when we build a Quadray-native rendering pipeline (ABCD → clip space directly, folding the Tom Ace basis into the camera matrix per ARTEX-RATIONALE.md §4), the normalizer's `quadray_to_xyz()` becomes export-only. The rendering path never touches XYZ at all.
