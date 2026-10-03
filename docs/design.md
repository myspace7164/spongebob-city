# Sponge City — Barfüsserplatz

A desktop 3D learning game about turning a sealed, hot square into a sponge city. The supplied idea defines the domain rule: storm water must support vegetation or storage, rather than simply disappear. The existing Three.js/TypeScript/Vite foundation supplies movement, camera and optional Blender imports.

## Playable mission

Start at a fictional, stylised Barfüsserplatz at 37 °C. Walk between sixteen asphalt plots. Break asphalt, plant and water trees, create infiltration basins, ponds, storage, green roofs/facades and shaded seating. Each conversion changes geometry and colours. Healthy vegetation attracts residents and birds.

Dry periods alternate with thunderstorms. Each plot holds surface water, soil moisture and stored water. SpongeBob absorbs nearby water into a limited reservoir and sprays it into vegetation or tanks. Poren-Power temporarily increases capacity; bubble irrigation extends reach; MAXIMUM SCHWAMM temporarily enlarges him and absorbs across the square. Capacity returning to normal never deletes collected water.

Patrick can remove several nearby asphalt slabs. Sandy sells a capacity/bubble upgrade. Thaddäus comments on shade and Mr. Krabs tracks the construction budget. Dr. Beton's Asphaltinator reseals an exposed green plot periodically; nearby karate disables it temporarily.

The HUD shows heat, flood danger, sponge capacity, weather, budget and mission progress. Win after experiencing a storm, creating six permeable plots and four healthy trees, reusing 2,500 litres, and reducing heat/flood danger below their targets. Prolonged maximum danger loses the mission. Both outcomes show measured simulation changes in temperature, water retained, tree count and unsealed area, with restart.

## Structure and limits

Shared contracts: `src/interfaces.ts`. Rules: `src/game/city.ts`. Tuning: `config/city.ts`. Scene: `src/game/city-view.ts` and `src/game/characters.ts`. HUD: `src/ui/city.ts`. Input and movement retain their existing modules. Old sandbox modules remain available as reusable foundation code but are not mounted in the mission.

All coefficients, litres, area and temperatures are fictional gameplay values, not a validated hydrology/climate model or a surveyed Basel map. No persistence, multiplayer, mobile controls, building collision or campaign. Characters and city are procedural meshes, not imported/licensed assets. Named cartoon characters come from the user's concept. Boss representation is a sabotage machine; additional boss encounters and neighbourhoods are future work.

## Visual direction

The cartoon/Frutiger Aero interface follows `docs/style-guide.md`: sponge-yellow lettering and welcome card, glossy aqua controls, original vector mascot, flowers, decorative bubbles, speech-bubble feedback and individually readable power badges. The guide can scroll its tools while keeping its close control visible. Decoration pauses with the mission and respects reduced motion.
