#!/usr/bin/env python3
"""
Prime Projection Search Script
==============================

Searches for rational-spread viewing angles where 3D/4D polyhedra project
to 2D with prime vertex counts. Based on the 4D± Prime Projection Conjecture.

Theory: Prime n-gons (7, 11, 13...) might exist as rational-spread projections
from higher-dimensional polytope structures, similar to how Penrose tilings
emerge from 5D projections.

Usage:
    python prime_projection_search.py [--polyhedra tetrahedron,cube] [--precision 4]

Output:
    results/prime_projections_YYYYMMDD_HHMMSS.json
"""

import numpy as np
from scipy.spatial import ConvexHull
from multiprocessing import Pool, cpu_count
from itertools import product
import json
import argparse
from datetime import datetime
from pathlib import Path
import sys

# Golden ratio - fundamental to many RT constructions
PHI = (1 + np.sqrt(5)) / 2
PHI_INV = 1 / PHI

# ============================================================================
# POLYHEDRA DEFINITIONS (ported from rt-polyhedra.js)
# ============================================================================

def get_tetrahedron_vertices():
    """Regular tetrahedron inscribed in unit sphere."""
    return np.array([
        [1, 1, 1],
        [1, -1, -1],
        [-1, 1, -1],
        [-1, -1, 1]
    ]) / np.sqrt(3)

def get_cube_vertices():
    """Unit cube centered at origin."""
    return np.array([
        [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
        [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]
    ]) / np.sqrt(3)

def get_octahedron_vertices():
    """Regular octahedron inscribed in unit sphere."""
    return np.array([
        [1, 0, 0], [-1, 0, 0],
        [0, 1, 0], [0, -1, 0],
        [0, 0, 1], [0, 0, -1]
    ])

def get_icosahedron_vertices():
    """Regular icosahedron using golden ratio."""
    verts = []
    # Rectangle in XY plane
    for s1 in [-1, 1]:
        for s2 in [-1, 1]:
            verts.append([0, s1 * PHI_INV, s2 * PHI])
    # Rectangle in YZ plane
    for s1 in [-1, 1]:
        for s2 in [-1, 1]:
            verts.append([s1 * PHI_INV, s2 * PHI, 0])
    # Rectangle in XZ plane
    for s1 in [-1, 1]:
        for s2 in [-1, 1]:
            verts.append([s1 * PHI, 0, s2 * PHI_INV])
    return np.array(verts) / np.sqrt(1 + PHI**2)

def get_dodecahedron_vertices():
    """Regular dodecahedron using golden ratio."""
    verts = []
    # Cube vertices
    for s1 in [-1, 1]:
        for s2 in [-1, 1]:
            for s3 in [-1, 1]:
                verts.append([s1, s2, s3])
    # Rectangle vertices (3 orientations)
    for s1 in [-1, 1]:
        for s2 in [-1, 1]:
            verts.append([0, s1 * PHI_INV, s2 * PHI])
            verts.append([s1 * PHI_INV, s2 * PHI, 0])
            verts.append([s1 * PHI, 0, s2 * PHI_INV])
    scale = np.sqrt(3)
    return np.array(verts) / scale

def get_cuboctahedron_vertices():
    """Cuboctahedron - Archimedean solid."""
    verts = []
    for s1 in [-1, 1]:
        for s2 in [-1, 1]:
            verts.append([s1, s2, 0])
            verts.append([s1, 0, s2])
            verts.append([0, s1, s2])
    return np.array(verts) / np.sqrt(2)

def get_vector_equilibrium_vertices():
    """Vector Equilibrium (cuboctahedron) - Fuller's VE."""
    return get_cuboctahedron_vertices()

# 4D Polytopes (projected to 3D first, then to 2D)

def get_tesseract_vertices():
    """4D hypercube (tesseract) vertices."""
    verts = []
    for w in [-1, 1]:
        for x in [-1, 1]:
            for y in [-1, 1]:
                for z in [-1, 1]:
                    verts.append([w, x, y, z])
    return np.array(verts) / 2

def get_16cell_vertices():
    """4D 16-cell (hyperoctahedron) vertices."""
    verts = []
    for i in range(4):
        for s in [-1, 1]:
            v = [0, 0, 0, 0]
            v[i] = s
            verts.append(v)
    return np.array(verts)

def get_24cell_vertices():
    """4D 24-cell vertices - unique to 4D."""
    verts = []
    # 16 vertices from tesseract subset
    for s1 in [-1, 1]:
        for s2 in [-1, 1]:
            for s3 in [-1, 1]:
                for s4 in [-1, 1]:
                    if s1 * s2 * s3 * s4 == 1:
                        verts.append([s1/2, s2/2, s3/2, s4/2])
    # 8 vertices from 16-cell
    for i in range(4):
        for s in [-1, 1]:
            v = [0, 0, 0, 0]
            v[i] = s
            verts.append(v)
    return np.array(verts)

def get_120cell_vertices():
    """4D 120-cell vertices (subset for computational feasibility)."""
    # Full 120-cell has 600 vertices - use symmetry generators
    verts = []
    phi = PHI
    phi_inv = PHI_INV

    # Even permutations of (0, 0, ±2, ±2)
    base = [[0, 0, 2, 2], [0, 2, 0, 2], [0, 2, 2, 0],
            [2, 0, 0, 2], [2, 0, 2, 0], [2, 2, 0, 0]]
    for b in base:
        for s1 in [-1, 1]:
            for s2 in [-1, 1]:
                for s3 in [-1, 1]:
                    for s4 in [-1, 1]:
                        verts.append([s1*b[0], s2*b[1], s3*b[2], s4*b[3]])

    # Even permutations of (1, 1, 1, √5)
    sqrt5 = np.sqrt(5)
    base2 = [[1, 1, 1, sqrt5], [1, 1, sqrt5, 1], [1, sqrt5, 1, 1], [sqrt5, 1, 1, 1]]
    for b in base2:
        for s1 in [-1, 1]:
            for s2 in [-1, 1]:
                for s3 in [-1, 1]:
                    for s4 in [-1, 1]:
                        verts.append([s1*b[0], s2*b[1], s3*b[2], s4*b[3]])

    # Golden ratio based vertices
    for s1 in [-1, 1]:
        for s2 in [-1, 1]:
            for s3 in [-1, 1]:
                for s4 in [-1, 1]:
                    verts.append([s1*phi*phi, s2*phi_inv, s3*phi_inv, s4*phi_inv])
                    verts.append([s1*phi_inv, s2*phi*phi, s3*phi_inv, s4*phi_inv])
                    verts.append([s1*phi_inv, s2*phi_inv, s3*phi*phi, s4*phi_inv])
                    verts.append([s1*phi_inv, s2*phi_inv, s3*phi_inv, s4*phi*phi])

    # Remove duplicates and normalize
    verts = np.array(verts)
    verts = np.unique(np.round(verts, 10), axis=0)
    return verts / np.max(np.linalg.norm(verts, axis=1))

def get_600cell_vertices():
    """4D 600-cell vertices."""
    verts = []
    phi = PHI
    phi_inv = PHI_INV

    # 8 vertices: all permutations of (±1, 0, 0, 0)
    for i in range(4):
        for s in [-1, 1]:
            v = [0, 0, 0, 0]
            v[i] = s
            verts.append(v)

    # 16 vertices: (±1/2, ±1/2, ±1/2, ±1/2)
    for s1 in [-1, 1]:
        for s2 in [-1, 1]:
            for s3 in [-1, 1]:
                for s4 in [-1, 1]:
                    verts.append([s1/2, s2/2, s3/2, s4/2])

    # 96 vertices: even permutations of (±φ/2, ±1/2, ±1/(2φ), 0)
    coords = [phi/2, 0.5, phi_inv/2, 0]
    from itertools import permutations
    for perm in set(permutations([0, 1, 2, 3])):
        for s1 in [-1, 1]:
            for s2 in [-1, 1]:
                for s3 in [-1, 1]:
                    for s4 in [-1, 1]:
                        v = [s1*coords[perm[0]], s2*coords[perm[1]],
                             s3*coords[perm[2]], s4*coords[perm[3]]]
                        verts.append(v)

    # Remove duplicates and normalize
    verts = np.array(verts)
    verts = np.unique(np.round(verts, 10), axis=0)
    return verts / np.max(np.linalg.norm(verts, axis=1))

POLYHEDRA = {
    # 3D Polyhedra
    'tetrahedron': (get_tetrahedron_vertices, 3),
    'cube': (get_cube_vertices, 3),
    'octahedron': (get_octahedron_vertices, 3),
    'icosahedron': (get_icosahedron_vertices, 3),
    'dodecahedron': (get_dodecahedron_vertices, 3),
    'cuboctahedron': (get_cuboctahedron_vertices, 3),
    'vector_equilibrium': (get_vector_equilibrium_vertices, 3),
    # 4D Polytopes
    'tesseract': (get_tesseract_vertices, 4),
    '16cell': (get_16cell_vertices, 4),
    '24cell': (get_24cell_vertices, 4),
    '120cell': (get_120cell_vertices, 4),
    '600cell': (get_600cell_vertices, 4),
}

# ============================================================================
# COMPOUND POLYHEDRA (Symmetry-Breaking Combinations)
# ============================================================================

def get_stella_octangula_vertices():
    """Stella Octangula - compound of two tetrahedra (dual pair).

    This is tetrahedron + its dual (inverted tetrahedron).
    The 8 vertices form a cube, but the compound breaks central symmetry!
    Projects to hexagon in standard view, but other angles may yield primes.
    """
    tet1 = get_tetrahedron_vertices()
    tet2 = -tet1  # Dual tetrahedron (inverted)
    return np.vstack([tet1, tet2])

def get_compound_5_tetrahedra_vertices():
    """Compound of 5 tetrahedra - 20 vertices with chiral symmetry.

    Each tetrahedron is rotated by 72° (golden angle) around icosahedral axes.
    This compound has NO central symmetry - promising for prime projections!
    """
    base_tet = get_tetrahedron_vertices()

    # 5 rotations at 72° intervals around the axis (1, φ, 0)
    # Using golden ratio rotations
    all_verts = []
    for k in range(5):
        angle = k * 2 * np.pi / 5  # 72° increments
        # Rotation around (1, φ, 0) axis
        axis = np.array([1, PHI, 0])
        axis = axis / np.linalg.norm(axis)

        # Rodrigues rotation formula
        cos_a, sin_a = np.cos(angle), np.sin(angle)
        K = np.array([
            [0, -axis[2], axis[1]],
            [axis[2], 0, -axis[0]],
            [-axis[1], axis[0], 0]
        ])
        R = np.eye(3) + sin_a * K + (1 - cos_a) * (K @ K)

        rotated = base_tet @ R.T
        all_verts.append(rotated)

    return np.vstack(all_verts)

def get_compound_cube_octahedron_vertices():
    """Compound of cube and octahedron (dual pair).

    14 vertices total. The cube (8v) and octahedron (6v) share the same
    symmetry axes but different vertex positions.
    """
    cube = get_cube_vertices()
    octa = get_octahedron_vertices()
    return np.vstack([cube, octa])

def get_compound_icosa_dodeca_vertices():
    """Compound of icosahedron and dodecahedron (dual pair).

    32 vertices total (12 + 20). Rich φ-based structure.
    """
    icosa = get_icosahedron_vertices()
    dodeca = get_dodecahedron_vertices()
    return np.vstack([icosa, dodeca])

def get_truncated_tetrahedron_vertices():
    """Truncated tetrahedron - Archimedean solid, NO central symmetry!

    12 vertices. One of the few convex polyhedra without inversion symmetry.
    This is a key candidate for prime projections.
    """
    # Truncated tetrahedron vertices (normalized)
    # Vertices are at all permutations of (±3, ±1, ±1) with even parity
    verts = []
    coords = [3, 1, 1]
    from itertools import permutations
    for perm in permutations(coords):
        for s1 in [-1, 1]:
            for s2 in [-1, 1]:
                for s3 in [-1, 1]:
                    # Even parity: product of signs = +1
                    if s1 * s2 * s3 == 1:
                        verts.append([s1 * perm[0], s2 * perm[1], s3 * perm[2]])

    verts = np.array(verts)
    verts = np.unique(np.round(verts, 10), axis=0)
    return verts / np.linalg.norm(verts[0])

def get_snub_cube_vertices():
    """Snub cube - chiral Archimedean solid, NO central symmetry!

    24 vertices. Exists in left and right-handed forms.
    Excellent candidate for prime projections.
    """
    # Tribonacci constant (real root of x³ - x² - x - 1 = 0)
    # ξ ≈ 1.8393
    xi = 1.8392867552141612

    verts = []
    # Even permutations of (±1, ±ξ, ±1/ξ)
    coords_base = [[1, xi, 1/xi], [xi, 1/xi, 1], [1/xi, 1, xi]]

    for coords in coords_base:
        for s1 in [-1, 1]:
            for s2 in [-1, 1]:
                for s3 in [-1, 1]:
                    verts.append([s1 * coords[0], s2 * coords[1], s3 * coords[2]])

    verts = np.array(verts)
    verts = np.unique(np.round(verts, 10), axis=0)
    return verts / np.max(np.linalg.norm(verts, axis=1))

# Compound polyhedra registry
COMPOUNDS = {
    'stella_octangula': (get_stella_octangula_vertices, 3),
    'compound_5_tet': (get_compound_5_tetrahedra_vertices, 3),
    'compound_cube_octa': (get_compound_cube_octahedron_vertices, 3),
    'compound_icosa_dodeca': (get_compound_icosa_dodeca_vertices, 3),
    'truncated_tetrahedron': (get_truncated_tetrahedron_vertices, 3),
    'snub_cube': (get_snub_cube_vertices, 3),
}

# Merge compounds into main registry
POLYHEDRA.update(COMPOUNDS)

# ============================================================================
# DYNAMIC COMPOUND GENERATION (for combination search)
# ============================================================================

def create_compound_at_relative_rotation(poly1_name, poly2_name, relative_spread):
    """Create compound of two polyhedra with one rotated by relative_spread.

    This allows searching for prime projections by varying the relative
    orientation of two polyhedra in a compound.

    Args:
        poly1_name: Name of first polyhedron
        poly2_name: Name of second polyhedron
        relative_spread: Spread angle for rotating poly2 relative to poly1

    Returns:
        Combined vertex array
    """
    if poly1_name not in POLYHEDRA or poly2_name not in POLYHEDRA:
        return None

    fn1, dim1 = POLYHEDRA[poly1_name]
    fn2, dim2 = POLYHEDRA[poly2_name]

    if dim1 != dim2:
        return None

    verts1 = fn1()
    verts2 = fn2()

    # Apply relative rotation to second polyhedron
    if dim1 == 3:
        R = rotation_matrix_3d(relative_spread, 0, 0)
    else:
        R = rotation_matrix_4d((relative_spread, 0, 0, 0, 0, 0))

    if R is not None:
        verts2 = verts2 @ R.T

    return np.vstack([verts1, verts2]), dim1

# ============================================================================
# ROTATION MATRICES (Rational Spread Based)
# ============================================================================

def spread_to_sin_cos(spread):
    """Convert spread to sin and cos values.

    Spread s = sin²θ, so sin θ = √s, cos θ = √(1-s)
    """
    if spread < 0 or spread > 1:
        return None, None
    sin_val = np.sqrt(spread)
    cos_val = np.sqrt(1 - spread)
    return sin_val, cos_val

def rotation_matrix_3d(spread_xy, spread_xz, spread_yz):
    """Create 3D rotation matrix from three spreads.

    Uses ZYX Euler angle convention with spread-based angles.
    """
    sin_xy, cos_xy = spread_to_sin_cos(spread_xy)
    sin_xz, cos_xz = spread_to_sin_cos(spread_xz)
    sin_yz, cos_yz = spread_to_sin_cos(spread_yz)

    if any(v is None for v in [sin_xy, cos_xy, sin_xz, cos_xz, sin_yz, cos_yz]):
        return None

    # Rotation around Z axis (XY plane)
    Rz = np.array([
        [cos_xy, -sin_xy, 0],
        [sin_xy, cos_xy, 0],
        [0, 0, 1]
    ])

    # Rotation around Y axis (XZ plane)
    Ry = np.array([
        [cos_xz, 0, sin_xz],
        [0, 1, 0],
        [-sin_xz, 0, cos_xz]
    ])

    # Rotation around X axis (YZ plane)
    Rx = np.array([
        [1, 0, 0],
        [0, cos_yz, -sin_yz],
        [0, sin_yz, cos_yz]
    ])

    return Rz @ Ry @ Rx

def rotation_matrix_4d(spreads):
    """Create 4D rotation matrix from six spreads.

    4D has six independent rotation planes: XY, XZ, XW, YZ, YW, ZW
    """
    s_xy, s_xz, s_xw, s_yz, s_yw, s_zw = spreads

    # Convert spreads to sin/cos
    angles = []
    for s in spreads:
        sin_val, cos_val = spread_to_sin_cos(s)
        if sin_val is None:
            return None
        angles.append((sin_val, cos_val))

    # Build rotation as composition of plane rotations
    R = np.eye(4)

    # XY rotation
    sin_val, cos_val = angles[0]
    Rxy = np.eye(4)
    Rxy[0,0], Rxy[0,1], Rxy[1,0], Rxy[1,1] = cos_val, -sin_val, sin_val, cos_val
    R = R @ Rxy

    # XZ rotation
    sin_val, cos_val = angles[1]
    Rxz = np.eye(4)
    Rxz[0,0], Rxz[0,2], Rxz[2,0], Rxz[2,2] = cos_val, -sin_val, sin_val, cos_val
    R = R @ Rxz

    # XW rotation
    sin_val, cos_val = angles[2]
    Rxw = np.eye(4)
    Rxw[0,0], Rxw[0,3], Rxw[3,0], Rxw[3,3] = cos_val, -sin_val, sin_val, cos_val
    R = R @ Rxw

    # YZ rotation
    sin_val, cos_val = angles[3]
    Ryz = np.eye(4)
    Ryz[1,1], Ryz[1,2], Ryz[2,1], Ryz[2,2] = cos_val, -sin_val, sin_val, cos_val
    R = R @ Ryz

    # YW rotation
    sin_val, cos_val = angles[4]
    Ryw = np.eye(4)
    Ryw[1,1], Ryw[1,3], Ryw[3,1], Ryw[3,3] = cos_val, -sin_val, sin_val, cos_val
    R = R @ Ryw

    # ZW rotation
    sin_val, cos_val = angles[5]
    Rzw = np.eye(4)
    Rzw[2,2], Rzw[2,3], Rzw[3,2], Rzw[3,3] = cos_val, -sin_val, sin_val, cos_val
    R = R @ Rzw

    return R

# ============================================================================
# PROJECTION AND HULL ANALYSIS
# ============================================================================

def project_to_2d(vertices):
    """Orthographic projection to XY plane."""
    if vertices.shape[1] == 4:
        # 4D -> 3D first (drop W), then 3D -> 2D
        return vertices[:, :2]
    elif vertices.shape[1] == 3:
        # 3D -> 2D
        return vertices[:, :2]
    return vertices

def count_hull_vertices(points_2d):
    """Count vertices on the 2D convex hull.

    Returns the number of vertices that form the boundary silhouette.
    """
    if len(points_2d) < 3:
        return len(points_2d)

    try:
        # Remove duplicate points (within tolerance)
        unique_points = np.unique(np.round(points_2d, 8), axis=0)

        if len(unique_points) < 3:
            return len(unique_points)

        hull = ConvexHull(unique_points)
        return len(hull.vertices)
    except Exception:
        return 0

def is_prime(n):
    """Check if n is prime."""
    if n < 2:
        return False
    if n == 2:
        return True
    if n % 2 == 0:
        return False
    for i in range(3, int(np.sqrt(n)) + 1, 2):
        if n % i == 0:
            return False
    return True

# Target primes for polygon search
TARGET_PRIMES = [7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]

# ============================================================================
# SEARCH ALGORITHM
# ============================================================================

def generate_rational_spreads(precision=4):
    """Generate all rational spread values with given decimal precision.

    Spreads are in range [0, 1] with step 10^(-precision).
    """
    step = 10 ** (-precision)
    spreads = np.arange(0, 1 + step, step)
    # Round to avoid floating point artifacts
    return np.round(spreads, precision)

def search_single_config(args):
    """Search a single rotation configuration (for parallelization)."""
    poly_name, vertices, dim, spreads, target_primes = args

    if dim == 3:
        # 3D polyhedron: 3 rotation spreads
        R = rotation_matrix_3d(*spreads[:3])
        if R is None:
            return None
        rotated = vertices @ R.T
    else:
        # 4D polytope: 6 rotation spreads
        R = rotation_matrix_4d(spreads)
        if R is None:
            return None
        rotated = vertices @ R.T

    # Project to 2D
    projected = project_to_2d(rotated)

    # Count hull vertices
    hull_count = count_hull_vertices(projected)

    # Check if it's a target prime
    if hull_count in target_primes:
        return {
            'polyhedron': poly_name,
            'dimension': dim,
            'spreads': [float(s) for s in spreads],
            'hull_vertices': hull_count,
            'projected_points': projected.tolist()
        }

    return None

def search_polyhedron(poly_name, precision=4, target_primes=None,
                      max_configs=None, verbose=True):
    """Search all rotation configurations for a single polyhedron."""
    if target_primes is None:
        target_primes = TARGET_PRIMES

    vertices_fn, dim = POLYHEDRA[poly_name]
    vertices = vertices_fn()

    spreads = generate_rational_spreads(precision)

    # Determine number of rotation parameters
    num_params = 3 if dim == 3 else 6

    # Generate all spread combinations
    if verbose:
        total = len(spreads) ** num_params
        print(f"Searching {poly_name} ({dim}D): {len(vertices)} vertices, "
              f"{total:,} configurations...")

    # For high-dimensional search, use coarser grid or sampling
    if num_params == 6 and precision > 2:
        # Use coarser grid for 4D (6 params would be too many)
        coarse_spreads = generate_rational_spreads(min(precision, 2))
        configs = list(product(coarse_spreads, repeat=num_params))
    else:
        configs = list(product(spreads, repeat=num_params))

    if max_configs and len(configs) > max_configs:
        # Random sampling if too many configurations
        indices = np.random.choice(len(configs), max_configs, replace=False)
        configs = [configs[i] for i in indices]

    # Prepare arguments for parallel processing
    args_list = [
        (poly_name, vertices, dim, spreads_tuple, target_primes)
        for spreads_tuple in configs
    ]

    # Parallel search
    results = []
    with Pool(cpu_count()) as pool:
        for i, result in enumerate(pool.imap_unordered(search_single_config,
                                                        args_list,
                                                        chunksize=1000)):
            if result is not None:
                results.append(result)
                if verbose:
                    print(f"  Found {result['hull_vertices']}-gon at spreads "
                          f"{result['spreads']}")

            # Progress update
            if verbose and (i + 1) % 10000 == 0:
                print(f"  Progress: {i+1:,}/{len(args_list):,} "
                      f"({100*(i+1)/len(args_list):.1f}%)")

    return results

def search_compound_config(args):
    """Search a single compound configuration (for parallelization)."""
    poly1, poly2, relative_spread, view_spreads, target_primes = args

    result = create_compound_at_relative_rotation(poly1, poly2, relative_spread)
    if result is None:
        return None

    vertices, dim = result
    compound_name = f"{poly1}+{poly2}@{relative_spread:.4f}"

    if dim == 3:
        R = rotation_matrix_3d(*view_spreads[:3])
        if R is None:
            return None
        rotated = vertices @ R.T
    else:
        R = rotation_matrix_4d(view_spreads)
        if R is None:
            return None
        rotated = vertices @ R.T

    projected = project_to_2d(rotated)
    hull_count = count_hull_vertices(projected)

    if hull_count in target_primes:
        return {
            'compound': compound_name,
            'poly1': poly1,
            'poly2': poly2,
            'relative_spread': float(relative_spread),
            'view_spreads': [float(s) for s in view_spreads],
            'hull_vertices': hull_count,
            'projected_points': projected.tolist()
        }

    return None


def search_combinations(poly_pairs, precision=2, target_primes=None,
                        max_configs=None, verbose=True):
    """Search compound polyhedra with varying relative rotations.

    This is the KEY search for breaking central symmetry!
    For each pair of polyhedra, we vary:
    1. The relative rotation between them (relative_spread)
    2. The viewing angle (view_spreads)

    Args:
        poly_pairs: List of (poly1, poly2) tuples to combine
        precision: Decimal precision for spreads
        target_primes: Prime hull counts to search for
        max_configs: Max configurations per pair
        verbose: Print progress
    """
    if target_primes is None:
        target_primes = TARGET_PRIMES

    spreads = generate_rational_spreads(precision)
    results = []

    for poly1, poly2 in poly_pairs:
        if poly1 not in POLYHEDRA or poly2 not in POLYHEDRA:
            if verbose:
                print(f"Warning: Unknown polyhedra in pair ({poly1}, {poly2})")
            continue

        _, dim1 = POLYHEDRA[poly1]
        _, dim2 = POLYHEDRA[poly2]

        if dim1 != dim2:
            if verbose:
                print(f"Warning: Dimension mismatch ({poly1}={dim1}D, {poly2}={dim2}D)")
            continue

        num_view_params = 3 if dim1 == 3 else 6

        if verbose:
            print(f"\nSearching compound: {poly1} + {poly2}")

        # Generate configurations: (relative_spread, view_spreads...)
        configs = []
        for rel_spread in spreads:
            for view_tuple in product(spreads, repeat=num_view_params):
                configs.append((poly1, poly2, rel_spread, view_tuple, target_primes))

        if max_configs and len(configs) > max_configs:
            indices = np.random.choice(len(configs), max_configs, replace=False)
            configs = [configs[i] for i in indices]

        if verbose:
            print(f"  {len(configs):,} configurations...")

        # Parallel search
        with Pool(cpu_count()) as pool:
            for i, result in enumerate(pool.imap_unordered(search_compound_config,
                                                            configs,
                                                            chunksize=500)):
                if result is not None:
                    results.append(result)
                    if verbose:
                        print(f"  ★ FOUND {result['hull_vertices']}-gon! "
                              f"rel={result['relative_spread']:.4f}")

                if verbose and (i + 1) % 5000 == 0:
                    print(f"  Progress: {i+1:,}/{len(configs):,}")

        if verbose:
            print(f"  → {len([r for r in results if r['poly1']==poly1 and r['poly2']==poly2])} findings")

    return results


def run_search(polyhedra=None, precision=4, target_primes=None,
               max_configs_per_poly=None, output_dir='results',
               include_compounds=False, compound_pairs=None):
    """Run the full prime projection search."""
    if polyhedra is None:
        # Default: search compounds first (more likely to find primes)
        polyhedra = list(COMPOUNDS.keys()) if include_compounds else []
        polyhedra.extend(['tetrahedron', 'cube', 'octahedron', 'icosahedron',
                          'dodecahedron', 'cuboctahedron'])

    if target_primes is None:
        target_primes = TARGET_PRIMES

    all_results = {
        'metadata': {
            'timestamp': datetime.now().isoformat(),
            'precision': precision,
            'target_primes': target_primes,
            'polyhedra_searched': polyhedra,
            'compound_pairs': compound_pairs,
        },
        'findings': [],
        'compound_findings': []
    }

    print(f"\n{'='*60}")
    print("4D± Prime Projection Search")
    print(f"{'='*60}")
    print(f"Precision: {precision} decimal places")
    print(f"Target primes: {target_primes}")
    print(f"Polyhedra: {polyhedra}")
    if compound_pairs:
        print(f"Compound pairs: {compound_pairs}")
    print(f"{'='*60}\n")

    # Search individual polyhedra
    for poly_name in polyhedra:
        if poly_name not in POLYHEDRA:
            print(f"Warning: Unknown polyhedron '{poly_name}', skipping...")
            continue

        results = search_polyhedron(
            poly_name,
            precision=precision,
            target_primes=target_primes,
            max_configs=max_configs_per_poly,
            verbose=True
        )

        all_results['findings'].extend(results)
        print(f"  → Found {len(results)} prime projections\n")

    # Search compound pairs with relative rotations
    if compound_pairs:
        print(f"\n{'='*60}")
        print("Searching Compound Pairs (Symmetry-Breaking)")
        print(f"{'='*60}")

        compound_results = search_combinations(
            compound_pairs,
            precision=min(precision, 2),  # Use coarser grid for compounds
            target_primes=target_primes,
            max_configs=max_configs_per_poly,
            verbose=True
        )

        all_results['compound_findings'].extend(compound_results)

    # Save results
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = output_path / f'prime_projections_{timestamp}.json'

    with open(filename, 'w') as f:
        json.dump(all_results, f, indent=2)

    print(f"\n{'='*60}")
    print(f"Search Complete!")
    print(f"{'='*60}")
    total_findings = len(all_results['findings']) + len(all_results['compound_findings'])
    print(f"Total prime projections found: {total_findings}")
    print(f"  - Regular polyhedra: {len(all_results['findings'])}")
    print(f"  - Compound pairs: {len(all_results['compound_findings'])}")
    print(f"Results saved to: {filename}")

    # Summary by prime
    prime_counts = {}
    for finding in all_results['findings'] + all_results['compound_findings']:
        n = finding['hull_vertices']
        prime_counts[n] = prime_counts.get(n, 0) + 1

    if prime_counts:
        print(f"\nFindings by prime n-gon:")
        for n in sorted(prime_counts.keys()):
            print(f"  {n}-gon: {prime_counts[n]} configurations")

    return all_results

# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Search for prime n-gon projections from polyhedra',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Quick search with coarse precision
  python prime_projection_search.py --precision 2

  # Search specific polyhedra
  python prime_projection_search.py --polyhedra tetrahedron,cube,icosahedron

  # Search compound polyhedra (symmetry-breaking!)
  python prime_projection_search.py --polyhedra stella_octangula,truncated_tetrahedron

  # Search compound pairs with relative rotations (BEST for primes)
  python prime_projection_search.py --compounds tetrahedron:tetrahedron,cube:octahedron

  # Search for specific primes
  python prime_projection_search.py --primes 7,11,13

  # Full compound search (recommended starting point)
  python prime_projection_search.py --compounds tetrahedron:tetrahedron --precision 2

  # Full 4D search (slow!)
  python prime_projection_search.py --polyhedra tesseract,24cell --precision 1

Symmetry-Breaking Strategy:
  Regular polyhedra have central symmetry → EVEN hull counts only
  Compound polyhedra can break symmetry → ODD/PRIME counts possible!

  Best candidates:
    - stella_octangula: 2 tetrahedra (dual pair)
    - truncated_tetrahedron: NO central symmetry
    - snub_cube: chiral (left/right handed)
    - compound_5_tet: NO central symmetry
    - tetrahedron:tetrahedron with relative rotation
        """
    )

    parser.add_argument(
        '--polyhedra', '-p',
        type=str,
        default=None,
        help='Comma-separated list of polyhedra to search (default: all)'
    )

    parser.add_argument(
        '--compounds', '-c',
        type=str,
        default=None,
        help='Compound pairs as poly1:poly2,poly3:poly4 (searches relative rotations)'
    )

    parser.add_argument(
        '--precision', '-d',
        type=int,
        default=2,
        help='Decimal precision for spread values (default: 2, max recommended: 4)'
    )

    parser.add_argument(
        '--primes', '-n',
        type=str,
        default=None,
        help='Comma-separated list of target primes (default: 7,11,13,17,19,23,29,31)'
    )

    parser.add_argument(
        '--max-configs', '-m',
        type=int,
        default=None,
        help='Maximum configurations per polyhedron (for quick testing)'
    )

    parser.add_argument(
        '--output', '-o',
        type=str,
        default='results',
        help='Output directory for results (default: results)'
    )

    parser.add_argument(
        '--list-polyhedra',
        action='store_true',
        help='List available polyhedra and exit'
    )

    parser.add_argument(
        '--include-compounds',
        action='store_true',
        help='Include pre-defined compound polyhedra in search'
    )

    args = parser.parse_args()

    if args.list_polyhedra:
        print("\nRegular Polyhedra (central symmetry → even hull counts):")
        print("-" * 55)
        for name in ['tetrahedron', 'cube', 'octahedron', 'icosahedron',
                     'dodecahedron', 'cuboctahedron', 'vector_equilibrium']:
            if name in POLYHEDRA:
                fn, dim = POLYHEDRA[name]
                vertices = fn()
                print(f"  {name}: {dim}D, {len(vertices)} vertices")

        print("\nCompound Polyhedra (symmetry-breaking → prime candidates!):")
        print("-" * 55)
        for name, (fn, dim) in COMPOUNDS.items():
            vertices = fn()
            sym = "NO central sym" if name in ['truncated_tetrahedron', 'snub_cube',
                                                 'compound_5_tet'] else "dual compound"
            print(f"  {name}: {dim}D, {len(vertices)} vertices ({sym})")

        print("\n4D Polytopes:")
        print("-" * 55)
        for name in ['tesseract', '16cell', '24cell', '120cell', '600cell']:
            if name in POLYHEDRA:
                fn, dim = POLYHEDRA[name]
                vertices = fn()
                print(f"  {name}: {dim}D, {len(vertices)} vertices")
        return

    # Parse polyhedra list
    polyhedra = None
    if args.polyhedra:
        polyhedra = [p.strip() for p in args.polyhedra.split(',')]

    # Parse compound pairs
    compound_pairs = None
    if args.compounds:
        compound_pairs = []
        for pair in args.compounds.split(','):
            if ':' in pair:
                p1, p2 = pair.split(':')
                compound_pairs.append((p1.strip(), p2.strip()))
            else:
                print(f"Warning: Invalid compound pair '{pair}', use poly1:poly2 format")

    # Parse primes list
    target_primes = None
    if args.primes:
        target_primes = [int(p.strip()) for p in args.primes.split(',')]

    # Run search
    run_search(
        polyhedra=polyhedra,
        precision=args.precision,
        target_primes=target_primes,
        max_configs_per_poly=args.max_configs,
        output_dir=args.output,
        include_compounds=args.include_compounds,
        compound_pairs=compound_pairs
    )

if __name__ == '__main__':
    main()
