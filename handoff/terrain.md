# Real Basel terrain and downhill runoff

Status: done

Goal: hills and slopes under the Basel scenery, with rainwater running downhill between plots.

Done: `scripts/convert-basel-terrain.py` turns nine swissALTI3D 2 m tiles into a 4 m grid (`public/maps/basel-terrain.bin/.json`). Terrain tiles carry the aerial photo, roads are draped, buildings keep their surveyed heights (they were sunk up to 12 m on flat ground at Riehenring). `levelScenery` in `src/game/terrain.ts` places the scenery per level and gives the world ground height used by player, characters, plots and camera. Plots get `elevation`; `flowDownhill` in `src/game/city-water.ts` moves surface water to lower plots within 7.5 m (tuning in `config/city.ts`).

Verified: 41 unit tests (new: grid decoding and spot heights, interpolation, tiles, draped roads, pose conversion, walking on a slope, runoff conservation and direction, the legal four-level strategy on real terrain), 4 Python terrain tests, type check, build, doc-check. Screenshots: Riehenring buildings now stand on the street. Browser tests still can't run on this machine (baseline fails too).

Next: play-test the sloped levels 2–4 by hand; tune `runoffRate` if low entrances flood too fast. Possible follow-up: visible water flow arrows.

Limits: building collisions still absent; the camera only avoids the ground directly beneath it; aiming uses a level plane at the player's height, so targeting on steep slopes is approximate.
