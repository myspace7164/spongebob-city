# Frame-loop performance

Status: done

## Goal

Reduce unnecessary CPU work during normal gameplay without changing game rules or visuals.

## Done

- Removed `placeScenery()` from the render loop. Static Basel building collider extraction and scenery placement now run only at map, terrain, level, or reset transitions.
- Replaced per-frame sorting and distance square roots for build-site targeting with a direct nearest-plot scan using squared distance.
- Reused one reduced-motion media query and avoided rewriting unchanged multiplayer/emote canvas data attributes each frame.

## Checks

- `npm run build`, `npm run lint`, and all 107 unit tests pass.
- Focused browser checks for the gameplay loop and emotes pass (3 tests).
- The static scenery/collision refresh remains wired to initial setup, asset/terrain load, and level/reset changes.

## Next

- No follow-up needed. Changes are ready for the standard privacy check, commit, merge to `main`, and push.
