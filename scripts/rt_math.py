"""
rt_math.py
Rational Trigonometry Library for Python - Direct Port from modules/rt-math.js

Uses quadrance (Q = distance²) and spread (s) instead of distance and angle.
Maintains exact algebraic relationships by using identities rather than floating-point operations.

Benefits:
- No square roots needed for Q (exact calculations)
- No transcendental functions (sin, cos, atan)
- Algebraic identities remain exact
- Identical results to JavaScript rt-math.js
"""

from math import sqrt
from typing import Tuple, List

# =============================================================================
# PURE PHI - High-precision golden ratio algebra (from RT.PurePhi)
# =============================================================================

# Cached sqrt(5) for maximum precision throughout all calculations
SQRT5 = sqrt(5)  # ≈ 2.2360679774997896964091736687312762

# φ = (1 + √5)/2 - Golden ratio
PHI = 0.5 * (1 + SQRT5)  # ≈ 1.6180339887498948

# φ² = φ + 1 (EXACT algebraic identity, NOT φ * φ)
# This preserves algebraic relationships
PHI_SQ = PHI + 1  # ≈ 2.618033988749895

# 1/φ = φ - 1 (EXACT algebraic identity, NOT 1 / φ)
# This avoids division precision loss
INV_PHI = PHI - 1  # ≈ 0.618033988749895

# φ³ = 2φ + 1 (derived from φ² = φ + 1)
PHI_CUBED = 2 * PHI + 1  # ≈ 4.236067977499790

# φ⁴ = 3φ + 2 (derived from φ² = φ + 1)
PHI_FOURTH = 3 * PHI + 2  # ≈ 6.854101966249685


# =============================================================================
# CORE RT FUNCTIONS (from RT namespace)
# =============================================================================

def quadrance(p1: List[float], p2: List[float]) -> float:
    """
    Quadrance (Q = distance²) - Wildberger's alternative to distance.
    Avoids sqrt, keeps calculations exact.

    Args:
        p1: Point [x, y, z]
        p2: Point [x, y, z]

    Returns:
        Quadrance (distance squared)

    Example:
        >>> quadrance([0, 0, 0], [1, 1, 1])
        3  # Not √3!
    """
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    dz = p2[2] - p1[2]
    return dx * dx + dy * dy + dz * dz


def spread(v1: List[float], v2: List[float]) -> float:
    """
    Spread (s) - Wildberger's version of angle.
    Measures "perpendicularity" between two vectors.

    Formula: s = 1 - (v1·v2)² / (|v1|²|v2|²)

    Key values:
    - s = 0: vectors parallel (0°)
    - s = 0.5: 45° angle (tetrahedral geometry)
    - s = 1: vectors perpendicular (90°)

    Args:
        v1: Vector [x, y, z]
        v2: Vector [x, y, z]

    Returns:
        Spread (0 to 1)

    Example:
        >>> spread([1, 0, 0], [0, 1, 0])
        1  # Perpendicular
    """
    dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]
    q1 = v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]
    q2 = v2[0] * v2[0] + v2[1] * v2[1] + v2[2] * v2[2]

    if q1 == 0 or q2 == 0:
        return 0  # Handle zero vectors

    return 1 - (dot * dot) / (q1 * q2)


def spread_to_sin_cos(s: float) -> Tuple[float, float]:
    """
    Convert spread to sin/cos values.

    Since spread s = sin²(θ), we have:
    - sin(θ) = √s
    - cos(θ) = √(1-s)

    Args:
        s: Spread value (0 to 1)

    Returns:
        Tuple of (sin_theta, cos_theta)

    Example:
        >>> spread_to_sin_cos(0.5)
        (0.7071..., 0.7071...)  # 45°
    """
    # Clamp to valid range to avoid sqrt of negative
    s = max(0.0, min(1.0, s))
    sin_theta = sqrt(s)
    cos_theta = sqrt(1 - s)
    return sin_theta, cos_theta


def circle_param(t: float) -> Tuple[float, float]:
    """
    Rational Circle Parameterization - Wildberger's alternative to sin/cos.
    Generates points on unit circle using only rational operations.

    Formula: Circle(t) = ((1 - t²) / (1 + t²), 2t / (1 + t²))

    Based on Weierstrass substitution where t = tan(θ/2).

    Args:
        t: Angle parameter (any real number, NOT spread)

    Returns:
        Tuple of (x, y) on unit circle

    Example:
        >>> circle_param(1)
        (0, 1)  # Top of circle (90°)
    """
    t_squared = t * t
    denominator = 1 + t_squared
    x = (1 - t_squared) / denominator
    y = (2 * t) / denominator
    return x, y


def spread_to_param(s: float) -> float:
    """
    Convert spread to angle parameter 't' for rational circle parameterization.

    WARNING: This requires solving a quartic and uses sqrt.
    For RT-pure calculations, work directly with 't' parameter instead.

    Args:
        s: Spread value (0 to 1)

    Returns:
        Parameter 't' (positive solution)
    """
    if s <= 0:
        return 0
    if s >= 1:
        return 1

    # From spread = 4t² / (1 + t²)²
    # Solve quadratic in u = t²
    a = s
    b = 2 * s - 4
    c = s
    discriminant = b * b - 4 * a * c

    if discriminant < 0:
        return 0  # Should not happen for valid spreads

    u = (-b + sqrt(discriminant)) / (2 * a)
    return sqrt(u)


# =============================================================================
# ROTATION MATRIX FROM SPREADS (ZYX Euler convention)
# =============================================================================

def rotation_matrix_from_spreads(s1: float, s2: float, s3: float) -> List[List[float]]:
    """
    Create a 3x3 rotation matrix from three spread values.
    Uses ZYX Euler angle convention (matching rt-projections.js).

    Args:
        s1: First rotation spread (about Z axis)
        s2: Second rotation spread (about Y axis)
        s3: Third rotation spread (about X axis)

    Returns:
        3x3 rotation matrix as nested list
    """
    # Convert spreads to sin/cos
    sin1, cos1 = spread_to_sin_cos(s1)
    sin2, cos2 = spread_to_sin_cos(s2)
    sin3, cos3 = spread_to_sin_cos(s3)

    # ZYX Euler rotation matrix
    # R = Rz(θ1) * Ry(θ2) * Rx(θ3)
    return [
        [
            cos1 * cos2,
            cos1 * sin2 * sin3 - sin1 * cos3,
            cos1 * sin2 * cos3 + sin1 * sin3
        ],
        [
            sin1 * cos2,
            sin1 * sin2 * sin3 + cos1 * cos3,
            sin1 * sin2 * cos3 - cos1 * sin3
        ],
        [
            -sin2,
            cos2 * sin3,
            cos2 * cos3
        ]
    ]


def apply_rotation(vertex: List[float], matrix: List[List[float]]) -> List[float]:
    """
    Apply a rotation matrix to a 3D vertex.

    Args:
        vertex: [x, y, z] coordinates
        matrix: 3x3 rotation matrix

    Returns:
        Rotated [x, y, z] coordinates
    """
    x = matrix[0][0] * vertex[0] + matrix[0][1] * vertex[1] + matrix[0][2] * vertex[2]
    y = matrix[1][0] * vertex[0] + matrix[1][1] * vertex[1] + matrix[1][2] * vertex[2]
    z = matrix[2][0] * vertex[0] + matrix[2][1] * vertex[1] + matrix[2][2] * vertex[2]
    return [x, y, z]


def project_to_2d(vertex: List[float]) -> Tuple[float, float]:
    """
    Project a 3D vertex onto the XY plane (orthographic projection).

    Args:
        vertex: [x, y, z] coordinates

    Returns:
        (x, y) 2D coordinates
    """
    return vertex[0], vertex[1]


# =============================================================================
# CONVEX HULL FOR POLYGON COUNTING
# =============================================================================

def convex_hull_2d(points: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
    """
    Compute the 2D convex hull of a set of points using Graham scan.

    Args:
        points: List of (x, y) tuples

    Returns:
        List of (x, y) tuples forming the convex hull in CCW order
    """
    if len(points) < 3:
        return points

    # Remove duplicates (within tolerance)
    unique = []
    tolerance = 1e-10
    for p in points:
        is_dup = False
        for q in unique:
            if abs(p[0] - q[0]) < tolerance and abs(p[1] - q[1]) < tolerance:
                is_dup = True
                break
        if not is_dup:
            unique.append(p)

    if len(unique) < 3:
        return unique

    # Find starting point (lowest y, then leftmost x)
    start = min(unique, key=lambda p: (p[1], p[0]))

    # Sort by polar angle from start
    def angle_key(p):
        if p == start:
            return (-float('inf'), 0)
        dx = p[0] - start[0]
        dy = p[1] - start[1]
        # Use atan2 for angle (we're not being RT-pure here, but hull counting
        # doesn't need to be algebraically exact)
        from math import atan2
        return (atan2(dy, dx), dx*dx + dy*dy)

    sorted_points = sorted(unique, key=angle_key)

    # Graham scan
    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    hull = []
    for p in sorted_points:
        while len(hull) >= 2 and cross(hull[-2], hull[-1], p) <= 0:
            hull.pop()
        hull.append(p)

    return hull


def count_hull_vertices(vertices_3d: List[List[float]],
                        s1: float, s2: float, s3: float) -> int:
    """
    Count the number of vertices on the convex hull of a projected polyhedron.

    Args:
        vertices_3d: List of [x, y, z] vertices
        s1, s2, s3: Rotation spreads

    Returns:
        Number of vertices on the 2D convex hull
    """
    # Apply rotation
    matrix = rotation_matrix_from_spreads(s1, s2, s3)
    rotated = [apply_rotation(v, matrix) for v in vertices_3d]

    # Project to 2D
    points_2d = [project_to_2d(v) for v in rotated]

    # Compute hull
    hull = convex_hull_2d(points_2d)

    return len(hull)


# =============================================================================
# SELF-TEST
# =============================================================================

if __name__ == "__main__":
    print("RT-Math Python Port - Self Test")
    print("=" * 50)

    # Test phi identities
    print(f"\nGolden Ratio Constants:")
    print(f"  PHI = {PHI:.15f}")
    print(f"  PHI_SQ = {PHI_SQ:.15f} (via identity φ+1)")
    print(f"  INV_PHI = {INV_PHI:.15f} (via identity φ-1)")

    # Verify identities
    phi_sq_mult = PHI * PHI
    inv_phi_div = 1 / PHI
    print(f"\nIdentity Verification:")
    print(f"  |φ² - (φ+1)| = {abs(phi_sq_mult - PHI_SQ):.2e}")
    print(f"  |1/φ - (φ-1)| = {abs(inv_phi_div - INV_PHI):.2e}")

    # Test quadrance
    print(f"\nQuadrance Test:")
    q = quadrance([0, 0, 0], [1, 1, 1])
    print(f"  Q([0,0,0], [1,1,1]) = {q} (expected 3)")

    # Test spread
    print(f"\nSpread Test:")
    s = spread([1, 0, 0], [0, 1, 0])
    print(f"  spread([1,0,0], [0,1,0]) = {s} (expected 1.0)")

    s45 = spread([1, 0, 0], [1, 1, 0])
    print(f"  spread([1,0,0], [1,1,0]) = {s45:.6f} (expected 0.5)")

    print("\n" + "=" * 50)
    print("Self-test complete!")
