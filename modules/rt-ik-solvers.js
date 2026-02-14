/**
 * RT.IK — Inverse kinematics constraint solvers.
 *
 * Each solver takes node positions and a constraint definition,
 * and returns resolved positions (or geometric properties).
 *
 * Design principle: solvers are pure functions (position in -> result out).
 * They don't own the nodes. The caller (demo, renderer) owns node positions
 * and calls the solver each frame.
 *
 * Phase 5a: 2D rigid link (display-only) for Gravity Numberline demo.
 * Phase 5b: Pin joints, hinges.
 * Phase 5c: Elastic, tension, compression.
 * Phase 5d: Pneumatic soft compression.
 */

/**
 * Compute the spread (sin^2 theta) of the line A->B relative to vertical.
 *
 * RT-pure: no trig functions. Uses the quadrance cross-ratio:
 *   vertical direction = (0, 1)
 *   link direction     = (dx, dy)
 *   spread = 1 - (dot(link, vert))^2 / (Q_link * Q_vert)
 *          = 1 - dy^2 / (dx^2 + dy^2)
 *          = dx^2 / (dx^2 + dy^2)
 *
 * @param {number} ax - Node A x
 * @param {number} ay - Node A y
 * @param {number} bx - Node B x
 * @param {number} by - Node B y
 * @returns {{ spread: number, quadrance: number, dx: number, dy: number }}
 */
export function linkSpread2D(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const Q = dx * dx + dy * dy;
  const spread = Q > 0 ? (dx * dx) / Q : 0;
  return { spread, quadrance: Q, dx, dy };
}

/**
 * Compute the angle (radians) of the line A->B from vertical.
 * Convenience wrapper for formula display — uses atan2 (not RT-pure).
 *
 * @param {number} ax - Node A x
 * @param {number} ay - Node A y
 * @param {number} bx - Node B x
 * @param {number} by - Node B y
 * @returns {number} Angle from vertical in radians (0 = vertical, +/- pi/2 = horizontal)
 */
export function linkAngle2D(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.atan2(dx, dy);
}

/**
 * Solve rigid constraint in 2D.
 *
 * Given anchor A (fixed) and target B (desired position),
 * returns the resolved position of B on the circle of radius `length`
 * centered at A, preserving the direction from A to B.
 *
 * If A and B coincide, returns B displaced vertically by `length`.
 *
 * @param {number} ax - Anchor x
 * @param {number} ay - Anchor y
 * @param {number} bx - Target x
 * @param {number} by - Target y
 * @param {number} length - Constraint length (rest length)
 * @returns {{ x: number, y: number }}
 */
export function solveRigid2D(ax, ay, bx, by, length) {
  const dx = bx - ax;
  const dy = by - ay;
  const Q = dx * dx + dy * dy;

  if (Q < 1e-12) {
    // Degenerate: A and B coincide — place B directly below A
    return { x: ax, y: ay - length };
  }

  const dist = Math.sqrt(Q);
  const scale = length / dist;
  return {
    x: ax + dx * scale,
    y: ay + dy * scale,
  };
}

/**
 * Solve rigid constraint in 3D.
 *
 * Same as 2D but in 3D space — B is placed on the sphere of radius `length`
 * centered at A, preserving the direction from A to B.
 *
 * @param {number} ax - Anchor x
 * @param {number} ay - Anchor y
 * @param {number} az - Anchor z
 * @param {number} bx - Target x
 * @param {number} by - Target y
 * @param {number} bz - Target z
 * @param {number} length - Constraint length
 * @returns {{ x: number, y: number, z: number }}
 */
export function solveRigid3D(ax, ay, az, bx, by, bz, length) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const Q = dx * dx + dy * dy + dz * dz;

  if (Q < 1e-12) {
    return { x: ax, y: ay - length, z: az };
  }

  const dist = Math.sqrt(Q);
  const scale = length / dist;
  return {
    x: ax + dx * scale,
    y: ay + dy * scale,
    z: az + dz * scale,
  };
}
