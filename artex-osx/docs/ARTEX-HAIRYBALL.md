# ARTEX-HAIRYBALL: Quadray Rotors and the Polar Singularity Problem

**How the Spread-Quadray Rotor system eliminates gimbal lock in the native app's camera.**

February 20, 2026 — Research document for P3 camera migration.

---

## 1. The Problem: You Can't Comb a Hairy Ball Flat

### Brouwer's Hairy Ball Theorem (1912)

There is no continuous tangent vector field on the 2-sphere S^2 without at least
one singularity. Informally: if you comb a hairy ball, at least one hair sticks up.

### What this means for cameras

An orbit camera defines a mapping from a 2D control surface (mouse drag) to
orientations on S^2 (which direction we look from). The two parameters — yaw and
pitch — define a coordinate chart on S^2, specifically **spherical coordinates**.

Spherical coordinates cover S^2 with exactly two singularities: the north and
south poles. At these points:

1. **Yaw becomes degenerate**: All yaw values map to the same point
2. **The up-vector collapses**: It becomes parallel to the view direction
3. **look_at() produces NaN**: The cross product of two parallel vectors is zero

This is not a bug in the code. It is a **topological necessity**. No smooth
2-parameter coordinate system on S^2 can avoid poles. Euler angles, spherical
coordinates, and any other 2-parameter scheme all hit the same wall.

### Our current workaround (`camera.rs`)

The P1 orbit camera uses spherical coordinates (yaw, pitch, distance):

```rust
// camera.rs:66-70 — spherical to Cartesian
let eye = glam::Vec3::new(
    self.distance * self.pitch.cos() * self.yaw.cos(),
    self.distance * self.pitch.sin(),
    self.distance * self.pitch.cos() * self.yaw.sin(),
);
```

The singularity manifests when `|pitch| -> pi/2`: `cos(pitch) -> 0`, collapsing
the eye position onto the Y-axis regardless of yaw. We currently patch this with:

1. **Pitch clamping** during drag: `self.pitch.clamp(-1.5, 1.5)` (camera.rs:43)
   — prevents users from reaching the pole via mouse drag
2. **Up-vector switch** near poles: when `|pitch| > 1.4`, swap from Y-up to
   +/-Z-up (camera.rs:72-77) — prevents NaN in the Top preset view

These are **band-aids on a topological wound**. The clamping creates a forbidden
zone. The up-vector switch creates a discontinuity. Both are artifacts of forcing
a 2-parameter chart onto a surface that provably requires at least two charts
(or a higher-dimensional embedding) for full, smooth coverage.

---

## 2. The Escape: Quaternions and Why We Can Do Better

### How quaternions solve it

Quaternions represent orientations as unit vectors in S^3 (the 3-sphere in R^4).
The mapping S^3 -> SO(3) is a smooth 2-to-1 covering: every rotation corresponds
to two antipodal quaternions (q and -q).

The key: S^3 **is** parallelizable. Unlike S^2, you CAN comb S^3 flat — there
exists a global, continuous, non-vanishing tangent frame. This means quaternion
interpolation (SLERP) and composition (Hamilton product) work everywhere, with
no singularities, no gimbal lock, no degenerate configurations.

### Why we don't just use quaternions

Quaternions work. They are the standard solution. But for ARTexplorer, they are
philosophically wrong:

1. **They live in XYZ space**: A quaternion q = w + xi + yj + zk uses the
   Cartesian basis vectors i, j, k. For an app whose entire purpose is to show
   that Quadray ABCD is more natural than XYZ, routing orientation through
   quaternions is a retreat.

2. **They hide the double-cover**: The q/-q ambiguity is implicit. You discover
   it when SLERP takes the long way around, or when two quaternions that
   "should be equal" differ by sign. The workaround (negate if dot < 0) is
   widespread but ad-hoc.

3. **Classical trig at the entry point**: `Quaternion::from_axis_angle(axis, theta)`
   requires sin(theta/2) and cos(theta/2). Every quaternion construction from
   a rotation angle passes through transcendental functions.

We want a rotation representation that is:
- **4-dimensional** (to escape S^2 topology)
- **Tetrahedral-native** (to match our ABCD coordinate system)
- **RT-pure at entry** (spread/cross, not sin/cos)
- **Explicit about the double-cover** (no hidden sign ambiguity)

---

## 3. Spread-Quadray Rotors: R in R^4 x Z_2

### What we built (JS app, 2025-2026)

The Spread-Quadray Rotor is a rotation representation developed in the
ARTexplorer research:

```
R = (w, x, y, z, +/-) in R^4 x Z_2
```

- **Four unconstrained real components** (w, x, y, z) — normalized to S^3
- **Explicit Janus polarity flag** (+/-1) — the Z_2 factor makes the
  double-cover a first-class citizen, not an implicit ambiguity

### RT-pure entry point

The canonical constructor takes spread and axis, not angle:

```javascript
// rt-quadray-rotor.js:107 — RT-pure entry
QuadrayRotor.fromSpreadAxis(spread, axis, polarity)
```

For the 12 angles that matter most in polyhedral geometry, the spread is
**exactly rational**:

| Angle | Spread s = sin^2(theta) | Exact? |
|-------|-------------------------|--------|
| 0     | 0                       | Yes    |
| 30    | 1/4                     | Yes    |
| 45    | 1/2                     | Yes    |
| 60    | 3/4                     | Yes    |
| 90    | 1                       | Yes    |
| 120   | 3/4                     | Yes    |
| 180   | 0                       | Yes    |

For these angles, the rotor construction involves only:
- Half-angle spread/cross via `(1 - cos(theta))/2` and `(1 + cos(theta))/2`
- Where `cos(theta) = polarity * sqrt(1 - spread)` — the ONLY sqrt in the path

The polarity flag disambiguates the hemisphere: +1 for [0, pi], -1 for (pi, 2*pi).
No arctan2. No atan2(sin,cos) sign recovery. The discrete Z_2 flag carries
exactly the one bit of information that continuous representations struggle with.

### Composition is pure polynomial algebra

The Hamilton product (rotor multiplication) is 16 multiplications and 12
additions — no transcendental functions:

```javascript
// rt-quadray-rotor.js:247-262 — pure polynomial, RT-PURE
const w = this.w*other.w - this.x*other.x - this.y*other.y - this.z*other.z;
const x = this.w*other.x + this.x*other.w + this.y*other.z - this.z*other.y;
const y = this.w*other.y - this.x*other.z + this.y*other.w + this.z*other.x;
const z = this.w*other.z + this.x*other.y - this.y*other.x + this.z*other.w;
const polarity = this.polarity * other.polarity;
```

The polarity composition is XOR-like: composing two negative-polarity rotors
gives positive polarity. This makes the double-cover algebraically transparent.

### Rotation matrix is pure polynomial

Converting to a 3x3 matrix for rendering is quadratic in (w,x,y,z) — no trig:

```javascript
// rt-quadray-rotor.js:290-318 — pure polynomial algebra (RT-PURE!)
toMatrix3() {
    const xx = x*x, yy = y*y, zz = z*z;
    const xy = x*y, xz = x*z, yz = y*z;
    const wx = w*x, wy = w*y, wz = w*z;
    return [
        1 - 2*(yy + zz), 2*(xy + wz), 2*(xz - wy),
        2*(xy - wz), 1 - 2*(xx + zz), 2*(yz + wx),
        2*(xz + wy), 2*(yz - wx), 1 - 2*(xx + yy),
    ];
}
```

From ABCD integers, through rotor composition, to rotation matrix — the only
non-algebraic operation is the single sqrt in `fromSpreadAxis()`. Everything
downstream is polynomial.

---

## 4. Tom Ace's F,G,H Coefficients: Native Quadray Rotation

### The formula

Tom Ace discovered that rotation by angle theta about a Quadray basis axis can
be expressed as a 3x3 matrix with three coefficients:

```
F = (2*cos(theta) + 1) / 3
G = (2*cos(theta - 2*pi/3) + 1) / 3
H = (2*cos(theta + 2*pi/3) + 1) / 3
```

For RT-pure construction from spread:

```javascript
// rt-math.js — RT.QuadrayRotation.fghCoeffsFromSpread(spread, polarity)
// Uses cosTheta = polarity * sqrt(1 - spread), then the above formulas
```

### Chirality discovery

During verification (Phase 6.2), we discovered that F,G,H assemble into
two different matrix patterns depending on the axis:

- **W, Y axes** (right-circulant):
  ```
  [F, H, G]
  [G, F, H]
  [H, G, F]
  ```

- **X, Z axes** (left-circulant):
  ```
  [F, G, H]
  [H, F, G]
  [G, H, F]
  ```

This chirality is not arbitrary — it reflects the handedness of the tetrahedral
symmetry group. W and Y span one chirality class; X and Z span the other. The
verification tests confirmed that this chirality-corrected F,G,H matches
quaternion rotation to machine precision (10^-16) for all four basis axes and
cross-axis compositions.

### Exact rational rotations

For specific angles, F,G,H are **exactly rational**:

| Angle | F     | G     | H     | Exact? |
|-------|-------|-------|-------|--------|
| 0     | 1     | 0     | 0     | Yes    |
| 120   | -1/3  | 2/3   | 2/3   | Yes    |
| 180   | -1/3  | -1/3  | 2/3   | Yes    |
| 240   | -1/3  | 2/3   | -1/3  | Yes    |
| 360   | 1     | 0     | 0     | Yes    |

At 120 degrees — the most important rotation in tetrahedral geometry — F,G,H
are -1/3, 2/3, 2/3. Pure rationals. The rotation matrix has no irrational
entries. This is a rotation that quaternions would express with
cos(60) = 1/2 and sin(60) = sqrt(3)/2 — introducing an irrational where
Quadray rotation is exact.

### Why this matters for the camera

F,G,H give us rotation directly in Quadray's native frame. When the camera
orbits around a Quadray axis (A, B, C, or D), the F,G,H matrix rotates the
other three coordinates without ever converting to XYZ. This is the rotation
primitive that RATIONALE section 10 anticipates: camera orientation stored as
ABCD 4-vector triplets, updated by F,G,H rotation.

---

## 5. From S^2 to S^3: How Rotors Eliminate the Singularity

### The topological argument

| System | Parameter space | Parallelizable? | Singularities |
|--------|----------------|-----------------|---------------|
| Euler angles | T^3 (3-torus) | Yes, but wraps | Gimbal lock at pitch = +/-90 |
| Spherical coords | S^2 x R+ | **No** (Hairy Ball) | North/south poles |
| Quaternions | S^3 | **Yes** | None |
| Quadray Rotors | S^3 x Z_2 | **Yes** | None |

The key distinction: S^2 is not parallelizable (Hairy Ball), but S^3 IS
parallelizable (it admits a global frame of three linearly independent
tangent vector fields). This is why quaternions and Quadray Rotors can
represent ALL orientations without singularity.

The Z_2 factor (Janus polarity) does not change the topology — it merely
labels each point of S^3 with a discrete flag. The smooth manifold structure
is unchanged; the covering map S^3 x Z_2 -> SO(3) is still smooth.

### What this means in practice

1. **No pitch clamping**: The orbit camera can sweep continuously through
   the poles without any forbidden zone. Looking straight up, straight down,
   and everywhere between — all with the same code path.

2. **No up-vector discontinuity**: The camera orientation is stored as a
   rotor, not as yaw/pitch. The "up" direction is derived from the rotor's
   rotation matrix — it varies smoothly everywhere, including at what used
   to be the poles.

3. **No NaN**: The rotation matrix computation is polynomial in the rotor
   components. There is no division by zero, no degenerate cross product,
   no asin/acos domain violation. Polynomial functions are smooth everywhere.

4. **Smooth interpolation**: SLERP between any two orientations follows
   the shortest path on S^3. No jump cuts, no sign flips, no discontinuities.
   Camera transitions between presets animate smoothly regardless of which
   presets are involved.

---

## 6. Deployment Plan: Porting to the Native App

### Phase 1: Rust `QuadrayRotor` struct (in `rt_math/`)

Port the core `QuadrayRotor` class from `rt-quadray-rotor.js` to Rust:

```rust
// rt_math/rotor.rs (new file)

/// Spread-Quadray Rotor: R in R^4 x Z_2
/// Singularity-free rotation representation.
#[derive(Copy, Clone, Debug)]
pub struct QuadrayRotor {
    pub w: f64,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub polarity: i8,  // +1 or -1 (Janus flag)
}
```

Core methods:
- `identity()` — (1, 0, 0, 0, +1)
- `from_spread_axis(spread, axis, polarity)` — RT-pure constructor
- `multiply(&self, other)` — Hamilton product (pure polynomial)
- `normalize(&self)` — project to unit S^3
- `conjugate(&self)` — inverse for unit rotors
- `to_mat3(&self) -> [[f64; 3]; 3]` — polynomial rotation matrix
- `to_mat4_f32(&self) -> glam::Mat4` — for GPU uniform upload
- `slerp(&self, other, t)` — spherical linear interpolation

The f64 internal precision ensures the polynomial matrix computation stays
accurate over long rotation chains. Convert to f32 only at the GPU boundary.

### Phase 2: F,G,H rotation primitives (in `rt_math/`)

Port `RT.QuadrayRotation` namespace:

```rust
// rt_math/fgh.rs (new file)

/// Tom Ace's F,G,H rotation coefficients for Quadray basis axes.
pub struct FghCoeffs {
    pub f: f64,
    pub g: f64,
    pub h: f64,
}

/// Compute F,G,H from rotation angle.
/// RT-JUSTIFIED: cos is at the rendering boundary — input should prefer spread.
pub fn fgh_from_angle(theta: f64) -> FghCoeffs { ... }

/// Compute F,G,H from spread (RT-pure entry).
pub fn fgh_from_spread(spread: f64, polarity: i8) -> FghCoeffs { ... }

/// Apply F,G,H rotation about a specific Quadray axis.
/// axis: 0=A, 1=B, 2=C, 3=D
/// Applies correct chirality: A,C use right-circulant; B,D use left-circulant
pub fn rotate_about_axis(coords: [f64; 3], axis: u8, coeffs: &FghCoeffs) -> [f64; 3] { ... }
```

Note on chirality mapping: The JS demo uses WXYZ indexing; the native app uses
ABCD. The chirality classes must be re-verified under ABCD convention:

| JS convention | Native convention | Chirality |
|---------------|-------------------|-----------|
| W axis        | D axis            | Right-circulant |
| X axis        | A axis            | Left-circulant  |
| Y axis        | C axis            | Right-circulant |
| Z axis        | B axis            | Left-circulant  |

(This follows from the 3021 mapping: QW->D, QX->A, QY->C, QZ->B.)

### Phase 3: Replace OrbitCamera internals

Replace yaw/pitch/distance with a QuadrayRotor orientation:

```rust
// camera.rs — P3 refactored

pub struct OrbitCamera {
    pub orientation: QuadrayRotor,  // replaces yaw + pitch
    pub distance: f32,
    dragging: bool,
    last_cursor: Option<(f64, f64)>,
}
```

**Mouse drag** becomes incremental rotor composition:

```rust
fn on_cursor_moved(&mut self, x: f64, y: f64) {
    if self.dragging {
        if let Some((lx, ly)) = self.last_cursor {
            let dx = (x - lx) as f64;
            let dy = (y - ly) as f64;

            // Horizontal drag: rotate about world Y (or Quadray axis)
            let yaw_rotor = QuadrayRotor::from_spread_axis(
                (dx * 0.005).powi(2).min(1.0),  // spread from drag delta
                [0.0, 1.0, 0.0],                 // Y axis (or ABCD equivalent)
                if dx >= 0.0 { 1 } else { -1 },
            );

            // Vertical drag: rotate about camera-local X
            let right = self.orientation.rotate_vector([1.0, 0.0, 0.0]);
            let pitch_rotor = QuadrayRotor::from_spread_axis(
                (dy * 0.005).powi(2).min(1.0),
                right,
                if dy >= 0.0 { 1 } else { -1 },
            );

            // Compose: orientation = pitch * yaw * current
            self.orientation = pitch_rotor
                .multiply(&yaw_rotor)
                .multiply(&self.orientation);
        }
        self.last_cursor = Some((x, y));
    }
}
```

No pitch clamping. No up-vector switching. The rotor handles everything.

**View matrix** becomes a polynomial computation:

```rust
fn view_proj(&self, aspect: f32) -> glam::Mat4 {
    // Eye position: orientation rotates the "default" eye direction
    let forward = self.orientation.rotate_vector([0.0, 0.0, -1.0]);
    let eye = glam::Vec3::from_array([
        (-forward[0] * self.distance as f64) as f32,
        (-forward[1] * self.distance as f64) as f32,
        (-forward[2] * self.distance as f64) as f32,
    ]);

    // Up vector: derived from rotor, smooth everywhere
    let up_f64 = self.orientation.rotate_vector([0.0, 1.0, 0.0]);
    let up = glam::Vec3::new(up_f64[0] as f32, up_f64[1] as f32, up_f64[2] as f32);

    let view = glam::Mat4::look_at_rh(eye, glam::Vec3::ZERO, up);
    let proj = glam::Mat4::perspective_rh(
        std::f32::consts::FRAC_PI_4, aspect, 0.1, 100.0,
    );
    proj * view
}
```

The `rotate_vector` call uses `toMatrix3()` internally — pure polynomial.
The up-vector is always smooth because it comes from a smooth function on S^3.

### Phase 4: Camera presets as stored rotors

Each preset becomes a precomputed `QuadrayRotor` instead of yaw/pitch:

```rust
pub struct CameraPreset {
    pub name: &'static str,
    pub orientation: QuadrayRotor,
    pub distance: f32,
    pub color: [u8; 3],
}
```

The B-axis preset, for example:
```rust
// B axis: looking from (+1,+1,+1)/sqrt(3)
// This is a rotation that takes -Z (default forward) to (+1,+1,+1)/sqrt(3)
CameraPreset {
    name: "B",
    orientation: QuadrayRotor::from_look_direction([1.0, 1.0, 1.0]),
    distance: DEFAULT_DISTANCE,
    color: [255, 0, 0],
}
```

Preset transitions: `camera.orientation = current.slerp(target, t)` — smooth
interpolation along the shortest arc on S^3. No angular discontinuities.

### Phase 5: ABCD 4-vector triplet integration (RATIONALE section 10)

The final step connects the rotor camera to the ABCD-to-clip pipeline from
RATIONALE section 8/10. Each camera orientation produces three 4-vectors
`(p_x, p_y, p_depth)` in ABCD space:

```rust
fn abcd_projection_vectors(&self) -> [[f64; 4]; 3] {
    let rot_matrix = self.orientation.to_mat3();

    // Camera right/up/forward in world space
    let right   = [rot_matrix[0][0], rot_matrix[1][0], rot_matrix[2][0]];
    let up      = [rot_matrix[0][1], rot_matrix[1][1], rot_matrix[2][1]];
    let forward = [rot_matrix[0][2], rot_matrix[1][2], rot_matrix[2][2]];

    // p_x = N^T * Basis^T * right  (screen horizontal in ABCD space)
    // p_y = N^T * Basis^T * up     (screen vertical in ABCD space)
    // p_d = N^T * Basis^T * forward (depth in ABCD space)
    [
        abcd_from_cartesian_direction(right),
        abcd_from_cartesian_direction(up),
        abcd_from_cartesian_direction(forward),
    ]
}
```

For preset views, these 4-vector triplets are precomputed constants —
matching the vision in RATIONALE section 10. For orbit camera, they are
recomputed each frame from the rotor, with no singularity at any orientation.

---

## 7. Comparison: Three Generations of Camera

| Property | P1 (Current) | P3 (Rotor) | P5 (ABCD Direct) |
|----------|-------------|------------|-------------------|
| **State** | yaw, pitch, distance | QuadrayRotor + distance | QuadrayRotor + distance |
| **Singularity** | Poles (pitch = +/-pi/2) | None | None |
| **Workaround** | Pitch clamp + up-vector switch | Not needed | Not needed |
| **Presets** | Stored yaw/pitch | Stored rotor | Stored ABCD 4-vector triplets |
| **Transitions** | Angular lerp (discontinuous at poles) | SLERP (smooth everywhere) | SLERP + ABCD projection |
| **XYZ dependency** | glam look_at (justified) | glam look_at (justified) | ABCD dot products only |
| **RT purity** | Rendering boundary only | Spread entry + polynomial | Spread entry + polynomial + ABCD projection |

P3 removes the singularity. P5 (far future) removes XYZ from the
projection pipeline entirely, connecting the rotor camera to the ABCD-to-clip
architecture from RATIONALE section 8.

---

## 8. Verification Targets

Before deploying rotor-based camera, verify:

1. **Equivalence**: For all 7 presets, the rotor-derived view matrix matches
   the P1 yaw/pitch-derived matrix to within f32 tolerance (< 1e-5 per element).

2. **Pole traversal**: Orbit camera can rotate continuously through what was
   previously the +Y pole (Top view) without any visual discontinuity, NaN,
   or up-vector flip.

3. **SLERP smoothness**: Animated transition from B-axis to Top view follows
   a smooth great-circle arc (no jump at pitch ~ 1.4 rad).

4. **F,G,H parity**: `fgh_from_spread()` matches `fgh_from_angle()` to 10^-15
   for all spread values in [0, 1] at 0.01 intervals.

5. **Chirality under ABCD**: Verify right-circulant for D/C axes and
   left-circulant for A/B axes (re-verifying the JS WXYZ finding under native
   ABCD convention).

6. **Rotor composition chain**: 1000 successive 1-degree rotations about a
   random axis, compared to a single 1000-degree rotation. Drift < 10^-10
   after normalization.

7. **Long-running stability**: Continuous orbit drag for 60 seconds at 60fps
   (3600 rotor compositions). Final orientation.normSquared() within 10^-6 of 1.0
   before renormalization.

---

## 9. References

### Internal
- [ARTEX-RATIONALE.md](ARTEX-RATIONALE.md) — sections 4, 8, 10 (ABCD-to-clip pipeline)
- [RUST-METAL-BABYSTEPS.md](RUST-METAL-BABYSTEPS.md) — P1 camera, P3 migration note
- [Spread-Quadray-Rotor-Demo.md](../../Geometry%20Documents/Geometry%20Archived/Spread-Quadray-Rotor-Demo.md) — JS implementation workplan
- [Quadray-Rotors.tex](../../Geometry%20Documents/Whitepaper%20LaTEX/Quadray-Rotors.tex) — formal whitepaper

### Source Files
- `modules/rt-quadray-rotor.js` — JS QuadrayRotor class (692 lines)
- `modules/rt-rotor-demo.js` — JS interactive demo (2284 lines)
- `artex-osx/src/camera.rs` — current P1 orbit camera (235 lines)

### External
- L.E.J. Brouwer, "Uber Abbildung von Mannigfaltigkeiten" (1912) — Hairy Ball Theorem
- N.J. Wildberger, *Divine Proportions* — Rational Trigonometry foundations
- Tom Ace — Quadray rotation coefficients (cited in Quadray-Rotors.tex)

---

*"The 2-sphere has a hairy problem. The 3-sphere doesn't. Quadray Rotors
live in the 3-sphere. Ergo, no more polar singularities — and no more
Cartesian compromises on the way there."*
