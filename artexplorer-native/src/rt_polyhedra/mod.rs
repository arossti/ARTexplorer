//! Polyhedra generators for ARTexplorer
//!
//! All polyhedra defined in Quadray ABCD coordinates (native representation).
//! Cartesian conversion happens at GPU boundary via Quadray::to_cartesian().
//!
//! Data structure mirrors JS pattern: vertices + edges + faces.

pub mod platonic;

pub use platonic::*;

use crate::rt_math::Quadray;

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
    pub fn cartesian_vertices(&self) -> Vec<[f64; 3]> {
        self.vertices.iter().map(|q| q.to_cartesian()).collect()
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
}
