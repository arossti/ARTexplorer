# ARTexplorer - Claude Code Instructions

> **First time on this project?** Read `README.md` for mathematical foundations, architecture overview, and RT principles.

## Project Overview

**ARTexplorer** (Algebraic Rational Trigonometry Explorer) - Interactive 3D geometry visualization combining R. Buckminster Fuller's Synergetics with N.J. Wildberger's Rational Trigonometry.

- **Live Site**: https://arossti.github.io/ARTexplorer/
- **Architecture**: Client-side JavaScript/WebGL (THREE.js)
- **Documentation**: See `README.md` for overview, `Geometry documents/` for detailed docs

## Git Workflow

**Standard flow**: Pull main → Branch → Work → Test → Commit → Push → PR → Merge

### Critical Rules

- **ALWAYS push before switching branches** (unpushed = can be lost!)
- **Branch from main only** (never from feature branches)
- **Test locally before commits** - User prefers to verify before committing
- **NEVER commit large binary files** (PDFs, images) - local resources only

### Commit Format

Always use HEREDOC syntax for commit messages:

```bash
git commit -m "$(cat <<'EOF'
Type: Brief description of the change

🤖 Co-Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Andy🤦‍♂️ & Claude🤖 <andy@openbuilding.ca>
EOF
)"
```

**Commit types**: `Feat`, `Fix`, `Refactor`, `Docs`, `Improve`, `Clean`

### Pull Requests

```bash
gh pr create --title "Type: Brief description" --body "$(cat <<'EOF'
## Summary
- Bullet point summary of changes

## Changes
- Detailed list of what was modified

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Andy🤦‍♂️ & Claude🤖 <andy@openbuilding.ca>
EOF
)"
```

## Key Technical Concepts

### Coordinate Systems

- **Cartesian XYZ**: Traditional 3D coordinates
- **Quadray WXYZ**: Tetrahedral coordinates (4 basis vectors)
- Conversion in `modules/rt-math.js`

### Rational Trigonometry

- **Quadrance**: Q = a² (replaces distance)
- **Spread**: s = sin²θ (replaces angle)
- Maintains algebraic exactness until GPU boundary

### Core Modules

| File                          | Purpose                                |
| ----------------------------- | -------------------------------------- |
| `modules/rt-rendering.js`     | WebGL rendering, camera, scene         |
| `modules/rt-init.js`          | App initialization, UI, event handlers |
| `modules/rt-state-manager.js` | State persistence, undo/redo           |
| `modules/rt-polyhedra.js`     | Polyhedra generation                   |
| `modules/rt-math.js`          | Quadray coords, rational trig          |

## Development Guidelines

1. **Read before modifying** - Never propose changes to code you haven't read
2. **Maintain rational exactness** - Avoid premature decimal conversion
3. **Test in browser** - Verify geometry changes visually
4. **User tests before commits** - Don't assume changes need immediate commit

### When Modifying Geometry

- Verify rational exactness (check console for "Max error")
- Test in both Cartesian and Quadray modes
- Ensure face winding is counter-clockwise (outward normals)
- Test state saves/loads correctly
