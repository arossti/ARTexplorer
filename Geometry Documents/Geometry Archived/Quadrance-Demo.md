# RT Quadrance Demo - Planning Document

**Date:** 2026-01-03
**Purpose:** Educational demonstration of spread-quadrance relationships in Rational Trigonometry

---

## 1. Core Concept

Demonstrate the relationship between **spread** (s) and **quadrance** (Q) for unit rectangles inscribed in a circle, where spread is defined as:

```
s = Qq/Rq = (opposite edge quadrance) / (radius quadrance)
```

For a unit circle (R² = 1), this simplifies to: `s = Qq`

---

## 2. Mathematical Foundation

### Spread Definition (RT)

- **Spread** replaces sin²(θ) in classical trigonometry
- For a point (x, y) on the unit circle: `s = y²`
- Spread is always rational when y is rational
- Range: 0 ≤ s ≤ 1

### Quadrance Definition (RT)

- **Quadrance** replaces distance² (no square root!)
- Q = Δx² + Δy² (squared distance)
- For a unit rectangle with one vertex at origin and opposite at (x, y) on circle:
  - Q_horizontal = x²
  - Q_vertical = y²
  - Q_diagonal (radius) = x² + y² = 1 (on unit circle)

### Key Relationship

```
For a right triangle with legs a, b and hypotenuse c:
Q_a + Q_b = Q_c  (Pythagorean theorem in quadrance form)

For unit circle: x² + y² = 1
Therefore: Q_horizontal + Q_vertical = 1
And: s = y² = Q_vertical
```

---

## 3. Two Possible Approaches

### Approach A: Rational Spread Series (T-Series)

**Goal:** Find all spreads that resolve to simple rational values (multiples of 0.01, 0.05, etc.)

**T-Series Spreads** (from your sketch):

- s = 0 (0°, horizontal)
- s = 0.038461154 (calculated from rectangular ratio)
- s = 0.2 (φ rectangle ratio: 9/45)
- s = 0.45 (√2 diagonal)
- s = 0.75 (√3 equilateral triangle, 60°)
- s = 1 (90°, vertical)

**Implementation:**

1. Calculate y-coordinates for each rational spread: y = √s
2. Calculate x-coordinates: x = √(1 - s)
3. Create unit rectangles from origin to (x, y)
4. Show spread value and quadrance relationships

**Advantages:**

- Demonstrates spread as primary concept
- Shows "T-Series" of rational spreads
- Educational for understanding spread increments

### Approach B: Rational Rectangle Dimensions

**Goal:** Find all unit rectangles with rational integer dimensions that fit within the circle

**Example from your sketch:**

- Rectangle 5×5 (units) → point (5,5) normalized to circle
- Normalized: (5/√50, 5/√50) = (√2/2, √2/2) → s = 0.5
- This is the 45° case (√2 square)

**Implementation:**

1. Define integer rectangle dimensions (e.g., 3×4, 5×12, 8×15)
2. Normalize to unit circle: (a/√(a²+b²), b/√(a²+b²))
3. Calculate spread: s = (b/√(a²+b²))²
4. Create unit rectangle visualization
5. Show integer dimensions and resulting spread

**Advantages:**

- Intuitive "building block" approach
- Demonstrates Pythagorean triples
- Shows how integer ratios create spreads

---

## 4. Recommended Approach: Hybrid (Approach A with Pythagorean Triples)

**Rationale:**

- Start with rational spreads (Approach A) as primary focus
- Add Pythagorean triple rectangles that yield those spreads
- Best of both worlds: spread education + integer geometry

### Notable Pythagorean Triples & Their Spreads:

```javascript
// (a, b, c) → normalized (a/c, b/c) → spread s = (b/c)²

// Classic 3-4-5 triangle
(3, 4, 5) → (0.6, 0.8) → s = 0.64

// 5-12-13 triangle
(5, 12, 13) → (5/13, 12/13) → s = 0.852 ≈ 144/169

// 8-15-17 triangle
(8, 15, 17) → (8/17, 15/17) → s = 0.779 ≈ 225/289

// 7-24-25 triangle
(7, 24, 25) → (7/25, 24/25) → s = 0.9216 = 576/625

// Equal legs (n, n, n√2) - always s = 0.5
(1, 1, √2) → (1/√2, 1/√2) → s = 0.5
(5, 5, 5√2) → (same when normalized)
```

---

## 5. Visual Design (Based on Your Sketch)

### Elements to Include:

1. **Unit Circle** - black outline, radius = 1.5 (same as Weierstrass)
2. **X/Y Axes** - red/green (same as Weierstrass)
3. **Unit Rectangles** - red outlines from origin to circle point
4. **Draggable Point** - blue circle on circumference
5. **Snap Points** - different markers for different spread types:
   - Cardinals (s=0, s=1): Gray circles
   - Rational spreads: Orange/gold markers
   - Special (√2, √3, φ): Keep from Weierstrass or modify

### Rectangle Visualization:

- Origin (0, 0) to point (x, y) on circle
- Show all 4 quadrants (8 rectangles total if symmetric)
- Lighter cyan fill with opacity (like your sketch)
- Label with spread value

### Formula Display:

Replace Weierstrass formulas with quadrance formulas:

```
Column 1: Spread & Position
  s = y²/R² = [value]
  x = [value]
  y = [value]

Column 2: Quadrances
  Q(x) = x² = [value]
  Q(y) = y² = [value]
  Q(R) = x² + y² = 1

Column 3: Pythagorean Triple (if applicable)
  Triangle: (a, b, c)
  Ratio: (a/c, b/c)
  Spread: (b/c)²

Column 4: Spread Classification
  Type: [Cardinal/Rational/Irrational]
  Decimal: [value]
  Fraction: [numerator/denominator]
```

---

## 6. Implementation Steps

### Step 1: Copy & Rename

1. Copy `rt-Weierstrass-demo.js` to `rt-quadrance-demo.js`
2. Delete existing stub file
3. Update function names: `initQuadranceDemo()`, `cleanupQuadranceDemo()`
4. Update modal ID: `quadrance-modal`, `quadrance-demo-container`

### Step 2: Modify Snap Points Array

Replace Weierstrass snap points with rational spread snap points:

```javascript
// Rational spread snap points (T-Series)
const snapPoints = [
  // Cardinals
  { x: 1, y: 0, spread: 0, label: "s=0", type: "cardinal", triple: null },
  { x: 0, y: 1, spread: 1, label: "s=1", type: "cardinal", triple: null },

  // Pythagorean triples with rational spreads
  {
    x: 0.6,
    y: 0.8,
    spread: 0.64,
    label: "s=0.64",
    type: "rational",
    triple: [3, 4, 5],
  },
  {
    x: 5 / 13,
    y: 12 / 13,
    spread: 144 / 169,
    label: "s≈0.85",
    type: "rational",
    triple: [5, 12, 13],
  },
  {
    x: 8 / 17,
    y: 15 / 17,
    spread: 225 / 289,
    label: "s≈0.78",
    type: "rational",
    triple: [8, 15, 17],
  },
  {
    x: 7 / 25,
    y: 24 / 25,
    spread: 576 / 625,
    label: "s≈0.92",
    type: "rational",
    triple: [7, 24, 25],
  },

  // Special irrational cases (keep for education)
  {
    x: 1 / Math.sqrt(2),
    y: 1 / Math.sqrt(2),
    spread: 0.5,
    label: "s=0.5",
    type: "special",
    triple: [1, 1, "√2"],
  },
  {
    x: 0.5,
    y: Math.sqrt(3) / 2,
    spread: 0.75,
    label: "s=0.75",
    type: "special",
    triple: null,
  },

  // Add all 4 quadrants for each...
];
```

### Step 3: Remove Weierstrass-Specific Elements

- Remove √2 square guide geometry
- Remove √3 triangle guide geometry
- Remove φ golden rectangles
- Keep only the unit rectangles for current snap point

### Step 4: Add Rectangle Grid Visualization (Optional)

Based on your sketch showing layered rectangles:

- Create multiple unit rectangles at different spreads
- Cyan gradient fill (darker = higher spread)
- Show "stacking" effect

### Step 5: Update Formula Display

Replace Weierstrass parametrization with quadrance relationships

### Step 6: Update UI Integration

- Add button/link in main UI to launch quadrance demo
- Update `rt-init.js` or equivalent to wire up modal

---

## 7. Key Snap Points to Include

### Tier 1: Essential (Cardinals & Common Rationals)

```javascript
s = 0.00 → (1, 0)         // Horizontal
s = 0.25 → (√3/2, 1/2)    // 30° (not Pythagorean, but educational)
s = 0.50 → (1/√2, 1/√2)   // 45° (1-1-√2 triple)
s = 0.64 → (0.6, 0.8)     // 3-4-5 triple
s = 0.75 → (1/2, √3/2)    // 60° (not Pythagorean, but educational)
s = 1.00 → (0, 1)         // Vertical
```

### Tier 2: Advanced Rationals

```javascript
s ≈ 0.78 → (8/17, 15/17)   // 8-15-17 triple
s ≈ 0.85 → (5/13, 12/13)   // 5-12-13 triple
s ≈ 0.92 → (7/25, 24/25)   // 7-24-25 triple
```

### Tier 3: T-Series Special (From your sketch)

```javascript
s ≈ 0.038 → calculate from your diagram formula
s = 0.20 → calculate (possibly φ-related?)
s = 0.45 → calculate
```

---

## 8. Open Questions

1. **What is the formula for s ≈ 0.038461154 in your sketch?**
   - Appears to be related to a specific rectangle ratio
   - Need to reverse-engineer from your diagram

2. **Should we show ALL quadrants or just Q1?**
   - Your sketch shows Q1 primarily
   - Could add symmetry toggle

3. **Rectangle fill or outline only?**
   - Your sketch shows cyan gradient fill
   - Could make this a toggle

4. **Include non-Pythagorean rationals?**
   - Many rational spreads don't come from integer triples
   - Trade-off: comprehensiveness vs. simplicity

---

## 9. Success Criteria

✅ User can drag point around circle and see spread update in real-time
✅ Snap to rational spread values (magnetic zones)
✅ Show unit rectangle from origin to point on circle
✅ Display spread, quadrance, and Pythagorean triple (when applicable)
✅ Educational formula panel explaining relationships
✅ Visually distinct from Weierstrass demo (different color scheme?)
✅ Document connection between integer rectangles and rational spreads

---

## 10. Babylonian Plimpton 322 Integration (c. 1800 BC)

### Historical Context

The Plimpton 322 clay tablet predates Pythagoras by over 1000 years and demonstrates sophisticated use of **base-60 (sexagesimal) exact trigonometry**. All triples use "regular numbers" (2ᵃ×3ᵇ×5ᶜ) ensuring **exact finite representation** in base-60 with no approximations.

This is pure Rational Trigonometry - the Babylonians used **quadrance and spread** without angles!

### Complete Plimpton 322 Triple Set (15 rows)

**Source:** Mansfield & Wildberger (2017), "Plimpton 322 is Babylonian exact sexagesimal trigonometry", _Historia Mathematica_

The tablet organizes triples by **ukullû (reciprocal slope)** β = long/diagonal, ranging from near 1 (isosceles) to smaller values (steeper triangles). The angle range (from vertical) is approximately **31.89° to 44.76°**, or equivalently **45.24° to 58.11°** from horizontal.

#### Table: Sexagesimal Format (Table 9 from Mansfield & Wildberger 2017)

| Row | β (base/diag) | δ (diagonal)  | b (simplified base) | d (simplified diag) |
| --- | ------------- | ------------- | ------------------- | ------------------- |
| 1   | 59.30         | 1.24.30       | 1.59                | 2.49                |
| 2   | 58.27.17.30   | 1.23.46.02.30 | 56.07               | 1.20.25             |
| 3   | 57.30.45      | 1.23.06.45    | 1.16.41             | 1.50.49             |
| 4   | 56.29.04      | 1.22.24.16    | 3.31.49             | 5.09.01             |
| 5   | 54.10         | 1.20.50       | 1.05                | 1.37                |
| 6   | 53.10         | 1.20.10       | 5.19                | 8.01                |
| 7   | 50.54.40      | 1.18.41.20    | 38.11               | 59.01               |
| 8   | 49.56.15      | 1.18.03.45    | 13.19               | 20.49               |
| 9   | 48.06         | 1.16.54       | 8.01                | 12.49               |
| 10  | 45.56.06.40   | 1.15.33.53.20 | 1.22.41             | 2.16.01             |
| 11  | 45            | 1.15          | 45                  | 1.15                |
| 12  | 41.58.30      | 1.13.13.30    | 27.59               | 48.49               |
| 13  | 40.15         | 1.12.15       | 2.41                | 4.49                |
| 14  | 39.21.20      | 1.11.45.20    | 29.31               | 53.49               |
| 15  | 37.20         | 1.10.40       | 28                  | 53                  |

_Note: Base-60 notation (e.g., 59.30 = 59 + 30/60 = 0.9916̄)_

#### Table: Decimal Format with Complete Pythagorean Triples (Demo Implementation)

**Note:** The demo uses **scaled versions** for better visualization rather than the exact tablet values. The scaling preserves the mathematical relationships while making the triples more practical for display.

All triples in format: `(long, short, diagonal)` → normalized to unit circle `(x, y)` → spread `s = y²`

| Row | Long (demo) | Short | Diagonal | Tablet (b,d)  | Spread s = y² | β = short/long | Angle (from vertical) |
| --- | ----------- | ----- | -------- | ------------- | ------------- | -------------- | --------------------- |
| 1   | 120         | 119   | 169      | (119, 169)    | **0.495798**  | 0.9917         | 44.76°                |
| 2   | 3456        | 3367  | 4825     | (3367, 4825)  | **0.487042**  | 0.9742         | 44.25°                |
| 3   | 4800        | 4601  | 6649     | (4601, 6649)  | **0.478884**  | 0.9585         | 43.79°                |
| 4   | 13500       | 12709 | 18541    | (12709,18541) | **0.469862**  | 0.9414         | 43.27°                |
| 5   | 72          | 65    | 97       | (65, 97)      | **0.449034**  | 0.9028         | 42.08°                |
| 6   | 360         | 319   | 481      | (319, 481)    | **0.439835**  | 0.8861         | 41.54°                |
| 7   | 2700        | 2291  | 3541     | (2291, 3541)  | **0.418599**  | 0.8485         | 40.32°                |
| 8   | 960         | 799   | 1249     | (799, 1249)   | **0.409231**  | 0.8323         | 39.77°                |
| 9   | 600         | 481   | 769      | (481, 769)    | **0.391235**  | 0.8017         | 38.72°                |
| 10  | 6480        | 4961  | 8161     | (4961, 8161)  | **0.369532**  | 0.7656         | 37.44°                |
| 11  | 60          | 45    | 75       | (45, 75)      | **0.360000**  | 0.7500         | 36.87° (3-4-5 × 15)   |
| 12  | 2400        | 1679  | 2929     | (1679, 2929)  | **0.328596**  | 0.6996         | 34.98°                |
| 13  | 240         | 161   | 289      | (161, 289)    | **0.310377**  | 0.6708         | 33.86°                |
| 14  | 2700        | 1771  | 3229     | (1771, 3229)  | **0.300816**  | 0.6559         | 33.26°                |
| 15  | 45          | 28    | 53       | (28, 53)      | **0.279103**  | 0.6222         | 31.89°                |

#### Table: Exact Tablet Values from Mansfield & Wildberger (2017) Table 13

For reference, the **exact values from the actual clay tablet** (as published in the academic paper):

| Row | Short (b) | Diagonal (d) | Long (l) | β = b/l | δ = d/l | δ²     |
| --- | --------- | ------------ | -------- | ------- | ------- | ------ |
| 1   | 119       | 169          | 120      | 0.9917  | 1.4083  | 1.9834 |
| 2   | 3367      | 4825         | 3456     | 0.9742  | 1.3961  | 1.9492 |
| 3   | 4601      | 6649         | 4800     | 0.9585  | 1.3852  | 1.9188 |
| 4   | 12709     | 18541        | 13500    | 0.9414  | 1.3734  | 1.8862 |
| 5   | 65        | 97           | 72       | 0.9028  | 1.3472  | 1.8150 |
| 6   | 319       | 481          | 360      | 0.8861  | 1.3361  | 1.7852 |
| 7   | 2291      | 3541         | 2700     | 0.8485  | 1.3115  | 1.7200 |
| 8   | 799       | 1249         | 960      | 0.8323  | 1.3010  | 1.6927 |
| 9   | 481       | 769          | 600      | 0.8017  | 1.2817  | 1.6427 |
| 10  | 4961      | 8161         | 6480     | 0.7656  | 1.2594  | 1.5861 |
| 11  | 45        | 75           | 60       | 0.7500  | 1.2500  | 1.5625 |
| 12  | 1679      | 2929         | 2400     | 0.6996  | 1.2204  | 1.4894 |
| 13  | 161       | 289          | 240      | 0.6708  | 1.2042  | 1.4500 |
| 14  | 1771      | 3229         | 2700     | 0.6559  | 1.1959  | 1.4302 |
| 15  | 28        | 53           | 45       | 0.6222  | 1.1778  | 1.3872 |

**Key Formula:** Given (b, d) from tablet, calculate long side: **l = √(d² - b²)**

```javascript
// BABYLONIAN PLIMPTON 322 TRIPLES (c. 1800 BC)
// Demo implementation uses scaled versions for visualization
const plimpton322Triples = [
  {
    row: 1,
    long: 120,
    short: 119,
    diag: 169,
    spread: (119 * 119) / (169 * 169),
    label: "P322-1",
  },
  {
    row: 2,
    long: 3456,
    short: 3367,
    diag: 4825,
    spread: (3367 * 3367) / (4825 * 4825),
    label: "P322-2",
  },
  {
    row: 3,
    long: 4800,
    short: 4601,
    diag: 6649,
    spread: (4601 * 4601) / (6649 * 6649),
    label: "P322-3",
  },
  {
    row: 4,
    long: 13500,
    short: 12709,
    diag: 18541,
    spread: (12709 * 12709) / (18541 * 18541),
    label: "P322-4",
  },
  {
    row: 5,
    long: 72,
    short: 65,
    diag: 97,
    spread: (65 * 65) / (97 * 97),
    label: "P322-5",
  },
  {
    row: 6,
    long: 360,
    short: 319,
    diag: 481,
    spread: (319 * 319) / (481 * 481),
    label: "P322-6",
  },
  {
    row: 7,
    long: 2700,
    short: 2291,
    diag: 3541,
    spread: (2291 * 2291) / (3541 * 3541),
    label: "P322-7",
  },
  {
    row: 8,
    long: 960,
    short: 799,
    diag: 1249,
    spread: (799 * 799) / (1249 * 1249),
    label: "P322-8",
  },
  {
    row: 9,
    long: 600,
    short: 481,
    diag: 769,
    spread: (481 * 481) / (769 * 769),
    label: "P322-9",
  },
  {
    row: 10,
    long: 6480,
    short: 4961,
    diag: 8161,
    spread: (4961 * 4961) / (8161 * 8161),
    label: "P322-10",
  },
  {
    row: 11,
    long: 60,
    short: 45,
    diag: 75,
    spread: 0.36,
    label: "P322-11 (3-4-5×15)",
  },
  {
    row: 12,
    long: 2400,
    short: 1679,
    diag: 2929,
    spread: (1679 * 1679) / (2929 * 2929),
    label: "P322-12",
  },
  {
    row: 13,
    long: 240,
    short: 161,
    diag: 289,
    spread: (161 * 161) / (289 * 289),
    label: "P322-13",
  },
  {
    row: 14,
    long: 2700,
    short: 1771,
    diag: 3229,
    spread: (1771 * 1771) / (3229 * 3229),
    label: "P322-14",
  },
  {
    row: 15,
    long: 45,
    short: 28,
    diag: 53,
    spread: (28 * 28) / (53 * 53),
    label: "P322-15",
  },
];

// Normalize to unit circle coordinates
plimpton322Triples.forEach(triple => {
  triple.x = triple.long / triple.diag; // Long side / diagonal (β ratio)
  triple.y = triple.short / triple.diag; // Short side / diagonal
  triple.spreadExact =
    (triple.short * triple.short) / (triple.diag * triple.diag); // s = (short/diag)²
});
```

### Key Properties of Plimpton 322 Triples

1. **Format**: The tablet records pairs **(b, d)** representing **(SHORT, DIAGONAL)** of right triangles
   - The LONG side is calculated via Pythagorean theorem: **l = √(d² - b²)**
   - Demo uses format: **(LONG, SHORT, DIAGONAL)** for direct visualization

2. **Ordered by ukullû (reciprocal slope)**: β = SHORT/LONG, progressively decreasing from 0.9917 to 0.6222
   - Mansfield & Wildberger identify this as the key organizing principle
   - In their paper: β²ₙ = (bₙ/lₙ)² and δ²ₙ = (dₙ/lₙ)²

3. **Spread Range**: s ranges from **0.279** to **0.496**
   - Angles: 31.89° to 44.76° from vertical (or 45.24° to 58.11° from horizontal)
   - This narrow band is **intentional** - studying specific triangle proportions

4. **Regular Numbers**: All LONG sides have form 2ᵃ×3ᵇ×5ᶜ
   - Ensures exact base-60 representation of ratios β = b/l and δ = d/l
   - No approximations needed - pure rational arithmetic

5. **Exact Sexagesimal Trigonometry**:
   - Column I' contains δ² (squared diagonal ratio) as an index
   - Columns II' and III' contain simplified values b and d
   - This allows scribes to approximate ratios b/d or d/b without division errors

6. **Historical Significance**:
   - Predates Hipparchus (credited father of trigonometry) by ~1400 years
   - World's first AND only completely exact trigonometric table
   - Shows Babylonians understood ratio-based triangle relationships without angles

7. **Limited Angular Range**: Explains visual clustering of markers
   - Not a bug - the tablet studied a specific mathematical domain
   - Demonstrates focus on practical surveying and construction angles

### Implementation Strategy: Toggle System

Add UI controls to the Quadrance demo modal for switching between triple sets:

```javascript
// Triple set toggle controls (in demo UI)
const tripleSetOptions = {
  modern: {
    label: "Modern Pythagorean Triples",
    triples: [
      { triple: [3, 4, 5], spread: 0.64 },
      { triple: [5, 12, 13], spread: 0.852 },
      { triple: [8, 15, 17], spread: 0.779 },
      { triple: [7, 24, 25], spread: 0.9216 },
    ],
  },
  plimpton322: {
    label: "Babylonian Plimpton 322 (c. 1800 BC)",
    triples: plimpton322Triples,
    color: 0xffd700, // Gold markers for historical significance
  },
  combined: {
    label: "All Triples (Modern + Babylonian)",
    triples: [...modernTriples, ...plimpton322Triples],
  },
};
```

### UI Controls Design

Add toggle buttons in the formula display area:

```
[Modern Triples] [Plimpton 322] [Combined] [Special (√2, √3, φ)]
```

- **Modern Triples**: Cyan markers (current implementation)
- **Plimpton 322**: Gold markers (historical significance)
- **Combined**: Show all snap points
- **Special**: Educational irrational cases (√2, √3, φ)

### Formula Display Enhancement

When Plimpton 322 triple is active, show additional context:

```
Column 3: Pythagorean Triple
  🏺 Babylonian (c. 1800 BC)
  Row [N] of Plimpton 322
  Triangle: (a, b, c)
  Base-60 Regular Number: 2ᵃ×3ᵇ×5ᶜ
  Spread: (b/c)² = [exact fraction]
```

### Research Citations

- [Wildberger & Mansfield (2017) - UNSW](https://www.unsw.edu.au/newsroom/news/2017/08/mathematical-mystery-of-ancient-clay-tablet-solved)
- [The Conversation - Written in Stone](https://theconversation.com/written-in-stone-the-worlds-first-trigonometry-revealed-in-an-ancient-babylonian-tablet-81472)
- Original tablet: Columbia University, Rare Book & Manuscript Library

---

## 11. Next Steps

1. ✅ Create this planning document
2. ✅ Copy `rt-Weierstrass-demo.js` → `rt-quadrance-demo.js`
3. ✅ Implement modern Pythagorean triples
4. ✅ Add unit rectangle visualization
5. ✅ Update formula display
6. ✅ Modal HTML consolidation
7. 🎯 Add Plimpton 322 triple set with toggle controls
8. 🎯 Implement triple set switching UI (Modern/Babylonian/Combined/Special)
9. 🎯 Add historical context to formula display for Babylonian triples
10. 🎯 Update documentation in ARTexplorer.md with Plimpton 322 integration

---

**Status:** Base implementation complete. Ready for Plimpton 322 toggle feature implementation.
