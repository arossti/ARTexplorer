# Tetrahelix Implementation Guide

## Quick Reference

**Module**: `modules/rt-helices.js`
**Status**: ✅ Implemented (Feb 3, 2026)
**Variants**: tetrahelix1 (toroidal), tetrahelix2 (linear javelin), tetrahelix3 (octahedral seed)

### Background & References

- **Requested By:** Bonnie DeVarco (BFI Archivist) - External Research Request
- **Discussed With:** Gary Doskas - Parent/child local space algorithm insights
- **Fuller Reference:** Synergetics 930.00 - Tetrahelix as fundamental geometric form
- **Also Known As:** Boerdijk-Coxeter helix, tetrahelical chain

---

## What is a Tetrahelix?

A **tetrahelix** is formed by chaining tetrahedra face-to-face:

1. Start with a seed tetrahedron
2. Attach successive tetrahedra sharing exactly one triangular face
3. The structure naturally spirals due to the tetrahedral dihedral angle
4. Close packing of nodal spheres is respected

---

## RT-Pure Constants

These constants are defined in `rt-helices.js` as `RT_CONSTANTS`:

```javascript
const RT_CONSTANTS = {
  // Spread values (s = sin²θ)
  DIHEDRAL_SPREAD: 8 / 9,        // arccos(1/3) ≈ 70.53°
  TETRAHEDRAL_SPREAD: 8 / 9,     // arccos(-1/3) ≈ 109.47°
  FACE_SPREAD: 3 / 4,            // sin²(60°) for equilateral △

  // Quadrance ratios
  APEX_Q_RATIO: 2 / 3,           // Q_apex / Q_edge
  FACE_CENTROID_Q_RATIO: 1 / 3,  // Q_centroid_to_vertex / Q_edge

  // Golden ratio (for icosahedral applications)
  PHI: (1 + Math.sqrt(5)) / 2,
  PHI_SQUARED: φ + 1,            // Identity: φ² = φ + 1
  INV_PHI: φ - 1,                // Identity: 1/φ = φ - 1
};
```

### Dihedral Spread Derivation

The tetrahedral dihedral angle θ satisfies cos θ = 1/3:
```
s = sin²θ = 1 - cos²θ = 1 - (1/3)² = 1 - 1/9 = 8/9 ✓
```

### Complete RT Property Table

| RT Property | Value | Derivation |
|-------------|-------|------------|
| **Dihedral Spread** | **8/9** | s = 1 - (1/3)² from cos θ = 1/3 |
| **Face Spread** | **3/4** | sin²(60°) = 3/4 |
| **Tetrahedral Angle Spread** | **8/9** | Supplement of dihedral |
| **Edge Quadrance** | **8s²** | Q = L² where L = 2√2·s |
| **Apex Quadrance** | **(2/3)·Q_edge** | Height from face to apex |

### Key RT Relationships

1. **Dihedral and tetrahedral angles share spread 8/9** (supplementary angles)
2. **Apex distance**: `Q_apex = (2/3) × Q_edge`
3. **Reflection formula**: `predApex = 2 × faceCentroid - apex`

---

## Geometric Properties

| Property | Value | Notes |
|----------|-------|-------|
| **Dihedral angle** | arccos(1/3) ≈ 70.53° | Between adjacent faces |
| **Twist per tet** | ~131.81° | Rotation around helix axis |
| **Toroidal period** | ~48 tetrahedra | Near-closure with small gap |
| **Vertices per tet** | 4 total, 3 shared | Only 1 new vertex per step |

---

## Implementation: The Javelin Model

### Core Insight: Reflection-Based Backward Generation

For bi-directional chains ("javelin through origin"), the backward chain is generated using **reflection**:

```javascript
// Forward: newApex = faceCentroid + normal × apexDistance
// Backward: predApex = 2 × faceCentroid - currentApex (reflection!)
```

This is the exact mathematical inverse of forward generation.

### Algorithm

```javascript
const generateBackwardChain = (startVerts, startIndices, numTets) => {
  let currentVerts = [...startVerts]; // [v0, v1, v2, apex]

  for (let i = 0; i < numTets; i++) {
    const [v0, v1, v2, apex] = currentVerts;
    const entryCentroid = centroid(v0, v1, v2);

    // REFLECTION: predecessor apex = 2 × entryCentroid - apex
    const predApex = new THREE.Vector3(
      2 * entryCentroid.x - apex.x,
      2 * entryCentroid.y - apex.y,
      2 * entryCentroid.z - apex.z
    );

    // Next iteration
    currentVerts = [predApex, v0, v1, v2];
  }
};
```

### Why It Works

1. **Mathematical consistency**: Reflection is the exact inverse of apex placement
2. **Chain continuity**: Each predecessor shares exactly 3 vertices with successor
3. **Chirality preservation**: Not flipping anything, computing what was already there
4. **Straight line**: Both directions are part of the same infinite helix

### Dual Tetrahedron Seed

The javelin uses a **dual tetrahedron** at origin as the hub:

```
Vertices point along Quadray axes:
  V0: (+s, +s, +s)  → QX axis (Red/A)
  V1: (+s, -s, -s)  → QZ axis (Green/B)
  V2: (-s, +s, -s)  → QY axis (Blue/C)
  V3: (-s, -s, +s)  → QW axis (Yellow/D)
```

Each face is perpendicular to one axis, making it the natural hub for all eight directions (QW±, QX±, QY±, QZ±).

---

## Implemented Variants

### Tetrahelix 1: Toroidal
- Left-handed chirality (right-handed self-intersects at step 12)
- Max 48 tetrahedra (approaches torus closure)
- Single direction generation

### Tetrahelix 2: Linear Javelin
- Bi-directional from dual tetrahedron seed
- +/- toggles for each half
- Max 145 tetrahedra (72 per direction)
- Multi-strand support (zipped/unzipped modes)

### Tetrahelix 3: Octahedral Seed
- 8 strands radiating from octahedron faces (A-H)
- Per-strand chirality control (RH/LH)
- Independent strand enable/disable

---

## Future Applications

### Icosahedral Tetrahelix Networks

Tetrahelixes can serve as **edges** in larger structures:

1. **Icosahedral frame**: 30 edges, each a tetrahelix chain
2. **Virus capsid modeling**: T-number triangulation with helical substructure
3. **Geodesic connectors**: Tetrahelix chains connecting geodesic vertices

The `RT_CONSTANTS.PHI` values support icosahedral geometry:
```javascript
// Icosahedron vertices use golden ratio
const icosaVertex = [0, 1, RT_CONSTANTS.PHI];  // Example
```

### Hierarchical Structures

- **Tetrahelix-as-edge**: Connect tetrahelix endpoints to form larger polyhedra
- **Fractal chains**: Each tetrahedron contains a miniature tetrahelix
- **Space-filling**: Explore tetrahelix packing arrangements

### Biological Modeling

- **Collagen triple helix**: Similar geometry to tetrahelix
- **Viral capsid proteins**: Helical arrangements in capsomeres
- **DNA-like structures**: Unzipped mode mimics double helix

---

## UI Controls

### Tetrahelix 2 (Linear)

| Control | Function |
|---------|----------|
| **Count slider** | 1-145 tetrahedra |
| **Axis (QW/QX/QY/QZ)** | Javelin direction |
| **Dir +/-** | Show/hide each half |
| **Strands (1-4)** | Multi-strand mode |
| **Mode (Zipped/Unzipped)** | Radial spines vs parallel chains |

### Tetrahelix 3 (Octahedral)

| Control | Function |
|---------|----------|
| **Count slider** | 1-145 per strand |
| **Strands A-H** | Enable/disable each |
| **Chirality A-H** | RH/LH per strand |

---

## Code Location

```
modules/rt-helices.js
├── RT_CONSTANTS          # RT-pure constants
├── HelixHelpers          # Shared utility functions
├── Helices.tetrahelix1   # Toroidal variant
├── Helices.tetrahelix2   # Linear javelin
└── Helices.tetrahelix3   # Octahedral seed
```

---

## Version History

- **Feb 3, 2026**: Reflection-based backward generation breakthrough
- **Feb 3, 2026**: +/- toggles wired, max count extended to 145
- **Feb 3, 2026**: RT_CONSTANTS added with phi identities
- **Jan 2026**: Initial tetrahelix1, tetrahelix2, tetrahelix3 implementation
