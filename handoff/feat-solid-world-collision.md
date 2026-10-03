# World collision, build access, hat shop, sprint and HUD cleanup

## Status

Implementation is on `main` at commit `096f83b`. Production build and all 101 Node tests pass. The focused two-browser Playwright check confirms both clients load the Blender SpongeBob GLB for remote players. Privacy guard, commit, fast-forward merge and push all completed.

## Changes

- Added `src/game/collisions.ts`: spatially indexed map-building and tree footprints, plus axis-separated swept movement for the player. Plot props, NPCs, Dr. Beton and co-op teammates have dynamic solids; trigger pickups and visual effects remain non-solid. A player already overlapped by a newly placed solid can move outward to escape.
- Dr. Beton now moves through the same solid-footprint collision world in solo and co-op, with his own collider excluded from blocking checks. His body and vehicle stop at physical objects, and he retargets when a route is blocked.
- Remote multiplayer avatars now clone the locally loaded Blender character asset, share its materials, and get separate mesh buffers for the same locomotion rig. They mirror synchronized movement, scale, WaterFull/Dry morphs and the run's equipped hat. The procedural remote avatar remains only as the same local character fallback until the GLB loads.
- Added optional `?debugCollisions=1` overlays.
- Construction now rejects all build tools on asphalt; Karate/Patrick unseal it first. Updated gameplay tests to use that sequence.
- Hat shop opens during a run with `T`; it pauses play and returns to the same run. The HUD advertises the shortcut because pointer lock hides the cursor.
- Shift sprint lasts 10 seconds, then has a 3-second cooldown. Active sprint removes 5 L/s from stored water. `PlayerState` sprint fields are applied authoritatively in co-op too.
- Releasing Shift no longer resets elapsed sprint time, so tapping Shift cannot bypass the 10-second limit.
- Mini Sponge applies a visible 80% character scale even while the temporary giant power is active, and reduces effective water capacity to 80%.
- Reduced repeated HUD information: Q boost status appears in the power-up dock, the footer keeps six frequent shortcuts, and the in-run hat entry is shown there instead of as a separate floating badge. Specialized keys stay in the field guide.
- Removed no assets or gameplay systems. The sandbox foundation stays because tests use it and documentation describes it as reusable code.

## Checks already run

- `npm run build` passed.
- `npm test` passed: 101 tests.
- Two-browser Playwright co-op test passed with both clients reporting one remote Blender-based SpongeBob.
- Playwright `hat shop opens from gameplay` passed in Chromium after aborting the unrelated 23 MB Basel map request for this UI-only test.
- The full browser run is incomplete: 10 passed, 3 failed, 1 was interrupted after 3.9 minutes, and 18 did not run. Failures include campaign wheel/briefing timing and a missing `spray.wav` expectation; the focused multiplayer test passes.

## Remaining

- The full browser-suite failures remain outside the focused co-op and collision checks; do not describe the full browser suite as passing.
- `assets/blender/spongebob1.blend` and `spongebob1.glb` remain local and unstaged.
