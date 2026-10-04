# Sponge City · Basel

A playable four-level 3D sponge-city campaign across eight Basel location candidates. Each new campaign randomly chooses one of two locations per difficulty tier. Real Basel scenery follows each location; mission plots remain illustrative. Locations increase in climate urgency using official surface-runoff and heat maps; see [geographic evidence and limits](docs/level-geography.md). Collect water, unseal ground before planting or building, and manage heat and flooding while Dr. Beton tries to reseal your work.

Built on Three.js, TypeScript and Vite. See [the design](docs/design.md) for gameplay, scope and limits.

## Presentation

Open [the animated presentation](public/presentation.html) directly in a browser or visit `/presentation.html` while the game server runs. The deck includes speaker notes and a printable sources appendix; see [presenting instructions](docs/pitch.md).

## Run

Requires Node.js 24+.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite in a desktop WebGL 2 browser. Claim a unique username through **PLAY ONLINE**, then create a co-op room or join a friend’s six-character code. Click **START LEVEL** to capture the mouse. **SOLO PRACTICE** plays locally without leaderboard scoring. Escape pauses your player; click the play button to resume. Leaving the tab pauses and clears input. The field guide explains every tool.

| Control                            | Action                                                       |
| ---------------------------------- | ------------------------------------------------------------ |
| WASD / arrows                      | Move relative to the camera                                  |
| Mouse / IJKL                       | Look / turn camera                                           |
| Space / Shift                      | Jump / run                                                   |
| 1 + hold left click                | Absorb nearby surface water                                  |
| 2 + hold left click                | Water green plots or fill storage                            |
| 3 + click                          | Break asphalt; near the machine, disable it                  |
| 4–9 + click                        | Tree, rain garden, green roof/facade, pond, shade, tank      |
| E near Sandy / Dr. Beton           | Buy capacity and bubbles / disable sabotage                  |
| Hold B after upgrade               | Bubble irrigation at extended range                          |
| Q                                  | Activate the collected boost once                            |
| G + 1–5                            | 67, Macarena, teabag, dab, floss; move/jump to cancel        |
| H                                  | Pause and open the field guide                               |
| M / Sound button                   | Mute or unmute game audio                                    |
| C at source, then C at destination | Connect a roof/tank to permeable receiving ground or storage |
| V                                  | Recycle the aimed upgrade and reclaim its cost               |
| R                                  | Retry the current level from its entry checkpoint            |

All current-level achievements must be satisfied together to advance automatically. The next story pauses gameplay until you start the level. Each new neighbourhood starts fresh: plots, water, budget, upgrades and weather reset. Only completed levels carry forward. Distinct fictional origins/layouts stand in for the eventual real maps. Failure retries the current entry checkpoint. Completing the normal campaign shows credits; skip with the button or Escape, or let them finish to enter endless mode. Endless rounds choose random neighbourhoods with all tools unlocked and increase rain and heat by 20% per round. In co-op, the leader starts endless mode for the team. The victory report also offers a full campaign restart. H includes a button to reread the current story.

Aim at a plot: a green border means it is in reach, orange means move closer. Trees require unsealed soil. Other structures can be built directly on asphalt and include unsealing in their price. Sponge water above normal capacity after a power expires stays available for distribution. Blue connection lines show runoff routes: roofs release stored water slowly; tanks send surface overflow to the chosen receiver. Receivers can saturate, so use planted basins and keep monitoring flood danger.

## Check and build

```sh
npm test
npm run lint
npm run fmt
npm run build
npm run preview
```

`dist/` contains the client. Online play also requires the Node server described below; static hosting supports solo practice only. Unit tests cover water conservation, capacity, construction prerequisites, budget, abilities, sabotage, loss, player controls and a complete winning strategy. Campaign tests complete all four production levels through legal actions, verify automatic progression and water conservation, and reject unsafe/cyclic runoff.

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

The level builder is a local development tool. Run `npm run dev` and open `/?builder` to place an area's bounds, construction spots, player spawn and characters; press **N** to open or close it during play. It opens in the normal view behind SpongeBob with a free mouse; **Overview** switches to a wider camera. Right-drag looks around, WASD moves the view, and clicking a coloured spot selects it for dragging or deletion. Use **Rotate left/right** for 15° steps or enter an exact angle. These controls rotate the selected spot; **Place a new spot** sets the angle for the next placement. **Undo** (Ctrl+Z) restores rotation, movement, and deletion. The **Objects** tool (**O**) moves the leaderboard sign, the riverside buddy, the first power-up and the street-name sign; the leaderboard can also be turned, and **Reset to default place** restores an object's standard position. Selecting a level previews its campaign location; closing returns to the original game. **Test play** uses the draft only in memory and keeps its chosen map location. **Save draft** stores it in this browser; **Apply to level** explicitly updates `config/built-levels/index.ts` after keeping the previous state in `config/built-levels/history/`. Select a saved version and choose **Restore** to go back; restoring also keeps the state it replaces. Ctrl+S saves a browser draft. It is disabled in production and cannot open after joining an online room.

SpongeBob carries a miniature of the selected tool in his right hand. Both the Blender character and fallback swing their arms and legs while walking; hold either Shift key to sprint with a faster gait. Shift held before mouse capture also works; the footer shows RUNNING while sprint is active. Idle arms hang naturally, and the imported character's teeth are white. Runtime limb pivots preserve Dry/WaterFull morph targets; the original Blender source stays intact.

Dr. Beton roams the neighbourhood in his Asphaltinator. When sabotage starts, a red path shows his destination; he walks there and visibly seals before restoring asphalt. Catch him at his current position with E or karate to cancel the attack and disable him. His red eyes, dark outfit and jagged grin mark him as the villain. Movement, attacks and equipment animation pause with the mission.

The large gold wallet shows available coins throughout play. Useful first actions at each site earn government-funding grants, celebrated by a coin burst, receipt and rising chime. Collection, useful irrigation, construction, safe runoff routes, disabling sabotage and upgrading the sponge count; repeated actions and recycling do not generate extra grants. Funding resets with each fresh level or retry.

Each neighbourhood loops its supplied stage track while playing. Pausing, story screens and mute stop the music and coin chime. Rain is mixed at 8% volume; levels use 22%.

- `config/levels.ts`: short English briefings, per-level achievements/weather and independent locations/layouts, with randomized real map anchors and illustrative mission layouts.
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

Basel buildings are drawn with procedural facades and roofs (`config/buildings.ts`); colours and windows are illustrative, not surveyed. The ground is drawn from Basel's land cover and the city's inventory trees stand at their real positions (`config/ground.ts`). The land-cover ground is draped over real swissALTI3D terrain; local street geometry and SWISSIMAGE aerial imagery remain as fallback. The city has its hills and slopes; on sloped levels rainwater runs downhill to lower plots. Widths are approximate and the fictional mission area stays clear. Settings are in `config/map.ts`; rebuilding assets and source limits are documented in [ground layer notes](public/maps/README.md).

Optional Blender exports go into `public/models/`. Set `character.url` or `level.url` in `config/game.ts`, with scale and rotation. Use a feet-centred origin, Y up and front facing +Z. An empty URL retains procedural visuals; failed loads report an error and keep the fallback. Imported models and buildings are visual only (no collisions); movement follows the terrain height within each level's bounds.

## Limits and sources

Four levels on real Basel map scenery with illustrative mission topology. Cookie accounts and rankings persist on the host; live rooms end on server restart. No mobile controls. Temperatures, litres and square metres are gameplay values, not a validated climate model. Green roofs remain ground-level interactive props. See [geographic evidence and limits](docs/level-geography.md), [map conversion notes](public/models/README.md) and [sources](docs/SOURCES.md).

## Online play and hosting

`npm run dev` serves both Vite and the same-origin account/game API. For production, run `npm ci`, `npm run build`, then `NODE_ENV=production npm start`. The Node server serves `dist/`, `/api/` and live room events together on `PORT` (default 3000). Put it behind HTTPS; production cookies require HTTPS. After building, the server runs with production dependencies; `tsx` is declared as a runtime dependency.

Mount durable storage and set `DATABASE_PATH` (default `data/accounts.sqlite`). Usernames are case-insensitively unique, 3–20 letters/numbers/underscores. Accounts, hashed session records and rankings live in SQLite on the game host. The one-year HttpOnly, SameSite cookie remembers the account; clearing it loses access to that identity. No passwords, email addresses or browser-submitted scores are collected. Database files and session data are ignored by git. Back up the database using SQLite’s backup mechanism, including ongoing writes.

For a container host, build the supplied `Dockerfile` and attach a persistent volume at `/data`. Run **one server instance** behind your HTTPS proxy with streaming enabled (no buffering of `/api/events`). A static-only provider needs a Node service or migration to a container/Node host. Do not use ephemeral filesystem storage for accounts. The current hosting provider has not yet been supplied, so no hosted deployment has been performed.

Rooms support four players. Players share construction, missions, budget, reservoir, weather and antagonist; each has their own position, selected tool and runoff source. Everyone sees named animated teammates. Weather continues while at least one player is playing; individual pauses do not freeze teammates. Input stops after a lost heartbeat, event streams reconnect automatically, and the browser can rejoin its room within 90 seconds. The room leader alone can retry after a finished attempt.

The leaderboard ranks completed campaigns first, then personal city-funding grants. The server validates movement, reach, prices and useful actions and writes rewards once; clients cannot submit balances or scores. Solo practice is unranked. Rooms are temporary; accounts and rankings survive restarts.

## Progressive inventory and boosts

Level 1 introduces absorb, spray, karate and rain gardens. Trees unlock in level 2; roofs and shade in level 3; ponds and tanks in level 4. Locked slots are gray with a lock and the number of levels remaining. Mouse, keyboard and server validation enforce the same rules.

Walk over a ground collectible, then press **Q** to use it once. There is one shared held/active slot; another pickup replaces it and cancels its previous effect. Each level starts with one Pore Power drop. New drops appear sparingly, at least 60 seconds apart, with at most one waiting on the ground.

The ten-drop pool includes six Basel boosts: Läckerli Rush (50% faster sprint, 14s), Confetti Funding (double grants, 18s), Rhine Flow (double water transfer, 16s), Basilisk Guard (block sabotage, 18s), Fasnacht Lantern (extra gradual cooling, 18s), and Münster Bell (double reach, 16s). Existing powers are also collectibles: Pore Power (1,400 L, 12s), Patrick Smash (automatic nearby unsealing, 12s), Maximum Sponge (4,000 L and area absorption, 8s), and Sandy Bubbles (hold B for distant watering, 18s).

Capacity expiry preserves collected water. Sandy's permanent upgrade remains available. Pickups reset with each level/retry; co-op collection and activation are server-authoritative. Original miniature props and durations live in config/powerups.ts and src/game/powerup-view.ts.

Emotes use the existing imported/fallback limb rig and replicate to co-op teammates. Hold G and press 1–5; they expire automatically without affecting city resources or player collision. Movement or jumping cancels them; reduced motion shows a still pose.

Watering rejects flooded plots and full soil/storage without spending sponge water or granting coins. Absorb standing surface water first; spraying a fire remains available. Shade plazas connect across neighboring placeholder street gaps up to 7 m.

Hold G to reveal the emote choices, then press 1–5; the camera faces SpongeBob during the dance. Nearby characters wander and speak original gibberish; voices fade with distance and stop on pause/mute. Solid characters, tree trunks, tanks and building bounds block movement and allow sliding around them. Inventory tiles and their numbered shortcuts follow unlock order: absorb, spray, karate, rain garden, tree, roof, shade, pond, tank.

A cartoon riverside buddy strolls through every level in a tan hoodie, baggy jeans and dark sneakers. He sips his beer, sometimes rolls and smokes a cigarette, and cheers while rotating twenty short positive messages. His speech bubble and soft nearby gibberish are cosmetic; he gives no missions or bonuses. Shared simulation time keeps his poses consistent in co-op and frozen on pause. The character uses original procedural geometry; the reference photograph is not stored in the project.
