//! Geodesic Subdivision — Quadray-Native
//!
//! Class I geodesic subdivision (Fuller frequency notation) operating entirely
//! in Quadray ABCD space. No Cartesian intermediary.
//!
//! Algorithm:
//!   1. Subdivide triangular faces via barycentric grid in ABCD space
//!   2. Terminate each vertex at target radius (Q = 4∑a² for zero-sum)
//!   3. Three radii per polyhedron: insphere, midsphere, outsphere
//!
//! The word "sphere" never appears as a geometric object — we terminate at
//! a target quadrance. Three Q values, three geodesics.
//!
//! RT-Purity: ONE √ per vertex at radius termination. All Q_targets are
//! rational (tet, octa) or phi-algebraic (icosa). No classical trig.

use std::collections::HashMap;

use crate::rt_math::phi;
use crate::rt_math::Quadray;

use super::PolyhedronData;

/// Which radius to terminate subdivision vertices at.
///
/// Each polyhedron defines three known radii:
///   - InSphere:  distance from center to face centers (innermost)
///   - MidSphere: distance from center to edge midpoints
///   - OutSphere: distance from center to vertices (outermost, Fuller's geodesic)
///   - Off:       no termination — flat subdivided mesh
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ProjectionMode {
    Off,
    InSphere,
    MidSphere,
    OutSphere,
}

impl ProjectionMode {
    /// Convert from u8 (for UI state storage).
    pub fn from_u8(v: u8) -> Self {
        match v {
            0 => Self::Off,
            1 => Self::InSphere,
            2 => Self::MidSphere,
            _ => Self::OutSphere,
        }
    }

    /// Convert to u8 (for UI state storage).
    pub fn to_u8(self) -> u8 {
        match self {
            Self::Off => 0,
            Self::InSphere => 1,
            Self::MidSphere => 2,
            Self::OutSphere => 3,
        }
    }

    /// Display name for UI.
    pub fn label(self) -> &'static str {
        match self {
            Self::Off => "Off",
            Self::InSphere => "InSphere",
            Self::MidSphere => "MidSphere",
            Self::OutSphere => "OutSphere",
        }
    }
}

/// Intermediate geodesic data before packaging into PolyhedronData.
struct GeodesicData {
    vertices: Vec<Quadray>,
    edges: Vec<[usize; 2]>,
    faces: Vec<Vec<usize>>,
}

// ---------------------------------------------------------------------------
// Core subdivision algorithm
// ---------------------------------------------------------------------------

/// Linear interpolation between two Quadray points.
/// Stays in ABCD space — no Cartesian conversion.
fn lerp_quadray(q1: &Quadray, q2: &Quadray, t: f64) -> Quadray {
    Quadray::new(
        q1.a + t * (q2.a - q1.a),
        q1.b + t * (q2.b - q1.b),
        q1.c + t * (q2.c - q1.c),
        q1.d + t * (q2.d - q1.d),
    )
}

/// Barycentric interpolation of three Quadray points.
/// w = 1 - u - v.  Stays in ABCD space.
fn bary_quadray(q0: &Quadray, q1: &Quadray, q2: &Quadray, u: f64, v: f64) -> Quadray {
    let w = 1.0 - u - v;
    Quadray::new(
        w * q0.a + v * q1.a + u * q2.a,
        w * q0.b + v * q1.b + u * q2.b,
        w * q0.c + v * q1.c + u * q2.c,
        w * q0.d + v * q1.d + u * q2.d,
    )
}

/// Quadrance from origin for a Quadray point.
///
/// For zero-sum normalized [a,b,c,d] (sum=0):
///   Q = 4(a² + b² + c² + d²)
///
/// Derived from:
///   Basis vectors each have |B|² = 3, cross products B_i·B_j = -1.
///   For zero-sum: ∑pairs = -∑a²/2  (from (a+b+c+d)²=0)
///   Q = 3∑a² + 2(-1)(-∑a²/2) = 4∑a²
///
/// Verified: Quadray::A → normalized [0.75,-0.25,-0.25,-0.25]
///   Q = 4(0.5625+0.0625+0.0625+0.0625) = 4(0.75) = 3.0
///   Matches Cartesian (-1,-1,+1): Q = 1+1+1 = 3 ✓
pub fn quadray_quadrance_from_origin(q: &Quadray) -> f64 {
    let n = q.normalize(); // zero-sum
    4.0 * (n.a * n.a + n.b * n.b + n.c * n.c + n.d * n.d)
}

/// Terminate vertices at target quadrance from origin.
///
/// Each vertex is scaled so Q = Q_target (equal "radius" from center).
/// ONE √ per vertex — the justified RT boundary.
/// Operates entirely in Quadray ABCD space.
fn terminate_at_radius(vertices: &mut [Quadray], q_target: f64) {
    for q in vertices.iter_mut() {
        let q_current = quadray_quadrance_from_origin(q);
        if q_current < 1e-15 {
            continue; // Skip origin-adjacent vertices
        }
        let factor = (q_target / q_current).sqrt(); // ONE √
        *q = Quadray::new(q.a * factor, q.b * factor, q.c * factor, q.d * factor);
    }
}

/// Canonical edge key for vertex deduplication.
/// Smaller index first, then parameter t (6 decimal places).
fn edge_key(i: usize, j: usize, t: f64) -> String {
    if i < j {
        format!("{},{},{:.6}", i, j, t)
    } else {
        format!("{},{},{:.6}", j, i, 1.0 - t)
    }
}

/// Canonical interior point key for deduplication.
fn interior_key(v0: usize, v1: usize, v2: usize, u: f64, v: f64) -> String {
    format!("{},{},{},{:.6},{:.6}", v0, v1, v2, u, v)
}

/// Class I geodesic subdivision of triangular faces in Quadray ABCD space.
///
/// Fuller frequency notation:
///   frequency = number of edge segments
///   1 = base polyhedron (no subdivision)
///   2 = each edge bisected (4 sub-faces per face)
///   N = each edge divided into N parts (N² sub-faces per face)
///
/// Algorithm:
///   For each triangular face, build a barycentric grid with `divisions = frequency`.
///   Corner vertices reuse originals. Edge vertices are shared between adjacent faces
///   via canonical key caching. Interior vertices are unique per face.
///
///   All interpolation happens in Quadray ABCD space — no Cartesian.
fn subdivide_triangles(
    vertices: &[Quadray],
    faces: &[Vec<usize>],
    frequency: u32,
) -> GeodesicData {
    if frequency <= 1 {
        // Frequency 0 or 1: return base polyhedron with derived edges
        let mut edge_set: HashMap<(usize, usize), ()> = HashMap::new();
        for face in faces {
            if face.len() >= 3 {
                let pairs = [(face[0], face[1]), (face[1], face[2]), (face[2], face[0])];
                for (a, b) in pairs {
                    let key = if a < b { (a, b) } else { (b, a) };
                    edge_set.insert(key, ());
                }
            }
        }
        return GeodesicData {
            vertices: vertices.to_vec(),
            edges: edge_set.keys().map(|&(a, b)| [a, b]).collect(),
            faces: faces.to_vec(),
        };
    }

    let divisions = frequency as usize;
    let mut new_vertices: Vec<Quadray> = vertices.to_vec();
    let mut vertex_cache: HashMap<String, usize> = HashMap::new();
    let mut new_faces: Vec<Vec<usize>> = Vec::new();

    // Helper: get or create edge subdivision point
    let get_edge_point = |new_verts: &mut Vec<Quadray>,
                          cache: &mut HashMap<String, usize>,
                          i: usize,
                          j: usize,
                          t: f64|
     -> usize {
        let key = edge_key(i, j, t);
        if let Some(&idx) = cache.get(&key) {
            return idx;
        }
        let point = lerp_quadray(&new_verts[i], &new_verts[j], t);
        let idx = new_verts.len();
        new_verts.push(point);
        cache.insert(key, idx);
        idx
    };

    // Subdivide each triangular face
    for face in faces {
        if face.len() < 3 {
            continue;
        }
        let (v0, v1, v2) = (face[0], face[1], face[2]);

        // Build barycentric grid of vertex indices
        let mut grid: Vec<Vec<usize>> = Vec::with_capacity(divisions + 1);

        for row in 0..=divisions {
            let mut grid_row = Vec::with_capacity(divisions - row + 1);
            for col in 0..=(divisions - row) {
                let u = row as f64 / divisions as f64; // weight for v2
                let v = col as f64 / divisions as f64; // weight for v1

                let idx = if row == 0 && col == 0 {
                    // Corner v0
                    v0
                } else if row == 0 && col == divisions {
                    // Corner v1
                    v1
                } else if row == divisions && col == 0 {
                    // Corner v2
                    v2
                } else if row == 0 {
                    // Edge v0→v1
                    get_edge_point(&mut new_vertices, &mut vertex_cache, v0, v1, v)
                } else if col == 0 {
                    // Edge v0→v2
                    get_edge_point(&mut new_vertices, &mut vertex_cache, v0, v2, u)
                } else if row + col == divisions {
                    // Edge v1→v2
                    let t = row as f64 / divisions as f64;
                    get_edge_point(&mut new_vertices, &mut vertex_cache, v1, v2, t)
                } else {
                    // Interior point — unique per face
                    let key = interior_key(v0, v1, v2, u, v);
                    if let Some(&idx) = vertex_cache.get(&key) {
                        idx
                    } else {
                        let point = bary_quadray(
                            &new_vertices[v0],
                            &new_vertices[v1],
                            &new_vertices[v2],
                            u,
                            v,
                        );
                        let idx = new_vertices.len();
                        new_vertices.push(point);
                        vertex_cache.insert(key, idx);
                        idx
                    }
                };

                grid_row.push(idx);
            }
            grid.push(grid_row);
        }

        // Triangulate the grid (CCW winding preserved from base face)
        for row in 0..divisions {
            for col in 0..(divisions - row) {
                // Upward-pointing triangle
                let a = grid[row][col];
                let b = grid[row][col + 1];
                let c = grid[row + 1][col];
                new_faces.push(vec![a, b, c]);

                // Downward-pointing triangle (if not at edge)
                if col < divisions - row - 1 {
                    let d = grid[row][col + 1];
                    let e = grid[row + 1][col + 1];
                    let f = grid[row + 1][col];
                    new_faces.push(vec![d, e, f]);
                }
            }
        }
    }

    // Derive edges from face connectivity (deduplicate via sorted pairs)
    let mut edge_set: HashMap<(usize, usize), ()> = HashMap::new();
    for face in &new_faces {
        if face.len() >= 3 {
            let pairs = [(face[0], face[1]), (face[1], face[2]), (face[2], face[0])];
            for (a, b) in pairs {
                let key = if a < b { (a, b) } else { (b, a) };
                edge_set.insert(key, ());
            }
        }
    }

    GeodesicData {
        vertices: new_vertices,
        edges: edge_set.keys().map(|&(a, b)| [a, b]).collect(),
        faces: new_faces,
    }
}

// ---------------------------------------------------------------------------
// Q_target calculations per polyhedron
// ---------------------------------------------------------------------------

/// Tet Q_targets at unit Quadray scale.
/// Vertex [1,0,0,0] → Cartesian (-1,-1,+1), Q_circ = 3.
///
/// | Mode       | Q_target | Derivation              |
/// |------------|----------|-------------------------|
/// | OutSphere  | 3        | circumsphere (vertices) |
/// | MidSphere  | 1        | Q_circ / 3              |
/// | InSphere   | 1/3      | Q_circ / 9              |
fn tet_q_target(mode: ProjectionMode) -> Option<f64> {
    match mode {
        ProjectionMode::Off => None,
        ProjectionMode::OutSphere => Some(3.0),
        ProjectionMode::MidSphere => Some(1.0),
        ProjectionMode::InSphere => Some(1.0 / 3.0),
    }
}

/// Octa Q_targets at unit Quadray scale.
/// Vertex [1,1,0,0] → Cartesian (0,0,2), Q_circ = 4.
///
/// | Mode       | Q_target | Derivation              |
/// |------------|----------|-------------------------|
/// | OutSphere  | 4        | circumsphere (vertices) |
/// | MidSphere  | 2        | Q_circ / 2              |
/// | InSphere   | 4/3      | Q_circ / 3              |
fn octa_q_target(mode: ProjectionMode) -> Option<f64> {
    match mode {
        ProjectionMode::Off => None,
        ProjectionMode::OutSphere => Some(4.0),
        ProjectionMode::MidSphere => Some(2.0),
        ProjectionMode::InSphere => Some(4.0 / 3.0),
    }
}

/// Icosa Q_targets at unit Quadray scale.
/// Uses phi identities — algebraic, not transcendental.
///
/// Q_circ computed from first vertex via quadray_quadrance_from_origin.
///
/// | Mode       | Q_target                             | Identity used     |
/// |------------|--------------------------------------|-------------------|
/// | OutSphere  | Q_circ                               | —                 |
/// | MidSphere  | Q_circ · φ²/(φ+2) = Q_circ·(φ+1)/(φ+2) | φ² = φ+1    |
/// | InSphere   | Q_circ · (3φ+2)/[3(φ+2)]            | φ⁴ = 3φ+2        |
fn icosa_q_target(mode: ProjectionMode, q_circ: f64) -> Option<f64> {
    match mode {
        ProjectionMode::Off => None,
        ProjectionMode::OutSphere => Some(q_circ),
        ProjectionMode::MidSphere => {
            // φ² = φ+1 (identity), denominator = φ+2
            let ratio = phi::phi_squared() / (phi::phi() + 2.0);
            Some(q_circ * ratio)
        }
        ProjectionMode::InSphere => {
            // φ⁴ = 3φ+2 (identity), denominator = 3(φ+2)
            let ratio = phi::phi_fourth() / (3.0 * (phi::phi() + 2.0));
            Some(q_circ * ratio)
        }
    }
}

// ---------------------------------------------------------------------------
// Public geodesic constructors
// ---------------------------------------------------------------------------

/// Geodesic Tetrahedron — Class I subdivision in Quadray ABCD space.
///
/// Frequency 1 returns the base tetrahedron unchanged.
/// Frequency N subdivides each edge into N segments, each face into N² triangles.
/// Vertices are terminated at the chosen radius (three known tet radii).
///
/// All vertices remain in Quadray ABCD. The only √ is at radius termination.
pub fn geodesic_tetrahedron(frequency: u32, mode: ProjectionMode) -> PolyhedronData {
    let base = super::tetrahedron();

    if frequency <= 1 {
        return base;
    }

    let mut data = subdivide_triangles(&base.vertices, &base.faces, frequency);

    if let Some(q_target) = tet_q_target(mode) {
        terminate_at_radius(&mut data.vertices, q_target);
    }

    // Edge quadrance: sample first edge after termination
    let eq = if data.edges.is_empty() {
        8.0
    } else {
        let [i, j] = data.edges[0];
        data.vertices[i].quadrance(&data.vertices[j])
    };

    PolyhedronData {
        name: "Geodesic Tetrahedron",
        schlafli: "{3,3}",
        vertices: data.vertices,
        edges: data.edges,
        faces: data.faces,
        face_spread: None,
        edge_quadrance: eq,
    }
}

/// Geodesic Octahedron — Class I subdivision in Quadray ABCD space.
pub fn geodesic_octahedron(frequency: u32, mode: ProjectionMode) -> PolyhedronData {
    let base = super::octahedron();

    if frequency <= 1 {
        return base;
    }

    let mut data = subdivide_triangles(&base.vertices, &base.faces, frequency);

    if let Some(q_target) = octa_q_target(mode) {
        terminate_at_radius(&mut data.vertices, q_target);
    }

    let eq = if data.edges.is_empty() {
        8.0
    } else {
        let [i, j] = data.edges[0];
        data.vertices[i].quadrance(&data.vertices[j])
    };

    PolyhedronData {
        name: "Geodesic Octahedron",
        schlafli: "{3,4}",
        vertices: data.vertices,
        edges: data.edges,
        faces: data.faces,
        face_spread: None,
        edge_quadrance: eq,
    }
}

/// Geodesic Icosahedron — Class I subdivision in Quadray ABCD space.
///
/// Q_targets use phi identities from `phi.rs`:
///   OutSphere: Q_circ (through vertices)
///   MidSphere: Q_circ · φ²/(φ+2) — uses φ²=φ+1
///   InSphere:  Q_circ · (3φ+2)/[3(φ+2)] — uses φ⁴=3φ+2
pub fn geodesic_icosahedron(frequency: u32, mode: ProjectionMode) -> PolyhedronData {
    let base = super::icosahedron();

    if frequency <= 1 {
        return base;
    }

    // Compute Q_circ from base icosahedron's first vertex (phi-algebraic)
    let q_circ = quadray_quadrance_from_origin(&base.vertices[0]);

    let mut data = subdivide_triangles(&base.vertices, &base.faces, frequency);

    if let Some(q_target) = icosa_q_target(mode, q_circ) {
        terminate_at_radius(&mut data.vertices, q_target);
    }

    let eq = if data.edges.is_empty() {
        4.0
    } else {
        let [i, j] = data.edges[0];
        data.vertices[i].quadrance(&data.vertices[j])
    };

    PolyhedronData {
        name: "Geodesic Icosahedron",
        schlafli: "{3,5}",
        vertices: data.vertices,
        edges: data.edges,
        faces: data.faces,
        face_spread: None,
        edge_quadrance: eq,
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    const EPS: f64 = 1e-10;

    // --- Q-norm verification ---

    #[test]
    fn q_norm_tet_vertex() {
        // Quadray::A = [1,0,0,0] → Cartesian (-1,-1,+1), Q = 3
        let q = quadray_quadrance_from_origin(&Quadray::A);
        assert!((q - 3.0).abs() < EPS, "Q(A) = {} != 3.0", q);
    }

    #[test]
    fn q_norm_octa_vertex() {
        // [1,1,0,0] → Cartesian (0,0,2), Q = 4
        let q = quadray_quadrance_from_origin(&Quadray::new(1.0, 1.0, 0.0, 0.0));
        assert!((q - 4.0).abs() < EPS, "Q([1,1,0,0]) = {} != 4.0", q);
    }

    #[test]
    fn q_norm_origin() {
        let q = quadray_quadrance_from_origin(&Quadray::ORIGIN);
        assert!((q - 0.0).abs() < EPS, "Q(origin) = {} != 0.0", q);
    }

    // --- Frequency 1 returns base ---

    #[test]
    fn freq1_tet_returns_base() {
        let geo = geodesic_tetrahedron(1, ProjectionMode::OutSphere);
        assert_eq!(geo.vertices.len(), 4, "freq 1 should return 4 vertices");
        assert_eq!(geo.faces.len(), 4, "freq 1 should return 4 faces");
    }

    #[test]
    fn freq1_octa_returns_base() {
        let geo = geodesic_octahedron(1, ProjectionMode::OutSphere);
        assert_eq!(geo.vertices.len(), 6, "freq 1 should return 6 vertices");
        assert_eq!(geo.faces.len(), 8, "freq 1 should return 8 faces");
    }

    #[test]
    fn freq1_icosa_returns_base() {
        let geo = geodesic_icosahedron(1, ProjectionMode::OutSphere);
        assert_eq!(geo.vertices.len(), 12, "freq 1 should return 12 vertices");
        assert_eq!(geo.faces.len(), 20, "freq 1 should return 20 faces");
    }

    // --- Vertex and face counts ---

    #[test]
    fn tet_freq2_counts() {
        // Tet: 4V, 6E, 4F. At freq 2: V = 4 + 6*1 = 10, F = 4*4 = 16
        let geo = geodesic_tetrahedron(2, ProjectionMode::OutSphere);
        assert_eq!(geo.faces.len(), 16, "tet freq 2: expected 16 faces, got {}", geo.faces.len());
        assert_eq!(geo.vertices.len(), 10, "tet freq 2: expected 10 vertices, got {}", geo.vertices.len());
    }

    #[test]
    fn tet_freq3_counts() {
        // Tet: 4V, 6E, 4F. At freq 3: V = 4 + 6*2 + 4*1 = 20, F = 4*9 = 36
        let geo = geodesic_tetrahedron(3, ProjectionMode::OutSphere);
        assert_eq!(geo.faces.len(), 36, "tet freq 3: expected 36 faces, got {}", geo.faces.len());
        // V = V_base + E_base*(f-1) + F_base*(f-1)*(f-2)/2
        //   = 4 + 6*2 + 4*1 = 20
        assert_eq!(geo.vertices.len(), 20, "tet freq 3: expected 20 vertices, got {}", geo.vertices.len());
    }

    #[test]
    fn icosa_freq2_counts() {
        // Icosa: 12V, 30E, 20F. At freq 2: V = 12 + 30*1 = 42, F = 20*4 = 80
        let geo = geodesic_icosahedron(2, ProjectionMode::OutSphere);
        assert_eq!(geo.faces.len(), 80, "icosa freq 2: expected 80 faces, got {}", geo.faces.len());
        assert_eq!(geo.vertices.len(), 42, "icosa freq 2: expected 42 vertices, got {}", geo.vertices.len());
    }

    #[test]
    fn icosa_freq3_counts() {
        // Icosa: 12V, 30E, 20F. At freq 3: V = 12 + 30*2 + 20*1 = 92, F = 20*9 = 180
        let geo = geodesic_icosahedron(3, ProjectionMode::OutSphere);
        assert_eq!(geo.faces.len(), 180, "icosa freq 3: expected 180 faces, got {}", geo.faces.len());
        assert_eq!(geo.vertices.len(), 92, "icosa freq 3: expected 92 vertices, got {}", geo.vertices.len());
    }

    // --- Euler's formula: V - E + F = 2 ---

    #[test]
    fn euler_tet_freq2() {
        let geo = geodesic_tetrahedron(2, ProjectionMode::OutSphere);
        assert!(geo.validate_euler(), "Euler failed for tet freq 2: V={} E={} F={}", geo.vertices.len(), geo.edges.len(), geo.faces.len());
    }

    #[test]
    fn euler_tet_freq3() {
        let geo = geodesic_tetrahedron(3, ProjectionMode::OutSphere);
        assert!(geo.validate_euler(), "Euler failed for tet freq 3: V={} E={} F={}", geo.vertices.len(), geo.edges.len(), geo.faces.len());
    }

    #[test]
    fn euler_octa_freq2() {
        let geo = geodesic_octahedron(2, ProjectionMode::OutSphere);
        assert!(geo.validate_euler(), "Euler failed for octa freq 2: V={} E={} F={}", geo.vertices.len(), geo.edges.len(), geo.faces.len());
    }

    #[test]
    fn euler_icosa_freq2() {
        let geo = geodesic_icosahedron(2, ProjectionMode::OutSphere);
        assert!(geo.validate_euler(), "Euler failed for icosa freq 2: V={} E={} F={}", geo.vertices.len(), geo.edges.len(), geo.faces.len());
    }

    #[test]
    fn euler_icosa_freq3() {
        let geo = geodesic_icosahedron(3, ProjectionMode::OutSphere);
        assert!(geo.validate_euler(), "Euler failed for icosa freq 3: V={} E={} F={}", geo.vertices.len(), geo.edges.len(), geo.faces.len());
    }

    // --- Equal radius termination ---

    #[test]
    fn tet_outsphere_equal_q() {
        let geo = geodesic_tetrahedron(3, ProjectionMode::OutSphere);
        let q_target = 3.0;
        for (i, v) in geo.vertices.iter().enumerate() {
            let q = quadray_quadrance_from_origin(v);
            assert!(
                (q - q_target).abs() < 1e-8,
                "Tet Out vertex {} Q = {} != {}",
                i, q, q_target
            );
        }
    }

    #[test]
    fn tet_insphere_equal_q() {
        let geo = geodesic_tetrahedron(3, ProjectionMode::InSphere);
        let q_target = 1.0 / 3.0;
        for (i, v) in geo.vertices.iter().enumerate() {
            let q = quadray_quadrance_from_origin(v);
            assert!(
                (q - q_target).abs() < 1e-8,
                "Tet In vertex {} Q = {} != {}",
                i, q, q_target
            );
        }
    }

    #[test]
    fn octa_outsphere_equal_q() {
        let geo = geodesic_octahedron(3, ProjectionMode::OutSphere);
        let q_target = 4.0;
        for (i, v) in geo.vertices.iter().enumerate() {
            let q = quadray_quadrance_from_origin(v);
            assert!(
                (q - q_target).abs() < 1e-8,
                "Octa Out vertex {} Q = {} != {}",
                i, q, q_target
            );
        }
    }

    #[test]
    fn icosa_outsphere_equal_q() {
        let geo = geodesic_icosahedron(3, ProjectionMode::OutSphere);
        let q_circ = quadray_quadrance_from_origin(&super::super::icosahedron().vertices[0]);
        for (i, v) in geo.vertices.iter().enumerate() {
            let q = quadray_quadrance_from_origin(v);
            assert!(
                (q - q_circ).abs() < 1e-6,
                "Icosa Out vertex {} Q = {:.8} != {:.8}",
                i, q, q_circ
            );
        }
    }

    // --- Face winding ---

    #[test]
    fn tet_freq3_winding() {
        let geo = geodesic_tetrahedron(3, ProjectionMode::OutSphere);
        assert!(
            geo.validate_face_winding(),
            "Tet freq 3 OutSphere has incorrect face winding"
        );
    }

    #[test]
    fn octa_freq2_winding() {
        let geo = geodesic_octahedron(2, ProjectionMode::OutSphere);
        assert!(
            geo.validate_face_winding(),
            "Octa freq 2 OutSphere has incorrect face winding"
        );
    }

    #[test]
    fn icosa_freq2_winding() {
        let geo = geodesic_icosahedron(2, ProjectionMode::OutSphere);
        assert!(
            geo.validate_face_winding(),
            "Icosa freq 2 OutSphere has incorrect face winding"
        );
    }

    // --- Off mode (flat subdivision, no radius termination) ---

    #[test]
    fn tet_off_not_equal_radius() {
        // Off mode: vertices are NOT at equal radius (flat faces)
        let geo = geodesic_tetrahedron(2, ProjectionMode::Off);
        let q0 = quadray_quadrance_from_origin(&geo.vertices[0]);
        let q_mid = quadray_quadrance_from_origin(&geo.vertices[4]); // a subdivision point
        // These should differ (subdivision point is closer to origin than corner)
        assert!((q0 - q_mid).abs() > 0.01, "Off mode should NOT produce equal-radius vertices");
    }

    // --- Projection mode conversion ---

    #[test]
    fn projection_mode_roundtrip() {
        for mode in [ProjectionMode::Off, ProjectionMode::InSphere, ProjectionMode::MidSphere, ProjectionMode::OutSphere] {
            assert_eq!(ProjectionMode::from_u8(mode.to_u8()), mode);
        }
    }
}
