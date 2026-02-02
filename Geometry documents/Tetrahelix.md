# Tetrahelix Implementation Roadmap

## Quick Start for New Agent

**Branch**: `Tetrahelix`
**Status**: 🆕 Planning Phase
**Goal**: Implement Tetrahelix as a new Base Form with RT-pure construction

### TL;DR - What This Document Covers

This document specifies a **Tetrahelix** (tetrahedral helix) generator for ARTexplorer:

1. **Chains tetrahedra** face-to-face in a helical spiral pattern
2. **RT-Pure construction** using rational trigonometry (quadrance, spread)
3. **New module** `modules/rt-helices.js` for helix-class geometry
4. **UI section** "Helices" placed underneath "Radial Matrices" in sidebar

### Background & References

- **Requested By:** Bonnie DeVarco (BFI Archivist) - External Research Request
- **Discussed With:** Gary Doskas - Parent/child local space algorithm insights
- **Fuller Reference:** Synergetics 930.00 - Tetrahelix as fundamental geometric form
- **Documentation:** See `Geometry documents/Geometry Archived/^DEV-PRIVATE.md` §11.4.1, §11.5.3

---

## What is a Tetrahelix?

A **tetrahelix** (also called a Boerdijk-Coxeter helix or tetrahelical chain) is formed by:

1. Starting with a single tetrahedron (the "seed")
2. Attaching successive tetrahedra face-to-face
3. Each new tetrahedron shares exactly one triangular face with the previous one
4. The structure naturally spirals due to the dihedral angle of regular tetrahedra

### Geometric Properties

| Property | Value | Notes |
|----------|-------|-------|
| **Dihedral angle** | arccos(1/3) ≈ 70.5288° | Angle between adjacent faces |
| **Twist per tetrahedron** | ~131.81° | Rotation around helix axis |
| **Period** | ~112 tetrahedra for near-closure | Forms torus with small gap at 112 units |
| **Vertices per tetrahedron** | 4 total, 3 shared with previous | Only 1 new vertex per step |

**Important Note on Closure:** Fuller imagined these helixes fitting in a tube (per Joe Chilton who worked with Fuller). However, our group has determined that a tetrahelix naturally comes around into a **torus with a small gap at approximately 112 unit tetrahedra**. This near-closure is what we wish to explore - the mathematical relationship between the dihedral angle and the torus periodicity.

### RT-Pure Representation

Using Rational Trigonometry:

- **Edge Quadrance:** Q = 8s² where s = halfSize (same as base tetrahedron)
- **Face Spread:** S = 8/9 (characteristic of equilateral triangles)
- **Dihedral Spread:** S_d = 1 - (1/3)² = 8/9

---

## Implementation Architecture

### New Module: `modules/rt-helices.js`

Create a new module specifically for helix-class geometry. This keeps the code modular and allows for future helix variants (e.g., different base polyhedra, chirality options).

```javascript
// modules/rt-helices.js
// ========================================================================
// RT-HELICES.JS - Helical Geometry Generators
// ========================================================================
// Generates helical chains of polyhedra using face-sharing algorithms
// RT-Pure: Uses quadrance and spread throughout
//
// See: Geometry documents/Tetrahelix.md for specification
// ========================================================================

import * as THREE from "three";
import { RT, Quadray } from "./rt-math.js";
import { Polyhedra } from "./rt-polyhedra.js";

export const Helices = {
  /**
   * Generate a tetrahelix (chain of face-sharing tetrahedra)
   *
   * Uses face-normal driven generation: the outward normal of the chosen face
   * points to the apex of the next tetrahedron, while the 3 face vertices are shared.
   *
   * @param {number} halfSize - Half-size of base tetrahedron (same as Polyhedra.tetrahedron)
   * @param {Object} options
   * @param {number} options.count - Number of tetrahedra in chain (default: 10, max: 144)
   * @param {string} options.startFace - Initial face to grow from: 'A', 'B', 'C', or 'D' (default: 'A')
   * @param {boolean} options.leftHanded - Chirality (default: false = right-handed)
   * @returns {Object} { vertices, edges, faces, metadata }
   */
  tetrahelix: (halfSize = 1, options = {}) => {
    const count = Math.min(options.count || 10, 144);
    const startFace = options.startFace || 'A';
    const leftHanded = options.leftHanded || false;

    // Face definitions for tetrahedron (opposite vertex)
    // Face A (opposite V0): [V1, V2, V3]
    // Face B (opposite V1): [V0, V2, V3]
    // Face C (opposite V2): [V0, V1, V3]
    // Face D (opposite V3): [V0, V1, V2]

    // Implementation using stepper algorithm
    // See "Stepper Algorithm" section below

    return { vertices, edges, faces, metadata };
  },
};
```

### UI Section: "Helices"

Add new collapsible section in `index.html` **after** "Radial Matrices":

```html
<!-- ========================================
     HELICES
     ======================================== -->
<div class="control-group">
  <h3>
    <span class="section-toggle collapsed" data-target="helices-section"></span>
    Helices
  </h3>
  <div id="helices-section" class="section-content collapsed">
    <!-- Tetrahelix -->
    <div class="control-item">
      <label class="checkbox-label">
        <input type="checkbox" id="showTetrahelix" />
        Tetrahelix
      </label>
      <div id="tetrahelix-controls" class="geodesic-options" style="display: none">
        <!-- Count slider (0-144 for torus exploration) -->
        <div class="matrix-control-item">
          <label class="matrix-size-label">Count</label>
          <div class="slider-container">
            <input type="range" id="tetrahelixCountSlider" min="1" max="144" step="1" value="10" />
            <span class="slider-value" id="tetrahelixCountDisplay">10</span>
          </div>
        </div>
        <!-- Start face selection (A, B, C, D) - Radio buttons like geodesic projection -->
        <div class="matrix-control-item">
          <label class="matrix-size-label">Start Face</label>
          <label class="geodesic-projection-option">
            <input type="radio" name="tetrahelixStartFace" value="A" checked /> A
          </label>
          <label class="geodesic-projection-option">
            <input type="radio" name="tetrahelixStartFace" value="B" /> B
          </label>
          <label class="geodesic-projection-option">
            <input type="radio" name="tetrahelixStartFace" value="C" /> C
          </label>
          <label class="geodesic-projection-option">
            <input type="radio" name="tetrahelixStartFace" value="D" /> D
          </label>
        </div>
        <!-- Chirality -->
        <label class="checkbox-label matrix-checkbox-label">
          <input type="checkbox" id="tetrahelixLeftHanded" />
          Left-handed (mirror)
        </label>
        <p class="matrix-info-text">
          Boerdijk-Coxeter helix (~112 for torus near-closure)
        </p>
      </div>
    </div>

    <!-- Future: Other helix types -->
  </div>
</div>
```

---

## Stepper Algorithm

### Core Concept: Face-Normal Driven Generation

The tetrahelix is generated by a simple but elegant "stepper" principle:

1. **Start with one tetrahedron** (the "seed")
2. **Choose a face** - this determines the direction the helix will grow
3. **The face normal points to the 4th vertex** of the next tetrahedron
4. **The 3 vertices of the chosen face are shared** with the next tetrahedron
5. **Repeat** - each new tetrahedron builds on this same logic

### Key Insight: Face Normal = Next Apex Direction

When you select a face (A, B, C, or D) of the current tetrahedron:
- The **outward normal** of that face points exactly to where the **4th vertex** (apex) of the next tetrahedron will be placed
- The **3 vertices defining the chosen face** become 3 of the 4 vertices of the next tetrahedron
- Only **1 new vertex** is generated per step (the apex in the normal direction)

This creates the characteristic slow-revolving helix visible in the edge connections, where consecutive tetrahedra share faces and the structure spirals around an implied central axis.

### Face Selection Determines Direction

The face chosen for "next" generation determines:
- **Direction of travel** - which way the helix extends
- **Chirality** - right-handed vs left-handed spiral
- **Non-intersection guarantee** - the next tetrahedron should never cross or self-intersect any previously generated tetrahedra

Face labels (A, B, C, D) correspond to the 4 faces of a tetrahedron, each opposite one vertex:
- **Face A** (opposite vertex 0): defined by vertices [1, 2, 3]
- **Face B** (opposite vertex 1): defined by vertices [0, 2, 3]
- **Face C** (opposite vertex 2): defined by vertices [0, 1, 3]
- **Face D** (opposite vertex 3): defined by vertices [0, 1, 2]

### Generation Algorithm

```javascript
function generateTetrahelix(seedTetra, count, startFace = 'A') {
  const allVertices = [...seedTetra.vertices];
  const allEdges = [...seedTetra.edges];
  const allFaces = [...seedTetra.faces];

  let currentTetra = seedTetra;
  let exitFace = startFace; // User-selectable: A, B, C, or D

  for (let i = 1; i < count; i++) {
    // Get the 3 vertices of the exit face (these will be shared)
    const sharedVertexIndices = getFaceVertices(currentTetra, exitFace);
    const sharedVertices = sharedVertexIndices.map(idx => currentTetra.vertices[idx]);

    // Calculate face centroid and outward normal
    const faceCentroid = calculateCentroid(sharedVertices);
    const faceNormal = calculateFaceNormal(sharedVertices); // Outward-pointing

    // The apex of the next tetrahedron is at:
    // centroid + (normal * distance_to_apex)
    // For regular tetrahedra, this distance is derived from edge length
    const apexDistance = calculateApexDistance(edgeLength);
    const newApex = faceCentroid.clone().add(faceNormal.multiplyScalar(apexDistance));

    // Create next tetrahedron
    // - 3 vertices from shared face (already in allVertices)
    // - 1 new vertex (the apex)
    const newApexIndex = allVertices.length;
    allVertices.push(newApex);

    // Add new edges (apex to each shared vertex)
    sharedVertexIndices.forEach(idx => {
      allEdges.push([idx, newApexIndex]);
    });

    // Add new faces (3 new faces, shared face is internal)
    // ... face winding logic

    // Determine next exit face (the one NOT shared with previous)
    // This is always the face opposite the new apex
    exitFace = getOppositeFace(exitFace); // Cycles through faces

    currentTetra = getLastTetrahedron(); // Update reference
  }

  return { vertices: allVertices, edges: allEdges, faces: allFaces };
}
```

### Apex Distance Calculation (RT-Pure)

For a regular tetrahedron with edge length L (quadrance Q = L²):
- Face centroid to opposite vertex distance = L × √(2/3)
- In RT terms: **Q_apex = (2/3) × Q_edge**

```javascript
// RT-pure calculation
const Q_edge = 8 * halfSize * halfSize; // From base tetrahedron
const Q_apex_distance = (2/3) * Q_edge;
const apexDistance = Math.sqrt(Q_apex_distance);
```

---

## Tetrahelix Variants

We implement tetrahelices as numbered variants, each exploring different geometric behaviors:

### Tetrahelix 1: Toroidal (Left-Handed)

**Goal:** Explore torus near-closure behavior

- **Chirality:** Left-handed only (right-handed self-intersects at step 12)
- **Max Count:** 48 (approaches torus closure with small gap)
- **Face cycling:** 0→2→1→0 (left-handed pattern)

**Finding (Feb 1, 2026):** With left-handed chirality, the tetrahelix approaches closure into a torus at **48 tetrahedra** with a small visible gap near the origin.

- 48 = 16 × 3 (exactly 16 complete face cycles)
- RT validation passes with excellent precision (max error ~8e-15)
- Stats at N=48: 51 vertices, 147 edges, 192 faces
- Effective rotation per face cycle ≈ 360°/16 = 22.5°

### Tetrahelix 2: Linear with Multi-Strand Option

**Goal:** Explore linear extension with bonded parallel strands

- **Max Count:** 96 (sufficient for linear exploration)
- **Face cycling:** Always exits through face 0 (creates zigzag pattern)
- **Behavior:** Extends in a roughly linear zigzag rather than curving back
- **Strands:** 1-4 parallel helices face-bonded to primary

**Implementation (Feb 1, 2026):** By always exiting through face 0 (relative to the new tetrahedron's local ordering), the chain extends in a zigzag pattern rather than spiraling back into a torus. This creates an approximately linear structure.

#### Multi-Strand Architecture

As the linear tetrahelix extends, each tetrahedron in the primary chain has **3 exposed faces** (the 4th face is shared with the previous/next tetrahedron). These exposed faces provide bonding opportunities for parallel secondary strands:

```
        [Primary Strand - Face 0 exit pattern]
           ↓
    ┌──────┼──────┐
    │      │      │
  Face 1  Face 2  Face 3 (entry/exit)
    │      │
    ↓      ↓
 Strand 2  Strand 3
    │
    ↓
 Strand 4 (bonded to Strand 2)
```

**Strand Configuration:**
- **1 strand:** Primary only (current implementation)
- **2 strands:** Primary + one bonded strand (double helix)
- **3 strands:** Primary + two bonded strands (triple helix, "3 around 1")
- **4 strands:** Primary + three bonded strands (quad configuration)

**UI Control:** Radio buttons or slider for strand count (1-4)

#### Bonding Modes: Zipped vs Unzipped

**"Zipped" Mode (Current Implementation):**
Each secondary strand is generated by bonding single tetrahedra to each exposed face of the primary spine:
1. Iterating through tetrahedra of the primary strand
2. For each tetrahedron, identifying the exposed face(s) to bond to
3. Growing a new apex in the outward direction of that face
4. Secondary tetrahedra radiate outward, creating "spinal divergence"

**Finding (Feb 1, 2026):** Visual inspection reveals that the multi-strand configuration creates a **spinal divergence pattern** - secondary strands radiate outward from the primary spine rather than running parallel to it. This is because each bonded tetrahedron's apex points along the face normal (outward), not along the primary axis.

**"Unzipped" Mode - First Attempt (Feb 1, 2026):**
Initial implementation had secondary strands follow their own face-to-face chains:
1. Bond first tetrahedron to an exposed face of the seed
2. Continue the secondary strand using the same "always exit face 0" pattern
3. Each strand maintains its own independent trajectory

**Finding:** This approach produced **divergent strands** rather than parallel ones. Because each secondary strand starts from a different face of the seed tetrahedron (pointing in different directions), and then follows the same face-exit pattern independently, the strands diverge significantly from each other. The geometry does not resemble DNA's parallel intertwined structure.

*Commit: 93d6527 - preserved for future research reference*

**"Unzipped" Mode - Quadray-Aligned (Feb 1, 2026):**
Revised approach: align secondary strands with quadray basis vectors (QW, QX, QY, QZ):
1. Primary strand follows its linear zigzag path
2. Secondary strands are biased toward canonical tetrahedral directions
3. Creates a "tetrahedral cross" pattern radiating from origin along IVM axes

This leverages the natural tetrahedral symmetry of the quadray coordinate system rather than letting strands diverge arbitrarily.

#### Biological Analogies

- **2 strands (Double Helix):** Most similar to **DNA** structure - two antiparallel strands wound around a central axis. The "unzipped" mode would better represent this.
- **3 strands (Triple Helix):** Similar to **collagen** - three chains wound in a rope-like configuration.
- **4 strands:** No direct biological analog; represents maximum face utilization.

**Note:** Current "zipped" implementation creates divergent geometry (like ribs off a spine), not the wrapping/intertwined structure of biological helices. The "unzipped" mode would be needed for true helical parallel strands.

### Tetrahelix 3: Future Toroidal Multi-Strand

**Goal:** Explore toroidal closure with face-bonded multi-strand configurations

- Reserved for experimentation with multiple strands wrapping in torus formation
- May reveal interesting topological properties at closure

### Future Research

**Research questions:**
- What is the exact relationship between the tetrahedral dihedral angle (arccos(1/3) ≈ 70.5288°) and the number of tetrahedra for near-closure?
- How does the face cycling pattern affect the torus period?
- Can different face selection sequences produce linear vs. toroidal behavior?
- Do multi-strand configurations exhibit DNA-like double/triple helix properties?
- What is the geometric relationship between bonded strands at the atomic level?

---

## Implementation Checklist

Following the pattern from `Add-Polyhedra-Guide.md`:

### Step 1: Geometry Generator (`modules/rt-helices.js`)

- [ ] Create new file `modules/rt-helices.js`
- [ ] Import dependencies (THREE, RT, Quadray, Polyhedra)
- [ ] Implement `Helices.tetrahelix()` generator
- [ ] Return { vertices, edges, faces, metadata }
- [ ] Include RT validation logging
- [ ] Export `Helices` object

### Step 2: Rendering Setup (`modules/rt-rendering.js`)

- [ ] Add color: `tetrahelix: 0xFFAA00` (orange - chain/sequence metaphor)
- [ ] Declare `tetrahelixGroup` variable
- [ ] Initialize group in `initScene()`
- [ ] Add rendering block in `updateGeometry()`
- [ ] Add edge quadrance case
- [ ] Add to form restoration
- [ ] Add geometry info stats
- [ ] Add to `getAllFormGroups()`
- [ ] Add to `createPolyhedronByType()`

### Step 3: UI Controls (`index.html`)

- [ ] Add "Helices" section after "Radial Matrices"
- [ ] Add "Tetrahelix" checkbox and controls
- [ ] Add count slider (1-144, default 10) - extended range for torus exploration
- [ ] Add start face dropdown (A, B, C, D) - determines direction of travel
- [ ] Add chirality checkbox (left-handed)

### Step 4: Event Handlers (`modules/rt-init.js`)

- [ ] Import `Helices` from `rt-helices.js`
- [ ] Declare `tetrahelixGroup` variable
- [ ] Add checkbox event handler
- [ ] Add slider event handlers
- [ ] Add to selection formGroups arrays (both locations!)
- [ ] Destructure from `getAllFormGroups()`

### Step 5: State Persistence (`modules/rt-filehandler.js`)

- [ ] Add `showTetrahelix` to polyhedraCheckboxes
- [ ] Add `tetrahelixCount` to sliderValues
- [ ] Add `tetrahelixStartFace` to radio button values (A, B, C, D)
- [ ] Add `tetrahelixLeftHanded` to checkboxes
- [ ] Handle controls visibility on restore

### Step 6: Testing

- [ ] Visual: Does the helix render correctly?
- [ ] Face normals: Are faces visible from outside?
- [ ] Selection: Can you click to select the form?
- [ ] Geometry Info: Does stats section show correct V/E/F?
- [ ] Count slider: Does it update geometry (1-144 range)?
- [ ] Start face: Do A/B/C/D produce different directions?
- [ ] Non-intersection: Does the helix avoid self-intersection?
- [ ] Chirality: Does left-handed mirror correctly?
- [ ] Torus test: At 112, does it approach closure with small gap?
- [ ] Save/Load: Does state persist?

---

## RT Validation

### Expected Values

For a tetrahelix with N tetrahedra:

| Metric | Formula | N=10 Example |
|--------|---------|--------------|
| **Vertices** | 4 + (N-1) = N + 3 | 13 |
| **Edges** | 6N - (N-1) = 5N + 1 | 51 |
| **Faces (external)** | 4N - 2(N-1) = 2N + 2 | 22 |
| **Faces (internal/shared)** | N - 1 | 9 |
| **Euler (external)** | V - E + F = 2 | 13 - 51 + 22 = -16 ❌ |

**Note:** Euler characteristic doesn't hold for tetrahelix because it's not a closed surface - it's a chain with internal shared faces.

### Console Logging

```javascript
console.log(`[RT] Tetrahelix: count=${count}, halfSize=${halfSize}`);
console.log(`  Vertices: ${vertices.length}, Edges: ${edges.length}, Faces: ${faces.length}`);
console.log(`  Edge Q: ${expectedQ.toFixed(6)}, max error: ${maxError.toExponential(2)}`);
console.log(`  Chirality: ${leftHanded ? 'left' : 'right'}-handed`);
```

---

## Future Extensions

### Other Helix Types

The `rt-helices.js` module can be extended with:

1. **Octahelix** - Face-sharing octahedra (if geometrically possible)
2. **IVM Helix** - Alternating tetrahedra/octahedra along helix axis
3. **Helical Lattice** - Multiple parallel tetrahelices in matrix arrangement

### Configurable Parameters

- **Start face** - Which face of seed tetrahedron to begin chain from
- **Face sequence** - Custom pattern for face selection (enables different helix paths)
- **Partial tetrahedra** - Fractional chain lengths for animation

---

## Notes

- **Color choice:** Orange (0xFFAA00) suggests chain/sequence/construction
- **UI placement:** "Helices" section after "Radial Matrices" groups compound forms together
- **Chirality:** Right-handed default matches Fuller's convention
- **Performance:** For long chains (N > 50), consider using merged geometry or instancing
- **Vertex/Edge Deduplication:** Consecutive tetrahedra share 3 vertices and 3 edges. For early development, we'll render with duplicated shared geometry (simpler implementation). Deduplication for geometric simplification (unique vertices/edges only) can be added later, though the processing overhead may be comparable to rendering the duplicates - a wash in early development. Future optimization can address this if performance becomes an issue at high tetrahedra counts.

---

*Created: February 1, 2026*
*Branch: Tetrahelix*
*Contributors: Andy & Claude*
