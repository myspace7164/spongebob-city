# Run-only hat shop and climate pacing

Status: in progress

## Goal

Add six run-only 3D hats bought for 1,000 coins each, and adjust heat/weather so temperature rises faster, SpongeBob starts drying at 30°C with a progressive morph, and rain is less frequent/intense.

## Done

- Added a six-item procedural 3D hat catalogue, menu shop UI, immediate purchase/equip, HUD-independent character attachment, and loss-only hat cleanup.
- Added hat state to campaign progress; purchases synchronize checkpoint coins so retries do not refund them; hats carry to the next campaign stage only.
- Increased gradual heat coefficients, moved the Dry threshold to 30°C with full Dry at 45°C, and reduced rain durations/rates in all four campaign stages and standalone mode.
- Added unit/browser coverage and updated climate expectations, decisions, source attribution, and design notes.

## Next

1. Rerun unit tests, build, formatter, and focused browser tests; fix any failures.
2. Review the diff, run privacy guard, commit on `feat/run-only-hat-shop`, merge to `main`, and push per standing authorization.

## Key files

- `config/hats.ts`, `config/city.ts`, `config/levels.ts`
- `src/game/hats.ts`, `src/game/campaign.ts`, `src/game/city.ts`, `src/game/world.ts`, `src/game/assets.ts`
- `src/ui/hat-shop.ts`, `src/main.ts`, `index.html`, `src/ui/style.css`
- `tests/hats.test.ts`, `tests/heat.test.ts`, `tests/browser/hat-shop.spec.ts`

## Known constraints

- The project has no existing persistent coin save; preserve its current balance/reset model and do not introduce permanent hat ownership.
- Keep the local untracked Blender assets out of Git.

## Resume prompt

Continue the run-only hat shop and heat/weather pacing task. Finish tests and browser verification, inspect the diff, run the privacy guard, then commit, merge and push the verified feature branch to `main`. Do not stage local Blender files or `.hack/`.
