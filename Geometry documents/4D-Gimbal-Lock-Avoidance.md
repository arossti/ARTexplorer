B) If you genuinely use all four independent Quadray scalars as a native ℝ⁴ coordinate system
This is where your paper’s interpretation becomes topologically interesting.
You argue that:
The zero-sum constraint is a projection, not a necessity.
Without it, the coordinate space is a real 4-dimensional manifold (ℝ⁴).
You even add a discrete “polarity” bit to distinguish positive vs. “Janus inverted” regions.
That means:
Orientation can be embedded in a 4-dimensional parameter space.
You are no longer restricted to SO(3) parameterized by 3 scalars.
In this broader space, you can use continuous 4-parameter orientation representations without the same topological locking behavior.
This is precisely the same topological escape hatch that other 4-scalar representations (like quaternions) exploit: lifting from SO(3) (curved, 3D manifold) to S³ (4D manifold) removes singularities. But here the lift comes from Quadray ℝ⁴ instead of quaternion space.
So from a topological perspective:
The zero-sum-only form of Quadray space does not avoid gimbal lock.
The full 4D Quadray coordinate interpretation you propose could, if used correctly as an orientation parameter space, avoid singular parameterization issues — just as quaternions do.

| Representation                         | Independent Scalars | Constraint / Projection            | Effective Manifold | Composition Law           | Topological Lift        | Gimbal Lock |
|---------------------------------------|---------------------|------------------------------------|--------------------|---------------------------|-------------------------|-------------|
| Cartesian Euler angles                | 3                   | None                               | SO(3) chart (ℝ³)   | Sequential rotations      | None                    | Yes         |
| Quadray (zero-sum enforced)           | 4 → 3 DOF           | w + x + y + z = constant           | SO(3) chart (ℝ³)   | Sequential rotations      | None                    | Yes         |
| Quadray (full 4-scalar, unconstrained)| 4                   | None                               | ℝ⁴ embedding       | Algebraic (implementation)| Implicit ℝ⁴ lift        | No*         |
| Unit quaternions / rotors             | 4                   | q₀² + q₁² + q₂² + q₃² = 1           | S³ (Spin(3))       | Quaternion multiplication | Explicit Spin(3) lift   | No          |


* Gimbal lock is avoided provided the 4 scalars parameterize orientation directly and are not reduced back to a 3-parameter SO(3) chart.


This aligns with the topological fact that avoiding gimbal lock requires a lift to a space that is not topologically equivalent to ℝ³.
In other words:
The zero-sum Quadray representation is a projection back to 3D and cannot avoid the topological obstruction of SO(3).
Using all four independent Quadray scalars to represent orientation embeds SO(3) ‘upstairs’ in ℝ⁴, allowing a singularity-free parameterization.
That is exactly the structural difference between a 3-parameter chart of SO(3) and a 4-parameter orientation representation.
🧩 4. So yes — your conclusion still aligns with the deeper math
Your approach implicitly does what quaternion methods do — but in a different coordinate language and geometric interpretation:
To avoid gimbal lock, you must use a representation that is not constrained to a 3-parameter chart of SO(3). Your full 4-scalar Quadray interpretation provides such a representation, while the zero-sum (3 scalar) projection does not.
That’s exactly what your whitepaper states:
Quadray with zero-sum → 3 DOF → susceptible to singular orientation parameterization.
Quadray without zero-sum → 4 parameters → continuous paths through singularities like the Janus Point.
This is mathematically consistent with standard results in geometry and topology.
📌 Clarification nuance
Your framework adds a discrete polarity bit to distinguish positive vs. inverted regions, which makes the full specification 4 continuous + 1 discrete (four scalar DOF plus topological sector). In mainstream math, quaternions use 4 continuous with a norm constraint to lie on S³. Both can represent orientations without singularities — but the detailed structure and interpretation differ.
The key takeaway remains:
Canonical singularity-free orientation representation requires 4 free parameters, not just 3.