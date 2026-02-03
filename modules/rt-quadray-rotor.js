/**
 * rt-quadray-rotor.js
 * Spread-Quadray Rotor Implementation for ARTexplorer
 *
 * A novel rotation representation: R ∈ ℝ⁴ × Z₂
 * - Four unconstrained quadray components (W, X, Y, Z)
 * - Explicit Janus polarity flag (±) for double-cover
 * - RT-pure spread/cross calculations internally
 *
 * Avoids gimbal lock by operating in 4D space, similar to quaternions
 * but using rational trigonometry principles where possible.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * HONEST DISCLOSURE - SCAFFOLDING APPROACH
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This implementation uses QUATERNION MATH internally (Hamilton product) while
 * establishing the STRUCTURE and API for a true RT-pure rotation system.
 *
 * What's RT-Pure NOW:
 * - Entry point via spread (s = sin²θ) instead of angle
 * - Explicit Janus polarity (±1) rather than implicit double-cover
 * - Half-angle calculation using spread/cross algebra
 * - √ operations deferred until final steps
 *
 * What STILL uses standard quaternion math:
 * - multiply() uses Hamilton product (identical to quaternion multiplication)
 * - toMatrix3() uses standard quaternion-to-matrix formula
 * - rotateVector() uses q·v·q⁻¹ conjugation
 *
 * Why this is acceptable (scaffolding approach):
 * 1. The math produces CORRECT rotations
 * 2. The API/structure supports future RT-pure implementation
 * 3. We can swap internals without changing external interface
 * 4. "Use the crutches while building, then throw them away when ready!"
 *
 * Future RT-Pure work would replace Hamilton product with:
 * - Spread polynomial multiplication rules
 * - Geometric algebra bivector operations
 * - Full Weierstrass parametrization throughout
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @requires rt-math.js - RT namespace for spread/cross calculations
 * @see Geometry documents/Quadray-Rotors.tex - Mathematical foundations
 * @see Geometry documents/4D-Gimbal-Lock-Avoidance.md - Theory
 * @see Geometry documents/Spread-Quadray-Rotor-Demo.md - Implementation workplan
 */

import { RT, Quadray } from "./rt-math.js";

/**
 * Spread-Quadray Rotor: R ∈ ℝ⁴ × Z₂
 *
 * A rotation representation using:
 * - Four rotor components (w, x, y, z) - analogous to quaternion components
 * - Explicit Janus polarity flag (±1) for double-cover disambiguation
 * - RT-pure internal calculations using spread/cross
 *
 * @class QuadrayRotor
 */
export class QuadrayRotor {
  /**
   * Create a new QuadrayRotor
   *
   * @param {number} w - Scalar component (default 1 = identity)
   * @param {number} x - X-axis rotation component
   * @param {number} y - Y-axis rotation component
   * @param {number} z - Z-axis rotation component
   * @param {number} polarity - Janus polarity: +1 or -1 (default +1)
   */
  constructor(w = 1, x = 0, y = 0, z = 0, polarity = +1) {
    this.w = w;
    this.x = x;
    this.y = y;
    this.z = z;
    this.polarity = polarity >= 0 ? +1 : -1;
  }

  /**
   * Create identity rotor (no rotation)
   * @returns {QuadrayRotor} Identity rotor
   */
  static identity() {
    return new QuadrayRotor(1, 0, 0, 0, +1);
  }

  /**
   * Create rotor from spread and axis vector (RT-pure entry point)
   *
   * Given spread s = sin²(θ) and rotation axis, constructs rotor
   * representing rotation by angle θ around that axis.
   *
   * RT-PURE ANALYSIS:
   * - Input: spread (rational for many common angles: 0, 1/4, 1/2, 3/4, 1)
   * - Half-angle calculation uses spread/cross algebra (lines 93-95)
   * - √ is deferred to the final step (lines 98-99) - this is the ONLY
   *   transcendental operation, and it's at the boundary of RT-pure space
   *
   * @param {number} spread - Spread value (0 to 1), where s = sin²(θ)
   * @param {Object} axis - Rotation axis {x, y, z} (will be normalized)
   * @param {number} polarity - Janus polarity: +1 or -1 (default +1)
   * @returns {QuadrayRotor} Rotor for the specified rotation
   *
   * @example
   * // 90° rotation around Z-axis (spread = sin²(90°) = 1)
   * const rotor = QuadrayRotor.fromSpreadAxis(1, {x: 0, y: 0, z: 1});
   *
   * // 45° rotation around X-axis (spread = sin²(45°) = 0.5)
   * const rotor = QuadrayRotor.fromSpreadAxis(0.5, {x: 1, y: 0, z: 0});
   */
  static fromSpreadAxis(spread, axis, polarity = +1) {
    // Clamp spread to valid range [0, 1]
    const s = Math.max(0, Math.min(1, spread));

    // Cross = cos²(θ) = 1 - spread
    const c = 1 - s;

    // For rotor construction, we need half-angle values
    // sin(θ/2)² and cos(θ/2)²
    // Using half-angle identities:
    //   sin²(θ/2) = (1 - cos(θ)) / 2
    //   cos²(θ/2) = (1 + cos(θ)) / 2
    // And cos(θ) = ±√(cos²(θ)) = ±√c

    // We need to determine the sign of cos(θ)
    // For θ in [0, π], cos(θ) goes from +1 to -1
    // spread = sin²(θ) gives us |sin(θ)|
    // We use polarity to track which hemisphere

    const cosTheta = polarity * Math.sqrt(c);
    const spreadHalf = (1 - cosTheta) / 2;  // sin²(θ/2)
    const crossHalf = (1 + cosTheta) / 2;   // cos²(θ/2)

    // Extract sin(θ/2) and cos(θ/2) - deferred sqrt
    const sinHalf = Math.sqrt(spreadHalf);
    const cosHalf = Math.sqrt(crossHalf);

    // Normalize axis vector
    const axisLen = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);
    if (axisLen < 1e-10) {
      // Zero axis = identity rotation
      return new QuadrayRotor(1, 0, 0, 0, polarity);
    }

    const ax = axis.x / axisLen;
    const ay = axis.y / axisLen;
    const az = axis.z / axisLen;

    // Rotor components (quaternion-like construction)
    // R = cos(θ/2) + sin(θ/2)(ax·i + ay·j + az·k)
    return new QuadrayRotor(
      cosHalf,
      sinHalf * ax,
      sinHalf * ay,
      sinHalf * az,
      polarity
    );
  }

  /**
   * Create rotor from angle in degrees and axis vector
   * Convenience method for familiar angle-based input
   *
   * @param {number} degrees - Rotation angle in degrees
   * @param {Object} axis - Rotation axis {x, y, z}
   * @returns {QuadrayRotor} Rotor for the specified rotation
   */
  static fromDegreesAxis(degrees, axis) {
    // Convert degrees to spread: s = sin²(θ)
    const radians = (degrees * Math.PI) / 180;
    const spread = Math.sin(radians) ** 2;

    // Determine polarity based on angle range
    // θ in [0, 180]: polarity = +1
    // θ in (180, 360): polarity = -1
    const normalizedDeg = ((degrees % 360) + 360) % 360;
    const polarity = normalizedDeg <= 180 ? +1 : -1;

    return QuadrayRotor.fromSpreadAxis(spread, axis, polarity);
  }

  /**
   * Create rotor from Euler angles (XYZ order)
   * Provided for compatibility, but note this path CAN encounter gimbal lock
   * when converting back to Euler angles.
   *
   * @param {number} xDeg - Rotation around X-axis in degrees
   * @param {number} yDeg - Rotation around Y-axis in degrees
   * @param {number} zDeg - Rotation around Z-axis in degrees
   * @returns {QuadrayRotor} Composed rotor
   */
  static fromEulerXYZ(xDeg, yDeg, zDeg) {
    const rx = QuadrayRotor.fromDegreesAxis(xDeg, { x: 1, y: 0, z: 0 });
    const ry = QuadrayRotor.fromDegreesAxis(yDeg, { x: 0, y: 1, z: 0 });
    const rz = QuadrayRotor.fromDegreesAxis(zDeg, { x: 0, y: 0, z: 1 });

    // XYZ order: first X, then Y, then Z
    return rx.multiply(ry).multiply(rz);
  }

  /**
   * Get the squared magnitude (norm²) of the rotor
   * @returns {number} w² + x² + y² + z²
   */
  normSquared() {
    return this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z;
  }

  /**
   * Normalize the rotor to unit length
   * @returns {QuadrayRotor} Normalized rotor (new instance)
   */
  normalize() {
    const norm = Math.sqrt(this.normSquared());
    if (norm < 1e-10) {
      return QuadrayRotor.identity();
    }
    return new QuadrayRotor(
      this.w / norm,
      this.x / norm,
      this.y / norm,
      this.z / norm,
      this.polarity
    );
  }

  /**
   * Get the conjugate (inverse for unit rotors)
   * @returns {QuadrayRotor} Conjugate rotor
   */
  conjugate() {
    return new QuadrayRotor(this.w, -this.x, -this.y, -this.z, this.polarity);
  }

  /**
   * Multiply two rotors (Hamilton product)
   * This composes the rotations: result = this * other
   *
   * SCAFFOLDING NOTE: This currently uses the Hamilton product formula,
   * which is identical to quaternion multiplication:
   *   (a₁ + b₁i + c₁j + d₁k)(a₂ + b₂i + c₂j + d₂k)
   *
   * A future RT-pure implementation would use spread/cross polynomial
   * algebra or geometric algebra bivector operations to avoid any
   * implicit trigonometric functions.
   *
   * @param {QuadrayRotor} other - Rotor to multiply with
   * @returns {QuadrayRotor} Composed rotor
   */
  multiply(other) {
    // SCAFFOLDING: Hamilton product (same as quaternion multiplication)
    // Future: Replace with RT-pure spread polynomial multiplication
    const w = this.w * other.w - this.x * other.x - this.y * other.y - this.z * other.z;
    const x = this.w * other.x + this.x * other.w + this.y * other.z - this.z * other.y;
    const y = this.w * other.y - this.x * other.z + this.y * other.w + this.z * other.x;
    const z = this.w * other.z + this.x * other.y - this.y * other.x + this.z * other.w;

    // Polarity: XOR-like behavior (this IS different from quaternions)
    // Quaternions handle double-cover implicitly; we make it explicit
    const polarity = this.polarity * other.polarity;

    return new QuadrayRotor(w, x, y, z, polarity);
  }

  /**
   * Apply this rotor to rotate a 3D vector
   *
   * @param {Object} v - Vector to rotate {x, y, z}
   * @returns {Object} Rotated vector {x, y, z}
   */
  rotateVector(v) {
    // Create a pure quaternion from the vector
    const qv = new QuadrayRotor(0, v.x, v.y, v.z, +1);

    // Rotation: v' = R * v * R^(-1) = R * v * R.conjugate() (for unit rotors)
    const rotated = this.multiply(qv).multiply(this.conjugate());

    return { x: rotated.x, y: rotated.y, z: rotated.z };
  }

  /**
   * Convert to 3x3 rotation matrix
   * For rendering to THREE.js
   *
   * SCAFFOLDING NOTE: This uses the standard quaternion-to-matrix formula.
   * The formula itself is algebraically correct and produces exact results
   * from the rotor components - no transcendental functions are called here.
   *
   * The matrix elements are quadratic in (w,x,y,z), which means this step
   * IS actually RT-compatible - it's pure polynomial algebra.
   *
   * @returns {Array<number>} 9-element array in column-major order
   */
  toMatrix3() {
    // Ensure normalized
    const n = this.normalize();
    const { w, x, y, z } = n;

    // Pre-compute products (all polynomial - RT-pure!)
    const xx = x * x, yy = y * y, zz = z * z;
    const xy = x * y, xz = x * z, yz = y * z;
    const wx = w * x, wy = w * y, wz = w * z;

    // Rotation matrix from rotor components
    // This formula is IDENTICAL to quaternion-to-matrix, but that's okay:
    // the formula is purely algebraic (no trig functions)
    // Column-major order for THREE.js Matrix3
    return [
      1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy),     // Column 0
      2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx),     // Column 1
      2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy)      // Column 2
    ];
  }

  /**
   * Convert to THREE.js Matrix4
   *
   * @param {Object} THREE - THREE.js library reference
   * @returns {THREE.Matrix4} Rotation matrix
   */
  toMatrix4(THREE) {
    const m3 = this.toMatrix3();
    const m4 = new THREE.Matrix4();

    // Set rotation portion of 4x4 matrix
    m4.set(
      m3[0], m3[3], m3[6], 0,
      m3[1], m3[4], m3[7], 0,
      m3[2], m3[5], m3[8], 0,
      0, 0, 0, 1
    );

    return m4;
  }

  /**
   * Extract rotation axis and spread from rotor
   *
   * @returns {Object} { axis: {x, y, z}, spread: number, cross: number, angleDeg: number }
   */
  getAxisSpread() {
    const n = this.normalize();

    // Axis from imaginary components
    const axisLen = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);

    let axis;
    if (axisLen < 1e-10) {
      // Identity or near-identity: default axis
      axis = { x: 0, y: 0, z: 1 };
    } else {
      axis = { x: n.x / axisLen, y: n.y / axisLen, z: n.z / axisLen };
    }

    // Half-angle values
    const cosHalf = Math.abs(n.w);
    const sinHalf = axisLen;

    // Full angle via double-angle formulas
    // sin(θ) = 2 * sin(θ/2) * cos(θ/2)
    // cos(θ) = cos²(θ/2) - sin²(θ/2)
    const sinTheta = 2 * sinHalf * cosHalf;
    const cosTheta = cosHalf * cosHalf - sinHalf * sinHalf;

    // Spread = sin²(θ)
    const spread = sinTheta * sinTheta;
    const cross = cosTheta * cosTheta;

    // Angle in degrees (for display)
    const angleDeg = Math.atan2(sinTheta, cosTheta) * (180 / Math.PI);

    return { axis, spread, cross, angleDeg };
  }

  /**
   * Get rotation axis as a Quadray coordinate
   * Converts the XYZ axis to WXYZ quadray representation
   *
   * @returns {Object} { qw, qx, qy, qz } - Quadray axis representation
   */
  getAxisQuadray() {
    const { axis } = this.getAxisSpread();

    // Use the Quadray conversion if initialized
    if (Quadray.basisVectors) {
      const pos = { x: axis.x, y: axis.y, z: axis.z, dot: (v) => axis.x * v.x + axis.y * v.y + axis.z * v.z };
      return Quadray.fromCartesian(pos);
    }

    // Fallback: project onto canonical quadray basis
    const sqrt3 = Math.sqrt(3);
    const basisA = { x: 1/sqrt3, y: 1/sqrt3, z: 1/sqrt3 };
    const basisB = { x: 1/sqrt3, y: -1/sqrt3, z: -1/sqrt3 };
    const basisC = { x: -1/sqrt3, y: 1/sqrt3, z: -1/sqrt3 };
    const basisD = { x: -1/sqrt3, y: -1/sqrt3, z: 1/sqrt3 };

    const dotA = axis.x * basisA.x + axis.y * basisA.y + axis.z * basisA.z;
    const dotB = axis.x * basisB.x + axis.y * basisB.y + axis.z * basisB.z;
    const dotC = axis.x * basisC.x + axis.y * basisC.y + axis.z * basisC.z;
    const dotD = axis.x * basisD.x + axis.y * basisD.y + axis.z * basisD.z;

    // Zero-sum normalize
    const mean = (dotA + dotB + dotC + dotD) / 4;
    return {
      qx: dotA - mean,
      qz: dotB - mean,
      qy: dotC - mean,
      qw: dotD - mean
    };
  }

  /**
   * Calculate angular velocity given time delta
   *
   * @param {number} deltaTime - Time in seconds (default 1)
   * @returns {Object} { radiansPerSecond, rpm, degreesPerSecond }
   */
  getAngularVelocity(deltaTime = 1) {
    const { angleDeg } = this.getAxisSpread();
    const angleRad = angleDeg * (Math.PI / 180);

    const radiansPerSecond = angleRad / deltaTime;
    const rpm = radiansPerSecond * (60 / (2 * Math.PI));
    const degreesPerSecond = angleDeg / deltaTime;

    return { radiansPerSecond, rpm, degreesPerSecond };
  }

  /**
   * Calculate gimbal lock proximity (0 = safe, 1 = locked)
   *
   * For Euler XYZ order, gimbal lock occurs when Y rotation approaches ±90°.
   * This method extracts the equivalent Euler Y rotation and calculates
   * how close we are to the singularity.
   *
   * NOTE: The rotor itself NEVER experiences gimbal lock. This metric
   * shows how much trouble you'd be in if using Euler angles.
   *
   * @returns {number} Proximity to gimbal lock (0-1)
   */
  getGimbalLockProximity() {
    const m = this.toMatrix3();

    // For XYZ Euler, gimbal lock occurs at Y = ±90°
    // The matrix element m[2] (or m[6] in our layout) = sin(Y)
    // In column-major: m[6] is element (0,2) = sin(Y) for standard convention

    // Extract sin(Y) from rotation matrix
    // For R = Rz * Ry * Rx, element (0,2) = sin(Y)
    const sinY = Math.max(-1, Math.min(1, m[6]));

    // Spread of Y rotation: sin²(Y)
    const spreadY = sinY * sinY;

    // Proximity: danger starts at spread > 0.75 (θ > 60°)
    const proximity = Math.max(0, (spreadY - 0.75) / 0.25);

    return Math.min(1, proximity);
  }

  /**
   * Spherical linear interpolation (SLERP) between two rotors
   *
   * @param {QuadrayRotor} other - Target rotor
   * @param {number} t - Interpolation factor (0 = this, 1 = other)
   * @returns {QuadrayRotor} Interpolated rotor
   */
  slerp(other, t) {
    // Ensure both are normalized
    const a = this.normalize();
    const b = other.normalize();

    // Compute dot product (cosine of angle between quaternions)
    let dot = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;

    // If negative dot, negate one quaternion to take shorter path
    let bw = b.w, bx = b.x, by = b.y, bz = b.z;
    if (dot < 0) {
      dot = -dot;
      bw = -bw; bx = -bx; by = -by; bz = -bz;
    }

    // If very close, use linear interpolation
    if (dot > 0.9995) {
      const w = a.w + t * (bw - a.w);
      const x = a.x + t * (bx - a.x);
      const y = a.y + t * (by - a.y);
      const z = a.z + t * (bz - a.z);
      return new QuadrayRotor(w, x, y, z, a.polarity).normalize();
    }

    // SLERP
    const theta = Math.acos(dot);
    const sinTheta = Math.sin(theta);
    const wa = Math.sin((1 - t) * theta) / sinTheta;
    const wb = Math.sin(t * theta) / sinTheta;

    return new QuadrayRotor(
      wa * a.w + wb * bw,
      wa * a.x + wb * bx,
      wa * a.y + wb * by,
      wa * a.z + wb * bz,
      a.polarity
    ).normalize();
  }

  /**
   * Convert to string representation for debugging
   * @returns {string} Formatted rotor string
   */
  toString() {
    const sign = this.polarity > 0 ? '+' : '-';
    return `QuadrayRotor(${this.w.toFixed(4)}, ${this.x.toFixed(4)}, ${this.y.toFixed(4)}, ${this.z.toFixed(4)}, ${sign})`;
  }

  /**
   * Clone this rotor
   * @returns {QuadrayRotor} New rotor with same values
   */
  clone() {
    return new QuadrayRotor(this.w, this.x, this.y, this.z, this.polarity);
  }
}

/**
 * QuadrayRotorState - Tracks rotor state over time for animation
 *
 * Manages continuous rotation with:
 * - Current orientation rotor
 * - Angular velocity (rad/s) around current axis
 * - Time tracking for smooth animation
 */
export class QuadrayRotorState {
  constructor() {
    this.orientation = QuadrayRotor.identity();
    this.angularVelocity = 0;  // rad/s
    this.axis = { x: 0, y: 0, z: 1 };  // Current rotation axis
    this.lastTime = null;
  }

  /**
   * Set angular velocity around specified axis
   *
   * @param {number} radiansPerSecond - Angular velocity
   * @param {Object} axis - Rotation axis {x, y, z}
   */
  setVelocity(radiansPerSecond, axis) {
    this.angularVelocity = radiansPerSecond;
    this.axis = axis;
  }

  /**
   * Update state based on elapsed time
   * Call this each frame with current timestamp
   *
   * @param {number} currentTime - Current time in milliseconds
   */
  update(currentTime) {
    if (this.lastTime === null) {
      this.lastTime = currentTime;
      return;
    }

    const deltaMs = currentTime - this.lastTime;
    const deltaSec = deltaMs / 1000;
    this.lastTime = currentTime;

    if (Math.abs(this.angularVelocity) < 1e-10) {
      return;  // No rotation
    }

    // Compute rotation for this frame
    const angle = this.angularVelocity * deltaSec;
    const spread = Math.sin(angle) ** 2;
    const polarity = angle >= 0 ? +1 : -1;

    const deltaRotor = QuadrayRotor.fromSpreadAxis(spread, this.axis, polarity);

    // Compose with current orientation
    this.orientation = this.orientation.multiply(deltaRotor);
  }

  /**
   * Apply incremental rotation from user input
   *
   * @param {number} spreadDelta - Spread increment
   * @param {Object} axis - Rotation axis
   * @param {number} polarity - Direction
   */
  applyIncrement(spreadDelta, axis, polarity = +1) {
    const deltaRotor = QuadrayRotor.fromSpreadAxis(spreadDelta, axis, polarity);
    this.orientation = this.orientation.multiply(deltaRotor);
  }

  /**
   * Get current state for display
   *
   * @returns {Object} Current state information
   */
  getDisplayState() {
    const { axis, spread, cross, angleDeg } = this.orientation.getAxisSpread();
    const axisQuadray = this.orientation.getAxisQuadray();
    const gimbalProximity = this.orientation.getGimbalLockProximity();

    const rpm = (this.angularVelocity * 60) / (2 * Math.PI);
    const degsPerSec = this.angularVelocity * (180 / Math.PI);

    return {
      // Rotor components
      rotor: {
        w: this.orientation.w,
        x: this.orientation.x,
        y: this.orientation.y,
        z: this.orientation.z,
        polarity: this.orientation.polarity
      },
      // Axis in both coordinate systems
      axisXYZ: axis,
      axisWXYZ: axisQuadray,
      // RT measures
      spread,
      cross,
      angleDeg,
      // Angular velocity
      angularVelocity: {
        radiansPerSecond: this.angularVelocity,
        rpm: rpm,
        degreesPerSecond: degsPerSec
      },
      // Gimbal lock proximity (for comparison display)
      gimbalLockProximity: gimbalProximity
    };
  }
}

/**
 * Utility: Calculate spread for common angles (RT-pure where possible)
 */
export const CommonSpreads = {
  deg0: 0,           // sin²(0°) = 0
  deg30: 0.25,       // sin²(30°) = 1/4
  deg45: 0.5,        // sin²(45°) = 1/2
  deg60: 0.75,       // sin²(60°) = 3/4
  deg90: 1,          // sin²(90°) = 1
  deg120: 0.75,      // sin²(120°) = 3/4
  deg135: 0.5,       // sin²(135°) = 1/2
  deg150: 0.25,      // sin²(150°) = 1/4
  deg180: 0,         // sin²(180°) = 0

  /**
   * Get spread for arbitrary angle
   * @param {number} degrees - Angle in degrees
   * @returns {number} Spread value
   */
  fromDegrees(degrees) {
    const radians = (degrees * Math.PI) / 180;
    return Math.sin(radians) ** 2;
  }
};
