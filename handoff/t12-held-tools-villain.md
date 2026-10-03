# T12 — Held tools and roaming Dr. Beton

Status: done

Goal: animate walking/sprinting arms and legs, relax the T-pose, whiten teeth, show each equipped tool in SpongeBob's hand and make Dr. Beton a roaming, menacing villain with visible attacks.

Done: T11 funding and level music are verified, merged and pushed. Saved T12 design/plan before code; inspected imported character hand coordinates (no exported hand bones).

Done implementation: cached all nine handheld props, relaxed runtime arm/leg pivots for the real GLB and fallback, stronger sprint gait and white imported teeth. Added deterministic roaming/approach/sealing state, current-position interception, a red attack path, moving cart, glowing red eyes and menacing procedural outfit. Build and 48 unit tests pass, including actual GLB morph/limb/teeth checks and water-preserving delayed sabotage.

Verification: build/types, formatting/docs/whitespace checks and 48 unit tests pass. All 15 browser cases pass across the full run and the final equipment rerun after correcting pure-white teeth. Actual Blender and fallback models render all nine tools, moving hand/limbs, sprint gait, villain movement/red eyes/attack phase; live gameplay, both Shift keys, pause/reset, campaigns, funding/audio and three viewport layouts pass. Inspected `/tmp/sponge-equipment-blender.png`, `/tmp/sponge-equipment-fallback.png` and `/tmp/sponge-city-before.png`. Water morphs are verified on separated limbs; the legal campaign still wins on real terrain.

Next: playtest gait and villain speed; tune config/equipment.ts and config/beton.ts if needed. Exporting a skeletal GLB later requires adapting its attachment names and animation handling.

Limits: imported character currently exports static meshes/morphs without hand bones; attach props at its actual right-hand position. Ground movement has no building collision.
