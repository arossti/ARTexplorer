# ARTEX-AUDIT: Code Quality Audit Guide

> Rust/Metal native app (`artex-osx/`) — analogous to `Geometry Documents/CODE-QUALITY-AUDIT.md` for the JS app.
> Adapted for Rust tooling, wgpu/WGSL/Metal rendering boundary, and Quadray-first architecture.

---

## Purpose

Maintain code quality, architectural consistency, and RT-purity as the native app grows through P1-P5 phases. This guide provides structured checklists for AI agents (Claude Code) and human developers to perform systematic audits.

## Audit Types

| Type | When | Scope |
|------|------|-------|
| **Minor Audit** | After each feature/PR | Changed files + direct dependencies |
| **Major Audit** | Per-phase milestone (P1, P2, ...) | Full codebase |
| **RT-Purity Audit** | Quarterly or before major architecture changes | Deep dive on trig elimination |

## Guiding Principles

1. **RT Philosophy First** — All geometry upstream of the rendering boundary must remain RT-pure
2. **Simplicity Over Complexity** — Three similar lines > one clever generic
3. **Performance Awareness** — 120fps Metal target; minimize allocations in hot path
4. **Code Clarity** — Self-documenting; comments explain *why*, not *what*
5. **Module Boundaries** — Strict separation: math / polyhedra / geometry / camera / UI
6. **Closed Feedback Loops** — Every geometry module has verifiable output (tests, visual, stats)
7. **Error Compounding Awareness** — Track rational-to-float boundaries; f64 in math, f32 at GPU

---

## Section 1: Automated Checks

### 1.1 Formatting (`rustfmt`)

```bash
cargo fmt --check                 # Verify (CI-safe, no modifications)
cargo fmt                         # Auto-fix
```

**Success criterion:** Zero violations.

No custom `.rustfmt.toml` — using Rust defaults (4-space indent, ~100 char lines).

### 1.2 Linting (`clippy`)

```bash
cargo clippy -- -W clippy::all    # All standard warnings enabled
```

**Success criteria:**
- Zero errors
- <5 warnings (excluding intentional `#[allow(dead_code)]` on library functions held for future use)
- No `unsafe` blocks without explicit justification comment

**Key clippy lints to watch for:**
- `clippy::cast_precision_loss` — f64→f32 precision boundary
- `clippy::float_cmp` — use `approx_eq()` pattern instead of `==`
- `clippy::needless_pass_by_value` — prefer `&AppState` over owned
- `clippy::cognitive_complexity` — flag functions that need decomposition

### 1.3 Test Suite

```bash
cargo test                        # All unit tests
cargo test -- --nocapture         # With stdout (for debugging)
```

**Success criterion:** All tests pass (107+ at P1 baseline).

**Test count tracking** — record after each milestone:

| Phase | Tests | Date |
|-------|-------|------|
| P1 (Basis Arrows + Camera Presets + Ortho) | 107 | 2026-02-20 |

### 1.4 Performance

In-app FPS counter (`AppState::tick_fps()`):
- **Target:** 120 FPS sustained (Metal + Apple Silicon)
- **Minimum:** 60 FPS with all 6 polyhedra + basis arrows visible
- **Future:** `cargo bench` benchmark suite for geometry rebuild hot path

---

## Section 2: Manual Review Checklist

### 2.1 Code Quality Review

- [ ] **Duplication detection** — Search for repeated logic across modules (`grep -rn` patterns)
- [ ] **Dead code audit** — Review `cargo check` warnings; decide: suppress with `#[allow]` or remove
- [ ] **Function length** — Target <50 lines, flag >80 lines for decomposition
- [ ] **Naming consistency**:
  - `ABCD_COLORS`, `XYZ_COLORS` — `_COLORS` suffix for palettes
  - `build_*` prefix for geometry constructors (`build_visible_geometry`, `build_quadray_basis`)
  - `show_*` prefix for visibility flags
  - `*_dirty` suffix for rebuild flags
  - Constants: `SCREAMING_SNAKE_CASE` (`DEFAULT_DISTANCE`, `ORTHO_SCALE`)

### 2.2 Architecture Review

#### Module Responsibility Matrix

Each module has a single, clear responsibility. Violations indicate architectural drift.

| Module | Responsibility | Should NOT contain |
|--------|---------------|-------------------|
| `rt_math/` | Pure RT algebra (quadrance, spread, Quadray ABCD, phi, radicals, polygons, cubics) | Any `f32`, GPU types, `wgpu`/`glam` imports, rendering math |
| `rt_polyhedra/` | Polyhedron data (vertices, edges, faces in Quadray coordinates) | Rendering logic, GPU buffer code, camera math |
| `geometry.rs` | Combine polyhedra + arrows into unified GPU vertex/index buffers | Camera math, UI logic, projection matrices |
| `camera.rs` | Orbit camera, projection matrices (perspective/ortho), presets, centre-to-fit | Geometry generation, UI widget code |
| `ui.rs` | egui panel layout and user interaction | Geometry math, camera matrix computation, GPU operations |
| `main.rs` | wgpu orchestration, event loop, GPU state, render pass | Business logic (should delegate to other modules) |
| `basis_arrows.rs` | Basis arrow geometry construction (shafts + arrowheads) | Camera/UI code |
| `app_state.rs` | Visibility flags, scale values, dirty flags, FPS tracking | Any computation, rendering, or geometry logic |

#### Import/Dependency Rules

- No circular dependencies between modules
- `rt_math/` depends on nothing (pure math, stdlib only)
- `rt_polyhedra/` depends only on `rt_math/`
- `geometry.rs` and `basis_arrows.rs` depend on `rt_math/` + `rt_polyhedra/`
- `camera.rs` depends only on `glam` (rendering boundary)
- `ui.rs` depends on `app_state` + `camera` (reads state, mutates via UI)
- `main.rs` imports everything (orchestration layer)

#### Ownership Patterns

- `&AppState` (shared reference) for geometry build functions
- `&mut AppState` only in UI event handlers and render loop housekeeping
- `geometry_dirty: bool` flag pattern for lazy rebuild (not per-frame)

### 2.3 RT-Purity Verification

> **The Cardinal Rule:** `rt_math/` and `rt_polyhedra/` contain ZERO classical trigonometry.

#### Forbidden Patterns

Search with:
```bash
grep -rn "f64::sin\|f64::cos\|f64::tan\|f64::asin\|f64::acos\|f64::atan" src/rt_math/ src/rt_polyhedra/
grep -rn "consts::PI\|consts::TAU\|consts::FRAC_PI" src/rt_math/ src/rt_polyhedra/
```

**Expected result:** Zero hits (except `polygon.rs` line 85 transcendental fallback for non-constructible N — see Justified Exceptions below).

#### RT-Alternative Lookup Table

Before introducing any classical trig, verify the RT-pure alternative exists:

| Classical Pattern | RT-Pure Alternative | Source File |
|-------------------|-------------------|-------------|
| `f64::sin/cos` for polygon vertices | `polygon::n_gon_vertices(n, r)` — Wildberger reflection | `rt_math/polygon.rs` |
| `f64::atan2(y, x)` for orientation | `slope_from_spread(s)` — rational slope | `rt_math/mod.rs` |
| `f64::acos(dot)` for angle between vectors | `spread(v1, v2)` — direct algebraic spread | `rt_math/mod.rs` |
| `f64::sqrt(dx²+dy²)` for distance | `quadrance(p1, p2)` — defer sqrt to boundary | `rt_math/mod.rs` |
| Rotation by angle θ | `reflect_in_line(x, y, slope)` twice | `rt_math/mod.rs` |
| `(1.0 + 5.0_f64.sqrt()) / 2.0` for φ | `phi::phi()`, `phi_squared()`, `inv_phi()` | `rt_math/phi.rs` |
| `2.0_f64.sqrt()`, `3.0_f64.sqrt()` | `radicals::sqrt2()`, `sqrt3()`, `sqrt6()` — cached | `rt_math/radicals.rs` |
| `(PI / 7.0).cos()` for heptagon | `cubics::Heptagon::cos1()` — cached cubic root | `rt_math/cubics.rs` |

#### Justified Rendering Boundary

The **sole justified boundary** for classical math is the **wgpu/WGSL/Metal rendering handoff** and `glam` camera matrices. Each use **must** have a `// Math.X justified:` comment.

**Specific justified zones:**

| File | Line(s) | Usage | Justification |
|------|---------|-------|---------------|
| `camera.rs` | `view_proj()` | `f32::sin/cos` for spherical→Cartesian eye position | Rendering-boundary camera math |
| `camera.rs` | `centre()` | `f32::tan` for FOV→distance calculation | Rendering-boundary viewport fitting |
| `geometry.rs` | `build_visible_geometry()` | `f32::sqrt` for bounding radius | Rendering-boundary Cartesian distance |
| `basis_arrows.rs` | `build_arrow()` | `glam::Quat::from_rotation_arc()` | Rendering-boundary arrowhead orientation |
| `polygon.rs` | line 85 | `(PI / n).sin()` | Transcendental fallback for non-constructible N only |

**Decision flow for any new `sin/cos/sqrt/PI` usage:**
1. Is there an RT-pure alternative in `rt_math/`? → If yes: **violation**, replace it
2. Is it at the rendering boundary (camera, GPU upload, viewport)? → If yes: **add `// Math.X justified:` comment**
3. Is it in `rt_math/` or `rt_polyhedra/`? → **Not permitted** (move to rendering layer)

#### Deferred Sqrt Enforcement

All distance calculations in `rt_math/` use **quadrance** (Q = dx² + dy² + dz²). The `sqrt()` call happens only at the f32 rendering boundary.

**Correct:**
```rust
let q = quadrance(p1, p2);        // Stays in Q-space (algebraic)
// ... computations in Q-space ...
let distance = q.sqrt() as f32;   // Only at GPU upload
```

**Incorrect:**
```rust
let dist = quadrance(p1, p2).sqrt();  // Premature — lost algebraic precision
let q = dist * dist;                  // Reconstructing Q from float — error accumulates
```

#### Golden Ratio Identity Enforcement

Use symbolic algebra, not numerical:
- `phi_squared()` returns `phi() + 1.0` — identity, not `phi() * phi()`
- `inv_phi()` returns `phi() - 1.0` — identity, not `1.0 / phi()`
- `PhiSymbolic` carries `(a + b*sqrt(5)) / c` form through computations

---

## Section 3: Refactoring Guidelines

### When to Refactor

**DO refactor if:**
- Function exceeds 50 lines (decompose into helpers)
- Same logic appears in 3+ places (extract shared function)
- Magic numbers without named constants
- Complex nested `match`/`if let` chains (early returns)
- `cargo clippy` suggests clearer idioms

**DON'T refactor if:**
- Code is clear, working, and tested
- No measurable benefit (readability, performance, correctness)
- Premature abstraction for hypothetical future use
- Would break existing test expectations without new value

### Rust-Specific Patterns

| Pattern | Instead of... | Use... |
|---------|--------------|--------|
| **Iterator chains** | Manual `for` loop with `push` | `.iter().map().collect()` when clearer |
| **Early returns** | Nested `if let Some(x) = ... { if let Some(y) = ... { } }` | `let x = ...?;` or guard clauses |
| **Const evaluation** | Runtime computation of constants | `const` or `OnceLock` (like `radicals.rs`) |
| **Borrowing** | `fn process(state: AppState)` | `fn process(state: &AppState)` |
| **Enums over booleans** | `fn render(is_ortho: bool)` | `fn render(mode: ProjectionMode)` |

### Performance Patterns

- **Geometry caching:** Rebuild only when `geometry_dirty` flag is set, not every frame
- **Buffer reuse:** Create new wgpu buffers only on rebuild (current approach is correct)
- **Avoid allocations in render():** No `Vec::new()` in the per-frame render path
- **`#[inline]`:** Only where profiling shows benefit; never speculatively

---

## Section 4: Verification Path & Feedback Loop

### Closed Feedback Loop Check

For each geometry module, verify all four output paths:

| Module | `cargo test` | Visual (app) | Stats (Info panel) | Scale slider |
|--------|-------------|-------------|-------------------|-------------|
| `rt_math/` | 48 tests (quadrance, spread, quadray, phi, radicals, polygons, cubics) | N/A (pure math) | N/A | N/A |
| `rt_polyhedra/` | 17 tests (Euler, edge uniformity, vertex counts) | 6 polyhedra wireframes | Vertex/Edge counts | Regenerates |
| `basis_arrows` | 9 tests (arrow counts, directions, offsets) | ABCD + XYZ arrows | Included in counts | Regenerates |
| `camera` | 10 tests (presets, ortho, centre, gimbal) | Orbit, zoom, presets | N/A | N/A |
| `geometry` | (via integration) | Combined wireframe | Vertex/Edge totals | Triggers rebuild |

### Rendering Boundary Trace

Enumerate every classical math usage at the rendering boundary. This table should be updated when new rendering code is added:

```bash
# Find all f32 trig/sqrt in rendering code
grep -rn "\.sin()\|\.cos()\|\.tan()\|\.sqrt()\|consts::" src/camera.rs src/geometry.rs src/basis_arrows.rs src/main.rs
```

Each hit must have a corresponding `// Math.X justified:` comment. Unjustified hits are violations.

---

## Section 5: Quality Gates

### Mandatory (Must Pass)

| Gate | Command | Criterion |
|------|---------|-----------|
| Formatting | `cargo fmt --check` | Zero violations |
| Linting | `cargo clippy` | Zero errors |
| Tests | `cargo test` | All pass |
| RT-Purity | `grep` forbidden patterns | Zero hits in `rt_math/` and `rt_polyhedra/` |
| Safety | Manual review | No `unsafe` without justification |

### Target (Should Pass)

| Metric | Target |
|--------|--------|
| Clippy warnings | <5 (excluding `#[allow(dead_code)]`) |
| Function length | <50 lines average |
| `// Math.X justified:` coverage | 100% of rendering boundary trig |
| Unused imports | Zero |
| Rendering boundary documentation | All zones in table above |

### Aspirational (Nice to Have)

| Metric | Stretch Goal |
|--------|-------------|
| Test coverage on `rt_math/` + `rt_polyhedra/` | 100% of public functions |
| Clippy warnings | Zero |
| Function length | <30 lines average |
| Benchmark suite | `cargo bench` for geometry rebuild hot path |
| RT-purity | Zero transcendental fallback usage (all N-gons algebraic) |

---

## Section 6: Audit Workflow

### Step 1: Preparation

```bash
cd artex-osx
git status                        # Clean working tree
cargo build 2>&1 | grep -c warning  # Note baseline warning count
cargo test 2>&1 | grep "test result"  # Note baseline test count
```

### Step 2: Automated Checks

```bash
cargo fmt --check
cargo clippy -- -W clippy::all
cargo test
```

Record pass/fail for each in the audit report.

### Step 3: Manual Review

Iterate through modules in priority order:
1. `rt_math/` — RT-purity, algebraic correctness
2. `rt_polyhedra/` — Quadray integrity, edge/face validation
3. `geometry.rs` — Buffer construction, scale application
4. `camera.rs` — Projection math, preset accuracy
5. `basis_arrows.rs` — Arrow geometry, color consistency
6. `ui.rs` — UI layout, state mutation patterns
7. `main.rs` — Orchestration, render pipeline
8. `app_state.rs` — Flag completeness, default values

### Step 4: RT-Purity Deep Dive

```bash
# Forbidden patterns in math/polyhedra
grep -rn "f64::sin\|f64::cos\|f64::tan\|consts::PI" src/rt_math/ src/rt_polyhedra/

# Justified patterns at rendering boundary (should have comments)
grep -rn "\.sin()\|\.cos()\|\.tan()\|\.sqrt()\|FRAC_PI" src/camera.rs src/geometry.rs src/basis_arrows.rs

# Verify every hit has a justified comment
grep -B1 -rn "\.sin()\|\.cos()\|\.tan()\|\.sqrt()" src/camera.rs src/geometry.rs | grep -v "justified"
```

### Step 5: Generate Report

Use the reporting template below. Save as `artex-osx/docs/audit-YYYY-MM-DD.md`.

### Step 6: Create Issues

- **Critical** (RT-purity violations, test failures) → GitHub issue, fix immediately
- **High** (architecture boundary violations) → GitHub issue, fix this phase
- **Medium** (dead code, long functions) → Backlog
- **Low** (style, naming) → Fix opportunistically

### Step 7: Commit Fixes

```bash
git add -A
git commit -m "$(cat <<'EOF'
Audit: P[N] code quality fixes — [summary]

[List of key changes]

Co-Authored-By: Andy & Claude <andy@openbuilding.ca>
EOF
)"
```

---

## Section 7: Reporting Template

```markdown
# ARTEX Audit Report — [Date]

## Executive Summary
- **Phase:** P[N] — [milestone name]
- **Files reviewed:** [count]
- **Issues found:** [critical/high/medium/low]
- **Tests:** [pass count] / [total] pass

## Automated Checks
| Check | Status | Details |
|-------|--------|---------|
| `cargo fmt` | PASS/FAIL | [violations] |
| `cargo clippy` | PASS/FAIL | [errors], [warnings] |
| `cargo test` | PASS/FAIL | [passed]/[total] |
| RT-purity grep | PASS/FAIL | [hits in math/polyhedra] |

## Manual Review Findings
### Code Quality
- [duplicates, dead code, long functions]

### Architecture
- [boundary violations, import issues]

## RT-Purity Analysis
- **Classical trig in rt_math/rt_polyhedra:** [count] (target: 0)
- **Justified boundary usages:** [count] (all with comments: yes/no)
- **Deferred sqrt violations:** [count]

## Action Items
| Priority | Issue | File | Action |
|----------|-------|------|--------|
| Critical | ... | ... | ... |
| High | ... | ... | ... |

## Quality Gate Assessment
| Gate | Target | Actual | Status |
|------|--------|--------|--------|
| fmt violations | 0 | ... | ... |
| clippy errors | 0 | ... | ... |
| test pass rate | 100% | ... | ... |
| RT violations | 0 | ... | ... |
```

---

## Section 8: Quick Reference Commands

```bash
# Full audit suite
cargo fmt --check && cargo clippy -- -W clippy::all && cargo test

# RT-purity scan
grep -rn "f64::sin\|f64::cos\|f64::tan\|consts::PI" src/rt_math/ src/rt_polyhedra/

# Rendering boundary scan (should all have justified comments)
grep -rn "\.sin()\|\.cos()\|\.sqrt()\|consts::FRAC_PI" src/camera.rs src/geometry.rs src/basis_arrows.rs

# Dead code check
cargo check 2>&1 | grep "warning.*never"

# Line counts by module
wc -l src/*.rs src/rt_math/*.rs src/rt_polyhedra/*.rs

# Function length check (functions >50 lines)
grep -n "pub fn\|fn " src/*.rs src/rt_math/*.rs src/rt_polyhedra/*.rs
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-02-20 | Initial audit guide — P1 completion baseline (107 tests, ~2900 LOC, zero RT violations) |
