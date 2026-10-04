# Level geography and evidence

The campaign uses real map locations with illustrative mission plots. Scenery, terrain, ground cover and building collisions follow each location. Buildings intersecting the mission clearing are hidden as whole footprints; these clearings and construction targets are gameplay abstractions, not surveyed parcels.

| Level | Eligible map locations | Relative area priority |
| --- | --- | --- |
| 1 | St. Alban-Kirchrain / Klybeckstrasse (Matthäus) | 0.1392 / 0.2658 |
| 2 | St. Alban-Vorstadt / Clarastrasse | 0.2900 / 0.3140 |
| 3 | Aeschenplatz / Johanniterstrasse | 0.4050 / 0.5395 |
| 4 | Riehenring / St. Johanns-Ring | 0.5572 / 1.0000 |

A fresh campaign randomly chooses one of two candidates in each tier, giving sixteen possible routes; a stage the level lineup (`config/built-levels/lineup.json`) assigns to a library level plays that level instead. Every route has four different locations with increasing composite urgency. The chosen route lives in campaign state: retries keep it, next-level resets preserve it, and co-op clients receive the room's authoritative selection. Story, scenery, terrain and collision clearings follow the chosen location; tasks and tool unlocks follow the level number. Restarting the campaign chooses a new route.

Eight candidate areas within the existing map coverage were compared and paired in priority order. These are relative sample rankings, not citywide risk categories.

## Sources and reproduction

- [GeoBS city climate](https://www.geo.bs.ch/stadtklima), current human bioclimate map served by [GeoBS WMS](https://wms.geo.bs.ch/), layer `KL_HumanbioklimaSituation`.
- [Basel city-climate policy](https://www.bs.ch/schwerpunkte/klima/stadtklima) provides the context for dense, poorly vegetated areas needing cooling and greening.
- [FOEN surface-runoff hazard dataset](https://opendata.swiss/de/dataset/gefahrdungskarte-oberflachenabfluss), served by [federal WMS](https://wms.geo.admin.ch/), layer `ch.bafu.gefaehrdungskarte-oberflaechenabfluss`. [Official legend and description](https://api3.geo.admin.ch/rest/services/api/MapServer/ch.bafu.gefaehrdungskarte-oberflaechenabfluss/legend?lang=en).

`node scripts/sample-level-risk.mjs` downloads original 800 m square samples at 160×160 pixels. `public/maps/risk/requests.json` records exact requests, coordinates and download time. `node scripts/analyze-level-risk.mjs` decodes original PNG pixels and writes `public/maps/risk/ranking.json`.

Runoff scoring weights affected coverage by the three pink/purple legend classes, excluding mapped blue water. Heat scoring uses warm-color coverage of the human-bioclimate image. Normalize both across the eight candidate areas, then combine 60% runoff and 40% heat. The resulting relative priority is a game selection heuristic. Heat colors are a visual proxy; no temperature or PET measurements are inferred.

## Limits

The runoff map describes modeled rare surface-flow events, not river flooding, and is not field validated. Its use is restricted to coarse area comparison: the samples are approximately 1:18,900 at a standard display scale, coarser than the source's 1:12,500 limit. A pixel is not a reliable parcel prediction. Results depend on sample area, map colors and the chosen weights. Mission topology, storage, temperatures and litre counts remain illustrative gameplay values. All four stages remain achievable with the same legal construction and water-conservation rules.
