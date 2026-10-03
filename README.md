# Sponge City · Basel

A playable four-level 3D sponge-city campaign through Riehenring, Erlenmatt, St. Johann and VoltaNord, with Riehenring played on the real street (spots on its parking lane, sidewalk verges, corners and building edges) and placeholder layouts for the other levels until their map data is added. Collect storm water with SpongeBob, distribute it to plants and storage, and transform asphalt into a cooler, greener square. Manage heat and flooding together while Dr. Beton tries to reseal your work.

Built on Three.js, TypeScript and Vite. See [the design](docs/design.md) for gameplay, scope and limits.

## Run

Requires Node.js 22.12+ (tested with Node.js 24).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite in a desktop WebGL 2 browser. Click **I’M READY!** to read the arrival and current level story, then **Level starten** to capture the mouse. Escape pauses; click **I’M READY!** to resume. Leaving the tab pauses and clears input. The field guide explains every tool.

| Control                            | Action                                                       |
| ---------------------------------- | ------------------------------------------------------------ |
| WASD / arrows                      | Move relative to the camera                                  |
| Mouse / IJKL                       | Look / turn camera                                           |
| Space / Shift                      | Jump / run                                                   |
| 1 + hold left click                | Absorb nearby surface water                                  |
| 2 + hold left click                | Water green plots or fill storage                            |
| 3 + click                          | Break asphalt; near the machine, disable it                  |
| 4–9 + click                        | Tree, rain garden, green roof/facade, pond, shade, tank      |
| Q                                  | Poren-Power: temporary extra capacity                        |
| P                                  | Patrick clears nearby asphalt for free                       |
| X                                  | MAXIMUM SCHWAMM, unlocked after useful water reuse           |
| E near Sandy / Dr. Beton           | Buy capacity and bubbles / disable sabotage                  |
| Hold B after upgrade               | Bubble irrigation at extended range                          |
| H                                  | Pause and open the field guide                               |
| M / Sound button                   | Mute or unmute game audio                                    |
| C at source, then C at destination | Connect a roof/tank to permeable receiving ground or storage |
| V                                  | Recycle the aimed upgrade and reclaim its cost               |
| R                                  | Retry the current level from its entry checkpoint            |

All current-level achievements must be satisfied together to advance automatically. The next story pauses gameplay until you start the level. Each new neighbourhood starts fresh: plots, water, budget, upgrades and weather reset. Only completed levels carry forward. Distinct fictional origins/layouts stand in for the eventual real maps. Failure retries the current entry checkpoint; the final ending offers a full campaign restart. H includes a button to reread the current story.

Aim at a plot: a green border means it is in reach, orange means move closer. Trees require unsealed soil. Other structures can be built directly on asphalt and include unsealing in their price. Sponge water above normal capacity after a power expires stays available for distribution. Yellow entrance markers must stay clear of construction. Blue connection lines show runoff routes: roofs release stored water slowly; tanks send surface overflow to the chosen receiver. Receivers can saturate, so use planted basins and keep monitoring flood danger.

## Check and build

```sh
npm test
npm run lint
npm run fmt
npm run build
npm run preview
```

`dist/` contains the production site, suitable for static hosting. Unit tests cover water conservation, capacity, construction prerequisites, budget, abilities, sabotage, loss and a complete winning strategy, alongside foundation controls and sandbox rules. Campaign tests complete all four production levels through legal actions, verify automatic progression and water conservation, and reject unsafe/cyclic runoff.

Browser checks require Chromium and its OS libraries:

```sh
npx playwright install chromium
npm run test:browser
```

On NixOS, use the optional project shell with packaged Chromium:

```sh
nix-shell
npm ci
npm run test:browser
```

`playwright.config.ts` accepts `CHROMIUM_EXECUTABLE` for an existing browser and `SOFTWARE_WEBGL=1` for software rendering. The browser tests exercise the rendered city, construction, water reuse, powers, movement, pointer lock, pause and reset.

## Extend

SpongeBob carries a miniature of the selected tool in his right hand. Both the Blender character and fallback swing their arms and legs while walking; hold either Shift key to sprint with a faster gait. Idle arms hang naturally, and the imported character's teeth are white. Runtime limb pivots preserve Dry/WaterFull morph targets; the original Blender source stays intact.

Dr. Beton roams the neighbourhood in his Asphaltinator. When sabotage starts, a red path shows his destination; he walks there and visibly seals before restoring asphalt. Catch him at his current position with E or karate to cancel the attack and disable him. His red eyes, dark outfit and jagged grin mark him as the villain. Movement, attacks and equipment animation pause with the mission.

The large gold wallet shows available coins throughout play. Useful first actions at each site earn government-funding grants, celebrated by a coin burst, receipt and rising chime. Collection, useful irrigation, construction, safe runoff routes, disabling sabotage and upgrading the sponge count; repeated actions and recycling do not generate extra grants. Funding resets with each fresh level or retry.

Each neighbourhood loops its supplied stage track while playing. Pausing, story screens and mute stop the music and coin chime. Rain is mixed at 8% volume; levels use 22%.

- `config/levels.ts`: short German briefings, per-level achievements/weather and independent locations/layouts, including the real Riehenring street; replace coordinates when the actual level layouts arrive.
- `config/sites.ts`: street situations and which unsealing technique fits each one.
- `src/game/campaign.ts`: shared achievement evaluation, automatic progression and runoff/recycling rules.
- `src/ui/campaign.ts`: paused story screens, campaign route and ending.
- `config/briefing.ts` and `src/ui/story-speech.ts`: 300-word/minute text reveal and original Web Audio wah-wah voice, capped at 12 seconds. Start early to skip; M/Sound mutes the voice too. Reduced motion disables mascot bobbing.
- `config/city.ts`: fictional simulation tuning, tools, prices and standalone mission goals.
- `config/funding.ts` and `src/game/funding.ts`: grant amounts and the once-per-level claim ledger.
- `config/audio.ts`: action sounds, quiet rain and neighbourhood stage-track mapping; the fifth supplied stage track is reserved for a future level.
- `src/game/city.ts`: mission actions, weather, heat, sabotage and outcome.
- `src/game/city-water.ts`: rain, infiltration and tank irrigation.
- `src/game/city-view.ts`: plot transformations, rain and revived city life.
- `src/game/characters.ts`: procedural character and prop visuals.
- `src/game/locomotion.ts` and `config/equipment.ts`: relaxed limb pivots, walk/sprint gait and measured hand anchors; `src/game/held-tools.ts` caches the nine miniature tools.
- `src/game/sabotage.ts` and `config/beton.ts`: reproducible roaming, approach/sealing timing and moving villain position.
- `src/ui/city.ts`: HUD, field guide and mission report.
- `src/interfaces.ts`: shared contracts.
- `src/ui/theme.css`: palette and visual theme.
- `docs/style-guide.md`: cartoon / Frutiger Aero visual direction; its local style sample is served by Vite at `/docs/design/style-sample.html`.
- `config/game.ts`: movement, camera, renderer and optional GLB paths.
- `config/audio.ts`: contextual sound files and volume levels.
- `src/game/audio.ts`: action sounds, transfer/weather loops and pause/mute handling.

Static assets live under `public/`: team sound clips in `public/audio/`, optional Blender exports in `public/models/`, and UI artwork in `public/ui/`. Source code stays in `src/`, domain settings in `config/`, checks in `tests/` and `scripts/`, and project documentation in `docs/` and `handoff/`. Root files are project/tooling entry points and team guides.

The supplied Basel model loads by default. While it loads, the original scenery remains playable; if loading fails, the original buildings remain. To use only procedural scenery, clear `level.url` in `config/game.ts`.

When the Basel model loads, local street geometry and SWISSIMAGE aerial ground imagery load beneath it. They are draped over real swissALTI3D terrain, so the city has its hills and slopes; on sloped levels rainwater runs downhill to lower plots. Widths are approximate and the fictional mission area stays clear. Settings are in `config/map.ts`; rebuilding assets and source limits are documented in [ground layer notes](public/maps/README.md).

Optional Blender exports go into `public/models/`. Set `character.url` or `level.url` in `config/game.ts`, with scale and rotation. Use a feet-centred origin, Y up and front facing +Z. An empty URL retains procedural visuals; failed loads report an error and keep the fallback. Imported models and buildings are visual only (no collisions); movement follows the terrain height within each level's bounds.

## Limits and sources

Four story levels: Riehenring on its real street, the other three in separate fictional layouts, procedural characters, imported Basel building scenery, escalating cyclic weather and a sabotage machine. No persistence, multiplayer or mobile controls. Temperatures, litres and square metres are illustrative gameplay values, not a validated climate model. Level topology, entrances and runoff links remain fictional; imported Basel buildings are background scenery. Only Riehenring is aligned to its real location; the other levels use offset background scenery, and their neighbourhoods lie outside the current map data. Green roofs remain ground-level interactive props; vertical traversal and surveyed drainage networks are outside this preparation. See [map conversion notes](public/models/README.md). See [sources](docs/SOURCES.md) and [implementation handoff](handoff/t3-sponge-city.md).
