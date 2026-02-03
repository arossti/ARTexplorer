# Spread-Quadray Rotor Demo Workplan

**Version**: 1.0 Draft
**Date**: February 2026
**Author**: Andy & Claude
**Status**: Planning

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

1. `Geometry documents/4D-Gimbal-Lock-Avoidance.md` - Theoretical foundations
2. `Geometry documents/Quadray-Rotors.tex` - Formal mathematical treatment
3. `Geometry documents/4D-COORDINATES.md` - Tom Ace rotation formulas (lines 1306-1468)
4. `modules/rt-init.js` - Existing gumball handle implementation
5. `modules/rt-primitives.js` - RT-pure polygon generators
6. `modules/rt-math.js` - Spread, cross, Weierstrass parametrization

---

*This workplan establishes the framework for demonstrating how Spread-Quadray Rotors
provide a rational, gimbal-lock-free alternative to both Euler angles and quaternions.*
