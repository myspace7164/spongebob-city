# Level modifier wheel

Status: done

## Goal

After every successful non-final campaign level, show a weighted fortune wheel. One selected temporary modifier is active only during the next level, then expires on success or failure. No Blender work.

## Done

- Added eight modifiers in `config/modifiers.ts`, with visible outcome names/icons/effects and a transparent 60/40 positive/negative weight split.
- Added pending/active wheel state to `CampaignProgress`; campaign now pauses after success until spin and continue, and loss clears the active modifier.
- Applied effect multipliers at player movement, absorption/capacity, Dr. Beton movement/action time, coin grants, heat warming, character scale and Dr. Beton visual update.
- Built the wheel dialog, weighted sectors/options, spin/reveal/continue UI, HUD chip, Web Audio cues, lights and confetti.
- Updated campaign unit/browser flows and added effect lifecycle tests.
- `npm test`: 66 passing. `npm run build`: passing.
- Browser campaign transitions test passes; failed-level browser test passes. Local test server requires permission to bind port 5173, which was granted for the test run.
- Side-cast PBR/details, heat HUD, failed-level cleanup, Dr. Beton 3D vehicle/laser, and character equipment browser checks pass. Wheel screenshots were inspected at `/tmp/sponge-modifier-wheel.png` and `/tmp/sponge-modifier-wheel-result.png`; result content fits short screens.
- A deterministic browser check forces both Turbo-Schwamm and Hitzewelle, verifies their positive/negative reveals and confirms spin/tick/result oscillators are created.
- The Dr. Beton browser check also confirms angryBeton brightens all eye-area cracks and increases eye intensity, then restores the level-based appearance after it expires.
- `npm test`: 66 passing after landing-angle checks. `npm run build && bash scripts/doc-check.sh`: passing.

## Next

- No remaining implementation work. The feature branch was merged and pushed to `main` as `3bafdf8`; local Blender project/export files remain unstaged.

## Files

Main implementation: `config/modifiers.ts`, `src/interfaces.ts`, `src/game/level-modifiers.ts`, `src/game/campaign.ts`, `src/game/city.ts`, `src/game/player.ts`, `src/game/sabotage.ts`, `src/game/funding.ts`, `src/game/audio.ts`, `src/main.ts`, `src/ui/modifier-wheel.ts`, `src/ui/city.ts`, `src/ui/style.css`, `index.html`.

## Resume prompt

This handoff is complete. The final browser captures are in `/tmp/sponge-modifier-wheel.png` and `/tmp/sponge-modifier-wheel-result.png` for visual reference.
