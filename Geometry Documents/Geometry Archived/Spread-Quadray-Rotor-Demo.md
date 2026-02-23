# Spread-Quadray Rotor Demo Workplan

**Version**: 1.1
**Date**: February 2026
**Author**: Andy & Claude
**Status**: Phase 6.2 Complete - All Quadray Axes Verified

---

## 1. Overview

### 1.1 Purpose

Create an interactive demonstration of the Spread-Quadray Rotor system that:
1. Allows users to manipulate rotation via intuitive gumball-style handles
2. Displays rotation state in multiple coordinate systems simultaneously
3. Visualizes gimbal lock "danger zones" in 3D space
4. Demonstrates how RT-pure 4D calculations avoid gimbal lock

### 1.2 Key Insight

> "Just as Quaternions operate in a mathematically pure calculation space (S³ hypersphere)
> and only render to XYZ/Cartesian at the final step, Spread-Quadray Rotors operate in
> RT-pure ℝ⁴ × Z₂ space, avoiding gimbal lock even though the final visualization is
> necessarily projected to 3D Cartesian coordinates."

---

## 2. Demo Architecture

### 2.1 Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPREAD-QUADRAY ROTOR DEMO                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    3D VIEWPORT (THREE.js)                   ││
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐││
│  │  │  Gyroscope │  │  Gumball   │  │   Gimbal Lock Zones    │││
│  │  │   Object   │  │  Handles   │  │   (Warning Surfaces)   │││
│  │  └────────────┘  └────────────┘  └────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    INFO PANEL (HUD Overlay)                 ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐││
│  │  │ Angular Vel  │  │ Axis Display │  │  Rotor State R =   │││
│  │  │ RPM, rad/s   │  │ XYZ & WXYZ   │  │  (W,X,Y,Z,±)       │││
│  │  └──────────────┘  └──────────────┘  └────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 File Structure

```
modules/
├── rt-rotor-demo.js        # NEW - Demo-specific logic
├── rt-quadray-rotor.js     # NEW - QuadrayRotor class implementation
├── rt-init.js              # Extend with demo mode
├── rt-primitives.js        # Use existing polygon generators
└── rt-math.js              # Existing RT utilities

index.html                  # Add demo toggle UI
```

---

## 3. Core Implementation

### 3.1 QuadrayRotor Class (rt-quadray-rotor.js)

```javascript
/**
 * Spread-Quadray Rotor: R ∈ ℝ⁴ × Z₂
 *
 * A novel rotation representation using:
 * - Four unconstrained quadray components (W, X, Y, Z)
 * - Explicit Janus polarity flag (±) for double-cover
 * - RT-pure spread/cross calculations internally
 */
export class QuadrayRotor {
  constructor(w = 1, x = 0, y = 0, z = 0, polarity = +1) {
    // ℝ⁴ components (NOT constrained to unit hypersphere)
    this.w = w;  // Scalar-like component
    this.x = x;  // Quadray-X component
    this.y = y;  // Quadray-Y component
    this.z = z;  // Quadray-Z component

    // Z₂ Janus polarity: +1 or -1
    this.polarity = polarity >= 0 ? +1 : -1;
  }

  /**
   * Create rotor from spread (s = sin²θ) and quadray axis
   * This is the RT-pure entry point
   */
  static fromSpreadAxis(spread, axis, polarity = +1) {
    // cross = 1 - spread = cos²θ
    const cross = 1 - spread;

    // Weierstrass parametrization for half-angle
    // t = tan(θ/2), spread_half = t² / (1 + t²)
    const spreadHalf = Primitives._halfSpread(spread);
    const crossHalf = 1 - spreadHalf;

    // Normalize quadray axis
    const norm = Math.sqrt(axis.x**2 + axis.y**2 + axis.z**2 + axis.w**2);
    const ax = axis.x / norm;
    const ay = axis.y / norm;
    const az = axis.z / norm;
    const aw = axis.w / norm;

    // Rotor components (analogous to quaternion but in quadray basis)
    const cosHalf = Math.sqrt(crossHalf);  // Only sqrt at boundary
    const sinHalf = Math.sqrt(spreadHalf);

    return new QuadrayRotor(
      cosHalf,
      sinHalf * ax,
      sinHalf * ay,
      sinHalf * az,
      polarity
    );
  }

  /**
   * Convert to rotation matrix for rendering
   * This is the XYZ projection step
   */
  toMatrix3() {
    // Tom Ace rotation formula coefficients
    // Adapted for quadray basis vectors
    return this._computeRotationMatrix();
  }

  /**
   * Compose two rotors (multiply)
   * Maintains RT-pure internal representation
   */
  multiply(other) {
    // Hamilton-like product extended to quadray basis
    // ...implementation
  }

  /**
   * Angular velocity in various units
   */
  getAngularVelocity(deltaTime = 1) {
    return {
      radiansPerSecond: this._extractAngularSpeed() / deltaTime,
      rpm: (this._extractAngularSpeed() / deltaTime) * (60 / (2 * Math.PI)),
      degreesPerSecond: (this._extractAngularSpeed() / deltaTime) * (180 / Math.PI)
    };
  }
}
```

### 3.2 Gyroscope Visualization Object

The demo object should clearly show rotation state:

```javascript
/**
 * Create a gyroscope-style object for rotation visualization
 * Uses RT-pure polygon generators from rt-primitives.js
 */
function createGyroscopeObject() {
  const group = new THREE.Group();

  // Outer ring (horizon reference)
  const outerRing = Primitives.polygon(4, { sides: 12 });  // Dodecagon
  const outerGeom = createRingGeometry(outerRing);
  group.add(new THREE.Mesh(outerGeom,
    new THREE.MeshBasicMaterial({ color: 0x888888, wireframe: true })));

  // Middle ring (tilt indicator)
  const middleRing = Primitives.polygon(3, { sides: 12 });
  const middleGeom = createRingGeometry(middleRing);
  const middleMesh = new THREE.Mesh(middleGeom,
    new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }));
  middleMesh.rotation.x = Math.PI / 2;
  group.add(middleMesh);

  // Inner disk (spin indicator) - with reference markers
  const innerDisk = Primitives.polygon(2, { sides: 8, showFace: true });
  // ...add directional markers

  // Central axis indicator
  const axisIndicator = createAxisIndicator();
  group.add(axisIndicator);

  return group;
}
```

---

## 4. Gumball Handle Integration

### 4.1 Extending Existing Handles

Reference: [rt-init.js:1491-1807](modules/rt-init.js#L1491-L1807)

The existing `createEditingBasis()` function provides torus handles for rotation. We extend this for rotor manipulation:

```javascript
/**
 * Enhanced rotation handles for Spread-Quadray Rotor demo
 *
 * Existing torus handles (lines 1521-1551) become:
 * - Drag tangentially: Apply rotation about that axis
 * - Pull outward: Increase rotation rate
 * - Push inward: Decrease rotation rate
 */
function createRotorHandles(position, rotor) {
  const handleGroup = new THREE.Group();
  handleGroup.position.copy(position);

  // === QUADRAY TORUS HANDLES (WXYZ) ===
  // Tetrahedral basis - inherently avoids gimbal lock
  const quadrayColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];

  Quadray.basisVectors.forEach((vec, i) => {
    const handle = createRotorTorusHandle(vec, quadrayColors[i], {
      basisType: 'quadray',
      basisIndex: i
    });
    handleGroup.add(handle);
  });

  // === CARTESIAN TORUS HANDLES (XYZ) ===
  // Traditional basis - subject to gimbal lock
  const cartesianVectors = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1)
  ];
  const cartesianColors = [0xff5555, 0x55ff55, 0x5555ff];

  cartesianVectors.forEach((vec, i) => {
    const handle = createRotorTorusHandle(vec, cartesianColors[i], {
      basisType: 'cartesian',
      basisIndex: i
    });
    handleGroup.add(handle);
  });

  return handleGroup;
}
```

### 4.2 Handle Interaction

```javascript
/**
 * Handle drag events for rotation manipulation
 */
function handleRotorDrag(handle, dragDelta, currentRotor) {
  const axis = handle.userData.basisAxis;
  const basisType = handle.userData.basisType;

  // Calculate spread increment from drag distance
  const dragMagnitude = dragDelta.length();
  const spreadDelta = dragMagnitude * ROTATION_SENSITIVITY;

  // Create incremental rotor
  const incrementalRotor = QuadrayRotor.fromSpreadAxis(
    spreadDelta,
    basisType === 'quadray' ? axis : cartesianToQuadray(axis),
    +1
  );

  // Compose with current state
  const newRotor = currentRotor.multiply(incrementalRotor);

  // Check for gimbal lock proximity (Cartesian handles only)
  if (basisType === 'cartesian') {
    const lockProximity = calculateGimbalLockProximity(newRotor);
    updateLockWarningVisualization(lockProximity);
  }

  return newRotor;
}
```

---

## 5. Information Panel Display

### 5.1 HUD Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  SPREAD-QUADRAY ROTOR STATE                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Angular Velocity                 Rotation Axis                    │
│  ├─ RPM:      125.4              ├─ XYZ:   (0.577, 0.577, 0.577)  │
│  ├─ rad/s:    13.14              ├─ WXYZ:  (1, 1, 1, 1)           │
│  └─ deg/s:    752.7              └─ Angle: 47.3° (from +Z)        │
│                                                                    │
│  Rotor R = (W, X, Y, Z, ±)       Spread / Cross                   │
│  ├─ W: 0.9239                    ├─ s = sin²θ: 0.2500             │
│  ├─ X: 0.2209                    ├─ c = cos²θ: 0.7500             │
│  ├─ Y: 0.2209                    └─ θ = 30.00°                    │
│  ├─ Z: 0.2209                                                      │
│  └─ ±: +1 (Janus)                                                  │
│                                                                    │
│  ⚠️ GIMBAL LOCK PROXIMITY: 12%   [████░░░░░░░░░░░░░░░░] SAFE      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 5.2 Implementation

```javascript
/**
 * Update info panel with current rotor state
 */
function updateInfoPanel(rotor, deltaTime) {
  const angVel = rotor.getAngularVelocity(deltaTime);
  const axis = rotor.getAxisVector();

  // Angular Velocity Display
  document.getElementById('rotor-rpm').textContent =
    angVel.rpm.toFixed(1);
  document.getElementById('rotor-rads').textContent =
    angVel.radiansPerSecond.toFixed(2);
  document.getElementById('rotor-degs').textContent =
    angVel.degreesPerSecond.toFixed(1);

  // Axis in multiple coordinate systems
  document.getElementById('axis-xyz').textContent =
    `(${axis.x.toFixed(3)}, ${axis.y.toFixed(3)}, ${axis.z.toFixed(3)})`;

  const quadrayAxis = RT.cartesianToQuadray(axis.x, axis.y, axis.z);
  document.getElementById('axis-wxyz').textContent =
    `(${quadrayAxis.w.toFixed(1)}, ${quadrayAxis.x.toFixed(1)}, ` +
    `${quadrayAxis.y.toFixed(1)}, ${quadrayAxis.z.toFixed(1)})`;

  // Rotor components
  document.getElementById('rotor-w').textContent = rotor.w.toFixed(4);
  document.getElementById('rotor-x').textContent = rotor.x.toFixed(4);
  document.getElementById('rotor-y').textContent = rotor.y.toFixed(4);
  document.getElementById('rotor-z').textContent = rotor.z.toFixed(4);
  document.getElementById('rotor-polarity').textContent =
    rotor.polarity > 0 ? '+1' : '-1';

  // Spread/Cross (RT measures)
  const spread = rotor.getSpread();
  const cross = 1 - spread;
  const angle = Math.asin(Math.sqrt(spread)) * 2 * (180/Math.PI);

  document.getElementById('spread-value').textContent = spread.toFixed(4);
  document.getElementById('cross-value').textContent = cross.toFixed(4);
  document.getElementById('angle-value').textContent = angle.toFixed(2) + '°';

  // Gimbal lock warning
  const lockProximity = calculateGimbalLockProximity(rotor);
  updateLockWarningBar(lockProximity);
}
```

---

## 6. Gimbal Lock Zone Visualization

### 6.1 The Danger Zone Concept

For Euler angles (XYZ order), gimbal lock occurs when the middle axis (Y) rotation
approaches ±90°. This creates "danger zones" that we visualize as 3D surfaces.

**Note:** The current implementation visualizes Y-axis gimbal lock zones (XYZ order). In general, gimbal lock occurs when the *middle* axis of any Euler order reaches ±90°:
- XYZ, ZYX: Y-axis poles (current visualization)
- YXZ, ZXY: X-axis poles
- XZY, YZX: Z-axis poles

A complete visualization would show six singularity regions—one at each face center of an inscribed cube. See Phase 5 future enhancements for planned implementation.

```javascript
/**
 * Create gimbal lock warning zones in 3D space
 *
 * These surfaces represent where Euler angle singularities occur.
 * The Spread-Quadray Rotor path avoids these by construction.
 */
function createGimbalLockZones() {
  const zones = new THREE.Group();

  // === PRIMARY LOCK ZONE: Y-axis ±90° ===
  // Visualized as two disks (north/south pole regions in rotation space)
  const lockZoneGeom = new THREE.CircleGeometry(2, 32);
  const lockZoneMat = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide
  });

  // North pole (+90° Y rotation)
  const northZone = new THREE.Mesh(lockZoneGeom, lockZoneMat);
  northZone.position.set(0, 2.5, 0);
  northZone.rotation.x = Math.PI / 2;
  zones.add(northZone);

  // South pole (-90° Y rotation)
  const southZone = new THREE.Mesh(lockZoneGeom, lockZoneMat.clone());
  southZone.position.set(0, -2.5, 0);
  southZone.rotation.x = Math.PI / 2;
  zones.add(southZone);

  // === WARNING RINGS (approach indicators) ===
  // Concentric rings at 60°, 75°, 85° Y rotation
  [60, 75, 85].forEach((angle, i) => {
    const warningRing = createWarningRing(angle, i);
    zones.add(warningRing);
  });

  return zones;
}

/**
 * Create a warning ring at specified Y-rotation angle
 */
function createWarningRing(yAngleDeg, intensityLevel) {
  const yRad = yAngleDeg * Math.PI / 180;
  const radius = 2 * Math.cos(yRad);  // Ring contracts as approaches pole
  const height = 2 * Math.sin(yRad);

  const ringGeom = new THREE.TorusGeometry(radius, 0.02 + intensityLevel * 0.01, 8, 64);
  const colors = [0xffff00, 0xff8800, 0xff4400];  // Yellow -> Orange -> Red

  const ring = new THREE.Mesh(ringGeom, new THREE.MeshBasicMaterial({
    color: colors[intensityLevel],
    transparent: true,
    opacity: 0.3 + intensityLevel * 0.1
  }));

  // Position at both north and south poles
  const northRing = ring.clone();
  northRing.position.y = height;
  northRing.rotation.x = Math.PI / 2;

  const southRing = ring.clone();
  southRing.position.y = -height;
  southRing.rotation.x = Math.PI / 2;

  const group = new THREE.Group();
  group.add(northRing, southRing);
  return group;
}
```

### 6.2 Dynamic Warning Updates

```javascript
/**
 * Calculate gimbal lock proximity (0 = safe, 1 = locked)
 *
 * For Euler XYZ: lock occurs when Y rotation ≈ ±90°
 * Spread measure: s_y = sin²(θ_y), lock when s_y → 1
 */
function calculateGimbalLockProximity(rotor) {
  // Extract equivalent Euler Y rotation spread
  const matrix = rotor.toMatrix3();
  const eulerY = Math.asin(Math.min(1, Math.max(-1, matrix.elements[2])));

  // Spread of Y rotation
  const spreadY = Math.sin(eulerY) ** 2;

  // Proximity to lock (spread approaching 1)
  // Danger starts around spread > 0.75 (θ > 60°)
  const proximity = Math.max(0, (spreadY - 0.75) / 0.25);

  return proximity;
}

/**
 * Update warning visualization based on proximity
 */
function updateLockWarningVisualization(proximity) {
  // Update HUD bar
  const barFill = document.getElementById('lock-bar-fill');
  barFill.style.width = `${proximity * 100}%`;

  // Color progression: green → yellow → orange → red
  const hue = (1 - proximity) * 120;  // 120 = green, 0 = red
  barFill.style.backgroundColor = `hsl(${hue}, 80%, 50%)`;

  // Update status text
  const statusText = document.getElementById('lock-status');
  if (proximity < 0.3) {
    statusText.textContent = 'SAFE';
    statusText.className = 'status-safe';
  } else if (proximity < 0.7) {
    statusText.textContent = 'CAUTION';
    statusText.className = 'status-caution';
  } else {
    statusText.textContent = 'DANGER';
    statusText.className = 'status-danger';
  }

  // Pulse warning zones in 3D
  gimbalLockZones.children.forEach(zone => {
    zone.material.opacity = 0.15 + proximity * 0.4;
  });
}
```

---

## 7. Comparison Mode

### 7.1 Side-by-Side Euler vs Rotor

```javascript
/**
 * Demonstrate gimbal lock by comparing:
 * - Left: Euler angle rotation (subject to lock)
 * - Right: Spread-Quadray Rotor (avoids lock)
 */
function initComparisonMode() {
  // Left viewport: Euler angles
  const eulerView = createEulerGyroscope();
  eulerView.position.x = -4;
  scene.add(eulerView);

  // Right viewport: Spread-Quadray Rotor
  const rotorView = createRotorGyroscope();
  rotorView.position.x = 4;
  scene.add(rotorView);

  // Center: Shared axis indicator
  const sharedAxis = createSharedAxisIndicator();
  scene.add(sharedAxis);

  // Labels
  addViewLabel(eulerView.position, 'EULER ANGLES\n(XYZ Order)');
  addViewLabel(rotorView.position, 'SPREAD-QUADRAY\nROTOR');
}

/**
 * Apply same rotation intent to both systems
 */
function applyComparisonRotation(targetAxis, targetSpread) {
  // Euler path: Convert to XYZ angles
  // May hit gimbal lock near Y = ±90°
  const eulerAngles = spreadAxisToEulerXYZ(targetAxis, targetSpread);
  eulerGyroscope.rotation.set(
    eulerAngles.x,
    eulerAngles.y,  // ← Gimbal lock occurs here
    eulerAngles.z
  );

  // Rotor path: Direct composition
  // Operates in ℝ⁴ × Z₂, never encounters singularity
  const rotor = QuadrayRotor.fromSpreadAxis(targetSpread, targetAxis);
  const matrix = rotor.toMatrix3();
  rotorGyroscope.matrix.copy(matrix);
  rotorGyroscope.matrixAutoUpdate = false;

  // Show the divergence near lock zone
  const divergence = calculatePathDivergence(eulerAngles, rotor);
  updateDivergenceIndicator(divergence);
}
```

---

## 8. Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create `rt-quadray-rotor.js` with QuadrayRotor class
- [ ] Implement `fromSpreadAxis()` constructor
- [ ] Implement `toMatrix3()` for rendering
- [ ] Add angular velocity extraction methods
- [ ] Unit tests for rotor composition

### Phase 2: Visualization Objects (Week 2)
- [ ] Create gyroscope object using RT-pure primitives
- [ ] Implement gimbal lock zone geometry
- [ ] Add warning ring animation system
- [ ] Create comparison mode split view

### Phase 3: Interaction System (Week 3)
- [ ] Extend gumball handles for rotor manipulation
- [ ] Implement drag-to-rotate interaction
- [ ] Add rate control (pull = faster, push = slower)
- [ ] Connect Quadray and Cartesian handle systems

### Phase 4: Information Display (Week 4)
- [ ] Create HUD overlay panel
- [ ] Implement multi-coordinate axis display
- [ ] Add RPM/rad/s/deg/s velocity readouts
- [ ] Create gimbal lock proximity meter

### Phase 5: Polish & Documentation (Week 5)
- [ ] Add demo mode toggle to main UI
- [ ] Create help overlay explaining concepts
- [ ] Performance optimization
- [ ] Write user guide section

---

## 9. Technical Notes

### 9.1 Why RT-Pure Calculations Avoid Gimbal Lock

**The Topology Argument**:
- Euler angles parameterize SO(3) with 3 parameters → must have singularities (Hairy Ball Theorem)
- Quaternions use 4 parameters on S³ → double cover, no singularities
- Spread-Quadray Rotors use 4 parameters in ℝ⁴ × Z₂ → similar to quaternions, but rational

**The Calculation Path**:
```
Euler Angles:        Input → [3D space with singularities] → Output
Quaternions:         Input → [4D hypersphere, smooth]     → Output
Spread-Quadray:      Input → [4D RT-pure space, smooth]   → Output
```

Even though we render to XYZ at the end, the *calculation* never passes through
the singular points because it operates in 4D.

### 9.2 Relationship to Existing Gumball Code

The current [rt-init.js](modules/rt-init.js) gumball system (lines 1491-1807) provides:
- Quadray (WXYZ) torus handles for rotation
- Cartesian (XYZ) torus handles for rotation
- Handle hit detection and drag tracking

The demo extends this by:
- Adding rotor state management alongside existing rotation
- Providing real-time feedback on gimbal lock proximity
- Demonstrating the superiority of quadray-basis rotation

### 9.3 Spread vs Angle Display

The demo shows both:
- **Classical**: θ in degrees (for familiarity)
- **RT-Pure**: s = sin²θ (spread) and c = cos²θ (cross)

This helps users understand the RT paradigm while maintaining
intuitive angle-based thinking.

---

## 10. References

1. `Geometry Documents/4D-Gimbal-Lock-Avoidance.md` - Theoretical foundations
2. `Geometry Documents/Quadray-Rotors.tex` - Formal mathematical treatment
3. `Geometry Documents/4D-COORDINATES.md` - Tom Ace rotation formulas (lines 1306-1468)
4. `modules/rt-init.js` - Existing gumball handle implementation
5. `modules/rt-primitives.js` - RT-pure polygon generators
6. `modules/rt-math.js` - Spread, cross, Weierstrass parametrization

---

*This workplan establishes the framework for demonstrating how Spread-Quadray Rotors
provide a rational, gimbal-lock-free alternative to both Euler angles and quaternions.*

---

## 11. Implementation Progress

### Phase 1: Core Infrastructure ✅ COMPLETE

- [x] `rt-quadray-rotor.js` - QuadrayRotor class implementation
- [x] `fromSpreadAxis()` - RT-pure entry point constructor
- [x] `toMatrix3()`, `toMatrix4()` - THREE.js rendering output
- [x] `getAngularVelocity()`, `getGimbalLockProximity()` - metrics
- [x] `QuadrayRotorState` class for animation state management
- [x] `CommonSpreads` utility for RT-pure angle constants

### Phase 2: Demo Visualization ✅ COMPLETE

- [x] `rt-rotor-demo.js` - Interactive demo controller
- [x] Gyroscope spinning with geodesic octahedron 3F
- [x] Gimbal lock zone visualization (red danger disks, warning rings)
- [x] HUD info panel with RPM, rad/s, deg/s display
- [x] Scene state save/restore on demo enable/disable
- [x] Control buttons (Reset, Spin, Stop, Close)

### Phase 3: Interactive Axis Handle & Comparison ✅ COMPLETE (v1)

- [x] Nudge buttons (+X, +Y Lock, +Z) for axis adjustment
- [x] Euler XYZ vs Quadray Rotor mode toggle
- [x] Gimbal lock jitter simulation in Euler mode
- [x] Console logging of axis changes and proximity warnings

### Phase 4: Draggable Axis Handle ✅ COMPLETE

- [x] Draggable sphere handle at top of spin axis
- [x] Real-time axis adjustment by pulling/dragging handle
- [x] Visual warning system (handle and axis change color green→yellow→orange→red)
- [x] Axis line color changes based on gimbal lock proximity
- [x] Pulsing effect when in danger zone (proximity > 60%)
- [x] Remove nudge buttons (replaced by continuous handle interaction)
- [x] Hover feedback (cursor changes, handle scales up)
- [x] Disable orbit controls during handle drag (prevent camera fighting)
- [x] Mode-aware warnings: Quadray always green, Euler shows proximity
- [x] Gimbal lock zones dimmed in Quadray mode (irrelevant to 4D rotors)

### Phase 5: Polish & Future Enhancements 🔮 PLANNED

- [ ] Touch/mobile support for handle dragging
- [ ] Keyboard shortcuts (R to reset, Q/E to toggle modes)
- [ ] Option to show/hide gimbal lock zones entirely
- [ ] Record and playback rotation sequences
- [ ] Export rotation as QuadrayRotor constructor call
- [ ] Side-by-side Euler vs Quadray visualization (split view)
- [ ] **Full gimbal lock cube visualization**: Display all six singularity regions (±X, ±Y, ±Z poles) as faces of an inscribed cube. Allow users to select different Euler rotation orders (XYZ, ZYX, YXZ, ZXY, XZY, YZX) and see which face pairs become the active danger zones. This would demonstrate that gimbal lock depends on the rotation order, not on 3D space itself.

### Phase 6: Native F,G,H Tetrahedral Rotation 🎯 TARGET

**Goal**: Replace Hamilton product scaffolding with Tom Ace's native Quadray rotation algebra.

---

#### 6.1 Mathematical Foundation

**Tom Ace's Rotation Coefficients** (from `4D-COORDINATES.md` §10.5):

For rotation by angle θ about one of the four Quadray basis axes:
```
F = (2·cos(θ) + 1) / 3
G = (2·cos(θ - 120°) + 1) / 3
H = (2·cos(θ + 120°) + 1) / 3
```

The 4×4 rotation matrix (about W-axis) has **circulant structure**:
```
R_W = | 1  0  0  0 |
      | 0  F  H  G |
      | 0  G  F  H |
      | 0  H  G  F |
```

---

#### 6.2 Critical Question: Quadray Axes vs Cartesian Axes

**The fundamental distinction that must be resolved:**

| Axis Type | Direction (Cartesian) | Angle Between | Native To |
|-----------|----------------------|---------------|-----------|
| Cartesian X | (1, 0, 0) | 90° | Quaternions |
| Cartesian Y | (0, 1, 0) | 90° | Quaternions |
| Cartesian Z | (0, 0, 1) | 90° | Quaternions |
| **Quadray W** | (1, 1, 1)/√3 | **109.47°** | F,G,H |
| **Quadray X** | (1, -1, -1)/√3 | **109.47°** | F,G,H |
| **Quadray Y** | (-1, 1, -1)/√3 | **109.47°** | F,G,H |
| **Quadray Z** | (-1, -1, 1)/√3 | **109.47°** | F,G,H |

**Tom Ace's F,G,H formula rotates about QUADRAY basis axes (tetrahedral vertices), NOT Cartesian axes!**

This is a genuinely different rotation system:
- The four Quadray axes point to the corners of a regular tetrahedron
- The central angle between any two Quadray axes is 109.47° (arccos(-1/3))
- Rotation about W affects X, Y, Z symmetrically (three-fold symmetry)

---

#### 6.3 The Arbitrary Axis Problem

**Challenge**: The current demo allows rotation about any Cartesian axis (e.g., (0.577, 0.577, 0.577)). Tom Ace's formula only handles the four basis axes.

**Possible Approaches**:

**Approach A: Decomposition** (Tetrahedral Euler-like)
- Express arbitrary rotation as composition of W, X, Y, Z basis rotations
- Like Euler XYZ but with 4 tetrahedral axes instead of 3 orthogonal
- Risk: May introduce "tetrahedral gimbal lock" at certain configurations

**Approach B: Conjugation**
- Transform the arbitrary axis into a basis direction
- Apply basis rotation
- Transform back
- Complex: requires understanding axis-to-axis transformations in Quadray

**Approach C: Generalized F,G,H Formula**
- Derive coefficients for rotation about *any* axis, not just basis axes
- The circulant structure may not hold for arbitrary axes
- Most mathematically elegant but requires new derivation

**Approach D: Accept the Tetrahedral Constraint**
- Embrace that native Quadray rotation works in "tetrahedral space"
- Offer W/X/Y/Z axis rotation buttons (like the current Euler XYZ)
- This is philosophically consistent: tetrahedral geometry, tetrahedral rotations
- But: changes user interaction model from "any axis" to "basis axes only"

**Recommended**: Start with **Approach D** (pure tetrahedral) for Phase 6.1, then explore **Approach A** (composition) for Phase 6.2. This maintains mathematical purity while providing a path to arbitrary rotations.

---

#### 6.4 Sign Ambiguity and Janus Polarity

**The Problem**: Spread s = sin²(θ) doesn't distinguish direction.
```
cos(θ) = ±√(1 - s)  // Which sign?
sin(θ) = ±√(s)      // Which sign?
```

For θ = 60° and θ = 120°, spread is the same (3/4), but rotations differ!

**Solution: Janus Polarity Determines Sign**

| Polarity | cos(θ) | Rotation Range | Meaning |
|----------|--------|----------------|---------|
| +1 | +√(1-s) | 0° to 90° | "Forward" rotation |
| -1 | -√(1-s) | 90° to 180° | "Backward" rotation |

The Janus polarity flag we already have in QuadrayRotor encodes this:
```javascript
// RT-Pure with polarity
function rotationCoeffsFromSpread(s, polarity = +1) {
  const cosTheta = polarity * Math.sqrt(1 - s);  // Sign from polarity!
  const sinTheta = Math.sqrt(s);  // Always positive (quadrant handled by cos sign)

  // ... rest of F,G,H calculation
}
```

**Key Insight**: The Janus polarity isn't just about double-cover—it resolves the spread sign ambiguity!

---

#### 6.5 Composition: Matrix Multiplication vs Hamilton Product

**Question**: Does composing two F,G,H matrices (4×4 multiply) give the same result as Hamilton product?

**Analysis**:

For rotations about the **same** basis axis:
- R_W(θ₁) × R_W(θ₂) = R_W(θ₁ + θ₂) ✓
- Both methods give the same result (rotation angles add)

For rotations about **different** basis axes:
- R_W(θ₁) × R_X(θ₂) = ??? (need to verify)
- Hamilton product: q₁ × q₂ (non-commutative, well-defined)
- Matrix product: 4×4 × 4×4 = 4×4 (also non-commutative)

**Key Verification Needed**:
Does `R_W(θ₁) × R_X(θ₂)` produce the same 3D rotation as the equivalent quaternion composition?

If yes: We can use 4×4 matrix multiplication as our native "product" operation
If no: We need to understand the discrepancy (perhaps they're rotations in different spaces!)

---

#### 6.6 Implementation Phases

**Phase 6.0: Verification Protocol (GATEWAY)** 🚦

Before writing production code, run a console-based mathematical verification:

```javascript
// verification-test.js - Run in browser console with THREE.js loaded

// === SETUP: Quadray basis axes in Cartesian ===
const QUADRAY_AXES = {
  W: new THREE.Vector3(1, 1, 1).normalize(),     // (1,1,1)/√3
  X: new THREE.Vector3(1, -1, -1).normalize(),   // (1,-1,-1)/√3
  Y: new THREE.Vector3(-1, 1, -1).normalize(),   // (-1,1,-1)/√3
  Z: new THREE.Vector3(-1, -1, 1).normalize()    // (-1,-1,1)/√3
};

// === F,G,H Coefficient Calculation ===
function fghCoeffs(theta) {
  const cos120 = -0.5;
  const sin120 = Math.sqrt(0.75);
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  return {
    F: (2 * cosT + 1) / 3,
    G: (2 * (cosT * cos120 + sinT * sin120) + 1) / 3,
    H: (2 * (cosT * cos120 - sinT * sin120) + 1) / 3
  };
}

// === F,G,H 4×4 Matrix (about W-axis) ===
function matrixAboutW(theta) {
  const { F, G, H } = fghCoeffs(theta);
  // Row-major for readability, transpose for THREE.js
  return new THREE.Matrix4().set(
    1, 0, 0, 0,
    0, F, H, G,
    0, G, F, H,
    0, H, G, F
  );
}

// === Quaternion for rotation about W-axis ===
function quatAboutW(theta) {
  const axis = QUADRAY_AXES.W;
  const q = new THREE.Quaternion();
  q.setFromAxisAngle(axis, theta);
  return q;
}

// === TEST 1: Single axis rotation ===
function testSingleAxis(theta) {
  // Apply F,G,H matrix to Quadray point
  const pQuadray = new THREE.Vector4(1, 0.5, 0.3, 0.2);  // Arbitrary Quadray point

  // Convert to Cartesian, rotate with quaternion, compare
  // ... (full implementation needed)

  console.log(`θ = ${(theta * 180 / Math.PI).toFixed(1)}°`);
  console.log(`F,G,H: F=${fghCoeffs(theta).F.toFixed(6)}`);
  // Log comparison results
}

// === TEST 2: Composition ===
function testComposition() {
  const theta1 = Math.PI / 4;  // 45°
  const theta2 = Math.PI / 4;  // 45°

  // F,G,H path: R_W(45°) × R_W(45°)
  const M1 = matrixAboutW(theta1);
  const M2 = matrixAboutW(theta2);
  const Mcomposed = M1.clone().multiply(M2);

  // Quaternion path: q_W(45°) × q_W(45°)
  const q1 = quatAboutW(theta1);
  const q2 = quatAboutW(theta2);
  const qComposed = q1.clone().multiply(q2);

  // Extract effective rotation angle from composed quaternion
  const composedAngle = 2 * Math.acos(qComposed.w);
  console.log(`Composed angle: ${(composedAngle * 180 / Math.PI).toFixed(1)}°`);
  // Should be 90° for W(45°) × W(45°)
}

// Run tests
testSingleAxis(Math.PI / 4);  // 45°
testComposition();
```

**Gateway Criteria**:
- ✅ PASS: F,G,H single-axis matches quaternion (proceed to 6.1)
- ✅ PASS: Same-axis composition matches (proceed to 6.2)
- ⚠️ INVESTIGATE: Different-axis composition differs (document & decide)
- ❌ FAIL: Single-axis doesn't match (re-examine formulas)

---

#### 6.6a Phase 6.0 Results ✅ COMPLETE (February 2026)

**Test executed**: `modules/fgh-verification-test.js`

| Test | Result | Max Error |
|------|--------|-----------|
| W-axis 30° | ✅ PASS | 1.1×10⁻¹⁶ |
| W-axis 45° | ✅ PASS | 2.2×10⁻¹⁶ |
| W-axis 60° | ✅ PASS | 2.2×10⁻¹⁶ |
| W-axis 90° | ✅ PASS | 1.7×10⁻¹⁶ |
| W-axis 120° | ✅ PASS | 5.6×10⁻¹⁷ |
| W-axis composition | ✅ PASS | 5.6×10⁻¹⁷ |
| Y-axis (all angles) | ✅ PASS | ~10⁻¹⁶ |
| X-axis (all angles) | ❌ FAIL | ~1.0 |
| Z-axis (all angles) | ❌ FAIL | ~1.0 |

**Key Findings**:

1. **W-axis F,G,H VERIFIED** - Tom Ace's formula produces identical rotations to quaternion rotation about (1,1,1)/√3

2. **Y-axis also works** - Same circulant pattern applies

3. **X,Z-axis matrices SOLVED** - Phase 6.2 discovered that X and Z axes require **left-circulant** matrices (G,H swapped) due to tetrahedral chirality. All four axes now verified.

4. **Composition works** - R_W(45°) × R_W(45°) = R_W(90°) exactly, and cross-axis composition R_W × R_X also matches quaternions.

**Conclusion**: Tom Ace's formula works for ALL four Quadray axes with the correct circulant patterns:
- **Right-circulant** `[F H G; G F H; H G F]`: W and Y axes
- **Left-circulant** `[F G H; H F G; G H F]`: X and Z axes

---

**Phase 6.1: Basis Axis Rotations (Pure Tetrahedral)** ✅ COMPLETE

- [x] Implement `fghCoeffsFromSpread(s, polarity)` → `RT.QuadrayRotation.fghCoeffsFromSpread()`
- [x] Implement `rotateAboutW(qPoint, theta)` → `RT.QuadrayRotation.rotateAboutW()`
- [x] Implement `rotateAboutY(qPoint, theta)` → `RT.QuadrayRotation.rotateAboutY()` (verified working)
- [x] Add `SPREADS` constant with common angles (0°, 30°, 45°, 60°, 90°, 120°, 180°)
- [ ] Add UI buttons for W/X/Y/Z axis selection (tetrahedral mode) — *deferred to Phase 6.3*
- [ ] Document the "tetrahedral rotation" user experience — *deferred to demo integration*

#### 6.1a Implementation Deployed (February 2026)

**Location**: `modules/rt-math.js` → `RT.QuadrayRotation` namespace

```javascript
// === DEPLOYED CODE: RT.QuadrayRotation ===

RT.QuadrayRotation = {
  // Cached constants
  COS_120: -0.5,                    // Exact rational: -1/2
  SIN_120: Math.sqrt(0.75),         // √(3/4) = √3/2

  // F,G,H from angle (Tom Ace's formula)
  fghCoeffs(theta) {
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    return {
      F: (2 * cosT + 1) / 3,
      G: (2 * (cosT * this.COS_120 + sinT * this.SIN_120) + 1) / 3,
      H: (2 * (cosT * this.COS_120 - sinT * this.SIN_120) + 1) / 3,
    };
  },

  // F,G,H from spread (RT-Pure) — polarity resolves cos(θ) sign ambiguity
  fghCoeffsFromSpread(spread, polarity = 1) {
    const cosTheta = polarity * Math.sqrt(1 - spread);
    const sinTheta = Math.sqrt(spread);
    return {
      F: (2 * cosTheta + 1) / 3,
      G: (2 * (cosTheta * this.COS_120 + sinTheta * this.SIN_120) + 1) / 3,
      H: (2 * (cosTheta * this.COS_120 - sinTheta * this.SIN_120) + 1) / 3,
    };
  },

  // W-axis rotation: circulant matrix on X,Y,Z (W unchanged)
  rotateAboutW(qPoint, theta) {
    const { F, G, H } = this.fghCoeffs(theta);
    return {
      w: qPoint.w,  // Axis unchanged
      x: F * qPoint.x + H * qPoint.y + G * qPoint.z,
      y: G * qPoint.x + F * qPoint.y + H * qPoint.z,
      z: H * qPoint.x + G * qPoint.y + F * qPoint.z,
    };
  },

  // W-axis rotation from spread (RT-Pure entry point)
  rotateAboutWBySpread(qPoint, spread, polarity = 1) {
    const { F, G, H } = this.fghCoeffsFromSpread(spread, polarity);
    return { /* same circulant pattern */ };
  },

  // Y-axis rotation (verified working in Phase 6.0)
  rotateAboutY(qPoint, theta) {
    const { F, G, H } = this.fghCoeffs(theta);
    return {
      w: F * qPoint.w + H * qPoint.x + G * qPoint.z,
      x: G * qPoint.w + F * qPoint.x + H * qPoint.z,
      y: qPoint.y,  // Axis unchanged
      z: H * qPoint.w + G * qPoint.x + F * qPoint.z,
    };
  },

  // Common spreads for RT-pure rotation
  SPREADS: {
    DEG_0:   { spread: 0,    polarity:  1 },  // Identity
    DEG_30:  { spread: 0.25, polarity:  1 },  // 1/4
    DEG_45:  { spread: 0.5,  polarity:  1 },  // 1/2
    DEG_60:  { spread: 0.75, polarity:  1 },  // 3/4
    DEG_90:  { spread: 1,    polarity:  1 },  // Quarter turn
    DEG_120: { spread: 0.75, polarity: -1 },  // Tetrahedral symmetry
    DEG_180: { spread: 0,    polarity: -1 },  // Janus inversion
  },
};
```

**Status**: All four axes (W, X, Y, Z) verified to 10⁻¹⁶ precision. ✅

---

**Phase 6.2: X/Z Axis Rotation via Chirality Correction** ✅ COMPLETE

The naive circulant extension failed for X and Z axes. Instead of conjugation, we discovered a simpler solution: **left-circulant matrices** for X and Z axes.

**Key Discovery**: Tetrahedral vertex arrangement has **chirality**:
- W and Y axes share the same handedness → right-circulant `[F H G; G F H; H G F]`
- X and Z axes have opposite handedness → left-circulant `[F G H; H F G; G H F]`

The difference is simply swapping G and H positions in the circulant pattern!

**Completed Implementation** in `RT.QuadrayRotation`:

```javascript
// X-axis: Left-circulant (G,H swapped from W/Y pattern)
rotateAboutX(qPoint, theta) {
  const { F, G, H } = this.fghCoeffs(theta);
  return {
    w: F * qPoint.w + G * qPoint.y + H * qPoint.z,
    x: qPoint.x,  // X unchanged (rotation axis)
    y: H * qPoint.w + F * qPoint.y + G * qPoint.z,
    z: G * qPoint.w + H * qPoint.y + F * qPoint.z,
  };
}

// Z-axis: Left-circulant (G,H swapped from W/Y pattern)
rotateAboutZ(qPoint, theta) {
  const { F, G, H } = this.fghCoeffs(theta);
  return {
    w: F * qPoint.w + G * qPoint.x + H * qPoint.y,
    x: H * qPoint.w + F * qPoint.x + G * qPoint.y,
    y: G * qPoint.w + H * qPoint.x + F * qPoint.y,
    z: qPoint.z,  // Z unchanged (rotation axis)
  };
}
```

**Verification Results** (all 18 tests pass):
- W-axis: 4/4 passed (right-circulant)
- Y-axis: 4/4 passed (right-circulant)
- X-axis: 4/4 passed (left-circulant)
- Z-axis: 4/4 passed (left-circulant)
- Composition: 2/2 passed

**Conclusion**: Tom Ace's F,G,H formula works for ALL four Quadray basis axes when the correct circulant pattern is used. This confirms **Option (1): Equivalence** — native Quadray rotation produces identical results to quaternion rotation.

---

**Phase 6.3: Demo Integration** ✅ COMPLETE

Integration of native F,G,H Quadray rotation into the interactive demo.

**Completed Tasks**:
- [x] Add QW/QX/QY/QZ tetrahedral axis buttons to demo UI
- [x] Wire buttons to `RT.QuadrayRotation.rotateAbout{W,X,Y,Z}` functions
- [x] Display F,G,H coefficients in info panel during rotation
- [x] Add visual indicator for current Quadray axis mode
- [x] Buttons preserve spinning state (no velocity reset)

**Implementation Details**:

```javascript
// Button click handler for W-axis rotation (30° increment)
onQuadrayAxisButton(axis) {
  const theta = Math.PI / 6;  // 30° per click
  const qPoint = this.currentQuadrayPoint();  // Get current orientation as Quadray

  let rotated;
  switch(axis) {
    case 'W': rotated = RT.QuadrayRotation.rotateAboutW(qPoint, theta); break;
    case 'X': rotated = RT.QuadrayRotation.rotateAboutX(qPoint, theta); break;
    case 'Y': rotated = RT.QuadrayRotation.rotateAboutY(qPoint, theta); break;
    case 'Z': rotated = RT.QuadrayRotation.rotateAboutZ(qPoint, theta); break;
  }

  this.applyQuadrayRotation(rotated);
}
```

**Future Tasks** (Phase 6.4):
- [ ] Implement arbitrary axis rotation via basis decomposition
- [ ] Test for "tetrahedral gimbal lock" configurations
- [ ] Replace Hamilton scaffolding in `rt-quadray-rotor.js` with native F,G,H
- [ ] Compare performance: native F,G,H vs quaternion path

---

**Phase 6.5: Mode-Aware Gumball Rotation Handles** ← PLANNED

Replace or augment the single axis handle with **mode-aware gumball handles** that switch between tetrahedral (WXYZ) and Cartesian (XYZ) based on the current rotation mode.

**Problem Statement**:
The current axis handle (at the tip of the spin axis) is functional but difficult to drag into gimbal-lock territory due to camera dynamics. While the axis visualization remains valuable, adding proper gumball rotation handles would provide:
1. Direct manipulation of rotation around specific basis vectors
2. Visual distinction between Quadray and Euler rotation modes
3. Clearer UI feedback about which coordinate system is active

**Design Goals**:
- **Quadray Mode**: Display WXYZ tetrahedral gumball handles
  - W-handle rotates around (1,1,1)/√3 direction (cyan arc)
  - X-handle rotates around (1,-1,-1)/√3 direction (magenta arc)
  - Y-handle rotates around (-1,1,-1)/√3 direction (yellow arc)
  - Z-handle rotates around (-1,-1,1)/√3 direction (green arc)
  - Uses `RT.QuadrayRotation.rotateAbout{W,X,Y,Z}` functions

- **Euler Mode**: Display XYZ Cartesian gumball handles
  - X-handle (red arc) rotates around (1,0,0)
  - Y-handle (green arc) rotates around (0,1,0)
  - Z-handle (blue arc) rotates around (0,0,1)
  - Standard THREE.js quaternion rotation

**Visual Design**:
```
  QUADRAY MODE (WXYZ)              EULER MODE (XYZ)
       ╭─W─╮                           ╭─X─╮
      ╱     ╲                         ╱  R  ╲
   ╭─X─╮ ╭─Y─╮                     ╭─Y─╮   ╭─Z─╮
    ╲   ╳   ╱                       G ╲   ╱ B
     ╰─Z─╯                             ╰───╯
  (tetrahedral)                    (orthogonal)
```

**Implementation Tasks**:
- [ ] Change current axis handle color to bright cyan for better visibility
- [ ] Create `GumballController` class with mode-switching capability
- [ ] Reference `modules/rt-init.js` `createEditingBasis()` for pattern guidance
- [ ] Implement tetrahedral WXYZ handles (4 rotation arcs at 109.47° apart)
- [ ] Implement Cartesian XYZ handles (3 orthogonal rotation arcs)
- [ ] Auto-switch handle set when user toggles "Use Quadray Rotors" checkbox
- [ ] Wire WXYZ handles to `RT.QuadrayRotation` functions
- [ ] Wire XYZ handles to standard quaternion rotation
- [ ] Add hover highlighting and drag interaction for each arc
- [ ] Evaluate whether to keep or retire the tip axis handle

**Mode Switching Behavior**:
```javascript
// When rotation mode changes
onRotationModeChange(useQuadrayRotors) {
  if (useQuadrayRotors) {
    this.gumball.showTetrahedralHandles();  // WXYZ
    this.gumball.hideCartesianHandles();
  } else {
    this.gumball.showCartesianHandles();    // XYZ
    this.gumball.hideTetrahedralHandles();
  }
}
```

**Success Criteria**:
- Users can visually distinguish which rotation mode is active by handle geometry
- Dragging a handle applies smooth rotation around that basis axis
- Handle set automatically updates when switching modes
- Integration with existing `QuadrayRotor` and demo state management

---

#### 6.7 Validation Test Suite

```javascript
// Test cases comparing Hamilton vs F,G,H for basis axis rotations
const tests = [
  // W-axis rotations (Quadray basis)
  { axis: 'W', spread: 0,    expected: 'identity' },
  { axis: 'W', spread: 0.25, expected: '30°' },
  { axis: 'W', spread: 0.5,  expected: '45°' },
  { axis: 'W', spread: 0.75, expected: '60°' },
  { axis: 'W', spread: 1,    expected: '90°' },

  // X, Y, Z axis rotations
  { axis: 'X', spread: 0.5, expected: '45° about X' },
  { axis: 'Y', spread: 0.5, expected: '45° about Y' },
  { axis: 'Z', spread: 0.5, expected: '45° about Z' },

  // Composition tests
  { compose: ['W:0.5', 'W:0.5'], expected: 'W:90°' },
  { compose: ['W:0.5', 'X:0.5'], expected: '???' },  // Key test!
];
```

**Success Criteria**:
- Single-axis rotations produce identical 3D transformations
- Composed rotations either match Hamilton product OR we document the difference

---

#### 6.8 Why This Matters (Expanded)

This phase explores whether native tetrahedral rotation algebra is:

1. **Equivalent** to quaternions (same rotations, different notation)
2. **Different** (genuinely distinct rotation behavior in 4D)
3. **Both** (equivalent for basis axes, different for compositions)

The answer determines ARTexplorer's claim:
- If (1): "F,G,H is an alternative notation for the same math"
- If (2): "Native Quadray rotation is a new rotation system"
- If (3): "Basis rotations match, but composition reveals tetrahedral structure"

**Hypothesis**: Option (1) is most likely. Tom Ace derived F,G,H specifically to produce correct rotations about the tetrahedral axes. Since rotation about axis $\vec{a}$ by angle $\theta$ is a well-defined SO(3) operation, F,G,H should produce the same result as quaternions—just expressed natively in Quadray coordinates.

**What we learn either way**:
- If (1): Native Quadray rotation is a valid coordinate-native representation. The algebraic structure (circulant matrices) is different from Hamilton product, but produces identical rotations.
- If (2) or (3): There's something unexpected in the 4D structure that we haven't accounted for—potentially interesting for research.

---

#### 6.9 Note on Normalization (from *Geometric Janus Inversion*, Thomson 2026)

The zero-sum constraint (W + X + Y + Z = k) is for **XYZ parity** — it projects 4D Quadray onto 3D Cartesian space. In native 4D Quadray rotation, we can operate **without** this constraint:

- The fourth coordinate carries real geometric information (see: deformed tetrahedron)
- Operating in full ℝ⁴ avoids the topological obstructions that cause gimbal lock
- No normalization required — this is not a limitation, it's a feature

The tetrahedron naturally inhabits 4D space; the zero-sum constraint artificially flattens it to 3D for Cartesian compatibility. Native Quadray rotation preserves the full dimensional richness.

---

#### 6.10 Open Questions for Phase 6

1. **Is R_W × R_X = quaternion(W-axis, θ₁) × quaternion(X-axis, θ₂)?**
   The Quadray W-axis is (1,1,1)/√3 in Cartesian. Do they compose the same?

2. **What is the "tetrahedral gimbal lock" configuration, if any?**
   Euler has lock at ±90° Y. Does tetrahedral decomposition have an equivalent?

3. **Can we derive a generalized F,G,H for arbitrary axes?**
   The three-fold symmetry suggests the formula is specific to basis axes.

4. **What physical/visual meaning does "rotation about the W-axis" have?**
   It's rotation about the (1,1,1) direction—the body diagonal of a cube.

---

## 12. Comparison Mode: Quaternion vs Quadray Rotors

### 12.1 Purpose

Provide testable, rigorous console output demonstrating:
1. **What's the same**: Both systems produce identical 3D rotations
2. **What's different**: Entry points, representation, and future potential
3. **Honest disclosure**: Current implementation details and simplifications

### 12.2 Technical Honesty

> **IMPORTANT DISCLOSURE**: The current `QuadrayRotor` implementation uses Hamilton
> product (quaternion multiplication) internally. The structural difference is the
> explicit Janus polarity flag (±1) and RT-pure entry via spread rather than angle.
>
> The demonstration shows *how* we intend the system to work, with the underlying
> math currently leveraging well-tested quaternion algebra. This is a pragmatic
> "scaffolding" approach - we use quaternion math as a crutch while developing the
> full RT-pure algebraic solution.

### 12.3 Comparison Button Behavior

When user clicks "Compare" button:

```
═══════════════════════════════════════════════════════════════════════════
  QUATERNION vs QUADRAY ROTOR COMPARISON TEST
═══════════════════════════════════════════════════════════════════════════

Test: 45° rotation around axis (0.577, 0.577, 0.577)

─── INPUT (RT-Pure) ────────────────────────────────────────────────────────
  Spread s = sin²(45°) = 0.5  (exact rational: 1/2)
  Cross  c = cos²(45°) = 0.5  (exact rational: 1/2)
  Axis WXYZ: (1, 1, 1, 1) normalized

─── CLASSIC QUATERNION PATH ─────────────────────────────────────────────────
  q = cos(θ/2) + sin(θ/2)(xi + yj + zk)
  θ/2 = 22.5° = 0.3927 rad
  cos(22.5°) = 0.92388
  sin(22.5°) = 0.38268
  q = (0.9239, 0.2209, 0.2209, 0.2209)
  |q| = 1.0000 (unit quaternion ✓)

─── QUADRAY ROTOR PATH ──────────────────────────────────────────────────────
  R = (w, x, y, z, polarity) ∈ ℝ⁴ × Z₂
  Entry: fromSpreadAxis(0.5, {x:1, y:1, z:1}/√3, +1)

  Half-spread calculation (RT-pure where possible):
    cosθ = polarity × √(cross) = +1 × √0.5 = 0.7071
    spread_half = (1 - cosθ)/2 = 0.1464
    cross_half = (1 + cosθ)/2 = 0.8536

  √ deferred to final step:
    sinHalf = √(0.1464) = 0.3827
    cosHalf = √(0.8536) = 0.9239

  R = (0.9239, 0.2209, 0.2209, 0.2209, +1)

─── MULTIPLICATION (Hamilton Product) ───────────────────────────────────────
  NOTE: Current implementation uses Hamilton product:
    (a₁ + b₁i + c₁j + d₁k)(a₂ + b₂i + c₂j + d₂k)

  This is IDENTICAL to quaternion multiplication.
  Future RT-pure implementation would use spread/cross algebra.

─── OUTPUT COMPARISON ───────────────────────────────────────────────────────
  Quaternion → Matrix3:  [[0.805, -0.311, 0.506], [0.506, 0.805, -0.311], ...]
  QuadrayRotor → Matrix3: [[0.805, -0.311, 0.506], [0.506, 0.805, -0.311], ...]

  Max difference: 0.0000e+0 ✓ IDENTICAL

─── WHAT'S DIFFERENT ────────────────────────────────────────────────────────
  1. ENTRY: Quaternion uses angle θ; Quadray uses spread s = sin²θ
  2. POLARITY: Quaternion implicitly handles double-cover; Quadray explicit ±1
  3. FUTURE: RT-pure path avoids ALL √ until final rendering step

═══════════════════════════════════════════════════════════════════════════
```

### 12.4 Test Cases

The comparison mode runs through several test rotations:

1. **Identity**: 0° rotation (spread = 0)
2. **Small angle**: 30° around Z (spread = 0.25)
3. **Medium angle**: 45° around (1,1,1) (spread = 0.5)
4. **Large angle**: 90° around X (spread = 1.0)
5. **Gimbal-lock approach**: 85° around Y (high spread_Y)

### 12.5 Console Output Format

```javascript
console.group('═══ QUATERNION vs QUADRAY COMPARISON ═══');
console.log('Test:', description);
console.group('Input (RT-Pure)');
console.log(`Spread: ${spread} = sin²(${degrees}°)`);
console.log(`Axis: (${ax}, ${ay}, ${az})`);
console.groupEnd();
// ... detailed steps ...
console.groupEnd();
```

---

## 13. Honest Documentation of Current Simplifications

### 13.1 Where We Use THREE.js Quaternions

| Operation | Current | Future RT-Pure |
|-----------|---------|----------------|
| Final rendering | `object.quaternion.copy(quat)` | Same (GPU requires floats) |
| Matrix generation | `toMatrix3()` uses standard formula | Spread-based matrix formula |
| Composition | Hamilton product | Geometric algebra bivector product |

### 13.2 Why This Is Acceptable (Scaffolding Approach)

1. **Correctness first**: The math produces correct results
2. **Structure established**: QuadrayRotor API separates concerns
3. **Incremental refinement**: Can swap internals without API changes
4. **Honest display**: Demo shows BOTH paths with clear labeling

### 13.3 Future Work: True RT-Pure Implementation

The full RT-pure implementation would:
- Use Weierstrass parametrization for all trigonometric operations
- Employ spread polynomial algebra (avoiding transcendental functions)
- Only compute √ at the absolute final step (GPU projection)

This requires developing:
- Spread-based rotation matrix formulas
- RT-pure bivector multiplication rules
- Symbolic coefficient tracking

---

## 14. References (Updated)

1. `Geometry Documents/4D-Gimbal-Lock-Avoidance.md` - Theoretical foundations
2. `Geometry Documents/Quadray-Rotors.tex` - Formal mathematical treatment
3. `Geometry Documents/4D-COORDINATES.md` - Tom Ace rotation formulas
4. `modules/rt-quadray-rotor.js` - Current implementation ✅
5. `modules/rt-rotor-demo.js` - Demo controller ✅
6. `modules/rt-init.js` - Integration with main app ✅

---

*Workplan updated February 2026. Phase 1-4 complete (including draggable axis handle with orbit control fix).*
*"Use the crutches while building, then throw them away when ready!" - Andy*

---

## 15. Draggable Axis Handle (Phase 4)

### 15.1 Concept

Replace discrete nudge buttons with a **draggable sphere handle** at the tip of the spin axis.
Users can click and drag to continuously adjust the axis direction, providing immediate
visual feedback about gimbal lock proximity.

### 15.2 Visual Design

```
                    ┌───────┐
                    │ Handle│ ← Draggable sphere (changes color)
                    │  (●)  │   - Green: Safe zone
                    └───┬───┘   - Yellow: Warning (approaching lock)
                        │       - Orange: Danger (near lock)
                        │       - Red + Pulse: Critical (at lock)
                        │ ← Axis line (also changes color)
                        │
                   ─────┼─────
                  /     │     \
                 /      │      \  ← Spinning geodesic octahedron
                /       │       \
               ─────────┼─────────
                        │
                        │
                    ┌───┴───┐
                    │  (●)  │ ← Optional: Second handle at bottom
                    └───────┘
```

### 15.3 Interaction Model

**Drag Behavior**:
- Click on handle sphere to initiate drag
- Mouse movement in screen space maps to axis tilt
- Axis remains normalized (always unit length)
- Handle position tracks axis tip

**Visual Feedback**:
| Gimbal Lock Proximity | Handle Color | Axis Color | Additional Effect |
|----------------------|--------------|------------|-------------------|
| 0% - 30% (Safe)      | Green #0f0   | Yellow     | None              |
| 30% - 60% (Warning)  | Yellow #ff0  | Orange     | Subtle glow       |
| 60% - 85% (Danger)   | Orange #f80  | Red        | Pulsing glow      |
| 85% - 100% (Lock)    | Red #f00     | Red        | Rapid pulse + jitter (Euler mode) |

**Mode Interaction**:
- In **Quadray Rotor** mode: Visual warnings show, but rotation stays smooth
- In **Euler XYZ** mode: Rotation becomes unstable as proximity increases

### 15.4 Implementation Plan

```javascript
// Handle creation
createAxisHandle() {
  const handleGeom = new THREE.SphereGeometry(0.15, 16, 16);
  const handleMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,  // Start green (safe)
    transparent: true,
    opacity: 0.9
  });
  this.axisHandle = new THREE.Mesh(handleGeom, handleMat);
  this.axisHandle.userData.isDraggable = true;
  this.axisHandle.userData.isAxisHandle = true;
}

// Drag handler
handleAxisDrag(mouseEvent) {
  // Project mouse position to 3D space
  // Calculate new axis direction from origin to mouse intersection
  // Normalize and apply to rotorState.axis
  // Update handle position and color based on proximity
}

// Color update based on proximity
updateHandleColor(proximity) {
  const hue = (1 - proximity) * 120;  // 120=green, 60=yellow, 0=red
  this.axisHandle.material.color.setHSL(hue / 360, 1, 0.5);

  // Pulsing effect at high proximity
  if (proximity > 0.6) {
    const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
    this.axisHandle.material.opacity = pulse;
  }
}
```

### 15.5 Raycasting for Handle Interaction

The handle needs to be selectable via mouse raycasting:

```javascript
// In animation loop or mouse handler
const raycaster = new THREE.Raycaster();
raycaster.setFromCamera(mouseNDC, camera);

const intersects = raycaster.intersectObject(this.axisHandle);
if (intersects.length > 0) {
  // Handle hover/click state
  document.body.style.cursor = 'grab';
}
```

### 15.6 Benefits Over Nudge Buttons

1. **Continuous feedback**: See proximity change in real-time as you drag
2. **Intuitive**: Pull the top of the axis like a joystick
3. **Explorable**: Users naturally discover the danger zones
4. **Visual learning**: Color changes teach where gimbal lock occurs
5. **Direct manipulation**: No button → console → observe cycle
