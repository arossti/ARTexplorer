//! Polyhedra generators for ARTexplorer
//!
//! All polyhedra defined in Quadray ABCD coordinates (native representation).
//! Cartesian conversion happens at GPU boundary via normalizer::batch_quadray_to_xyz().
//!
//! Data structure mirrors JS pattern: vertices + edges + faces.

pub mod platonic;

pub use platonic::*;

use crate::rt_math::Quadray;
use crate::rt_math::normalizer::batch_quadray_to_xyz;

/// Standard polyhedron data.
///
/// Vertices stored as Quadray ABCD (native). Convert to Cartesian only at GPU upload.
/// Edges are index pairs into the vertex array.
/// Faces are variable-length index lists (triangles, squares, pentagons, hexagons).
#[derive(Debug)]
pub struct PolyhedronData {
    pub name: &'static str,
    pub schlafli: &'static str,
    pub vertices: Vec<Quadray>,
    pub edges: Vec<[usize; 2]>,
    pub faces: Vec<Vec<usize>>,
    pub face_spread: Option<f64>,
    pub edge_quadrance: f64,
}

impl PolyhedronData {
    /// Get Cartesian vertices for GPU upload (the precision boundary).
    /// Delegates to normalizer::batch_quadray_to_xyz() — the conversion API.
    pub fn cartesian_vertices(&self) -> Vec<[f64; 3]> {
        batch_quadray_to_xyz(&self.vertices)
    }

    /// Get f32 Quadray arrays for GPU upload.
    pub fn quadray_f32(&self) -> Vec<[f32; 4]> {
        self.vertices.iter().map(|q| q.to_f32_array()).collect()
    }

    /// Flat index list for LineList topology (each edge → 2 indices).
    pub fn edge_indices_u16(&self) -> Vec<u16> {
        self.edges
            .iter()
            .flat_map(|[a, b]| [*a as u16, *b as u16])
            .collect()
    }

    /// Validate: all edges have expected quadrance.
    pub fn validate_edges(&self, tolerance: f64) -> bool {
        let cart = self.cartesian_vertices();
        let results = crate::rt_math::validate_edges(&cart, &self.edges, self.edge_quadrance, tolerance);
        results.iter().all(|r| r.valid)
    }

    /// Validate Euler's formula: V - E + F = 2.
    pub fn validate_euler(&self) -> bool {
        crate::rt_math::verify_euler(self.vertices.len(), self.edges.len(), self.faces.len())
    }

    /// Validate that all faces have CCW winding (outward-pointing normals).
    ///
    /// For a convex polyhedron centered at the origin, a face [v0, v1, v2, ...] is CCW
    /// if the cross product normal (v1-v0)×(v2-v0) points outward — i.e., has a positive
    /// dot product with the face centroid.
    ///
    /// Returns a list of face indices that have INCORRECT (CW) winding.
    pub fn check_face_winding(&self) -> Vec<usize> {
        let cart = self.cartesian_vertices();
        // Polyhedron centroid (should be ~origin for centered polyhedra)
        let n = cart.len() as f64;
        let poly_c = [
            cart.iter().map(|v| v[0]).sum::<f64>() / n,
            cart.iter().map(|v| v[1]).sum::<f64>() / n,
            cart.iter().map(|v| v[2]).sum::<f64>() / n,
        ];

        let mut bad_faces = Vec::new();
        for (fi, face) in self.faces.iter().enumerate() {
            if face.len() < 3 {
                continue;
            }
            let v0 = cart[face[0]];
            let v1 = cart[face[1]];
            let v2 = cart[face[2]];

            // Edge vectors
            let e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
            let e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

            // Cross product (face normal)
            let normal = [
                e1[1] * e2[2] - e1[2] * e2[1],
                e1[2] * e2[0] - e1[0] * e2[2],
                e1[0] * e2[1] - e1[1] * e2[0],
            ];

            // Face centroid
            let fc = face.len() as f64;
            let face_c = [
                face.iter().map(|&i| cart[i][0]).sum::<f64>() / fc,
                face.iter().map(|&i| cart[i][1]).sum::<f64>() / fc,
                face.iter().map(|&i| cart[i][2]).sum::<f64>() / fc,
            ];

            // Outward direction: face centroid minus polyhedron centroid
            let outward = [
                face_c[0] - poly_c[0],
                face_c[1] - poly_c[1],
                face_c[2] - poly_c[2],
            ];

            // Dot product: if negative, normal points inward (CW winding)
            let dot = normal[0] * outward[0] + normal[1] * outward[1] + normal[2] * outward[2];
            if dot < 0.0 {
                bad_faces.push(fi);
            }
        }
        bad_faces
    }

    /// Validate that ALL faces have correct CCW winding.
    pub fn validate_face_winding(&self) -> bool {
        self.check_face_winding().is_empty()
    }
}
