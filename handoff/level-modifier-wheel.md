# Level modifier wheel

Status: ready for commit

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
- `npm test`: 66 passing after landing-angle checks. `npm run build && bash scripts/doc-check.sh`: passing.

## Next

- Run prettier check and `git diff --check` on the task changes.
- Stage verified heat progression, side-cast details, Dr. Beton procedural boss support, and the wheel. Keep `assets/blender/spongebob1.blend` and `spongebob1.glb` unstaged.
- Run `scripts/hack-guard.sh`, commit the task branch, fast-forward merge into main, and push as authorized by repository instructions.

## Files

Main implementation: `config/modifiers.ts`, `src/interfaces.ts`, `src/game/level-modifiers.ts`, `src/game/campaign.ts`, `src/game/city.ts`, `src/game/player.ts`, `src/game/sabotage.ts`, `src/game/funding.ts`, `src/game/audio.ts`, `src/main.ts`, `src/ui/modifier-wheel.ts`, `src/ui/city.ts`, `src/ui/style.css`, `index.html`.

## Resume prompt

Continue the level modifier wheel task from this handoff. Inspect the browser screenshots, finish runtime checks and docs, then selectively stage only the wheel/heat/side-character task changes. Keep unrelated pre-existing dirty Blender, Dr. Beton and test files unstaged. Run privacy guard before commit/push; use the existing branch and repository auto-ship instructions.
