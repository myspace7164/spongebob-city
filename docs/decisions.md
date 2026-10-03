# Decisions

One line per decision, newest at the bottom. Never edit an old line; add a new one that says what it replaces.

Format: `- <date> · <decision> · @<github-username> · Affects: <tasks or areas> · Why: <short> · Instead of: <alternative, why not>`

- 2026-10-03 · Three.js, TypeScript, Vite and npm for the webgame foundation · Affects: T1 · Why: small runtime and direct Blender glTF support · Instead of: a full game engine with unused systems.
- 2026-10-03 · Shared player, input and model contracts live in src/interfaces.ts; gameplay lives in src/game, presentation in src/ui, settings in config · Affects: T1 and future extensions · Why: replace visuals without changing movement.
- 2026-10-03 · Fixed-step flat-ground movement and a recycled visible plane · Affects: T1 · Why: constant geometry and straightforward physics · Instead of: generating terrain chunks or adding a physics dependency before collision requirements exist.
- 2026-10-03 · Add inventory item/state and placed-block contracts to src/interfaces.ts; item catalog and tuning in config/items.ts · Affects: inventory and sandbox actions · Why: placeholder item identities can change independently of behavior.
- 2026-10-03 · Three selectable placeholder slots, hitscan shooting with cooldown/ammo and bounded grid placement · Affects: sandbox actions · Why: demonstrate item use without a physics engine, persistence or a generalized inventory framework.
- 2026-10-03 · Normalize printed WASD keys with code fallback, focus canvas on entry and provide IJKL camera controls · Affects: input · Why: support layout differences and touchpad suppression; original user-side root cause remains unconfirmed.
- 2026-10-03 · Optional shell.nix provides packaged Chromium via CHROMIUM_EXECUTABLE; software WebGL flags are opt-in · Affects: browser verification on NixOS · Why: generic downloaded Linux browser dependencies do not match NixOS library paths.
- 2026-10-03 · Add CityState, CityPlot, CityTool and CityAction contracts to src/interfaces.ts; pure mission rules use config/city.ts · Affects: T3 · Why: test conserved water, budget and success independently of Three.js.
- 2026-10-03 · Replace the active sandbox with one stylised Barfüsserplatz mission, procedural companions and nine climate tools · Affects: T3 · Why: demonstrate heat and flood management together; fictional coefficients and geography are explicitly labelled.
- 2026-10-03 · Automatically commit verified workspace changes and merge feature branches into local main under standing user authorization · Affects: repository workflow · Why: user requested automatic commits and merges; privacy checks remain mandatory and pushing needs separate authorization.
- 2026-10-03 · Extend standing authorization to automatically push verified commits and merges to the existing GitHub remote · Affects: repository workflow · Why: user requested pushes without repeated confirmation; privacy checks remain mandatory, with no force-pushes.
- 2026-10-03 · Pull shared changes with --ff-only before work on a clean tree, then automatically commit, merge and push verified work · Affects: repository workflow · Why: user requested automatic pulls alongside commits and pushes; preserve local work and never rewrite shared history.
- 2026-10-03 · Keep editable Blender source in assets/blender and portable GLB output in public/models · Affects: character assets · Why: user requested source and output in the repository; export copies at 1.9 units tall with feet at the origin, using solid-view colors and excluding the distant Sphere.001, camera and light.
- 2026-10-03 · Add the approved 19-bone Character Rig to the Blender source without binding meshes · Affects: character rigging · Why: user approved torso, limb, eye and jaw bone placement only; anatomical left is +X and the GLB remains static.
- 2026-10-03 · Include Sphere.001 in the character export, replacing its earlier exclusion · Affects: character assets · Why: read-only mesh inspection established that its distant origin does not represent its actual geometry location, which is beside the face.
- 2026-10-03 · Replace the plain HUD with cartoon SpongeBob-inspired lettering and Frutiger Aero glass, using original CSS/vector art and src/ui/theme.css tokens · Affects: UI · Why: user requested a playful, cheesy look; no external font or image dependency.
