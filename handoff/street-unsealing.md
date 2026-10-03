# Street unsealing on Riehenring

Status: done

Goal: unsealing spots sit on a real Basel street, each with the technique that fits it; the player walks the street to build them.

Done: Level 1 (Riehenring) uses 16 spots on a straight stretch south of the footbridge: corner swales, sidewalk tree pits, parking-lane permeable paving and building edges (entrance at the Messe footbridge). Basel buildings, roads and photo are posed per level (`src/game/streets.ts`) so the street runs along the play area; walking is clamped to the street corridor. Tools that don't fit a spot explain the technique. Levels 2–4 unchanged (placeholder grids, no site limits).

Verified: 33 unit tests (5 new: transform, alignment with street data, corridor clamp, site rules, sites cleared on later levels), type check, build, doc-check. Screenshot shows the Riehenring scene and start target "Sidewalk verge → tree pit". Browser tests can't run on this machine (system Chromium, pointer lock): unchanged main fails the same 8–9 tests, so they neither confirm nor refute this change.

Next: play-test with `npm run dev`; tune spot positions if they look off. Later: map data for Erlenmatt, St. Johann and VoltaNord; heat map overlay from Basel-Stadt urban climate data (find dataset, check licence).

Limits: spot situations are read from the aerial photo, not planning records; no building collisions; flat ground.
