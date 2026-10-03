# Sponge City — Basel campaign

A desktop 3D learning game about turning a sealed, hot square into a sponge city. The supplied idea defines the domain rule: storm water must support vegetation or storage, rather than simply disappear. The existing Three.js/TypeScript/Vite foundation supplies movement, camera and optional Blender imports.

## Campaign

Short, punchy German briefings adapt the supplied arrival, four neighbourhood chapters and ending. A reused original vector SpongeBob bobs while locally synthesised wah-wah gibberish accompanies a word-paced text reveal (300 words/minute, at most 12 seconds). Start is always available; start, mute, hidden tabs and finished speech silence the voice. Reduced motion disables bobbing. Configurable definitions in config/levels.ts hold story, placeholder coordinates, weather and achievement thresholds. Topology/geography remains pending; the existing Basel model is scenery, not a surveyed neighbourhood map.

Riehenring is played on the real street: a straight stretch south of the footbridge, with the Basel scenery moved and turned so the street runs along the play area. Its sixteen spots sit on real street situations (parking lane, sidewalk verge, corner, building edge) and each offers the matching technique: permeable paving, tree pit (Baumrigole), swale (Versickerungsmulde), or green roof/shade/tank. Walking is limited to the street corridor because buildings have no collisions. Levels 2–4 keep placeholder grids until their areas have map data. Later idea: a heat map overlay from Basel-Stadt's published urban climate data, showing which parts of the city collect the most heat.

Riehenring teaches unsealing, water reuse, rain gardens and a dry marked entrance. Erlenmatt adds healthy trees and planted basins. St. Johann adds green roofs, contiguous shade and roof runoff connections. VoltaNord combines tanks, ponds and safe overflow connections through a complete strongest storm. All current-level achievements must be satisfied together. Progression automatically selects the next level and pauses for its story; only the fourth completion shows the ending.

Each level starts a fresh city: plots, water, budget, upgrades, weather and hazards reset. Only completed level IDs carry forward. Four independent fictional locations and layout variants replace the shared square; the existing scenery follows the active placeholder location. Entry checkpoints allow retrying the current level; campaign restart returns to arrival. Press C at a roof/tank, then C at a receiving plot to connect runoff. Finite-capacity transfers conserve water. All layouts and drainage are illustrative placeholders with sixteen plots per location. Entrance achievements check current surface water after a complete storm, rather than continuous surveyed inundation. Recycling with V reclaims an upgrade’s cost and preserves its water, so accidental building choices cannot exhaust the required plots.

## Playable mission

Start at a fictional, stylised Basel neighbourhood at 37 °C. Walk between sixteen asphalt plots. Break asphalt, plant and water trees, create infiltration basins, ponds, storage, green roofs/facades and shaded seating. Each conversion changes geometry and colours. Healthy vegetation attracts residents and birds.

Dry periods alternate with thunderstorms. Each plot holds surface water, soil moisture and stored water. SpongeBob absorbs nearby water into a limited reservoir and sprays it into vegetation or tanks. Poren-Power temporarily increases capacity; bubble irrigation extends reach; MAXIMUM SCHWAMM temporarily enlarges him and absorbs across the square. Capacity returning to normal never deletes collected water.

Patrick can remove several nearby asphalt slabs. Sandy sells a capacity/bubble upgrade. Thaddäus comments on shade and Mr. Krabs tracks the construction budget. Dr. Beton's Asphaltinator reseals an exposed green plot periodically; nearby karate disables it temporarily.

The HUD shows heat, flood danger, sponge capacity, weather, budget and mission progress. Each level has its own construction, reuse, heat/flood and storm achievements. Prolonged maximum danger loses the mission. Both outcomes show measured simulation changes in temperature, water retained, tree count and unsealed area, with restart.

## Structure and limits

Contextual team-supplied audio accompanies successful construction and water transfers. Absorption, spraying and rain use loops; continuous sounds stop when their action or weather stops. Pause, hidden tabs and mission outcomes silence all clips. A Sound button and M key toggle mute.

Shared contracts: `src/interfaces.ts`. Rules: `src/game/city.ts` and `src/game/campaign.ts`. Tuning/story: `config/city.ts` and `config/levels.ts`. Scene: `src/game/city-view.ts` and `src/game/characters.ts`. HUD/story: `src/ui/city.ts` and `src/ui/campaign.ts`. Input and movement retain their existing modules. Old sandbox modules remain available as reusable foundation code but are not mounted in the mission.

All coefficients, litres, area and temperatures are fictional gameplay values, not a validated hydrology/climate model or a surveyed mission square. A converted Basel building dataset supplies surrounding scenery; its placement and cleared mission area are documented in `public/models/README.md`. No persistence, multiplayer, mobile controls or building collision. Characters and mission props are procedural meshes. Surrounding buildings load from the supplied Basel dataset, with the procedural architecture retained as a fallback. Named cartoon characters come from the user's concept. Boss representation is a sabotage machine; additional boss encounters and surveyed neighbourhood layouts are future work.

## Visual direction

Basel street centrelines become batched translucent road/path surfaces over a
local SWISSIMAGE orthophoto. Both share the building model's LV95 origin and
bounds. The fictional mission rectangle remains clear. Roads are estimated widths
with no surveyed bridge/tunnel elevations.

The ground is real swissALTI3D terrain (4 m grid): the photo is draped over it,
roads follow it, and buildings keep their surveyed heights on top. Each level's
play area is lifted to y = 0. The player, characters and plots stand on the
terrain, and rainwater on a plot runs to lower neighbours within 7.5 m, so low
spots flood first. Riehenring is nearly flat; the stages near St. Alban drop
about 2 m towards the Rhine. Without terrain data the game stays flat.
Conversion details live in `public/maps/README.md`; licences in `docs/SOURCES.md`.

The cartoon/Frutiger Aero interface follows `docs/style-guide.md`: sponge-yellow lettering and welcome card, glossy aqua controls, original vector mascot, flowers, decorative bubbles, speech-bubble feedback and individually readable power badges. The guide can scroll its tools while keeping its close control visible. Decoration pauses with the mission and respects reduced motion.
