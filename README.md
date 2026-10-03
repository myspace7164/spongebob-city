# Sponge City · Basel

A playable 3D sponge-city mission at a stylised Barfüsserplatz. Collect storm water with SpongeBob, distribute it to plants and storage, and transform asphalt into a cooler, greener square. Manage heat and flooding together while Dr. Beton tries to reseal your work.

Built on Three.js, TypeScript and Vite. See [the design](docs/design.md) for gameplay, scope and limits.

## Run

Requires Node.js 22.12+ (tested with Node.js 24).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite in a desktop WebGL 2 browser. Click **I’M READY!** to capture the mouse. Escape pauses; click the same button to resume. Leaving the tab pauses and clears input. The field guide explains every tool.

| Control | Action |
|---|---|
| WASD / arrows | Move relative to the camera |
| Mouse / IJKL | Look / turn camera |
| Space / Shift | Jump / run |
| 1 + hold left click | Absorb nearby surface water |
| 2 + hold left click | Water green plots or fill storage |
| 3 + click | Break asphalt; near the machine, disable it |
| 4–9 + click | Tree, rain garden, green roof/facade, pond, shade, tank |
| Q | Poren-Power: temporary extra capacity |
| P | Patrick clears nearby asphalt for free |
| X | MAXIMUM SCHWAMM, unlocked after useful water reuse |
| E near Sandy / Dr. Beton | Buy capacity and bubbles / disable sabotage |
| Hold B after upgrade | Bubble irrigation at extended range |
| H | Pause and open the field guide |
| M / Sound button | Mute or unmute game audio |
| R | Restart the mission |

Aim at a plot: a green border means it is in reach, orange means move closer. Trees require unsealed soil. Other structures can be built directly on asphalt and include unsealing in their price. Sponge water above normal capacity after a power expires stays available for distribution.

## Check and build

```sh
npm test
npm run lint
npm run fmt
npm run build
npm run preview
```

`dist/` contains the production site, suitable for static hosting. Unit tests cover water conservation, capacity, construction prerequisites, budget, abilities, sabotage, loss and a complete winning strategy, alongside foundation controls and sandbox rules.

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

- `config/city.ts`: fictional mission tuning, tools, prices and goals.
- `src/game/city.ts`: mission actions, weather, heat, sabotage and outcome.
- `src/game/city-water.ts`: rain, infiltration and tank irrigation.
- `src/game/city-view.ts`: plot transformations, rain and revived city life.
- `src/game/characters.ts`: procedural character and prop visuals.
- `src/ui/city.ts`: HUD, field guide and mission report.
- `src/interfaces.ts`: shared contracts.
- `src/ui/theme.css`: palette and visual theme.
- `docs/style-guide.md`: cartoon / Frutiger Aero visual direction; its local style sample is served by Vite at `/docs/design/style-sample.html`.
- `config/game.ts`: movement, camera, renderer and optional GLB paths.
- `config/audio.ts`: contextual sound files and volume levels.
- `src/game/audio.ts`: action sounds, transfer/weather loops and pause/mute handling.

Static assets live under `public/`: team sound clips in `public/audio/`, optional Blender exports in `public/models/`, and UI artwork in `public/ui/`. Source code stays in `src/`, domain settings in `config/`, checks in `tests/` and `scripts/`, and project documentation in `docs/` and `handoff/`. Root files are project/tooling entry points and team guides.

The supplied Basel model loads by default. While it loads, the original scenery remains playable; if loading fails, the original buildings remain. To use only procedural scenery, clear `level.url` in `config/game.ts`.

Optional Blender exports go into `public/models/`. Set `character.url` or `level.url` in `config/game.ts`, with scale and rotation. Use a feet-centred origin, Y up and front facing +Z. An empty URL retains procedural visuals; failed loads report an error and keep the fallback. Imported models and buildings are visual only; movement uses the flat ground with mission bounds.

## Limits and sources

One playable mission, procedural characters, imported Basel building scenery, cyclic weather and a sabotage machine. No campaign, persistence, multiplayer or mobile controls. Temperatures, litres and square metres are illustrative gameplay values, not a validated climate model. The mission square remains fictional; imported Basel buildings surround it. The map is centred on the supplied dataset rather than geographically aligned to Barfüsserplatz. See [map conversion notes](public/models/README.md). See [sources](docs/SOURCES.md) and [implementation handoff](handoff/t3-sponge-city.md).
