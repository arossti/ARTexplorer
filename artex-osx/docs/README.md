# ARTexplorer Native — Quadray-First Geometry Engine

**A mathematically pure alternative to Cartesian geometric construction.**

> *"At every step we asked: is there a better way? And at every step, there was —
> cleaner, more performant, more rational, and more elegant almost every single time."*

---

## What This Is

ARTexplorer Native is a Rust/Metal macOS application that constructs, renders,
and explores polyhedral geometry in **Quadray ABCD coordinates** — a tetrahedral
coordinate system where space is described by four equiangular basis vectors
rather than three orthogonal axes.

This is not a port of the [JS web app](https://arossti.github.io/ARTexplorer/).
It is a ground-up reimagining that asks: *what happens when you refuse to start
in Cartesian and build everything natively in the coordinate system that geometry
actually wants?*

What we found:

- **All six Platonic solids** have pure Quadray ABCD vertex coordinates.
  Tetrahedron, dual tet, octahedron, and cube use only {0, 1} integers.
  Icosahedron and dodecahedron use permutations of phi-algebraic rationals.
  No `from_cartesian()` anywhere in the geometry pipeline.

- **The √2 that appears in Cartesian edge lengths is a Cartesian disease,
  not a geometric fact.** In Quadray, the tet/cube edge ratio is 2:1 — pure
  integer. The irrational only appears when you project to XYZ.

- **One scale factor governs all polyhedra.** Tet, cube, and octahedron nest
  at exact algebraic ratios of a single Quadray scale `s`. No independent
  sizing parameters. The hierarchy is the geometry.

- **XYZ conversion is a translation service, not a foundation.** The normalizer
  API (`normalizer.rs`) sits at the boundary between our ABCD world and the
  external XYZ world. Normalization is optional — the full 4D± system doesn't
  need it, and forcing it destroys Janus arena information.

## Why Native: The GPU Wall

The [JS web app](https://arossti.github.io/ARTexplorer/) is robust, well-loved, and
proved the concept. It demonstrated that Quadray coordinates work, that Rational
Trigonometry produces correct geometry, and that the integer/algebraic structure is
real. But it hit a wall.

That wall is the GPU. THREE.js and WebGL speak only Cartesian. Every vertex that
our RT-pure math engine generates in clean, integer Quadray ABCD must be translated
down to XYZ before it can be rendered — losing both computational efficiency (the
conversion cost) and mathematical precision (floating-point artifacts from unnecessary
coordinate transforms) in the process.

The native Rust/Metal macOS app exists to **smash through this wall**.

With Rust, we own the full pipeline from math core to Metal shader. We can write
a vertex shader that takes ABCD directly. We can fold the Tom Ace basis matrix
into the camera projection so the GPU never sees XYZ at all. We have alternatives
to quaternion rotation (Quadray Rotors, verified in JS, awaiting Rust port). All
core polyhedra are already defined in pure Quadray. The normalizer (`normalizer.rs`)
exists as a well-defined input/output boundary, not a pervasive dependency.

**The ultimate goal**: an application that generates geometry in the rational math
core of ARTEX and renders it right up to the pixel the user sees using rational
methods. No classical trigonometry. No Cartesian intermediaries. Rational from
algebra to screen.

The full feature set of the JS app — Thomson shells, geodesic subdivision, state
persistence, view sequences, prime projection analysis — will be integrated into
the native app, rebuilt on this purer, cleaner, faster foundation.

## The Larger Vision

This project elucidates a new chapter in R. Buckminster Fuller's *Synergetics* —
his complete system of universal energetic geometry — using N.J. Wildberger's
*Rational Trigonometry* as the algebraic engine.

**Fuller** showed that nature coordinates tetrahedrally, not cubically.
**Wildberger** showed that geometry is algebraic, not transcendental.
**Tom Ace** built the Quadray coordinate machinery.
**Kirby Urner** connected them through Python explorations.

We are building the tool that lets you *see* what they proved — and extending
it with our own research:

- **Janus Inversion**: sign-flip in all four ABCD coordinates maps tet ↔ dual
  tet. The negative arena is geometrically real, not a mathematical trick.
  See `Geometry Documents/Whitepaper LaTEX/Janus10.tex`.

- **Quadray Rotors**: RT-pure rotation using spread (s = sin²θ) instead of
  angle, with Tom Ace's F,G,H circulant coefficients. Verified in JS, Rust
  port planned. See `modules/rt-quadray-rotor.js` and
  `Geometry Documents/Whitepaper LaTEX/Quadray-Rotors.tex`.

- **ABCD-to-Clip Pipeline**: The endgame — fold the Tom Ace basis matrix into
  the camera matrix so the GPU never sees XYZ at all. A single ABCD-to-clip
  multiply. See [ARTEX-RATIONALE.md](ARTEX-RATIONALE.md) §4, §10.

## RT-Purity: The Cardinal Rule

**No classical trigonometry in geometry code.** No `f64::sin()`, `f64::cos()`,
`std::f64::consts::PI`. These are Cartesian habits, deeply ingrained in both
human and machine inertia. We replace them:

| Instead of... | We use... |
|---------------|-----------|
| distance = √(dx² + dy²) | quadrance = dx² + dy² (defer √ to GPU) |
| angle = arccos(dot) | spread = 1 − dot²/(Q₁·Q₂) |
| sin(θ), cos(θ) | Wildberger reflection: `reflect_in_line()` |
| φ = (1+√5)/2 then φ² | `phi_squared() = phi() + 1` (identity, not multiplication) |
| Cartesian vertex coords | Pure Quadray ABCD — {0,1} integers or phi-algebraic |

The **sole justified boundary** is the GPU handoff — `shader.wgsl` converts
ABCD → XYZ because wgpu speaks Cartesian. Camera matrices use `glam` because
that's a rendering concern. Everything upstream is RT-pure.

## Architecture

```
rt_math/                        The RT-pure math engine
├── quadray.rs                    Quadray ABCD type + operators
├── normalizer.rs                 XYZ ↔ ABCD conversion API (the boundary)
├── mod.rs                        quadrance, spread, reflect_in_line
├── phi.rs                        Golden ratio (algebraic identities)
├── radicals.rs                   √2, √3, √6 (cached, deferred)
├── cubics.rs                     Heptagon/nonagon cubic roots
└── polygon.rs                    N-gon vertices via Wildberger reflection

rt_polyhedra/                   Pure ABCD polyhedra
├── platonic.rs                   All 6 Platonics — zero from_cartesian()
└── mod.rs                        PolyhedronData + face winding validation

src/
├── main.rs                       wgpu event loop + render pipeline
├── shader.wgsl                   ABCD → XYZ on GPU (the rendering boundary)
├── geometry.rs                   Vertex buffer construction, ABCD colors
├── camera.rs                     Orbit camera (7 presets: ABCD + XYZ views)
├── basis_arrows.rs               ABCD + XYZ reference arrows with arrowheads
├── grids.rs                      Cartesian XYZ + Quadray IVM grid planes
├── app_state.rs                  UI state (all geometry via state mutations)
└── ui.rs                         egui sidebar (P1 prototype UI)

docs/
├── README.md                     This file
├── ARTEX-RATIONALE.md            Philosophical foundation — why ABCD-first
├── ARTEX-NORMALIZER.md           Normalizer API design document
├── RUST-METAL-BABYSTEPS.md       Practical build guide + roadmap
├── RUST-METAL-SWIFT-TEENAGER.md  Future SwiftUI native UI plan
├── ARTEX-AUDIT.md                Code quality gate
├── ARTEX-HAIRYBALL.md            Topology research notes
├── ART-RUST-UI.md                UI design planning
└── artex-logs.md                 Session logs
```

## Key Documents

| Document | Purpose |
|----------|---------|
| [ARTEX-RATIONALE.md](ARTEX-RATIONALE.md) | **Start here.** Why ABCD-first. Integer polyhedra, one-scale nesting, the √2 disease, ABCD-to-clip vision. |
| [RUST-METAL-BABYSTEPS.md](RUST-METAL-BABYSTEPS.md) | Practical guide. Agent handoff rules, RT-purity enforcement, build steps, Rust-for-JS-developers, full roadmap. |
| [ARTEX-NORMALIZER.md](ARTEX-NORMALIZER.md) | The normalizer as a language translator between XYZ and ABCD worlds. Why normalization is optional. |
| [RUST-METAL-SWIFT-TEENAGER.md](RUST-METAL-SWIFT-TEENAGER.md) | Future: SwiftUI native UI wrapping the Rust engine. Quadray Rotor port. |

## Current State (February 2026)

**136 tests passing. All six Platonic solids rendering with correct face winding.**

### Completed

- All 6 Platonic solids in pure Quadray ABCD — no `from_cartesian()` in `platonic.rs`
- Normalizer API: standalone XYZ ↔ ABCD conversion with raw (Janus-safe) variants
- Face rendering with backface culling (CCW winding validated computationally)
- ABCD + XYZ basis arrows with dual-tet arrowheads
- Quadray IVM grids (pure integer ABCD) + Cartesian XYZ grids
- 7 camera presets (4 Quadray axis views + 3 Cartesian)
- Orthographic + perspective projection with centre framing
- Janus inversion (frequency < 0 → negative arena)
- Alpha blending, depth buffer, frequency slider
- macOS .app bundle with custom icon

### Ahead

- **P2**: Node rendering, Thomson great-circle shells, geodesic subdivision, state persistence
- **P3**: ABCD-to-clip pipeline (eliminate XYZ from shader), Quadray Rotor (eliminate glam::Quat)
- **Teenager phase**: SwiftUI native UI wrapping the Rust geometry engine

## For Agents: The Mindset

XYZ habits are deeply ingrained. Every AI model defaults to Cartesian because
that's what the training data contains. When you work on this codebase:

1. **Question every XYZ assumption.** Can this be expressed in ABCD? Usually yes.
2. **Check `rt-math.js` (JS) or `rt_math/` (Rust) before reaching for classical trig.**
   The RT equivalent exists and is usually simpler.
3. **Irrationals are suspects.** If √2 appears in a Quadray context, something
   went wrong. The integer/rational structure should be preserved.
4. **The normalizer is a border crossing, not a foundation.** Code that lives
   inside the ABCD world should never need it. Only code at the XYZ boundary
   (grids, import/export, GPU upload) should call it.
5. **Read [ARTEX-RATIONALE.md](ARTEX-RATIONALE.md) first.** It explains *why*
   we make these choices, not just *what* the choices are.

## Build & Run

```bash
# Build and test
cargo test              # 160 tests
cargo build --release   # optimized binary

# Deploy to app bundle
cp target/release/artexplorer-native target/ARTexplorer.app/Contents/MacOS/ARTexplorer

# Or use the bundle script
./bundle.sh
```

**Requirements**: macOS, Rust toolchain (`rustup`), wgpu-compatible GPU.

## References

- **N.J. Wildberger**, *Divine Proportions: Rational Trigonometry to Universal Geometry*
- **R. Buckminster Fuller**, *Synergetics: Explorations in the Geometry of Thinking*
- **Kirby Urner**, [Quadray Introduction](http://www.grunch.net/synergetics/quadintro.html)
- **Tom Ace**, [Quadray Coordinates](http://minortriad.com/quadray.html)
- **Janus Inversion**: `Geometry Documents/Whitepaper LaTEX/Janus10.tex`
- **Quadray Rotors**: `Geometry Documents/Whitepaper LaTEX/Quadray-Rotors.tex`
- **Prime Projection Conjecture**: `Geometry Documents/Whitepaper LaTEX/Prime-Projection-Conjecture.tex`

---

*Built by Andy Thomson, M.Arch. OAA — OpenBuilding, Inc.*
*With assistance from Claude (Anthropic).*

*"Baby steps in Rust. Teenage years in Swift. The geometry engine stays RT-pure through it all."*
