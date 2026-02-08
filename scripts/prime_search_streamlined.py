#!/usr/bin/env python3
"""
prime_search_streamlined.py
Unified Prime Polygon Hull Search

Uses EXACT definitions from JavaScript (rt-math.js, rt-polyhedra.js).
Outputs JSON with spreads that work DIRECTLY in JavaScript without translation.

Project-Streamline Phase 4: Re-run search with unified definitions.

Usage:
    python prime_search_streamlined.py --primes 5,7,11,13 --precision 2
    python prime_search_streamlined.py --primes 7 --precision 3 --verify

Output:
    JSON file with spread parameters that produce prime-gon hulls.
"""

import argparse
import json
import sys
from datetime import datetime
from typing import List, Dict, Optional, Tuple

# Import our RT-pure modules (same definitions as JavaScript)
from rt_math import (
    PHI, PHI_SQ, INV_PHI,
    quadrance, spread, spread_to_sin_cos,
    rotation_matrix_from_spreads, apply_rotation,
    convex_hull_2d, count_hull_vertices
)
from rt_polyhedra import (
    truncated_tetrahedron,
    trunc_tet_plus_tet,
    trunc_tet_plus_icosa,
    tetrahedron,
    icosahedron
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
        'polyhedra': 'trunc_tet_plus_tet',
        'vertices': trunc_tet_plus_tet,
        'description': '16 vertices from TruncTet+Tet → 7-gon hull'
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


def search_for_prime(
    target_prime: int,
    precision: int = 2,
    verbose: bool = False
) -> List[Dict]:
    """
    Search for spread parameters that produce a target prime-gon hull.

    Args:
        target_prime: Target number of hull vertices (5, 7, 11, 13)
        precision: Decimal places for spread search
        verbose: Print progress

    Returns:
        List of {s1, s2, s3, hull_count} dictionaries
    """
    if target_prime not in PRIME_CONFIGS:
        raise ValueError(f"Unsupported prime: {target_prime}. Use 5, 7, 11, or 13")

    config = PRIME_CONFIGS[target_prime]
    vertices = config['vertices']()
    vertex_count = len(vertices)

    if verbose:
        print(f"\nSearching for {target_prime}-gon ({config['name']})")
        print(f"  Polyhedra: {config['polyhedra']} ({vertex_count} vertices)")
        print(f"  Precision: {precision} decimal places")

    spreads = generate_spread_grid(precision)
    total_searches = len(spreads) ** 3
    results = []
    checked = 0

    for s1 in spreads:
        for s2 in spreads:
            for s3 in spreads:
                checked += 1

                # Count hull vertices
                hull_count = count_hull_vertices(vertices, s1, s2, s3)

                if hull_count == target_prime:
                    result = {
                        's1': s1,
                        's2': s2,
                        's3': s3,
                        'hull_count': hull_count
                    }
                    results.append(result)

                    if verbose:
                        print(f"  FOUND: s1={s1}, s2={s2}, s3={s3} → {hull_count}-gon")

                # Progress report
                if verbose and checked % 10000 == 0:
                    pct = 100 * checked / total_searches
                    print(f"  Progress: {pct:.1f}% ({checked}/{total_searches})", end='\r')

    if verbose:
        print(f"  Complete: {len(results)} matches found in {total_searches} searches")

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
        '--verbose', '-v',
        action='store_true',
        help='Verbose output'
    )

    args = parser.parse_args()

    # Parse primes
    primes = [int(p.strip()) for p in args.primes.split(',')]

    print("=" * 60)
    print("Prime Polygon Hull Search (Project-Streamline)")
    print("=" * 60)
    print(f"Target primes: {primes}")
    print(f"Precision: {args.precision} decimal places")
    print(f"Using unified RT definitions from JavaScript")
    print()

    # Collect all results
    all_results = {
        'metadata': {
            'timestamp': datetime.now().isoformat(),
            'precision': args.precision,
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
            verbose=args.verbose
        )

        all_results['primes'][str(prime)] = {
            'config': {
                'name': PRIME_CONFIGS[prime]['name'],
                'polyhedra': PRIME_CONFIGS[prime]['polyhedra'],
                'description': PRIME_CONFIGS[prime]['description']
            },
            'results': results,
            'count': len(results)
        }

        # Verification
        if args.verify and len(results) > 0:
            first = results[0]
            verified = verify_result(first, prime)
            status = "PASS" if verified else "FAIL"
            print(f"  Verification ({status}): s1={first['s1']}, s2={first['s2']}, s3={first['s3']}")

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    for prime_str, data in all_results['primes'].items():
        prime = int(prime_str)
        count = data['count']
        name = data['config']['name']
        print(f"  {prime}-gon ({name}): {count} projections found")

        # Show first few results
        if count > 0 and args.verbose:
            for r in data['results'][:3]:
                print(f"    s1={r['s1']}, s2={r['s2']}, s3={r['s3']}")
            if count > 3:
                print(f"    ... and {count - 3} more")

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
