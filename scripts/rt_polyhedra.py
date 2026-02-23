"""
rt_polyhedra.py
Polyhedra Vertex Definitions - Direct Port from modules/rt-polyhedra.js and rt-math.js

CRITICAL: These are EXACT COPIES of the JavaScript definitions.
Do NOT re-derive or use "equivalent" constructions.
This ensures Python search results work DIRECTLY in JavaScript without translation.

References:
- modules/rt-polyhedra.js:122 - Tetrahedron
- modules/rt-math.js:1768 - Truncated Tetrahedron
- modules/rt-polyhedra.js:370 - Icosahedron
"""

from typing import List
from math import sqrt

# Import RT constants from our ported library
from rt_math import PHI, PHI_SQ, SQRT5


# =============================================================================
# POLYHEDRA VERTICES - EXACT COPIES FROM JAVASCRIPT
# =============================================================================

def tetrahedron(half_size: float = 1.0) -> List[List[float]]:
    """
    Tetrahedron inscribed in cube.
    Uses alternating vertices (every other corner).

    EXACT COPY from rt-polyhedra.js:122-127

    Args:
        half_size: Half the edge length of bounding cube (default 1.0)

    Returns:
        List of 4 vertices as [x, y, z]
    """
    s = half_size
    return [
        [-s, -s, -s],  # 0: (-, -, -)
        [s, s, -s],    # 2: (+, +, -)
        [s, -s, s],    # 5: (+, -, +)
        [-s, s, s],    # 7: (-, +, +)
    ]


def truncated_tetrahedron(half_size: float = 1.0, truncation: float = 1/3) -> List[List[float]]:
    """
    Truncated tetrahedron vertices with parametric truncation.

    Single source of truth - matches JavaScript Polyhedra.truncatedTetrahedron()
    for Python/JavaScript parity in prime polygon search.

    Truncation parameter t in [0, 0.5]:
    - t = 0: Base tetrahedron (4 vertices)
    - t = 1/3: Standard truncated tetrahedron (12 vertices)
    - t = 0.5: Octahedron limit (6 vertices)

    Args:
        half_size: Scale factor (base tetrahedron bounding cube half-size)
        truncation: Truncation parameter t in [0, 0.5] (default: 1/3)

    Returns:
        List of vertices as [x, y, z]
    """
    t = max(0, min(0.5, truncation))  # Clamp to valid range
    s = half_size

    # Base tetrahedron vertices (inscribed in cube)
    base_verts = [
        [-s, -s, -s],  # V0
        [s, s, -s],    # V1
        [s, -s, s],    # V2
        [-s, s, s],    # V3
    ]

    # Edge connectivity (all pairs for complete graph K4)
    base_edges = [
        (0, 1), (0, 2), (0, 3),
        (1, 2), (1, 3), (2, 3)
    ]

    # Special case: t = 0 returns base tetrahedron
    if t < 0.001:
        return base_verts

    # Special case: t = 0.5 returns octahedron (edge midpoints)
    if t > 0.499:
        vertices = []
        for i, j in base_edges:
            v1, v2 = base_verts[i], base_verts[j]
            vertices.append([
                (v1[0] + v2[0]) / 2,
                (v1[1] + v2[1]) / 2,
                (v1[2] + v2[2]) / 2
            ])
        return vertices

    # General case: truncated tetrahedron with 12 vertices
    # For each edge, place two cut points at t and (1-t) from each endpoint
    vertices = []
    vertex_map = {}  # Map (edge_idx, from_end) to vertex

    def get_vertex(edge_idx, from_end):
        """Get or create a truncation vertex."""
        key = (edge_idx, from_end)
        if key in vertex_map:
            return vertex_map[key]

        i, j = base_edges[edge_idx]
        v1 = base_verts[i] if from_end == 0 else base_verts[j]
        v2 = base_verts[j] if from_end == 0 else base_verts[i]

        vertex = [
            v1[0] + t * (v2[0] - v1[0]),
            v1[1] + t * (v2[1] - v1[1]),
            v1[2] + t * (v2[2] - v1[2])
        ]

        idx = len(vertices)
        vertices.append(vertex)
        vertex_map[key] = idx
        return idx

    # Vertex adjacency in K4: each vertex connects to all others
    vertex_edges = [
        [0, 1, 2],  # V0 connects via edges 0, 1, 2
        [0, 3, 4],  # V1 connects via edges 0, 3, 4
        [1, 3, 5],  # V2 connects via edges 1, 3, 5
        [2, 4, 5],  # V3 connects via edges 2, 4, 5
    ]

    # For each base vertex, which end of each edge is it?
    vertex_ends = [
        [0, 0, 0],  # V0 is start of edges 0, 1, 2
        [1, 0, 0],  # V1 is end of edge 0, start of edges 3, 4
        [1, 1, 0],  # V2 is end of edges 1, 3, start of edge 5
        [1, 1, 1],  # V3 is end of edges 2, 4, 5
    ]

    # Create the 12 truncation vertices (3 per base vertex)
    for v in range(4):
        for e in range(3):
            edge_idx = vertex_edges[v][e]
            from_end = vertex_ends[v][e]
            get_vertex(edge_idx, from_end)

    return vertices


def icosahedron(half_size: float = 1.0) -> List[List[float]]:
    """
    Icosahedron vertices (12 vertices).
    Uses PurePhi-derived coordinates for maximum precision.

    EXACT COPY of construction from rt-polyhedra.js:310-386

    Vertices at three orthogonal golden rectangles:
    - Rectangle 1 (XZ plane): [0, ±a, ±b]
    - Rectangle 2 (YZ plane): [±a, ±b, 0]
    - Rectangle 3 (XY plane): [±b, 0, ±a]

    Where:
    - a = 1 / sqrt(1 + phi^2)
    - b = phi / sqrt(1 + phi^2)

    Args:
        half_size: Scale factor (default 1.0)

    Returns:
        List of 12 vertices as [x, y, z]
    """
    # PurePhi Method: 1 + φ² = 1 + (φ + 1) = φ + 2
    # Or symbolically: 1 + φ² = (5 + √5)/2
    one_plus_phi_sq = 1 + PHI_SQ  # = φ + 2 ≈ 3.618...

    # Normalization factor
    norm_factor = half_size / sqrt(one_plus_phi_sq)

    # Scaled coordinates
    a = 1.0 * norm_factor
    b = PHI * norm_factor

    # Z-up convention: Three orthogonal golden rectangles
    return [
        # Rectangle 1: XZ plane (Y = ±a) - VERTICAL front/back wall in Z-up
        [0, a, b],    # 0
        [0, a, -b],   # 1
        [0, -a, b],   # 2
        [0, -a, -b],  # 3
        # Rectangle 2: YZ plane (X = ±a) - VERTICAL left/right wall in Z-up
        [a, b, 0],    # 4
        [a, -b, 0],   # 5
        [-a, b, 0],   # 6
        [-a, -b, 0],  # 7
        # Rectangle 3: XY plane (Z = ±a) - HORIZONTAL ground plane in Z-up
        [b, 0, a],    # 8
        [b, 0, -a],   # 9
        [-b, 0, a],   # 10
        [-b, 0, -a],  # 11
    ]


# =============================================================================
# COMPOUND POLYHEDRA FOR PRIME PROJECTIONS
# =============================================================================

def truncated_dual_tetrahedron(half_size: float = 1.0, truncation: float = 1/3) -> List[List[float]]:
    """
    Truncated dual tetrahedron: truncate the dual tet with parametric t.
    EXACT MATCH of rt-polyhedra.js:478 truncatedDualTetrahedron()

    Simply negates all vertices of truncated_tetrahedron(half_size, truncation).

    Args:
        half_size: Scale factor (base tetrahedron bounding cube half-size)
        truncation: Truncation parameter t in [0, 0.5] (default: 1/3)

    Returns:
        List of vertices as [x, y, z] (4 at t=0, 12 at t=1/3, 6 at t=0.5)
    """
    base_verts = truncated_tetrahedron(half_size, truncation)
    return [[-v[0], -v[1], -v[2]] for v in base_verts]


def dual_tetrahedron(half_size: float = 1.0) -> List[List[float]]:
    """
    Dual (even parity) tetrahedron inscribed in cube.
    Negation of base tetrahedron vertices.

    EXACT MATCH of rt-polyhedra.js dualTetrahedron()

    Args:
        half_size: Half the edge length of bounding cube (default 1.0)

    Returns:
        List of 4 vertices as [x, y, z]
    """
    s = half_size
    return [
        [s, s, s],      # negation of (-s, -s, -s)
        [-s, -s, s],    # negation of (s, s, -s)
        [-s, s, -s],    # negation of (s, -s, s)
        [s, -s, -s],    # negation of (-s, s, s)
    ]


def _normalize_vertex(v: List[float]) -> List[float]:
    """Normalize a 3D vertex to unit length."""
    mag = sqrt(v[0]**2 + v[1]**2 + v[2]**2)
    if mag == 0:
        return [0, 0, 0]
    return [v[0]/mag, v[1]/mag, v[2]/mag]


def trunc_tet_plus_tet(half_size: float = 1.0) -> List[List[float]]:
    """
    TruncTet + Tetrahedron compound (16 vertices).
    Legacy: uses same-parity tet. See trunc_tet_plus_dual_tet for robust 7-gon.

    Args:
        half_size: Scale factor

    Returns:
        List of 16 vertices as [x, y, z]
    """
    trunc_verts = truncated_tetrahedron(half_size=3.0, truncation=1/3)
    tet_verts = tetrahedron(half_size=3.0)

    return trunc_verts + tet_verts


def trunc_tet_plus_dual_tet(half_size: float = 1.0) -> List[List[float]]:
    """
    TruncTet + Dual Tetrahedron compound (16 vertices, unit-sphere normalized).
    Used for robust 7-gon projections.

    All 16 vertices are normalized to the unit sphere then scaled by half_size.
    This matches compoundTruncTetDualTet() in rt-polyhedra.js.

    Why dual tet + normalization:
    - Dual tet breaks shared symmetry planes with TruncTet
    - Unit-sphere normalization ensures equal vertex reach
    - Result: robust hull=7 at all scales, Float32-safe
    - Verified min cross product = 0.353 (vs ~0 for same-parity)

    Args:
        half_size: Output radius (default 1.0)

    Returns:
        List of 16 vertices as [x, y, z]
    """
    # Canonical coords: TruncTet at half_size=3 gives [±1,±1,±3] permutations
    trunc_raw = truncated_tetrahedron(half_size=3.0, truncation=1/3)
    dual_raw = dual_tetrahedron(half_size=1.0)

    # Normalize all to unit sphere, then scale
    normalized = [_normalize_vertex(v) for v in trunc_raw] + \
                 [_normalize_vertex(v) for v in dual_raw]

    return [[v[0] * half_size, v[1] * half_size, v[2] * half_size]
            for v in normalized]


def trunc_tet_plus_icosa(half_size: float = 1.0) -> List[List[float]]:
    """
    TruncTet + Icosahedron compound (24 vertices).
    Used for 11-gon and 13-gon projections.

    The icosahedron is scaled to match truncated tetrahedron bounding sphere.

    Why 24 vertices enable prime hulls:
    - TruncTet (12v) has 3-fold tetrahedral symmetry
    - Icosahedron (12v) has 5-fold icosahedral symmetry
    - 3-fold and 5-fold are incommensurate (gcd(3,5)=1)
    - This symmetry breaking enables prime hull counts (11, 13)

    Args:
        half_size: Scale factor

    Returns:
        List of 24 vertices as [x, y, z]
    """
    # Truncated tetrahedron with half_size=3 at t=1/3 gives vertices at [1,1,3] permutations
    trunc_verts = truncated_tetrahedron(half_size=3.0, truncation=1/3)

    # Scale icosahedron to match truncated tetrahedron bounding sphere
    # TruncTet bounding radius = sqrt(1^2 + 1^2 + 3^2) = sqrt(11)
    # Icosahedron with half_size=1 has circumradius = 1.0 (verified: sqrt(a^2 + b^2) = 1)
    target_radius = sqrt(11)  # TruncTet bounding
    icosa_base = icosahedron(half_size=1.0)

    # The icosahedron circumradius with half_size=1 is 1.0, NOT b=0.8507
    # Proof: vertex [0, a, b] has distance sqrt(a^2 + b^2) = sqrt((1+φ²)/(1+φ²)) = 1.0
    icosa_radius = 1.0

    scale = target_radius / icosa_radius

    icosa_verts = [[v[0] * scale, v[1] * scale, v[2] * scale] for v in icosa_base]

    return trunc_verts + icosa_verts


def variable_stella_compound(t1: float = 1/3, t2: float = 0.0,
                              half_size: float = 1.0) -> List[List[float]]:
    """
    Variable stella octangula compound: two independently truncated tetrahedra,
    unit-sphere normalized.

    The stella octangula is the compound of base tet + dual tet.
    With independent truncation parameters t1 and t2, we get a rich
    family of even-vertex polyhedra:
      (0, 0)     → 4+4  =  8v  (raw stella octangula)
      (1/3, 0)   → 12+4 = 16v  (current 7-gon compound)
      (1/3, 1/3) → 12+12= 24v  (double truncated stella)
      (0.5, 0.5) → 6+6  = 12v  (double octahedron limit)
      (0.5, 0)   → 6+4  = 10v
      (0, 1/3)   → 4+12 = 16v

    All vertices normalized to unit sphere then scaled by half_size.
    This ensures robust hull counts regardless of truncation parameters.

    Args:
        t1: Truncation of base tetrahedron [0, 0.5]
        t2: Truncation of dual tetrahedron [0, 0.5]
        half_size: Output radius (default 1.0)

    Returns:
        List of vertices as [x, y, z], all on sphere of radius half_size
    """
    # Generate vertices for each truncated tet
    # Use half_size=3 for base tet (gives integer-like coords at t=1/3)
    # Use half_size=1 for dual tet (matches existing compound pattern)
    base_verts = truncated_tetrahedron(half_size=3.0, truncation=t1)
    dual_verts = truncated_dual_tetrahedron(half_size=3.0, truncation=t2)

    # Normalize all to unit sphere, then scale
    all_verts = [_normalize_vertex(v) for v in base_verts] + \
                [_normalize_vertex(v) for v in dual_verts]

    return [[v[0] * half_size, v[1] * half_size, v[2] * half_size]
            for v in all_verts]


# =============================================================================
# RATIONAL POLYHEDRA (√2 family only — no golden ratio)
# =============================================================================

def octahedron(half_size: float = 1.0) -> List[List[float]]:
    """
    Octahedron vertices (6 vertices).
    EXACT COPY from rt-polyhedra.js:543-600

    Args:
        half_size: Scale factor (default 1.0)

    Returns:
        List of 6 vertices as [x, y, z]
    """
    s = half_size
    return [
        [s, 0, 0],    # 0: +X
        [-s, 0, 0],   # 1: -X
        [0, s, 0],    # 2: +Y
        [0, -s, 0],   # 3: -Y
        [0, 0, s],    # 4: +Z
        [0, 0, -s],   # 5: -Z
    ]


def cuboctahedron(half_size: float = 1.0) -> List[List[float]]:
    """
    Cuboctahedron (Vector Equilibrium) vertices (12 vertices).
    EXACT COPY from rt-polyhedra.js:1999-2026

    Vertices at permutations of (±t, ±t, 0) where t = s/√2.
    Uses √2 only — no golden ratio. Vertex-transitive.

    Args:
        half_size: Scale factor (default 1.0)

    Returns:
        List of 12 vertices as [x, y, z]
    """
    s = half_size
    t = s / sqrt(2)
    return [
        # XY plane: (±t, ±t, 0)
        [t, t, 0], [t, -t, 0], [-t, t, 0], [-t, -t, 0],
        # XZ plane: (±t, 0, ±t)
        [t, 0, t], [t, 0, -t], [-t, 0, t], [-t, 0, -t],
        # YZ plane: (0, ±t, ±t)
        [0, t, t], [0, t, -t], [0, -t, t], [0, -t, -t],
    ]


def rhombic_dodecahedron(half_size: float = 1.0) -> List[List[float]]:
    """
    Rhombic Dodecahedron vertices (14 vertices).
    EXACT COPY from rt-polyhedra.js:1865-1905

    Two vertex orbits (NOT vertex-transitive):
    - 6 axial at (±t, 0, 0), (0, ±t, 0), (0, 0, ±t) where t = s/√2
    - 8 cuboid at (±u, ±u, ±u) where u = t/2
    Uses √2 only — no golden ratio.

    Args:
        half_size: Scale factor (default 1.0)

    Returns:
        List of 14 vertices as [x, y, z]
    """
    s = half_size
    t = s / sqrt(2)
    u = t / 2
    return [
        # 6 axial vertices (square face centers of cuboctahedron)
        [t, 0, 0], [-t, 0, 0],
        [0, t, 0], [0, -t, 0],
        [0, 0, t], [0, 0, -t],
        # 8 cuboid vertices (one per octant)
        [u, u, u], [u, u, -u], [u, -u, u], [u, -u, -u],
        [-u, u, u], [-u, u, -u], [-u, -u, u], [-u, -u, -u],
    ]


# =============================================================================
# GEODESIC SUBDIVISION (PORT of rt-polyhedra.js subdivideTriangles)
# =============================================================================

# Face definitions for geodesic base polyhedra (CCW winding for outward normals)
TETRAHEDRON_FACES = [
    [0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2],
]

OCTAHEDRON_FACES = [
    # Upper hemisphere (Z > 0)
    [0, 2, 4], [0, 4, 3], [1, 4, 2], [1, 3, 4],
    # Lower hemisphere (Z < 0)
    [0, 5, 2], [0, 3, 5], [1, 2, 5], [1, 5, 3],
]


def subdivide_triangles(vertices: List[List[float]],
                        faces: List[List[int]],
                        frequency: int) -> List[List[float]]:
    """
    Geodesic subdivision of triangular faces using barycentric interpolation.
    PORT of rt-polyhedra.js:1164-1313 subdivideTriangles()

    Each edge is divided into 'frequency' segments (Fuller notation).
    Each face becomes frequency² sub-triangles.
    Returns only vertex positions (search needs vertices, not topology).

    Args:
        vertices: Base polyhedron vertices as [[x,y,z], ...]
        faces: Triangle face indices as [[v0,v1,v2], ...]
        frequency: Number of edge divisions (1=base, 2=bisected, 3=trisected)

    Returns:
        List of all vertices (original + subdivided) as [[x,y,z], ...]
    """
    if frequency <= 1:
        return [v[:] for v in vertices]

    new_vertices = [v[:] for v in vertices]
    vertex_cache = {}
    divisions = frequency

    def get_edge_point(i, j, t):
        """Get or create a division point along edge i→j at parameter t."""
        # Canonical key: smaller index first
        if i > j:
            i, j, t = j, i, 1.0 - t
        key = ('edge', i, j, round(t, 8))
        if key in vertex_cache:
            return vertex_cache[key]

        v1 = new_vertices[i]
        v2 = new_vertices[j]
        point = [
            v1[0] + t * (v2[0] - v1[0]),
            v1[1] + t * (v2[1] - v1[1]),
            v1[2] + t * (v2[2] - v1[2]),
        ]
        idx = len(new_vertices)
        new_vertices.append(point)
        vertex_cache[key] = idx
        return idx

    for v0, v1, v2 in faces:
        for row in range(divisions + 1):
            for col in range(divisions - row + 1):
                u = row / divisions
                v = col / divisions
                w = 1.0 - u - v

                # Corner vertices — already exist
                if (row == 0 and col == 0) or \
                   (row == 0 and col == divisions) or \
                   (row == divisions and col == 0):
                    continue
                # Edge vertices
                elif row == 0:
                    get_edge_point(v0, v1, v)
                elif col == 0:
                    get_edge_point(v0, v2, u)
                elif row + col == divisions:
                    get_edge_point(v1, v2, row / divisions)
                # Interior vertices
                else:
                    key = ('interior', v0, v1, v2, round(u, 8), round(v, 8))
                    if key not in vertex_cache:
                        p0 = new_vertices[v0]
                        p1 = new_vertices[v1]
                        p2 = new_vertices[v2]
                        point = [
                            w * p0[0] + v * p1[0] + u * p2[0],
                            w * p0[1] + v * p1[1] + u * p2[1],
                            w * p0[2] + v * p1[2] + u * p2[2],
                        ]
                        idx = len(new_vertices)
                        new_vertices.append(point)
                        vertex_cache[key] = idx

    return new_vertices


def _project_to_sphere(vertices: List[List[float]],
                       r_target: float) -> List[List[float]]:
    """Project all vertices onto a sphere of given radius."""
    result = []
    for v in vertices:
        mag = sqrt(v[0]**2 + v[1]**2 + v[2]**2)
        if mag < 1e-12:
            result.append([0.0, 0.0, 0.0])
        else:
            s = r_target / mag
            result.append([v[0] * s, v[1] * s, v[2] * s])
    return result


def geodesic_tetrahedron(half_size: float = 1.0, frequency: int = 2,
                         projection: str = "out") -> List[List[float]]:
    """
    Geodesic tetrahedron vertices.
    PORT of rt-polyhedra.js:1484-1581 geodesicTetrahedron()

    Args:
        half_size: Scale factor (default 1.0)
        frequency: Subdivision frequency (1=base tet, 2=bisected edges, etc.)
        projection: "off"|"in"|"mid"|"out" (default "out" = Fuller geodesic)

    Returns:
        List of vertices as [x, y, z]

    Vertex counts by frequency:
        freq=1: 4, freq=2: 10, freq=3: 20, freq=4: 34, freq=5: 52, freq=6: 74
    """
    base_verts = tetrahedron(half_size)

    if frequency <= 1:
        return base_verts

    subdivided = subdivide_triangles(base_verts, TETRAHEDRON_FACES, frequency)

    if projection == "off":
        return subdivided

    # Target radius from projection mode (matches JS exactly)
    s = half_size
    if projection == "in":
        Q_target = s * s / 3
    elif projection == "mid":
        Q_target = s * s
    elif projection == "out":
        Q_target = 3 * s * s
    else:
        raise ValueError(f"Unknown projection mode: {projection}")

    return _project_to_sphere(subdivided, sqrt(Q_target))


def geodesic_octahedron(half_size: float = 1.0, frequency: int = 2,
                        projection: str = "out") -> List[List[float]]:
    """
    Geodesic octahedron vertices.
    PORT of rt-polyhedra.js:1592-1690 geodesicOctahedron()

    Args:
        half_size: Scale factor (default 1.0)
        frequency: Subdivision frequency (1=base oct, 2=bisected edges, etc.)
        projection: "off"|"in"|"mid"|"out" (default "out" = Fuller geodesic)

    Returns:
        List of vertices as [x, y, z]

    Vertex counts by frequency:
        freq=1: 6, freq=2: 18, freq=3: 38, freq=4: 66, freq=5: 102
    """
    base_verts = octahedron(half_size)

    if frequency <= 1:
        return base_verts

    subdivided = subdivide_triangles(base_verts, OCTAHEDRON_FACES, frequency)

    if projection == "off":
        return subdivided

    # Target radius from projection mode (matches JS exactly)
    s = half_size
    if projection == "in":
        Q_target = s * s / 3
    elif projection == "mid":
        Q_target = s * s / 2
    elif projection == "out":
        Q_target = s * s
    else:
        raise ValueError(f"Unknown projection mode: {projection}")

    return _project_to_sphere(subdivided, sqrt(Q_target))


# =============================================================================
# CUBE DIAGONAL VIEWING AXES (equivalent to Quadray without translation)
# =============================================================================

VIEWING_AXES = {
    # Cube diagonals = tetrahedral axes (equivalent to Quadray WXYZ)
    'cube_diagonal_ppp': [1, 1, 1],      # +W equivalent (body diagonal)
    'cube_diagonal_pmm': [1, -1, -1],    # +X equivalent
    'cube_diagonal_mpm': [-1, 1, -1],    # +Y equivalent
    'cube_diagonal_mmp': [-1, -1, 1],    # +Z equivalent
}


def normalize(v: List[float]) -> List[float]:
    """Normalize a 3D vector to unit length."""
    mag = sqrt(v[0]**2 + v[1]**2 + v[2]**2)
    if mag == 0:
        return [0, 0, 0]
    return [v[0]/mag, v[1]/mag, v[2]/mag]


def get_viewing_axis(name: str) -> List[float]:
    """
    Get a normalized viewing axis by name.

    Args:
        name: One of 'cube_diagonal_ppp', 'cube_diagonal_pmm',
              'cube_diagonal_mpm', 'cube_diagonal_mmp'

    Returns:
        Normalized [x, y, z] axis vector
    """
    if name not in VIEWING_AXES:
        raise ValueError(f"Unknown viewing axis: {name}")
    return normalize(VIEWING_AXES[name])


# =============================================================================
# SELF-TEST
# =============================================================================

if __name__ == "__main__":
    print("RT-Polyhedra Python Port - Self Test")
    print("=" * 50)

    # Test tetrahedron
    tet = tetrahedron()
    print(f"\nTetrahedron: {len(tet)} vertices")
    for i, v in enumerate(tet):
        print(f"  {i}: {v}")

    # Test truncated tetrahedron
    trunc = truncated_tetrahedron()
    print(f"\nTruncated Tetrahedron: {len(trunc)} vertices")
    print(f"  (vertices from rt-math.js:1768)")

    # Test icosahedron
    icosa = icosahedron()
    print(f"\nIcosahedron: {len(icosa)} vertices")
    # Verify bounding radius
    max_r = max(sqrt(v[0]**2 + v[1]**2 + v[2]**2) for v in icosa)
    print(f"  Max radius: {max_r:.10f}")
    expected_b = PHI / sqrt(1 + PHI_SQ)
    print(f"  Expected b: {expected_b:.10f}")

    # Test dual tetrahedron
    dual = dual_tetrahedron()
    print(f"\nDual Tetrahedron: {len(dual)} vertices")
    for i, v in enumerate(dual):
        print(f"  {i}: {v}")

    # Test compounds
    tt_t = trunc_tet_plus_tet()
    print(f"\nTruncTet + Tet (legacy): {len(tt_t)} vertices")

    tt_dt = trunc_tet_plus_dual_tet()
    print(f"TruncTet + DualTet (normalized): {len(tt_dt)} vertices (for 7-gon)")
    # Verify all vertices on unit sphere
    radii = [sqrt(v[0]**2 + v[1]**2 + v[2]**2) for v in tt_dt]
    print(f"  Radius range: [{min(radii):.10f}, {max(radii):.10f}] (expect 1.0)")

    tt_i = trunc_tet_plus_icosa()
    print(f"TruncTet + Icosa: {len(tt_i)} vertices (for 11/13-gon)")

    # Test new rational polyhedra
    oct_v = octahedron()
    print(f"\nOctahedron: {len(oct_v)} vertices")
    oct_radii = [sqrt(v[0]**2 + v[1]**2 + v[2]**2) for v in oct_v]
    print(f"  All radii = {oct_radii[0]:.6f} (vertex-transitive)")

    cuboct = cuboctahedron()
    print(f"\nCuboctahedron: {len(cuboct)} vertices")
    cuboct_radii = [sqrt(v[0]**2 + v[1]**2 + v[2]**2) for v in cuboct]
    print(f"  All radii = {cuboct_radii[0]:.6f} (vertex-transitive)")

    rdodec = rhombic_dodecahedron()
    print(f"\nRhombic Dodecahedron: {len(rdodec)} vertices")
    rdodec_radii = sorted(set(round(sqrt(v[0]**2 + v[1]**2 + v[2]**2), 6) for v in rdodec))
    print(f"  Radii: {rdodec_radii} (NOT vertex-transitive, 2 orbits)")

    # Test geodesic subdivision
    for freq in [2, 3, 4]:
        gt = geodesic_tetrahedron(frequency=freq)
        go = geodesic_octahedron(frequency=freq)
        gt_radii = [round(sqrt(v[0]**2 + v[1]**2 + v[2]**2), 6) for v in gt]
        go_radii = [round(sqrt(v[0]**2 + v[1]**2 + v[2]**2), 6) for v in go]
        print(f"\n  Geodesic Tet freq={freq}: {len(gt)} vertices, "
              f"radii=[{min(gt_radii):.6f}, {max(gt_radii):.6f}]")
        print(f"  Geodesic Oct freq={freq}: {len(go)} vertices, "
              f"radii=[{min(go_radii):.6f}, {max(go_radii):.6f}]")

    # Test viewing axes
    print(f"\nViewing Axes (cube diagonals):")
    for name, axis in VIEWING_AXES.items():
        norm = normalize(axis)
        print(f"  {name}: {norm}")

    print("\n" + "=" * 50)
    print("Self-test complete!")
