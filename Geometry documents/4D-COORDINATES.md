# 4D-COORDINATES: Quadray (WXYZ) Coordinate System Reference

**Branch:** `4D-COORDINATES`
**Date:** 2026-01-17
**Status:** Active Research

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Quadray Basis Vectors](#2-quadray-basis-vectors)
3. [The Unit Tetrahedron](#3-the-unit-tetrahedron)
4. [The Dual Tetrahedron](#4-the-dual-tetrahedron)
   - 4.1 [Topological Inversion Conjecture](#41-negative-form-raw-inversion--negative-dimensional-tetrahedron-not-merely-dual)
      - [Connection to Barbour's Janus Point Theory](#connection-to-julian-barbours-janus-point-theory)
      - [Cyclic Extension: Trogoautoegocrat & Cosmic Breath](#cyclic-extension-the-trogoautoegocrat-and-cosmic-breath)
   - 4.2 [Positive Form (Re-normalized)](#42-positive-form-re-normalized)
   - 4.3 [Stella Octangula](#43-stella-octangula)
5. [Negative Dimensionality](#5-negative-dimensionality)
6. [The Unit Cube in Quadray Space](#6-the-unit-cube-in-quadray-space)
   - 6.1 [The halfSize Convention](#61-the-halfsize-convention)
   - 6.2 [Cube Vertices in Quadray Space](#62-cube-vertices-in-quadray-space)
   - 6.3 [Pattern Analysis](#63-pattern-analysis)
   - 6.4 [Relationship to Tetrahedra](#64-relationship-to-tetrahedra)
7. [The Octahedron in Quadray Space](#7-the-octahedron-in-quadray-space)
8. [Complete Polyhedra Reference in Quadray Coordinates](#8-complete-polyhedra-reference-in-quadray-coordinates)
9. [Conversion Between Quadray and Cartesian](#9-conversion-between-quadray-and-cartesian)
10. [RT-Pure Operations in Quadray Space](#10-rt-pure-operations-in-quadray-space)
11. [Implementation Notes](#11-implementation-notes)
12. [References](#12-references)

---

## 1. Introduction

Quadray coordinates (also called WXYZ or tetrahedral coordinates) are a 4-dimensional coordinate system reflecting what R. Buckminster Fuller recognized as the *a priori* 4-dimensional nature of space. Three dimensions is an arbitrary abstraction; the tetrahedron — requiring four vertices, four faces, and four directions from center — is the minimum structural system in Universe. Where Cartesian XYZ imposes three orthogonal axes at 90° angles as orthogonal orthodoxy, Quadray honors the inherent four-foldness of spatial reality with four equiangular axes emanating from a central origin toward the vertices of a regular tetrahedron (~109.47°). This foundation not only provides natural symmetry for tetrahedral and icosahedral geometry, but opens pathways to understanding hyperdimensionality — the 4D+ and 4D- spaces explored in subsequent sections emerge naturally from this coordinate system rather than as exotic additions.

**Key Properties:**
- 4 basis vectors at 109.47° angles (tetrahedral angle)
- Zero-sum constraint: W + X + Y + Z = constant (reduces 4 DOF to 3 DOF)
- Natural symmetry for tetrahedral and icosahedral geometry
- Spread between any two basis vectors = 3/4 (exact rational value)
- Rational Trigonometry principles use Quadrance to measure the separation of points in space (vertices) - not distance - and Spread measures the separation of lines in space - not degrees. 

---

## 2. Quadray Basis Vectors, aka. 4D Coordinates, WXYZ, etc.

The four Quadray basis vectors point from the origin to the vertices of a regular tetrahedron inscribed in a cube. Using a Z-up convention:

| Basis | Quadray | Cartesian Direction | Description |
|-------|---------|---------------------|-------------|
| **W** | (1, 0, 0, 0) | (+1, +1, +1)/√3 | Top-front-right |
| **X** | (0, 1, 0, 0) | (+1, -1, -1)/√3 | Bottom-back-right |
| **Y** | (0, 0, 1, 0) | (-1, +1, -1)/√3 | Bottom-front-left |
| **Z** | (0, 0, 0, 1) | (-1, -1, +1)/√3 | Top-back-left |

**Geometric Relationships:**
- All basis vectors have equal magnitude
- Angle between any pair: arccos(-1/3) ≈ 109.47°
- Spread between any pair: s = 1 - (-1/3)² = 8/9 ≈ 0.889
- Sum of all four basis vectors = (0, 0, 0) in Cartesian space — **vectorial neutrality**

**On Degrees of Freedom and Fuller's Vector Equilibrium:**

The Quadray system's 4 basis vectors achieve **vectorial neutrality** (sum to zero), but this is distinct from Fuller's claim about 12 vectors providing "complete restraint."

| Concept | Vectors | What It Achieves |
|---------|---------|------------------|
| **Quadray Basis** | 4 | Vectorial neutrality (W+X+Y+Z = 0 in Cartesian); spans 3D space with 4D redundancy |
| **Rigid Body DOF** | 6 | Standard mechanics: 3 translational + 3 rotational freedoms |
| **Fuller's VE** | 12 | Omnidirectional equilibrium of forces; radial vectors from center to cuboctahedron vertices |

**Fuller's 12-Vector Claim (Vector Equilibrium / Cuboctahedron):**

Fuller stated the Vector Equilibrium (VE) is "the only geometric form wherein all vectors are of equal length" — both the 12 radial vectors from center to vertices AND the 24 edge vectors. He described it as achieving "omnidirectional equilibrium of forces in which the magnitude of its explosive potentials is exactly matched by the strength of its external cohering bonds."

The 12 radial vectors of the VE comprise **6 pairs of opposite directions** (±X, ±Y, ±Z in Cartesian terms, though the VE's axes are not orthogonal). This 6-paired structure relates to the 6 degrees of freedom of a rigid body:
- 3 translational (forward/back, left/right, up/down)
- 3 rotational (pitch, yaw, roll)

**However**, Fuller's claim is about **force equilibrium**, not kinematic constraint. The VE's 12 vectors represent balanced omnidirectional thrust — if you push equally from all 12 directions toward center, the forces cancel. This is geometric/structural equilibrium, not the same as constraining 6 DOF in the mechanical engineering sense (which requires 6 constraints, not 12).

**The Quadray Connection:**

Our 4 Quadray basis vectors achieve a different kind of neutrality:
- They sum to zero vectorially (geometric balance)
- They provide a complete basis for 3D space (any point expressible as linear combination)
- The zero-sum constraint reduces 4 coordinates to 3 effective DOF

The VE's 12 vectors can be understood as **three sets of 4 Quadray-like tetrahedra** interpenetrating at the center — each set providing its own vectorial neutrality, and all three together providing omnidirectional coverage.

**References:**
- Fuller, R.B. *Synergetics* §420-430 (Vector Equilibrium)
- [Synergetics (Fuller) - Wikipedia](https://en.wikipedia.org/wiki/Synergetics_(Fuller))
- [Vector Equilibrium - Cosmometry](https://cosmometry.net/vector-equilibrium-&-isotropic-vector-matrix)

---

## 3. The Unit Tetrahedron

The unit tetrahedron in Quadray space has its four vertices located at the four basis directions:

| Vertex | Quadray (W, X, Y, Z) | Notes |
|--------|----------------------|-------|
| V₀ | (1, 0, 0, 0) | W-axis vertex |
| V₁ | (0, 1, 0, 0) | X-axis vertex |
| V₂ | (0, 0, 1, 0) | Y-axis vertex |
| V₃ | (0, 0, 0, 1) | Z-axis vertex |

**Centroid:** (0, 0, 0, 0) — the origin

**Properties:**
- All edges have equal quadrance
- All faces are equilateral triangles
- This is the "quantum of space" in Fuller's Synergetics terminology

---

## 4. The Dual Tetrahedron

The dual tetrahedron shares the same centroid at origin but has its vertices pointing in the **opposite** directions — a 180° rotation (inversion) or Spread of 2x?, through the origin.

### 4.1 Negative Form (Raw Inversion = Negative Dimensional Tetrahedron, not merely dual?)

**The Topological Inversion Conjecture:**

Akin to the human experience of flipping either a sock or a duvet cover inside-out, the dual tetrahedron is inverted through the 'hole' of origin. The question is, topologically speaking, is origin actually a hole, or rather a dimensional transition point? Can a tetrahedron without an innate 'hole' be topologically inverted in this way? Or are we breaking a rule to do so? Are black holes really holes, or more akin to our origin idea?

**Classical Topology vs. Hyperdimensional Inversion:**

In classical topology, a closed surface (genus 0, like a sphere or tetrahedron) cannot be turned inside-out in 3D without tearing — it has no "hole" through which to pass material. This is why socks and duvet covers (genus 1, torus-like with an opening) CAN be inverted: they possess a boundary through which the transformation occurs.

Yet in Quadray space, we perform exactly this "forbidden" operation: the tetrahedron passes through origin to become its dual. This suggests one of three interpretations:

1. **Origin as Puncture (Topological Hole):**
   - The origin [0,0,0,0] acts as an infinitesimal "puncture" in the manifold
   - This puncture provides the boundary required for topological inversion
   - The tetrahedron effectively becomes genus 1 at the moment of transition

2. **Origin as Dimensional Transition Point:**
   - Origin is not a "hole" in the traditional sense but a **transition between positive and negative dimensional spaces**
   - The transformation doesn't require tearing because it occurs through dimensional transition
   - Analogous to passing through zero on a number line — not a hole, but a phase boundary
   - This preserves the genus 0 nature of the tetrahedron while permitting "inside-outing"

3. **Hyperdimensional Embedding (Preferred Interpretation):**
   - The inversion that appears impossible in 3D becomes trivial when embedded in 4D+ space
   - Just as a 2D creature cannot comprehend flipping a circle inside-out, but we can do so trivially via the third dimension...
   - ...so too the 3D tetrahedron can invert through a 4D embedding space
   - **The Quadray system's inherent 4-dimensionality provides this embedding**
   - Origin is the "contact point" where 4D+ and 4D- spaces touch

**Implications for Black Holes and General Relativity:**

If we adopt interpretation (2) or (3), a provocative analogy emerges:

| Concept | Traditional View | Hyperdimensional Inversion View |
|---------|------------------|--------------------------------|
| **Black Hole Singularity** | "Hole" in spacetime where matter is crushed to infinite density | **Dimensional transition point** where 3D matter passes into negative/inverted dimensional space |
| **Event Horizon** | Point of no return | Phase boundary between positive and negative dimensional manifolds |
| **Information Paradox** | Information is "lost" in the singularity | Information is **inverted and preserved** in negative dimensional space (mirror universe) |
| **White Holes** (theoretical) | Time-reversed black holes | The **dual/inverted** output of black hole transition — matter re-emerging in positive space |

**The Quadray Origin Model:**

In Quadray coordinates, the origin [0,0,0,0] is not merely "empty space" but the **neutral point** where all four basis vectors sum to zero. This zero-sum property suggests:

- Origin is simultaneously "everywhere" (the sum of all directions) and "nowhere" (the null point)
- It is the unique point belonging equally to both positive and negative dimensional spaces
- Passing through origin doesn't "tear" the manifold — it **rotates** through a higher dimension

This is precisely what a 180° rotation (inversion) accomplishes: not a topological tear, but a **rigid motion** through the higher-dimensional embedding space that the Quadray system naturally provides.

**Mathematical Note:**

The "inside-outing" of a tetrahedron through origin is mathematically equivalent to:
- Multiplication by -1 (sign inversion)
- 180° rotation in 4D space (reflection through origin)
- Application of the inversion matrix: diag(-1, -1, -1, -1) in Quadray space

All three descriptions are equivalent, and none requires a "hole" — only the existence of a higher-dimensional embedding, which Quadray coordinates inherently provide.

**Connection to Julian Barbour's Janus Point Theory:**

Our Quadray origin model bears striking resemblance to physicist Julian Barbour's "Janus Point" theory of time and cosmology. In Barbour's framework:

| Barbour's Janus Point | Quadray Origin Model |
|-----------------------|----------------------|
| The Big Bang is not a "beginning" but a **central pivot** — the Janus Point — from which time extends in two directions | Origin [0,0,0,0] is not "empty space" but a **neutral pivot** from which positive and negative dimensional spaces extend |
| The universe passed through a moment of **minimal size/complexity** at the Janus Point | The tetrahedron passes through a point of **minimal extension** (origin) during inversion |
| Two **arrows of time** emerge from the Janus Point, each with increasing complexity/order | Two **dimensional spaces** (4D+ and 4D-) emerge from origin, each containing complete geometric structure |
| Observers on either side would perceive their direction as "forward" | Observers in either dimensional space would perceive their tetrahedron as the "base" form |

**Platonia and Shape Space:**

Barbour describes a "configuration space" he calls **Platonia** — populated by all possible "Nows," where each Now is a complete, timeless arrangement of the universe. The Janus Point is the unique configuration of minimal complexity from which all other configurations emanate.

In Quadray geometry, we have an analogous structure:
- **Shape Space**: The space of all possible mass-weighted shapes, providing a scale-free framework
- **Origin as Janus Point**: The unique point [0,0,0,0] where the "dilatational momentum vanishes" (in Barbour's terminology)
- **Complexity measure**: Barbour's "entaxy" (inverse of entropy) increases away from the Janus Point; similarly, the "positive-ness" of Quadray coordinates increases away from origin

**The Geometric Arrow of Time:**

Barbour argues that **complexity growth** (not entropy increase) defines the arrow of time. His collaborators Koslowski and Mercati identified a "gravitational arrow of time" in 2014, showing that gravitational systems naturally evolve toward greater structure.

This aligns with our observation that:
- The tetrahedron at origin (all vertices collapsing to [0,0,0,0]) represents **minimal structure**
- Both the positive tetrahedron (expanding outward) and negative tetrahedron (expanding inward) represent **increasing structure** away from origin
- The origin is not a "dead end" but a **generative point** from which geometric complexity emerges in both directions

**Relational vs. Absolute Space:**

Barbour, following Leibniz and Mach, argues there is no absolute space — only **geometric relationships between things**. This is precisely what Quadray coordinates capture:
- No privileged "up/down" or "x/y/z" axes
- Only the **tetrahedral relationships** between the four basis vectors
- Origin is defined relationally (where all four directions cancel) not absolutely

**Cosmological Implications:**

If black holes are dimensional transition points (as suggested in our conjecture), and if origin represents a Janus Point between 4D+ and 4D- spaces, then:

1. **Matter entering a black hole** doesn't "disappear" — it transitions through the dimensional Janus Point into negative dimensional space
2. **White holes** (the theoretical time-reverse of black holes) represent matter re-emerging from negative to positive dimensional space
3. **The information paradox** is resolved: information is preserved through inversion, existing in the "mirror" dimensional space
4. **The universe's fate** is not heat death (maximum entropy) but continued complexity growth in both temporal/dimensional directions

This framework suggests that what we call the "Big Bang" may be the cosmological Janus Point — not a beginning, but a **pivot** between two "half-universes" each experiencing its own arrow of time pointed away from the central origin.

**Cyclic Extension: The Trogoautoegocrat and Cosmic Breath**

While Barbour's Janus Point describes a single pivot from which two temporal directions emerge, ancient cosmological traditions suggest this process may be **cyclic** — the universe repeatedly passing through origin in an eternal rhythm of expansion, collapse, and re-emergence.

**Gurdjieff's Trogoautoegocrat ("The Universe Eats Itself"):**

G.I. Gurdjieff described the cosmos as governed by the "Most Great Cosmic Trogoautoegocrat" — the Law of Reciprocal Maintenance. The term derives from Greek: *Trogo* (eat) + *Auto* (self) + *Ego* (I) + *Crat* (rule). In this framework:

- The universe is an **unending chain of systems bound by universal interdependence**
- Every level of existence simultaneously **feeds and is fed upon** — there are no closed systems
- This reciprocal exchange creates a "cosmic perpetual motion machine" that escapes entropy
- The Ouroboros (serpent eating its tail) symbolizes this self-sustaining cosmic process

| Gurdjieff's Trogoautoegocrat | Quadray Inversion Model |
|------------------------------|-------------------------|
| Universe as self-consuming/self-generating loop | Tetrahedron inverts through origin, re-emerges as dual |
| Energy flows both "up" and "down" the cosmic hierarchy | Structure exists in both 4D+ and 4D- spaces |
| No ultimate beginning or end — eternal reciprocal maintenance | Origin is not terminus but **transition point** |
| The "bootstrap" principle — universe is self-consistent loop | Positive and negative tetrahedra are mutually defining |

**The Breath of Brahma (Hindu Cosmology):**

The Vedic tradition describes cosmic time as the **breath of Vishnu**:

- When Vishnu **exhales**, thousands of universes emerge — each with its own Brahma (creator)
- When Vishnu **inhales**, all universes are reabsorbed — Brahma dies, creation dissolves
- This cycle is **non-ending and eternal** — a "Maha Kalpa" spanning 311 trillion years
- Within each breath, the universe passes through four Yugas (ages), currently in Kali Yuga

Carl Sagan observed: *"The Hindu religion is the only one of the world's great faiths dedicated to the idea that the Cosmos itself undergoes an immense, indeed an innate, number of deaths and rebirths... Its cycles run from our ordinary day and night to a day and night of Brahma, 8.64 billion years long."*

| Vedic Cosmic Breath | Quadray Cyclic Model |
|---------------------|----------------------|
| **Exhale** (Srishti/Creation) | Expansion from origin into 4D+ space |
| **Inhale** (Pralaya/Dissolution) | Collapse through origin into 4D- space |
| **Pause** (Janus Point) | Origin [0,0,0,0] — the moment of minimal extension |
| **Re-exhale** | Re-emergence from 4D- back through origin to 4D+ |

**Synthesis: The Cyclic Janus Point**

Combining Barbour's physics with these ancient cosmologies suggests a richer model:

1. **Barbour's Janus Point** describes a *single* pivot — the Big Bang as midpoint, not beginning
2. **Gurdjieff's Trogoautoegocrat** adds *reciprocity* — the universe is self-sustaining through mutual exchange
3. **Vedic Cosmic Breath** adds *cyclicity* — the pivot is passed through repeatedly, eternally

In Quadray terms, this becomes:

```
    4D+ (Positive Space)          4D- (Negative Space)
           ↑                              ↑
    Expansion/Exhale              Expansion/Exhale
           ↑                              ↑
    ═══════╪═══════ ORIGIN [0,0,0,0] ═══════╪═══════
           ↓                              ↓
    Collapse/Inhale               Collapse/Inhale
           ↓                              ↓
    4D- (Negative Space)          4D+ (Positive Space)
```

The tetrahedron doesn't simply invert once — it **breathes** through origin eternally, each passage through the Janus Point constituting a cosmic "death and rebirth." The positive and negative dimensional spaces are not static destinations but phases in an endless oscillation.

**Implications:**

- **Time** is not a line (beginning → end) but a **breath** (expansion ↔ contraction)
- **Black holes** may be local "inhalation points" where matter transitions through dimensional Janus Points
- **The Big Bang** was not *the* beginning but *a* passage through origin — one breath among infinite breaths
- **Heat death** is avoided through cyclic regeneration — complexity grows, collapses, and re-emerges

**References (Janus Point & Cyclic Cosmology):**
- Barbour, J. (2020). *The Janus Point: A New Theory of Time*. Basic Books.
- Barbour, J., Koslowski, T., & Mercati, F. (2014). "Identification of a Gravitational Arrow of Time." *Physical Review Letters*.
- Barbour, J. & Bertotti, B. (1982). Seminal paper on relational dynamics and shape space.
- Gurdjieff, G.I. *Beelzebub's Tales to His Grandson* (Trogoautoegocrat concept)
- [Trogoautoegocrat - Endless Search](https://www.endlesssearch.co.uk/philo_trogoaec.htm)
- [Reciprocal Maintenance - Meaningful Participation](https://meaningfulparticipation.org/posts/reciprocal-maintenance)
- [Yuga Cycle - Wikipedia](https://en.wikipedia.org/wiki/Yuga_cycle)
- [Kalpa (Hindu time) - Wikipedia](https://en.wikipedia.org/wiki/Kalpa_(time))
- Sagan, C. *Cosmos* (1980) — on Hindu cosmological time scales

**Vertices (Raw Negative Form):** 

| Vertex | Quadray (W, X, Y, Z) | Description |
|--------|----------------------|-------------|
| V₀' | (-1, 0, 0, 0) | Inverse of W |
| V₁' | (0, -1, 0, 0) | Inverse of X |
| V₂' | (0, 0, -1, 0) | Inverse of Y |
| V₃' | (0, 0, 0, -1) | Inverse of Z |

### 4.2 Positive Form (Re-normalized)

To satisfy the "all-positive" Quadray convention, add (1, 1, 1, 1) to each vertex:

| Vertex | Quadray (W, X, Y, Z) | Description |
|--------|----------------------|-------------|
| V₀' | (0, 1, 1, 1) | Three active, W inactive |
| V₁' | (1, 0, 1, 1) | Three active, X inactive |
| V₂' | (1, 1, 0, 1) | Three active, Y inactive |
| V₃' | (1, 1, 1, 0) | Three active, Z inactive |

**Key Insight:** The dual tetrahedron vertices are characterized by having **three** coordinates active (value 1) and **one** coordinate inactive (value 0) — the inverse pattern of the base tetrahedron.

### 4.3 Stella Octangula

When both tetrahedra are overlaid (base + dual), they form the **stella octangula** — a compound of two tetrahedra that circumscribes an octahedron and is circumscribed by a cube.

---

## 5. Negative Dimensionality

### 5.1 Fuller's Critique of "Up" and "Down"

R. Buckminster Fuller criticized the human language conventions of "Up" and "Down" as artifacts of flat-earth thinking. On a spherical planet (Earth), these directions are arbitrary and locally-dependent — what is "up" in Toronto is "down" in Sydney.

**The Universal Directions:**

Fuller recognized that the only absolute directions relative to any center of gravity are **IN** and **OUT**:

| Convention | Problem | Reality |
|------------|---------|---------|
| "Up" / "Down" | Arbitrary, locally-dependent | Flat-earth mental model |
| **"Out" / "In"** | Absolute, universal | Spherical/radial reality |

### 5.2 Directional Interpretation

By extension, we map these universal directions to coordinate signs:

| Sign | Direction | Interpretation |
|------|-----------|----------------|
| **+** (Positive) | **OUT** | Expansion away from origin/center |
| **-** (Negative) | **IN** | Collapse toward and through origin/center |

This is not merely a convention — it reflects the fundamental nature of radial geometry:
- **OUT (+)** = Radiation, expansion, divergence from center
- **IN (-)** = Gravitation, contraction, convergence toward center
- Einstein stated that "Gravity is a response to Geometry", we believe this is what he meant, where Space inherently contains these properties

### 5.3 Negative Dimensional Space

A tetrahedron with all-negative coordinates defines a tetrahedron in what we term **negative dimensional space**, so that we have a 4D+ and 4D- pair of dimensions:

```
Base Tetrahedron (+):     Dual Tetrahedron (-):

    Expands outward           Collapses inward
    from origin               through origin

        W (+)                     W (-)
        ↗                          ↙
       /                            \
      ●───────→ X (+)    X (-) ←───────●
       \                            /
        ↘                          ↗
        Y (+)                     Y (-)
```

**Conceptual Model:**
- The **positive tetrahedron** expands outward from the origin into positive dimensional space
- The **negative tetrahedron** is the same "size" but has collapsed through the origin into negative dimensionality
- The origin (0, 0, 0, 0) is the boundary between positive and negative dimensional spaces
- This mirrors the relationship between matter and antimatter, or expansion and contraction

### 5.4 Mathematical Formalization

For any point P = (w, x, y, z):
- **P > 0** (all positive): Point exists in positive dimensional space
- **P < 0** (all negative): Point exists in negative dimensional space
- **Mixed signs**: Point spans the dimensional boundary

The dual tetrahedron's re-normalized form (0,1,1,1), (1,0,1,1), etc. represents the negative tetrahedron **projected back** into positive coordinate space through additive translation.

---

## 6. The Unit Cube in Quadray Space

### 6.1 The `halfSize` Convention

In ARTexplorer, all polyhedra are parameterized using the **`halfSize`** convention, which defines the base unit for positioning vertices at origin:

**Definition:**
```javascript
// From rt-polyhedra.js
const s = halfSize;  // Default = 1
// Cube vertices at (±s, ±s, ±s) in Cartesian
```

**Geometric Relationships:**

| Parameter | Value | Description |
|-----------|-------|-------------|
| `halfSize` | s | Half the cube edge length (cube edge = 2s) |
| Cube edge | 2s | Full edge length in Cartesian |
| Cube diagonal | 2√3·s | Body diagonal (corner to opposite corner) |
| **Tetrahedron edge** | **2√2·s** | Face diagonal of cube (√((2s)² + (2s)²)) |

**The Critical Relationship — Cube and Tetrahedron Share Vertices:**

When a tetrahedron is inscribed in a cube (using alternating vertices), the tetrahedron's edges are the **face diagonals** of the cube, not the cube edges:

```
Cube edge = 2s
Tetrahedron edge = √(2s² + 2s²) = √(8s²) = 2√2·s

For halfSize = 1:
  - Cube edge length = 2
  - Tetrahedron edge length = 2√2 ≈ 2.828
  - Tetrahedron edge quadrance Q = 8  (edge² = (2√2)² = 8)
```

**RT-Pure Edge Quadrance:**

```javascript
// From rt-polyhedra.js tetrahedron definition
const expectedQ = 8 * halfSize * halfSize;  // Q = (2√2·s)² = 8s²
```

When `halfSize = 1`:
- Cube vertices at (±1, ±1, ±1) — total 8 vertices
- Tetrahedron uses 4 alternating vertices: (-1,-1,-1), (+1,+1,-1), (+1,-1,+1), (-1,+1,+1)
- Each tetrahedron edge has quadrance Q = 8
- Dual tetrahedron uses the other 4 vertices: (+1,+1,+1), (-1,-1,+1), (-1,+1,-1), (+1,-1,-1)

**Why `halfSize` Instead of Full Size?**

The `halfSize` convention ensures:
1. **Origin-centered geometry**: All polyhedra are centered at [0,0,0,0]
2. **Symmetric coordinates**: Vertices have balanced ± values
3. **Direct Quadray conversion**: The pattern {2,1,1,0} scaled by `halfSize` maps directly to (±s,±s,±s)

### 6.2 Cube Vertices in Quadray Space

The cube vertices are formed by combinations of **two active coordinates**. In Quadray space, the cube is described by permutations of the pattern {2, 1, 1, 0}:

| Vertex | Quadray (W, X, Y, Z) | Cartesian Equivalent |
|--------|----------------------|----------------------|
| C₀ | (2, 1, 1, 0) | (+s, +s, +s) |
| C₁ | (2, 1, 0, 1) | (+s, +s, -s) |
| C₂ | (2, 0, 1, 1) | (+s, -s, +s) |
| C₃ | (0, 2, 1, 1) | (+s, -s, -s) |
| C₄ | (1, 2, 1, 0) | (-s, +s, +s) |
| C₅ | (1, 2, 0, 1) | (-s, +s, -s) |
| C₆ | (1, 0, 2, 1) | (-s, -s, +s) |
| C₇ | (0, 1, 2, 1) | (-s, -s, -s) |

### 6.3 Pattern Analysis

- Each vertex has one coordinate = 2, two coordinates = 1, one coordinate = 0
- The coordinate with value 2 indicates the "dominant" quadray direction
- The coordinate with value 0 indicates the "absent" quadray direction

### 6.4 Relationship to Tetrahedra

- The base tetrahedron uses 4 of these 8 cube vertices (alternating corners)
- The dual tetrahedron uses the other 4 cube vertices
- Together they form the stella octangula inscribed in the cube

**Vertex Assignment (halfSize = 1):**

| Vertex | Cube Position | Quadray | Tetrahedron |
|--------|---------------|---------|-------------|
| (-1,-1,-1) | C₇ | (0,1,2,1) | **Base** T₀ |
| (+1,+1,-1) | C₁ | (2,1,0,1) | **Base** T₁ |
| (+1,-1,+1) | C₂ | (2,0,1,1) | **Base** T₂ |
| (-1,+1,+1) | C₄ | (1,2,1,0) | **Base** T₃ |
| (+1,+1,+1) | C₀ | (2,1,1,0) | **Dual** D₀ |
| (-1,-1,+1) | C₆ | (1,0,2,1) | **Dual** D₁ |
| (-1,+1,-1) | C₅ | (1,2,0,1) | **Dual** D₂ |
| (+1,-1,-1) | C₃ | (0,2,1,1) | **Dual** D₃ |

---

## 7. The Octahedron in Quadray Space

The octahedron has the simplest representation in Quadray space — its 6 vertices are the **permutations of {1, 1, 0, 0}**:

| Vertex | Quadray (W, X, Y, Z) | Cartesian Equivalent |
|--------|----------------------|----------------------|
| O₀ | (1, 1, 0, 0) | (+s, 0, 0) |
| O₁ | (1, 0, 1, 0) | (0, +s, 0) |
| O₂ | (1, 0, 0, 1) | (0, 0, +s) |
| O₃ | (0, 1, 1, 0) | (-s, 0, 0) |
| O₄ | (0, 1, 0, 1) | (0, -s, 0) |
| O₅ | (0, 0, 1, 1) | (0, 0, -s) |

**Pattern Analysis:**
- Each vertex has exactly two coordinates = 1, two coordinates = 0
- This creates 6 vertices (C(4,2) = 6 combinations)
- The octahedron is the "edge figure" of the tetrahedron in Quadray space

**Significance:**
- The octahedron vertices correspond to the **edge midpoints** of the unit tetrahedra
- In Fuller's IVM (Isotropic Vector Matrix), the octahedron is central to space-filling
- The cuboctahedron (Vector Equilibrium) has its 12 vertices at octahedral positions

---

## 8. Complete Polyhedra Reference in Quadray Coordinates

This section provides a comprehensive reference for all base polyhedra expressed in Quadray (WXYZ) coordinates. Each form is presented with its vertex coordinates, coordinate patterns, and relationships to other polyhedra.

### 8.1 Summary Table: Polyhedra Coordinate Patterns

| Polyhedron | Vertices | Pattern | Active Coords | Notes |
|------------|----------|---------|---------------|-------|
| **Tetrahedron** | 4 | (1,0,0,0) perms | 1 | Single active |
| **Dual Tetrahedron** | 4 | (0,1,1,1) perms | 3 | Single inactive |
| **Cube** | 8 | (2,1,1,0) perms | 3 | Dominant + two secondary |
| **Octahedron** | 6 | (1,1,0,0) perms | 2 | Edge midpoints of tetrahedra |
| **Icosahedron** | 12 | φ-scaled mixed | — | Golden ratio relationships |
| **Dodecahedron** | 20 | φ-based mixed | — | Dual of icosahedron |
| **Cuboctahedron** | 12 | (1,1,0,0) scaled | 2 | Vector Equilibrium |
| **Rhombic Dodecahedron** | 14 | Mixed axis + octant | — | Dual of cuboctahedron |

### 8.2 Tetrahedron (Revisited)

The **fundamental unit** of Quadray space. All other polyhedra can be understood in relation to the tetrahedron.

**Vertices (4):**
| Vertex | Quadray (W, X, Y, Z) | Pattern |
|--------|----------------------|---------|
| T₀ | (1, 0, 0, 0) | W only |
| T₁ | (0, 1, 0, 0) | X only |
| T₂ | (0, 0, 1, 0) | Y only |
| T₃ | (0, 0, 0, 1) | Z only |

**Edges (6):** All pairs of vertices
**Faces (4):** Equilateral triangles
**Schläfli Symbol:** {3, 3}

**Quadray Insight:** The tetrahedron vertices ARE the basis vectors themselves — the most natural polyhedron in this coordinate system.

### 8.3 Dual Tetrahedron

The **inverted** tetrahedron, rotated 180° through the origin.

**Vertices (4) — Positive Normalized Form:**
| Vertex | Quadray (W, X, Y, Z) | Pattern |
|--------|----------------------|---------|
| D₀ | (0, 1, 1, 1) | W absent |
| D₁ | (1, 0, 1, 1) | X absent |
| D₂ | (1, 1, 0, 1) | Y absent |
| D₃ | (1, 1, 1, 0) | Z absent |

**Relationship to Base Tetrahedron:**
- Negative form: (-1,0,0,0), (0,-1,0,0), etc. (IN direction)
- Re-normalized by adding (1,1,1,1) to each vertex
- Combined with base tetrahedron forms the **Stella Octangula**

### 8.4 Cube (Hexahedron)

The cube emerges from combining both tetrahedra — its 8 vertices are the union of tetrahedron and dual tetrahedron vertices when properly scaled.

**Vertices (8):**
| Vertex | Quadray (W, X, Y, Z) | Cartesian | Octant |
|--------|----------------------|-----------|--------|
| C₀ | (2, 1, 1, 0) | (+,+,+) | +++ |
| C₁ | (2, 1, 0, 1) | (+,+,-) | ++- |
| C₂ | (2, 0, 1, 1) | (+,-,+) | +-+ |
| C₃ | (1, 2, 1, 0) | (-,+,+) | -++ |
| C₄ | (1, 2, 0, 1) | (-,+,-) | -+- |
| C₅ | (1, 0, 2, 1) | (-,-,+) | --+ |
| C₆ | (0, 2, 1, 1) | (+,-,-) | +-- |
| C₇ | (0, 1, 2, 1) | (-,-,-) | --- |

**Pattern Analysis:**
- Each vertex: one coord = 2, two coords = 1, one coord = 0
- The "2" indicates the dominant quadray direction
- The "0" indicates the absent quadray direction
- Sum of coordinates = 4 for all vertices (consistent normalization)

**Edges (12):** Connect vertices differing in exactly one "dominant" position
**Faces (6):** Squares
**Schläfli Symbol:** {4, 3}

**Tetrahedra Inside Cube:**
- Base tetrahedron: vertices C₀, C₄, C₅, C₆ (alternating corners)
- Dual tetrahedron: vertices C₁, C₂, C₃, C₇ (other alternating corners)

### 8.5 Octahedron

The octahedron vertices lie at the **edge midpoints** of the tetrahedra, making it central to the IVM lattice structure.

**Vertices (6):**
| Vertex | Quadray (W, X, Y, Z) | Cartesian Axis | Pattern |
|--------|----------------------|----------------|---------|
| O₀ | (1, 1, 0, 0) | +X | WX pair |
| O₁ | (1, 0, 1, 0) | +Y | WY pair |
| O₂ | (1, 0, 0, 1) | +Z | WZ pair |
| O₃ | (0, 1, 1, 0) | -X | XY pair |
| O₄ | (0, 1, 0, 1) | -Y | XZ pair |
| O₅ | (0, 0, 1, 1) | -Z | YZ pair |

**Pattern Analysis:**
- Each vertex: exactly two coords = 1, two coords = 0
- C(4,2) = 6 combinations = 6 vertices
- Sum of coordinates = 2 for all vertices

**Edges (12):** Connect vertices sharing exactly one active coordinate
**Faces (8):** Equilateral triangles
**Schläfli Symbol:** {3, 4}

**Dual Relationship:** The octahedron is dual to the cube

### 8.6 Icosahedron

The icosahedron requires **golden ratio (φ)** relationships, introducing irrational coordinates that are nonetheless expressible in Quadray form.

**Cartesian Construction (for reference):**
Vertices at cyclic permutations of (0, ±1, ±φ) where φ = (1+√5)/2

**Quadray Vertices (12):**

The icosahedron vertices in Quadray coordinates involve φ-scaled combinations. Using the normalization where φ = (1+√5)/2:

| Vertex | Quadray (approximate) | Cartesian | Group |
|--------|----------------------|-----------|-------|
| I₀ | (φ+1, 1, φ, 0) | (0, +1, +φ) | YZ-plane |
| I₁ | (φ+1, 1, 0, φ) | (0, +1, -φ) | YZ-plane |
| I₂ | (1, φ+1, φ, 0) | (0, -1, +φ) | YZ-plane |
| I₃ | (1, φ+1, 0, φ) | (0, -1, -φ) | YZ-plane |
| I₄ | (φ, φ+1, 1, 0) | (+1, 0, +φ) | XZ-plane |
| I₅ | (0, φ+1, 1, φ) | (-1, 0, +φ) | XZ-plane |
| I₆ | (φ, 1, φ+1, 0) | (+1, 0, -φ) | XZ-plane |
| I₇ | (0, 1, φ+1, φ) | (-1, 0, -φ) | XZ-plane |
| I₈ | (φ, 0, φ+1, 1) | (+φ, +1, 0) | XY-plane |
| I₉ | (φ, φ, 1, φ+1) | (+φ, -1, 0) | XY-plane |
| I₁₀ | (0, φ, φ+1, 1) | (-φ, +1, 0) | XY-plane |
| I₁₁ | (0, φ, 1, φ+1) | (-φ, -1, 0) | XY-plane |

**Note:** Exact Quadray values require symbolic φ representation (PurePhi method).

**Edges (30):** Connect vertices of adjacent golden rectangles
**Faces (20):** Equilateral triangles
**Schläfli Symbol:** {3, 5}

**Golden Ratio in Quadray Space:**
- φ = (1 + √5)/2 ≈ 1.618034
- φ² = φ + 1 (algebraic identity — no multiplication needed!)
- 1/φ = φ - 1 (algebraic identity — no division needed!)

### 8.7 Dodecahedron

The dodecahedron is the **dual of the icosahedron**. Its 20 vertices correspond to the 20 face centers of the icosahedron.

**Cartesian Construction:**
- 8 vertices at cube corners (±s, ±s, ±s)
- 12 vertices at permutations of (0, ±1/φ, ±φ)

**Quadray Vertices (20):**

| Vertex | Quadray (approximate) | Cartesian | Type |
|--------|----------------------|-----------|------|
| D₀-D₇ | Cube pattern {2,1,1,0} | (±s,±s,±s) | Cube corners |
| D₈-D₁₉ | φ-scaled permutations | (0,±1/φ,±φ) etc. | Phi vertices |

**Cube Corner Vertices (8):**
Same as Section 8.4 cube vertices, scaled appropriately.

**Phi Vertices (12):**
| Vertex | Quadray (approx) | Cartesian |
|--------|-----------------|-----------|
| D₈ | (1, 1+φ, φ, 0) | (0, +1/φ, +φ) |
| D₉ | (1, 1+φ, 0, φ) | (0, +1/φ, -φ) |
| D₁₀ | (1+φ, 1, φ, 0) | (0, -1/φ, +φ) |
| D₁₁ | (1+φ, 1, 0, φ) | (0, -1/φ, -φ) |
| D₁₂ | (φ, 0, 1+φ, 1) | (+φ, 0, +1/φ) |
| D₁₃ | (0, φ, 1+φ, 1) | (-φ, 0, +1/φ) |
| D₁₄ | (φ, 0, 1, 1+φ) | (+φ, 0, -1/φ) |
| D₁₅ | (0, φ, 1, 1+φ) | (-φ, 0, -1/φ) |
| D₁₆ | (1+φ, φ, 1, 0) | (+1/φ, +φ, 0) |
| D₁₇ | (1, φ, 1+φ, 0) | (+1/φ, -φ, 0) |
| D₁₈ | (1+φ, 0, 1, φ) | (-1/φ, +φ, 0) |
| D₁₉ | (1, 0, 1+φ, φ) | (-1/φ, -φ, 0) |

**Edges (30):** Connect cube corners to phi vertices
**Faces (12):** Regular pentagons
**Schläfli Symbol:** {5, 3}

### 8.8 Cuboctahedron (Vector Equilibrium)

Fuller's **Vector Equilibrium (VE)** — the only polyhedron where all vertices are equidistant from the center AND from each other. Central to the IVM lattice.

**Cartesian Construction:**
Vertices at permutations of (±1, ±1, 0) scaled by s/√2

**Quadray Vertices (12):**

The cuboctahedron vertices are **scaled octahedron vertices** positioned at edge midpoints of both cube and octahedron.

| Vertex | Quadray (W, X, Y, Z) | Cartesian | Plane |
|--------|----------------------|-----------|-------|
| VE₀ | (1, 1, 0, 0) × k | (+t, +t, 0) | XY |
| VE₁ | (1, 0, 1, 0) × k | (+t, 0, +t) | XZ |
| VE₂ | (1, 0, 0, 1) × k | (0, +t, +t) | YZ |
| VE₃ | (0, 1, 1, 0) × k | (-t, +t, 0) | XY |
| VE₄ | (0, 1, 0, 1) × k | (+t, -t, 0) | XY |
| VE₅ | (0, 0, 1, 1) × k | (-t, -t, 0) | XY |
| VE₆ | (1, 1, 0, 0) × k' | (+t, 0, -t) | XZ |
| VE₇ | (1, 0, 1, 0) × k' | (-t, 0, +t) | XZ |
| VE₈ | (1, 0, 0, 1) × k' | (0, +t, -t) | YZ |
| VE₉ | (0, 1, 1, 0) × k' | (-t, 0, -t) | XZ |
| VE₁₀ | (0, 1, 0, 1) × k' | (0, -t, +t) | YZ |
| VE₁₁ | (0, 0, 1, 1) × k' | (0, -t, -t) | YZ |

Where t = s/√2 (edge midpoint distance from origin)

**Pattern Analysis:**
- Same (1,1,0,0) pattern as octahedron
- Scaled to lie at cube/octahedron edge midpoints
- 12 vertices = C(4,2) × 2 orientations

**Edges (24):** All equal length
**Faces (14):** 8 triangles + 6 squares
**Schläfli Symbol:** Not Platonic (Archimedean)

**Significance:**
- All 12 radii from center to vertices are EQUAL
- All 24 edges are EQUAL to the radii
- This is the "jitterbug" equilibrium point in Fuller's transformational geometry

### 8.9 Rhombic Dodecahedron

The **dual of the cuboctahedron** — its 14 vertices are the face centers of the cuboctahedron (6 squares + 8 triangles).

**Quadray Vertices (14):**

| Vertex | Quadray (W, X, Y, Z) | Cartesian | Type | Degree |
|--------|----------------------|-----------|------|--------|
| R₀ | (t, 0, 0, 0) norm | (+t, 0, 0) | +X axis | 4 |
| R₁ | (0, t, 0, 0) norm | (-t, 0, 0) | -X axis | 4 |
| R₂ | (0, 0, t, 0) norm | (0, +t, 0) | +Y axis | 4 |
| R₃ | (0, 0, 0, t) norm | (0, -t, 0) | -Y axis | 4 |
| R₄ | scaled W | (0, 0, +t) | +Z axis | 4 |
| R₅ | scaled -W | (0, 0, -t) | -Z axis | 4 |
| R₆ | (u, u, u, 0) norm | (+u,+u,+u) | +++ octant | 3 |
| R₇ | (u, u, 0, u) norm | (+u,+u,-u) | ++- octant | 3 |
| R₈ | (u, 0, u, u) norm | (+u,-u,+u) | +-+ octant | 3 |
| R₉ | (0, u, u, u) norm | (+u,-u,-u) | +-- octant | 3 |
| R₁₀ | (u, u, u, 0)' | (-u,+u,+u) | -++ octant | 3 |
| R₁₁ | (u, u, 0, u)' | (-u,+u,-u) | -+- octant | 3 |
| R₁₂ | (u, 0, u, u)' | (-u,-u,+u) | --+ octant | 3 |
| R₁₃ | (0, u, u, u)' | (-u,-u,-u) | --- octant | 3 |

Where:
- t = s/√2 (cuboctahedron vertex distance)
- u = t/2 = s/(2√2) (octant vertex distance for planar rhombic faces)

**Vertex Types:**
- **6 axis vertices** (degree 4): At square face centers of cuboctahedron
- **8 octant vertices** (degree 3): At triangle face centers of cuboctahedron

**Pattern Analysis:**
- Axis vertices: lie on coordinate axes at distance t
- Octant vertices: lie on body diagonals at distance u = t/2
- The u = t/2 relationship ensures **planar rhombic faces** (critical!)

**Edges (24):** Connect axis vertices to adjacent octant vertices
**Faces (12):** Rhombi (diamond shapes)
**Schläfli Symbol:** Not Platonic (Catalan solid)

**IVM Significance:**
The rhombic dodecahedron is the **most relevant single form** for IVM spatial representation because:
- All 14 vertices fall exactly on IVM grid intersections
- It is the Voronoi cell of the FCC (face-centered cubic) lattice
- It tiles 3D space with no gaps (space-filling)

### 8.10 Polyhedra Comparison Chart

| Property | Tet | Dual Tet | Cube | Oct | Icosa | Dodeca | Cubocta | RhomDodeca |
|----------|-----|----------|------|-----|-------|--------|---------|------------|
| Vertices | 4 | 4 | 8 | 6 | 12 | 20 | 12 | 14 |
| Edges | 6 | 6 | 12 | 12 | 30 | 30 | 24 | 24 |
| Faces | 4 | 4 | 6 | 8 | 20 | 12 | 14 | 12 |
| Face Type | △ | △ | □ | △ | △ | ⬠ | △+□ | ◇ |
| Dual Of | Self | Self | Oct | Cube | Dodeca | Icosa | RhomDod | Cubocta |
| φ-based | No | No | No | No | Yes | Yes | No | No |
| √2-based | No | No | No | No | No | No | Yes | Yes |
| IVM native | Yes | Yes | No | Yes | No | No | Yes | Yes |

### 8.11 Quadray Pattern Summary

**Integer Patterns (No Radicals):**
- Tetrahedron: (1,0,0,0) — single active
- Dual Tetrahedron: (0,1,1,1) — single inactive
- Octahedron: (1,1,0,0) — pair active
- Cube: (2,1,1,0) — dominant + secondary

**√2-Based Patterns:**
- Cuboctahedron: Scaled (1,1,0,0) by s/√2
- Rhombic Dodecahedron: Mixed axis (t) and octant (t/2) where t = s/√2

**φ-Based Patterns:**
- Icosahedron: Permutations involving φ and φ+1
- Dodecahedron: Cube corners + φ-scaled permutations

**Hierarchy:**
```
Tetrahedron (fundamental)
    ↓ inversion
Dual Tetrahedron
    ↓ union
Cube (8 vertices = 4 + 4)
    ↓ edge midpoints
Octahedron (6 vertices)
    ↓ scale to edge midpoints
Cuboctahedron (12 vertices)
    ↓ dual
Rhombic Dodecahedron (14 vertices)
```

---

## 9. Conversion Between Quadray and Cartesian

### 9.1 Quadray to Cartesian

Given Quadray coordinates (w, x, y, z):

**Step 1: Zero-Sum Normalization**
```
mean = (w + x + y + z) / 4
w' = w - mean
x' = x - mean
y' = y - mean
z' = z - mean
```

**Step 2: Linear Combination with Basis Vectors**
```javascript
// Basis vectors (Z-up convention)
W_basis = (+1, +1, +1) / √3
X_basis = (+1, -1, -1) / √3
Y_basis = (-1, +1, -1) / √3
Z_basis = (-1, -1, +1) / √3

// Cartesian result
cartesian = w' * W_basis + x' * X_basis + y' * Y_basis + z' * Z_basis
```

### 9.2 Cartesian to Quadray

Given Cartesian coordinates (x, y, z):

```javascript
// Dot product with each basis vector
w = (x + y + z) / √3
x = (x - y - z) / √3
y = (-x + y - z) / √3
z = (-x - y + z) / √3

// Normalize to all-positive (optional)
min_val = min(w, x, y, z)
if (min_val < 0) {
  w -= min_val
  x -= min_val
  y -= min_val
  z -= min_val
}
```

### 9.3 Tom Ace's Implementation Reference

See: http://minortriad.com/quadray.html (C++ implementation)

Key insight: The conversion exploits the fact that "planar simplicial coordinates work like Cartesian 3-space coordinates projected onto the plane x+y+z=0."

---

## 10. RT-Pure Operations in Quadray Space

This section documents RT-pure (Rational Trigonometry) methods for performing geometric operations directly in Quadray space, based on Tom Ace's C++ implementation but rationalized to eliminate classical trigonometric functions.

### 10.1 The Tetrahedral Metric Tensor

In Quadray space, distances and quadrances require a **metric tensor** because the basis vectors are not orthonormal. The scaling factor `4/3` appears throughout due to the tetrahedral geometry.

**Quadrance Scaling Factor:**
```
Q_quadray = Q_cartesian × (4/3)
```

This factor arises from the tetrahedral angle relationship:
- Basis vectors meet at spread s = 8/9 (tetrahedral angle)
- The metric tensor compensates for non-orthogonal basis

### 10.2 Quadrance (Distance²) in Quadray Space

**RT-Pure Quadrance from Origin:**

Given a Quadray point P = (a, b, c, d):

```javascript
// Step 1: Zero-sum normalize
const mean = (a + b + c + d) / 4;
const normalized = [a - mean, b - mean, c - mean, d - mean];

// Step 2: Compute quadrance (sum of squares)
let Q = 0;
for (let i = 0; i < 4; i++) {
  Q += normalized[i] * normalized[i];
}

// Step 3: Apply metric scaling
const quadrance = Q * (4 / 3);  // Metric tensor scaling

// Note: Distance = √quadrance (defer √ to GPU boundary)
```

**RT-Pure Quadrance Between Two Points:**

Given P1 = (a1, b1, c1, d1) and P2 = (a2, b2, c2, d2):

```javascript
// Step 1: Zero-sum normalize both points
const norm1 = zeroSumNormalize([a1, b1, c1, d1]);
const norm2 = zeroSumNormalize([a2, b2, c2, d2]);

// Step 2: Compute difference quadrance
let Q = 0;
for (let i = 0; i < 4; i++) {
  const delta = norm1[i] - norm2[i];
  Q += delta * delta;
}

// Step 3: Apply metric scaling
const quadrance = Q * (4 / 3);
```

### 10.3 Dot Product in Quadray Space

**RT-Pure Dot Product:**

The dot product of two Quadray vectors follows the same pattern:

```javascript
function quadrayDotProduct(P, Q) {
  // Step 1: Zero-sum normalize both vectors
  const normP = zeroSumNormalize(P);
  const normQ = zeroSumNormalize(Q);

  // Step 2: Compute standard dot product
  let dot = 0;
  for (let i = 0; i < 4; i++) {
    dot += normP[i] * normQ[i];
  }

  // Step 3: Apply metric scaling
  return dot * (4 / 3);
}
```

**Spread from Dot Product (RT-Pure):**

```javascript
// Spread s = 1 - (dot²) / (Q_P × Q_Q)
// This replaces sin²(θ) without transcendental functions!
function quadraySpread(P, Q) {
  const dot = quadrayDotProduct(P, Q);
  const Q_P = quadrayQuadrance(P);
  const Q_Q = quadrayQuadrance(Q);

  return 1 - (dot * dot) / (Q_P * Q_Q);
}
```

### 10.4 Cross Product in Quadray Space

Tom Ace's cross product formula uses a 4×4 determinant with basis vectors in the top row:

```
|  W       X       Y       Z      |
|  k       k       k       k      |
|  P.a     P.b     P.c     P.d    |
|  Q.a     Q.b     Q.c     Q.d    |
```

Where k = √3/3 (scaling constant).

**RT-Pure Cross Product (deferred √):**

```javascript
function quadrayCrossProduct(P, Q) {
  // k² = 1/3 (work in quadrance space, defer √3)
  const k = Math.sqrt(3) / 3;  // Only √ at final step

  const result = [0, 0, 0, 0];

  // Laplace expansion along top row (basis vectors)
  result[0] = k * (P[2]*Q[3] - P[3]*Q[2] + P[3]*Q[1] - P[1]*Q[3] + P[1]*Q[2] - P[2]*Q[1]);
  result[1] = k * (P[3]*Q[2] - P[2]*Q[3] + P[0]*Q[3] - P[3]*Q[0] + P[2]*Q[0] - P[0]*Q[2]);
  result[2] = k * (P[0]*Q[1] - P[1]*Q[0] + P[3]*Q[0] - P[0]*Q[3] + P[1]*Q[3] - P[3]*Q[1]);
  result[3] = k * (P[2]*Q[1] - P[1]*Q[2] + P[0]*Q[2] - P[2]*Q[0] + P[1]*Q[0] - P[0]*Q[1]);

  return result;
}
```

### 10.5 RT-Pure Rotation in Quadray Space

Tom Ace's original rotation formula uses classical trigonometry:
```
F = (2·cos(θ) + 1) / 3
G = (2·cos(θ - 120°) + 1) / 3
H = (2·cos(θ + 120°) + 1) / 3
```

**RT-Pure Rotation Using Spread:**

We rationalize this using N.J. Wildberger's spread/cross formulas:

```javascript
/**
 * RT-Pure rotation coefficients using spread (s) and cross (c)
 *
 * Spread s = sin²(θ)  (rational, no transcendentals)
 * Cross c = cos²(θ) = 1 - s  (complementary)
 *
 * For rotation by spread s about the W-axis:
 */
function rotationCoeffsFromSpread(s) {
  // cos(θ) from spread: cos²(θ) = 1 - s, so cos(θ) = ±√(1-s)
  // Sign determined by quadrant (spread doesn't distinguish)
  const cosTheta = Math.sqrt(1 - s);  // Deferred √

  // F, G, H from cos identities (rationalized)
  // cos(θ - 120°) = cos(θ)·cos(120°) + sin(θ)·sin(120°)
  //               = cos(θ)·(-1/2) + sin(θ)·(√3/2)
  // Similarly for θ + 120°

  const sinTheta = Math.sqrt(s);  // sin(θ) = √spread
  const cos120 = -0.5;            // Exact rational: -1/2
  const sin120 = Math.sqrt(0.75); // √(3/4) - deferred

  const F = (2 * cosTheta + 1) / 3;
  const G = (2 * (cosTheta * cos120 + sinTheta * sin120) + 1) / 3;
  const H = (2 * (cosTheta * cos120 - sinTheta * sin120) + 1) / 3;

  return { F, G, H };
}

/**
 * Rotate Quadray point about W-axis by spread s
 *
 * Rotation matrix:
 * | 1  0  0  0 |
 * | 0  F  H  G |
 * | 0  G  F  H |
 * | 0  H  G  F |
 */
function rotateAboutW(point, spread) {
  const { F, G, H } = rotationCoeffsFromSpread(spread);

  return [
    point[0],  // W unchanged
    F * point[1] + H * point[2] + G * point[3],
    G * point[1] + F * point[2] + H * point[3],
    H * point[1] + G * point[2] + F * point[3]
  ];
}
```

**Exact Integer Spread Rotations (Gold Standard):**

For certain special angles, spread and cross are exact rationals:

| Rotation | Spread (s) | Cross (c) | Notes |
|----------|------------|-----------|-------|
| 0° | 0 | 1 | Identity |
| 30° | 1/4 | 3/4 | — |
| 45° | 1/2 | 1/2 | Exact! |
| 60° | 3/4 | 1/4 | Equilateral triangle angle |
| 90° | 1 | 0 | Exact integers! |
| 120° | 3/4 | 1/4 | Tetrahedral face angle |
| 180° | 0 | 1 | Full inversion |

**Example: 90° Rotation (s=1, c=0):**
```javascript
// Perfect RT-pure rotation with exact integers
const F = (2 * 0 + 1) / 3 = 1/3;
const G = (2 * (-1/2) + 1) / 3 = 0;
const H = (2 * (-1/2) + 1) / 3 = 0;

// Wait - let's verify with full formula...
// At θ=90°: cos(90°)=0, sin(90°)=1
// F = (2·0 + 1)/3 = 1/3
// G = (2·(0·(-1/2) + 1·(√3/2)) + 1)/3 = (√3 + 1)/3
// H = (2·(0·(-1/2) - 1·(√3/2)) + 1)/3 = (-√3 + 1)/3

// Transformation matrix becomes pure rotation!
```

### 10.6 Weierstrass Circle Parametrization for Rotation

The Weierstrass substitution provides an **algebraic** alternative to classical trigonometry for generating rotation points:

**Classical (Transcendental):**
```
x = cos(θ)
y = sin(θ)
```

**Weierstrass (Algebraic):**
```
t = tan(θ/2)  // Parameter (rational for rational angles)

x = (1 - t²) / (1 + t²)
y = 2t / (1 + t²)
```

**RT-Pure Benefits:**
- For any rational t, both x and y are **exact rational values**
- No transcendental functions involved
- Natural connection to spread: s = y² = 4t² / (1 + t²)²

**Implementation in ARTexplorer:**

```javascript
// From rt-math.js - Weierstrass circle parametrization
RT.circleParam = function(t) {
  const t2 = t * t;
  const denom = 1 + t2;

  return {
    x: (1 - t2) / denom,  // cos(θ) - algebraic!
    y: (2 * t) / denom    // sin(θ) - algebraic!
  };
};

// Generate rotation points without sin/cos
function generateRotationPoints(segments) {
  const points = [];

  for (let i = 0; i <= segments; i++) {
    // Parameter t traces half-circle as t: -∞ → +∞
    // Use tan approximation for bounded range
    const angle = Math.PI * i / segments;
    const t = Math.tan(angle / 2);  // Only transcendental here

    const { x, y } = RT.circleParam(t);
    points.push({ x, y });
  }

  return points;
}
```

**Special Rational t-Values:**

| t | θ | cos(θ) | sin(θ) | Spread s |
|---|---|--------|--------|----------|
| 0 | 0° | 1 | 0 | 0 |
| 1/√3 | 60° | 1/2 | √3/2 | 3/4 |
| 1 | 90° | 0 | 1 | 1 |
| √3 | 120° | -1/2 | √3/2 | 3/4 |
| ∞ | 180° | -1 | 0 | 0 |

### 10.7 Application: Section Node Circles (Papercut Module)

The Weierstrass parametrization is used in the Papercut module for generating section node circles at cutplane intersections:

```javascript
// From rt-papercut.js - RT-pure circle generation
const segments = state.adaptiveNodeResolution ? 64 : 32;

const circlePoints = [];
for (let i = 0; i <= segments; i++) {
  // Weierstrass parameter
  const t = Math.tan(Math.PI * i / segments);
  const point = RT.circleParam(t);

  circlePoints.push(new THREE.Vector3(
    center.x + radius * point.x,
    center.y + radius * point.y,
    cutplaneZ
  ));
}
```

**Advantages over Classical Approach:**
- Algebraic computation until final Vector3 creation
- Exact rational coordinates for many common segment counts
- Educational demonstration of RT principles

---

## 11. Implementation Notes

### 11.1 Current ARTexplorer Implementation

The current implementation in `rt-math.js` uses coordinate **translation** rather than native Quadray calculation:

```javascript
// Current approach (Theatre - see DEV-PRIVATE.md §7.2.1)
Quadray.toCartesian = (a, b, c, d, THREE) => {
  const normalized = Quadray.zeroSumNormalize([a, b, c, d]);
  const result = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < 4; i++) {
    result.add(Quadray.basisVectors[i].clone().multiplyScalar(normalized[i]));
  }
  return result; // Back to XYZ immediately
};
```

### 11.2 Future: True WXYZ-Native Calculation

For RT-pure WXYZ calculations, we would implement:
- Native quadrance calculation using tetrahedral metric tensor
- Spread calculations directly in Quadray space
- Only convert to Cartesian at final GPU boundary (THREE.Vector3 creation)

See `DEV-PRIVATE.md` §7.2.4 for proposed implementation.

### 11.3 Polyhedra Coordinate Mapping

| Polyhedron | Quadray Pattern | Notes |
|------------|-----------------|-------|
| Tetrahedron | (1,0,0,0) perms | Single active coordinate |
| Dual Tetrahedron | (0,1,1,1) perms | Single inactive coordinate |
| Octahedron | (1,1,0,0) perms | Two active coordinates |
| Cube | (2,1,1,0) perms | Dominant + two secondary |
| Cuboctahedron | Mixed | 12 vertices at (1,1,0,0) positions |
| Rhombic Dodecahedron | Mixed | 14 vertices (6 axis + 8 octant) |

---

## 12. References

### Primary Sources

- **Kirby Urner** - Quadray Introduction: http://www.grunch.net/synergetics/quadintro.html
- **Tom Ace** - Quadray Coordinates (C++): http://minortriad.com/quadray.html
- **R. Buckminster Fuller** - Synergetics: https://www.rwgrayprojects.com/synergetics/synergetics.html

### ARTexplorer Documentation

- `DEV-PRIVATE.md` §7.2 - Quadray Coordinates: Theatre vs. Reality
- `rt-math.js` - Current Quadray implementation
- `rt-polyhedra.js` - Polyhedra generators (XYZ-based)

### Mathematical Background

- Fuller's "Isotropic Vector Matrix" (IVM) lattice theory
- Zero-sum normalization reduces 4 DOF to 3 DOF
- Tetrahedral angle: arccos(-1/3) ≈ 109.47°
- Spread between basis vectors: s = 8/9

---

## 13. Implementation: Kali-Yuga Scaling (Through-Origin Inversion)

**Branch:** `Kali-Yuga`
**Date:** 2026-01-21
**Status:** Workplan

---

### 13.1 Overview

The Kali-Yuga feature enables individual polyhedra to scale through the origin point, passing from positive dimensional space (4D+) into negative dimensional space (4D-). This implements the theoretical framework described in Section 4.1 (Topological Inversion Conjecture) and Section 5 (Negative Dimensionality).

**Key Concept:** When a selected polyhedron's scale passes through zero, it doesn't simply shrink to nothing — it inverts through the Janus Point (origin) and emerges in the complementary dimensional space. This is the geometric equivalent of Barbour's cosmological theory and Fuller's IN/OUT directionality.

---

### 13.2 User Experience Design

**Interaction Flow:**
1. User selects a polyhedron (Form or Instance)
2. User activates Scale mode (gumball)
3. User drags the central sphere (uniform scaling) toward the origin
4. As scale approaches zero, an **animated transition** triggers
5. The polyhedron "collapses" through origin and re-emerges inverted
6. Inverted form renders into white background, from former black background

**Visual Feedback:**
- **Positive space (4D+):** Normal solid rendering, black background
- **Transition zone (approaching 0):** Increasing transparency, possible particle/dissolve effect
- **Origin crossing:** Brief flash/pulse animation (the "Janus moment")
- **Negative space (4D-):** Translucent ghost rendering of remainder of polyhedra NOT affected by this scaling transformation (opacity ~0.3-0.4), **WHITE background**

**Background Inversion (Key Visual Cue):**
When ANY form exists in negative dimensional space, the entire scene background inverts from black to white. This dramatic shift signals unmistakably that we have entered a different dimensional realm — the "negative universe" or anti-space. The contrast inversion also ensures ghost forms remain visible (dark translucent on white vs. light translucent on black).

---

### 13.3 Technical Implementation Plan

#### Phase 1: Core Scaling Logic

**File:** `modules/rt-init.js` (lines 2455-2540)

**Current behavior:**
```javascript
// Line 2500 - Current clamping prevents negative values
const clampedScale = Math.max(0.1, Math.min(10.0, newScale));
```

**New behavior:**
```javascript
// Allow negative scaling, detect origin crossing
const JANUS_THRESHOLD = 0.05; // Zone near zero triggers transition
const previousScale = poly.userData.currentScale || 1.0;
const crossedOrigin = (previousScale > 0 && newScale < 0) ||
                      (previousScale < 0 && newScale > 0);

if (crossedOrigin) {
  // Trigger Janus transition animation
  triggerJanusTransition(poly, previousScale > 0 ? 'inward' : 'outward');
}

// Allow full range but clamp magnitude
const clampedScale = Math.sign(newScale) * Math.max(0.1, Math.min(10.0, Math.abs(newScale)));
```

#### Phase 2: Janus Transition Animation

**New function:** `triggerJanusTransition(polyhedron, direction)`

**Animation sequence:**
1. **Collapse phase** (200ms): Scale rapidly toward zero with increasing transparency
2. **Flash phase** (50ms): Brief white/golden flash at origin point
3. **Emerge phase** (200ms): Scale outward with remainder polyhedra ghost opacity, inverted geometry
4. **Settle phase** (100ms): Opacity stabilizes at ghost level

**Implementation approach:**
- Use `requestAnimationFrame` for smooth animation
- Store animation state in `poly.userData.janusAnimation`
- Disable gumball interaction during animation

#### Phase 3: Ghost Rendering

**Visual state tracking:**
```javascript
poly.userData.dimensionalState = 'positive'; // or 'negative'
poly.userData.isInverted = false; // or true after crossing
```

**Material modifications for ghost state:**
- Opacity: 0.35 (configurable)
- Emissive: slight glow to distinguish from transparent positive forms
- Side: `THREE.DoubleSide` (inverted winding order visible)
- DepthWrite: false (proper layering with positive forms)

#### Phase 4: Background Inversion

**Scene background management:**
```javascript
// Track global dimensional state
let hasNegativeForms = false;

function updateDimensionalBackground() {
  // Check if ANY form is in negative space
  hasNegativeForms = scene.children.some(child =>
    child.userData.dimensionalState === 'negative'
  );

  // Animate background transition
  const targetColor = hasNegativeForms ? 0xffffff : 0x000000;
  animateBackgroundColor(scene.background, targetColor, 300); // 300ms transition
}
```

**Visual implications:**
- Grid lines may need color inversion for visibility
- Basis vector colors remain unchanged (they exist in both spaces)
- UI panels remain dark (only 3D viewport inverts)

#### Phase 5: State Persistence

**Extend state manager** (`rt-state-manager.js`) to save/load:
- `dimensionalState`: 'positive' | 'negative'
- `isInverted`: boolean
- `currentScale`: can be negative
- Scene background state (derived from form states)

---

### 13.4 Technical Considerations

**THREE.js Negative Scale Behavior:**
- `object.scale.set(-1, -1, -1)` inverts geometry correctly
- Face winding order reverses (CCW becomes CW)
- Need `THREE.DoubleSide` or manual backface handling
- Normals point inward for negative scale

**Coordinate System Implications:**
- Inverted tetrahedron vertices: (-1,0,0,0), (0,-1,0,0), etc. in raw Quadray
- Maintains same centroid at origin
- Relationship to dual tetrahedron: inversion ≠ dual (dual is different vertex set)

**Performance Notes:**
- Animation uses existing render loop
- Ghost material can be shared across inverted forms
- No geometry regeneration needed (scale transform only)

---

### 13.5 File Modification Summary

| File | Changes |
|------|---------|
| `modules/rt-init.js` | Modify scale clamping (L2500), add `triggerJanusTransition()`, origin-crossing detection |
| `modules/rt-rendering.js` | Add ghost material, background inversion, `updateDimensionalBackground()` |
| `modules/rt-state-manager.js` | Extend state schema for dimensional state |
| `art.css` | Optional: CSS for UI indicators of inverted state |
| `index.html` | Optional: Add 4D± indicator in selection info |

---

### 13.6 Dimensional Transition Rules (Resolved)

These rules govern how forms behave during dimensional transitions:

#### Rule 1: Individual Selection Scaling
When a selected polyhedron is scaled toward negative space:
- **Non-selected positive forms ghost out** (fade to translucent) during the transition
- This creates a "spotlight" effect on the form crossing the Janus Point
- Once the selected form enters negative space, background inverts to white
- Non-selected forms remain ghosted until the inverting form settles

#### Rule 2: Global Inversion (Future Feature)
When global scale sliders support negative values:
- **ALL active forms pass through origin together**, preserving relative relationships
- This represents the "cosmic breath" — the entire universe inhaling through the Janus Point
- Individual inversion = local event; Global inversion = universal event
- Background inverts as the collective crosses zero

#### Rule 3: Dual Relationship Preservation
When a "parent" form inverts, its dual's relationship inverts too:
- The dual tetrahedron displayed as (0,1,1,1), (1,0,1,1), etc. is the raw negative form (-1,0,0,0), (0,-1,0,0) **normalized by +(1,1,1,1)** to show in positive space
- When the parent inverts to negative space, the dual's normalization relationship inverts
- **Double-negative becomes positive**: An inverted parent's dual would be normalized by -(1,1,1,1), effectively returning to raw negative coordinates
- This maintains the fundamental ±(1,1,1,1) translation relationship across dimensional boundaries

**Philosophical Note:** The dual is already a "shadow" of negative space projected into positive space. Global inversion reveals this truth — what appeared as the dual in positive space was always the true negative form, and vice versa.

---

### 13.7 Open Questions (Remaining)

1. **Axis-constrained scaling:** Should negative scaling be allowed on individual axes (non-uniform inversion), or only uniform through central sphere? *Recommendation: Uniform only for v1*

2. **IVM/Matrix context:** How do inverted forms interact with the IVM lattice visualization? Should negative space forms be excluded from IVM, or rendered as ghost lattice points?

---

### 13.8 Acceptance Criteria

- [ ] Selected polyhedron can scale through zero via gumball
- [ ] Animated transition plays when crossing origin
- [ ] Inverted forms render as translucent ghosts
- [ ] State persists in save/load
- [ ] No visual glitches at transition point
- [ ] Console logs dimensional state changes for debugging

---

**Document Status:** Complete polyhedra reference with RT-pure operations + Kali-Yuga workplan

**Last Updated:** 2026-01-21
