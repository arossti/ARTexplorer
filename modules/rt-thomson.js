/**
 * rt-thomson.js — Thomson Polyhedra
 *
 * N-gon great-circle shells on platonic frames.
 * Base geometry delegates to rt-polyhedra.js; the N-gon slider
 * will drive great-circle generation in a future pass.
 *
 * Thomson Problem: Given N points on a unit sphere, find the
 * configuration that minimises electrostatic potential energy.
 * For N=4 (tetrahedron) and N=6 (octahedron), the solutions
 * are the inscribed Platonic solids.
 */

import { Polyhedra } from "./rt-polyhedra.js";

export const Thomson = {
  /**
   * Thomson Tetrahedron — 4 optimal points on sphere
   * Currently delegates to base tetrahedron; N-gon shell generation TBD.
   *
   * @param {number} halfSize - Half-edge of bounding cube (default 1)
   * @param {Object} options - { nGon: 3..12 } (stubbed, not yet used)
   * @returns {{ vertices, edges, faces, faceSpread }}
   */
  tetrahedron(halfSize = 1, options = {}) {
    const _nGon = options.nGon || 5; // read but not used yet
    return Polyhedra.tetrahedron(halfSize, { silent: true });
  },

  /**
   * Thomson Octahedron — 6 optimal points on sphere
   * Currently delegates to base octahedron; N-gon shell generation TBD.
   *
   * @param {number} halfSize - Half-edge of bounding cube (default 1)
   * @param {Object} options - { nGon: 3..12 } (stubbed, not yet used)
   * @returns {{ vertices, edges, faces, faceSpread }}
   */
  octahedron(halfSize = 1, options = {}) {
    const _nGon = options.nGon || 5; // read but not used yet
    return Polyhedra.octahedron(halfSize, { silent: true });
  },
};
