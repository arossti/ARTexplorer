#!/usr/bin/env python3
"""
prime_search_streamlined.py
Unified Prime Polygon Hull Search with Equiangularity Ranking

Uses EXACT definitions from JavaScript (rt-math.js, rt-polyhedra.js).
Outputs JSON with spreads that work DIRECTLY in JavaScript without translation.
Ranks results by regularity score (equiangular + equilateral).

Usage:
    python prime_search_streamlined.py --primes 5,7,11,13 --precision 2
    python prime_search_streamlined.py --primes 7 --precision 3 --verify
    python prime_search_streamlined.py --primes 11,13 --precision 2 --top 20

Output:
    JSON file with spread parameters ranked by regularity score.
"""

import argparse
import json
import sys
from datetime import datetime
from fractions import Fraction
from math import sqrt, acos, degrees, pi
from typing import List, Dict, Optional, Tuple

# Import our RT-pure modules (same definitions as JavaScript)
from rt_math import (
    PHI, PHI_SQ, INV_PHI,
    quadrance, spread, spread_to_sin_cos,
    rotation_matrix_from_spreads, apply_rotation,
    project_to_plane,
    convex_hull_2d, count_hull_vertices
)
from rt_polyhedra import (
    truncated_tetrahedron,
    truncated_dual_tetrahedron,
    trunc_tet_plus_tet,
    trunc_tet_plus_dual_tet,
    trunc_tet_plus_icosa,
    tetrahedron,
    dual_tetrahedron,
    icosahedron,
    variable_stella_compound
)


# =============================================================================
# SEARCH CONFIGURATION
# =============================================================================

# Polyhedra configurations for each target prime
PRIME_CONFIGS = {
    5: {
        'name': 'pentagon',
        'polyhedra': 'truncated_tetrahedron',
        'vertices': truncated_tetrahedron,
        'description': '12 vertices from TruncTet → 5-gon hull'
    },
    7: {
        'name': 'heptagon',
        'polyhedra': 'trunc_tet_plus_dual_tet',
        'vertices': trunc_tet_plus_dual_tet,
        'description': '16 vertices from TruncTet+DualTet (normalized) → 7-gon hull'
    },
    11: {
        'name': 'hendecagon',
        'polyhedra': 'trunc_tet_plus_icosa',
        'vertices': trunc_tet_plus_icosa,
        'description': '24 vertices from TruncTet+Icosa → 11-gon hull'
    },
    13: {
        'name': 'tridecagon',
        'polyhedra': 'trunc_tet_plus_icosa',
        'vertices': trunc_tet_plus_icosa,
        'description': '24 vertices from TruncTet+Icosa → 13-gon hull'
    },
}


def generate_spread_grid(precision: int) -> List[float]:
    """
    Generate spread values for search grid.

    Args:
        precision: Number of decimal places (1 = 0.1 steps, 2 = 0.01 steps)

    Returns:
        List of spread values from 0 to 1
    """
    step = 10 ** (-precision)
    values = []
    current = 0.0
    while current <= 1.0 + step/2:  # Include 1.0
        values.append(round(current, precision))
        current += step
    return values


# =============================================================================
# PATH A: RATIONAL SPREAD GRID
# =============================================================================

# Tier 1 — RT-pure: denominators whose √s are expressible in cached radicals (√2, √3)
# Tier 2 — φ-rational: introduces √5 (golden ratio family)
# Tier 3 — algebraic: finer grid, still algebraically meaningful denominators
RATIONAL_TIERS = {
    1: [2, 3, 4],          # → √2, √3 family
    2: [5, 8, 10],         # → √5, √2 family
    3: [6, 9, 12, 16, 20, 25],  # finer algebraic grid
}


def generate_rational_spread_grid(max_tier: int = 3) -> List[Dict]:
    """
    Generate spread values from algebraically significant rationals.

    Each entry is {value: float, label: "p/q", fraction: Fraction(p,q)}
    so results carry their exact rational identity.

    Args:
        max_tier: Include tiers 1..max_tier (1=RT-pure, 2=φ-rational, 3=algebraic)

    Returns:
        Sorted list of {value, label, fraction} dicts, deduplicated
    """
    denominators = set()
    for tier in range(1, max_tier + 1):
        denominators.update(RATIONAL_TIERS.get(tier, []))

    # Always include 0 and 1
    seen = {}  # Fraction → label
    seen[Fraction(0, 1)] = "0"
    seen[Fraction(1, 1)] = "1"

    for q in sorted(denominators):
        for p in range(1, q):
            frac = Fraction(p, q)
            if frac not in seen:
                seen[frac] = f"{frac.numerator}/{frac.denominator}"

    # Sort by float value
    entries = []
    for frac, label in sorted(seen.items(), key=lambda x: float(x[0])):
        entries.append({
            'value': float(frac),
            'label': label,
            'fraction': frac,
        })

    return entries


def compute_hull_geometry(hull_points: List[Tuple[float, float]]) -> Dict:
    """
    Compute detailed geometry of hull vertices: angles, edges, regularity.

    Args:
        hull_points: Ordered 2D hull vertices from convex_hull_2d()

    Returns:
        Dict with angle_variance, edge_variance, regularity_score,
        is_equiangular, is_equilateral, interior_angles, edge_lengths
    """
    n = len(hull_points)
    if n < 3:
        return {
            'interior_angles': [],
            'edge_lengths': [],
            'angle_variance': float('inf'),
            'edge_variance': float('inf'),
            'regularity_score': 0.0,
            'is_equiangular': False,
            'is_equilateral': False,
        }

    # Compute edge lengths
    edge_lengths = []
    for i in range(n):
        x1, y1 = hull_points[i]
        x2, y2 = hull_points[(i + 1) % n]
        dx, dy = x2 - x1, y2 - y1
        edge_lengths.append(sqrt(dx * dx + dy * dy))

    # Compute interior angles
    interior_angles = []
    for i in range(n):
        x_prev, y_prev = hull_points[(i - 1) % n]
        x_curr, y_curr = hull_points[i]
        x_next, y_next = hull_points[(i + 1) % n]

        v1x, v1y = x_prev - x_curr, y_prev - y_curr
        v2x, v2y = x_next - x_curr, y_next - y_curr

        dot = v1x * v2x + v1y * v2y
        mag1 = sqrt(v1x * v1x + v1y * v1y)
        mag2 = sqrt(v2x * v2x + v2y * v2y)

        if mag1 < 1e-12 or mag2 < 1e-12:
            interior_angles.append(0.0)
            continue

        cos_angle = max(-1.0, min(1.0, dot / (mag1 * mag2)))
        interior_angles.append(degrees(acos(cos_angle)))

    # Angle statistics
    mean_angle = sum(interior_angles) / n
    angle_deviations = [(a - mean_angle) ** 2 for a in interior_angles]
    angle_std = sqrt(sum(angle_deviations) / n)

    # Edge statistics
    mean_edge = sum(edge_lengths) / n
    edge_deviations = [(e - mean_edge) ** 2 for e in edge_lengths]
    edge_std = sqrt(sum(edge_deviations) / n)
    edge_cv = 100 * edge_std / (mean_edge + 1e-10)  # coefficient of variation %

    # Regularity score: 0-1 based on angle and edge uniformity
    # Wider scale to differentiate results even when far from regular
    ideal_angle = 180 * (n - 2) / n
    angle_abs_devs = [abs(a - ideal_angle) for a in interior_angles]
    mean_angle_dev = sum(angle_abs_devs) / n
    angle_score = max(0.0, 1.0 - mean_angle_dev / 30.0)  # 30° deviation = 0

    edge_score = max(0.0, 1.0 - edge_cv / 50.0)  # 50% CV = 0

    regularity_score = (angle_score + edge_score) / 2

    return {
        'interior_angles': [round(a, 4) for a in interior_angles],
        'edge_lengths': [round(e, 6) for e in edge_lengths],
        'angle_variance': round(angle_std, 4),
        'edge_variance': round(edge_cv, 4),
        'regularity_score': round(regularity_score, 4),
        'is_equiangular': angle_std < 0.5,
        'is_equilateral': edge_cv < 1.0,
    }


def get_hull_points(vertices_3d: List[List[float]],
                    s1: float, s2: float, s3: float) -> List[Tuple[float, float]]:
    """
    Get the 2D convex hull points for a projected polyhedron.
    Uses column-based projection matching JavaScript rt-projections.js.

    Args:
        vertices_3d: List of [x, y, z] vertices
        s1, s2, s3: Rotation spreads

    Returns:
        Ordered hull vertices as list of (x, y) tuples
    """
    points_2d = project_to_plane(vertices_3d, s1, s2, s3)
    return convex_hull_2d(points_2d)


def search_for_prime(
    target_prime: int,
    precision: int = 2,
    rational_tier: int = 0,
    verbose: bool = False
) -> List[Dict]:
    """
    Search for spread parameters that produce a target prime-gon hull.

    Args:
        target_prime: Target number of hull vertices (5, 7, 11, 13)
        precision: Decimal places for spread search (used when rational_tier=0)
        rational_tier: If >0, use rational spread grid up to this tier (Path A)
        verbose: Print progress

    Returns:
        List of {s1, s2, s3, hull_count} dictionaries
    """
    if target_prime not in PRIME_CONFIGS:
        raise ValueError(f"Unsupported prime: {target_prime}. Use 5, 7, 11, or 13")

    config = PRIME_CONFIGS[target_prime]
    vertices = config['vertices']()
    vertex_count = len(vertices)

    # Choose grid mode
    if rational_tier > 0:
        rational_entries = generate_rational_spread_grid(rational_tier)
        spread_values = [e['value'] for e in rational_entries]
        label_map = {e['value']: e['label'] for e in rational_entries}
        mode_desc = f"rational tier {rational_tier} ({len(spread_values)} values)"
    else:
        spread_values = generate_spread_grid(precision)
        label_map = None
        mode_desc = f"decimal precision={precision} ({len(spread_values)} values)"

    if verbose:
        print(f"\nSearching for {target_prime}-gon ({config['name']})")
        print(f"  Polyhedra: {config['polyhedra']} ({vertex_count} vertices)")
        print(f"  Grid: {mode_desc}")
        if rational_tier > 0:
            labels = [e['label'] for e in rational_entries]
            print(f"  Spreads: {labels}")

    total_searches = len(spread_values) ** 3
    results = []
    checked = 0

    for s1 in spread_values:
        for s2 in spread_values:
            for s3 in spread_values:
                checked += 1

                # Count hull vertices
                hull_count = count_hull_vertices(vertices, s1, s2, s3)

                if hull_count == target_prime:
                    # Compute hull geometry for regularity scoring
                    hull_pts = get_hull_points(vertices, s1, s2, s3)
                    geometry = compute_hull_geometry(hull_pts)

                    result = {
                        's1': s1,
                        's2': s2,
                        's3': s3,
                        'hull_count': hull_count,
                        'regularity_score': geometry['regularity_score'],
                        'angle_variance': geometry['angle_variance'],
                        'edge_variance': geometry['edge_variance'],
                        'is_equiangular': geometry['is_equiangular'],
                        'is_equilateral': geometry['is_equilateral'],
                    }

                    # Attach rational labels if in rational mode
                    if label_map is not None:
                        result['s1_rational'] = label_map.get(s1, str(s1))
                        result['s2_rational'] = label_map.get(s2, str(s2))
                        result['s3_rational'] = label_map.get(s3, str(s3))

                    results.append(result)

                    if verbose:
                        tag = ""
                        if geometry['is_equiangular'] and geometry['is_equilateral']:
                            tag = " ★ GOLD (equiangular + equilateral)"
                        elif geometry['is_equiangular']:
                            tag = " ★ EQUIANGULAR"
                        elif geometry['is_equilateral']:
                            tag = " ★ EQUILATERAL"
                        if label_map:
                            lbl = (f"s=({label_map.get(s1,'?')},"
                                   f" {label_map.get(s2,'?')},"
                                   f" {label_map.get(s3,'?')})")
                        else:
                            lbl = f"s1={s1}, s2={s2}, s3={s3}"
                        print(f"  FOUND: {lbl} → {hull_count}-gon"
                              f" (reg={geometry['regularity_score']:.3f}){tag}")

                # Progress report
                if verbose and checked % 10000 == 0:
                    pct = 100 * checked / total_searches
                    print(f"  Progress: {pct:.1f}% ({checked}/{total_searches})", end='\r')

    # Sort by regularity score (best first)
    results.sort(key=lambda r: r['regularity_score'], reverse=True)

    if verbose:
        print(f"  Complete: {len(results)} matches found in {total_searches} searches")
        if results:
            best = results[0]
            if label_map:
                lbl = (f"s=({best.get('s1_rational','?')},"
                       f" {best.get('s2_rational','?')},"
                       f" {best.get('s3_rational','?')})")
            else:
                lbl = f"s1={best['s1']}, s2={best['s2']}, s3={best['s3']}"
            print(f"  Best: {lbl}"
                  f" (regularity={best['regularity_score']:.4f})")

    return results


# =============================================================================
# STELLA OCTANGULA SEARCH (variable truncation compound)
# =============================================================================

# Truncation grid: algebraically meaningful values
TRUNCATION_GRID = [
    {'value': 0.0,   'label': '0',   'desc': 'base tet (4v)'},
    {'value': 1/6,   'label': '1/6', 'desc': 'light truncation (12v)'},
    {'value': 1/4,   'label': '1/4', 'desc': 'quarter truncation (12v)'},
    {'value': 1/3,   'label': '1/3', 'desc': 'standard truncation (12v)'},
    {'value': 5/12,  'label': '5/12','desc': 'deep truncation (12v)'},
    {'value': 0.5,   'label': '1/2', 'desc': 'octahedron limit (6v)'},
]


def search_stella_for_prime(
    target_prime: int,
    rational_tier: int = 1,
    precision: int = 2,
    verbose: bool = False
) -> List[Dict]:
    """
    Search variable stella octangula compound for a target prime-gon hull.

    Searches over 5 parameters: (t1, t2, s1, s2, s3) where t1/t2 are
    independent truncation parameters for base/dual tetrahedra.

    Args:
        target_prime: Target number of hull vertices (any prime)
        rational_tier: Tier for rational spread grid (0 = decimal)
        precision: Decimal places (used when rational_tier=0)
        verbose: Print progress

    Returns:
        List of result dicts sorted by regularity score
    """
    # Choose spread grid
    if rational_tier > 0:
        rational_entries = generate_rational_spread_grid(rational_tier)
        spread_values = [e['value'] for e in rational_entries]
        label_map = {e['value']: e['label'] for e in rational_entries}
        spread_desc = f"rational tier {rational_tier} ({len(spread_values)} values)"
    else:
        spread_values = generate_spread_grid(precision)
        label_map = None
        spread_desc = f"decimal precision={precision} ({len(spread_values)} values)"

    trunc_values = TRUNCATION_GRID
    total = len(trunc_values) ** 2 * len(spread_values) ** 3

    if verbose:
        print(f"\nStella Octangula Search for {target_prime}-gon")
        print(f"  Truncation grid: {[t['label'] for t in trunc_values]}")
        print(f"  Spread grid: {spread_desc}")
        verts_desc = [f"({t1['label']},{t2['label']})→{len(variable_stella_compound(t1['value'], t2['value']))}v"
                      for t1 in trunc_values for t2 in trunc_values]
        print(f"  Vertex counts: {', '.join(dict.fromkeys(verts_desc))}")
        print(f"  Search space: {len(trunc_values)}² × {len(spread_values)}³ = {total:,}")

    results = []
    checked = 0

    for t1_entry in trunc_values:
        t1 = t1_entry['value']
        for t2_entry in trunc_values:
            t2 = t2_entry['value']

            # Generate vertices for this truncation pair
            vertices = variable_stella_compound(t1, t2)
            n_verts = len(vertices)

            # Skip if fewer vertices than target prime
            if n_verts < target_prime:
                checked += len(spread_values) ** 3
                continue

            for s1 in spread_values:
                for s2 in spread_values:
                    for s3 in spread_values:
                        checked += 1

                        hull_count = count_hull_vertices(vertices, s1, s2, s3)

                        if hull_count == target_prime:
                            hull_pts = get_hull_points(vertices, s1, s2, s3)
                            geometry = compute_hull_geometry(hull_pts)

                            result = {
                                't1': t1,
                                't2': t2,
                                't1_label': t1_entry['label'],
                                't2_label': t2_entry['label'],
                                'n_vertices': n_verts,
                                's1': s1,
                                's2': s2,
                                's3': s3,
                                'hull_count': hull_count,
                                'regularity_score': geometry['regularity_score'],
                                'angle_variance': geometry['angle_variance'],
                                'edge_variance': geometry['edge_variance'],
                                'is_equiangular': geometry['is_equiangular'],
                                'is_equilateral': geometry['is_equilateral'],
                                'interior_angles': geometry['interior_angles'],
                                'edge_lengths': geometry['edge_lengths'],
                            }

                            if label_map is not None:
                                result['s1_rational'] = label_map.get(s1, str(s1))
                                result['s2_rational'] = label_map.get(s2, str(s2))
                                result['s3_rational'] = label_map.get(s3, str(s3))

                            results.append(result)

                            if verbose:
                                tag = ""
                                if geometry['is_equiangular'] and geometry['is_equilateral']:
                                    tag = " ★ GOLD"
                                elif geometry['is_equiangular']:
                                    tag = " ★ EQUIANGULAR"
                                elif geometry['is_equilateral']:
                                    tag = " ★ EQUILATERAL"
                                slbl = (f"s=({label_map.get(s1,'?')}, {label_map.get(s2,'?')}, {label_map.get(s3,'?')})"
                                        if label_map else f"s=({s1}, {s2}, {s3})")
                                print(f"  FOUND: t=({t1_entry['label']},{t2_entry['label']}) {n_verts}v"
                                      f" {slbl} → {hull_count}-gon"
                                      f" (reg={geometry['regularity_score']:.3f}){tag}")

                        if verbose and checked % 10000 == 0:
                            pct = 100 * checked / total
                            print(f"  Progress: {pct:.1f}% ({checked:,}/{total:,})", end='\r')

    results.sort(key=lambda r: r['regularity_score'], reverse=True)

    if verbose:
        print(f"  Complete: {len(results)} matches in {total:,} searches" + " " * 20)
        if results:
            best = results[0]
            slbl = (f"s=({best.get('s1_rational','?')}, {best.get('s2_rational','?')}, {best.get('s3_rational','?')})"
                    if 's1_rational' in best else f"s=({best['s1']}, {best['s2']}, {best['s3']})")
            print(f"  Best: t=({best['t1_label']},{best['t2_label']}) {best['n_vertices']}v"
                  f" {slbl} (regularity={best['regularity_score']:.4f})")

    return results


def verify_result(result: Dict, target_prime: int) -> bool:
    """
    Verify that a search result produces the expected hull count.

    Args:
        result: {s1, s2, s3, hull_count} dictionary
        target_prime: Expected hull count

    Returns:
        True if verification passes
    """
    config = PRIME_CONFIGS[target_prime]
    vertices = config['vertices']()

    actual = count_hull_vertices(
        vertices,
        result['s1'],
        result['s2'],
        result['s3']
    )

    return actual == target_prime


def main():
    parser = argparse.ArgumentParser(
        description='Search for prime polygon hull projections'
    )
    parser.add_argument(
        '--primes',
        type=str,
        default='5,7',
        help='Comma-separated list of target primes (default: 5,7)'
    )
    parser.add_argument(
        '--precision',
        type=int,
        default=2,
        help='Decimal places for spread search (default: 2)'
    )
    parser.add_argument(
        '--output',
        type=str,
        default=None,
        help='Output JSON file (default: prime_projections_TIMESTAMP.json)'
    )
    parser.add_argument(
        '--verify',
        action='store_true',
        help='Verify first result for each prime'
    )
    parser.add_argument(
        '--top',
        type=int,
        default=0,
        help='Only keep top N results per prime (by regularity score, 0 = all)'
    )
    parser.add_argument(
        '--rational',
        type=int,
        default=0,
        metavar='TIER',
        help='Path A: search over rational spreads up to TIER (1=RT-pure, 2=φ, 3=algebraic)'
    )
    parser.add_argument(
        '--stella',
        action='store_true',
        help='Stella mode: search variable stella octangula compound (t1, t2, s1, s2, s3)'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Verbose output'
    )

    args = parser.parse_args()

    # Parse primes
    primes = [int(p.strip()) for p in args.primes.split(',')]

    # =====================================================================
    # STELLA MODE: variable stella octangula compound search
    # =====================================================================
    if args.stella:
        print("=" * 60)
        print("Stella Octangula Variable Compound Search")
        print("=" * 60)
        print(f"Target primes: {primes}")
        print(f"Mode: Variable truncation (t1, t2) × spread grid")
        print()

        all_results = {
            'metadata': {
                'timestamp': datetime.now().isoformat(),
                'mode': 'stella',
                'rational_tier': args.rational if args.rational > 0 else None,
                'precision': args.precision,
                'truncation_grid': [t['label'] for t in TRUNCATION_GRID],
                'source': 'prime_search_streamlined.py --stella',
            },
            'primes': {}
        }

        for prime in primes:
            results = search_stella_for_prime(
                target_prime=prime,
                rational_tier=args.rational,
                precision=args.precision,
                verbose=args.verbose
            )

            total_found = len(results)
            if args.top > 0:
                results = results[:args.top]

            all_results['primes'][str(prime)] = {
                'config': {
                    'name': f'{prime}-gon',
                    'polyhedra': 'variable_stella_compound',
                    'description': f'Variable stella octangula → {prime}-gon hull'
                },
                'results': results,
                'count': len(results),
                'total_found': total_found,
            }

        # Summary
        print("\n" + "=" * 60)
        print("STELLA SEARCH SUMMARY (ranked by regularity)")
        print("=" * 60)

        for prime_str, data in all_results['primes'].items():
            count = data['total_found']
            shown = data['count']
            print(f"\n  {prime_str}-gon: {count} projections found")

            if count == 0:
                continue

            # Count specials
            gold = sum(1 for r in data['results']
                       if r.get('is_equiangular') and r.get('is_equilateral'))
            equiang = sum(1 for r in data['results'] if r.get('is_equiangular'))
            equilat = sum(1 for r in data['results'] if r.get('is_equilateral'))

            if gold > 0:
                print(f"  ★ GOLD: {gold} equiangular + equilateral!")
            if equiang > gold:
                print(f"  ★ Equiangular: {equiang}")
            if equilat > gold:
                print(f"  ★ Equilateral: {equilat}")

            # Group by truncation pair to show diversity
            trunc_pairs = {}
            for r in data['results']:
                key = (r['t1_label'], r['t2_label'])
                if key not in trunc_pairs:
                    trunc_pairs[key] = r
            print(f"  Truncation pairs with hits: {len(trunc_pairs)}")

            show_n = min(10, shown)
            for i, r in enumerate(data['results'][:show_n]):
                tag = ""
                if r.get('is_equiangular') and r.get('is_equilateral'):
                    tag = " ★ GOLD"
                elif r.get('is_equiangular'):
                    tag = " ★ equiangular"
                elif r.get('is_equilateral'):
                    tag = " ★ equilateral"
                slbl = (f"s=({r.get('s1_rational','?')}, {r.get('s2_rational','?')}, {r.get('s3_rational','?')})"
                        if 's1_rational' in r else f"s=({r['s1']}, {r['s2']}, {r['s3']})")
                print(f"    #{i+1}: t=({r['t1_label']},{r['t2_label']}) {r['n_vertices']}v"
                      f" {slbl}"
                      f" (reg={r['regularity_score']:.4f},"
                      f" ang={r['angle_variance']:.2f}°,"
                      f" edge={r['edge_variance']:.2f}%){tag}")
            if shown > show_n:
                print(f"    ... and {shown - show_n} more")

        # Write output
        if args.output:
            output_file = args.output
        else:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_file = f'stella_search_{timestamp}.json'

        with open(output_file, 'w') as f:
            json.dump(all_results, f, indent=2)

        print(f"\nResults written to: {output_file}")
        return

    # =====================================================================
    # STANDARD MODE: fixed polyhedra search
    # =====================================================================
    print("=" * 60)
    print("Prime Polygon Hull Search (Project-Streamline)")
    print("=" * 60)
    print(f"Target primes: {primes}")
    if args.rational > 0:
        grid = generate_rational_spread_grid(args.rational)
        print(f"Mode: RATIONAL tier {args.rational} ({len(grid)} spread values)")
        print(f"  Denominators: {sorted(set().union(*(RATIONAL_TIERS[t] for t in range(1, args.rational+1))))}")
        print(f"  Search space: {len(grid)}³ = {len(grid)**3:,} triples per prime")
    else:
        print(f"Precision: {args.precision} decimal places")
    print(f"Using unified RT definitions from JavaScript")
    print()

    # Collect all results
    all_results = {
        'metadata': {
            'timestamp': datetime.now().isoformat(),
            'precision': args.precision,
            'rational_tier': args.rational if args.rational > 0 else None,
            'mode': f'rational_tier_{args.rational}' if args.rational > 0 else f'decimal_p{args.precision}',
            'source': 'prime_search_streamlined.py',
            'note': 'Spreads work DIRECTLY in JavaScript rt-projections.js'
        },
        'primes': {}
    }

    for prime in primes:
        if prime not in PRIME_CONFIGS:
            print(f"WARNING: Skipping unsupported prime {prime}")
            continue

        results = search_for_prime(
            target_prime=prime,
            precision=args.precision,
            rational_tier=args.rational,
            verbose=args.verbose
        )

        total_found = len(results)

        # Apply --top filter (results already sorted by regularity)
        if args.top > 0:
            results = results[:args.top]

        all_results['primes'][str(prime)] = {
            'config': {
                'name': PRIME_CONFIGS[prime]['name'],
                'polyhedra': PRIME_CONFIGS[prime]['polyhedra'],
                'description': PRIME_CONFIGS[prime]['description']
            },
            'results': results,
            'count': len(results),
            'total_found': total_found,
        }

        # Verification (verify best result by regularity)
        if args.verify and len(results) > 0:
            first = results[0]
            verified = verify_result(first, prime)
            status = "PASS" if verified else "FAIL"
            print(f"  Verification ({status}): s1={first['s1']}, s2={first['s2']}, s3={first['s3']}"
                  f" (regularity={first['regularity_score']:.4f})")

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY (ranked by regularity score)")
    print("=" * 60)

    for prime_str, data in all_results['primes'].items():
        prime = int(prime_str)
        count = data['count']
        name = data['config']['name']
        print(f"\n  {prime}-gon ({name}): {count} projections found")

        if count == 0:
            continue

        # Count special results
        gold_count = sum(1 for r in data['results']
                         if r.get('is_equiangular') and r.get('is_equilateral'))
        equiang_count = sum(1 for r in data['results'] if r.get('is_equiangular'))
        equilat_count = sum(1 for r in data['results'] if r.get('is_equilateral'))

        if gold_count > 0:
            print(f"  ★ GOLD: {gold_count} equiangular + equilateral!")
        if equiang_count > gold_count:
            print(f"  ★ Equiangular: {equiang_count}")
        if equilat_count > gold_count:
            print(f"  ★ Equilateral: {equilat_count}")

        # Show top results
        show_n = min(5, count)
        for i, r in enumerate(data['results'][:show_n]):
            tag = ""
            if r.get('is_equiangular') and r.get('is_equilateral'):
                tag = " ★ GOLD"
            elif r.get('is_equiangular'):
                tag = " ★ equiangular"
            elif r.get('is_equilateral'):
                tag = " ★ equilateral"
            # Show rational labels if available
            if 's1_rational' in r:
                lbl = f"s=({r['s1_rational']}, {r['s2_rational']}, {r['s3_rational']})"
            else:
                lbl = f"s1={r['s1']}, s2={r['s2']}, s3={r['s3']}"
            print(f"    #{i+1}: {lbl}"
                  f" (reg={r['regularity_score']:.4f},"
                  f" ang_var={r['angle_variance']:.2f}°,"
                  f" edge_var={r['edge_variance']:.2f}%){tag}")
        if count > show_n:
            print(f"    ... and {count - show_n} more")

    # Write output
    if args.output:
        output_file = args.output
    else:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = f'prime_projections_{timestamp}.json'

    with open(output_file, 'w') as f:
        json.dump(all_results, f, indent=2)

    print(f"\nResults written to: {output_file}")
    print("\nTo use in JavaScript:")
    print("  1. Load this JSON file")
    print("  2. Apply spreads directly to RT.Projections")
    print("  3. Hull counts will match (same vertex definitions)")


if __name__ == '__main__':
    main()
