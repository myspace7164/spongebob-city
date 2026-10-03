# Drawn ground and real trees

Status: done

Goal: replace the blurry aerial photo and road lines with clean ground drawn from Basel data, and add Basel's real trees.

Done: `scripts/convert-basel-ground.py` rasterises Bodenbedeckung (data.bs.ch 100477) into four 0.4 m category PNG tiles (`public/maps/basel-ground-*`, about 0.9 MB); `src/game/ground-style.ts` draws asphalt with curbs, paving, slabs, grass, forest, water ripples and rail gravel on the terrain tiles (majority-of-four lookup smooths texel steps; colours and brightness in `config/ground.ts`). `scripts/convert-basel-trees.py` turns the Baumkataster (100052) into 6,133 trees (`public/maps/basel-trees.json`, 134 KB); `src/game/trees.ts` renders them instanced and hides trees within 3 m of the active level's spots. Photo and road ribbons stay as fallback when land cover or terrain fails.

Verified: 53 unit tests, Python converter tests (ground 5, trees 3, map 5, roads 3, terrain 4), type check, build; alignment against the photo at Riehenring (Messe opening, kerbs); in-game and overview screenshots (Riehenring start, Rhine with Mittlere Brücke, old town).

Branch: tried on a local test branch, reviewed by the participant, merged into main.

Straight edges: the converter also stores each texel's exact distance to the nearest real edge (green channel, 16 levels over 0.8 m); the shader reconstructs boundaries from signed distances instead of a noisy majority lookup, and curbs are continuous dark-grey 0.22 m bands (a 4×4 texel search finds the footway beside the road). Ground tiles grow from about 0.9 MB to 6.1 MB.

Limits: boundaries are straight but approximate where three categories meet; no lane markings yet; tree heights estimated from age; trees and ground have no collisions.
