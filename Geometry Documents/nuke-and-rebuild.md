# Nuke-and-Rebuild: Public ARTexplorer Repo

## Context

The public repo (`arossti/ARTexplorer`) has leaked private content through PR refs that survived the emergency force-push. PRs #23-#109 still contain `artex-osx/` (Rust native app) and `modules/asteroids/` (game) files. Deleting branches doesn't delete PR refs — only nuking the repo removes them.

Additionally, `private/main` currently HAS `artex-osx/` in its tree (63 files), so we can't just push it directly — we need to strip private content before pushing to the new public repo.

## What We're Preserving vs Losing

**Preserved (all local):**
- All JS source files, modules, geometry docs
- GitHub Actions workflows (`deploy.yml`, `claude-review.yml`)
- `.github/` configuration
- Full history remains in private repo and local git

**Lost (acceptable):**
- Public commit history (squashed to single clean commit)
- 8 closed issues (all resolved, low value)
- 2 stars
- All PR refs (the whole point)
- gh-pages branch (auto-rebuilt on first deploy)

**Repo settings to restore:**
- Description: `ARTexplorer - Interactive 3D Geometry Visualization Tool`
- Homepage: `https://arossti.github.io/ARTexplorer/` (fix — currently points to wrong `/OBJECTIVE/` project)
- Topics: `geometry, polyhedra, rationaltrigonometry, synergetics, vectoralgebra, weierstrass`
- License: CC BY-NC-ND 4.0 (already in repo as `LICENSE` file — will carry over in the squash commit)
- Pages: source `main`, path `/`
- ~~Secret: `ANTHROPIC_API_KEY`~~ — skip, bugbot never worked well
- Visibility: public

## Steps

### Phase 1: Prepare Clean Orphan Branch (local, in working repo)

1. **Create orphan branch with only public-safe files**
   ```bash
   cd '/Users/andrewthomson/Library/Mobile Documents/com~apple~CloudDocs/Documents/Documents - iMac Pro/[T] iCLOUD STUDIO/[T] Active Projects/2022 | Open Building/ARTExplorer'
   git checkout --orphan public-clean
   ```

2. **Remove private files from the index** (keeps them on disk)
   ```bash
   git rm -r --cached artex-osx/
   git rm --cached artsteroids.html
   git rm -r --cached modules/asteroids/
   # If any aren't tracked, these will just warn — that's fine
   ```

3. **Update .gitignore to permanently exclude ALL private content**
   Current .gitignore has:
   - `modules/asteroids/` — game modules (already present)
   - `artsteroids.html` — game HTML (already present)
   - `artex-osx/target/` — Rust build artifacts only

   **Must add `artex-osx/` (the entire Rust app directory)** — currently only `artex-osx/target/` is excluded, meaning Rust source files could leak on future pushes:
   ```gitignore
   # Rust/Metal native app (private repo only)
   artex-osx/
   ```
   This replaces the narrower `artex-osx/target/` rule. With this in place, `git add -A` will NEVER stage any Rust or game files, making future pushes to origin safe.

4. **Stage and commit**
   ```bash
   git add -A
   git commit -m "$(cat <<'EOF'
   Initial public release: ARTexplorer JS app

   Interactive 3D geometry visualization combining Synergetics + Rational Trigonometry.
   Squashed from private development history for clean public release.

   Co-Authored-By: Andy & Claude <andy@openbuilding.ca>
   EOF
   )"
   ```

5. **Verify no private files in the commit**
   ```bash
   git ls-tree -r HEAD --name-only | grep -E 'artex-osx|artsteroids|modules/asteroids'
   # Should return nothing
   ```

### Phase 2: Nuke Public Repo

6. **Delete the public repo** via GitHub CLI
   ```bash
   gh repo delete arossti/ARTexplorer --yes
   ```
   (Requires confirmation — this is irreversible)

7. **Recreate with same name**
   ```bash
   gh repo create arossti/ARTexplorer --public \
     --description "ARTexplorer - Interactive 3D Geometry Visualization Tool"
   ```

### Phase 3: Push Clean Commit

8. **Push orphan branch as main to new repo**
   ```bash
   git push origin public-clean:main
   ```

9. **Return to working branch**
   ```bash
   git checkout gumball-1e-f   # or whatever branch was active
   git branch -D public-clean  # clean up local orphan branch
   git fetch origin             # sync tracking refs
   ```

### Phase 4: Restore Settings

10. **Configure GitHub Pages**
    ```bash
    gh api repos/arossti/ARTexplorer/pages -X POST \
      -f build_type=workflow
    ```
    (The `deploy.yml` workflow handles the rest automatically on push to main)

11. **Restore repo metadata**
    ```bash
    gh repo edit arossti/ARTexplorer \
      --homepage "https://arossti.github.io/ARTexplorer/" \
      --add-topic geometry --add-topic polyhedra \
      --add-topic rationaltrigonometry --add-topic synergetics \
      --add-topic vectoralgebra --add-topic weierstrass
    ```

12. ~~Re-add ANTHROPIC_API_KEY secret~~ — skip (bugbot unused). Consider removing `claude-review.yml` from `.github/workflows/` to avoid Action failures.

### Phase 5: Verify

13. **Check no private content**: `git ls-remote origin` — should show only `refs/heads/main`, no PR refs
14. **Check deployment**: Wait for GitHub Actions `deploy.yml` to run, then visit https://arossti.github.io/ARTexplorer/
15. **Smoke test the live site**: Load a polyhedron, toggle Quadray mode, check console for errors

## Ongoing: Pushing Future Updates to Public

After the nuke-and-rebuild, origin (public) will have a single-commit main with no shared ancestry with private/main. Future public updates should follow this pattern:

1. **Work normally on private branches** (committed to `private` remote)
2. **When ready to publish JS app changes to public:**
   ```bash
   git checkout main

   # .gitignore ensures artex-osx/, modules/asteroids/, artsteroids.html are excluded
   # Just push to origin — git will handle the diverged histories
   git push origin main
   ```

   **Note**: Since origin/main has no shared ancestry with local main, the first push after rebuild will need `--force` (one-time only). After that, normal pushes work.

   Alternatively, after the rebuild, reset origin tracking:
   ```bash
   git fetch origin
   git branch --set-upstream-to=origin/main main
   ```

**Safety net**: The .gitignore with `artex-osx/`, `modules/asteroids/`, and `artsteroids.html` prevents accidental staging. But always double-check before pushing to origin:
```bash
git diff --stat origin/main..HEAD | grep -E 'artex-osx|asteroids|artsteroids'
# Should return nothing
```

## Rollback

If anything goes wrong mid-process, the private repo (`ARTexplorer-private`) has the complete unfiltered history. The local working copy is unaffected — the orphan branch is disposable.
