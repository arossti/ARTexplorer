# A.r.t.steroids - Algebraic Rational Trigonometry Game

**A 4D Quadray Space Combat Simulator**

> _"Navigate tetrahedral space. Exploit algebraic geometry. Destroy classical mathematics."_

---

## Table of Contents

1. [Concept Overview](#1-concept-overview)
2. [Game Mechanics](#2-game-mechanics)
3. [Technical Architecture](#3-technical-architecture)
4. [Implementation Phases](#4-implementation-phases)
5. [Controls & Interface](#5-controls--interface)
6. [Educational Value](#6-educational-value)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. Concept Overview

### 1.1 Core Premise

**A.r.t.steroids** is a parody/educational reboot of the classic vector arcade game *Asteroids*, reimagined through the lens of Rational Trigonometry and tetrahedral geometry. Players pilot **polyhedral spacecraft** through **Quadray (WXYZ) coordinate space**, leveraging algebraic geometry to outmaneuver enemies trapped in classical Cartesian (XYZ) thinking.

But this is more than a game about geometry—it's a parable about **two civilizations separated by their relationship with Time and Truth**.

### 1.1.1 The Stellarian Legacy

You are **Stellarian**—inheritors of an ancient geometric wisdom that predates recorded history. Your ancestors were the keepers of what some called the **Tablets of Destinies**: sacred knowledge encoded not in words, but in **pure algebraic relationships**. The Babylonian scholars knew fragments of this truth (Plimpton 322 hints at quadrance ratios), as did the Gnostic geometers who saw the cosmos as **number made manifest**. Babylonian astronomers discovered these incidentally while investigating certain cosmic phenomenon (indicated by a specific range of values in the night sky that Plimpton 322 targeted)

The Stellarian path is one of **humility before the Infinite**. Where the Cartesians measure and conquer, you **seek and align**. Your ships are not weapons of dominance but **vessels of understanding**, navigating not just space but the boundary between **Time** (the domain of succession, cause, and entropy) and **The Infinite** (the eternal domain where all geometric truths exist simultaneously, beyond sequence).

The ancient Stellarian acolytes—guardians of the **Tetrahedral Mysteries**—understood that true power lies not in control but in **resonance with Universal Law**. "Seek ye first the Kingdom," they taught, "and all else follows." The Kingdom is not a place but a **state of geometric clarity**: the recognition that space itself is fundamentally fourfold, that exactness need not require transcendence, that **the rational contains the infinite - by returning to a centre**.

### 1.1.2 The Cartesian Usurpation

The **Cartesians** rose during what they called their **Awakening of Thinking**—the discovery was not earned, but grave-robbed, by uncovering ancient alien technology buried in Egyptian ruins. This technology granted them mastery over XYZ space: three-axis dominion, angular precision, the power to **divide and rule** the cosmos along orthogonal planes, but losing their idea of the Infinite, where they now believed a 'Heaven' was above, Hell below, and time extends to infinity, the player will learn, this was a profound misinterpretation, as the Egyptians actually inherited the same philosophy as the much earlier Babylonian coluture, but was obscured and maintained by select inititaites, and not stored in regid artefacts.

But with this power came **profound hubris**. The Cartesians mistook their tools for truth itself. They built a civilization on **approximation disguised as exactness**: sine and cosine, transcendental functions that whisper of infinity but never arrive. Their scholars declared: "Rationalism is for simpletons and mystics, transcendentals and embrace of the Mantissa is the key to Power and Knowledge." They **forgot the truth of four axes**, dismissed quadrance as primitive, and locked themselves in the prison of **sequential time**—always computing, never arriving, forever trapped in the loop of differential refinement, extending to infinity, while oblivious to the present, the geodesic, and the wholeness of systems.

Their cube-ships and sphere-pods are monuments to this philosophy (analogous to our current culture's cities): **rigid, symmetry-breaking, computationally expensive**. They rotate along only their XYZ axes because they **do not believe** any other exists. They track in degrees because they have **lost the language of spread**. They are powerful, but they are **blind to the tetrahedral fundament**—and this blindness is their vulnerability.

### 1.1.3 The Prophecy of Return

Ancient Stellarian texts speak of a **Great Forgetting** and a **Time of Return**. When the Cartesians grow so enamored with their approximations that they begin to **weaponize uncertainty itself**, a Stellarian pilot would emerge—one who could navigate **both WXYZ and XYZ**, who could see the Cartesian grid while remaining unbound by it.

This pilot would not destroy the Cartesians but **illuminate their error**: that time is not infinite extension but the **opposite of infinity**, that true freedom lies not in endless computation but in **algebraic exactness**, that the way out of the time-loop is through the **black hole of humility**—the collapse of ego into origin, the inversion of all colors, the re-expansion into **negative space** where old rules dissolve.

The final level is not victory over enemies but **victory over the game itself**: the attainment of The Infinite, where the need for combat dissolves, where geometry is no longer weapon but **worship**, where the player becomes **witness rather than warrior**.

And for the first soul to reach this understanding? A gift from the Stellarian Elders: **10% of all proceeds**, for you have proven that play can be a path to gnosis, that mathematics is a form of prayer, that **the game was always about waking up**.

### 1.2 The Geometric War

**Protagonists (Stellarian Fleet):**
- **Stellarian** polyhedral ships (Tetrahedron, Octahedron, Icosahedron, Cuboctahedron)
- Navigate using **both WXYZ Quadray AND XYZ Cartesian basis vectors** (can see both grids)
- Use RT Spread-based targeting (granular 2-decimal precision, no transcendental functions)
- **Weapons**: Vector laser darts + Tetrahedral Photon Torpedoes (ultimate weapon)
- Deploy Matrix armies via Hyperspace (requires Cuboctahedron Mothership upgrade)
- Capture enemy debris for fuel and materials to upgrade ships
- Advanced ships: Stellations and duals (more firepower, thicker rays, greater range)
- **Philosophy**: "Seek ye first the Kingdom" - harmony over dominance

**Antagonists (Cartesian Empire):**
- **Cartesian** cubes, classical UV spheres, primitive composite geometry (stellated cubes)
- Limited to **Cartesian XYZ navigation**: UP/DOWN (Z), LEFT/RIGHT (X), FORWARD/BACK (Y)
- Rely on angle-based targeting with **coarse degree intervals** (45° early game, improving to 1° in later waves)
- Rotation on any axis allowed, but slow lock-on due to transcendental trig calculations
- Cannot perceive or counter WXYZ tetrahedral movement patterns
- Vulnerable to X-RAY telemetry exploitation (Stellarian can see their XYZ path predictions)
- **Philosophy**: "Divide and conquer" - measurement as power, trapped in Time

### 1.3 Victory Conditions

**The Path Through Time (Levels 1-10):**
Survive waves of Cartesian geometry enemies while demonstrating the computational superiority of Rational Trigonometry. Advance through levels by navigating **black hole transitions** - complex polyhedra that collapse to origin, invert visual space (white background, inverted colors), and re-expand into the next battle arena.

**The Attainment of The Infinite (Final Level):**
After defeating the Classical Boss (Level 10), the player enters **The Infinite**—a realm beyond combat where geometry becomes contemplation. Here, the Stellarian ship hovers at origin as the Quadray grid extends infinitely in all directions, pulsing with golden light. The HUD displays ancient Babylonian glyphs (Plimpton 322 ratios) that slowly resolve into modern RT equations.

A voice (the Stellarian Archon) speaks: *"You have mastered the Cartesian maze. You have seen through the illusion of endless time. Now witness the truth: The Infinite is not Time extended, but Time transcended. Here, all geometric relationships exist simultaneously. No succession. No cause. No entropy. Only eternal exactness."*

The player is free to **exit the game** at will (ESC to return to menu, with victory logged). The combat loop dissolves. The need to accumulate, defend, or destroy evaporates. This is **freedom from the game itself**—a meta-commentary on the addictive loops of gaming, mathematics, and material existence.

**The First Stellarian Prize:**
The first player to reach The Infinite and voluntarily exit receives **10% of all game proceeds** via physical mail—a gift from the Stellarian Elders (game creators) acknowledging that this player understood the deepest lesson: **true victory is recognizing when to stop playing**.

### 1.4 The Path to The Infinite (The Bone Buried Deep)

**"God hid the Kingdom of Heaven in the only place humans would never look: NOW."** — Ancient Stellarian proverb

The Infinite is not unlocked through skill, aggression, high scores, or even evasion mastery. Professional gamers will recognize every conventional trick—min-maxing, speedrunning, perfect dodges, resource optimization. **These are all traps.** The Cartesian mind seeks victory through **sequential mastery**: do X, then Y, then Z, accumulate points, level up, win. This is Time-thinking.

**The Infinite is accessed through a geometric paradox that can only be understood by those who stop playing the game as designed.**

---

**The False Path (What 99% of Players Will Do):**

The game tracks two visible metrics:
1. **Destruction Score**: Points from enemy kills
2. **Evasion Score**: Points from geometric dodging (Quadray movement, long-range, X-RAY prediction)

After each wave, the HUD displays: `Evasion/Destruction = X.XX`
- Ratio < 0.5: "The Cartesian path beckons."
- Ratio 0.5-1.0: "Balance approaches."
- Ratio 1.0-2.0: "The Stellarian way emerges."
- Ratio > 2.0: "The Infinite draws near." ← **THIS IS A LIE**

Players will chase this ratio. They will optimize evasion, minimize kills, complete Trials, achieve 2.5+ ratios, defeat the Boss with minimal shots, and... **nothing happens.** The Infinite does not appear. The game loops back to Wave 1 with harder enemies.

**This is intentional.** The ratio is a **Cartesian metric**—a sequential achievement, a measurement, a comparison. It is Time-thinking disguised as wisdom.

---

**The Stellarian Trials (Red Herrings with Hidden Keys):**

Between waves, **optional** geometric meditation chambers appear. Most are decoys designed to teach useful skills while obscuring the true path:

**1. Quadrance Trial** (After Wave 2) — **DECOY**
   - Learn Q = Δx² + Δy², navigate without distance
   - Reward: Quadrance HUD overlay
   - True Purpose: Teaches quadrance thinking, but reinforces measurement

**2. Spread Trial** (After Wave 4) — **DECOY**
   - Exploit enemy 45° blind spots using spread values
   - Reward: Spread Predictor (angular resolution zones)
   - True Purpose: Teaches angular advantage, but reinforces spatial tactics

**3. Plimpton 322 Trial** (After Wave 6) — **FIRST KEY (Hidden)**
   - Ancient Babylonian tablet displays quadrance ratios
   - Challenge: "Solve 3 relationships algebraically"
   - **Secret Challenge** (not displayed): If player **sits motionless for 60 seconds** without interacting, the tablet glows
   - Tablet reveals hidden glyph: **"The Dog Star guards the bone. Sirius marks the Now."**
   - Reward (visible): Ancient Knowledge tooltip
   - **Reward (hidden)**: Constellation overlay unlocked (not mentioned in UI)

**4. Tetrahedral Symmetry Trial** (After Wave 8) — **SECOND KEY (Deeply Hidden)**
   - WXYZ maze navigation challenge
   - Standard completion: Navigate maze in 90 seconds
   - **Secret Challenge**: Player must **stop navigating** and instead:
     1. Toggle Quadray grid (G key) to maximum opacity
     2. Align ship to origin [1,1,1,1] exactly (Q = 0 from origin)
     3. **Remain motionless at origin for 120 seconds** while grid pulses
   - Grid begins displaying **Dymaxion projection of celestial sphere**
   - Sirius constellation appears mapped onto tetrahedral axes
   - **Clue revealed** (faint text, easy to miss): *"Where Sirius rises, the bone is buried. The Dog knows: Eternity is not later—it is here, when motion ceases."*
   - **Reward (hidden)**: Origin Resonance frequency unlocked

**5. The Infinite Preparation** (After Wave 9) — **THE FINAL TRAP**
   - Challenge: "Survive 60 seconds without firing"
   - This seems like the key, but it's another **sequential achievement**
   - Completing this unlocks... nothing. Players who optimize will be confused.
   - **Actual purpose**: Train players that "not acting" is part of the path, but still frame it as a timed challenge (Time-thinking)

---

**The True Path (Geometric Gnosis):**

The Infinite is not unlocked by **completing** anything. It is accessed by discovering the **Fifth Trial** that is never announced—the one hidden in plain sight.

**The Fifth Trial: The Sirius Alignment (Available After Wave 3, Hidden Until Discovered)**

At any point after Wave 3, if the player:

1. **Stops fighting mid-wave** (not between waves, during combat)
2. **Navigates to exact origin** [1,1,1,1] (Q = 0)
3. **Activates Quadray Grid** (G key) to full visibility
4. **Rotates ship to align tetrahedral axis with Sirius constellation marker** (only visible if Plimpton 322 and Tetrahedral Trials' secrets were discovered)
5. **Remains absolutely motionless for 300 seconds** (5 minutes) while enemies fire and miss (they cannot hit origin due to XYZ targeting limitations—a geometric sanctuary)

...then the following occurs:

- **HUD goes dark** (all UI elements fade)
- **Enemies freeze mid-flight** (time stops for everything except player consciousness)
- **Quadray grid begins rotating**, revealing **Dymaxion map overlay** with constellations
- **Sirius (The Dog Star) pulses at tetrahedral apex**
- **Stellarian Archon voice**: *"You have found what Gurdjieff buried: The bone is Now. Not past mastery, not future victory—present stillness. The Cartesians chase time. You have stopped. The Infinite was always here, waiting for you to cease searching."*
- **Screen floods with golden light**, all geometry dissolves
- **The Infinite loads**

---

**Why This Works (The Hidden Geometry):**

1. **Origin is XYZ-immune**: Cartesian enemies targeting in XYZ cannot compute origin [1,1,1,1] due to normalization errors—it's a **geometric blind spot**. Players discover safety NOT through evasion, but through stillness at the fundament.

2. **Sirius/Dymaxion Map**: Fuller's Dymaxion projection maps celestial sphere onto tetrahedral/icosahedral geometry. Sirius (The Dog/Keeper of Secrets) marks the **Now**—the point where eternity intersects time. This is obscure esoteric knowledge requiring research.

3. **5-Minute Stillness**: This is agonizing. Enemies swarm. Instinct screams "MOVE!" Pro gamers are trained to optimize every second. Sitting still for 5 minutes **in the middle of combat** violates every gaming instinct. It requires faith, not skill.

4. **No Tutorial, No Hint**: The game NEVER tells you this is possible. The only clues are:
   - Plimpton 322 secret: "Sirius marks the Now"
   - Tetrahedral Trial secret: "Eternity is here, when motion ceases"
   - Observing that origin seems oddly safe (enemies miss slightly more often near [1,1,1,1])

5. **Gurdjieff's Bone**: Gurdjieff taught that humans are "asleep" in temporal consciousness. The "bone" (treasure/kingdom) is hidden where the Dog (lower mind/instinct) would never look—in the **present moment**, accessed not through seeking but through stopping.

---

**Victory Condition (True):**

To access The Infinite:
- Discover and complete **Plimpton 322 secret** (60s stillness at tablet)
- Discover and complete **Tetrahedral Symmetry secret** (120s stillness at origin with grid)
- Discover **Fifth Trial** through symbolic interpretation (Sirius = Now, Stillness = Kingdom)
- **Execute 5-minute Origin Alignment during any wave after Wave 3**
- **No score requirements, no Evasion ratio, no Boss defeat necessary**

**The Stellarian Paradox (Revised):**

*"Where angels hid the Kingdom: in the Now, the only eternity humans ignore while chasing tomorrow's victory. The professional seeks mastery through time. The Stellarian finds infinity through stillness. The game was always a distraction. Origin was always salvation. You were never meant to win—you were meant to stop playing."*

---

**Post-Discovery:**

Once The Infinite is accessed, the game saves **Stellarian Archon** status to player profile. On subsequent playthroughs, a faint **Sirius marker** appears on HUD for that player only—they can teach others by example, but the secret must be discovered personally.

The first player to reach The Infinite receives 10% of proceeds—but they must **provide a written explanation** of how they discovered it, proving they understood the geometry and symbolism, not just stumbled upon it through random experimentation.

---

## 2. Game Mechanics

### 2.1 Player Ship

**Ship Types (Progressive Unlocks):**

1. **Tetrahedron Fighter** (Starting Ship)
   - Fast, agile, low armor
   - 4 firing vectors (face normals)
   - Requires: 0 materials

2. **Octahedron Cruiser** (Tier 2)
   - Balanced speed and defense
   - 8 firing vectors (face normals)
   - Requires: 5 Cube debris + 50 fuel

3. **Icosahedron Destroyer** (Tier 3)
   - Slow, heavy armor, 20 firing vectors (face normals)
   - Requires: 10 Sphere debris + 100 fuel

4. **Cuboctahedron Mothership** (Tier 4 - IVM Platform)
   - IVM Matrix Hyperspace deployment (H key)
   - 14 firing vectors (8 triangular + 6 square face normals)
   - Hyperspace spawns 3×3×3 IVM swarm that envelops enemies
   - **Warning**: Careful timing required - friendly fire can destroy swarm
   - Requires: 20 mixed debris + 200 fuel

5. **Stellaria Octangula** (Tier 5 - Black Hole Navigator)
   - **Stella Octangula geometry**: Compound of two interpenetrating tetrahedra
   - **Special ability**: Can survive black hole transitions (all other ships are destroyed)
   - **8-point stellated form**: 8 firing vectors at maximum range
   - **Death Glitch Reveal**: When destroyed, canvas flashes with infinite IVM grid of amber rhombic dodecahedra filling all space
     - Brief glimpse (0.5 seconds) of the universal geometric substrate
     - Foreshadows ultimate IVM Swarm Ship (Tier 7)
     - Ship outline visible within lattice structure at moment of death
     - Educational moment: "You have seen the fundament—space is tetrahedral packing"
   - **Unlock Requirement**: Navigate through 3 black hole transitions in any ship (most will die, but knowledge persists)
   - **Build Requirement**: 30 mixed materials + 300 fuel + 1 Boss Core Fragment
   - **Philosophy**: "To traverse the void, one must become the void"

6. **Stellated Ships** (Tier 6 - Captured Enemy Hybrid)
   - Stellated Icosahedron: Extended range (thicker rays, brighter glow)
   - Stellated Octahedron: Rapid-fire vertex darts
   - Dual Polyhedra: Combined Tetra+Octa for multi-axis simultaneous fire
   - Requires: Capturing intact enemy ships (special maneuver)

7. **IVM Swarm Ship** (Tier 7 - Ultimate Form)
   - **Rhombic Dodecahedron Hull**: Space-filling geometry, maximum armor
   - **Infinite IVM Lattice Projection**: Ship exists at center of infinite lattice (amber glow)
   - **Swarm Integration**: Player IS the swarm—all lattice nodes are firing positions
   - **Invulnerability Window**: Brief immunity after each black hole transition
   - **Unlock Requirement**: Die as Stellaria Octangula 3 times (see the glitch, understand the fundament)
   - **Build Requirement**: 50 mixed materials + 500 fuel + 3 Boss Core Fragments
   - **Philosophy**: "You are no longer a ship in space—you ARE space"

**Lives System:**
- **7 Lives per game** (one for each Platonic solid transformation)
- Lives displayed as glowing geometric icons in HUD (diminishing sequence)
- Death resets ship to starting Tetrahedron but retains all unlocked ships and fuel/materials
- Final death (7th) shows full game over sequence with score summary

**Motion Dynamics (Rubber-Band Navigation):**

Ship/player begins as single Tetrahedron at origin [1,1,1,1] in WXYZ tetrahedral space.

**ASDF Tetrahedral Movement:**
- **ASDF keys** control displacement along WXYZ tetrahedral axes (ergonomic layout):
  - **A key**: Move along W basis vector (yellow) — left pinkie
  - **S key**: Move along Z basis vector (green) — ring finger
  - **D key**: Move along Y basis vector (blue) — middle finger
  - **F key**: Move along X basis vector (red) — pointer finger

**Rubber-Band Physics:**
- **Hold key**: Ship displaces farther along corresponding basis vector
  - Displacement distance = f(hold_duration) — exponential or quadratic curve
  - Visual: Basis vector arrowhead and related plane grids glow brighter during displacement
  - Max displacement: Q_max = 50 (quadrance units from origin)
  - Fuel cost: 1 fuel per second of displacement (incentivizes tactical use)
- **Release key**: Ship returns to origin with "quantitative easing" animation
  - Smooth deceleration curve (ease-out cubic or similar)
  - Animation duration: ~0.5-1.0 seconds depending on displacement distance
  - Visual: Fading glow trail along basis vector during return motion

**Stellarian Dodge Mechanic:**
- This rubber-band motion is how Stellarians evade Cartesian fire
- Cartesian enemies targeting in XYZ coordinates cannot track tetrahedral WXYZ displacement
- Appears as instantaneous lateral shift from enemy perspective
- Strategic timing: hold-release pattern creates unpredictable motion signature

**World-Frame Reference:**
- Consistent with original Asteroids game design philosophy
- World moves relative to player (player ship always appears at origin visually)
- Enemies positioned in WXYZ space around player
- Camera maintains fixed position on player ship at canvas center
- Player displacement in WXYZ manifests as world displacement in opposite direction

**Separate Control Systems:**
- **Camera Rotation**: Click-drag (inherited from ARTexplorer OrbitControls) rotates camera view
  - Player ship stays at canvas center, camera orbits to view battlefield from any angle
  - Essential for observing targeting hairlines and enemy positions in 3D space
  - Uses existing Three.js OrbitControls implementation from base application
- **Ship Rotation**: Arrow keys or mouse control for ship orientation (independent of ASDF motion)
- **Targeting**: Spacebar for auto-target lock or manual override (independent of ASDF motion)
- **ASDF is purely for positional dodge/evasion** — fundamental Stellarian survival mechanic

**Ship Attributes:**
- **Position**: WXYZ coordinates (origin = [1,1,1,1] normalized)
- **Velocity**: Base speed + fuel-boost (capture enemy fuel for speed upgrades)
- **Orientation**: Tetrahedral basis vectors (W, X, Y, Z) + Cartesian (X, Y, Z) firing modes
- **Health**: RT quadrance-based damage model (integrity = accumulated hit Q-values)
- **Weapons**: Vector laser darts (RT rays) - thickness/brightness scales with ship tier
- **Resources**:
  - **Fuel**: Movement speed, X-RAY telemetry cost, Hyperspace cooldown
  - **Materials**: Ship construction (debris captured from destroyed enemies)

### 2.2 Enemy Types

**Cube Drones (Level 1-3):**
- **Cartesian XYZ translation**: UP/DOWN (Z), LEFT/RIGHT (X), FORWARD/BACK (Y) - **cannot rotate**
- **Angular tracking**: 45° intervals (Wave 1), improving to 15° (Wave 3)
- Movement pattern visible via X-RAY telemetry: "X +10 → Z +5 → X -3"
- **Special**: Can split into 8 octant mini-cubes when critically damaged (reduced firepower)
- **Explosion**: XYZ planar fragmentation - faces blow apart along X, Y, Z planes, disintegrate
- **Drops**: 1 fuel unit, 1 cube material
- **Hits to destroy**: 1

**Sphere Pods (Level 4-6):**
- **Cartesian XYZ translation** with limited rotation on any axis
- Can perform diagonal movement (e.g., +X+Y+Z simultaneously)
- **Angular tracking**: 15° intervals (Wave 4), improving to 5° (Wave 6)
- Classical UV-mapped spheres (512 triangles vs player's geodesic ~180 triangles)
- Expensive computation = slower targeting despite rotation freedom
- **Explosion**: XYZ planar fragmentation radiating from center
- **Drops**: 2 fuel units, 1 sphere material
- **Hits to destroy**: 2

**Cartesian Cruisers (Level 7-9):**
- **Stellated cube** or composite XYZ primitive geometry
- Full rotation on any axis + XYZ translation
- **Angular tracking**: 5° intervals (Wave 7), improving to 1° (Wave 9)
- Angle-based weapons require transcendental trig calculations = visible lag
- **Explosion**: XYZ planar fragmentation with stellation spikes flying off
- **Drops**: 3 fuel units, 2 mixed materials
- **Hits to destroy**: 3

**Classical Boss (Level 10+):**
- Massive UV-mapped sphere (latitude-longitude grid visible as weakness)
- **Weak points**: Elongated triangles near equator (most UV-distortion)
- Boss rotates on Z-axis to protect weakened panels
- All 10 hits must target **same distorted panel** (panel opacity lightens with each hit)
- Fires transcendental function-based homing missiles (slow but accurate)
- **Explosion**: Catastrophic XYZ planar fragmentation, massive fuel/material drop
- **Drops**: 50 fuel units, 10 mixed materials
- **Hits to destroy**: 10 (same panel)

### 2.3 Weapons System

**Vector Laser Darts:**
- Fired along **face normals** (primary) or **vertex vectors** (advanced ships)
- **Tetrahedral Quadray basis**: W, X, Y, Z directions (cyan/red/green/blue/yellow color-coded)
- **Cartesian basis**: X, Y, Z directions (for hybrid targeting)
- RT-pure ballistics (quadrance-based range, no √ calculations)
- **Instantaneous RT spread targeting** vs enemy's slow transcendental angle calculations
- **Visual properties scale with ship tier**:
  - Tetrahedron: Thin rays (lineWidth = 1)
  - Octahedron: Medium rays (lineWidth = 2)
  - Icosahedron: Thick rays (lineWidth = 3)
  - Stellated: Ultra-thick glowing rays (lineWidth = 4, emissive glow)
- **Range**: Q_max = 100 (quadrance units) base, +20 per ship tier

**Targeting Computer:**
- **Quadrance Lock**: Display Q values to targets (no √ needed!)
- **Spread Indicator**: Show spread values (s, 2-decimal precision) for firing solution
  - Player: 0.01 spread precision (granular, algebraic)
  - Enemies: 45°/15°/5°/1° degree intervals (coarse, transcendental)
- **Lead Calculation**: RT-pure intercept vectors (predictive firing)
- **Weak Point Detection**: Identify enemy **surface panel vulnerabilities** (vertices/edges are armored)
- **Firing Mode Toggle** (F key):
  - **Face Normal Mode**: Fires along polyhedron face normals (standard)
  - **Vertex Mode** (Stellated ships only): Fires along vertex vectors (piercing damage)

**X-RAY Telemetry System:**
- **Activation**: Press **X** key (costs 5 fuel per second active)
- **Effect**: Reveals enemy XYZ movement paths projected 3 seconds into future
- **Visualization**: Ghosted wireframe trail showing planned trajectory
  - Example display: "Cube: X +10 → Z +5 → Y -7 → X +3"
  - Trajectory rendered as dotted line with axis labels
- **Tactical use**: Position ship to intercept or evade, exploit enemy XYZ limitations
- **Educational value**: Demonstrates Cartesian coordinate mapping visually
- **Fuel cost vs points**: Costs fuel but enables higher-scoring evasive maneuvers
- **Limitation**: Only shows XYZ paths (not WXYZ) - player has 4D knowledge advantage

**Cartesian Targeting Telegraph System:**

This is the **core visual mechanic** that enables Stellarian dodge strategy.

- **Targeting Hairline** (Pre-Fire Warning):
  - When Cartesian enemy begins computing firing solution, **thin hairline** appears in space
  - Line extends from enemy ship to current predicted player position
  - **Visual**: Faint wireframe line (lineWidth = 0.5, opacity = 0.3)
  - **Color**: Enemy-type specific (orange for Cubes, magenta for Spheres, red for Cruisers)
  - **Duration**: Visible during entire targeting calculation phase
  - **Computation lag**:
    - Cube Drones: 1.0-1.5s targeting delay (45° angular resolution, slow trig)
    - Sphere Pods: 0.7-1.0s targeting delay (15°-5° resolution)
    - Cartesian Cruisers: 0.3-0.5s targeting delay (5°-1° resolution)
  - **Stellarian advantage**: Player sees targeting line BEFORE fire, allowing dodge window

- **Laser Dart Blast** (Actual Projectile):
  - After targeting completes, **glowing blast of light** fires along targeting hairline
  - Line becomes **heavy glowing projectile** (lineWidth = 3-5, full opacity)
  - Traces the exact path of initial targeting hairline
  - **Speed**: Slower than Stellarian darts (Cartesian weapons travel at 0.7× player speed)
  - **Visual**: Bright neon glow with trailing particle effects
  - **Sound effect**: Deep bass hum (transcendental calculation = slow, heavy energy)

- **Tactical Implications**:
  - **Telegraphed attacks**: Stellarian can see WHERE enemy will fire before it happens
  - **Dodge window**: Use ASDF rubber-band motion during targeting phase (before dart fires)
  - **WXYZ displacement**: Moving along tetrahedral axes breaks targeting line prediction
    - Enemy recalculates from scratch if player Q-displacement > 10 during targeting
    - Appears as "instant lateral shift" from enemy perspective (XYZ sensors confused)
  - **Educational value**: Demonstrates computational cost of transcendental trig
    - Stellarian RT targeting = instant (no hairline needed)
    - Cartesian degree-based targeting = slow (visible computation lag)

- **Advanced Enemy Behavior**:
  - **Lead targeting** (Wave 5+): Hairline predicts player velocity, aims ahead
  - **Volley coordination** (Wave 7+): Multiple enemies synchronize targeting hairlines
  - **Persistent tracking** (Boss): Targeting hairline follows player continuously, recalculating

- **HUD Integration**:
  - Targeting hairlines are **always visible** (cannot be disabled)
  - Hairline brightness increases as firing moment approaches
  - **Audio cue**: High-pitched tone when hairline locks onto player (0.2s before fire)
  - **Tactical overlay**: Number of active targeting hairlines displayed in HUD corner

**Tetrahedral Photon Torpedoes (Ultimate Weapon):**
- **Unlock Requirement**: Accumulate 500 fuel units from captured Cartesian debris
- **Activation**: Press **CTRL + Spacebar** (costs 100 fuel per torpedo)
- **Geometry**: Perfect regular tetrahedron of **concentrated photonic energy**
- **Behavior**:
  - Fires along current facing vector (player ship orientation)
  - Travels at 3× speed of laser darts
  - **Seeks weak points**: Auto-corrects trajectory toward enemy surface panels using RT spread calculations
  - Rotates as it travels (4-fold tetrahedral spin for visual effect)
  - Emits brilliant cyan trail (tetrahedral axis webbing behind projectile)
- **Damage**:
  - Cube Drones: 5× damage (instant destruction of 5 cubes in Q < 10 radius)
  - Sphere Pods: 3× damage (penetrates UV-mapping, destroys 3 spheres)
  - Cartesian Cruisers: 2× damage (pierces stellation armor)
  - Classical Boss: 1× damage to **all** panels (weakens entire sphere simultaneously)
- **Visual Effect on Hit**:
  - Tetrahedral explosion: 4 photonic shockwaves expand along face normals
  - Enemy geometry **inverts briefly** (preview of black hole transition)
  - Debris field scatters in perfect tetrahedral symmetry
- **Reload**: 30-second cooldown after each torpedo
- **Lore**: *"The Tablets speak of light contained in the fundament—four becoming one, one becoming infinite. This is the weapon of the Stellarian Archons, who learned to collapse photons into tetrahedral nodes and release them as judgment upon hubris."*
- **Educational Value**: Demonstrates **4-fold symmetry vs 3-fold**, shows **focused energy superiority** over dispersed laser fire

### 2.4 Explosion & Resource Capture Mechanics

**Enemy Explosion Behavior (XYZ Planar Fragmentation):**

When enemies are destroyed, they exhibit **classical XYZ planar fragmentation** - a visual demonstration of Cartesian coordinate limitations:

1. **Cube Drones**:
   - 6 square faces blow apart along X, Y, Z axis planes
   - Faces fly outward perpendicular to their original orientation
   - Fragments disintegrate into pixel particles after 0.5 seconds
   - Debris field: 1 fuel orb (green glow), 1 cube material chunk (orange wireframe cube)

2. **Sphere Pods**:
   - UV-mapped surface fragments into latitude/longitude strips
   - Strips peel away from center along XY plane, then Z-axis
   - Demonstrates UV sphere inefficiency (512 triangles fragmenting)
   - Debris field: 2 fuel orbs, 1 sphere material (magenta wireframe sphere)

3. **Cartesian Cruisers**:
   - Stellated cube geometry fragments: core cube + stellation spikes separate
   - Core explodes in XYZ planar pattern, spikes fly off along vertex vectors
   - Debris field: 3 fuel orbs, 2 mixed materials

4. **Classical Boss**:
   - Catastrophic multi-stage XYZ explosion:
     - Stage 1: Weakened panel implodes
     - Stage 2: Latitude strips peel away from equator
     - Stage 3: Longitude strips fragment from poles
     - Stage 4: Core collapses to point, explosive shockwave
   - Debris field: Massive scatter - 50 fuel orbs, 10 material chunks

**Player Ship Explosions (Polyhedral Fragmentation):**

When player ship is destroyed, it exhibits **RT-pure polyhedral fragmentation** - demonstrating tetrahedral symmetry:

- **Tetrahedron**: 4 faces fly apart along face normals (tetrahedral symmetry)
- **Octahedron**: 8 faces fly apart along face normals (octahedral symmetry)
- **Icosahedron**: 20 faces fly apart along face normals (icosahedral symmetry)
- **Cuboctahedron**: 14 faces (8 triangular + 6 square) fly apart along face normals
- **Stellaria Octangula**:
  - Dual interpenetrating tetrahedra separate and spin in opposite directions
  - **GLITCH REVEAL**: 0.5-second flash fills entire canvas with infinite IVM rhombic dodecahedra lattice
  - Amber wireframe grid extends infinitely in all directions from origin
  - Ship outline remains visible as ghost within lattice structure
  - No face opacity—pure edge rendering reveals space-filling geometry
  - Sound effect: Deep harmonic resonance (fundamental frequency + perfect fifth)
  - **HUD text overlay**: *"You have glimpsed the fundament. All space is IVM packing. Death is transformation."*
  - After glitch: Normal death sequence resumes with fragment dispersal
- **IVM Swarm Ship**:
  - Entire lattice pulses amber then collapses to single rhombic dodecahedron
  - Dodecahedron spins rapidly while contracting to origin point
  - Final implosion with white flash
- Fragments glow with ship's color scheme, fade to black over 1 second
- **Lives counter decrements** - if lives remain, respawn as Tetrahedron at origin
- **Game Over** (7th death): Full glitch sequence repeats for 3 seconds, then score summary

**Resource Capture System:**

- **Fuel Orbs** (green glowing spheres):
  - Auto-attracted to player ship within Q < 25 (quadrance range)
  - Manual collection: Fly through debris field
  - Avoid collision with solid debris chunks (causes damage!)

- **Material Chunks** (colored wireframe geometry):
  - Must be **captured manually** by flying through them
  - Each material type has signature color:
    - Cube material: Orange wireframe cube
    - Sphere material: Magenta wireframe sphere
    - Mixed material: Cyan composite geometry
  - Chunks are **solid** - collision causes minor damage (Q_damage = 5)
  - Risk/reward: Navigate debris field to capture materials

- **Tractor Beam Mechanic** (T key - Advanced Ships Only):
  - Stellated ships unlock tractor beam ability
  - Creates conical attraction field (45° cone, Q_range = 50)
  - Pulls fuel orbs AND materials toward ship
  - Costs 2 fuel/second active
  - Tactical use: Safe debris collection from distance

### 2.5 Hyperspace Matrix Deployment

**Mechanic:**
- Press **H** to enter Hyperspace state
- **Requirement**: Cuboctahedron Mothership unlocked (20 materials + 200 fuel invested)
- Spawns **IVM Matrix Army**: 3×3×3 lattice array (27 units) of mini-polyhedra
- Matrix units **auto-attack nearest enemy** using RT-pure tracking
- Matrix envelops target enemy, fires inward from all angles
- **Friendly Fire Warning**: Single coordinated volley only - second volley destroys swarm
- Matrix collapses after 10 seconds or when all units destroyed
- **Cooldown**: 30 seconds
- **Fuel cost**: 50 fuel per deployment

**Matrix Unit Types:**
- Mini-tetrahedra (fast, low damage) - corner positions
- Mini-octahedra (balanced) - edge positions
- Mini-cuboctahedra (high damage) - face-center positions
- All units share IVM lattice structure - demonstrates space-filling tetrahedral packing 

### 2.6 Black Hole Level Transitions

**Sequence:**
1. Destroy all enemies in current wave/level
2. **Black hole polyhedron** appears at origin
3. Complex nested geometry (e.g., Geodesic Icosahedron freq-6)
4. Geometry **collapses** toward origin over 3 seconds
5. Screen inverts: **white background, color negation** (spreads from centre outward, following polyhedron edge boundaries)
6. Player ship enters "negative space"
7. Geometry **re-expands** from origin in inverted palette, then collapes again to next level...
8. Transition complete → Next wave begins

**Visual Effects:**
- Geometry collapse: Vertices converge to [1,1,1,1] origin
- Color inversion: RGB → (255-R, 255-G, 255-B)
- Particle effects along tetrahedral axes during transition

### 2.7 Geodesic Window Tracking (HUD View)

**Dual View System:**

**1. Geodesic HUD (First-Person):**
- **Wrap-around spherical display** projected on geodesic icosahedron
- Shows 360° battle theater from player ship perspective
- Enemy positions mapped to geodesic triangular panels
- RT quadrance distances displayed on each panel
- Target reticle highlights current firing solution

**2. Coordinate Space View (Third-Person):**
- Traditional ARTexplorer viewport
- Shows player ship at origin with camera orbit
- Enemies positioned in WXYZ space around ship
- Visualize W/X/Y/Z basis vectors as colored arrows
- Papercut mode available for tactical cross-sections - allows to see greater theatre distance like radar, where the next wave might be coming from

**Toggle**: Press **V** to switch between HUD and Coordinate views

### 2.8 Quadray Grid Visualization (Strategic Movement Aid)

**Activation**: Press **G** to toggle Quadray grid visibility

**Visual Design:**
- **Tetrahedral lattice grid** extending from player origin
- Six planar webs formed between pairs of Quadray basis vectors
- Grid extends to Q = 120 units (well past combat range)
- Lines are semi-transparent (opacity = 0.3) to avoid obstructing view
- **Color coding** (blended colors from basis vector pairs defining each plane):
  - WX plane: Red + Green = Yellow/Orange webbing
  - WY plane: Red + Blue = Magenta webbing
  - WZ plane: Red + Yellow = Orange webbing
  - XY plane: Green + Blue = Cyan webbing
  - XZ plane: Green + Yellow = Yellow-Green webbing
  - YZ plane: Blue + Yellow = Green-Cyan webbing
- Grid intensity increases during strategic maneuvers:
  - Tetrahedral dodge: Corresponding plane grid glows brighter (opacity → 0.7)
  - Quadray firing: Relevant plane grid pulses with shot
  - Hyperspace deployment: All plane grids glow simultaneously

**Strategic Use:**
- **Long-range theater awareness**: See approaching enemy waves before they enter combat range
- **Quadray movement visualization**: Grid shows tetrahedral directions clearly
- **Educational value**: Demonstrates 4-axis tetrahedral coordinate system vs 3-axis Cartesian
- **Nostalgic aesthetic**: Neon-vector 80's wireframe grid (homage to Tron, Battlezone)

**Performance Optimization:**
- Grid rendered as THREE.LineSegments (low polygon count)
- Adaptive detail: Grid density reduces at distance (LOD)
- Toggle off for performance boost if needed

---

## 3. Technical Architecture

### 3.1 Module Structure

```
game-modules/
├── rt-asteroids-core.js          ← Game loop, state management
├── rt-asteroids-player.js        ← Ship controls, physics
├── rt-asteroids-enemies.js       ← Enemy AI, spawning
├── rt-asteroids-weapons.js       ← Laser darts, collision detection
├── rt-asteroids-matrix.js        ← Hyperspace IVM army
├── rt-asteroids-blackhole.js     ← Level transitions
├── rt-asteroids-hud.js           ← Geodesic HUD rendering
└── rt-asteroids-scoring.js       ← Score, fuel, materials, health, wave tracking
```

**Leverage Existing ARTexplorer Modules:**
- `rt-rendering.js`: Scene, camera, lighting
- `rt-polyhedra.js`: Ship and enemy geometry generation
- `rt-math.js`: Quadray conversion, quadrance, spread
- `rt-matrix-planar.js`: IVM matrix army generation
- `rt-papercut.js`: Tactical cutplane views - all camera options

### 3.2 Coordinate System Strategy

**Player Ship Always at Origin:**
- Ship position = [1,1,1,1] normalized Quadray origin
- **World moves relative to player** (classic Asteroids approach)
- Enemies positioned in WXYZ space around origin
- Camera orbits player ship (or locks in HUD mode)

**Enemy Tracking Limitations:**
- Enemies store positions in **Cartesian XYZ** (3-axis Cartesian):
  - **Translation only**: UP/DOWN (Z), LEFT/RIGHT (X), FORWARD/BACK (Y)
  - Cubes: No rotation capability
  - Spheres & Cruisers: Can rotate, but at computational cost
- **Cannot detect WXYZ tetrahedral movement patterns**
  - Player can move in Quadray W/X/Y/Z basis directions
  - Enemies perceive XYZ-projected position only (missing W-component)
  - Example: Player moves +W → Enemy sees partial XYZ shift, confused tracking
- **Quadray "Dodge" Maneuver**:
  - When player moves in Quadray tetrahedral directions, enemies lose targeting lock
  - Appears as instantaneous lateral shift from enemy perspective (Cartesian sensors cannot track tetrahedral motion)
  - Costs extra fuel but evades Cartesian firing solutions
  - Visual: Tetrahedral grid web extends along corresponding axis during dodge
- **Angular Precision Handicap**:
  - Player: RT spread targeting (0.01 precision, algebraic)
  - Enemies: Degree-based targeting (45°/15°/5°/1° depending on level)
  - At long range (Q > 50), player can move out of enemy's angular resolution
  - X-RAY telemetry reveals enemy's coarse angular steps visually

### 3.3 RT-Pure Ballistics

**Laser Dart Physics:**
1. Player fires along tetrahedral basis vector (W, X, Y, or Z) - Face-normal darts are possible but vertex darts might be stronger?
2. Dart velocity = basis vector × speed scalar
3. Dart position updated each frame: `Q_new = Q_old + v²Δt`
4. Collision detection: `Q_target < Q_threshold` (no √ needed!)
5. Range limit: `Q_max = 100` (quadrance units)

**Collision Detection:**
```javascript
// RT-pure collision (no distance calculation)
function checkCollision(dart, enemy) {
  const Q = RT.quadrance(dart.pos, enemy.pos); // Δx²+Δy²+Δz²+Δw²
  return Q < (dart.radius + enemy.radius)**2; // Compare Q, not d!
}
```

### 3.4 Geodesic HUD Rendering

**Implementation:**
1. Create Geodesic Icosahedron (freq-3) at player origin
2. Each triangular face = HUD panel
3. Ray-cast from player to enemies
4. Determine which geodesic face ray intersects
5. Render enemy symbol on that HUD panel
6. Display quadrance value and threat level

**Advantages:**
- Natural 360° spherical coverage
- RT-pure angular sectors (no arctan needed)
- Educational: Demonstrates geodesic sphere superiority over UV sphere

---

## 4. Implementation Phases

### Phase 1: Core Game Loop (Week 1-2)

**Deliverables:**
- [x] Create `rt-asteroids-core.js` module
- [x] Implement game state machine (MENU, PLAYING, PAUSED, GAME_OVER, TRANSITION)
- [x] Add basic player ship (Tetrahedron) at origin
- [x] Implement ASDF WXYZ movement controls
- [x] Add camera orbit around player ship
- [x] Create simple enemy spawner (1 Cube enemy)
- [x] Implement basic collision detection (RT quadrance-based)

**Testing:**
- Player can move in WXYZ space
- Enemy spawns and moves toward player - Quadray here must avoid debris of exploded ships, and capture material for points to escalate to new ship advantages (progressive), capturing ships provides materials, bulding more ships uses fuel, Quadray hero must capture fuel and ship materials from enemy without getting hit by material, consider tractor beam mechanisms for fuel and materials
- Collision triggers game over

### Phase 2: Weapons & Combat (Week 3-4)

**Deliverables:**
- [x] Create `rt-asteroids-weapons.js` module
- [x] Implement laser dart firing (Spacebar)
- [x] Add WXYZ firing vectors (W/X/Y/Z keys or auto-target)
- [x] RT-pure ballistics and collision detection
- [x] Enemy destruction effects (particle explosion)
- [x] Health system for player ship
- [x] Score tracking

**Testing:**
- Laser darts fire along tetrahedral axes
- Darts destroy enemies on collision
- Player takes damage from enemy collision
- Score increments on enemy kill

### Phase 3: Enemy AI & Variety (Week 5-6)

**Deliverables:**
- [x] Create `rt-asteroids-enemies.js` module
- [x] Implement Cube, Sphere, Cartesian Cruiser enemies
- [x] XYZ-limited enemy pathfinding (cannot track Quadray tetrahedral movement)
- [x] Angle-based enemy weapons (slower than player RT weapons)
- [x] Wave spawning system (difficulty scaling)
- [x] Boss enemy with geodesic weak points

**Testing:**
- Enemies exhibit XYZ tracking limitations
- Player can exploit Quadray-axis positioning
- Enemy weapons fire slower than player
- Boss requires strategic targeting

### Phase 4: Hyperspace Matrix Army (Week 7)

**Deliverables:**
- [x] Create `rt-asteroids-matrix.js` module
- [x] Implement Hyperspace deployment (H key)
- [x] Spawn 3×3×3 IVM matrix of allied polyhedra
- [x] Matrix unit AI (auto-attack nearest enemy)
- [x] RT-pure targeting for matrix units
- [x] Cooldown timer and visual indicator

**Testing:**
- Matrix deploys correctly in IVM lattice
- Units attack enemies autonomously
- Matrix collapses after timeout
- Cooldown prevents spam

### Phase 5: Black Hole Transitions (Week 8-9)

**Deliverables:**
- [x] Create `rt-asteroids-blackhole.js` module
- [x] Implement polyhedra collapse animation (vertices → origin)
- [x] Screen inversion effect (white background, color negation)
- [x] Re-expansion animation in negative space
- [x] Level progression system
- [x] Increasing wave difficulty

**Testing:**
- Transition triggers after wave completion
- Collapse/expansion animations smooth
- Color inversion works correctly
- Next wave spawns with increased difficulty

### Phase 6: Geodesic HUD (Week 10-11)

**Deliverables:**
- [x] Create `rt-asteroids-hud.js` module
- [x] Implement geodesic icosahedron HUD overlay
- [x] Enemy position mapping to HUD panels
- [x] Quadrance distance display on panels
- [x] Target reticle and firing solution indicators
- [x] Toggle between HUD and Coordinate views (V key)

**Testing:**
- HUD displays 360° battle theater
- Enemy positions update in real-time
- Quadrance values accurate
- View toggle works smoothly

### Phase 7: Polish & Balancing (Week 12)

**Deliverables:**
- [x] Sound effects (laser fire, explosions, hyperspace)
- [x] Background music (synthwave/retro)
- [x] Particle effects (engine trails, explosions, warp)
- [x] UI polish (menus, HUD styling, fonts)
- [x] Difficulty balancing (enemy HP, spawn rates, scoring)
- [x] Tutorial level (teaches WXYZ movement, RT concepts)

**Testing:**
- Full playthrough from tutorial to level 5
- Difficulty curve feels fair
- All controls intuitive
- Educational value clear

---

## 5. Controls & Interface

### 5.1 Movement Controls (WXYZ Quadray Navigation)

**Keyboard Layout:**
```
W-Axis: A (negative) / D (positive)
X-Axis: W (positive) / S (negative)
Y-Axis: Q (negative) / E (positive)
Z-Axis: Z (negative) / C (positive)
```

**Alternative (Gamepad):**
- Left Stick: W/X axes
- Right Stick: Y/Z axes
- Triggers: Boost/Brake

### 5.2 Combat Controls

**Weapons:**
- **Spacebar**: Fire laser dart (auto-targets nearest enemy)
- **CTRL + Spacebar**: Fire Tetrahedral Photon Torpedo (costs 100 fuel, requires 500 fuel unlocked)
- **Arrow Keys**: Manual targeting override
  - **Up**: Target enemy in +X direction
  - **Down**: Target enemy in -X direction
  - **Left**: Target enemy in +W direction
  - **Right**: Target enemy in -W direction
- **Shift + Arrow**: Target in Y/Z axes
- **F**: Toggle Firing Mode (Face Normal / Vertex - Stellated ships only)

**Special Abilities:**
- **H**: Deploy Hyperspace Matrix Army (Cuboctahedron Mothership only)
- **X**: Activate X-RAY Telemetry (costs 5 fuel/sec)
- **T**: Activate Tractor Beam (Stellated ships only, costs 2 fuel/sec)
- **P**: Activate Papercut tactical view (cutplane radar)
- **V**: Toggle Geodesic HUD / Coordinate view
- **G**: Toggle Quadray Grid Visibility (strategic movement aid)

### 5.3 System Controls

- **Esc**: Pause game / Open menu
- **R**: Restart level
- **M**: Mute audio
- **F**: Toggle fullscreen

### 5.4 HUD Elements

**Top Bar:**
- **Health**: Quadrance-based damage meter (Q_damage accumulated)
- **Score**: Points from enemy kills + evasion bonuses
- **Wave**: Current wave number / Total waves (1-10, then "∞" for The Infinite)
- **Fuel**: Green bar (decreases with X-RAY, Tractor Beam, Hyperspace, Torpedoes)
  - Displays current fuel / Torpedo unlock threshold (500)
  - **Golden glow** when Torpedoes unlocked
- **Materials**: Icon counter (cube/sphere/mixed materials collected)
- **Hyperspace Cooldown**: Circular timer (Cuboctahedron only)
- **Torpedo Cooldown**: Tetrahedral icon timer (glows cyan when ready)

**Geodesic HUD (when active - Press V):**
- 360° battle theater projected on geodesic icosahedron surface
- Enemy quadrance distances displayed on panels (Q = XX)
- Threat level colors:
  - Green: Q > 75 (far, safe)
  - Yellow: 25 < Q < 75 (medium, caution)
  - Red: Q < 25 (close, danger!)
- Target reticle with spread indicator (2-decimal precision)
- Enemy angular resolution visible (45°/15°/5°/1° brackets)

**Coordinate View (when active - Press V):**
- Player ship at origin (wireframe polyhedron)
- WXYZ tetrahedral basis vectors (colored arrows extending from ship)
- XYZ Cartesian basis vectors (optional toggle, dimmer colors)
- Enemy positions in 3D space (colored according to type)
- Debris field visualization (fuel orbs + material chunks)
- Quadray grid (toggle G)
- Camera orbit controls (mouse drag / right-click pan)

**X-RAY Telemetry Overlay (when active - Press X):**
- Enemy XYZ trajectory paths (ghosted dotted lines)
- Movement sequence text: "Cube_03: X +10 → Z +5 → Y -7"
- Fuel cost indicator (draining bar, 5 fuel/sec)
- Predicted intercept points (cyan crosshairs)

---

## 6. Educational Value

### 6.1 Learning Objectives

**Primary Concepts:**
1. **Quadray Coordinates**: 4-axis tetrahedral space vs 3-axis Cartesian
2. **Rational Trigonometry**: Quadrance (Q) vs Distance (d), Spread (s) vs Angle (θ)
3. **Computational Efficiency**: Algebraic geometry vs transcendental functions
4. **Geodesic Geometry**: Icosahedron subdivision vs UV sphere mapping
5. **IVM Lattice**: Space-filling tetrahedral arrays

**Gameplay-Integrated Teaching:**
- **Quadray tetrahedral advantage**: Player navigates full WXYZ space while enemies are constrained to XYZ Cartesian
- **RT targeting speed**: Player weapons lock-on instantly (no angle calculation), enemy weapons lag (slow trig functions)
- **Geodesic efficiency**: HUD demonstrates superior triangle distribution
- **Matrix deployment**: Shows IVM spatial packing principles

### 6.2 Tutorial Level Design

**Tutorial Sequence:**
1. **Introduction**: "Welcome to Quadray space. You have 4 axes: W, X, Y, Z."
2. **Movement Practice**: "Press ASDF to move in Quadray WXYZ space. Notice enemies cannot track tetrahedral motion."
3. **Combat Basics**: "Press Spacebar to fire laser darts. No angle calculation needed!"
4. **Quadrance Concept**: "Your HUD shows Q (quadrance), not d (distance). Q = d². Simpler!"
5. **Hyperspace**: "Press H to deploy IVM Matrix army. Watch them auto-target enemies."
6. **Black Hole**: "Destroy all enemies to trigger level transition. Watch the geometry!"

### 6.3 On-Screen Educational Tooltips

**During Gameplay:**
- "Enemy tracking failed: Cannot compute Quadray-axis component"
- "RT targeting: 0ms lock-on (algebraic)"
- "Enemy targeting: 120ms lock-on (transcendental functions)"
- "Geodesic HUD: 180 triangles vs Classical Sphere: 512 triangles"
- "Quadrance Q = 25 (distance d ≈ 5, but no √ needed!)"

---

## 7. Implementation Roadmap

### 7.1 Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Core Game Loop | 2 weeks | Playable prototype (movement + 1 enemy) |
| 2. Weapons & Combat | 2 weeks | Shooting, scoring, health system |
| 3. Enemy AI & Variety | 2 weeks | Multiple enemy types, waves, boss |
| 4. Hyperspace Matrix | 1 week | Matrix army deployment |
| 5. Black Hole Transitions | 2 weeks | Level progression, visual effects |
| 6. Geodesic HUD | 2 weeks | HUD view, 360° battle theater |
| 7. Polish & Balancing | 1 week | Sound, effects, tutorial, balance |
| **Total** | **12 weeks** | **Full game release** |

### 7.2 Technical Dependencies

**Required ARTexplorer Features:**
- ✅ Polyhedra generation (`rt-polyhedra.js`)
- ✅ Quadray math library (`rt-math.js`)
- ✅ IVM matrix generation (`rt-matrix-planar.js`)
- ✅ Three.js rendering (`rt-rendering.js`)
- ✅ Papercut cutplane (`rt-papercut.js`)

**New Modules to Create:**
- `rt-asteroids-core.js` - Game loop, state machine
- `rt-asteroids-player.js` - Ship physics, controls
- `rt-asteroids-enemies.js` - Enemy AI, spawning
- `rt-asteroids-weapons.js` - Laser darts, collision
- `rt-asteroids-matrix.js` - Hyperspace army
- `rt-asteroids-blackhole.js` - Level transitions
- `rt-asteroids-hud.js` - Geodesic HUD rendering
- `rt-asteroids-scoring.js` - Score, health, waves

### 7.3 Development Priorities

**Phase 1 Focus:**
- Get player ship moving in WXYZ space
- Prove RT-pure collision detection works
- Establish game loop architecture

**Phase 2 Focus:**
- Make combat feel responsive
- Ensure RT quadrance-based targeting is clearly faster than "enemy angle tracking"

**Phase 3 Focus:**
- Make XYZ-limited enemy AI believable
- Create "aha!" moment when player exploits Quadray tetrahedral navigation

**Phase 4 Focus:**
- Matrix deployment must feel powerful but balanced
- IVM lattice structure must be visually clear

**Phase 5 Focus:**
- Black hole transition must be visually stunning
- Color inversion must be smooth and trippy

**Phase 6 Focus:**
- Geodesic HUD must be readable and useful
- Demonstrate geodesic efficiency visually

**Phase 7 Focus:**
- Tutorial must teach RT concepts without being preachy
- Game must be fun first, educational second

---

## 8. Art Style & Aesthetics

### 8.1 Visual Design

**Vector Graphics:**
- Clean wireframe polyhedra (classic *Asteroids* homage)
- High-contrast colors on black background
- Vertex highlighting on player ship
- Glowing edges for active weapons

**Color Coding:**
- **Player Ship**: Cyan wireframe, bright vertices
- **Quadray Basis Vectors** (tetrahedral arrowheads from center):
  - W basis vector: Red
  - X basis vector: Green
  - Y basis vector: Blue
  - Z basis vector: Yellow
- **Quadray Plane Grids** (blended colors from basis vector pairs):
  - WX, WY, WZ, XY, XZ, YZ planes show color blends (see Grid Visualization section)
- **Enemies**: Orange/magenta (classical geometry)
- **Matrix Army**: White/cyan (allied forces)

**Effects:**
- Particle trails along tetrahedral axes
- Explosion fragments follow RT-pure vectors
- Black hole collapse: Vertices trail toward origin
- Negative space: Inverted colors, white background

### 8.2 Audio Design

**Sound Effects:**
- **Laser Fire**: Sharp, crisp pulse (different pitch per axis)
- **Enemy Destruction**: Crystalline shatter
- **Hyperspace Deploy**: Deep whoosh + spatial echo
- **Black Hole**: Swirling vortex sound + bass drop
- **Collision**: Impact + damage alarm

**Music:**
- **Synthwave/Retro**: 80s arcade aesthetic
- **Dynamic Intensity**: Increases with wave difficulty
- **Transition Theme**: Ambient drone during black hole

---

## 9. Future Enhancements

### 9.1 Post-Launch Features

**Multiplayer:**
- Co-op: 2 players in same Quadray space
- Competitive: Race to highest score

**Ship Customization:**
- Unlock new polyhedral ship types
- Upgrade weapons (dual-axis firing, homing darts)
- Visual customization (colors, trails)

**Advanced Enemies:**
- Dodecahedron Motherships (φ-based geometry)
- Rhombic Dodecahedron Tanks (IVM lattice armor)
- Hybrid Geometry (part-classical, part-RT)

**Educational Modes:**
- **Sandbox**: Free exploration of WXYZ space
- **Challenge Levels**: Specific RT concept demonstrations
- **Replay System**: Watch fights with RT math overlay

### 9.2 Community Features

**Leaderboards:**
- High scores
- Fastest wave completions
- Most efficient RT targeting

**Level Editor:**
- Design custom enemy waves
- Create custom black hole polyhedra
- Share levels via JSON export

**Achievements:**
- "Quadray Master": Complete game using only Quadray WXYZ tetrahedral movement (no Cartesian XYZ)
- "RT Purist": Never use angle-based targeting
- "Matrix Commander": Deploy 100 IVM armies
- "Black Hole Navigator": Complete 10 level transitions

---

## 10. Success Metrics

### 10.1 Educational Goals

**Player Should Learn:**
1. Quadray coordinates provide tactical advantages over XYZ
2. RT quadrance-based calculations are faster than angle-based
3. Geodesic spheres are more efficient than UV spheres
4. IVM matrices demonstrate space-filling tetrahedral packing
5. Algebraic geometry can outperform transcendental methods

**Validation:**
- Post-game quiz on RT concepts
- Player interviews about "aha!" moments
- Analytics on Quadray tetrahedral movement usage (should increase over time as players learn advantage)

### 10.2 Gameplay Goals

**Player Should Feel:**
- Empowered by Quadray navigation
- Clever when exploiting Quadray tetrahedral navigation to confuse Cartesian enemies
- Satisfied by instant RT targeting
- Awed by black hole transitions
- Strategic when deploying Matrix armies

**Validation:**
- Playtest feedback sessions
- Completion rate tracking
- Difficulty balance analysis

---

## 11. Conclusion

**A.r.t.steroids** transforms ARTexplorer from a visualization tool into an interactive educational game that teaches Rational Trigonometry through engaging gameplay. By giving players geometric superpowers (Quadray navigation, RT targeting, Geodesic HUD) and pitting them against classically-limited enemies, the game creates memorable "aha!" moments that cement understanding of abstract mathematical concepts.

Aesthetic is nostalgiac for Gen-Xer's with a neon-vector feel, slightly richer than the original, but completely avoiding hyper-realism as a cost of compute, prefer simplicity to maintain abstract 80's art feel and linear minimalism with geometry as they key interest factor, the compelling complexity. The QUADRAY central angle webbed-grid will be made visible during strategic movement (extending well past our 120 unit intervals.)

The game leverages ARTexplorer's existing RT-pure architecture while adding new modules for combat, AI, and level progression. The 12-week implementation roadmap is realistic and modular, allowing for incremental testing and refinement.

**Core Gameplay Loop:**
1. **Navigate WXYZ + XYZ space** - Use both tetrahedral AND Cartesian basis vectors
2. **Fire RT Spread-based laser darts** - Instant 0.01-precision algebraic targeting
3. **Exploit enemy XYZ limitations** - Enemies constrained to UP/DOWN/LEFT/RIGHT/FORWARD/BACK translation
4. **Use X-RAY telemetry** - See enemy XYZ paths 3 seconds into future (costs fuel)
5. **Capture debris** - Collect fuel orbs + material chunks from enemy explosions
6. **Upgrade ships progressively** - Tetra → Octa → Icosa → Cubocta → Stellated
7. **Deploy IVM Matrix armies** - Hyperspace 3×3×3 swarm (Cuboctahedron Mothership only)
8. **Survive enemy waves** - Outmaneuver coarse degree-based targeting (45°→1°)
9. **Transit through black holes** - Polyhedral collapse/expansion with color inversion
10. **Repeat with increasing difficulty** - Enemy angular precision improves per wave

**Key Tactical Advantages:**
- **Quadray tetrahedral dodge**: Enemy Cartesian tracking fails, appears as instant lateral shift from their perspective
- **RT Spread precision**: 0.01 granularity vs enemy's 45°/15°/5°/1° coarse intervals
- **Long-range exploitation**: At Q > 50, move out of enemy angular resolution
- **X-RAY future sight**: Predict enemy XYZ paths, position for intercept
- **Resource management**: Balance fuel costs (X-RAY/Tractor/Hyperspace) vs combat needs
- **Risk/reward debris capture**: Navigate explosion fragments for materials

**Visual & Educational Highlights:**
- **Targeting telegraph**: Faint hairlines show enemy firing solutions BEFORE they fire (enables dodge mechanic)
- **Explosion contrast**: Enemy XYZ planar fragmentation vs Player polyhedral face-normal fragmentation
- **Quadray grid**: Tetrahedral lattice webbing (nostalgic 80's neon-vector aesthetic)
- **X-RAY telemetry**: Visual demonstration of Cartesian coordinate mapping
- **Geodesic HUD**: 180 triangle geodesic icosa vs enemy's 512 triangle UV sphere
- **Angular precision handicap**: Player's smooth RT spread vs enemy's stepped degrees
- **Progressive ship evolution**: Stellations and duals demonstrate geometric hybridization
- **Computational lag visualization**: Targeting delay = transcendental trig cost (1.5s Cubes → 0.3s Cruisers)

**Educational Payoff:**
Players naturally discover that:
- **Tetrahedral WXYZ + Cartesian XYZ navigation** > Cartesian XYZ navigation
- **Quadrance (Q) > Distance (d)** for computation (no √ needed)
- **RT Spread (0.01 precision) > Angles (1° precision)** for targeting granularity
- **Geodesic subdivision (180 tri) > UV sphere (512 tri)** for polygon efficiency
- **Algebraic geometry (instant) > Transcendental functions (delayed)** for speed
- **4-axis knowledge > 3-axis perception** for tactical superiority

**A.r.t.steroids** proves that mathematics education doesn't have to be dry—it can be an epic space battle where geometry itself is your greatest weapon.

---

**Document Version:** 3.3 (Targeting Telegraph System)
**Author:** Andy Thomson, M.Arch. OAA
**Date:** 2026-01-14
**Status:** Design Complete - Ready for Phase 1 Implementation

**Version 3.3 Updates (Targeting Telegraph System):**
- **Cartesian Targeting Telegraph**: Visual mechanic that enables Stellarian dodge strategy
  - **Targeting Hairline**: Faint wireframe (lineWidth 0.5, opacity 0.3) appears during enemy firing calculation
  - Shows WHERE enemy will fire BEFORE projectile launches (1.5s Cubes → 0.3s Cruisers)
  - Color-coded by enemy type (orange/magenta/red)
  - **Laser Dart Blast**: Heavy glowing projectile (lineWidth 3-5) traces hairline path after targeting completes
  - **Dodge Window**: Player uses ASDF rubber-band motion during targeting phase to evade
  - **WXYZ displacement breaks targeting**: Enemy recalculates if player Q-displacement > 10
  - Demonstrates computational cost of transcendental trig (Cartesian slow) vs RT instant targeting (Stellarian fast)
- **HUD Integration**: Active targeting hairline count, brightness ramp, audio lock-on cue (0.2s before fire)
- **Advanced Enemy Behavior**: Lead targeting (Wave 5+), volley coordination (Wave 7+), persistent tracking (Boss)

**Version 3.2 Updates (Motion Dynamics):**
- **Rubber-Band Navigation System**: Core movement mechanic using ASDF keys for WXYZ tetrahedral displacement
  - Hold key = displacement along axis (exponential/quadratic distance curve)
  - Release key = quantitative easing return to origin (0.5-1.0s animation)
  - Max displacement: Q_max = 50 quadrance units
  - Fuel cost: 1 fuel per second of displacement
- **Stellarian Dodge Mechanic**: Tetrahedral WXYZ motion appears as unpredictable lateral shift to Cartesian XYZ enemies
- **World-Frame Reference**: Player always at canvas center (origin), world moves relative to player
  - Consistent with original Asteroids game philosophy
- **Separate Control Systems**: Rotation (arrows/mouse) and targeting (spacebar) independent of ASDF motion
- **Visual Feedback**: Axis glow during displacement, fading trail during return animation

**Version 3.1 Updates (Stellaria Octangula):**
- **Stellaria Octangula ship** (Tier 5): Black hole navigator with compound dual tetrahedra geometry
  - Can survive black hole transitions (all other ships destroyed)
  - Death triggers "glitch reveal": 0.5s flash of infinite amber IVM rhombic dodecahedra lattice
  - Ship outline visible within universal geometric substrate
  - Foreshadows ultimate IVM Swarm Ship
- **IVM Swarm Ship** (Tier 7): Ultimate form with rhombic dodecahedron hull at center of infinite lattice
  - Player becomes the lattice—all nodes are firing positions
  - Unlocked by dying as Stellaria Octangula 3 times (understanding through death)
- **7 Lives system**: One life per Platonic solid transformation
  - Death resets to Tetrahedron but retains progress
  - Lives displayed as diminishing geometric icons
  - Final death shows extended glitch sequence
- **Death as education**: Stellaria Octangula glitch reveals that "space is tetrahedral packing"
- **Philosophical progression**: From ship in space → becoming space itself

**Version 3.0 Updates (Stellarian Mythos):**
- **Added profound storyline**: Stellarians (seekers of Truth/The Infinite) vs Cartesians (trapped in Time/hubris)
- **Tetrahedral Photon Torpedoes**: Ultimate weapon unlocked at 500 fuel, costs 100 fuel per shot
  - Tetrahedral geometry projectile with 4-fold symmetry explosion
  - Seeks weak points using RT spread calculations
  - 5× damage to Cubes, 3× to Spheres, 2× to Cruisers, weakens all Boss panels
  - 30-second cooldown, cyan trail, auto-targeting
- **"The Infinite" final level**: Meta-victory state where player exits game voluntarily
  - Golden Quadray grid extends infinitely
  - Babylonian glyphs (Plimpton 322) resolve into RT equations
  - Stellarian Archon narration on transcending Time
  - First player to reach + exit wins **10% of all game proceeds**
- **Lore integration**: Tablets of Destinies, Gnostic geometers, Tetrahedral Mysteries, "Seek ye first the Kingdom"
- **Philosophical depth**: Time as opposite of Infinity (not its extension), algebraic exactness as spiritual path
- **Naming**: Player = Stellarians, Enemies = Cartesians (with cultural philosophies defined)

**Version 2.0 Updates:**
- Clarified navigation: Player uses BOTH WXYZ Quadray (tetrahedral) AND XYZ Cartesian (orthogonal) coordinate systems
- Added X-RAY Telemetry system: See enemy XYZ paths 3 sec into future (costs fuel)
- Defined angular precision: Player 0.01 spread (RT) vs Enemy 45°→1° degrees (progressing per wave)
- Specified explosion mechanics: Enemy XYZ planar fragmentation vs Player polyhedral face-normal fragmentation
- Added progressive ship evolution: Tetra → Octa → Icosa → Cubocta → Stellated (capture enemy debris)
- Resource economy: Fuel + Materials for ship upgrades, fuel costs for X-RAY/Tractor/Hyperspace
- Stellated ships: Thicker rays (lineWidth 1→4), vertex firing mode, tractor beam, extended range
- Quadray grid visualization: Tetrahedral webbed lattice (G key), 80's neon-vector aesthetic
- Enemy movement constraints: Cartesian XYZ UP/DOWN/LEFT/RIGHT/FORWARD/BACK, rotation capability varies
- Quadray dodge maneuver: Tetrahedral movement breaks enemy Cartesian XYZ tracking (appears as instant shift)

---

## Appendix A: Code Snippets

### A.1 Core Game Loop Structure

```javascript
// rt-asteroids-core.js
export const AsteroidsGame = (() => {
  let gameState = 'MENU'; // MENU, PLAYING, PAUSED, GAME_OVER, TRANSITION
  let wave = 1;
  let score = 0;
  let player = null;
  let enemies = [];
  let lasers = [];

  function init() {
    player = createPlayerShip('tetrahedron');
    spawnEnemyWave(wave);
    gameState = 'PLAYING';
  }

  function update(deltaTime) {
    if (gameState !== 'PLAYING') return;

    updatePlayer(deltaTime);
    updateEnemies(deltaTime);
    updateLasers(deltaTime);
    checkCollisions();

    if (enemies.length === 0) {
      triggerBlackHoleTransition();
    }
  }

  function render() {
    // Handled by rt-rendering.js
  }

  return { init, update, render };
})();
```

### A.2 RT-Pure Collision Detection

```javascript
// rt-asteroids-weapons.js
function checkLaserEnemyCollision(laser, enemy) {
  // Convert both to Quadray if needed
  const laserQ = laser.posQuadray;
  const enemyQ = enemy.posQuadray;

  // Calculate quadrance (NO SQUARE ROOT!)
  const Q = RT.quadrance(laserQ, enemyQ);

  // Collision threshold (combined radii squared)
  const threshold = (laser.radius + enemy.radius) ** 2;

  return Q < threshold;
}
```

### A.3 Quadray Coordinate System Blindness

```javascript
// rt-asteroids-enemies.js
function updateCubeEnemy(enemy, playerPos, deltaTime) {
  // Cube enemy only tracks XYZ Cartesian (cannot perceive WXYZ Quadray tetrahedral motion)
  const playerXYZ = RT.quadrayToCartesian(playerPos);
  const enemyXYZ = RT.quadrayToCartesian(enemy.pos);

  // Classical angle-based tracking (SLOW)
  const dx = playerXYZ.x - enemyXYZ.x;
  const dy = playerXYZ.y - enemyXYZ.y;
  const dz = playerXYZ.z - enemyXYZ.z;

  const angle = Math.atan2(dy, dx); // Transcendental = delay!

  // Enemy moves in XYZ Cartesian only (3 orthogonal axes)
  enemy.velocity = {
    x: Math.cos(angle) * enemy.speed,
    y: Math.sin(angle) * enemy.speed,
    z: dz > 0 ? enemy.speed : -enemy.speed
  };

  // Update position (enemy stores XYZ, not WXYZ)
  enemy.pos = RT.addCartesianVectors(enemy.pos, enemy.velocity, deltaTime);
}
```

### A.4 Geodesic HUD Mapping

```javascript
// rt-asteroids-hud.js
function mapEnemyToHUDPanel(enemy, playerPos, hudGeodesic) {
  // Vector from player to enemy
  const direction = RT.subtractQuadrays(enemy.pos, playerPos);

  // Find which geodesic face this vector intersects
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0, 0, 0), // Origin
    RT.quadrayToCartesian(direction).normalize()
  );

  const intersects = ray.intersectObject(hudGeodesic);

  if (intersects.length > 0) {
    const faceIndex = intersects[0].faceIndex;
    const Q = RT.quadrance(playerPos, enemy.pos);

    // Render enemy indicator on this HUD panel
    renderEnemyIndicator(faceIndex, Q, enemy.threatLevel);
  }
}
```

---

## Appendix B: Asset Requirements

### B.1 3D Models (Generated Procedurally)

- ✅ Tetrahedron (player ship)
- ✅ Octahedron (player ship)
- ✅ Icosahedron (player ship)
- ✅ Cuboctahedron (player ship)
- ✅ Cube (enemy)
- ✅ UV Sphere (enemy)
- ✅ Geodesic Icosahedron freq-3 (HUD)
- ✅ Geodesic Icosahedron freq-6 (black hole)
- ✅ Matrix arrays 3×3×3 (Hyperspace army)

### B.2 Sound Effects (To Source/Generate)

- Laser fire (4 variants for W/X/Y/Z axes)
- Enemy explosion
- Player damage
- Hyperspace deploy
- Matrix army spawn
- Black hole collapse
- Black hole expansion
- UI click/hover
- Game over

### B.3 Music Tracks (To Source/License)

- Menu theme (synthwave, upbeat)
- Gameplay theme (synthwave, intense)
- Black hole transition (ambient drone)
- Game over (melancholic synth)

---

## Appendix C: Developer Implementation Notes (INTERNAL - NOT FOR DISTRIBUTION)

### C.1 Legal Framework: Skill-Based Gaming vs Gambling

**Challenge:**
Ontario's gaming laws (Alcohol and Gaming Commission of Ontario - AGCO) heavily regulate gambling and gaming. Commercial operators like BetRivers and BetMGM operate under specific licenses that are expensive and restrictive. We need to structure A.r.t.steroids to avoid gambling classification.

**Legal Strategy:**

**1. Skill-Based Game Classification:**
- **Key Distinction**: Games of skill (chess, esports) vs games of chance (slots, poker)
- **A.r.t.steroids qualifies as skill-based** because:
  - Victory requires knowledge acquisition (Gurdjieff, Sirius, Dymaxion geometry)
  - Discovery path demands research, not luck or random chance
  - Written explanation requirement proves understanding, not accidental discovery
  - No randomness determines winner (unlike lottery/raffles)

**2. Prize Structure (Contest of Skill):**
- **One-time purchase**: $50 CAD for lifetime access to game
- **Prize pool**: 10% of all revenue goes to first discoverer of The Infinite
- **Legal precedent**: Similar to coding competitions, CTF (Capture The Flag) security contests, puzzle hunts
  - Example: MIT Mystery Hunt (free, but conceptually similar)
  - Example: Cicada 3301 puzzle (had corporate backing, legal)
  - Example: Esports tournaments (pay-to-enter, skill-based prizes)

**3. Ontario-Specific Compliance:**
- **Not a lottery** (Criminal Code s.207): No element of chance, pure skill
- **Not gambling** (AGCO definition): Outcome determined by player knowledge, not random events
- **Commercial contest exemption**: If skill substantially outweighs chance, exempt from lottery regulations
- **Written explanation requirement** provides legal proof of skill (not random discovery)

**4. Terms of Service Requirements:**
```
CONTEST RULES - A.R.T.STEROIDS "THE INFINITE" PRIZE

1. ELIGIBILITY: Open to legal residents of jurisdictions where skill-based gaming contests are permitted. Void where prohibited.

2. ENTRY: Purchase of game ($50 CAD) grants unlimited attempts to discover The Infinite.

3. PRIZE DETERMINATION: First player to access The Infinite AND provide written explanation demonstrating understanding of geometric/philosophical discovery method wins 10% of gross game revenue to date.

4. SKILL REQUIREMENT: Discovery requires research (Gurdjieff philosophy, Sirius astronomy, Dymaxion cartography, Rational Trigonometry), symbolic interpretation, and execution of counter-intuitive gameplay action. No element of chance involved.

5. VERIFICATION: Winner must submit written explanation proving intentional discovery (not accidental). Developer reserves right to reject explanations lacking demonstrated understanding.

6. PRIZE PAYMENT: Via certified cheque (Canada Post) or wire transfer within 30 days of verification.

7. SUBSEQUENT PLAYERS: After first winner, achievement remains accessible but no additional monetary prize awarded. "Stellarian Archon" status granted.

8. NO PURCHASE NECESSARY ALTERNATIVE: Not applicable - this is a commercial software product with integrated skill contest, not a lottery requiring free entry method.
```

**5. Tax Implications (Canada):**
- **Winner**: Prize likely treated as "windfall" (non-taxable in Canada if truly one-time skill contest prize)
- **Developer**: Revenue is taxable business income, prize is deductible business expense
- **GST/HST**: Charged on $50 game purchase (digital goods)
- **Consult tax lawyer**: Confirm CRA treatment before launch

**6. Risk Mitigation:**
- **Legal opinion**: Obtain written legal opinion from Ontario gaming lawyer confirming skill-based classification
- **Insurance**: Consider prize indemnity insurance if prize pool could become large
- **Escrow account**: Deposit 10% of revenue into separate account as prize pool (shows good faith)

---

### C.2 Anti-Cheat & Code Obfuscation

**Challenge:**
Players will attempt to reverse-engineer the JavaScript to discover The Infinite path without solving puzzles. We must protect the secret while allowing legitimate discovery.

**Implementation Strategy:**

**1. Server-Side Validation (Required):**
```javascript
// Client-side game runs in browser, BUT:
// Achievement unlock must verify with server before prize claim

// rt-asteroids-anticheat.js (SERVER-SIDE - Node.js/Express)
const crypto = require('crypto');

// Generate cryptographic proof that player achieved The Infinite legitimately
function generateAchievementProof(playerSession) {
  // Server tracks:
  // - Total game time
  // - Wave progression
  // - Plimpton 322 trial completion timestamp
  // - Tetrahedral trial completion timestamp
  // - Time spent at origin [1,1,1,1] during combat
  // - Sirius alignment duration

  const proofData = {
    sessionId: playerSession.id,
    timestamp: Date.now(),
    plimptonSecret: playerSession.plimptonUnlocked,
    tetrahedralSecret: playerSession.tetrahedralUnlocked,
    originDuration: playerSession.originStillnessSeconds, // Must be >= 300
    siriusAlignment: playerSession.siriusAlignmentVerified,
    totalPlaytime: playerSession.totalSeconds
  };

  // Cryptographic signature (cannot be forged without server private key)
  const signature = crypto.createHmac('sha256', process.env.SERVER_SECRET_KEY)
    .update(JSON.stringify(proofData))
    .digest('hex');

  return { ...proofData, signature };
}

// Verify proof when player submits written explanation
function verifyInfiniteDiscovery(proof, explanation) {
  // 1. Verify cryptographic signature
  // 2. Check all conditions met (300s stillness, both secrets, etc.)
  // 3. Manually review written explanation (human verification)
  // 4. If valid: Mark as winner, calculate prize, initiate payment
}
```

**2. Code Obfuscation (Client-Side):**
```bash
# Use JavaScript obfuscation tools for production build

# Install obfuscator
npm install -g javascript-obfuscator

# Obfuscate all game modules (makes reverse-engineering extremely difficult)
javascript-obfuscator ./game-modules/ \
  --output ./dist/game-modules/ \
  --compact true \
  --control-flow-flattening true \
  --control-flow-flattening-threshold 0.75 \
  --dead-code-injection true \
  --dead-code-injection-threshold 0.4 \
  --string-array true \
  --string-array-encoding 'rc4' \
  --string-array-threshold 0.75 \
  --unicode-escape-sequence true
```

**3. Split Secret Architecture:**
```javascript
// The true victory condition is SPLIT across client and server
// Neither alone reveals the full secret

// CLIENT: Detects geometric conditions, sends encrypted telemetry
function checkOriginAlignment() {
  const atOrigin = (Q_fromOrigin < 0.01);
  const stillnessDuration = (Date.now() - lastMovementTime) / 1000;
  const gridActive = quadrayGridVisible;
  const siriusAligned = checkSiriusAlignment(); // Checks constellation overlay

  if (atOrigin && stillnessDuration > 10 && gridActive && siriusAligned) {
    // Send encrypted heartbeat to server every 10 seconds
    sendTelemetry({
      type: 'ORIGIN_STILLNESS',
      duration: stillnessDuration,
      timestamp: Date.now(),
      wave: currentWave,
      encrypted: encryptPayload({ atOrigin, siriusAligned })
    });
  }
}

// SERVER: Accumulates telemetry, verifies 300-second requirement
// Only server knows the threshold is 300 seconds
// Client code shows no hint of required duration
```

**4. Decoy Code Injection:**
```javascript
// rt-asteroids-decoys.js (obfuscated in production)

// Inject plausible but FALSE victory conditions into client code
function checkFalseVictoryConditions() {
  // These will never trigger The Infinite, but will mislead code readers

  // DECOY 1: High Evasion Ratio (mentioned in design doc as false path)
  if (evasionScore / destructionScore > 3.0) {
    console.log('[HIDDEN] High evasion ratio detected...'); // Red herring
    // Does nothing
  }

  // DECOY 2: Boss defeat with specific loadout
  if (bossDefeated && ship.type === 'ICOSAHEDRON' && torpedoesUsed === 0) {
    console.log('[HIDDEN] Pacifist boss victory...'); // Red herring
    // Does nothing
  }

  // DECOY 3: Specific score threshold
  if (totalScore === 133700) { // Plimpton 322 reference number
    console.log('[HIDDEN] Plimpton resonance...'); // Red herring
    // Does nothing
  }
}

// REAL victory condition is in separate obfuscated module
// Requires server-side validation anyway
```

**5. License Key System (DRM):**
```javascript
// Each $50 purchase generates unique license key
// Game phones home to verify key on launch
// Prevents piracy, enables tracking for prize pool calculation

// rt-asteroids-license.js (SERVER-SIDE)
function generateLicenseKey(purchaseId, email) {
  const keyData = {
    id: purchaseId,
    email: crypto.createHash('sha256').update(email).digest('hex').substring(0, 16),
    timestamp: Date.now(),
    version: '1.0'
  };

  // Sign with server private key
  const signature = crypto.createSign('RSA-SHA256');
  signature.update(JSON.stringify(keyData));
  const signed = signature.sign(serverPrivateKey, 'base64');

  return `ART-${Buffer.from(JSON.stringify(keyData)).toString('base64')}-${signed}`;
}

// CLIENT: Verifies key with server before allowing play
async function verifyLicense(licenseKey) {
  const response = await fetch('https://api.artsteroids.com/verify-license', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: licenseKey })
  });

  if (!response.ok) {
    alert('Invalid license key. Please purchase at artsteroids.com');
    return false;
  }

  return true;
}
```

**6. Rate Limiting & Abuse Prevention:**
```javascript
// SERVER: Prevent players from brute-forcing discovery by rapid restarts

// Track player attempts (by IP + license key)
const attemptLimits = new Map();

function trackDiscoveryAttempt(licenseKey, ipAddress) {
  const key = `${licenseKey}:${ipAddress}`;
  const attempts = attemptLimits.get(key) || { count: 0, firstAttempt: Date.now() };

  attempts.count++;
  attemptLimits.set(key, attempts);

  // If > 100 attempts in 24 hours, flag as suspicious
  const hoursSinceFirst = (Date.now() - attempts.firstAttempt) / (1000 * 60 * 60);
  if (attempts.count > 100 && hoursSinceFirst < 24) {
    flagSuspiciousActivity(licenseKey, 'Excessive discovery attempts');
  }
}
```

---

### C.3 Prize Pool Calculation & Payment

**Revenue Model:**
- **Game price**: $50 CAD per license
- **Prize pool**: 10% of gross revenue (before expenses)
- **Example**: 1000 sales = $50,000 revenue → $5,000 prize

**Prize Pool Tracking:**
```javascript
// SERVER: Real-time prize pool calculation (displayed on website)

async function getCurrentPrizePool() {
  const totalSales = await db.query('SELECT COUNT(*) FROM purchases WHERE status = "completed"');
  const prizePool = totalSales.count * 50 * 0.10; // 10% of revenue

  return {
    totalSales: totalSales.count,
    totalRevenue: totalSales.count * 50,
    prizePool: prizePool,
    currency: 'CAD'
  };
}

// Public API endpoint (no auth required)
app.get('/api/prize-pool', async (req, res) => {
  const pool = await getCurrentPrizePool();
  res.json(pool);
});
```

**Winner Verification Process:**

1. **Automated Detection**: Server detects player achieved The Infinite (300s origin stillness + secrets)
2. **Email Notification**: Player receives email with submission form link
3. **Written Explanation Submission**: Player submits essay explaining discovery process
4. **Manual Review**: Developers read explanation, verify it demonstrates understanding (not accidental discovery)
5. **Winner Announcement**: Public announcement on website (with player consent)
6. **Payment Processing**:
   ```javascript
   // Prize payment workflow
   async function processPrizePayment(winnerId) {
     const winner = await db.findWinner(winnerId);
     const prizePool = await getCurrentPrizePool();

     // Generate payment voucher
     const voucher = {
       recipient: winner.fullName,
       address: winner.mailingAddress,
       amount: prizePool.prizePool,
       currency: 'CAD',
       method: winner.preferredMethod, // 'cheque' or 'wire'
       issueDate: new Date(),
       memo: 'A.r.t.steroids - The Infinite Discovery Prize'
     };

     // If cheque: Mail via Canada Post registered mail
     // If wire: Process via business bank account

     // Tax reporting (if required - consult accountant)
     await issueTaxDocument(winner, prizePool.prizePool);

     // Update database
     await db.markPrizeAwarded(winnerId, voucher);
   }
   ```

**Post-Winner Game State:**
- First winner receives prize + Stellarian Archon status
- Subsequent players who discover The Infinite receive Stellarian Archon status only (no prize)
- Achievement remains permanently accessible (not disabled after first winner)
- Leaderboard shows all Archons with discovery timestamps

---

### C.4 Technology Stack (Production)

**Frontend (Client):**
- **Three.js** (WebGL rendering) - same as ARTexplorer
- **Obfuscated JavaScript** (production build only)
- **Web Crypto API** (client-side encryption for telemetry)
- **Service Worker** (offline play after first load, cache game assets)

**Backend (Server):**
- **Node.js + Express** (API server)
- **PostgreSQL** (license keys, player sessions, telemetry, winner data)
- **Redis** (rate limiting, session management)
- **Stripe API** (payment processing for $50 purchases)
- **AWS S3 / Cloudflare R2** (game asset hosting)
- **AWS Lambda / Cloudflare Workers** (serverless functions for license verification)

**Infrastructure:**
- **CDN**: Cloudflare (fast global delivery, DDoS protection)
- **SSL/TLS**: HTTPS required (Let's Encrypt certificates)
- **Domain**: `artsteroids.com` or similar
- **Analytics**: Privacy-respecting analytics (Plausible.io, not Google)

**Deployment Pipeline:**
```bash
# Build script for production deployment

#!/bin/bash
# build-production.sh

echo "Building A.r.t.steroids production release..."

# 1. Obfuscate client code
javascript-obfuscator ./game-modules/ --output ./dist/game-modules/ [options]

# 2. Minify HTML/CSS
html-minifier index.html -o dist/index.html
cleancss art.css -o dist/art.css

# 3. Bundle and compress assets
# (Three.js, textures, sounds)

# 4. Generate integrity hashes (Subresource Integrity)
openssl dgst -sha384 -binary dist/game-modules/rt-asteroids-core.js | openssl base64 -A

# 5. Upload to CDN
aws s3 sync ./dist/ s3://artsteroids-production/ --acl public-read

# 6. Deploy server API
git push heroku main  # or AWS/Cloudflare deployment

echo "Production build complete!"
```

---

### C.5 Ethical Considerations

**Transparency:**
- Prize pool amount is publicly visible on website
- Winner announcement (with consent) builds trust
- No hidden fees or deductions from prize

**Fairness:**
- All players have equal access to clues (embedded in game)
- No pay-to-win mechanics (single $50 purchase, unlimited attempts)
- Discovery requires understanding, not grinding or random luck

**Educational Mission:**
- Game genuinely teaches Rational Trigonometry and geometric philosophy
- Prize incentivizes deep engagement with mathematical concepts
- Written explanation requirement ensures learning occurred

**Privacy:**
- Minimal data collection (license key, play sessions for anti-cheat only)
- No selling of player data
- GDPR/PIPEDA compliance (players can request data deletion)

---

### C.6 Development Milestones (Prize-Enabled Release)

**Phase 1: Core Game (8 weeks)** - No prize, free beta testing
**Phase 2: Polish & Testing (4 weeks)** - Closed alpha with prize simulation
**Phase 3: Legal Review (2 weeks)** - Lawyer approval, terms of service finalized
**Phase 4: Server Infrastructure (2 weeks)** - License system, telemetry, prize tracking
**Phase 5: Security Audit (2 weeks)** - Penetration testing, obfuscation review
**Phase 6: Public Launch** - $50 sales begin, prize pool accumulates

**Total Timeline:** ~18 weeks (4.5 months) from start to public launch

---

### C.7 Contingency Planning

**What if no one discovers The Infinite within X years?**
- **Sunset clause**: After 3 years, if no winner, release official hint system
- **Progressive clues**: Year 1 (silent), Year 2 (subtle hint on website), Year 3 (direct clue)
- **Prize rollover**: Unclaimed prize could fund sequel game or donate to math education

**What if multiple players discover simultaneously?**
- **Server timestamp**: First to achieve 300-second stillness + submit valid explanation wins
- **Tie-breaker**: If within same 24-hour period, split prize equally

**What if winner is in jurisdiction where prize is illegal?**
- **Alternative award**: Offer equivalent value in non-cash prize (computer hardware, math course tuition, etc.)
- **Donation option**: Winner can choose to donate prize to charity (tax receipt)

---

**CONFIDENTIAL - INTERNAL USE ONLY**
This appendix contains proprietary implementation details and must not be distributed with public game documentation. Code obfuscation and server-side validation are critical to maintaining prize integrity.

---

## Appendix D: Implementation Strategy - Unified Repository Approach

### D.1 Architecture Decision: Option 1 (Keep Game in ARTexplorer Repo)

**Decision:** Keep A.r.t.steroids development within the existing ARTexplorer repository. This unified approach maximizes speed to MVP while maintaining the option to split into separate repositories later if the codebase becomes too heavy.

**Rationale:**

**Advantages:**
- **Reuse existing infrastructure**: All core modules already exist (rt-rendering.js, rt-math.js, rt-polyhedra.js, rt-matrix-planar.js)
- **OrbitControls camera system**: Click-drag battlefield rotation inherited from ARTexplorer
- **Quadray/Cartesian conversion**: Foundation for WXYZ player motion and XYZ enemy tracking
- **WebGL rendering pipeline**: Three.js scene management, lighting, materials already configured
- **State persistence**: rt-state-manager.js provides save/load framework for game progress
- **Development velocity**: No code duplication, single repository to maintain during prototyping
- **Educational coherence**: ARTexplorer demonstrates RT geometry, A.r.t.steroids gamifies it (natural progression)
- **Deployment flexibility**: GitHub Pages auto-deploys both apps from same repo
- **Shared documentation**: Geometry documents/ folder serves both educational tool and game design

**Future Split Strategy:**
- If repo exceeds ~50MB or becomes organizationally complex, split into:
  - `ARTexplorer` (free math demo, CC-NC-ND license)
  - `ARTsteroids` (paid game, commercial license)
- Both repos share common modules via git submodules or npm packages
- Splitting later is straightforward (no technical debt from unified start)

---

### D.2 Repository Structure (Unified Approach)

```
ARTExplorer/
├── index.html                  ← Free ARTexplorer entry point (existing)
├── artsteroids.html            ← Paid game entry point (NEW)
├── art.css                     ← Shared styles (extend with game-specific classes)
│
├── modules/                    ← All JavaScript modules
│   ├── core/                   ← Shared core modules (EXISTING)
│   │   ├── rt-rendering.js     ← WebGL renderer, camera, scene (REUSED)
│   │   ├── rt-math.js          ← Quadray/Cartesian math, RT calculations (REUSED)
│   │   ├── rt-polyhedra.js     ← Geometry generation (REUSED + EXTENDED)
│   │   ├── rt-matrix-planar.js ← Transformation matrices (REUSED)
│   │   └── rt-state-manager.js ← State persistence (REUSED + EXTENDED)
│   │
│   ├── explorer/               ← ARTexplorer-specific modules (EXISTING)
│   │   ├── rt-init.js          ← Explorer app initialization
│   │   ├── rt-controls.js      ← Polyhedra selection UI
│   │   ├── rt-papercut.js      ← Cutplane slicing
│   │   └── color-theory-modal.js
│   │
│   └── asteroids/              ← A.r.t.steroids game modules (NEW)
│       ├── rt-asteroids-core.js       ← Game loop, state machine, wave spawning
│       ├── rt-asteroids-player.js     ← Player ship, ASDF rubber-band motion
│       ├── rt-asteroids-enemies.js    ← Cartesian enemy AI, targeting telegraph
│       ├── rt-asteroids-weapons.js    ← Laser darts, collision detection, explosions
│       ├── rt-asteroids-hud.js        ← Geodesic HUD, telemetry overlays
│       ├── rt-asteroids-blackhole.js  ← Wave transitions, space warping
│       ├── rt-asteroids-license.js    ← License key validation (client-side)
│       └── rt-asteroids-audio.js      ← Sound effects, music management
│
├── demos/                      ← Test files (EXISTING + NEW GAME TESTS)
│   ├── quadray-test.html       ← Existing RT demos
│   ├── asdf-motion-test.html   ← ASDF rubber-band motion prototype (THIS WEEK)
│   └── targeting-test.html     ← Targeting telegraph visualization test
│
├── Geometry documents/         ← Documentation (SHARED)
│   ├── README.md               ← ARTexplorer overview
│   ├── A.r.t.steroids.md       ← Game design document (THIS FILE)
│   ├── Basis-Vector-Symbols.md
│   └── puri-phi.md
│
├── .github/workflows/          ← CI/CD (EXISTING)
│   └── deploy.yml              ← Auto-deploys to GitHub Pages (WORKS FOR BOTH APPS)
│
├── .clinerules                 ← Development workflow
├── .gitignore
└── LICENSE                     ← Dual licensing: CC-NC-ND (explorer) + Commercial (game)
```

---

### D.3 Dual Entry Point Strategy

**Free ARTexplorer (index.html):**
- Existing educational tool (no changes to current functionality)
- Loads `modules/core/` and `modules/explorer/` only
- License: Creative Commons Attribution-NonCommercial-NoDerivatives (CC-NC-ND)
- Deployment: https://arossti.github.io/ARTexplorer/ (current URL)

**Paid A.r.t.steroids (artsteroids.html):**
- Game entry point (NEW file, similar structure to index.html)
- Loads `modules/core/` (shared) and `modules/asteroids/` (game-specific)
- Requires license key validation on load (checks with server)
- License: Commercial/Proprietary ($50 CAD purchase)
- Deployment: https://arossti.github.io/ARTexplorer/artsteroids.html (separate URL)
- **Not publicly accessible**: License key gate prevents unauthorized play

**Shared Infrastructure:**
- Both apps use same WebGL rendering pipeline (rt-rendering.js)
- Both apps use same RT math library (rt-math.js)
- Both apps use same coordinate conversion (Quadray ↔ Cartesian)
- Both apps use same OrbitControls camera system (click-drag rotation)
- Both apps use same polyhedra generation (tetrahedron, icosahedron, etc.)

---

### D.4 Licensing Split (Same Repository)

**ARTexplorer License (CC-NC-ND):**
```
modules/core/*          ← Shared (dual-licensed: CC-NC-ND OR Commercial)
modules/explorer/*      ← Free only (CC-NC-ND)
index.html              ← Free only (CC-NC-ND)
art.css (base styles)   ← Shared (CC-NC-ND)
```

**A.r.t.steroids License (Commercial/Proprietary):**
```
modules/asteroids/*     ← Commercial only (proprietary)
artsteroids.html        ← Commercial only (proprietary)
art.css (game styles)   ← Commercial only (proprietary)
```

**LICENSE File Strategy:**
```
ARTexplorer - Dual License

1. FREE EDUCATIONAL USE (ARTexplorer app, index.html):
   Licensed under Creative Commons Attribution-NonCommercial-NoDerivatives 4.0
   International (CC-NC-ND 4.0)

2. COMMERCIAL GAME (A.r.t.steroids, artsteroids.html):
   Proprietary commercial software. $50 CAD per license.
   All rights reserved. No redistribution or reverse-engineering permitted.

3. SHARED CORE MODULES (modules/core/*):
   Dual-licensed under BOTH CC-NC-ND (for educational use) AND Commercial
   (for game integration). Use in A.r.t.steroids game requires paid license.
```

---

### D.5 Immediate Next Steps (Phase 1 Prototyping)

**This Week: ASDF Rubber-Band Motion Test**

1. **Create test file**: `demos/asdf-motion-test.html`
   - Minimal HTML page with canvas
   - Load core modules: rt-rendering.js, rt-math.js, rt-matrix-planar.js
   - Initialize single tetrahedron at origin [1,1,1,1]

2. **Implement ASDF motion prototype**:
   - Create `modules/asteroids/rt-asteroids-player.js` (new file)
   - ASDF keypress handlers (A=W, S=Z, D=Y, F=X basis vectors in Quadray system)
   - Rubber-band displacement logic:
     - Hold key: Exponential/quadratic distance curve along corresponding basis vector
     - Release key: Quantitative easing return to origin (0.5-1.0s animation)
   - Max displacement: Q_max = 50 quadrance units
   - Visual feedback: Basis vector glow during displacement, fading trail during return

3. **Test with existing OrbitControls**:
   - Verify click-drag camera rotation works alongside ASDF motion
   - Ensure player ship stays at canvas center (world-frame reference)
   - Confirm Quadray displacement calculations are accurate

4. **Visual validation**:
   - Display current Quadray coordinates [W,X,Y,Z] in HUD corner
   - Show Cartesian equivalent [x,y,z] for comparison
   - Render thin lines along W/X/Y/Z axes (different colors)
   - Tetrahedron should smoothly move along axis, then smoothly return

**Success Criteria:**
- ASDF keys control displacement along tetrahedral axes
- Release returns to origin with smooth deceleration
- Camera rotation (click-drag) independent of ship motion
- No interference with existing ARTexplorer modules

**Timeline:** Implement and test by end of this week (2026-01-17)

---

**Next Week: Targeting Telegraph Visualization Test**

5. **Create test file**: `demos/targeting-test.html`
   - Single player tetrahedron at origin
   - Single enemy cube at fixed position
   - Simulate Cartesian targeting calculation

6. **Implement targeting hairline**:
   - Create `modules/asteroids/rt-asteroids-enemies.js` (new file)
   - Enemy begins targeting: Thin hairline appears (lineWidth 0.5, opacity 0.3)
   - Hairline updates to track player position during 1.5s calculation delay
   - After 1.5s: Hairline becomes heavy glowing laser dart (lineWidth 3-5)
   - Laser dart travels toward player (can be dodged with ASDF motion)

7. **Test dodge mechanic**:
   - Use ASDF motion to move away from predicted impact point
   - If player Q-displacement > 10 during targeting phase, enemy recalculates from scratch
   - Verify hairline visibility enables tactical dodging

**Success Criteria:**
- Targeting hairline visible before laser fires
- Dodge window allows evasion via ASDF motion
- WXYZ displacement breaks Cartesian targeting (forces recalculation)

---

### D.6 Module Dependencies (Reuse vs New Code)

**REUSED from ARTexplorer (no changes needed):**
- ✅ rt-rendering.js (WebGL renderer, camera, scene management)
- ✅ rt-math.js (Quadray ↔ Cartesian, quadrance, spread calculations)
- ✅ rt-polyhedra.js (tetrahedron, cube, icosahedron generation)
- ✅ rt-matrix-planar.js (rotation/scaling matrices)
- ✅ OrbitControls (Three.js camera controls via rt-rendering.js)

**EXTENDED from ARTexplorer (add new functions):**
- 🔧 rt-polyhedra.js → Add stellated variants (small cones on vertices)
- 🔧 rt-state-manager.js → Add game state persistence (wave, score, ship tier, fuel)

**NEW for A.r.t.steroids:**
- ✨ rt-asteroids-core.js (game loop, state machine, wave spawning)
- ✨ rt-asteroids-player.js (ASDF rubber-band motion, ship rotation, firing)
- ✨ rt-asteroids-enemies.js (Cartesian AI, targeting telegraph, movement patterns)
- ✨ rt-asteroids-weapons.js (laser darts, collision detection, explosions, torpedoes)
- ✨ rt-asteroids-hud.js (geodesic HUD, telemetry overlays, fuel/score display)
- ✨ rt-asteroids-blackhole.js (wave transitions, geodesic collapse/expansion animations)
- ✨ rt-asteroids-license.js (client-side license key validation)
- ✨ rt-asteroids-audio.js (sound effects, music management)

**Estimated Code Reuse:**
- ~60% of core functionality already exists in ARTexplorer
- ~40% new game-specific code required
- Zero duplication between explorer and game modules

---

### D.7 Benefits of Unified Approach (Summary)

1. **Speed to MVP**: Prototyping starts this week (ASDF motion test)
2. **No code duplication**: Single source of truth for RT math and rendering
3. **Incremental development**: Test game mechanics without disrupting explorer app
4. **Educational coherence**: ARTexplorer teaches geometry, A.r.t.steroids applies it
5. **Deployment simplicity**: GitHub Actions auto-deploys both apps
6. **Future flexibility**: Can split repos later if needed (no technical debt)
7. **Shared documentation**: Geometry concepts documented once, used twice

---

### D.8 When to Consider Splitting Repositories

**Triggers for future split:**
- Repository size exceeds 50MB (GitHub Pages limit concerns)
- Game requires server-side infrastructure (license validation, telemetry, prize tracking)
- Licensing becomes too complex for single repo (legal concerns)
- Development team grows (separate teams for explorer vs game)
- Separate release cycles needed (explorer updates shouldn't affect game stability)

**How to split cleanly later:**
- Extract `modules/core/` into standalone npm package or git submodule
- Both ARTexplorer and ARTsteroids repos import shared core modules
- Explorer repo: `modules/explorer/` + shared core dependency
- Game repo: `modules/asteroids/` + shared core dependency + server code
- Minimal disruption (shared code already organized in `core/` subdirectory)

---

**Decision:** Proceed with unified repository (Option 1). Begin ASDF motion prototype this week.

---

### D.9 Revisited: Phased Hybrid Strategy (February 2026)

**Context:** With most core game features now implemented (~2,100 lines across 8 modules in `modules/asteroids/`), and the unified approach having served us well through prototyping, it's time to reassess the architecture decision for the road ahead.

#### Current State Assessment

| Metric | Value | Implication |
|--------|-------|-------------|
| Game modules | 8 files, ~2,100 lines, 76KB | Tiny footprint — splitting now is premature |
| Total repo size | 211MB (62MB `.git`) | Already large; audio/music assets will grow this |
| Core module reuse | `rt-math.js`, `rt-polyhedra.js`, `rt-rendering.js` | Game is deeply coupled to explorer's math/rendering layer |
| Game entry point | `artsteroids.html` not yet created | No public-facing game URL exists yet |
| Server infrastructure | None built | License validation, anti-cheat, prize tracking all future work |

#### Why the Unified Approach Remains Correct — For Now

The unified repo has delivered exactly what we needed during prototyping:

1. **Zero friction**: Edit `rt-polyhedra.js`, immediately test in both explorer and game
2. **No sync overhead**: One repo, one branch, one deployment pipeline
3. **Rapid iteration**: Game modules import core modules directly — no package management
4. **Clean isolation**: `modules/asteroids/` is already a self-contained subdirectory

Splitting now would add maintenance burden (two repos, shared module versioning, cross-repo PRs) with no corresponding benefit. The game is still in development — premature separation would slow us down.

#### Why We WILL Need to Split for Production

Several factors make a future split inevitable for commercialization:

**1. Licensing Conflict (Critical)**
- ARTexplorer: CC-NC-ND 4.0 (free, open, non-commercial)
- A.r.t.steroids: Proprietary/commercial ($50 CAD per license)
- **Problem**: A public GitHub repo containing both means anyone who clones gets the commercial game source for free. The CC-NC-ND license on the explorer doesn't legally protect the game modules in the same repo without explicit dual-licensing headers in every file.

**2. Code Obfuscation vs Open Source (Incompatible)**
- The game requires JavaScript obfuscation for anti-cheat and prize integrity (Appendix C.2)
- The explorer is intentionally readable — it's an educational tool
- You cannot obfuscate half a repo's modules while keeping the other half readable in the same build/deploy pipeline

**3. Server-Side Infrastructure (Different Architecture)**
- License validation, telemetry, prize pool tracking (Appendix C) require Node.js/Express + PostgreSQL + Redis
- ARTexplorer is a pure static site deployed to GitHub Pages
- Server code doesn't belong in a client-side repo

**4. Asset Growth**
- Sound effects (4 laser variants, explosions, hyperspace, black hole, UI) and music tracks (4 themes) will add significant binary weight
- The repo is already 211MB — audio assets could push it past GitHub's comfort zone
- Game assets shouldn't inflate the educational tool's clone size

**5. Security Surface**
- Decoy code injection, split-secret architecture, and anti-cheat telemetry (Appendix C.2–C.4) sitting next to open-source educational modules is a contradiction
- Any contributor with repo access can see the "confidential" appendices and game secrets

#### The Phased Hybrid Strategy

**Phase 1: Unified Prototyping (Current — Continue)**
- Keep everything in ARTexplorer repo
- Game modules live in `modules/asteroids/`
- Game design document lives in `modules/asteroids/A.r.t.steroids.md`
- **Key safeguard**: Keep game document and sensitive design notes out of public git history (`.gitignore`)
- Commit game code only locally on feature branches; do not push to public `main`
- Test game mechanics against core modules directly — no abstraction layer

**Phase 2: Shared Core Extraction (When game is playable end-to-end)**
- Extract shared modules into `@artexplorer/core` package or git submodule:
  - `rt-math.js` (Quadray, RT calculations)
  - `rt-polyhedra.js` (geometry generation)
  - `rt-rendering.js` (Three.js scene management)
  - `rt-nodes.js` (vertex geometry)
  - `rt-grids.js` (grid rendering)
- Both repos consume the shared core as a dependency
- Shared core retains CC-NC-ND license (educational foundation)
- This is the "clean cut" point — after this, repos are independent

**Phase 3: Separate Game Repository (Before commercial launch)**
- Create `ARTsteroids` private repo with:
  - `modules/asteroids/*` (game-specific code, proprietary license)
  - `artsteroids.html` (game entry point)
  - `server/` (Node.js license validation, anti-cheat, prize tracking)
  - `assets/audio/` (sound effects, music)
  - Obfuscation build pipeline
  - Commercial deployment (own domain, CDN, not GitHub Pages)
- ARTexplorer repo continues as free educational tool (public, CC-NC-ND)
- Both repos depend on `@artexplorer/core` shared package

#### Decision Triggers for Each Phase Transition

| Trigger | Action |
|---------|--------|
| Game is playable end-to-end (all 10 waves + boss) | Begin Phase 2: extract shared core |
| Ready for closed alpha / external testers | Complete Phase 2: both repos functional |
| Legal review complete + server infrastructure built | Begin Phase 3: separate game repo |
| First dollar of revenue (game goes on sale) | Phase 3 must be complete |

#### Immediate Action Items

1. **Move `A.r.t.steroids.md` to `modules/asteroids/`** — keep design doc with the code it describes
2. **Add game design doc to `.gitignore`** — confidential content (Appendix C) must not reach public repo
3. **Continue developing in `modules/asteroids/`** — unified approach still optimal for current phase
4. ~~Do not create `artsteroids.html` yet~~ — **Done**: `artsteroids.html` created as local-only test page (gitignored), no public exposure

#### Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Splitting too early → development friction | Stay unified until playable end-to-end (Phase 2 trigger) |
| Splitting too late → licensing exposure | Game design doc already excluded from git; game modules are small and could be extracted in a day |
| Shared core diverges after split | Semantic versioning on `@artexplorer/core`; both repos pin to tested versions |
| Audio assets bloat repo before split | Store audio assets outside git (local only, or separate asset repo) until Phase 3 |

**Updated Decision (February 2026):** Continue unified development. Protect confidential game content via `.gitignore`. Plan for Phase 2 extraction when the game reaches end-to-end playability. The unified approach has earned its keep — splitting is a future optimization, not a current need.

---

### D.10 Implementation Log: artsteroids.html Test Page (February 2026)

**Status:** Active prototype — Stellarian ship design and controls validation

#### What's Built

`artsteroids.html` — standalone test page (gitignored, local-only) validating core player ship experience:

**Ship: Dual Tetrahedron**
- Polyhedra.tetrahedron(1.0) with negated vertices (dual parity)
- Cyan wireframe edges + semi-transparent faces (opacity 0.12) + vertex node spheres
- DoubleSide rendering for visibility from any camera angle
- **Critical geometry insight**: Dual tet *vertices* point along Quadray axes, but *face normals* are anti-aligned (-Q). Crosshair/firing geometry uses the original tet's faces (whose normals ARE the Quadray axes) for unique 1:1 axis-to-face mapping.

**ASDF Key Mapping (Ergonomic Layout)**
- A → QW axis (Yellow) — left pinkie, leftward motion
- S → QZ axis (Green) — ring finger
- D → QY axis (Blue) — middle finger, forward/back
- F → QX axis (Red) — pointer finger, rightward motion

**ASDF Rubber-Band Displacement (Navigation Mode)**
- Hold key: displacement increases along Quadray basis vector (capped at 7.0 units)
- Release key: cubic ease-out return to origin (~0.75s)
- Fuel cost: 1 per second of active displacement
- Ship group translates by sum of all displacement vectors (Quadray → Cartesian)

**Face-Normal Firing (Spacebar-Hold Mode)**
- Hold spacebar to engage firing mode — all 4 crosshairs glow bright
- While spacebar held, ASDF fires from respective face along its normal (= Quadray axis)
- Release spacebar returns to navigation mode
- 4 triangular crosshairs inside dual tet, positioned at original tet face centroids pointing outward along Quadray axes
- Line2 (fat line) darts — colored by firing face axis, 1.5 unit length, 4px wide

**Scene & HUD**
- Black background, Z-up camera (6, -6, 5), OrbitControls for click-drag orbit
- 4 colored Quadray basis vector arrows (length 3, glow during displacement)
- G key toggles Quadray grid (6 basis-pair planes, opacity 0.35)
- Retro HUD: WAVE/SCORE (top-left), FUEL bar (top-right), WXYZ + Cartesian coords (bottom-left), ASDF key indicators colored by axis (bottom-center)

**Dependencies:** THREE.js v0.160.0 (CDN), OrbitControls, Line2/LineMaterial/LineGeometry, rt-math.js, rt-polyhedra.js only — zero asteroids module dependencies

#### Key Design Decisions

1. **Dual tetrahedron** over original: Vertices point along Quadray axes (dual's vertex at QW, QX, QY, QZ). However, the dual's *face normals* are -Q (anti-aligned), so firing geometry uses the original tet's faces for correct axis mapping. The original tet face normals ARE the Quadray basis vectors → unique dot = 1 match per axis.
2. **Self-contained HTML**: Does NOT import any asteroids modules (their update() functions are empty). All ship logic implemented inline for rapid iteration
3. **window.THREE = THREE**: rt-polyhedra.js and rt-math.js expect THREE on global scope (non-ES6 import pattern)

#### Next Steps

- [x] Spacebar-hold firing mode: spacebar engages firing, ASDF fires from respective face while held, releasing spacebar returns to dodge/navigate mode
- [x] Darts colored by firing face (A=Yellow, S=Green, D=Blue, F=Red)
- [x] Fixed crosshair mapping: use original tet faces (normals = Quadray axes) instead of dual tet faces (normals = -Q, degenerate 3-way tie)
- [x] Ergonomic ASDF remap: A=QW(Y) pinkie-left, S=QZ(G) ring, D=QY(B) middle, F=QX(R) pointer-right
- [ ] Asteroid generation and collision detection
- [ ] Ship tier upgrades (Tetrahedron → Octahedron → Icosahedron)
- [ ] Black hole level transitions

---

**End of Design Document**

_"In Quadray space, no one can hear you take the square root."_
