/**
 * rt-snap-geometry.js
 * Pure geometry helper functions for object snapping
 *
 * Extracted from rt-init.js (Jan 30, 2026)
 * These functions have NO DOM dependencies, NO state dependencies.
 * They operate purely on THREE.js geometry objects.
 *
 * @module RTSnapGeometry
 * @requires THREE.js (passed as parameter, not imported)
 */

/**
 * Get all vertices of a polyhedron in world coordinates
 * @param {THREE.Group} polyGroup - Polyhedron group
 * @param {Object} THREE - THREE.js library reference
 * @returns {Array<THREE.Vector3>} Array of vertex positions in world space
 */
export function getPolyhedronVertices(polyGroup, THREE) {
  const vertices = [];
  const seenPositions = new Set(); // Deduplicate vertices

  polyGroup.traverse(obj => {
    // Skip vertex node spheres (decorative geometry, not structural)
    if (obj.userData?.isVertexNode) return;

    if (obj.isMesh && obj.geometry) {
      const posAttr = obj.geometry.getAttribute("position");
      if (posAttr) {
        for (let i = 0; i < posAttr.count; i++) {
          const localVertex = new THREE.Vector3(
            posAttr.getX(i),
            posAttr.getY(i),
            posAttr.getZ(i)
          );
          // Transform to world coordinates
          const worldVertex = localVertex.clone();
          obj.localToWorld(worldVertex);

          // Deduplicate (round to 4 decimal places for comparison)
          const key = `${worldVertex.x.toFixed(4)},${worldVertex.y.toFixed(4)},${worldVertex.z.toFixed(4)}`;
          if (!seenPositions.has(key)) {
            seenPositions.add(key);
            vertices.push(worldVertex);
          }
        }
      }
    }
  });

  return vertices;
}

/**
 * Get all edge midpoints of a polyhedron in world coordinates
 * @param {THREE.Group} polyGroup - Polyhedron group
 * @param {Object} THREE - THREE.js library reference
 * @returns {Array<THREE.Vector3>} Array of edge midpoint positions in world space
 */
export function getPolyhedronEdgeMidpoints(polyGroup, THREE) {
  const midpoints = [];
  const seenEdges = new Set(); // Deduplicate edges

  polyGroup.traverse(obj => {
    // Skip vertex node spheres (decorative geometry, not structural)
    if (obj.userData?.isVertexNode) return;

    if (obj.isMesh && obj.geometry) {
      const posAttr = obj.geometry.getAttribute("position");
      const index = obj.geometry.index;

      if (posAttr && index) {
        // Indexed geometry - extract edges from triangles
        for (let i = 0; i < index.count; i += 3) {
          const indices = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];

          // Three edges per triangle
          const edges = [
            [indices[0], indices[1]],
            [indices[1], indices[2]],
            [indices[2], indices[0]],
          ];

          edges.forEach(([a, b]) => {
            // Normalize edge key (smaller index first)
            const edgeKey = a < b ? `${a}-${b}` : `${b}-${a}`;
            if (!seenEdges.has(edgeKey)) {
              seenEdges.add(edgeKey);

              const v1 = new THREE.Vector3(
                posAttr.getX(a),
                posAttr.getY(a),
                posAttr.getZ(a)
              );
              const v2 = new THREE.Vector3(
                posAttr.getX(b),
                posAttr.getY(b),
                posAttr.getZ(b)
              );

              // Calculate midpoint in local space
              const midpoint = v1.clone().add(v2).multiplyScalar(0.5);

              // Transform to world coordinates
              obj.localToWorld(midpoint);
              midpoints.push(midpoint);
            }
          });
        }
      }
    }
  });

  return midpoints;
}

/**
 * Get all face centroids of a polyhedron in world coordinates
 * @param {THREE.Group} polyGroup - Polyhedron group
 * @param {Object} THREE - THREE.js library reference
 * @returns {Array<THREE.Vector3>} Array of face centroid positions in world space
 */
export function getPolyhedronFaceCentroids(polyGroup, THREE) {
  const centroids = [];

  polyGroup.traverse(obj => {
    // Skip vertex node spheres (decorative geometry, not structural)
    if (obj.userData?.isVertexNode) return;

    if (obj.isMesh && obj.geometry) {
      const posAttr = obj.geometry.getAttribute("position");
      const index = obj.geometry.index;

      if (posAttr && index) {
        // Process each triangle face
        for (let i = 0; i < index.count; i += 3) {
          const a = index.getX(i);
          const b = index.getX(i + 1);
          const c = index.getX(i + 2);

          const v1 = new THREE.Vector3(
            posAttr.getX(a),
            posAttr.getY(a),
            posAttr.getZ(a)
          );
          const v2 = new THREE.Vector3(
            posAttr.getX(b),
            posAttr.getY(b),
            posAttr.getZ(b)
          );
          const v3 = new THREE.Vector3(
            posAttr.getX(c),
            posAttr.getY(c),
            posAttr.getZ(c)
          );

          // Calculate centroid in local space
          const centroid = v1
            .clone()
            .add(v2)
            .add(v3)
            .multiplyScalar(1 / 3);

          // Transform to world coordinates
          obj.localToWorld(centroid);
          centroids.push(centroid);
        }
      }
    }
  });

  return centroids;
}
