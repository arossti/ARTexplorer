# CODE-QUALITY-AUDIT.md

**ARTexplorer Geometry Project - Subagent Guide for Code Quality & RT-Purity Audits**

This document provides guidance to Claude Code AI agents when performing periodic code quality audits on the ARTexplorer (ThreeRT) geometry codebase. It combines standards enforcement, RT-purity verification, and code simplification guidelines.

---

## Table of Contents

1. [Audit Overview](#audit-overview)
2. [Audit Scope & Files](#audit-scope--files)
3. [Section 1: Automated Checks](#section-1-automated-checks)
4. [Section 2: Manual Review Checklist](#section-2-manual-review-checklist)
5. [Section 3: Refactoring Guidelines](#section-3-refactoring-guidelines)
6. [Section 4: RT-Specific Rules](#section-4-rt-specific-rules) *(includes Canonical Reference & RT-Alternative Lookup Table)*
7. [Section 5: Verification Path & Feedback Loop Audit](#section-5-verification-path--feedback-loop-audit)
8. [Quality Gates & Success Metrics](#quality-gates--success-metrics)
9. [Audit Workflow](#audit-workflow)
10. [Reporting Template](#reporting-template)

---

## Audit Overview

### Purpose

Maintain high code quality, architectural consistency, and RT-purity across the ARTexplorer geometry codebase through periodic systematic reviews.

### Audit Types

- **Minor Audit:** After each feature completion (focused on changed files)
- **Major Audit:** Monthly or before release milestones (full codebase review)
- **RT-Purity Audit:** Quarterly (deep dive on trigonometry elimination)

### Guiding Principles

1. **RT Philosophy First:** Rational Trigonometry (quadrance/spread) over classical trigonometry
2. **Simplicity Over Complexity:** Avoid over-engineering, premature abstraction
3. **Performance Awareness:** Maintain 60fps at default settings
4. **Code Clarity:** Self-documenting code preferred over excessive comments
5. **Module Boundaries:** Clear separation of concerns (math → geometry → rendering → UI → views)
6. **Closed Feedback Loops:** Every geometry module must have a verifiable output path (console, visual, or state round-trip)
7. **Error Compounding Awareness:** Track where rational-to-float boundaries are; document downstream precision impact

---

## Audit Scope & Files

### Core Module Files (Priority 1)

```
modules/
├── rt-init.js            # Application orchestration
├── rt-rendering.js       # THREE.js scene management (Factory pattern)
├── rt-math.js            # RT library (quadrance, spread, Phi, Sexagesimal)
├── rt-polyhedra.js       # All polyhedra generators (RT-pure)
├── rt-thomson.js         # Thomson great-circle shells (RT-pure geometry)
├── rt-matrix-planar.js   # IVM spatial arrays (planar N×N)
├── rt-matrix-radial.js   # IVM spatial arrays (radial)
├── rt-papercut.js        # Print mode, dynamic cutplane
├── rt-prime-cuts.js      # Prime polygon projection presets
├── rt-projections.js     # 2D polygon projections, Graham scan
├── rt-controls.js        # ART Gumball controls
├── rt-state-manager.js   # Forms/Instances state
├── rt-delta.js           # View snapshot diff/apply
├── rt-animate.js         # View transition animation (dissolve, lerp)
├── rt-viewmanager.js     # View sequence management
├── rt-filehandler.js     # State import/export
├── rt-grids.js           # Grid rendering
├── rt-nodes.js           # Node management
├── rt-primitives.js      # Primitive geometry
├── rt-helices.js         # Tetrahelix geometry
├── rt-penrose.js         # Penrose tiling
├── rt-ik-solvers.js      # Inverse kinematics constraint solvers
├── rt-ui-binding-defs.js # UI slider/checkbox binding definitions
├── rt-context.js         # Context menu handling
├── rt-info-modal.js      # Info modal UI
├── rt-metalog.js         # MetaLog diagnostic overlay
├── color-theory-modal.js # Color calibration tool
└── rt-janus.js           # Janus mode handling
```

### Demo Files (Priority 2)

```
demos/
├── rt-quadrance-demo.js    # Plimpton 322 Babylonian math
├── rt-cross-demo.js        # Spread/Cross with Sexagesimal
├── rt-weierstrass-demo.js  # Rational circle parametrization
└── rt-demo-utils.js        # Shared demo utilities
```

### Asteroids Game Module (Priority 3)

```
modules/asteroids/
├── rt-asteroids-core.js      # Game core logic
├── rt-asteroids-player.js    # Player controls
├── rt-asteroids-enemies.js   # Enemy AI
├── rt-asteroids-weapons.js   # Weapon systems
├── rt-asteroids-hud.js       # HUD display
├── rt-asteroids-audio.js     # Audio management
├── rt-asteroids-blackhole.js # Black hole effects
└── rt-asteroids-license.js   # License info
```

### Exclude from Audit

- `performance-clock.js` - Monitoring only, no RT concerns
- `index.html` - UI structure, not code quality target
- `art.css` - Styling, separate audit process

---

## Section 1: Automated Checks

### 1.1 Prettier Formatting

**Goal:** Consistent code formatting across all modules.

**Commands:**

```bash
# Check formatting (no changes)
npx prettier --check "modules/**/*.js" "demos/**/*.js"

# Auto-format all files
npx prettier --write "modules/**/*.js" "demos/**/*.js"
```

**Standard Configuration:**

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always"
}
```

**Success Criteria:** ✅ Zero formatting violations

---

### 1.2 ESLint Compliance

**Goal:** Catch common JavaScript errors and enforce code standards.

**Commands:**

```bash
# Run linting
npx eslint "modules/**/*.js" "demos/**/*.js"

# Auto-fix issues
npx eslint --fix "modules/**/*.js" "demos/**/*.js"
```

**Key Rules for Geometry Code:**

- `no-unused-vars`: Flag unused variables/imports
- `no-console`: Warn on console.log (allow in dev, remove for production)
- `prefer-const`: Use const for immutable values
- `no-var`: Enforce let/const over var
- `eqeqeq`: Require === over ==

**Success Criteria:** ✅ Zero ESLint errors, < 5 warnings

---

### 1.3 Performance Profiling

**Goal:** Identify performance bottlenecks before they impact user experience.

**Browser Console Script:**

```javascript
// Measure render loop performance
let frameCount = 0;
let totalTime = 0;
const startTime = performance.now();

const measureLoop = () => {
  const frameStart = performance.now();
  requestAnimationFrame(() => {
    const frameDuration = performance.now() - frameStart;
    totalTime += frameDuration;
    frameCount++;

    if (frameCount < 60) {
      measureLoop();
    } else {
      const avgFrameTime = totalTime / frameCount;
      const fps = 1000 / avgFrameTime;
      console.log(`Average Frame Time: ${avgFrameTime.toFixed(2)}ms`);
      console.log(`Average FPS: ${fps.toFixed(1)}`);
      console.log(`Target: 16.67ms/frame (60fps)`);
    }
  });
};

measureLoop();
```

**Success Criteria:** ✅ Average frame time < 16.67ms (60fps) at default settings

---

## Section 2: Manual Review Checklist

### 2.1 Code Quality Review

Run through this checklist for each file in audit scope:

#### Duplication Detection

- [ ] **No duplicate functions:** Search for similar function names across modules
- [ ] **No duplicate logic:** Identify repeated calculation patterns
- [ ] **Consolidation opportunities:** Can similar functions be unified with parameters?

**Example Console Script:**

```javascript
// List all exported functions from rt-polyhedra.js
console.log(Object.keys(window.Polyhedra || {}));
// Look for patterns like: geodesicIcosahedron, geodesicTetrahedron, geodesicOctahedron
// → Could these share a common geodesicSubdivide() function?
```

#### Verbosity Check

- [ ] **Remove debug console.logs:** Production code should be clean
- [ ] **Remove commented-out code:** Delete, don't comment (use git history)
- [ ] **Remove excessive inline comments:** Code should be self-documenting
- [ ] **Keep only non-obvious comments:** Explain "why", not "what"

**Red Flags:**

```javascript
// ❌ BAD - Obvious comment
// Loop through vertices
for (let i = 0; i < vertices.length; i++) { ... }

// ✅ GOOD - Explains non-obvious logic
// Deferred √ expansion: keep in quadrance space until final THREE.Vector3
const Q = dx * dx + dy * dy + dz * dz;
```

#### Function Ordering

- [ ] **Logical grouping:** Related functions near each other
- [ ] **Public before private:** Exported API at top, helpers below
- [ ] **Dependency order:** Called functions defined before callers (when possible)

**Example Structure:**

```javascript
// rt-math.js recommended order:
// 1. Core RT functions (quadrance, spread)
// 2. Phi/golden ratio helpers
// 3. Circle parametrization
// 4. Validation utilities
// 5. Sexagesimal namespace (grouped together)
```

---

### 2.2 Architecture Review

#### Module Responsibility Boundaries

**Verify each module has clear, single responsibility:**

| Module                | Responsibility                         | Should NOT contain                  |
| --------------------- | -------------------------------------- | ----------------------------------- |
| `rt-init.js`          | App orchestration, module coordination | Geometry generation, THREE.js scene |
| `rt-rendering.js`     | THREE.js scene, camera, grids          | Polyhedra definitions, RT math      |
| `rt-math.js`          | RT calculations only                   | THREE.js dependencies, UI logic     |
| `rt-polyhedra.js`     | Polyhedra generators                   | Rendering, scene management         |
| `rt-controls.js`      | Gumball UI interaction                 | Geometry generation, file I/O       |
| `rt-state-manager.js` | State persistence                      | Direct DOM manipulation             |

**Audit Questions:**

- [ ] Does `rt-math.js` import THREE.js? (Should only return raw coordinates)
- [ ] Does `rt-polyhedra.js` reference DOM elements? (Should be pure functions)
- [ ] Does `rt-rendering.js` contain calculation logic? (Should delegate to rt-math)
- [ ] Do new polyhedra follow the 7-step ecosystem checklist? (See `Geometry Documents/Add-Polyhedra-Guide.md`)

#### Import/Export Clarity

**Check for:**

- [ ] **Clear export structure:** Named exports vs. default exports
- [ ] **No circular dependencies:** A imports B, B imports A (forbidden)
- [ ] **Minimal cross-module coupling:** Modules should be loosely coupled

**Example Audit Script:**

```javascript
// Check what rt-rendering.js exports
console.log("Rendering exports:", Object.keys(window.Rendering || {}));

// Verify factory pattern
console.log(
  "Has createScene?",
  typeof window.Rendering?.createScene === "function"
);
```

#### API Surface Consistency

**Naming Conventions:**

- [ ] **Polyhedra generators:** `Polyhedra.shape(halfSize, ...params)`
- [ ] **RT math functions:** `RT.functionName(args)` (e.g., `RT.quadrance()`)
- [ ] **Rendering factory:** `Rendering.createScene(config)` returns API object
- [ ] **Gumball controls:** Event-driven, stateful closures

**Parameter Order Consistency:**

- [ ] **Size parameters first:** `(halfSize, frequency)` not `(frequency, halfSize)`
- [ ] **Optional parameters last:** `(required1, required2, optional = default)`

---

### 2.3 RT-Purity Verification

**Critical Check:** Search for classical trigonometry violations. See Section 4 for the full RT-Alternative Lookup Table.

**The core question for every math call:** Does `rt-math.js` already provide an RT-pure alternative? If yes, using the classical version is a violation.

#### Forbidden Patterns (Exceptions must be justified)

```bash
# Search for Math.PI usage
grep -rn "Math.PI" modules/

# Search for sin/cos/tan
grep -rn "Math.sin\|Math.cos\|Math.tan" modules/

# Search for arcsin/arccos/arctan
grep -rn "Math.asin\|Math.acos\|Math.atan" modules/

# Search for premature sqrt (should defer to THREE.Vector3 boundary)
grep -rn "Math.sqrt" modules/
```

**For each occurrence found, the auditor must answer:**
1. Is there an RT-pure alternative in `rt-math.js`? (Check the lookup table in Section 4)
2. If yes → violation; replace with RT alternative
3. If no → is it at a justified boundary? (THREE.js API, UX degree conversion, demo comparison)
4. If justified → add `// Math.X justified:` comment explaining why

**Allowed Exceptions (must have justification comment):**

1. **THREE.js API boundary:** `rotation.x = Math.PI/2` — THREE.js requires radians internally
2. **UX degree↔radian conversion:** Slider boundary only; the rotation itself should use `RT.reflectInLine()`
3. **Demo modules:** Explicitly comparing RT vs classical results (educational)
4. **Comments/Documentation:** Explaining conversion from classical to RT

**Example Justification Comment:**

```javascript
// Math.PI/Math.tan justified: degree-to-slope UX boundary; rotation itself is RT-pure
const halfRad = (rotationDeg / 2 * Math.PI) / 180;
const m = Math.tan(halfRad);
// From here, double reflection via RT.reflectInLine(x, y, m) — pure RT
```

#### Verify Deferred √ Expansion Pattern

**Correct Pattern:**

```javascript
// ✅ GOOD - Deferred √ expansion
function calculateEdge(p1, p2) {
  // Work in quadrance space
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  const Q = dx * dx + dy * dy + dz * dz;

  // Only take √ at final THREE.Vector3 creation
  return Math.sqrt(Q);
}
```

**Incorrect Pattern:**

```javascript
// ❌ BAD - Premature √ expansion
function calculateEdge(p1, p2) {
  const distance = Math.sqrt(
    (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2 + (p2.z - p1.z) ** 2
  );
  return distance; // Lost algebraic precision
}
```

#### Golden Ratio Identity Usage

**Verify φ calculations use identities:**

```javascript
// ✅ GOOD - Uses identity φ² = φ + 1
const phiSquared = phi + 1;

// ✅ GOOD - Uses identity 1/φ = φ - 1
const invPhi = phi - 1;

// ❌ BAD - Unnecessary division
const invPhi = 1 / phi; // Should use algebraic identity
```

---

## Section 3: Refactoring Guidelines

### 3.1 When to Refactor

**Refactor if:**

- ✅ Function > 50 lines (consider splitting)
- ✅ Duplicate code in 3+ places (extract to shared function)
- ✅ Complex nested conditionals (use early returns or lookup tables)
- ✅ Magic numbers (extract to named constants)

**Do NOT refactor if:**

- ❌ Code is clear and working fine (no performance/readability issue)
- ❌ "Improving" working code without measurable benefit
- ❌ Introducing abstraction for hypothetical future use

### 3.2 Simplification Patterns

#### Pattern 1: Extract Magic Numbers

**Before:**

```javascript
const vertices = [
  [0, 1.618, 1],
  [0, -1.618, 1],
  // ...
];
```

**After:**

```javascript
const phi = (1 + Math.sqrt(5)) / 2;
const vertices = [
  [0, phi, 1],
  [0, -phi, 1],
  // ...
];
```

#### Pattern 2: Consolidate Duplicate Logic

**Before:**

```javascript
function geodesicIcosahedron(halfSize, frequency) {
  const base = icosahedron(halfSize);
  const subdivided = subdivideTriangles(base, frequency);
  const projected = projectToSphere(subdivided, halfSize);
  return projected;
}

function geodesicTetrahedron(halfSize, frequency) {
  const base = tetrahedron(halfSize);
  const subdivided = subdivideTriangles(base, frequency);
  const projected = projectToSphere(subdivided, halfSize);
  return projected;
}
```

**After:**

```javascript
function geodesicSubdivide(basePolyhedron, halfSize, frequency) {
  const subdivided = subdivideTriangles(basePolyhedron, frequency);
  return projectToSphere(subdivided, halfSize);
}

function geodesicIcosahedron(halfSize, frequency) {
  return geodesicSubdivide(icosahedron(halfSize), halfSize, frequency);
}

function geodesicTetrahedron(halfSize, frequency) {
  return geodesicSubdivide(tetrahedron(halfSize), halfSize, frequency);
}
```

#### Pattern 3: Early Returns Over Nested Conditions

**Before:**

```javascript
function validateEdges(edges) {
  if (edges && edges.length > 0) {
    const quadrances = edges.map(e => calculateQ(e));
    if (quadrances.length > 0) {
      const allEqual = checkUniformity(quadrances);
      if (allEqual) {
        return true;
      }
    }
  }
  return false;
}
```

**After:**

```javascript
function validateEdges(edges) {
  if (!edges || edges.length === 0) return false;

  const quadrances = edges.map(e => calculateQ(e));
  if (quadrances.length === 0) return false;

  return checkUniformity(quadrances);
}
```

### 3.3 Performance Optimization Patterns

#### Pattern 1: Geometry Caching

**Before:**

```javascript
// Regenerates geometry every frame
function updateNodes() {
  nodes.forEach(node => {
    node.geometry = createGeodesicSphere(frequency);
  });
}
```

**After:**

```javascript
// Cache geometry, reuse instances
const geometryCache = new Map();

function getCachedNodeGeometry(frequency) {
  if (!geometryCache.has(frequency)) {
    geometryCache.set(frequency, createGeodesicSphere(frequency));
  }
  return geometryCache.get(frequency);
}

function updateNodes() {
  const sharedGeometry = getCachedNodeGeometry(frequency);
  nodes.forEach(node => {
    node.geometry = sharedGeometry;
  });
}
```

#### Pattern 2: Avoid Unnecessary Recalculations

**Before:**

```javascript
// Recalculates every render
function render() {
  const triangleCount = countTriangles(); // Expensive!
  updateUI(triangleCount);
  renderer.render(scene, camera);
}
```

**After:**

```javascript
// Cache count, invalidate on scene change
let cachedTriangleCount = 0;
let sceneChanged = true;

function onSceneChange() {
  sceneChanged = true;
}

function render() {
  if (sceneChanged) {
    cachedTriangleCount = countTriangles();
    updateUI(cachedTriangleCount);
    sceneChanged = false;
  }
  renderer.render(scene, camera);
}
```

---

## Section 4: RT-Specific Rules

### Canonical Reference: `modules/rt-math.js`

**`rt-math.js` is the single source of truth for all mathematical operations.** Before introducing any classical trig function (`Math.PI`, `Math.sin`, `Math.cos`, `Math.tan`, `Math.atan2`, or radicals), the auditor MUST verify that no RT-pure alternative exists in `rt-math.js`.

**Why this matters:** AI agents naturally default to classical coordinate geometry and trigonometry. This app is explicitly a Rational Trigonometry and Quadray/Synergetics explorer — classical shortcuts undermine its core purpose and pollute the codebase.

**RT-Alternative Lookup Table:**

| Classical Pattern | RT-Pure Alternative in `rt-math.js` | Notes |
|---|---|---|
| `Math.sin(θ)` / `Math.cos(θ)` for polygon vertices | `RT.nGonVertices(n, radius)` | Wildberger reflection construction; exact for N=3–12 |
| `Math.atan2(y, x)` for angles | `RT.slopeFromSpread()` or spread-based comparison | Slope is rational when inputs are rational |
| `Math.acos(dot)` for angle between vectors | `RT.spread(v1, v2)` = `1 - dot²/(Q₁·Q₂)` | Direct spread; no inverse trig |
| `Math.sqrt(dx²+dy²)` for distance | `RT.quadrance(p1, p2)` = `dx²+dy²` | Defer √ to final THREE.Vector3 boundary |
| Rotation by θ radians | `RT.reflectInLine(x, y, slope)` twice | Double reflection = rotation by 2×atan(slope) |
| `(1+Math.sqrt(5))/2` for φ then `φ*φ` | `PurePhi.phi_sq()` = φ+1 (identity) | Symbolic `(a+b√5)/c` algebra |
| `Math.sqrt(2)`, `Math.sqrt(3)` | `PureRadicals.sqrt2()`, `.sqrt3()`, `.sqrt6()` | Cached; single allocation |
| `Math.cos(2π/7)` for heptagon | `PureCubics.heptagon()` | Cached cubic roots |
| Decimal coordinates for regular polygons | `SymbolicCoord` — exact `(a+b√D)/c` | Covers N=3,4,5,6,8,10,12 |
| `RT.circleParam(t)` | Weierstrass rational parametrization | `x=(1-t²)/(1+t²)`, `y=2t/(1+t²)` |

**Source materials for reference:**
- N.J. Wildberger, *Divine Proportions* — `Geometry Documents/Wildberger References/`
- R.B. Fuller, *Synergetics* — `Geometry Documents/Wildberger References/`

### 4.1 Quadrance/Spread Enforcement

**Rule:** All distance/angle calculations MUST use quadrance/spread.

**Audit Checklist:**

- [ ] Distance calculations use `Q = dx² + dy² + dz²` (not `d = √(...)` until final output)
- [ ] Angle calculations use `s = 1 - (v₁·v₂)² / (Q₁·Q₂)` (not `θ = arccos(...)`)
- [ ] Spread values verify `s + c = 1` identity
- [ ] Edge validation uses quadrance uniformity

**Verification Script:**

```javascript
// Check if RT.quadrance is used correctly
const testPoints = [
  [0, 0, 0],
  [1, 1, 1],
];
const Q = RT.quadrance(testPoints[0], testPoints[1]);
console.log("Quadrance:", Q); // Should be 3
console.log("Expected:", 1 * 1 + 1 * 1 + 1 * 1); // Verify = 3
```

### 4.2 Deferred √ Expansion Patterns

**Rule:** Delay Math.sqrt() until THREE.Vector3 creation.

**Good Examples:**

```javascript
// ✅ Pattern 1: Midpoint calculation (no √ needed)
function midpoint(p1, p2) {
  return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2]; // Pure algebra, exact
}

// ✅ Pattern 2: Sphere projection (√ only at end)
function projectToSphere(vertex, radius) {
  const Q = vertex[0] ** 2 + vertex[1] ** 2 + vertex[2] ** 2;
  const scale = radius / Math.sqrt(Q); // √ deferred to here
  return [vertex[0] * scale, vertex[1] * scale, vertex[2] * scale];
}

// ✅ Pattern 3: THREE.Vector3 creation (final boundary)
function createVertex(coords) {
  return new THREE.Vector3(coords[0], coords[1], coords[2]);
  // THREE.js handles floating-point from here
}
```

### 4.3 Circle Parametrization (Weierstrass Substitution)

**Rule:** Use rational circle parametrization when possible.

**Weierstrass Pattern:**

```javascript
// ✅ RT-Pure circle parametrization
function rationalCirclePoint(t) {
  // Weierstrass substitution: sin(θ) = 2t/(1+t²), cos(θ) = (1-t²)/(1+t²)
  const denom = 1 + t * t;
  const x = (1 - t * t) / denom; // cos(θ)
  const y = (2 * t) / denom; // sin(θ)
  return [x, y];
}
```

**For n-sided polygons (exact vertices):**

```javascript
// ✅ Exact algebraic coordinates for regular polygons
function polygonVertex(n, k, radius) {
  // Use exact algebraic formulas when available
  if (n === 3) return triangleVertex(k, radius); // Exact
  if (n === 4) return squareVertex(k, radius); // Exact
  if (n === 6) return hexagonVertex(k, radius); // Exact

  // For other n, use Weierstrass or accept sin/cos with justification
  // TODO: Research exact algebraic forms for n=5,8,12
}
```

### 4.4 Golden Ratio Identity Enforcement

**Rule:** Use φ identities to eliminate multiplication/division.

**Required Identities:**

```javascript
const phi = (1 + Math.sqrt(5)) / 2;

// ✅ Identity 1: φ² = φ + 1 (eliminates multiplication)
const phiSquared = phi + 1; // NOT phi * phi

// ✅ Identity 2: 1/φ = φ - 1 (eliminates division)
const invPhi = phi - 1; // NOT 1 / phi

// ✅ Identity 3: φ³ = 2φ + 1
const phiCubed = 2 * phi + 1; // NOT phi * phi * phi
```

**Audit Pattern:**

```bash
# Search for φ multiplication/division violations
grep -rn "phi \* phi\|phi \/ phi" modules/rt-polyhedra.js
```

---

## Section 5: Verification Path & Feedback Loop Audit

*Informed by Wei et al. 2026 "Agentic Reasoning for LLMs" — Sections 3.2 (Tool Use), 4.1 (Feedback Mechanisms), and 6.1 (Math Exploration & Vibe Coding Agents).*

### 5.1 Closed Feedback Loop Check

Every geometry module should have a verifiable output path. For each module:

- [ ] **Console diagnostic**: Does the module produce meaningful console output (vertex counts, coincident counts, error bounds)?
- [ ] **Visual verification**: Can the output be seen and inspected in the 3D viewport?
- [ ] **State round-trip**: Does the geometry survive save → reload → re-render without loss?
- [ ] **View system integration**: Are all user-facing controls captured by `rt-delta.js` for view state?

**Verification Matrix:**

| Module | Console | Visual | State Round-trip | View System |
|---|---|---|---|---|
| `rt-polyhedra.js` | vertex/face counts | renderPolyhedron() | state-manager | checkboxes in delta |
| `rt-thomson.js` | coincidentCount | renderThomsonCircles() | state-manager | sliders + checkboxes in delta |
| `rt-grids.js` | — | grid groups | — | grid checkboxes in delta |
| `rt-projections.js` | hull vertex count | 2D overlay | — | — |
| `rt-matrix-planar.js` | — | matrix render | state-manager | checkbox in delta |

### 5.2 Rational-to-Float Boundary Tracing

Track where algebraic precision is lost and assess downstream impact:

- [ ] **Identify all Math.sqrt() calls** and verify they are at the final THREE.Vector3 boundary
- [ ] **Identify all Math.PI/sin/cos/tan calls** and verify they are at UX boundaries (degrees → radians) with justification comments
- [ ] **Float32 sensitivity**: For convex hull and projection operations, verify that vertices with near-zero cross products (< 0.1) are handled robustly
- [ ] **Scale independence**: Verify that hull counts and geometric properties are stable across different `tetEdge` scale values

### 5.3 Geometry Decomposition Audit

For complex geometry features, verify the construction-verification-integration pattern:

- [ ] **Construction**: Pure math module produces correct vertices/edges/faces (RT-pure)
- [ ] **Verification**: Output validated against known targets (e.g., N=4 oct → 6 nodes at octahedron vertices)
- [ ] **Integration**: Rendering, state persistence, and view system all handle the new geometry
- [ ] **Edge cases**: Minimum inputs (< 4 nodes for hull), maximum inputs (15 planes x 12-gon), degenerate configurations

---

## Quality Gates & Success Metrics

### Mandatory Requirements (Must Pass)

- ✅ **Zero ESLint errors**
- ✅ **Zero Prettier formatting violations**
- ✅ **60fps performance** at default settings (60 Hz = 16.67ms/frame)
- ✅ **No duplicate function implementations** (DRY principle)
- ✅ **All modules have clear responsibility** (architecture audit)

### Target Goals (Should Pass)

- 🎯 **< 5% classical trigonometry usage** (with documented justification)
- 🎯 **< 10 ESLint warnings** total across all files
- 🎯 **< 5 console.log statements** in production code
- 🎯 **< 50 lines per function** (average, excluding polyhedra data arrays)
- 🎯 **Zero commented-out code blocks** (use git history instead)

### Aspirational Metrics (Nice to Have)

- ⭐ **100% RT-pure geometry generation** (zero Math.PI/sin/cos)
- ⭐ **< 30 lines per function** (exceptional clarity)
- ⭐ **< 1 ESLint warning** total
- ⭐ **90fps performance** (11.11ms/frame) at default settings

---

## Audit Workflow

### Step 1: Preparation

1. **Checkout audit branch:**

   ```bash
   git checkout -b code-audit-YYYY-MM-DD
   ```

2. **Ensure clean working tree:**

   ```bash
   git status
   # Should show: "nothing to commit, working tree clean"
   ```

3. **Install dependencies (if needed):**
   ```bash
   npm install
   ```

### Step 2: Automated Checks

Run all automated tools and document results:

```bash
# Prettier check
npx prettier --check "modules/**/*.js" "demos/**/*.js" > audit-prettier.txt

# ESLint check
npx eslint "modules/**/*.js" "demos/**/*.js" > audit-eslint.txt

# Performance check (manual, in browser console)
# Copy results to audit-performance.txt
```

### Step 3: Manual Review

For each file in [Audit Scope](#audit-scope--files):

1. **Open file in editor**
2. **Run through [Manual Review Checklist](#section-2-manual-review-checklist)**
3. **Document findings in audit report**
4. **Flag items for refactoring**

### Step 4: RT-Purity Deep Dive

```bash
# Generate RT-purity report
grep -rn "Math.PI\|Math.sin\|Math.cos\|Math.tan\|Math.asin\|Math.acos\|Math.atan" \
  modules/ demos/ > audit-rt-purity.txt

# Also scan for premature sqrt
grep -rn "Math.sqrt" modules/ >> audit-rt-purity.txt

# Review each occurrence against the RT-Alternative Lookup Table (Section 4):
# 1. Check if rt-math.js provides an RT-pure alternative
# 2. If yes → violation; flag for replacement
# 3. If no → verify it's at a justified boundary with comment
# 4. Record verdict in report
```

### Step 5: Generate Audit Report

Use the [Reporting Template](#reporting-template) below.

### Step 6: Create Issues/TODOs

For each finding:

1. **Critical issues:** Create GitHub issue immediately
2. **Non-critical items:** Add to Section 8 TODO Master List
3. **Quick fixes:** Apply during audit (format, remove console.logs)

### Step 7: Commit Audit Fixes

```bash
# Stage changes
git add .

# Commit with audit summary
git commit -m "$(cat <<'EOF'
Clean: Code quality audit YYYY-MM-DD

Automated fixes:
- Prettier formatting (XX files)
- ESLint auto-fixes (XX warnings)
- Removed console.log statements (XX occurrences)

Manual fixes:
- [List significant refactorings]

Remaining items:
- [Link to created GitHub issues]
- [Link to TODO Master List updates]

🤖 Co-Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Andy🤦‍♂️ & Claude🤖 <andy@openbuilding.ca>
EOF
)"

# Push audit branch
git push -u origin code-audit-YYYY-MM-DD
```

---

## Reporting Template

```markdown
# Code Quality Audit Report

**Date:** YYYY-MM-DD
**Auditor:** Claude Code (Sonnet 4.5)
**Audit Type:** [Minor | Major | RT-Purity]
**Branch:** code-audit-YYYY-MM-DD

---

## Executive Summary

**Overall Status:** [✅ PASS | ⚠️ PASS WITH WARNINGS | ❌ FAIL]

**Files Audited:** XX files
**Issues Found:** XX total (XX critical, XX non-critical)
**Auto-Fixed:** XX issues
**Manual Action Required:** XX issues

---

## Section 1: Automated Checks

### Prettier Formatting

- **Status:** [✅ PASS | ❌ FAIL]
- **Violations:** XX files
- **Auto-Fixed:** [Yes | No]

### ESLint Compliance

- **Status:** [✅ PASS | ⚠️ WARNINGS | ❌ FAIL]
- **Errors:** XX
- **Warnings:** XX
- **Top Issues:**
  1. [Issue type]: XX occurrences
  2. [Issue type]: XX occurrences

### Performance

- **Status:** [✅ PASS | ❌ FAIL]
- **Average Frame Time:** X.XXms
- **Average FPS:** XX.X fps
- **Target Met:** [Yes | No]

---

## Section 2: Manual Review Findings

### Code Quality

- **Duplicate Functions:** XX found
  - [List duplicates with file:line references]
- **Verbose Code:** XX functions > 50 lines
  - [List with file:line and line counts]
- **Dead Code:** XX blocks of commented code
  - [List with file:line references]

### Architecture Review

- **Module Boundary Violations:** XX found
  - [Describe violations]
- **Import/Export Issues:** XX found
  - [Describe issues]
- **API Inconsistencies:** XX found
  - [Describe inconsistencies]

---

## Section 3: RT-Purity Analysis

### Classical Trigonometry Usage

- **Total Occurrences:** XX
- **Justified:** XX (with documentation)
- **Unjustified:** XX (requires fix)
- **Breakdown:**
  - Math.PI: XX occurrences ([file:line, ...])
  - Math.sin/cos/tan: XX occurrences ([file:line, ...])
  - Math.asin/acos/atan: XX occurrences ([file:line, ...])

### Deferred √ Expansion

- **Violations Found:** XX
- **Files:** [List files with premature sqrt() calls]

### Golden Ratio Identity Usage

- **φ multiplication found:** XX (should use φ² = φ + 1)
- **φ division found:** XX (should use 1/φ = φ - 1)

---

## Section 4: Action Items

### Critical (Must Fix Before Release)

1. [Issue description] - [File:line] - [Assigned to]
2. [Issue description] - [File:line] - [Assigned to]

### High Priority (Fix Soon)

1. [Issue description] - [File:line] - [Assigned to]
2. [Issue description] - [File:line] - [Assigned to]

### Medium Priority (Backlog)

1. [Issue description] - [File:line] - [TODO item #]
2. [Issue description] - [File:line] - [TODO item #]

### Low Priority (Nice to Have)

1. [Issue description] - [File:line] - [TODO item #]

---

## Section 5: Quality Gate Assessment

| Gate                | Target  | Actual  | Status |
| ------------------- | ------- | ------- | ------ | --- | --- |
| ESLint Errors       | 0       | XX      | [✅    | ❌] |
| Prettier Violations | 0       | XX      | [✅    | ❌] |
| Performance (60fps) | 16.67ms | XX.XXms | [✅    | ❌] |
| Duplicate Functions | 0       | XX      | [✅    | ❌] |
| Classical Trig (%)  | < 5%    | XX%     | [✅    | ⚠️  | ❌] |

**Overall:** [✅ ALL GATES PASSED | ⚠️ TARGETS NOT MET | ❌ MANDATORY FAILED]

---

## Section 6: Recommendations

1. [Architectural recommendation]
2. [Refactoring recommendation]
3. [Performance recommendation]
4. [RT-purity recommendation]

---

## Appendix: Detailed Findings

[Attach or reference:]

- `audit-prettier.txt`
- `audit-eslint.txt`
- `audit-performance.txt`
- `audit-rt-purity.txt`

---

**Next Audit Scheduled:** [Date - based on audit frequency]
```

---

## Quick Reference Commands

### Run Full Audit Suite

```bash
# 1. Format check
npx prettier --check "modules/**/*.js" "demos/**/*.js"

# 2. Lint check
npx eslint "modules/**/*.js" "demos/**/*.js"

# 3. RT-purity scan
grep -rn "Math.PI\|Math.sin\|Math.cos" modules/

# 4. Find duplicates (manual review)
grep -rn "function geodesic" modules/rt-polyhedra.js

# 5. Find verbose functions (manual review)
# Look for functions > 50 lines in editor
```

### Auto-Fix What's Possible

```bash
# Auto-format
npx prettier --write "modules/**/*.js" "demos/**/*.js"

# Auto-fix lint issues
npx eslint --fix "modules/**/*.js" "demos/**/*.js"

# Remove console.logs (carefully!)
sed -i.bak '/console.log/d' modules/*.js
# Review changes before committing!
```

---

## Version History

- **v1.0** (2026-01-10) - Initial creation, based on ARTexplorer TODO 8.1.5
- **v1.1** (2026-01-29) - Updated file paths from `src/geometry/modules/` to `modules/` and `demos/`; added asteroids game module to audit scope; updated all command examples
- **v1.2** (2026-02-18) - Expanded audit scope with 12 missing modules (thomson, delta, animate, projections, prime-cuts, helices, penrose, ik-solvers, ui-binding-defs, metalog, color-theory-modal); added Section 5 (Verification Path & Feedback Loop Audit) informed by Wei et al. 2026 survey; added guiding principles for closed feedback loops and error compounding awareness
- **v1.3** (2026-02-18) - Strengthened RT-purity enforcement: added canonical reference preamble to Section 4 with RT-Alternative Lookup Table; added `rt-math.js` as single source of truth for all math operations; strengthened Section 2.3 audit flow (auditor must check lookup table for every classical trig occurrence); added `Math.sqrt` to scan targets; added Add-Polyhedra-Guide.md reference to architecture audit; added source material references (Divine Proportions, Synergetics)

---

**Related Documentation:**

- [ARTexplorer.md](ARTexplorer.md) - Main project documentation
- [ARTexplorer.md Section 8](ARTexplorer.md#8-todo-master-list) - TODO Master List
- [TODO 8.1.5](ARTexplorer.md#815-periodic-code-quality-audit-qcqa) - Code Quality Audit TODO
- [Add-Polyhedra-Guide.md](Add-Polyhedra-Guide.md) - 7-step ecosystem checklist for new polyhedra
- `modules/rt-math.js` - Canonical RT math reference (the "bible")
