# JAN24-CLEANING.md

**ARTexplorer Code Cleanup Workplan - January 24, 2026**

Based on [CODE-QUALITY-AUDIT.md](CODE-QUALITY-AUDIT.md) guidelines.

---

## Overview

**Objective:** Systematic code cleanup following the CODE-QUALITY-AUDIT framework
**Branch:** `JAN24-CLEANUP`
**Audit Type:** Major Audit (full codebase review)

---

## Phase 0: Complete rt-filehandler.js (Prerequisite)

**Status:** ✅ COMPLETED (2026-01-24)

Complete the instance restoration feature so ESLint won't flag unused functions.

### 0.1 Instance Restoration Implementation

- [x] Add `createPolyhedronByType()` factory to rt-rendering.js
- [x] Support all polyhedron types (regular, geodesic, quadray)
- [x] Add matrix type stubs with warning (async creation needed)
- [x] Expose factory in renderingAPI public interface

### 0.2 Update rt-filehandler.js

- [x] Replace TODO stub with full instance restoration logic
- [x] Handle transform restoration (position, rotation, scale)
- [x] Handle appearance restoration (visibility, opacity)
- [x] Support geodesic parameters (frequency, projection)
- [x] Add error handling and progress logging

### 0.4 Quadray Parameter Preservation

- [x] Store Quadray parameters (normalize, zStretch, wxyz) in userData during rendering
- [x] Capture parameters in rt-state-manager.js createInstance()
- [x] Pass Quadray parameters during instance restoration
- [x] Update createPolyhedronByType to accept Quadray options

### 0.5 Environment State Export/Import

- [x] Export polyhedra checkbox states (all forms at origin)
- [x] Export slider values (scale, opacity, matrix sizes, frequencies)
- [x] Restore slider values BEFORE checkboxes (correct rendering order)
- [x] Restore checkbox states and trigger updateGeometry()
- [x] Separation maintained: forms restored via UI state, not as instances

### 0.3 Supported Polyhedron Types

**Regular:** cube, tetrahedron, dualTetrahedron, octahedron, icosahedron, dodecahedron, dualIcosahedron, cuboctahedron, rhombicDodecahedron

**Geodesic:** geodesicIcosahedron, geodesicTetrahedron, geodesicOctahedron, geodesicDualTetrahedron, geodesicDualIcosahedron

**Quadray:** quadrayTetrahedron, quadrayTetraDeformed, quadrayDualTetrahedron

**Matrix (stub):** cubeMatrix, tetMatrix, octaMatrix, cuboctaMatrix, rhombicDodecMatrix, radialTetrahedron, radialOctahedron, radialCuboctahedron

---

## Phase 1: Automated Checks & Quick Fixes

### 1.1 Prettier Formatting

- [ ] Run `npx prettier --check "modules/**/*.js"`
- [ ] Document violations count
- [ ] Run `npx prettier --write "modules/**/*.js"` to auto-fix
- [ ] Verify all files pass formatting check

### 1.2 ESLint Compliance

- [ ] Run `npx eslint "modules/**/*.js"`
- [ ] Document error/warning counts
- [ ] Run `npx eslint --fix "modules/**/*.js"` for auto-fixes
- [ ] Review remaining warnings, document justifications if needed

### 1.3 Console.log Cleanup

- [ ] Search for console.log statements in production code
- [ ] Remove unnecessary debug statements
- [ ] Keep only justified logging (if any, with comments)

---

## Phase 2: RT-Purity Scan

### 2.1 Classical Trigonometry Audit

Search for violations:

```bash
grep -rn "Math.PI\|Math.sin\|Math.cos\|Math.tan\|Math.asin\|Math.acos\|Math.atan" modules/
```

- [ ] Document all occurrences
- [ ] Classify each as: Justified / Needs Fix / THREE.js Interface
- [ ] Add justification comments where Math.PI is unavoidable (THREE.js grids)
- [ ] Create TODO items for any that can be eliminated

### 2.2 Deferred √ Expansion Check

- [ ] Review distance calculations in rt-math.js
- [ ] Verify quadrance pattern is used (Q = dx² + dy² + dz²)
- [ ] Check that Math.sqrt() only appears at THREE.Vector3 boundaries
- [ ] Flag premature sqrt() usage

### 2.3 Golden Ratio Identity Verification

Search for violations:

```bash
grep -rn "phi \* phi\|1 / phi" modules/
```

- [ ] Verify φ² uses `phi + 1` identity
- [ ] Verify 1/φ uses `phi - 1` identity
- [ ] Fix any violations found

---

## Phase 3: Code Quality Review

### 3.1 File-by-File Review

**Priority 1 - Core Modules:**

| File                  | Status | Notes |
| --------------------- | ------ | ----- |
| rt-init.js            | [ ]    |       |
| rt-rendering.js       | [ ]    |       |
| rt-math.js            | [ ]    |       |
| rt-polyhedra.js       | [ ]    |       |
| rt-matrix-planar.js   | [ ]    |       |
| rt-papercut.js        | [ ]    |       |
| rt-controls.js        | [ ]    |       |
| rt-state-manager.js   | [ ]    |       |
| rt-filehandler.js     | [ ]    |       |

**Priority 2 - Demo Files:**

| File                   | Status | Notes |
| ---------------------- | ------ | ----- |
| rt-quadrance-demo.js   | [ ]    |       |
| rt-cross-demo.js       | [ ]    |       |
| rt-weierstrass-demo.js | [ ]    |       |
| rt-demo-utils.js       | [ ]    |       |

### 3.2 Review Checklist (per file)

For each file, verify:

- [ ] No duplicate functions (DRY principle)
- [ ] No commented-out code blocks (use git history)
- [ ] No excessive/obvious comments
- [ ] Functions < 50 lines (or justified)
- [ ] Logical function grouping
- [ ] Clear exports (public API at top)
- [ ] No magic numbers (use named constants)

### 3.3 Architecture Boundary Check

Verify module responsibilities:

- [ ] rt-math.js has NO THREE.js dependencies
- [ ] rt-polyhedra.js has NO DOM references
- [ ] rt-rendering.js delegates calculations to rt-math
- [ ] No circular dependencies between modules
- [ ] rt-state-manager.js has NO direct DOM manipulation

---

## Phase 4: Refactoring Opportunities

### 4.1 Duplicate Code Consolidation

- [ ] Review polyhedra generators for shared patterns
- [ ] Identify any repeated calculation patterns across files
- [ ] Document consolidation opportunities (don't over-engineer)

### 4.2 Function Length Review

- [ ] Identify functions > 50 lines
- [ ] Evaluate if splitting improves clarity
- [ ] Only split if genuinely beneficial (avoid premature abstraction)

### 4.3 Early Return Pattern

- [ ] Review nested conditionals
- [ ] Apply early return pattern where clarity improves
- [ ] Avoid over-flattening simple logic

---

## Phase 5: Documentation & Reporting

### 5.1 Generate Audit Report

Create report following CODE-QUALITY-AUDIT.md template:

- [ ] Executive summary
- [ ] Automated checks results
- [ ] Manual review findings
- [ ] RT-purity analysis
- [ ] Action items (Critical/High/Medium/Low)
- [ ] Quality gate assessment

### 5.2 Update TODO Master List

- [ ] Add new items discovered during audit
- [ ] Update existing items if applicable
- [ ] Cross-reference with ARTexplorer.md Section 8

---

## Phase 6: Commit & Close

### 6.1 Stage Changes

```bash
git add .
```

### 6.2 Commit with Audit Summary

Use the commit message format from CODE-QUALITY-AUDIT.md:

```
Clean: Code quality audit 2026-01-24

Automated fixes:
- Prettier formatting (XX files)
- ESLint auto-fixes (XX warnings)
- Removed console.log statements (XX occurrences)

Manual fixes:
- [List significant changes]

RT-Purity:
- [Status summary]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### 6.3 Merge to Main (when ready)

- [ ] Review all changes
- [ ] Ensure tests pass (if applicable)
- [ ] Merge JAN24-CLEANUP branch to main

---

## Quick Commands Reference

```bash
# Prettier
npx prettier --check "modules/**/*.js"
npx prettier --write "modules/**/*.js"

# ESLint
npx eslint "modules/**/*.js"
npx eslint --fix "modules/**/*.js"

# RT-Purity scan
grep -rn "Math.PI\|Math.sin\|Math.cos" modules/

# Golden ratio violations
grep -rn "phi \* phi\|1 / phi" modules/

# Console.log search
grep -rn "console.log" modules/
```

---

## Progress Tracking

| Phase   | Description              | Status         |
| ------- | ------------------------ | -------------- |
| Phase 0 | rt-filehandler.js        | ✅ Completed   |
| Phase 1 | Automated Checks         | [ ] Pending    |
| Phase 2 | RT-Purity Scan           | [ ] Pending    |
| Phase 3 | Code Quality Review      | [ ] Pending    |
| Phase 4 | Refactoring              | [ ] Pending    |
| Phase 5 | Documentation & Report   | [ ] Pending    |
| Phase 6 | Commit & Close           | [ ] Pending    |

---

**Created:** 2026-01-24
**Branch:** JAN24-CLEANUP
**Reference:** [CODE-QUALITY-AUDIT.md](CODE-QUALITY-AUDIT.md)
